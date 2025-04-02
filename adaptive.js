// Initialize Supabase
const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    loadEvents();

    document.getElementById("s1-14").addEventListener("change", applyFilteredEvents);
    document.querySelector(".apply-filters").addEventListener("click", applyFilteredEvents);
    document.querySelector(".search-bar").addEventListener("keypress", (e) => {
        if (e.key === "Enter") applyFilteredEvents();
    });
    document.querySelector(".apply-filters").addEventListener("click", applyFilteredEvents);
});

async function loadEvents(searchQuery = "", filters = {}) {
    let query = supabase.from("events").select("*").eq("disabled_friendly", true);

    if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    if (filters.skillLevel) {
        query = query.eq("difficulty", filters.skillLevel);
    }
    if (filters.eventTime) {
        const timeRange = getTimeRange(filters.eventTime);
        query = query.gte("time", timeRange.start).lt("time", timeRange.end);
    }
    if (filters.sport) {
        query = query.ilike("sport", `%${filters.sport}%`);
    }

    const { data: events, error } = await query;
    if (error) console.error("Error loading events:", error.message);
    displayEvents(events || []);
}

async function applyFilteredEvents() {
    const searchQuery = document.querySelector(".search-bar").value.trim();
    const filtersEnabled = document.getElementById("s1-14").checked;
    
    let filters = {};
    if (filtersEnabled) {
        filters = {
            skillLevel: document.getElementById("skill-level").value,
            eventTime: document.getElementById("event-time").value,
            sport: document.getElementById("sports").value
        };
    }
    await loadEvents(searchQuery, filters);
}

function getTimeRange(slot) {
    const ranges = {
        morning: { start: "06:00", end: "12:00" },
        afternoon: { start: "12:00", end: "17:00" },
        evening: { start: "17:00", end: "21:00" },
        night: { start: "21:00", end: "06:00" }
    };
    return ranges[slot] || { start: "00:00", end: "23:59" };
}

function displayEvents(events) {
    const eventsContainer = document.querySelector(".events-container");
    eventsContainer.innerHTML = "";

    if (!events.length) {
        eventsContainer.innerHTML = "<p>No events found.</p>";
        return;
    }

    events.forEach(event => {
        const eventCard = document.createElement("div");
        eventCard.classList.add("event-card");
        eventCard.innerHTML = `
            <h3>${event.name}</h3>
            <p>${event.description}</p>
            <p><strong>Date:</strong> ${event.date}</p>
            <p><strong>Time:</strong> ${event.time}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p><strong>Registrations:</strong> ${event.current_registrations}/${event.total_registrations}</p>
            <button class="register-button" data-event-id="${event.id}">Register</button>
            <p class="unique-code"></p>
        `;

        eventsContainer.appendChild(eventCard);

        const button = eventCard.querySelector(".register-button");
        const codeElement = eventCard.querySelector(".unique-code");
        checkRegistration(event.id, button, codeElement);

        button.addEventListener("click", async () => {
            await registerForEvent(event.id, button, codeElement);
        });
    });
}

async function getUserId() {
    const { data, error } = await supabase.auth.getUser();
    return error || !data.user ? null : data.user.id;
}

async function checkRegistration(eventId, button, codeElement) {
    const userId = await getUserId();
    if (!userId) return;

    const { data, error } = await supabase
        .from("register")
        .select("unique_code")
        .eq("participant_id", userId)
        .eq("event_id", eventId)
        .single();

    if (data) {
        button.textContent = "Registered";
        button.disabled = true;
        button.classList.add("registered");
        codeElement.textContent = `Your Code: ${data.unique_code}`;
    }
}

async function registerForEvent(eventId, button, codeElement) {
    const userId = await getUserId();
    if (!userId) {
        alert("You need to log in to register!");
        return;
    }

    // Step 1: Fetch the current registrations and total capacity
    const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("current_registrations, total_registrations")
        .eq("id", eventId)
        .single();

    if (eventError || !eventData) {
        console.error("Failed to fetch event data:", eventError?.message);
        return;
    }

    // Step 2: Check if the event is full
    if (eventData.current_registrations >= eventData.total_registrations) {
        alert("This event is full. Registration is closed.");
        return;
    }

    // Step 3: Generate a unique code for the user
    const uniqueCode = Math.random().toString(36).substr(2, 8).toUpperCase();

    // Step 4: Insert the registration record
    const { error: insertError } = await supabase
        .from("register")
        .insert([{ participant_id: userId, event_id: eventId, unique_code: uniqueCode }]);

    if (insertError) {
        console.error("Registration failed:", insertError.message);
        return;
    }

    // Step 5: Update the event's current_registrations count safely
    const { error: updateError } = await supabase.from("events").update({
        current_registrations: eventData.current_registrations + 1
    }).eq("id", eventId);

    if (updateError) {
        console.error("Failed to update registration count:", updateError.message);
        return;
    }

    // Step 6: Update UI to reflect registration
    button.textContent = "Registered";
    button.disabled = true;
    button.classList.add("registered");
    codeElement.textContent = `Your Code: ${uniqueCode}`;
}

