// Initialize Supabase client with provided URL and anon key
const supabase = window.supabase.createClient(
    'https://idydtkpvhedgyoexkiox.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY'
);

// Fetch the logged-in user's ID using Supabase Auth
let loggedInUserId = null;
async function getLoggedInUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            console.error('Error fetching user or user not logged in:', error?.message || 'No user session');
            // Optionally redirect to login if no user
            // window.location.href = 'login.html';
            return null;
        }
        loggedInUserId = user.id;
        console.log('Logged-in user ID:', loggedInUserId);
        return user.id;
    } catch (error) {
        console.error('Unexpected error in getLoggedInUser:', error.message);
        return null;
    }
}

// Badge titles and icons based on rank
const rankBadges = {
    1: { title: 'Gold Champion', icon: '🥇' },
    2: { title: 'Silver Star', icon: '🥈' },
    3: { title: 'Bronze Hero', icon: '🥉' },
    4: { title: 'Top Contender', icon: '🏅' },
    5: { title: 'Rising Star', icon: '🌟' },
    default: { title: 'Participant', icon: '🎉' }
};

// Function to update points and assign badges when status changes to "Accepted"
async function handleStatusUpdate(payload) {
    const { old: oldRecord, new: newRecord } = payload;

    console.log('Status update detected:', { oldRecord, newRecord });

    // Check if status changed from "Pending" to "Accepted"
    if (oldRecord.status === 'Pending' && newRecord.status === 'Accepted') {
        const participantId = newRecord.participant_id;
        const userId = participantId; // Assuming participant_id matches user_id

        // Fetch user details
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, fullname')
            .eq('id', userId)
            .single();

        if (userError) {
            console.error('Error fetching user:', userError.message);
            return;
        }

        const userName = user.fullname;
        console.log('User found:', { userId, userName });

        // Update points in the leaderboard
        const { data: leaderboardEntry, error: leaderboardError } = await supabase
            .from('leaderboard')
            .select('points')
            .eq('user_id', userId)
            .single();

        if (leaderboardError && leaderboardError.code !== 'PGRST116') {
            console.error('Error fetching leaderboard entry:', leaderboardError.message);
            return;
        }

        let newPoints = 50; // Points awarded for accepted registration
        if (leaderboardEntry) {
            newPoints = leaderboardEntry.points + 50;
            const { error } = await supabase
                .from('leaderboard')
                .update({ points: newPoints })
                .eq('user_id', userId);
            if (error) console.error('Error updating points:', error.message);
        } else {
            const { error } = await supabase
                .from('leaderboard')
                .insert({ user_id: userId, name: userName, points: newPoints });
            if (error) console.error('Error inserting new leaderboard entry:', error.message);
        }

        // Refresh the leaderboard and badges
        await updateLeaderboard();
        await displayUserBadges();
    }
}

// Function to update the leaderboard display
async function updateLeaderboard() {
    try {
        const { data: leaderboardData, error } = await supabase
            .from('leaderboard')
            .select('name, points, user_id')
            .order('points', { ascending: false });

        if (error) {
            console.error('Error fetching leaderboard data:', error.message);
            return;
        }

        console.log('Leaderboard data fetched:', leaderboardData);

        const leaderboardBody = document.getElementById('leaderboard-body');
        if (!leaderboardBody) {
            console.error('Leaderboard body element not found');
            return;
        }

        leaderboardBody.innerHTML = ''; // Clear existing rows

        if (!leaderboardData || leaderboardData.length === 0) {
            leaderboardBody.innerHTML = '<tr><td colspan="4">No participants yet.</td></tr>';
            console.log('No leaderboard data available');
            return;
        }

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

            const badgeCell = document.createElement('td');
            const badge = rankBadges[index + 1] || rankBadges.default;
            badgeCell.innerHTML = `${badge.icon} ${badge.title}`;

            row.appendChild(rankCell);
            row.appendChild(nameCell);
            row.appendChild(pointsCell);
            row.appendChild(badgeCell);
            leaderboardBody.appendChild(row);
        });
    } catch (error) {
        console.error('Unexpected error in updateLeaderboard:', error.message);
    }
}

// Function to display the logged-in user's badges
async function displayUserBadges() {
    if (!loggedInUserId) {
        console.error('No logged-in user ID available');
        return;
    }

    try {
        const { data: userBadges, error } = await supabase
            .from('user_badges')
            .select('badges(name, icon_url)')
            .eq('user_id', loggedInUserId);

        if (error) {
            console.error('Error fetching user badges:', error.message);
            return;
        }

        console.log('User badges fetched:', userBadges);

        const badgesContainer = document.getElementById('badges-container');
        if (!badgesContainer) {
            console.error('Badges container element not found');
            return;
        }

        badgesContainer.innerHTML = ''; // Clear existing badges

        if (!userBadges || userBadges.length === 0) {
            badgesContainer.innerHTML = '<p>No badges earned yet.</p>';
            console.log('No badges available for user');
            return;
        }

        userBadges.forEach(badge => {
            const badgeCard = document.createElement('div');
            badgeCard.className = 'badge-card';
            badgeCard.innerHTML = `${badge.badges.icon_url}<p>${badge.badges.name}</p>`;
            badgesContainer.appendChild(badgeCard);
        });
    } catch (error) {
        console.error('Unexpected error in displayUserBadges:', error.message);
    }
}

// Subscribe to changes in the register table
supabase
    .channel('register-changes')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'register' }, handleStatusUpdate)
    .subscribe();

// Initial load of leaderboard and badges
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, starting initialization');
    const userId = await getLoggedInUser();
    if (userId) {
        console.log('User authenticated, updating leaderboard and badges');
        await updateLeaderboard();
        await displayUserBadges();
    } else {
        console.error('User not authenticated, displaying fallback message');
        const leaderboardBody = document.getElementById('leaderboard-body');
        if (leaderboardBody) {
            leaderboardBody.innerHTML = '<tr><td colspan="4">Please log in to view the leaderboard.</td></tr>';
        }
    }
});
