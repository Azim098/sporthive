// ✅ Supabase Initialization
const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    loadEvents();
});

// ✅ Load and display events
async function loadEvents() {
    console.log("Loading events...");

    const { data: events, error } = await supabase.from("events").select("*");

    if (error) {
        console.error("Error loading events:", error.message);
        return;
    }

    displayEvents(events);
}

// ✅ Display events with registration and volunteer buttons
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
            <p><strong>Registrations:</strong> ${event.current_registrations}/${event.total_registrations}</p>
            <p><strong>Volunteers:</strong> ${event.current_volunteers}/${event.total_volunteers}</p>
            
            <button class="register-button" data-event-id="${event.id}">Register</button>
            <p class="unique-code" style="font-weight: bold;"></p>

            <button class="volunteer-button" data-event-id="${event.id}">Register as Volunteer</button>
            <p class="volunteer-code" style="font-weight: bold;"></p>
        `;

        eventsList.appendChild(eventCard);

        const regButton = eventCard.querySelector(".register-button");
        const regCodeElement = eventCard.querySelector(".unique-code");

        const volButton = eventCard.querySelector(".volunteer-button");
        const volCodeElement = eventCard.querySelector(".volunteer-code");

        checkRegistration(event.id, regButton, regCodeElement);
        checkVolunteer(event.id, volButton, volCodeElement);

        regButton.addEventListener("click", async () => {
            await registerForEvent(event, regButton, regCodeElement);
        });

        volButton.addEventListener("click", async () => {
            await registerAsVolunteer(event, volButton, volCodeElement);
        });
    });
}

// ✅ Get the user ID
async function getUserId() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
        console.error("Failed to retrieve user:", error?.message);
        return null;
    }
    return data.user.id;
}

// ✅ Generate unique code
function generateUniqueCode() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
}

// ✅ Check if the user is already registered
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
        codeElement.textContent = `Your Code: ${data.unique_code}`;
    }
}

// ✅ Check volunteer registration
async function checkVolunteer(eventId, button, codeElement) {
    const participantId = await getUserId();
    if (!participantId) return;

    const { data, error } = await supabase
        .from("volunteers")
        .select("unique_code")
        .eq("participant_id", participantId)
        .eq("event_id", eventId)
        .single();

    if (data) {
        button.textContent = "Volunteered";
        button.disabled = true;
        codeElement.textContent = `Your Code: ${data.unique_code}`;
    }
}

// ✅ Register for an event
async function registerForEvent(event, button, codeElement) {
    if (event.current_registrations >= event.total_registrations) {
        alert("Registrations closed!");
        return;
    }

    const participantId = await getUserId();
    if (!participantId) return;

    const uniqueCode = generateUniqueCode();

    const { error } = await supabase.from("register").insert([{ 
        participant_id: participantId, 
        event_id: event.id, 
        unique_code: uniqueCode
    }]);

    if (error) {
        console.error("Error registering:", error.message);
        alert("Failed to register. Please try again.");
        return;
    }

    button.textContent = "Registered";
    button.disabled = true;
    codeElement.textContent = `Your Code: ${uniqueCode}`;
}

// ✅ Register as volunteer (Handles INTEGER event_id)
async function registerAsVolunteer(event, button, codeElement) {
    if (event.current_volunteers >= event.total_volunteers) {
        alert("Volunteer registrations closed!");
        return;
    }

    const participantId = await getUserId();
    if (!participantId) return;

    const uniqueCode = generateUniqueCode();

    // Insert volunteer registration
    const { error } = await supabase.from("volunteers").insert([{
        participant_id: participantId,
        event_id: event.id,  // Insert INTEGER event_id
        unique_code: uniqueCode
    }]);

    if (error) {
        console.error("Error volunteering:", error.message);
        alert("Failed to volunteer. Please try again.");
        return;
    }

    button.textContent = "Volunteered";
    button.disabled = true;
    codeElement.textContent = `Your Code: ${uniqueCode}`;
}
