// Initialize Supabase
const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    loadEvents();

    // Event listener for the filter toggle
    const filterToggle = document.getElementById("s1-14");
    if (filterToggle) {
        filterToggle.addEventListener("change", applyFilteredEvents);
    } else {
        console.error("Filter toggle (s1-14) not found");
    }

    // Event listener for the form submission
    const searchForm = document.querySelector("form");
    if (searchForm) {
        searchForm.addEventListener("submit", (e) => {
            e.preventDefault(); // Prevent form submission/page reload
            console.log("Form submission prevented");
            applyFilteredEvents();
        });
    } else {
        console.error("Search form not found");
    }

    // Event listener for the search button (additional safeguard)
    const searchButton = document.querySelector("#searchButton.apply-filters");
    if (searchButton) {
        searchButton.addEventListener("click", (e) => {
            e.preventDefault(); // Prevent form submission/page reload
            console.log("Search button clicked");
            applyFilteredEvents();
        });
    } else {
        console.error("Search button (#searchButton.apply-filters) not found");
    }

    // Event listener for the search bar (Enter key)
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault(); // Prevent form submission/page reload
                console.log("Enter key pressed in search input");
                applyFilteredEvents();
            }
        });
    } else {
        console.error("Search input (#searchInput) not found");
    }
});

