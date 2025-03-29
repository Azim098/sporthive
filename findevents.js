const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";  
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", async () => {
    await loadEvents(); // Load events on page load

    document.getElementById("searchBtn").addEventListener("click", async () => {
        await loadEvents();
    });
});

async function loadEvents() {
    console.log("Fetching events...");
    
    const searchQuery = document.getElementById("searchInput").value || "";
    const skillLevel = document.getElementById("skillFilter").value;
    const eventTime = document.getElementById("timeFilter").value;
    const sportType = document.getElementById("sportFilter").value;
    
    let query = supabase.from("events").select("*");
    
    if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
    if (skillLevel) query = query.eq("skill_level", skillLevel);
    if (eventTime) query = query.eq("event_time", eventTime);
    if (sportType) query = query.eq("sport", sportType);

    const { data: events, error } = await query;

    console.log("Fetched Data:", events, "Error:", error);

    if (error) {
        console.error("Error fetching events:", error.message);
        return;
    }

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
            <p><strong>Date:</strong> ${event.date}</p>
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
