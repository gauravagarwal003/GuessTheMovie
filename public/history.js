// ---------------- Constants ----------------
const SKIPPED_GUESS = '__SKIPPED__'; // Sentinel value to indicate a skipped guess
const SELECTED_COLUMNS = ['title', 'year', 'movieID', 'posterLink']; // Columns to select from the CSV file
let allMovies = []; // Array to store all movie data

// ---------------- Utility Functions ----------------

// Formats the date to a more readable string format
function formatDate(isoDate) {
    const localDateString = isoDate.replace(/-/g, '/');
    const date = new Date(localDateString);
    const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
}

// Generates ordinal suffix for a given day
function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

// ---------------- Stats Calculation Functions ----------------

// Calculate total win percentage
function calculateWinPercentage(stats) {
    const total = stats.games.length;
    if (total === 0) return 0;
    let wins = stats.games.filter(game => game.won).length;
    return (wins / total) * 100;
}

// Calculate average guesses per win
function calculateAverageGuessCount(stats) {
    let totalGuesses = 0;
    let winCount = 0;
    for (const game of stats.games) {
        if (game.won) {
            winCount++;
            totalGuesses += game.guessCount;
        }
    }
    return winCount === 0 ? 0 : totalGuesses / winCount;
}

// Calculate current streak
function calculateCurrentStreak(stats) {
    if (stats.games.length === 0) return { streak: 0, type: "none" };

    let streak = 0;
    const mostRecentResult = stats.games[stats.games.length - 1].won;
    const streakType = mostRecentResult ? "win" : "loss";

    for (let i = stats.games.length - 1; i >= 0; i--) {
        if (stats.games[i].won === mostRecentResult) streak++;
        else break;
    }
    return { streak, type: streakType };
}

// Get most guessed movie
function getMostGuessedMovie(stats) {
    const frequency = {};
    let mostGuessed = null;
    let maxCount = 0;

    for (const game of stats.games) {
        for (const guess of game.guesses) {
            frequency[guess] = (frequency[guess] || 0) + 1;
            if (frequency[guess] > maxCount) {
                maxCount = frequency[guess];
                mostGuessed = guess;
            }
        }
    }
    const movie = allMovies.find(m => m.movieID === mostGuessed);
    if (maxCount <= 1 || !movie) return null;
    return `${movie.title} (${movie.year})`;
}

// Fewest guesses in a win
function fewestGuessesInSingleWin(stats) {
    let minGuesses = Infinity;
    for (const game of stats.games) {
        if (game.won && game.guessCount < minGuesses) minGuesses = game.guessCount;
    }
    return minGuesses === Infinity ? 0 : minGuesses;
}

// Longest winning streak
function longestWinningStreak(stats) {
    let maxStreak = 0, currentStreak = 0;
    for (const game of stats.games) {
        if (game.won) {
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
            currentStreak = 0;
        }
    }
    return maxStreak;
}

// Total unique movies guessed
function totalUniqueMoviesGuessed(stats) {
    const guessed = new Set();
    for (const game of stats.games) {
        for (const guess of game.guesses) {
            if (guess !== SKIPPED_GUESS) guessed.add(guess);
        }
    }
    return guessed.size;
}

// ---------------- History Rendering ----------------

