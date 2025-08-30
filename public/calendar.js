const STORAGE_VERSION = 'v1';

function migrateLocalStorage() {
  if (localStorage.getItem('storageVersion') === STORAGE_VERSION) return;

  let oldStats = JSON.parse(localStorage.getItem('gameStats')) || {};
  let games = oldStats.games || [];
  let gamesFinished = games.length;
  let gamesWon = games.filter(g => g.won).length;
  let gamesLost = gamesFinished - gamesWon;
  let winGames = games.filter(g => g.won);
  let fastestWin = winGames.length ? Math.min(...winGames.map(g => g.guessCount)) : null;
  let slowestWin = winGames.length ? Math.max(...winGames.map(g => g.guessCount)) : null;
  let averageGuesses = gamesFinished ? (games.reduce((acc, g) => acc + (g.guessCount || 0), 0) / gamesFinished) : null;
  let winPercentage = gamesFinished ? Math.round((gamesWon / gamesFinished) * 100) : 0;

  let gameStats = {
    gamesFinished,
    gamesWon,
    gamesLost,
    fastestWin,
    slowestWin,
    averageGuesses,
    winPercentage
  };

  let gameHistory = games.map(g => ({
    id: g.correctMovieID,
    date: g.date,
    status: g.won ? 'won' : 'lost',
    guesses: g.guesses || [],
    timeStarted: null,
    timeCompleted: null
  }));

  localStorage.setItem('gameStats', JSON.stringify(gameStats));
  localStorage.setItem('gameHistory', JSON.stringify(gameHistory));
  localStorage.setItem('storageVersion', STORAGE_VERSION);
}

migrateLocalStorage();

document.addEventListener('DOMContentLoaded', async function initializeGame() {
    fetch('/api/dates')
        .then(response => response.json())
        .then(data => {
            const movieDates = new Set(data.dates);
            // Retrieve user game stats (assumed stored as JSON under 'gameStats')
            let userGames = [];
            try {
                const storedData = localStorage.getItem('gameHistory');
                if (storedData) {
                    userGames = JSON.parse(storedData);
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

                    // If there is a movie for this date, create a clickable link; otherwise, create plain text.
                    if (movieDates.has(dateStr)) {
                        cell.classList.add("clickable-cell");
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
                                cell.classList.add("won");
                            } else if (userGames.some(game => game.date === dateStr && game.status === 'lost')) {
                                cell.classList.add("lost");
                            } else if (userGames.some(game => game.date === dateStr && game.status === 'incomplete')) {
                                cell.classList.add("incomplete");
                            }
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