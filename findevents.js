// ✅ Include Supabase Initialization
const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";  
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    loadEvents();

    // ✅ Filter button event listener
    document.querySelector(".apply-filters").addEventListener("click", async () => {
        const searchQuery = document.getElementById("searchInput").value.trim();
        await applyFilteredEvents(searchQuery);  // Search + filters
    });

    // ✅ Search button event listener
    const searchButton = document.getElementById("searchButton");
    if (searchButton) {
        searchButton.addEventListener("click", async () => {
            const searchQuery = document.getElementById("searchInput").value.trim();
            await applyFilteredEvents(searchQuery);  // Search + filters
        });
    }
});

// ✅ Load and display events with optional filters
async function loadEvents(searchQuery = "", skillLevel = "", eventTime = "", sport = "") {
    console.log("Loading events...");

    let query = supabase.from("events").select("*");

    // ✅ Apply filters
    if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    if (skillLevel) {
        query = query.filter("difficulty", "eq", skillLevel);
    }
    if (eventTime) {
        const timeRange = getTimeRange(eventTime);
        query = query.gte("time", timeRange.start).lt("time", timeRange.end);
    }
    if (sport) {
        query = query.or(`name.ilike.%${sport}%`);
    }

    const { data: events, error } = await query;

    if (error) {
        console.error("Error loading events:", error.message);
        return;
    }

    displayEvents(events);
}

// ✅ Apply filters with optional search query
async function applyFilteredEvents(searchQuery = "") {
    const skillLevel = document.getElementById("skill-level").value;
    const eventTime = document.getElementById("event-time").value;
    const sport = document.getElementById("sports").value;

    await loadEvents(searchQuery, skillLevel, eventTime, sport);
}

// ✅ Map event time slot to range
function getTimeRange(slot) {
    switch (slot) {
        case "morning": 
            return { start: "06:00", end: "12:00" };
        case "afternoon": 
            return { start: "12:00", end: "17:00" };
        case "evening": 
            return { start: "17:00", end: "21:00" };
        case "night": 
            return { start: "21:00", end: "06:00" };
        default:
            return { start: "00:00", end: "23:59" };
    }
}

// ✅ Display the events in the HTML
function displayEvents(events) {
    const eventsList = document.getElementById("eventsList");
    eventsList.innerHTML = "";

    if (!events || events.length === 0) {
        eventsList.innerHTML = "<p>No events found.</p>";
        return;
    }

    events.forEach(event => {
        const eventCard = document.createElement("div");
        eventCard.classList.add("event-card");

        // Check if registration is full
        const isRegistrationFull = event.current_registrations >= event.total_registrations;

        eventCard.innerHTML = `
            <h3>${event.name}</h3>
            <p>${event.description}</p>
            <p><strong>Time:</strong> ${event.time}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p><strong>Participants:</strong> ${event.current_registrations} / ${event.total_registrations}</p>
            <p><strong>Volunteers:</strong> ${event.current_volunteers} / ${event.total_volunteers}</p>
            ${isRegistrationFull ? '<p style="color: red;"><strong>Registration Full</strong></p>' : `
                <button class="register-button" data-event-id="${event.id}" style="display: block;">Register</button>
                <button class="volunteer-button" data-event-id="${event.id}" style="display: block;">Register as Volunteer</button>
            `}
            <p class="unique-code" style="font-weight: bold;"></p>
            <p class="volunteer-code" style="font-weight: bold;"></p>
        `;

        eventsList.appendChild(eventCard);

        if (!isRegistrationFull) {
            const registerButton = eventCard.querySelector(".register-button");
            const volunteerButton = eventCard.querySelector(".volunteer-button");
            const codeElement = eventCard.querySelector(".unique-code");
            const volunteerCodeElement = eventCard.querySelector(".volunteer-code");

            // Check registration status and hide opposing button if already registered
            checkRegistration(event.id, registerButton, volunteerButton, codeElement);
            checkVolunteerRegistration(event.id, registerButton, volunteerButton, volunteerCodeElement);

            registerButton.addEventListener("click", async () => {
                await registerForEvent(event.id, event.total_registrations, event.current_registrations, registerButton, volunteerButton, codeElement);
            });

            volunteerButton.addEventListener("click", async () => {
                await registerAsVolunteer(event.id, event.total_registrations, event.current_registrations, registerButton, volunteerButton, volunteerCodeElement);
            });
        }
    });
}

// ✅ Get the user ID from Supabase auth
async function getUserId() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
        console.error("Failed to retrieve user:", error?.message);
        return null;
    }
    return data.user.id;
}

// ✅ Generate unique registration code
function generateUniqueCode() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
}

