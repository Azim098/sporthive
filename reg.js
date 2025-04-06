// reg.js
// Initialize Supabase
const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Check authentication state
supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("Auth state changed:", event, session ? session.user.id : "No user");
});

// Function to fetch and display registrations
async function fetchOrganizerRegistrations() {
    try {
        const { data: user, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user?.user) throw new Error("User not logged in: " + (userError?.message || "Unknown error"));

        const organizerId = user.user.id;
        const { data: events, error: eventError } = await supabaseClient
            .from("events")
            .select("id")
            .eq("organizer_id", organizerId);

        if (eventError) throw new Error("Error fetching events: " + eventError.message);
        if (!events?.length) {
            updateTableStatus("registrations-table-body", "No events found for this organizer");
            updateTableStatus("volunteers-table-body", "No events found for this organizer");
            return;
        }

        const eventIds = events.map(event => event.id);

        const { data: participants, error: participantError } = await supabaseClient
            .from("register")
            .select("id, status, unique_code, participant_id, users:participant_id(fullname, email), events:event_id(name)")
            .in("event_id", eventIds);

        if (participantError) throw new Error("Error fetching participants: " + participantError.message);

        const { data: volunteers, error: volunteerError } = await supabaseClient
            .from("volunteers")
            .select("id, status, unique_code, participant_id, users:participant_id(fullname, email), events:event_id(name)")
            .in("event_id", eventIds);

        if (volunteerError) throw new Error("Error fetching volunteers: " + volunteerError.message);

        displayRegistrations(participants || [], "registrations-table-body");
        displayRegistrations(volunteers || [], "volunteers-table-body");

    } catch (error) {
        console.error("Error in fetchOrganizerRegistrations:", error.message);
        updateTableStatus("registrations-table-body", "Error loading participants: " + error.message);
        updateTableStatus("volunteers-table-body", "Error loading volunteers: " + error.message);
    }
}

