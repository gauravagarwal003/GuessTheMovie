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

        // Older archive JSON could have a `date` value that disagreed with its
        // filename. The manifest is generated from archive filenames, so use
        // its movieID-to-date mapping to repair saved local game history.
        const canonicalDateByMovieId = new Map(
            Object.entries(data && data.metadata && typeof data.metadata === 'object' ? data.metadata : {})
                .filter(([, movie]) => movie && movie.movieID)
                .map(([date, movie]) => [String(movie.movieID).trim().toLowerCase(), date])
        );
        let historyMigrated = false;
        for (const game of userGames) {
            if (!game || typeof game !== 'object' || !game.id) continue;
            const canonicalDate = canonicalDateByMovieId.get(String(game.id).trim().toLowerCase());
            if (canonicalDate && game.date !== canonicalDate) {
                game.date = canonicalDate;
                historyMigrated = true;
            }
        }
        if (historyMigrated) {
            try {
                localStorage.setItem('gameHistory', JSON.stringify(userGames));
            } catch (e) {
                console.error('Failed to save migrated game history:', e);
            }
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
            nextBtn: document.getElementById("next-month"),
            gapMessage: document.getElementById("archive-gap-message"),
            previousGameBtn: document.getElementById("previous-game"),
            nextGameBtn: document.getElementById("next-game")
        };
        const sortedMovieDates = Array.from(movieDates).sort();
        let highlightedArchiveDate = null;

        function formatArchiveDate(dateString) {
            const [year, month, day] = dateString.split('-').map(Number);
            return new Intl.DateTimeFormat('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
            }).format(new Date(Date.UTC(year, month - 1, day)));
        }

        function updateNeighborLinks(month, year) {
            const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;
            const hasGamesThisMonth = sortedMovieDates.some(date => date >= monthStart && date <= monthEnd);
            const previousDate = sortedMovieDates.filter(date => date < monthStart).pop();
            const nextDate = sortedMovieDates.find(date => date > monthEnd);

            if (calendarElements.gapMessage) calendarElements.gapMessage.hidden = hasGamesThisMonth;

            [
                [calendarElements.previousGameBtn, previousDate, 'Closest game before'],
                [calendarElements.nextGameBtn, nextDate, 'Closest game after']
            ].forEach(([button, date, label]) => {
                if (!button) return;
                button.hidden = !date || hasGamesThisMonth;
                const dateLabel = button.querySelector('.archive-neighbor-date');
                if (dateLabel) dateLabel.textContent = date ? formatArchiveDate(date) : '';
                button.setAttribute('aria-label', date ? `${label}, ${formatArchiveDate(date)}` : label);
                button.onclick = date ? function () {
                    const [targetYear, targetMonth] = date.split('-').map(Number);
                    currentYear = targetYear;
                    currentMonth = targetMonth - 1;
                    highlightedArchiveDate = date;
                    renderCalendar(currentMonth, currentYear);
                    const targetCell = calendarElements.calendarGrid.querySelector('[data-date="' + date + '"]');
                    if (targetCell) targetCell.focus();
                } : null;
            });
        }

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
            updateNeighborLinks(month, year);

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
                cell.dataset.date = dateStr;

                // If there is a movie for this date, create a clickable link; otherwise, create plain text.
                if (movieDates.has(dateStr)) {
                    cell.tabIndex = 0;
                    cell.setAttribute('role', 'link');
                    cell.setAttribute('aria-label', `Play game from ${formatArchiveDate(dateStr)}`);
                    cell.onclick = function () {
                        window.location.href = "/archive/" + dateStr;
                    };
                    cell.onkeydown = function (event) {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            window.location.href = "/archive/" + dateStr;
                        }
                    };
                    cell.textContent = day; // Display the day number
                    if (dateStr === highlightedArchiveDate) {
                        cell.classList.add('neighbor-movie-cell');
                        cell.setAttribute('aria-current', 'date');
                    }
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
