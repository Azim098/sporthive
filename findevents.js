const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";  // Remove for security reasons

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", async () => {
    await loadEvents(); // Load events on page load

    document.getElementById("toggleFilters").addEventListener("click", async () => {
        const query = document.getElementById("searchInput").value;
        const skillLevel = document.getElementById("difficulty").value;
        const eventTime = document.getElementById("event-time").value;
        const sport = document.getElementById("sports").value;

        await loadEvents(query, difficulty, eventTime, sport);
    });
});

// Updated loadEvents to account for additional filters
async function loadEvents(searchQuery = "", difficulty = "", eventTime = "", sport = "") {
    console.log("Fetching events...");

    let filters = {};
    if (searchQuery) {
        filters.name = { ilike: `%${searchQuery}%` };
    }
    if (difficulty) {
        filters.difficulty = { eq: difficulty };
    }
    if (eventTime) {
        filters.time = { eq: eventTime };
    }
    if (sport) {
        filters.name = { ilike: `%${sport}%` };
    }

    let { data: events, error } = await supabase
        .from("events")
        .select("*")
        .or(Object.entries(filters).map(([key, value]) => `${key}.eq.${value}`).join(','));

    console.log("Fetched Data:", events, "Error:", error);

    if (error) {
        console.error("Error fetching events:", error.message);
        return;
    }

    const eventsList = document.getElementById("eventsList");
    eventsList.innerHTML = ""; // Clear previous results

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
            <p><strong>Date:</strong> ${event.date}</p>
            <p><strong>Time:</strong> ${event.time}</p> <!-- Added time -->
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
