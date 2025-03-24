// Initialize Supabase **outside** window.onload
const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey); // ✅ This will work now

// Wait for DOM to load before accessing elements
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("login-form").addEventListener("submit", async function(event) {
        event.preventDefault();

        const email = document.getElementById("email").value.toLowerCase();
        const password = document.getElementById("password").value;

        try {
            // Login user with Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                alert("Login failed: " + error.message);
                return;
            }

            const userId = data.user.id;

            // Fetch user role from `users` table
            const { data: userData, error: roleError } = await supabase
                .from("users")
                .select("role")
                .eq("id", userId)
                .single();

            if (roleError || !userData) {
                alert("Failed to fetch user role.");
                return;
            }

            const role = userData.role;

            // Redirect based on role
            if (role === "participant") {
                window.location.href = "participant.html";
            } else if (role === "organizer") {
                window.location.href = "organizer.html";
            } else {
                alert("Unknown role. Please contact support.");
            }
        } catch (error) {
            console.error("Unexpected error:", error);
            alert("An unexpected error occurred. Please try again.");
        }
    });
});
