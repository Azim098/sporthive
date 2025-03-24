document.getElementById("login-form").addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.toLowerCase();
    const password = document.getElementById("password").value;
    
    const response = await fetch(`https://idydtkpvhedgyoexkiox.supabase.co/rest/v1/users?email=eq.${email}&password=eq.${password}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY"
        }
    });
    
    const data = await response.json();
    
    if (data.length > 0) {
        alert("Login successful! Redirecting...");
        window.location.href = data[0].role === "organizer" ? "organizer.html" : "participant.html";
    } else {
        alert("Invalid email or password.");
    }
});
