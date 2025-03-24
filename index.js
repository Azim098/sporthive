document.getElementById("signup-form").addEventListener("submit", async function(event) {
    event.preventDefault();

    const fullname = document.getElementById("fullname").value;
    const email = document.getElementById("email").value.toLowerCase();
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    const response = await fetch("https://idydtkpvhedgyoexkiox.supabase.co/rest/v1/users", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY"
        },
        body: JSON.stringify({ fullname, email, password, role })
    });
    
    if (response.ok) {
        alert("Signup successful! You can now log in.");
        window.location.href = "login.html";
    } else {
        alert("Signup failed. Try again.");
    }
});
