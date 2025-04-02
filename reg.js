// Initialize Supabase

const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Function to fetch and display registrations for the logged-in organizer
async function fetchOrganizerRegistrations() {
    console.log("Fetching registrations...");

    // Get logged-in organizer
    const { data: user, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user?.user) {
        console.error("Error fetching user or user not logged in:", userError);
        return;
    }
    
    const organizerId = user.user.id;
    console.log("Logged-in Organizer ID:", organizerId);

    // Fetch events created by this organizer
    const { data: events, error: eventError } = await supabaseClient
        .from("events")
        .select("id")
        .eq("organizer_id", organizerId);

    if (eventError) {
        console.error("Error fetching events:", eventError);
        return;
    }

    if (!events || events.length === 0) {
        console.warn("No events found for this organizer.");
        return;
    }

    console.log("Organizer's Events:", events);
    const eventIds = events.map(event => event.id);

    // Fetch registered participants
    const { data: participants, error: participantError } = await supabaseClient
    .from("register")
    .select("id, status, unique_code, users:participant_id(fullname, email), events:event_id(name)")
    .in("event_id", eventIds);

    if (participantError) {
        console.error("Error fetching participants:", participantError);
        return;
    }

    console.log("Fetched Participants:", participants);

    // Fetch registered volunteers
    const { data: volunteers, error: volunteerError } = await supabaseClient
    .from("volunteers")
    .select("id, status, unique_code, users:participant_id(fullname, email), events:event_id(name)")
    .in("event_id", eventIds);

    if (volunteerError) {
        console.error("Error fetching volunteers:", volunteerError);
        return;
    }

    console.log("Fetched Volunteers:", volunteers);

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
    <td>${item.users?.fullname || "N/A"}</td>
    <td>${item.users?.email || "N/A"}</td>
    <td>${item.events?.name || "N/A"}</td>
    <td>${item.unique_code || "N/A"}</td>
    <td class="status ${item.status === 'Accepted' ? 'confirmed' : 'pending'}">
        ${item.status || 'Pending'}
    </td>
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
    console.log(`Registration ${id} approved.`);
    fetchOrganizerRegistrations(); // Refresh table
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
    console.log(`Registration ${id} rejected and removed.`);
    fetchOrganizerRegistrations(); // Refresh table
}

// Load registrations on page load
document.addEventListener("DOMContentLoaded", fetchOrganizerRegistrations);
