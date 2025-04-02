const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    loadEvents();

    document.querySelector(".apply-filters").addEventListener("click", async () => {
        const searchQuery = document.getElementById("searchInput").value.trim();
        await applyFilteredEvents(searchQuery);
    });
});

async function loadEvents(searchQuery = "", skillLevel = "", eventTime = "", sport = "") {
    let query = supabase.from("events").select("*");
    
    if (searchQuery) query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    if (skillLevel) query = query.eq("difficulty", skillLevel);
    if (eventTime) {
        const { start, end } = getTimeRange(eventTime);
        query = query.gte("time", start).lt("time", end);
    }
    if (sport) query = query.ilike("name", `%${sport}%`);

    const { data: events, error } = await query;
    if (error) {
        console.error("Error loading events:", error.message);
        return;
    }
    displayEvents(events);
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
    eventsList.innerHTML = events?.length ? "" : "<p>No events found.</p>";

    events.forEach(event => {
        const eventCard = document.createElement("div");
        eventCard.classList.add("event-card");
        
        const isRegistrationFull = event.current_registrations >= event.total_registrations;
        const isVolunteerFull = event.current_volunteers >= event.total_volunteers;

        eventCard.innerHTML = `
            <h3>${event.name}</h3>
            <p>${event.description}</p>
            <p><strong>Time:</strong> ${event.time}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p class="participants-count"><strong>Participants:</strong> ${event.current_registrations} / ${event.total_registrations}</p>
            <p class="volunteers-count"><strong>Volunteers:</strong> ${event.current_volunteers} / ${event.total_volunteers}</p>
            ${isRegistrationFull ? '<p style="color: red;"><strong>Registration Full</strong></p>' : `
                <button class="register-button" data-event-id="${event.id}">Register</button>
            `}
            ${isVolunteerFull ? '<p style="color: red;"><strong>Volunteer Slots Full</strong></p>' : `
                <button class="volunteer-button" data-event-id="${event.id}">Register as Volunteer</button>
            `}
            <p class="unique-code" style="font-weight: bold;"></p>
            <p class="volunteer-code" style="font-weight: bold;"></p>
        `;

        eventsList.appendChild(eventCard);

        if (!isRegistrationFull || !isVolunteerFull) {
            const registerButton = eventCard.querySelector(".register-button");
            const volunteerButton = eventCard.querySelector(".volunteer-button");
            const codeElement = eventCard.querySelector(".unique-code");
            const volunteerCodeElement = eventCard.querySelector(".volunteer-code");
            const participantsCount = eventCard.querySelector(".participants-count");
            const volunteersCount = eventCard.querySelector(".volunteers-count");

            checkRegistration(event.id, registerButton, volunteerButton, codeElement);
            checkVolunteerRegistration(event.id, registerButton, volunteerButton, volunteerCodeElement);

            if (registerButton) {
                registerButton.addEventListener("click", async () => {
                    await registerForEvent(
                        event.id, 
                        event.total_registrations, 
                        event.current_registrations, 
                        registerButton, 
                        volunteerButton, 
                        codeElement,
                        participantsCount
                    );
                });
            }

            if (volunteerButton) {
                volunteerButton.addEventListener("click", async () => {
                    await registerAsVolunteer(
                        event.id, 
                        event.total_volunteers, 
                        event.current_volunteers, 
                        registerButton, 
                        volunteerButton, 
                        volunteerCodeElement,
                        volunteersCount
                    );
                });
            }
        }
    });
}

async function getUserId() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user.id;
}

function generateUniqueCode() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
}

async function checkRegistration(eventId, registerButton, volunteerButton, codeElement) {
    const participantId = await getUserId();
    if (!participantId) return;

    const { data, error } = await supabase
        .from("register")
        .select("unique_code")
        .eq("participant_id", participantId)
        .eq("event_id", eventId)
        .single();

    if (data) {
        registerButton.textContent = "Registered";
        registerButton.disabled = true;
        registerButton.classList.add("registered");
        codeElement.textContent = `Your Registration Code: ${data.unique_code}`;
        volunteerButton.style.display = "none";
    }
}

async function checkVolunteerRegistration(eventId, registerButton, volunteerButton, codeElement) {
    const participantId = await getUserId();
    if (!participantId) return;

    const { data, error } = await supabase
        .from("volunteers")
        .select("unique_code")
        .eq("participant_id", participantId)
        .eq("event_id", eventId)
        .single();

    if (data) {
        volunteerButton.textContent = "Volunteered";
        volunteerButton.disabled = true;
        volunteerButton.classList.add("registered");
        codeElement.textContent = `Your Volunteer Code: ${data.unique_code}`;
        registerButton.style.display = "none";
    }
}

async function registerForEvent(eventId, totalRegistrations, currentRegistrations, registerButton, volunteerButton, codeElement, participantsCount) {
    const participantId = await getUserId();
    if (!participantId) {
        alert("You need to log in to register!");
        return;
    }

    if (currentRegistrations >= totalRegistrations) {
        alert("Registration is full for this event!");
        return;
    }

    const uniqueCode = generateUniqueCode();
    const newCount = currentRegistrations + 1;

    const { error: insertError } = await supabase
        .from("register")
        .insert([{ participant_id: participantId, event_id: eventId, unique_code: uniqueCode }]);

    if (insertError) {
        alert(`Failed to register: ${insertError.message}`);
        return;
    }

    const { error: updateError } = await supabase
        .from("events")
        .update({ current_registrations: newCount })
        .eq("id", eventId);

    if (updateError) {
        alert(`Failed to update registration count: ${updateError.message}`);
        return;
    }

    registerButton.textContent = "Registered";
    registerButton.disabled = true;
    registerButton.classList.add("registered");
    codeElement.textContent = `Your Registration Code: ${uniqueCode}`;
    volunteerButton.style.display = "none";
    participantsCount.innerHTML = `<strong>Participants:</strong> ${newCount} / ${totalRegistrations}`;
}

async function registerAsVolunteer(eventId, totalVolunteers, currentVolunteers, registerButton, volunteerButton, codeElement, volunteersCount) {
    const participantId = await getUserId();
    if (!participantId) {
        alert("You need to log in to volunteer!");
        return;
    }

    if (currentVolunteers >= totalVolunteers) {
        alert("Volunteer slots are full for this event!");
        return;
    }

    const uniqueCode = generateUniqueCode();
    const newCount = currentVolunteers + 1;

    const { error: insertError } = await supabase
        .from("volunteers")
        .insert([{ participant_id: participantId, event_id: eventId, unique_code: uniqueCode }]);

    if (insertError) {
        alert(`Failed to volunteer: ${insertError.message}`);
        return;
    }

    const { error: updateError } = await supabase
        .from("events")
        .update({ current_volunteers: newCount })
        .eq("id", eventId);

    if (updateError) {
        alert(`Failed to update volunteer count: ${updateError.message}`);
        return;
    }

    volunteerButton.textContent = "Volunteered";
    volunteerButton.disabled = true;
    volunteerButton.classList.add("registered");
    codeElement.textContent = `Your Volunteer Code: ${uniqueCode}`;
    registerButton.style.display = "none";
    volunteersCount.innerHTML = `<strong>Volunteers:</strong> ${newCount} / ${totalVolunteers}`;
}