// Generates HTML for a single game
function generateGameHTML(game) {
    const formattedDate = formatDate(game.date);
    const resultText = game.won ? '<strong style="color: green;">won</strong>' : '<strong style="color: red;">lost</strong>';

    let realGuessCount = 0;
    let plural = game.guessCount > 1 ? 'reviews' : 'review';
    let guessText = '';

    for (let i = 0; i < game.guesses.length; i++) {
        if (i === game.guesses.length - 1 && game.guesses.length > 1) guessText += 'and ';
        if (game.guesses[i] === SKIPPED_GUESS) guessText += 'skipped, ';
        else {
            const movie = allMovies.find(m => m.movieID === game.guesses[i]);
            if (!movie) continue;
            realGuessCount++;
            guessText += (game.guesses[i] === game.correctMovieID ? 'correctly' : 'incorrectly');
            guessText += ` guessed <a href="https://letterboxd.com/film/${movie.movieID}/" target="_blank" class="text-link"><u>${movie.title} (${movie.year})</u></a>, `;
        }
    }

    if (guessText.endsWith(', ')) guessText = guessText.slice(0, -2);

    const correctMovie = allMovies.find(m => m.movieID === game.correctMovieID);
    let html = `<h3 class="historyFirstLine"><strong>${formattedDate}: <a href="https://letterboxd.com/film/${correctMovie.movieID}/" target="_blank" class="text-link"><u>${game.title} (${game.year})</u></a></strong></h3>`;
    if (realGuessCount <= 0) html += `<p class="historySecondLine">You ${resultText} and did not guess any movies</p>`;
    else html += `<p class="historySecondLine">You ${resultText} with ${game.guessCount} ${plural}: ${guessText}.</p>`;
    return html;
}

// ---------------- Display Function ----------------

var globalGameStats = JSON.parse(localStorage.getItem('gameStats')) || {
    games: [],
    totalPlayed: 0,
    totalWon: 0
};

function displayHistoryAndStats() {
    const container = document.getElementById('historyBody');
    if (!globalGameStats.games.length) {
        container.innerHTML += `<p>You have not played any games yet!</p>`;
        return;
    }

    // --- History ---
    container.innerHTML += `<h2 class="history-about-subheading" >Your Game History</h2>`;
    const sortedGames = globalGameStats.games.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    sortedGames.forEach(game => container.innerHTML += generateGameHTML(game));

    // --- Stats ---
    container.innerHTML += `<h2 class="history-about-subheading" >Your Stats</h2>`;
    const winPct = calculateWinPercentage(globalGameStats);
    const avgGuesses = calculateAverageGuessCount(globalGameStats);
    const currentStreak = calculateCurrentStreak(globalGameStats);
    const mostGuessed = getMostGuessedMovie(globalGameStats);
    const fewestGuessesInWin = fewestGuessesInSingleWin(globalGameStats);
    const longestWinStreak = longestWinningStreak(globalGameStats);
    const totalMoviesGuessed = totalUniqueMoviesGuessed(globalGameStats);

    container.innerHTML += `<p>You've played ${globalGameStats.totalPlayed} games and won ${globalGameStats.totalWon}, giving a win percentage of ${Math.round(winPct)}%.</p>`;
    container.innerHTML += `<p>Average guesses per win: ${avgGuesses.toFixed(2)}</p>`;
    container.innerHTML += `<p>Current streak: ${currentStreak.streak} ${currentStreak.type}</p>`;
    if (mostGuessed) container.innerHTML += `<p>Most guessed movie: ${mostGuessed}</p>`;
    if (fewestGuessesInWin > 0) container.innerHTML += `<p>Fewest guesses in a win: ${fewestGuessesInWin}</p>`;
    if (longestWinStreak > 0) container.innerHTML += `<p>Longest win streak: ${longestWinStreak}</p>`;
    if (totalMoviesGuessed === 1) container.innerHTML += `<p>Unique movies guessed: 1</p>`;
    else if (totalMoviesGuessed > 0) container.innerHTML += `<p>Unique movies guessed: ${totalMoviesGuessed}</p>`;
}

// ---------------- Initialization ----------------

document.addEventListener('DOMContentLoaded', async function initializeGame() {
    try {
        // Load CSV
        const response = await fetch('/movies.csv');
        const csvText = await response.text();

        // Parse CSV and wait for completion
        allMovies = await new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                complete: results => {
                    const movies = results.data
                        .map(row => {
                            let selected = {};
                            SELECTED_COLUMNS.forEach(col => selected[col] = row[col]);
                            return selected;
                        })
                        .filter(row => Object.values(row).every(v => v !== undefined && v !== null && v !== ""));
                    resolve(movies);
                },
                error: err => reject(err)
            });
        });

        // Render history & stats
        displayHistoryAndStats();

    } catch (err) {
        console.error('Error during initialization:', err);
    }
});
