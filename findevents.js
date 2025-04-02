const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded, initializing...");
    loadEvents();

    const applyFiltersBtn = document.querySelector(".apply-filters");
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener("click", async () => {
            const searchQuery = document.getElementById("searchInput").value.trim();
            console.log("Applying filters with query:", searchQuery);
            await applyFilteredEvents(searchQuery);
        });
    } else {
        console.error("Apply filters button not found");
    }

    // Real-time subscription
    supabase
        .channel("events-changes")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "events" }, (payload) => {
            console.log("Real-time update received:", payload.new);
            updateEventCard(payload.new);
        })
        .subscribe((status) => {
            console.log("Subscription status:", status);
        });
});

async function loadEvents(searchQuery = "", skillLevel = "", eventTime = "", sport = "") {
    console.log("Loading events with filters:", { searchQuery, skillLevel, eventTime, sport });
    try {
        let query = supabase.from("events").select("*");
        
        if (searchQuery) query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        if (skillLevel) query = query.eq("difficulty", skillLevel);
        if (eventTime) {
            const { start, end } = getTimeRange(eventTime);
            query = query.gte("time", start).lt("time", end);
        }
        if (sport) query = query.ilike("name", `%${sport}%`);

        const { data: events, error } = await query;
        if (error) throw new Error(`Supabase error: ${error.message}`);
        
        console.log("Events fetched:", events);
        displayEvents(events);
    } catch (error) {
        console.error("Error in loadEvents:", error);
        document.getElementById("eventsList").innerHTML = `<p>Error loading events: ${error.message}</p>`;
    }
}

async function applyFilteredEvents(searchQuery = "") {
    const skillLevel = document.getElementById("skill-level").value;
    const eventTime = document.getElementById("event-time").value;
    const sport = document.getElementById("sports").value;
    await loadEvents(searchQuery, skillLevel, eventTime, sport);
}

function getTimeRange(slot) {
    switch (slot) {
        case "morning": return { start: "06:00", end: "12:00" };
        case "afternoon": return { start: "12:00", end: "17:00" };
        case "evening": return { start: "17:00", end: "21:00" };
        case "night": return { start: "21:00", end: "06:00" };
        default: return { start: "00:00", end: "23:59" };
    }
}

function displayEvents(events) {
    const eventsList = document.getElementById("eventsList");
    if (!eventsList) {
        console.error("eventsList element not found");
        return;
    }

    console.log("Displaying events:", events);
    eventsList.innerHTML = "";

    if (!events || events.length === 0) {
        eventsList.innerHTML = "<p>No events found.</p>";
        return;
    }

    events.forEach(event => {
        console.log("Creating card for event:", event);
        const eventCard = createEventCard(event);
        eventsList.appendChild(eventCard);
    });
}

function createEventCard(event) {
    const eventCard = document.createElement("div");
    eventCard.classList.add("event-card");
    eventCard.dataset.eventId = event.id;

    const isRegistrationFull = event.current_registrations >= event.total_registrations;
    const isVolunteerFull = event.current_volunteers >= event.total_volunteers;

    eventCard.innerHTML = `
        <h3>${event.name || "Unnamed Event"}</h3>
        <p>${event.description || "No description"}</p>
        <p><strong>Time:</strong> ${event.time || "TBD"}</p>
        <p><strong>Location:</strong> ${event.location || "TBD"}</p>
        <p class="participants-count"><strong>Participants:</strong> ${event.current_registrations || 0} / ${event.total_registrations || 0}</p>
        <p class="volunteers-count"><strong>Volunteers:</strong> ${event.current_volunteers || 0} / ${event.total_volunteers || 0}</p>
        ${isRegistrationFull ? '<p style="color: red;"><strong>Registration Full</strong></p>' : `
            <button class="register-button" data-event-id="${event.id}">Register</button>
        `}
        ${isVolunteerFull ? '<p style="color: red;"><strong>Volunteer Slots Full</strong></p>' : `
            <button class="volunteer-button" data-event-id="${event.id}">Register as Volunteer</button>
        `}
        <p class="unique-code" style="font-weight: bold;"></p>
        <p class="volunteer-code" style="font-weight: bold;"></p>
    `;

    setupEventCardListeners(eventCard, event);
    return eventCard;
}

