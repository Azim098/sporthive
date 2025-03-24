// Wait until the Supabase client is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Supabase configuration
    const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";
    
    // Initialize Supabase client
    const supabase = supabase.createClient(supabaseUrl, supabaseKey);

    // Get the login form element
    const loginForm = document.getElementById("login-form");
    
    if (!loginForm) {
        console.error("Login form not found!");
        return;
    }

    // Form submission handler
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Get form values
        const email = document.getElementById("email").value.trim().toLowerCase();
        const password = document.getElementById("password").value.trim();

        try {
            // Attempt login
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) {
                throw authError;
            }

            // Get user role
            const { data: userData, error: roleError } = await supabase
                .from("users")
                .select("role")
                .eq("id", authData.user.id)
                .single();

            if (roleError || !userData) {
                throw new Error(roleError?.message || "User role not found");
            }

            // Redirect based on role
            switch (userData.role) {
                case "participant":
                    window.location.href = "participant.html";
                    break;
                case "organizer":
                    window.location.href = "organizer.html";
                    break;
                default:
                    throw new Error("Unknown user role");
            }

        } catch (error) {
            console.error("Login error:", error);
            alert(`Login failed: ${error.message}`);
        }
    });
});
