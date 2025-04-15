document.addEventListener("DOMContentLoaded", function () {
    // Fetch dates from the server
    fetch('/api/dates')
        .then(response => response.json())
        .then(data => {
            const movieDates = new Set(data.dates);
            // Retrieve user game stats (assumed stored as JSON under 'gameStats')
            let userGames = [];
            try {
                const storedData = localStorage.getItem('gameStats');
                if (storedData) {
                    const parsed = JSON.parse(storedData);
                    if (parsed.games) userGames = parsed.games;
                }
            } catch (e) {
                console.error(e);
            }
            const completedDates = new Set(userGames.map(game => game.date));

            // Calendar variables
            let currentDate = new Date();
            let currentMonth = currentDate.getMonth();
            let currentYear = currentDate.getFullYear();

            const monthYearSpan = document.getElementById("month-year");
            const calendarGrid = document.getElementById("calendar-grid");
            const prevBtn = document.getElementById("prev-month");
            const nextBtn = document.getElementById("next-month");

            function renderCalendar(month, year) {
                calendarGrid.innerHTML = "";

                // Display month and year
                const monthNames = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"];
                monthYearSpan.textContent = monthNames[month] + " " + year;

                // Get the day of the week the month starts on (0=Sunday)
                const firstDay = new Date(year, month, 1).getDay();
                // Number of days in the month
                const daysInMonth = new Date(year, month + 1, 0).getDate();

                // Add empty cells for days before the first day of the month
                for (let i = 0; i < firstDay; i++) {
                    let emptyCell = document.createElement("div");
                    emptyCell.classList.add("calendar-cell", "empty");
                    calendarGrid.appendChild(emptyCell);
                }

                // Create cells for each day
                for (let day = 1; day <= daysInMonth; day++) {
                    let cell = document.createElement("div");
                    cell.classList.add("calendar-cell");

                    let dayStr = day < 10 ? "0" + day : day;
                    let monthStr = (month + 1) < 10 ? "0" + (month + 1) : (month + 1);
                    let dateStr = year + "-" + monthStr + "-" + dayStr;

                    // Create an anchor element and set the href dynamically
                    let link = document.createElement("a");
                    link.href = "/archive/" + dateStr;
                    link.textContent = day;  // Display the day number
                    // Optionally, add any classes or attributes to the anchor if needed.
                    cell.appendChild(link);

                    // Set cell color based on movie availability and user completion
                    if (movieDates.has(dateStr)) {
                        if (completedDates.has(dateStr)) {
                            cell.classList.add("completed");
                        } else {
                            cell.classList.add("available");
                        }
                    } else {
                        cell.classList.add("no-movie");
                    }

                    calendarGrid.appendChild(cell);
                }
            }

            prevBtn.addEventListener("click", function () {
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
                renderCalendar(currentMonth, currentYear);
            });

            nextBtn.addEventListener("click", function () {
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                renderCalendar(currentMonth, currentYear);
            });

            renderCalendar(currentMonth, currentYear);
        })
        .catch(err => console.error(err));
});
