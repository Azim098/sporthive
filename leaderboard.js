// Initialize Supabase client with provided URL and anon key
const supabase = Supabase.createClient(
    'https://idydtkpvhedgyoexkiox.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY'
);

// Fetch the logged-in user's ID using Supabase Auth
let loggedInUserId = null;
async function getLoggedInUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        console.error('Error fetching user or user not logged in:', error);
        return null;
    }
    loggedInUserId = user.id;
    return user.id;
}

// Badge titles and icons for different events (customize based on your events)
const badgeData = {
    'Marathon 2025': { title: 'Marathon Master', icon: '🏃‍♂️' },
    'Swimming Gala': { title: 'Aquatic Ace', icon: '🏊‍♀️' },
    'Basketball Tournament': { title: 'Hoop Hero', icon: '🏀' },
    'Cycling Race': { title: 'Cycle Star', icon: '🚴‍♂️' },
    // Add more events and badges as needed
};

// Function to update points and assign badges when status changes to "Accepted"
async function handleStatusUpdate(payload) {
    const { old: oldRecord, new: newRecord } = payload;

    // Check if status changed from "Pending" to "Accepted"
    if (oldRecord.status === 'Pending' && newRecord.status === 'Accepted') {
        const participantId = newRecord.participant_id;
        const eventId = newRecord.event_id;

        // Fetch the event name to determine the badge
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('name')
            .eq('id', eventId)
            .single();

        if (eventError) {
            console.error('Error fetching event:', eventError);
            return;
        }

        const eventName = event.name;
        const badgeInfo = badgeData[eventName] || { title: 'Event Participant', icon: '🎉' }; // Fallback badge

        // Fetch the user ID from the participant (assuming participant_id in register table is the user ID)
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, fullname')
            .eq('id', participantId)
            .single();

        if (userError) {
            console.error('Error fetching user:', userError);
            return;
        }

        const userId = user.id;
        const userName = user.fullname;

        // Update points in the leaderboard
        const { data: leaderboardEntry, error: leaderboardError } = await supabase
            .from('leaderboard')
            .select('points')
            .eq('user_id', userId)
            .single();

        if (leaderboardError && leaderboardError.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error('Error fetching leaderboard entry:', leaderboardError);
            return;
        }

        let newPoints = 50; // Default points for first event
        if (leaderboardEntry) {
            newPoints = leaderboardEntry.points + 50;
            await supabase
                .from('leaderboard')
                .update({ points: newPoints })
                .eq('user_id', userId);
        } else {
            await supabase
                .from('leaderboard')
                .insert({ user_id: userId, name: userName, points: newPoints });
        }

        // Assign a badge to the user
        const { data: badge, error: badgeError } = await supabase
            .from('badges')
            .select('id')
            .eq('name', badgeInfo.title)
            .single();

        let badgeId;
        if (badge) {
            badgeId = badge.id;
        } else {
            const { data: newBadge, error: newBadgeError } = await supabase
                .from('badges')
                .insert({
                    name: badgeInfo.title,
                    description: `Earned for participating in ${eventName}`,
                    icon_url: badgeInfo.icon,
                    created_at: new Date().toISOString()
                })
                .select('id')
                .single();

            if (newBadgeError) {
                console.error('Error creating badge:', newBadgeError);
                return;
            }
            badgeId = newBadge.id;
        }

        // Link the badge to the user
        await supabase
            .from('user_badges')
            .insert({
                user_id: userId,
                badge_id: badgeId,
                awarded_at: new Date().toISOString()
            });

        // Refresh the leaderboard and badges
        await updateLeaderboard();
        await displayUserBadges();
    }
}

// Function to update the leaderboard display
async function updateLeaderboard() {
    const { data: leaderboardData, error } = await supabase
        .from('leaderboard')
        .select('name, points, user_id')
        .order('points', { ascending: false });

    if (error) {
        console.error('Error fetching leaderboard:', error);
        return;
    }

    const leaderboardBody = document.getElementById('leaderboard-body');
    leaderboardBody.innerHTML = ''; // Clear existing rows

    leaderboardData.forEach((entry, index) => {
        const row = document.createElement('tr');
        row.className = 'table-row';
        if (entry.user_id === loggedInUserId) {
            row.classList.add('user-row');
        }

        const rankCell = document.createElement('td');
        const rankDiv = document.createElement('div');
        rankDiv.className = 'rank-number';
        if (index === 0) rankDiv.classList.add('top-rank');
        if (index === 1) rankDiv.classList.add('second-rank');
        if (index === 2) rankDiv.classList.add('third-rank');
        if (entry.user_id === loggedInUserId) rankDiv.classList.add('user-rank');
        rankDiv.textContent = index + 1;
        rankCell.appendChild(rankDiv);

        const nameCell = document.createElement('td');
        nameCell.textContent = entry.user_id === loggedInUserId ? `You (${entry.name})` : entry.name;

        const pointsCell = document.createElement('td');
        pointsCell.textContent = entry.points;

        row.appendChild(rankCell);
        row.appendChild(nameCell);
        row.appendChild(pointsCell);
        leaderboardBody.appendChild(row);
    });
}

// Function to display the logged-in user's badges
async function displayUserBadges() {
    if (!loggedInUserId) {
        console.error('No logged-in user ID available');
        return;
    }

    const { data: userBadges, error } = await supabase
        .from('user_badges')
        .select('badges(name, icon_url)')
        .eq('user_id', loggedInUserId);

    if (error) {
        console.error('Error fetching user badges:', error);
        return;
    }

    const badgesContainer = document.getElementById('badges-container');
    badgesContainer.innerHTML = ''; // Clear existing badges

    userBadges.forEach(badge => {
        const badgeCard = document.createElement('div');
        badgeCard.className = 'badge-card';
        badgeCard.innerHTML = `${badge.badges.icon_url}<p>${badge.badges.name}</p>`;
        badgesContainer.appendChild(badgeCard);
    });
}

// Subscribe to changes in the register table
supabase
    .channel('register-changes')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'register' }, handleStatusUpdate)
    .subscribe();

// Initial load of leaderboard and badges
document.addEventListener('DOMContentLoaded', async () => {
    await getLoggedInUser(); // Fetch the logged-in user
    if (loggedInUserId) {
        await updateLeaderboard();
        await displayUserBadges();
    } else {
        console.error('User must be logged in to view the leaderboard and badges.');
        // Optionally, redirect to a login page
    }
});
