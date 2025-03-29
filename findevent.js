const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";  
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", async () => {
    await loadEvents(); // Load events on page load

    document.getElementById("searchBtn").addEventListener("click", async () => {
        const query = document.getElementById("searchInput").value;
        await loadEvents(query);
    });
});

async function loadEvents(searchQuery = "") {
    let { data: events, error } = await supabase
        .from("events")
        .select("*")
        .ilike("event_name", `%${searchQuery}%`);

    if (error) {
        console.error("Error fetching events:", error.message);
        return;
    }

    const eventsList = document.getElementById("eventsList");
    eventsList.innerHTML = ""; // Clear previous results

    events.forEach(event => {
        const eventCard = document.createElement("div");
        eventCard.innerHTML = `
            <h3>${event.event_name}</h3>
            <p>${event.description}</p>
            <p>Date: ${event.date}</p>
            <p>Location: ${event.location}</p>
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

async function getUserId() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return user ? user.id : null;
}

function generateUniqueCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function checkRegistration(eventId, buttonElement, codeElement) {
    const participantId = await getUserId();
    if (!participantId) return;

    const { data, error } = await supabase
        .from("register")
        .select("unique_code")
        .eq("participant_id", participantId)
        .eq("event_id", eventId)
        .single();

    if (data) {
        buttonElement.textContent = "Registered";
        buttonElement.disabled = true;
        buttonElement.classList.add("registered");
        codeElement.textContent = `Your Code: ${data.unique_code}`;
    }
}

async function registerForEvent(eventId, buttonElement, codeElement) {
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
        }]);

    if (error) {
        console.error("Registration failed:", error.message);
        return;
    }

    buttonElement.textContent = "Registered";
    buttonElement.disabled = true;
    buttonElement.classList.add("registered");

    codeElement.textContent = `Your Code: ${uniqueCode}`;
}