async function loadEvents(searchQuery = "", filters = {}) {
    let query = supabase.from("events").select("*").eq("disabled_friendly", true);

    if (searchQuery) {
        console.log("Applying search query:", searchQuery);
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    if (filters.skillLevel && filters.skillLevel !== "all") {
        query = query.eq("difficulty", filters.skillLevel);
    }

    if (filters.eventTime && filters.eventTime !== "all") {
        const timeRange = getTimeRange(filters.eventTime);
        query = query.gte("time", timeRange.start).lt("time", timeRange.end);
    }

    if (filters.sport && filters.sport !== "all") {
        query = query.ilike("name", `%${filters.sport}%`);
    }

    const { data: events, error } = await query;
    if (error) {
        console.error("Error loading events:", error.message);
        return;
    }

    displayEvents(events || []);
}

async function applyFilteredEvents() {
    const searchInput = document.getElementById("searchInput");
    const searchQuery = searchInput ? searchInput.value.trim() : "";
    const filtersEnabled = document.getElementById("s1-14")?.checked || false;

    let filters = {};
    if (filtersEnabled) {
        filters = {
            skillLevel: document.getElementById("skill-level")?.value || "",
            eventTime: document.getElementById("event-time")?.value || "",
            sport: document.getElementById("sports")?.value || ""
        };
    }
    console.log("Toggle switch state:", filtersEnabled ? "ON" : "OFF");
    console.log("Applying filters with query:", searchQuery, "and filters:", filters);
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
    if (!eventsContainer) {
        console.error("Events container not found");
        return;
    }
    eventsContainer.innerHTML = "";

    if (!events.length) {
        eventsContainer.innerHTML = "<p>No events found.</p>";
        return;
    }

    events.forEach(event => {
        const eventCard = document.createElement("div");
        eventCard.classList.add("event-card");
        eventCard.dataset.eventId = event.id;
        eventCard.innerHTML = `
            <h3>${event.name}</h3>
            <p>${event.description}</p>
            <p><strong>Date:</strong> ${event.date}</p>
            <p><strong>Time:</strong> ${event.time}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p class="registrations-count"><strong>Registrations:</strong> ${event.current_registrations}/${event.total_registrations}</p>
            <p class="volunteers-count"><strong>Volunteers:</strong> ${event.current_volunteers}/${event.total_volunteers}</p>
            <button class="register-button" data-event-id="${event.id}">Register</button>
            <button class="volunteer-button" data-event-id="${event.id}">Register as Volunteer</button>
            <p class="unique-code"></p>
            <p class="volunteer-code"></p>
        `;

        eventsContainer.appendChild(eventCard);

        const registerButton = eventCard.querySelector(".register-button");
        const volunteerButton = eventCard.querySelector(".volunteer-button");
        const codeElement = eventCard.querySelector(".unique-code");
        const volunteerCodeElement = eventCard.querySelector(".volunteer-code");

        checkRegistration(event.id, registerButton, codeElement, volunteerButton);
        checkVolunteerRegistration(event.id, volunteerButton, volunteerCodeElement, registerButton);

        registerButton.addEventListener("click", async () => {
            if (registerButton.textContent === "Register") {
                await registerForEvent(event.id, registerButton, codeElement, volunteerButton);
            } else if (registerButton.textContent === "Unregister") {
                await unregisterFromEvent(event.id, registerButton, codeElement, volunteerButton);
            }
        });

        volunteerButton.addEventListener("click", async () => {
            if (volunteerButton.textContent === "Register as Volunteer") {
                await registerAsVolunteer(event.id, volunteerButton, volunteerCodeElement, registerButton);
            } else if (volunteerButton.textContent === "Unregister as Volunteer") {
                await unregisterAsVolunteer(event.id, volunteerButton, volunteerCodeElement, registerButton);
            }
        });
    });
}

async function getUserId() {
    const { data, error } = await supabase.auth.getUser();
    return error || !data.user ? null : data.user.id;
}

async function checkRegistration(eventId, button, codeElement, volunteerButton) {
    const userId = await getUserId();
    if (!userId) return;

    const { data, error } = await supabase
        .from("register")
        .select("unique_code")
        .eq("participant_id", userId)
        .eq("event_id", eventId)
        .single();

    if (data) {
        button.textContent = "Unregister";
        button.classList.add("registered");
        button.style.cursor = "pointer";
        codeElement.textContent = `Your Code: ${data.unique_code}`;
        volunteerButton.style.display = "none"; // Hide volunteer button if registered
    }
}

async function checkVolunteerRegistration(eventId, button, codeElement, registerButton) {
    const userId = await getUserId();
    if (!userId) return;

    const { data, error } = await supabase
        .from("volunteers")
        .select("unique_code")
        .eq("participant_id", userId)
        .eq("event_id", eventId)
        .single();

    if (data) {
        button.textContent = "Unregister as Volunteer";
        button.classList.add("volunteered");
        button.style.cursor = "pointer";
        codeElement.textContent = `Your Volunteer Code: ${data.unique_code}`;
        registerButton.style.display = "none"; // Hide register button if volunteered
    }
}

async function registerForEvent(eventId, button, codeElement, volunteerButton) {
    const userId = await getUserId();
    if (!userId) {
        alert("You need to log in to register!");
        return;
    }

    const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("current_registrations, total_registrations")
        .eq("id", eventId)
        .single();

    if (eventError || !eventData) {
        console.error("Failed to fetch event data:", eventError?.message);
        return;
    }

    if (eventData.current_registrations >= eventData.total_registrations) {
        alert("This event is full. Registration is closed.");
        return;
    }

    const uniqueCode = Math.random().toString(36).substr(2, 8).toUpperCase();

    const { error: insertError } = await supabase
        .from("register")
        .insert([{ participant_id: userId, event_id: eventId, unique_code: uniqueCode }]);

    if (insertError) {
        console.error("Registration failed:", insertError.message);
        return;
    }

    // Update event table with new registration count
    const { data: event, error: fetchError } = await supabase
        .from("events")
        .select("id, current_registrations, total_registrations")
        .eq("id", eventId)
        .single();

    if (fetchError) {
        console.error("Fetch error:", fetchError.message);
        return;
    }

    const newCount = event.current_registrations + 1;

    const { error: updateError } = await supabase
        .from("events")
        .update({ current_registrations: newCount })
        .eq("id", eventId);

    if (updateError) {
        console.error("Failed to update registration count:", updateError.message);
        return;
    }

    // Update UI
    button.textContent = "Unregister";
    button.classList.add("registered");
    button.style.cursor = "pointer";
    codeElement.textContent = `Your Code: ${uniqueCode}`;
    volunteerButton.style.display = "none"; // Hide volunteer button

    // Update registration count display
    const eventCard = button.closest(".event-card");
    const registrationsCount = eventCard.querySelector(".registrations-count");
    registrationsCount.innerHTML = `<strong>Registrations:</strong> ${newCount}/${event.total_registrations}`;
}

async function registerAsVolunteer(eventId, button, codeElement, registerButton) {
    const userId = await getUserId();
    if (!userId) {
        alert("You need to log in to volunteer!");
        return;
    }

    const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("current_volunteers, total_volunteers")
        .eq("id", eventId)
        .single();

    if (eventError || !eventData) {
        console.error("Failed to fetch event data:", eventError?.message);
        return;
    }

    if (eventData.current_volunteers >= eventData.total_volunteers) {
        alert("Volunteer slots for this event are full.");
        return;
    }

    const uniqueCode = Math.random().toString(36).substr(2, 8).toUpperCase();

    const { error: insertError } = await supabase
        .from("volunteers")
        .insert([{ participant_id: userId, event_id: eventId, unique_code: uniqueCode }]);

    if (insertError) {
        console.error("Volunteer registration failed:", insertError.message);
        return;
    }

    // Update event table with new volunteer count
    const { data: event, error: fetchError } = await supabase
        .from("events")
        .select("id, current_volunteers, total_volunteers")
        .eq("id", eventId)
        .single();

    if (fetchError) {
        console.error("Fetch error:", fetchError.message);
        return;
    }

    const newCount = event.current_volunteers + 1;

    const { error: updateError } = await supabase
        .from("events")
        .update({ current_volunteers: newCount })
        .eq("id", eventId);

    if (updateError) {
        console.error("Failed to update volunteer count:", updateError.message);
        return;
    }

    // Update UI
    button.textContent = "Unregister as Volunteer";
    button.classList.add("volunteered");
    button.style.cursor = "pointer";
    codeElement.textContent = `Your Volunteer Code: ${uniqueCode}`;
    registerButton.style.display = "none"; // Hide register button

    // Update volunteer count display
    const eventCard = button.closest(".event-card");
    const volunteersCount = eventCard.querySelector(".volunteers-count");
    volunteersCount.innerHTML = `<strong>Volunteers:</strong> ${newCount}/${event.total_volunteers}`;
}

async function unregisterFromEvent(eventId, button, codeElement, volunteerButton) {
    const userId = await getUserId();
    if (!userId) {
        alert("You need to log in to unregister!");
        return;
    }

    // Delete the registration from the register table
    const { data: deletedData, error: deleteError } = await supabase
        .from("register")
        .delete()
        .eq("participant_id", userId)
        .eq("event_id", eventId);

    if (deleteError) {
        console.error("Failed to unregister from register table:", deleteError.message);
        return;
    }

    console.log("Deleted from register table:", deletedData);

    // Fetch current event state and decrement
    const { data: event, error: fetchError } = await supabase
        .from("events")
        .select("id, current_registrations, total_registrations")
        .eq("id", eventId)
        .single();

    if (fetchError) {
        console.error("Fetch error:", fetchError.message);
        return;
    }

    const newCount = Math.max(0, event.current_registrations - 1); // Ensure it doesn't go below 0

    const { error: updateError } = await supabase
        .from("events")
        .update({ current_registrations: newCount })
        .eq("id", eventId);

    if (updateError) {
        console.error("Failed to update registration count:", updateError.message);
        return;
    }

    // Update UI
    button.textContent = "Register";
    button.classList.remove("registered");
    button.style.cursor = "pointer";
    codeElement.textContent = "";
    volunteerButton.style.display = "block"; // Show volunteer button

    // Update registration count display
    const eventCard = button.closest(".event-card");
    const registrationsCount = eventCard.querySelector(".registrations-count");
    registrationsCount.innerHTML = `<strong>Registrations:</strong> ${newCount}/${event.total_registrations}`;
}

async function unregisterAsVolunteer(eventId, button, codeElement, registerButton) {
    const userId = await getUserId();
    if (!userId) {
        alert("You need to log in to unregister as a volunteer!");
        return;
    }

    // Delete the volunteer registration from the volunteers table
    const { data: deletedData, error: deleteError } = await supabase
        .from("volunteers")
        .delete()
        .eq("participant_id", userId)
        .eq("event_id", eventId);

    if (deleteError) {
        console.error("Failed to unregister from volunteers table:", deleteError.message);
        return;
    }

    console.log("Deleted from volunteers table:", deletedData);

    // Fetch current event state and decrement
    const { data: event, error: fetchError } = await supabase
        .from("events")
        .select("id, current_volunteers, total_volunteers")
        .eq("id", eventId)
        .single();

    if (fetchError) {
        console.error("Fetch error:", fetchError.message);
        return;
    }

    const newCount = Math.max(0, event.current_volunteers - 1); // Ensure it doesn't go below 0

    const { error: updateError } = await supabase
        .from("events")
        .update({ current_volunteers: newCount })
        .eq("id", eventId);

    if (updateError) {
        console.error("Failed to update volunteer count:", updateError.message);
        return;
    }

    // Update UI
    button.textContent = "Register as Volunteer";
    button.classList.remove("volunteered");
    button.style.cursor = "pointer";
    codeElement.textContent = "";
    registerButton.style.display = "block"; // Show register button

    // Update volunteer count display
    const eventCard = button.closest(".event-card");
    const volunteersCount = eventCard.querySelector(".volunteers-count");
    volunteersCount.innerHTML = `<strong>Volunteers:</strong> ${newCount}/${event.total_volunteers}`;
}
