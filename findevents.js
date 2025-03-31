const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "";  // Replace with your actual Supabase key
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    loadEvents();

    // ✅ Event listener for toggle filterseyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY
    document.getElementById("s1-14").addEventListener("change", async (e) => {
        if (e.target.checked) {
            await applyFilteredEvents();
        } else {
            await loadEvents();
        }
    });

    // ✅ Event listener for filter button
    document.querySelector(".apply-filters").addEventListener("click", async () => {
        const toggleFilters = document.getElementById("s1-14").checked;
        if (toggleFilters) {
            await applyFilteredEvents();
        } else {
            await loadEvents();
        }
    });

    // ✅ Event listener for search button
    const searchButton = document.getElementById("searchButton");  // Replace with the actual button ID
    if (searchButton) {
        searchButton.addEventListener("click", async () => {
            await applyFilteredEvents();
        });
    }
});

// ✅ Load and display events with optional filters
async function loadEvents(searchQuery = "", skillLevel = "", eventTime = "", sport = "") {
    console.log("Loading events...");

    let filters = [];

    if (searchQuery) {
        filters.push(`name.ilike.%${searchQuery}%`);
        filters.push(`description.ilike.%${searchQuery}%`);
    }
    if (skillLevel) {
        filters.push(`difficulty.eq.${skillLevel}`);
    }
    if (eventTime) {
        const timeRange = getTimeRange(eventTime);
        filters.push(`time.gte.${timeRange.start}`);
        filters.push(`time.lt.${timeRange.end}`);
    }
    if (sport) {
        filters.push(`name.ilike.%${sport}%`);
    }

    let query = supabase
        .from("events")
        .select("*", { head: false })  // Ensure full data retrieval
        .headers({ "Accept": "application/json" });

    // Combine filters with OR logic
    if (filters.length > 0) {
        query = query.or(filters.join(","));
    }

    const { data: events, error } = await query;

    if (error) {
        console.error("Error loading events:", error.message);
        return;
    }

    displayEvents(events);
}

// ✅ Apply filters based on user input
async function applyFilteredEvents() {
    const searchQuery = document.getElementById("searchInput").value.trim();
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
            <p class="unique-code" style="font-weight: bold;"></p>
        `;

        eventsList.appendChild(eventCard);

        const button = eventCard.querySelector(".register-button");
        const codeElement = eventCard.querySelector(".unique-code");

        checkRegistration(event.id, button, codeElement);

        button.addEventListener("click", async () => {
            await registerForEvent(event.id, button, codeElement);
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

// ✅ Check if the user is already registered
async function checkRegistration(eventId, button, codeElement) {
    const participantId = await getUserId();
    if (!participantId) return;

    const { data, error } = await supabase
        .from("register")
        .select("unique_code", { head: false })
        .eq("participant_id", participantId)
        .eq("event_id", eventId)
        .single()
        .headers({ "Accept": "application/json" });

    if (data) {
        button.textContent = "Registered";
        button.disabled = true;
        button.classList.add("registered");
        codeElement.textContent = `Your Code: ${data.unique_code}`;
    }
}

// ✅ Register the user for the event
async function registerForEvent(eventId, button, codeElement) {
    const participantId = await getUserId();
    if (!participantId) {
        alert("You need to log in to register!");
        return;
    }

    const uniqueCode = generateUniqueCode();

    const { data, error } = await supabase
        .from("register")
        .insert([{ 
            participant_id: participantId, 
            event_id: eventId, 
            unique_code: uniqueCode 
        }])
        .headers({ "Accept": "application/json" });

    if (error) {
        console.error("Registration failed:", error.message);
        return;
    }

    button.textContent = "Registered";
    button.disabled = true;
    button.classList.add("registered");
    codeElement.textContent = `Your Code: ${uniqueCode}`;
}