// Function to display registrations
function displayRegistrations(data, tableId) {
    const tableBody = document.getElementById(tableId);
    tableBody.innerHTML = "";
    
    if (!data.length) {
        tableBody.innerHTML = `<tr><td colspan="6">No ${tableId.includes("volunteer") ? "volunteers" : "participants"} found</td></tr>`;
        return;
    }

    data.forEach(item => {
        const row = document.createElement("tr");
        const status = item.status || "Pending";
        row.innerHTML = `
            <td>${item.users?.fullname || "N/A"}</td>
            <td>${item.users?.email || "N/A"}</td>
            <td>${item.events?.name || "N/A"}</td>
            <td>${item.unique_code || "N/A"}</td>
            <td class="status ${status === 'Accepted' ? 'confirmed' : 'pending'}">${status}</td>
            <td>
                <button class="approve-btn" onclick="approveRegistration('${item.id}', '${item.participant_id}', '${tableId}')">Approve</button>
                <button class="reject-btn" onclick="rejectRegistration('${item.id}', '${tableId}')">Reject</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Helper function to update table status
function updateTableStatus(tableId, message) {
    const tableBody = document.getElementById(tableId);
    tableBody.innerHTML = `<tr><td colspan="6">${message}</td></tr>`;
}

// Approve registration and update leaderboard/badges
async function approveRegistration(id, participantId, tableId) {
    try {
        const table = tableId.includes("volunteer") ? "volunteers" : "register";
        const { data, error } = await supabaseClient
            .from(table)
            .update({ status: "Accepted" })
            .eq("id", id)
            .select();

        if (error) throw new Error("Error approving registration: " + error.message);
        console.log(`Registration approved in ${table}:`, data);

        // Update leaderboard and badges for the participant
        await updateLeaderboard(participantId);

        // Refresh the table
        fetchOrganizerRegistrations();

    } catch (error) {
        console.error("Approve Error:", error.message);
        alert("Failed to approve registration: " + error.message);
    }
}

// Update leaderboard and badges
async function updateLeaderboard(userId) {
    try {
        // Check if user exists in leaderboard
        const { data: leaderboardData, error: leaderboardError } = await supabaseClient
            .from("leaderboard")
            .select("*")
            .eq("user_id", userId)
            .single();

        if (leaderboardError && leaderboardError.code !== "PGRST116") throw new Error("Error fetching leaderboard: " + leaderboardError.message);

        const pointsToAdd = 50;
        let newPoints;

        if (leaderboardData) {
            // User already exists, update points
            newPoints = leaderboardData.points + pointsToAdd;
            const { data, error } = await supabaseClient
                .from("leaderboard")
                .update({ points: newPoints })
                .eq("user_id", userId)
                .select();
            if (error) throw new Error("Error updating leaderboard: " + error.message);
            console.log("Updated leaderboard entry:", data);
        } else {
            // First event approval, insert new entry
            const { data: userData, error: userError } = await supabaseClient
                .from("users")
                .select("fullname")
                .eq("id", userId)
                .single();
            if (userError) throw new Error("Error fetching user data: " + userError.message);

            newPoints = pointsToAdd;
            const newId = crypto.randomUUID();
            const leaderboardEntry = {
                id: newId,
                name: userData.fullname,
                points: Number(newPoints), // Explicitly ensure integer
                rank: "Unranked",
                user_id: userId
            };
            console.log("Inserting leaderboard entry:", leaderboardEntry); // Debug payload
            const { data, error } = await supabaseClient
                .from("leaderboard")
                .insert(leaderboardEntry)
                .select();
            if (error) throw new Error("Error inserting into leaderboard: " + error.message);
            console.log("Inserted new leaderboard entry:", data);
        }

        // Award badge if points reach or exceed 50
        if (newPoints >= 50) {
            await awardBadge(userId, newPoints);
        }

        // Update ranks
        await updateLeaderboardRanks();

    } catch (error) {
        console.error("Leaderboard Update Error:", error.message);
        throw error;
    }
}

// Award badge and insert into user_badges
async function awardBadge(userId, points) {
    try {
        // Fetch the first available badge
        const { data: badge, error: badgeError } = await supabaseClient
            .from("badges")
            .select("*")
            .limit(1)
            .single();

        if (badgeError) throw new Error("Error fetching badge: " + badgeError.message);
        if (!badge) throw new Error("No badges available in the badges table");

        // Check if user already has this badge
        const { data: existingBadge, error: existingError } = await supabaseClient
            .from("user_badges")
            .select("*")
            .eq("user_id", userId)
            .eq("badge_id", badge.id)
            .single();

        if (existingError && existingError.code !== "PGRST116") throw new Error("Error checking existing badge: " + existingError.message);

        // Award badge if points >= 50 and user doesn’t have it yet
        if (!existingBadge && points >= 50) {
            const badgeEntry = {
                id: crypto.randomUUID(),
                user_id: userId,
                badge_id: badge.id
            };
            console.log("Inserting user_badges entry:", badgeEntry); // Debug payload
            const { data, error } = await supabaseClient
                .from("user_badges")
                .insert(badgeEntry)
                .select();
            if (error) throw new Error("Error inserting into user_badges: " + error.message);
            console.log(`Badge ${badge.name} awarded to user ${userId} with ${points} points:`, data);
        } else if (existingBadge) {
            console.log(`User ${userId} already has badge ${badge.name}`);
        } else {
            console.log(`User ${userId} has ${points} points, not enough for badge ${badge.name}`);
        }

    } catch (error) {
        console.error("Badge Award Error:", error.message);
        throw error;
    }
}

// Update leaderboard ranks
async function updateLeaderboardRanks() {
    try {
        const { data: leaderboard, error } = await supabaseClient
            .from("leaderboard")
            .select("*")
            .order("points", { ascending: false });

        if (error) throw new Error("Error fetching leaderboard for ranking: " + error.message);

        const updates = leaderboard.map((entry, index) => ({
            id: entry.id,
            rank: `${index + 1}`
        }));

        await Promise.all(updates.map(update => 
            supabaseClient
                .from("leaderboard")
                .update({ rank: update.rank })
                .eq("id", update.id)
                .select()
                .then(({ data, error }) => {
                    if (error) throw error;
                    console.log(`Updated rank for ${update.id}:`, data);
                })
        ));

        console.log("Leaderboard ranks updated successfully");
    } catch (error) {
        console.error("Rank Update Error:", error.message);
        throw error;
    }
}

// Reject registration
async function rejectRegistration(id, tableId) {
    try {
        const table = tableId.includes("volunteer") ? "volunteers" : "register";
        const { error } = await supabaseClient
            .from(table)
            .delete()
            .eq("id", id);

        if (error) throw new Error("Error rejecting registration: " + error.message);
        fetchOrganizerRegistrations();
    } catch (error) {
        console.error("Reject Error:", error.message);
        alert("Failed to reject registration: " + error.message);
    }
}

// Load data on page load
document.addEventListener("DOMContentLoaded", fetchOrganizerRegistrations);
