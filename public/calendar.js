// Safe call to migration helper (may be missing in some contexts)
try {
    if (typeof migrateLocalStorage === 'function') {
        migrateLocalStorage();
    } else {
        // not fatal; migration helper might not be present in some test flows
        console.warn('migrateLocalStorage() not defined; continuing without migration.');
    }
} catch (e) {
    console.warn('migrateLocalStorage threw an error, continuing:', e);
}

document.addEventListener('DOMContentLoaded', async function initializeGame() {
    try {
        // Try to load dates manifest, but don't let failure stop calendar rendering
        let data = null;
        try {
            const resp = await fetch('/dates.json');
            if (resp.ok) {
                data = await resp.json();
            } else {
                console.warn('Failed to fetch /dates.json, status:', resp.status);
            }
        } catch (err) {
            console.warn('Error fetching /dates.json:', err);
        }

        // Normalize incoming dates array safely
        const movieDates = new Set(
            (Array.isArray(data && data.dates ? data.dates : []) ? data.dates : [])
                .map(d => (typeof d === 'string' ? d.trim() : d))
                .filter(Boolean)
        );

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
            if (!calendarElements.calendarGrid || !calendarElements.monthYearSpan) {
                console.warn('Calendar container or header not found in DOM.');
                return;
            }

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

                // Always zero-pad month and day to build YYYY-MM-DD reliably
                let dayStr = String(day).padStart(2, '0');
                let monthStr = String(month + 1).padStart(2, '0');
                let dateStr = `${year}-${monthStr}-${dayStr}`;

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

        // Initial render even if dates.json failed — calendar will show "no-movie" cells
        renderCalendar(currentMonth, currentYear);

        // Helpful debug: log when manifest appears to be empty
        if (movieDates.size === 0) {
            console.info('dates.json is empty or not found — calendar rendered but no movie days are marked. Check /dates.json or run generate-manifests.js');
        }
    } catch (err) {
        console.error('Unexpected error initializing calendar:', err);
    }
});