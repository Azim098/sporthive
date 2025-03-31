// ✅ Supabase Initialization
const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    loadEvents();
    setupFilters();
});

// ✅ Load events
async function loadEvents(filters = {}) {
    console.log("Loading events...");

    let query = supabase.from("events").select("*");

    // Apply filters dynamically
    if (filters.name) {
        query = query.ilike("name", `%${filters.name}%`);
    }
    if (filters.skillLevel) {
        query = query.eq("skill_level", filters.skillLevel);
    }
    if (filters.eventTime) {
        query = query.eq("time_of_day", filters.eventTime);
    }
    if (filters.sport) {
        query = query.ilike("sport", `%${filters.sport}%`);
    }

    const { data: events, error } = await query;

    if (error) {
        console.error("Error loading events:", error.message);
        return;
    }

    displayEvents(events);
}

// ✅ Display events with date and slots left
function displayEvents(events) {
    const eventsList = document.getElementById("eventsList");
    eventsList.innerHTML = "";

    if (!events || events.length === 0) {
        eventsList.innerHTML = "<p>No events found.</p>";
        return;
    }

    events.forEach(event => {
        const slotsLeft = event.total_registrations - event.current_registrations;

        const eventCard = document.createElement("div");
        eventCard.classList.add("event-card");

        eventCard.innerHTML = `
            <h3>${event.name}</h3>
            <p>${event.description}</p>
            <p><strong>Skill Level:</strong> ${event.skill_level}</p>
            <p><strong>Sport:</strong> ${event.sport}</p>
            <p><strong>Time:</strong> ${event.time_of_day}</p>
            <p><strong>Date:</strong> ${new Date(event.date).toDateString()}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p><strong>Registrations:</strong> ${event.current_registrations}/${event.total_registrations}</p>
            <p><strong>Slots Left:</strong> ${slotsLeft}</p>
            
            <button class="register-button" data-event-id="${event.id}" id="reg-btn-${event.id}">Register</button>
            
            <button class="volunteer-button" data-event-id="${event.id}" id="vol-btn-${event.id}">Register as Volunteer</button>
        `;

        eventsList.appendChild(eventCard);

        // Button interactions
        const regButton = document.getElementById(`reg-btn-${event.id}`);
        const volButton = document.getElementById(`vol-btn-${event.id}`);

        // Hide the other button on click
        regButton.addEventListener("click", () => {
            registerForEvent(event, regButton);
            volButton.style.display = "none";
        });

        volButton.addEventListener("click", () => {
            registerAsVolunteer(event, volButton);
            regButton.style.display = "none";
        });
    });
}

// ✅ Register for event
async function registerForEvent(event, button) {
    console.log(`Registering for event ID: ${event.id}`);
    
    const { data, error } = await supabase
        .from("events")
        .update({ current_registrations: event.current_registrations + 1 })
        .eq("id", event.id);

    if (error) {
        console.error("Error registering:", error.message);
        alert("Failed to register.");
        return;
    }

    alert(`Successfully registered for ${event.name}!`);
    button.style.display = "none";  // Hide register button after registering
}

// ✅ Register as volunteer
async function registerAsVolunteer(event, button) {
    console.log(`Registering as volunteer for event ID: ${event.id}`);
    
    const { data, error } = await supabase
        .from("events")
        .update({ current_volunteers: event.current_volunteers + 1 })
        .eq("id", event.id);

    if (error) {
        console.error("Error registering as volunteer:", error.message);
        alert("Failed to register as volunteer.");
        return;
    }

    alert(`Successfully registered as a volunteer for ${event.name}!`);
    button.style.display = "none";  // Hide volunteer button after registering
}

// ✅ Filtering functionality
function setupFilters() {
    const searchBtn = document.getElementById("searchBtn");

    searchBtn.addEventListener("click", () => {
        const nameFilter = document.getElementById("searchInput").value.trim();
        const skillLevelFilter = document.getElementById("skill-level").value;
        const eventTimeFilter = document.getElementById("event-time").value;
        const sportFilter = document.getElementById("sports").value;

        const filters = {
            name: nameFilter || null,
            skillLevel: skillLevelFilter || null,
            eventTime: eventTimeFilter || null,
            sport: sportFilter || null,
        };

        loadEvents(filters);
    });
}
