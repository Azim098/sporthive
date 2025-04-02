// Initialize Supabase
        const supabaseUrl = "https://idydtkpvhedgyoexkiox.supabase.co";
        const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeWR0a3B2aGVkZ3lvZXhraW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI3MzQsImV4cCI6MjA1NzYxODczNH0.52Qb21bBXalYvNPGBoH9xZJUjKs7fjTsESvx2-XCTaY";
        const supabaseClient = Supabase.createClient(supabaseUrl, supabaseKey);

        // Function to fetch and display registrations
        async function fetchOrganizerRegistrations() {
            try {
                // Get logged-in organizer
                const { data: user, error: userError } = await supabaseClient.auth.getUser();
                if (userError || !user?.user) {
                    throw new Error("User not logged in or error fetching user: " + (userError?.message || "Unknown error"));
                }

                const organizerId = user.user.id;
                console.log("Organizer ID:", organizerId);

                // Fetch events
                const { data: events, error: eventError } = await supabaseClient
                    .from("events")
                    .select("id")
                    .eq("organizer_id", organizerId);

                if (eventError) throw new Error("Error fetching events: " + eventError.message);
                if (!events?.length) {
                    updateTableStatus("registrations-table-body", "No events found for this organizer");
                    updateTableStatus("volunteers-table-body", "No events found for this organizer");
                    return;
                }

                const eventIds = events.map(event => event.id);
                console.log("Event IDs:", eventIds);

                // Fetch participants
                const { data: participants, error: participantError } = await supabaseClient
                    .from("register")
                    .select("id, status, unique_code, users:participant_id(fullname, email), events:event_id(name)")
                    .in("event_id", eventIds);

                if (participantError) throw new Error("Error fetching participants: " + participantError.message);
                console.log("Participants:", participants);

                // Fetch volunteers
                const { data: volunteers, error: volunteerError } = await supabaseClient
                    .from("volunteers")
                    .select("id, status, unique_code, users:participant_id(fullname, email), events:event_id(name)")
                    .in("event_id", eventIds);

                if (volunteerError) throw new Error("Error fetching volunteers: " + volunteerError.message);
                console.log("Volunteers:", volunteers);

                // Display data
                displayRegistrations(participants || [], "registrations-table-body");
                displayRegistrations(volunteers || [], "volunteers-table-body");

            } catch (error) {
                console.error("Error in fetchOrganizerRegistrations:", error.message);
                updateTableStatus("registrations-table-body", "Error loading participants: " + error.message);
                updateTableStatus("volunteers-table-body", "Error loading volunteers: " + error.message);
            }
        }

        // Function to display registrations
        function displayRegistrations(data, tableId) {
            const tableBody = document.getElementById(tableId);
            tableBody.innerHTML = "";
            
            if (!data.length) {
                tableBody.innerHTML = `<tr><td colspan="6">No ${tableId.includes("volunteer") ? "volunteers" : "participants"} found</td></tr>`;
                return;
            }

            data.forEach(item => {
                const row = document.createElement("tr");
                const status = item.status || "Pending"; // Ensure status is never undefined
                row.innerHTML = `
                    <td>${item.users?.fullname || "N/A"}</td>
                    <td>${item.users?.email || "N/A"}</td>
                    <td>${item.events?.name || "N/A"}</td>
                    <td>${item.unique_code || "N/A"}</td>
                    <td class="status ${status === 'Accepted' ? 'confirmed' : 'pending'}">
                        ${status}
                    </td>
                    <td>
                        <button class="approve-btn" onclick="approveRegistration('${item.id}', '${tableId}')">Approve</button>
                        <button class="reject-btn" onclick="rejectRegistration('${item.id}', '${tableId}')">Reject</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }

        // Helper function to update table status
        function updateTableStatus(tableId, message) {
            const tableBody = document.getElementById(tableId);
            tableBody.innerHTML = `<tr><td colspan="6">${message}</td></tr>`;
        }

        // Approve registration
        async function approveRegistration(id, tableId) {
            try {
                const table = tableId.includes("volunteer") ? "volunteers" : "register";
                const { error } = await supabaseClient
                    .from(table)
                    .update({ status: "Accepted" })
                    .eq("id", id);

                if (error) throw new Error("Error approving registration: " + error.message);
                console.log(`Registration ${id} approved in table ${table}`);
                fetchOrganizerRegistrations();
            } catch (error) {
                console.error(error.message);
                alert("Failed to approve registration: " + error.message);
            }
        }

        // Reject registration
        async function rejectRegistration(id, tableId) {
            try {
                const table = tableId.includes("volunteer") ? "volunteers" : "register";
                const { error } = await supabaseClient
                    .from(table)
                    .delete()
                    .eq("id", id);

                if (error) throw new Error("Error rejecting registration: " + error.message);
                console.log(`Registration ${id} rejected from table ${table}`);
                fetchOrganizerRegistrations();
            } catch (error) {
                console.error(error.message);
                alert("Failed to reject registration: " + error.message);
            }
        }

        // Load data on page load
        document.addEventListener("DOMContentLoaded", fetchOrganizerRegistrations);
