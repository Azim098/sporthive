const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";  
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", async () => {
    await loadEvents(); // Load events on page load

    document.getElementById("searchBtn").addEventListener("click", async () => {
        await loadEvents();
    });
});

async function loadEvents() {
    console.log("Fetching events...");

    // Get filter elements safely
    const searchInput = document.getElementById("searchInput");
    const skillFilter = document.getElementById("skillFilter");
    const timeFilter = document.getElementById("timeFilter");
    const sportFilter = document.getElementById("sportFilter");

    const searchQuery = searchInput ? searchInput.value.trim() : "";
    const selectedSkill = skillFilter ? skillFilter.value.trim() : "";
    const selectedTime = timeFilter ? timeFilter.value.trim() : "";
    const selectedSport = sportFilter ? sportFilter.value.trim() : "";

    let query = supabase.from("events").select("*");

    // Apply filters only if they have values
    if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
    if (selectedSkill) query = query.eq("skill", selectedSkill);
    if (selectedTime) query = query.eq("time", selectedTime);
    if (selectedSport) query = query.eq("sport", selectedSport);

    const { data: events, error } = await query;

    if (error) {
        console.error("Error fetching events:", error.message);
        return;
    }

    console.log("Fetched Data:", events);

    const eventsList = document.getElementById("eventsList");
    eventsList.innerHTML = events.length > 0
        ? events.map(event => `
            <div class="event-card">
                <h3>${event.name}</h3>
                <p>${event.description}</p>
                <p><strong>Date:</strong> ${event.date}</p>
                <p><strong>Location:</strong> ${event.location}</p>
                <button class="register-button" data-event-id="${event.id}">Register</button>
                <p class="unique-code" style="font-weight: bold;"></p>
            </div>
        `).join("")
        : "<p>No events found.</p>";
}
