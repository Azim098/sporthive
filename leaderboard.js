// Initialize Supabase client
const supabase = window.supabase.createClient(
    'https://idydtkpvhedgyoexkiox.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY'
);

let loggedInUserId = null;

async function getLoggedInUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            console.error('Error fetching user or user not logged in:', error?.message || 'No user session');
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

const rankBadges = {
    1: { title: 'Gold Champion', icon: '🥇' },
    2: { title: 'Silver Star', icon: '🥈' },
    3: { title: 'Bronze Hero', icon: '🥉' },
    4: { title: 'Top Contender', icon: '🏅' },
    5: { title: 'Rising Star', icon: '🌟' },
    default: { title: 'Participant', icon: '🎉' }
};

async function updateLeaderboard() {
    try {
        // Fetch accepted registrations and join with users and leaderboard
        const { data: registrations, error: regError } = await supabase
            .from('register')
            .select(`
                participant_id,
                event_id,
                status,
                users(fullname),
                leaderboard(points, user_id)
            `)
            .eq('status', 'Accepted')
            .leftJoin('users', 'register.participant_id = users.id')
            .leftJoin('leaderboard', 'register.participant_id = leaderboard.user_id');

        if (regError) {
            console.error('Error fetching registrations:', regError.message);
            return;
        }

        // Aggregate points for each participant
        const participantPoints = {};
        registrations.forEach(reg => {
            const userId = reg.participant_id;
            if (!participantPoints[userId]) {
                participantPoints[userId] = {
                    name: reg.users.fullname,
                    points: reg.leaderboard?.points || 0,
                    user_id: userId
                };
            }
            // Award 50 points for each accepted registration
            participantPoints[userId].points += 50;
        });

        // Update leaderboard with aggregated points
        const leaderboardEntries = Object.values(participantPoints);
        for (const entry of leaderboardEntries) {
            const { data, error } = await supabase
                .from('leaderboard')
                .upsert(
                    { user_id: entry.user_id, name: entry.name, points: entry.points, rank: 0 },
                    { onConflict: 'user_id' }
                )
                .select();
            if (error) console.error('Error updating leaderboard:', error.message);
        }

        // Fetch updated leaderboard data
        const { data: leaderboardData, error } = await supabase
            .from('leaderboard')
            .select('name, points, user_id')
            .order('points', { ascending: false });

        if (error) {
            console.error('Error fetching leaderboard data:', error.message);
            return;
        }

        const leaderboardBody = document.getElementById('leaderboard-body');
        if (!leaderboardBody) {
            console.error('Leaderboard body element not found');
            return;
        }

        leaderboardBody.innerHTML = '';

        if (!leaderboardData || leaderboardData.length === 0) {
            leaderboardBody.innerHTML = '<tr><td colspan="4">No participants yet.</td></tr>';
            console.log('No leaderboard data available');
            return;
        }

        leaderboardData.forEach((entry, index) => {
            const rank = index + 1;
            const badge = rankBadges[rank] || rankBadges.default;

            const row = document.createElement('tr');
            row.className = 'table-row';
            if (entry.user_id === loggedInUserId) row.classList.add('user-row');

            const rankCell = document.createElement('td');
            const rankDiv = document.createElement('div');
            rankDiv.className = 'rank-number';
            if (index === 0) rankDiv.classList.add('top-rank');
            if (index === 1) rankDiv.classList.add('second-rank');
            if (index === 2) rankDiv.classList.add('third-rank');
            if (entry.user_id === loggedInUserId) rankDiv.classList.add('user-rank');
            rankDiv.textContent = rank;
            rankCell.appendChild(rankDiv);

            const nameCell = document.createElement('td');
            nameCell.textContent = entry.user_id === loggedInUserId ? `You (${entry.name})` : entry.name;

            const pointsCell = document.createElement('td');
            pointsCell.textContent = entry.points;

            const badgeCell = document.createElement('td');
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

        const badgesContainer = document.getElementById('badges-container');
        if (!badgesContainer) {
            console.error('Badges container element not found');
            return;
        }

        badgesContainer.innerHTML = '';

        if (!userBadges || userBadges.length === 0) {
            badgesContainer.innerHTML = '<p>No badges earned yet.</p>';
            console.log('No badges available for user');
            return;
        }

        userBadges.forEach(badge => {
            const badgeCard = document.createElement('div');
            badgeCard.className = 'badge-card';
            badgeCard.innerHTML = `<img src="${badge.badges.icon_url}" alt="${badge.badges.name}"><p>${badge.badges.name}</p>`;
            badgesContainer.appendChild(badgeCard);
        });
    } catch (error) {
        console.error('Unexpected error in displayUserBadges:', error.message);
    }
}

async function handleStatusUpdate(payload) {
    const { old: oldRecord, new: newRecord } = payload;
    if (oldRecord.status === 'Pending' && newRecord.status === 'Accepted') {
        console.log('Status changed to Accepted, processing participant:', newRecord.participant_id);
        await updateLeaderboard();
        await displayUserBadges();
    }
}

supabase
    .channel('register-changes')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'register' }, handleStatusUpdate)
    .subscribe((status) => console.log('Subscription status:', status));

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
