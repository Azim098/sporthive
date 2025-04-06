// Initialize Supabase client
const SUPABASE_URL = "https://idydtkpvhedgyoexkiox.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async function () {
    // Fetch the logged-in user
    const { data: userData, error: userError } = await supabase.auth.getSession();
    if (userError || !userData.session || !userData.session.user) {
        console.error("User not authenticated. Redirecting to login.");
        window.location.href = "login.html";
        return;
    }

    const userEmail = userData.session.user.email;
    const userId = userData.session.user.id;

    // Fetch participant details from the "users" table
    const { data: participantData, error: participantError } = await supabase
        .from("users")
        .select("fullname")
        .eq("id", userId)
        .single();

    if (participantError || !participantData) {
        console.error("Error fetching participant details:", participantError);
        document.getElementById("participant-name").textContent = "Participant";
        document.getElementById("participant-email").textContent = userEmail || "Unknown";
    } else {
        document.getElementById("participant-name").textContent = participantData.fullname;
        document.getElementById("participant-email").textContent = userEmail;
    }

    // Fetch total events participated (Accepted in register table)
    const { data: participatedData, error: participatedError } = await supabase
        .from("register")
        .select("id")
        .eq("participant_id", userId)
        .eq("status", "Accepted");

    if (participatedError) {
        console.error("Error fetching participated events:", participatedError);
        document.getElementById("events-participated").textContent = "0";
    } else {
        document.getElementById("events-participated").textContent = participatedData.length;
    }

    // Fetch total events volunteered (Accepted in volunteers table)
    const { data: volunteeredData, error: volunteeredError } = await supabase
        .from("volunteers")
        .select("id")
        .eq("participant_id", userId)
        .eq("status", "Accepted");

    if (volunteeredError) {
        console.error("Error fetching volunteered events:", volunteeredError);
        document.getElementById("events-volunteered").textContent = "0";
    } else {
        document.getElementById("events-volunteered").textContent = volunteeredData.length;
    }

    // Fetch pending events from register table with event details
    const { data: pendingData, error: pendingError } = await supabase
        .from("register")
        .select(`
            id,
            event_id,
            events!register_event_id_fkey (
                name,
                description,
                date,
                location,
                organizer_id,
                users!events_organizer_id_fkey (fullname)
            )
        `)
        .eq("participant_id", userId)
        .eq("status", "Pending");

    if (pendingError) {
        console.error("Error fetching pending events:", pendingError);
        // Fallback to manual join if nested query fails
        if (pendingError.code === 'PGRST200') {
            console.log("Nested join failed, attempting manual join...");
            const { data: manualPendingData, error: manualPendingError } = await supabase
                .from("register")
                .select(`
                    id,
                    event_id,
                    events!register_event_id_fkey (
                        name,
                        description,
                        date,
                        location,
                        organizer_id
                    )
                `)
                .eq("participant_id", userId)
                .eq("status", "Pending");

            if (manualPendingError) {
                console.error("Error with manual join:", manualPendingError);
                document.getElementById("pending-events-container").innerHTML = "<p>Error loading pending events.</p>";
            } else if (!manualPendingData || manualPendingData.length === 0) {
                document.getElementById("pending-events-container").innerHTML = "<p>No pending events.</p>";
            } else {
                const container = document.getElementById("pending-events-container");
                container.innerHTML = "";
                for (const event of manualPendingData) {
                    const { data: organizerData, error: organizerError } = await supabase
                        .from("users")
                        .select("fullname")
                        .eq("id", event.events.organizer_id)
                        .single();
                    const organizerName = organizerError || !organizerData ? "Unknown" : organizerData.fullname;

                    const eventCard = document.createElement("div");
                    eventCard.className = "event-card";
                    eventCard.innerHTML = `
                        <h3>${event.events.name}</h3>
                        <p><strong>Description:</strong> ${event.events.description || "N/A"}</p>
                        <p><strong>Date:</strong> ${event.events.date || "N/A"}</p>
                        <p><strong>Location:</strong> ${event.events.location || "N/A"}</p>
                        <p><strong>Organizer:</strong> ${organizerName}</p>
                    `;
                    container.appendChild(eventCard);
                }
            }
        } else {
            document.getElementById("pending-events-container").innerHTML = "<p>Error loading pending events.</p>";
        }
    } else if (!pendingData || pendingData.length === 0) {
        document.getElementById("pending-events-container").innerHTML = "<p>No pending events.</p>";
    } else {
        const container = document.getElementById("pending-events-container");
        container.innerHTML = "";
        pendingData.forEach(event => {
            const eventCard = document.createElement("div");
            eventCard.className = "event-card";
            eventCard.innerHTML = `
                <h3>${event.events.name}</h3>
                <p><strong>Description:</strong> ${event.events.description || "N/A"}</p>
                <p><strong>Date:</strong> ${event.events.date || "N/A"}</p>
                <p><strong>Location:</strong> ${event.events.location || "N/A"}</p>
                <p><strong>Organizer:</strong> ${event.events.users?.fullname || "Unknown"}</p>
            `;
            container.appendChild(eventCard);
        });
    }
});

// Logout function
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Error logging out:", error);
        alert("Failed to log out. Please try again.");
    } else {
        console.log("User logged out successfully");
        window.location.href = "index.html";
    }
}

// Attach logout function to button
document.getElementById("logout-btn").addEventListener("click", logout);