function updateEventCard(updatedEvent) {
    const eventCard = document.querySelector(`.event-card[data-event-id="${updatedEvent.id}"]`);
    if (!eventCard) {
        console.log("Event card not found for update:", updatedEvent.id);
        return;
    }

    const participantsCount = eventCard.querySelector(".participants-count");
    const volunteersCount = eventCard.querySelector(".volunteers-count");
    const registerButton = eventCard.querySelector(".register-button");
    const volunteerButton = eventCard.querySelector(".volunteer-button");

    participantsCount.innerHTML = `<strong>Participants:</strong> ${updatedEvent.current_registrations} / ${updatedEvent.total_registrations}`;
    volunteersCount.innerHTML = `<strong>Volunteers:</strong> ${updatedEvent.current_volunteers} / ${updatedEvent.total_volunteers}`;

    if (updatedEvent.current_registrations >= updatedEvent.total_registrations && registerButton) {
        registerButton.outerHTML = '<p style="color: red;"><strong>Registration Full</strong></p>';
    }
    if (updatedEvent.current_volunteers >= updatedEvent.total_volunteers && volunteerButton) {
        volunteerButton.outerHTML = '<p style="color: red;"><strong>Volunteer Slots Full</strong></p>';
    }
}

function setupEventCardListeners(eventCard, event) {
    const registerButton = eventCard.querySelector(".register-button");
    const volunteerButton = eventCard.querySelector(".volunteer-button");
    const codeElement = eventCard.querySelector(".unique-code");
    const volunteerCodeElement = eventCard.querySelector(".volunteer-code");
    const participantsCount = eventCard.querySelector(".participants-count");
    const volunteersCount = eventCard.querySelector(".volunteers-count");

    if (registerButton) {
        checkRegistration(event.id, registerButton, volunteerButton, codeElement);
        registerButton.addEventListener("click", async () => {
            await registerForEvent(event.id, registerButton, volunteerButton, codeElement, participantsCount);
        });
    }

    if (volunteerButton) {
        checkVolunteerRegistration(event.id, registerButton, volunteerButton, volunteerCodeElement);
        volunteerButton.addEventListener("click", async () => {
            await registerAsVolunteer(event.id, registerButton, volunteerButton, volunteerCodeElement, volunteersCount);
        });
    }
}

async function getUserId() {
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) throw new Error("User not authenticated");
        console.log("User ID fetched:", data.user.id);
        return data.user.id;
    } catch (error) {
        console.error("Error getting user ID:", error);
        return null;
    }
}

function generateUniqueCode() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
}

async function checkRegistration(eventId, registerButton, volunteerButton, codeElement) {
    const participantId = await getUserId();
    if (!participantId || !registerButton) return;

    try {
        const { data, error } = await supabase
            .from("register")
            .select("unique_code")
            .eq("participant_id", participantId)
            .eq("event_id", eventId)
            .single();

        if (error && error.code !== "PGRST116") throw error;
        if (data) {
            registerButton.textContent = "Registered";
            registerButton.disabled = true;
            registerButton.classList.add("registered");
            codeElement.textContent = `Your Registration Code: ${data.unique_code}`;
            if (volunteerButton) volunteerButton.style.display = "none";
        }
    } catch (error) {
        console.error("Error checking registration:", error);
    }
}

async function checkVolunteerRegistration(eventId, registerButton, volunteerButton, codeElement) {
    const participantId = await getUserId();
    if (!participantId || !volunteerButton) return;

    try {
        const { data, error } = await supabase
            .from("volunteers")
            .select("unique_code")
            .eq("participant_id", participantId)
            .eq("event_id", eventId)
            .single();

        if (error && error.code !== "PGRST116") throw error;
        if (data) {
            volunteerButton.textContent = "Volunteered";
            volunteerButton.disabled = true;
            volunteerButton.classList.add("registered");
            codeElement.textContent = `Your Volunteer Code: ${data.unique_code}`;
            if (registerButton) registerButton.style.display = "none";
        }
    } catch (error) {
        console.error("Error checking volunteer registration:", error);
    }
}

