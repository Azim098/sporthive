// Initialize Supabase
const supabase = supabase.createClient("https://idydtkpvhedgyoexkiox.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY");

document.getElementById("signup-form").addEventListener("submit", async function(event) {
    event.preventDefault();

    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.toLowerCase();
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    try {
        // 🔥 Sign up user with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            alert("Signup failed: " + error.message);
            return;
        }

        const userId = data.user.id; // Get Supabase Auth user ID

        // 🔥 Store additional details in `users` table
        const { error: dbError } = await supabase.from("users").insert([
            { id: userId, fullname, email, role }
        ]);

        if (dbError) {
            alert("Error saving user data: " + dbError.message);
            return;
        }

        alert("Signup successful! Please log in.");
        window.location.href = "login.html";
    } catch (err) {
        alert("Unexpected error: " + err.message);
    }
});