// ✅ Check if the user is already registered as a participant
async function checkRegistration(eventId, registerButton, volunteerButton, codeElement) {
    const participantId = await getUserId();
    if (!participantId) return;

    const { data, error } = await supabase
        .from("register")
        .select("unique_code")
        .eq("participant_id", participantId)
        .eq("event_id", eventId)
        .single();

    if (error && error.code !== "PGRST116") { // PGRST116 means no rows found, which is fine
        console.error("Error checking registration:", error.message);
        return;
    }

    if (data) {
        registerButton.textContent = "Registered";
        registerButton.disabled = true;
        registerButton.classList.add("registered");
        codeElement.textContent = `Your Registration Code: ${data.unique_code}`;
        volunteerButton.style.display = "none"; // Hide volunteer button if already registered as participant
    }
}

// ✅ Check if the user is already registered as a volunteer
async function checkVolunteerRegistration(eventId, registerButton, volunteerButton, codeElement) {
    const participantId = await getUserId();
    if (!participantId) return;

    const { data, error } = await supabase
        .from("volunteers")
        .select("unique_code")
        .eq("participant_id", participantId)
        .eq("event_id", eventId)
        .single();

    if (error && error.code !== "PGRST116") { // PGRST116 means no rows found, which is fine
        console.error("Error checking volunteer registration:", error.message);
        return;
    }

    if (data) {
        volunteerButton.textContent = "Volunteered";
        volunteerButton.disabled = true;
        volunteerButton.classList.add("registered");
        codeElement.textContent = `Your Volunteer Code: ${data.unique_code}`;
        registerButton.style.display = "none"; // Hide register button if already registered as volunteer
    }
}

// ✅ Register the user for the event as a participant
async function registerForEvent(eventId, totalRegistrations, currentRegistrations, registerButton, volunteerButton, codeElement) {
    const participantId = await getUserId();
    if (!participantId) {
        alert("You need to log in to register!");
        return;
    }

    // Check if registration limit is reached
    if (currentRegistrations >= totalRegistrations) {
        alert("Registration is full for this event!");
        registerButton.style.display = "none";
        volunteerButton.style.display = "none";
        return;
    }

    // Verify that the event exists
    const { data: event, error: eventError } = await supabase
        .from("events")
        .select("id")
        .eq("id", eventId)
        .single();

    if (eventError || !event) {
        console.error("Event not found:", eventError?.message);
        alert("Event not found. Please try again.");
        return;
    }

    const uniqueCode = generateUniqueCode();

    const { error: insertError } = await supabase
        .from("register")
        .insert([{ 
            participant_id: participantId, 
            event_id: eventId, 
            unique_code: uniqueCode 
        }]);

    if (insertError) {
        console.error("Registration failed:", insertError.message);
        alert(`Failed to register for the event: ${insertError.message}`);
        return;
    }

    registerButton.textContent = "Registered";
    registerButton.disabled = true;
    registerButton.classList.add("registered");
    codeElement.textContent = `Your Registration Code: ${uniqueCode}`;
    volunteerButton.style.display = "none"; // Hide volunteer button after registration

    // Reload events to update the registration count display
    const searchQuery = document.getElementById("searchInput").value.trim();
    await applyFilteredEvents(searchQuery);
}

// ✅ Register the user for the event as a volunteer
async function registerAsVolunteer(eventId, totalRegistrations, currentRegistrations, registerButton, volunteerButton, codeElement) {
    const participantId = await getUserId();
    if (!participantId) {
        alert("You need to log in to volunteer!");
        return;
    }

    // Check if registration limit is reached
    if (currentRegistrations >= totalRegistrations) {
        alert("Registration is full for this event!");
        registerButton.style.display = "none";
        volunteerButton.style.display = "none";
        return;
    }

    // Verify that the event exists
    const { data: event, error: eventError } = await supabase
        .from("events")
        .select("id, total_volunteers, current_volunteers")
        .eq("id", eventId)
        .single();

    if (eventError || !event) {
        console.error("Event not found:", eventError?.message);
        alert("Event not found. Please try again.");
        return;
    }

    // Check if volunteer limit is reached
    if (event.current_volunteers >= event.total_volunteers) {
        alert("Volunteer slots are full for this event!");
        registerButton.style.display = "none";
        volunteerButton.style.display = "none";
        return;
    }

    const uniqueCode = generateUniqueCode();

    const { error: insertError } = await supabase
        .from("volunteers")
        .insert([{ 
            participant_id: participantId, 
            event_id: eventId, 
            unique_code: uniqueCode 
        }]);

    if (insertError) {
        console.error("Volunteer registration failed:", insertError.message);
        alert(`Failed to register as a volunteer: ${insertError.message}`);
        return;
    }

    volunteerButton.textContent = "Volunteered";
    volunteerButton.disabled = true;
    volunteerButton.classList.add("registered");
    codeElement.textContent = `Your Volunteer Code: ${uniqueCode}`;
    registerButton.style.display = "none"; // Hide register button after volunteering

    // Reload events to update the registration count display
    const searchQuery = document.getElementById("searchInput").value.trim();
    await applyFilteredEvents(searchQuery);
}
