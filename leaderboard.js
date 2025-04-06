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

async function updateLeaderboard() {
    try {
        const { data: leaderboardData, error } = await supabase
            .from('leaderboard')
            .select('name, points, user_id, rank')
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
            leaderboardBody.innerHTML = '<tr><td colspan="3">No participants yet.</td></tr>';
            console.log('No leaderboard data available');
            return;
        }

        leaderboardData.forEach((entry, index) => {
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
            rankDiv.textContent = entry.rank || (index + 1); // Use stored rank or fallback to index
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

// Real-time updates for leaderboard changes
supabase
    .channel('leaderboard-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, async () => {
        console.log('Leaderboard updated, refreshing display');
        await updateLeaderboard();
    })
    .subscribe((status) => console.log('Subscription status:', status));

// Initial load
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
            leaderboardBody.innerHTML = '<tr><td colspan="3">Please log in to view the leaderboard.</td></tr>';
        }
    }
});
