migrateLocalStorage();

document.addEventListener('DOMContentLoaded', async function initializeGame() {
    fetch('/dates.json')
        .then(response => response.json())
        .then(data => {
            const movieDates = new Set(data.dates);
            // Retrieve user game stats with error handling
            let userGames = [];
            try {
                const storedData = localStorage.getItem('gameHistory');
                userGames = storedData ? JSON.parse(storedData) : [];
            } catch (e) {
                console.error('Failed to parse game history:', e);
                userGames = [];
            }
            const completedDates = new Set(userGames.map(game => game.date));

            // Calendar variables
            let currentDate = new Date();
            let currentMonth = currentDate.getMonth();
            let currentYear = currentDate.getFullYear();

            // Cache DOM elements
            const calendarElements = {
                monthYearSpan: document.getElementById("month-year"),
                calendarGrid: document.getElementById("calendar-grid"),
                prevBtn: document.getElementById("prev-month"),
                nextBtn: document.getElementById("next-month")
            };

            function renderCalendar(month, year) {
                if (!calendarElements.calendarGrid || !calendarElements.monthYearSpan) return;
                
                calendarElements.calendarGrid.innerHTML = "";

                // Display month and year
                const monthNames = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"];
                calendarElements.monthYearSpan.textContent = `${monthNames[month]} ${year}`;

                // Get the day of the week the month starts on (0=Sunday)
                const firstDay = new Date(year, month, 1).getDay();
                // Number of days in the month
                const daysInMonth = new Date(year, month + 1, 0).getDate();

                // Use document fragment for better performance
                const fragment = document.createDocumentFragment();
                
                // Add empty cells for days before the first day of the month
                for (let i = 0; i < firstDay; i++) {
                    let emptyCell = document.createElement("div");
                    emptyCell.classList.add("calendar-cell", "empty");
                    fragment.appendChild(emptyCell);
                }

                // Create cells for each day
                for (let day = 1; day <= daysInMonth; day++) {
                    let cell = document.createElement("div");
                    cell.classList.add("calendar-cell");

                    let dayStr = day < 10 ? "0" + day : day;
                    let monthStr = (month + 1) < 10 ? "0" + (month + 1) : (month + 1);
                    let dateStr = year + "-" + monthStr + "-" + dayStr;

                    // If there is a movie for this date, create a clickable link; otherwise, create plain text.
                    if (movieDates.has(dateStr)) {
                        cell.onclick = function () {
                            window.location.href = "/archive/" + dateStr;
                        };
                        cell.textContent = day; // Display the day number
                    } else {
                        let span = document.createElement("span");
                        span.textContent = day;
                        cell.appendChild(span);
                    }

                    // Set cell color based on movie availability and user completion
                    if (movieDates.has(dateStr)) {
                        if (completedDates.has(dateStr)) {
                            if (userGames.some(game => game.date === dateStr && game.status === 'won')) {
                                cell.classList.add("won-calendar-cell");
                            } else if (userGames.some(game => game.date === dateStr && game.status === 'lost')) {
                                cell.classList.add("lost-calendar-cell");
                            } else if (userGames.some(game => game.date === dateStr && game.status === 'incomplete')) {
                                cell.classList.add("incomplete-calendar-cell");
                            }
                        } else {
                            cell.classList.add("available");
                        }
                    } else {
                        cell.classList.add("no-movie");
                    }

                    fragment.appendChild(cell);
                }
                
                // Append the entire fragment at once for better performance
                calendarElements.calendarGrid.appendChild(fragment);
            }

            if (calendarElements.prevBtn) {
                calendarElements.prevBtn.addEventListener("click", function () {
                    currentMonth--;
                    if (currentMonth < 0) {
                        currentMonth = 11;
                        currentYear--;
                    }
                    renderCalendar(currentMonth, currentYear);
                });
            }

            if (calendarElements.nextBtn) {
                calendarElements.nextBtn.addEventListener("click", function () {
                    currentMonth++;
                    if (currentMonth > 11) {
                        currentMonth = 0;
                        currentYear++;
                    }
                    renderCalendar(currentMonth, currentYear);
                });
            }

            renderCalendar(currentMonth, currentYear);
        })
        .catch(err => console.error(err));

});