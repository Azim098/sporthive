// ✅ Include Supabase Initialization
const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";  
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    loadEvents();

    // ✅ Toggle switch event listener
    document.getElementById("s1-14").addEventListener("change", async (e) => {
        const searchQuery = document.getElementById("searchInput").value.trim();
        if (e.target.checked) {
            await applyFilteredEvents(searchQuery);  // Search + filters
        } else {
            await loadEvents(searchQuery);  // Search by text only
        }
    });

    // ✅ Filter button event listener
    document.querySelector(".apply-filters").addEventListener("click", async () => {
        const searchQuery = document.getElementById("searchInput").value.trim();
        const toggleFilters = document.getElementById("s1-14").checked;

        if (toggleFilters) {
            await applyFilteredEvents(searchQuery);  // Search + filters
        } else {
            await loadEvents(searchQuery);  // Text-only search
        }
    });

    // ✅ Search button event listener
    const searchButton = document.getElementById("searchButton");
    if (searchButton) {
        searchButton.addEventListener("click", async () => {
            const searchQuery = document.getElementById("searchInput").value.trim();
            const toggleFilters = document.getElementById("s1-14").checked;

            if (toggleFilters) {
                await applyFilteredEvents(searchQuery);  // Search + filters
            } else {
                await loadEvents(searchQuery);  // Text-only search
            }
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

        eventCard.innerHTML = `
            <h3>${event.name}</h3>
            <p>${event.description}</p>
            <p><strong>Time:</strong> ${event.time}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <button class="register-button" data-event-id="${event.id}">Register</button>
            <button class="volunteer-button" data-event-id="${event.id}">Register as Volunteer</button>
            <p class="unique-code" style="font-weight: bold;"></p>
            <p class="volunteer-code" style="font-weight: bold;"></p>
        `;

        eventsList.appendChild(eventCard);

        const registerButton = eventCard.querySelector(".register-button");
        const volunteerButton = eventCard.querySelector(".volunteer-button");
        const codeElement = eventCard.querySelector(".unique-code");
        const volunteerCodeElement = eventCard.querySelector(".volunteer-code");

        checkRegistration(event.id, registerButton, codeElement);
        checkVolunteerRegistration(event.id, volunteerButton, volunteerCodeElement);

        registerButton.addEventListener("click", async () => {
            await registerForEvent(event.id, registerButton, codeElement);
        });

        volunteerButton.addEventListener("click", async () => {
            await registerAsVolunteer(event.id, volunteerButton, volunteerCodeElement);
        });
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
async function checkRegistration(eventId, button, codeElement) {
    const participantId = await getUserId();
    if (!participantId) return;

    const { data, error } = await supabase
        .from("register")
        .select("unique_code")
        .eq("participant_id", participantId)
        .eq("event_id", eventId)
        .single();

    if (data) {
        button.textContent = "Registered";
        button.disabled = true;
        button.classList.add("registered");
        codeElement.textContent = `Your Registration Code: ${data.unique_code}`;
    }
}

// ✅ Check if the user is already registered as a volunteer
async function checkVolunteerRegistration(eventId, button, codeElement) {
    const participantId = await getUserId();
    if (!participantId) return;

    const { data, error } = await supabase
        .from("volunteer")
        .select("unique_code")
        .eq("participant_id", participantId)
        .eq("event_id", eventId)
        .single();

    if (data) {
        button.textContent = "Volunteered";
        button.disabled = true;
        button.classList.add("registered");
        codeElement.textContent = `Your Volunteer Code: ${data.unique_code}`;
    }
}

// ✅ Register the user for the event as a participant
async function registerForEvent(eventId, button, codeElement) {
    const participantId = await getUserId();
    if (!participantId) {
        alert("You need to log in to register!");
        return;
    }

    const uniqueCode = generateUniqueCode();

    const { error } = await supabase
        .from("register")
        .insert([{ 
            participant_id: participantId, 
            event_id: eventId, 
            unique_code: uniqueCode 
        }]);

    if (error) {
        console.error("Registration failed:", error.message);
        return;
    }

    button.textContent = "Registered";
    button.disabled = true;
    button.classList.add("registered");
    codeElement.textContent = `Your Registration Code: ${uniqueCode}`;
}

// ✅ Register the user for the event as a volunteer
async function registerAsVolunteer(eventId, button, codeElement) {
    const participantId = await getUserId();
    if (!participantId) {
        alert("You need to log in to volunteer!");
        return;
    }

    const uniqueCode = generateUniqueCode();

    const { error } = await supabase
        .from("volunteer")
        .insert([{ 
            participant_id: participantId, 
            event_id: eventId, 
            unique_code: uniqueCode 
        }]);

    if (error) {
        console.error("Volunteer registration failed:", error.message);
        return;
    }

    button.textContent = "Volunteered";
    button.disabled = true;
    button.classList.add("registered");
    codeElement.textContent = `Your Volunteer Code: ${uniqueCode}`;
}