async function registerForEvent(eventId, registerButton, volunteerButton, codeElement, participantsCount) {
    const participantId = await getUserId();
    if (!participantId) {
        alert("You need to log in to register!");
        return;
    }

    try {
        // Fetch current event state
        const { data: event, error: fetchError } = await supabase
            .from("events")
            .select("current_registrations, total_registrations")
            .eq("id", eventId)
            .single();

        if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);
        console.log("Current event state:", event);

        if (event.current_registrations >= event.total_registrations) {
            alert("Registration is full for this event!");
            return;
        }

        const uniqueCode = generateUniqueCode();
        const newCount = event.current_registrations + 1;

        // Insert registration
        const { error: insertError } = await supabase
            .from("register")
            .insert([{ participant_id: participantId, event_id: eventId, unique_code: uniqueCode }]);

        if (insertError) throw new Error(`Insert error: ${insertError.message}`);
        console.log("Registration inserted:", { participantId, eventId, uniqueCode });

        // Update event table
        const { data: updatedEvent, error: updateError } = await supabase
            .from("events")
            .update({ current_registrations: newCount })
            .eq("id", eventId)
            .select()
            .single();

        if (updateError) throw new Error(`Update error: ${updateError.message}`);
        console.log("Event table updated:", updatedEvent);

        // Update UI
        registerButton.textContent = "Registered";
        registerButton.disabled = true;
        registerButton.classList.add("registered");
        codeElement.textContent = `Your Registration Code: ${uniqueCode}`;
        if (volunteerButton) volunteerButton.style.display = "none";
        participantsCount.innerHTML = `<strong>Participants:</strong> ${newCount} / ${event.total_registrations}`;
    } catch (error) {
        console.error("Error registering for event:", error);
        alert(`Failed to register: ${error.message}`);
    }
}

async function registerAsVolunteer(eventId, registerButton, volunteerButton, codeElement, volunteersCount) {
    const participantId = await getUserId();
    if (!participantId) {
        alert("You need to log in to volunteer!");
        return;
    }

    try {
        // Fetch current event state
        const { data: event, error: fetchError } = await supabase
            .from("events")
            .select("current_volunteers, total_volunteers")
            .eq("id", eventId)
            .single();

        if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);
        console.log("Current event state:", event);

        if (event.current_volunteers >= event.total_volunteers) {
            alert("Volunteer slots are full for this event!");
            return;
        }

        const uniqueCode = generateUniqueCode();
        const newCount = event.current_volunteers + 1;

        // Insert volunteer registration
        const { error: insertError } = await supabase
            .from("volunteers")
            .insert([{ participant_id: participantId, event_id: eventId, unique_code: uniqueCode }]);

        if (insertError) throw new Error(`Insert error: ${insertError.message}`);
        console.log("Volunteer registration inserted:", { participantId, eventId, uniqueCode });

        // Update event table
        const { data: updatedEvent, error: updateError } = await supabase
            .from("events")
            .update({ current_volunteers: newCount })
            .eq("id", eventId)
            .select()
            .single();

        if (updateError) throw new Error(`Update error: ${updateError.message}`);
        console.log("Event table updated:", updatedEvent);

        // Update UI
        volunteerButton.textContent = "Volunteered";
        volunteerButton.disabled = true;
        volunteerButton.classList.add("registered");
        codeElement.textContent = `Your Volunteer Code: ${uniqueCode}`;
        if (registerButton) registerButton.style.display = "none";
        volunteersCount.innerHTML = `<strong>Volunteers:</strong> ${newCount} / ${event.total_volunteers}`;
    } catch (error) {
        console.error("Error registering as volunteer:", error);
        alert(`Failed to volunteer: ${error.message}`);
    }
}
