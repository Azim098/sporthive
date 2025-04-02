// Initialize Supabase
const { createClient } = supabase;
const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Function to fetch and display registrations for the logged-in organizer
async function fetchOrganizerRegistrations() {
    // Get logged-in organizer
    const { data: user, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user.user) {
        console.error("Error fetching user:", userError);
        return;
    }
    const organizerId = user.user.id; // Organizer's unique ID

    // Fetch events created by this organizer
    const { data: events, error: eventError } = await supabaseClient
        .from("events")
        .select("id")
        .eq("organizer_id", organizerId);

    if (eventError) {
        console.error("Error fetching events:", eventError);
        return;
    }

    const eventIds = events.map(event => event.id); // Get event IDs created by organizer

    // Fetch participants for these events
    const { data: participants, error: participantError } = await supabaseClient
        .from("register")
        .select("id, participant_id, event_id, unique_code, registered_at, users(fullname, email), events(name)")
        .in("event_id", eventIds);

    if (participantError) {
        console.error("Error fetching participants:", participantError);
        return;
    }

    // Fetch volunteers for these events
    const { data: volunteers, error: volunteerError } = await supabaseClient
        .from("volunteers")
        .select("id, participant_id, event_id, unique_code, registered_at, users(fullname, email), events(name)")
        .in("event_id", eventIds);

    if (volunteerError) {
        console.error("Error fetching volunteers:", volunteerError);
        return;
    }

    // Display data
    displayRegistrations(participants, "registrations-table-body");
    displayRegistrations(volunteers, "volunteers-table-body");
}

// Function to display registrations in table
function displayRegistrations(data, tableId) {
    const tableBody = document.getElementById(tableId);
    tableBody.innerHTML = "";

    data.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.users.fullname}</td>
            <td>${item.users.email}</td>
            <td>${item.events.name}</td>
            <td>${item.unique_code}</td>
            <td class="status pending">Pending</td>
            <td>
                <button class="approve-btn" onclick="approveRegistration('${item.id}', '${tableId}')">Approve</button>
                <button class="reject-btn" onclick="rejectRegistration('${item.id}', '${tableId}')">Reject</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Function to approve registration
async function approveRegistration(id, tableId) {
    const table = tableId.includes("volunteer") ? "volunteers" : "register";
    const { error } = await supabaseClient
        .from(table)
        .update({ status: "Accepted" })
        .match({ id });

    if (error) {
        console.error("Error updating status:", error);
        return;
    }
    fetchOrganizerRegistrations();
}

// Function to reject registration
async function rejectRegistration(id, tableId) {
    const table = tableId.includes("volunteer") ? "volunteers" : "register";
    const { error } = await supabaseClient
        .from(table)
        .delete()
        .match({ id });

    if (error) {
        console.error("Error deleting registration:", error);
        return;
    }
    fetchOrganizerRegistrations();
}

// Load registrations on page load
document.addEventListener("DOMContentLoaded", fetchOrganizerRegistrations);
