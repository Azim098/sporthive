const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY" // Remove for security reasons

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", async () => {
    await loadEvents(); // Load events on page load

    document.getElementById("toggleFilters").addEventListener("click", async () => {
        // Check if filters should be applied
        const applyFilters = document.querySelector('.switch').checked; // Check if the toggle switch is on

        const query = document.getElementById("searchInput").value;
        const skillLevel = document.getElementById("skill-level").value; // Corrected ID for skill-level
        const eventTime = document.getElementById("event-time").value;
        const sport = document.getElementById("sports").value;

        if (applyFilters) { // Only load events if filters are applied
            await loadEvents(query, skillLevel, eventTime, sport);
        } else {
            await loadEvents(); // Load all events if filters are not applied
        }
    });
});

// Updated loadEvents to account for additional filters
async function loadEvents(searchQuery = "", skillLevel = "", eventTime = "", sport = "") {
    console.log("Fetching events...");

    let filters = [];

    // Allow filters to work regardless of searchQuery
    if (searchQuery) {
        filters.push(`name.ilike.%${searchQuery}%`);
    }
    if (skillLevel) {
        filters.push(`difficulty.eq.${skillLevel}`);
    }
    if (eventTime) {
        filters.push(`time.eq.${eventTime}`);
    }
    if (sport) {
        filters.push(`name.ilike.%${sport}%`);
    }

    let filterString = filters.length > 0 ? filters.join(',') : null;

    let { data: events, error } = await supabase
        .from("events")
        .select("*")
        .or(filterString);

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
            <p><strong>Time:</strong> ${event.time}</p> <!-- Ensured time is displayed -->
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
