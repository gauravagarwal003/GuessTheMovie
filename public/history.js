migrateLocalStorage();

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

// Fewest guesses in a win
function fewestGuessesInSingleWin(stats) {
    let minGuesses = Infinity;
    for (const game of stats.games) {
        if (game.won && game.guessCount < minGuesses) minGuesses = game.guessCount;
    }
    return minGuesses === Infinity ? 0 : minGuesses;
}

// ---------------- History Rendering ----------------

// Cache localStorage data to avoid repeated parsing
class HistoryDataCache {
  constructor() {
    this._gameHistory = null;
    this._gameStats = null;
  }
  
  get gameHistory() {
    if (!this._gameHistory) {
      this._gameHistory = JSON.parse(localStorage.getItem('gameHistory')) || [];
    }
    return this._gameHistory;
  }
  
  get gameStats() {
    if (!this._gameStats) {
      this._gameStats = JSON.parse(localStorage.getItem('gameStats')) || {};
    }
    return this._gameStats;
  }
}

const historyCache = new HistoryDataCache();
let gameHistory = historyCache.gameHistory;
let gameStats = historyCache.gameStats;

// Generates HTML for a single game (v1 localStorage)
function generateGameHTML(game) {
    const formattedDate = formatDate(game.date);
    let resultText = '';
    let dateColor = '';
    if (game.status === 'won') {
        resultText = '<strong style="color: green;">won</strong>';
        dateColor = 'green';
    } else if (game.status === 'lost') {
        resultText = '<strong style="color: red;">lost</strong>';
        dateColor = 'red';
    } else {
        resultText = '<strong style="color: orange;">didn\'t finish (archive available)</strong>';
        dateColor = 'orange';
    }

    let realGuessCount = 0;
    let plural = (game.guesses && game.guesses.length > 1) ? 'guesses' : 'guess';
    let guessText = '';

    if (Array.isArray(game.guesses)) {
        let i = 0;
        let guessItems = [];
        
        while (i < game.guesses.length) {
            if (game.guesses[i] === SKIPPED_GUESS) {
                // Count consecutive skips
                let skipCount = 0;
                while (i < game.guesses.length && game.guesses[i] === SKIPPED_GUESS) {
                    skipCount++;
                    i++;
                }
                
                if (skipCount === 1) {
                    guessItems.push('skipped');
                } else {
                    guessItems.push(`skipped ${skipCount} times`);
                }
            } else {
                // Count consecutive guesses of the same movie
                const currentMovieId = game.guesses[i];
                let sameMovieCount = 0;
                while (i < game.guesses.length && game.guesses[i] === currentMovieId) {
                    sameMovieCount++;
                    i++;
                }
                
                const movie = allMovies.find(m => m.movieID === currentMovieId);
                if (movie) {
                    realGuessCount += sameMovieCount;
                    const correctness = currentMovieId === game.id ? 'correctly' : 'incorrectly';
                    
                    if (sameMovieCount === 1) {
                        guessItems.push(`${correctness} guessed ${movie.title} (${movie.year})`);
                    } else {
                        guessItems.push(`${correctness} guessed ${movie.title} (${movie.year}) ${sameMovieCount} times`);
                    }
                }
            }
        }
        
        // Join the items with proper grammar
        if (guessItems.length > 0) {
            if (guessItems.length === 1) {
                guessText = guessItems[0];
            } else if (guessItems.length === 2) {
                guessText = guessItems[0] + ' and ' + guessItems[1];
            } else {
                guessText = guessItems.slice(0, -1).join(', ') + ', and ' + guessItems[guessItems.length - 1];
            }
        }
    }

    let html = `<h3 class=\"historyFirstLine\"><strong>${formattedDate}`;
    if (game.status !== 'incomplete') {
        html += `: `;
        // Use title/year from game history if available
        if (game.title && game.year) {
            html += `<a href=\"https://letterboxd.com/film/${game.id}/\" target=\"_blank\" class=\"text-link\"><u>${game.title} (${game.year})</u></a>`;
        } else {
            const correctMovie = allMovies.find(m => m.movieID === game.id);
            if (correctMovie) {
                html += `<a href=\"https://letterboxd.com/film/${correctMovie.movieID}/\" target=\"_blank\" class=\"text-link\"><u>${correctMovie.title} (${correctMovie.year})</u></a>`;
            } else {
                html += `${game.id}`;
            }
        }
    }
    html += `</strong></h3>`;
    if (realGuessCount <= 0 && guessText === '') {
        html += `<p class="historySecondLine">You ${resultText} and did not guess any movies</p>`;
    } else {
        html += `<p class="historySecondLine">You ${resultText} with ${game.guesses.length} ${plural}: ${guessText}</p>`;
    }
    return html;
}

// Cache DOM elements
let historyBodyElement = null;

function getHistoryBodyElement() {
  if (!historyBodyElement) {
    historyBodyElement = document.getElementById('historyBody');
  }
  return historyBodyElement;
}

function displayHistoryAndStats() {
    const container = getHistoryBodyElement();
    if (!container) return;
    
    if (!gameHistory.length) {
        container.innerHTML += `<p>You have not played any games yet!</p>`;
        return;
    }

    // --- Stats ---
    container.innerHTML += `<h2 class="history-about-subheading" >Your Stats</h2>`;
    container.innerHTML += `<p>You've played ${gameStats.gamesFinished || 0} games and won ${gameStats.gamesWon || 0}, giving you a win percentage of ${gameStats.winPercentage || 0}%.</p>`;
    container.innerHTML += `<p>Average guesses per win: ${(gameStats.averageGuesses || 0).toFixed(2)}</p>`;
    if (gameStats.fastestWin != null) container.innerHTML += `<p>Fastest win (fewest guesses): ${gameStats.fastestWin}</p>`;

    // --- Calculated stats from v1 gameHistory ---
    const mostGuessed = getMostGuessedMovie(gameHistory);
    const totalMoviesGuessed = totalUniqueMoviesGuessed(gameHistory);
    if (mostGuessed) container.innerHTML += `<p>Most guessed movie: ${mostGuessed}</p>`;
    if (totalMoviesGuessed === 1) container.innerHTML += `<p>Unique movies guessed: 1</p>`;
    else if (totalMoviesGuessed > 0) container.innerHTML += `<p>Unique movies guessed: ${totalMoviesGuessed}</p>`;

    // --- Guess Distribution Bar Chart ---
    container.innerHTML += generateGuessDistributionHTML(gameHistory);

    // --- History ---
    container.innerHTML += `<h2 class="history-about-subheading" >Your Game History</h2>`;
    const sortedGames = gameHistory.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    sortedGames.forEach(game => container.innerHTML += generateGameHTML(game));
}

// Generates the horizontal chart for wins by guess (Guess 1..5 arranged side-by-side)
function generateGuessDistributionHTML(games) {
    const wonGames = (games || []).filter(g => g.status === 'won');
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    wonGames.forEach(g => {
        const num = (g.guesses && g.guesses.length) || 0;
        if (counts[num] !== undefined) counts[num]++;
    });

    const maxVal = Math.max(1, ...Object.values(counts));
    let colsHtml = '';
    for (let i = 1; i <= 5; i++) {
        const count = counts[i];
        const pct = count > 0 ? Math.max(12, Math.round((count / maxVal) * 100)) : 0;
        const hasWins = count > 0;
        colsHtml += `
            <div class="guess-dist-col">
                <span class="guess-col-count ${hasWins ? 'has-wins' : 'zero-wins'}">${count}</span>
                <div class="guess-col-track">
                    <div class="guess-col-fill ${hasWins ? 'has-wins' : 'zero-wins'}" style="height: ${pct}%;"></div>
                </div>
                <span class="guess-col-label">${i}</span>
            </div>
        `;
    }

    return `
        <div class="guess-distribution-box">
            <h3 class="guess-dist-title">Wins by Guess</h3>
            <div class="guess-dist-subtitle">Games won on Review 1 through 5</div>
            <div class="guess-dist-columns">
                ${colsHtml}
            </div>
        </div>
    `;
}

function getMostGuessedMovie(games) {
    const frequency = {};
    let mostGuessed = null;
    let maxCount = 0;
    for (const game of games) {
        for (const guess of game.guesses) {
            if (guess !== SKIPPED_GUESS) {
                frequency[guess] = (frequency[guess] || 0) + 1;
                if (frequency[guess] > maxCount) {
                    maxCount = frequency[guess];
                    mostGuessed = guess;
                }
            }
        }
    }
    const movie = allMovies.find(m => m.movieID === mostGuessed);
    if (maxCount <= 1 || !movie) return null;
    return `${movie.title} (${movie.year})`;
}

function totalUniqueMoviesGuessed(games) {
    const guessed = new Set();
    for (const game of games) {
        for (const guess of game.guesses) {
            if (guess !== SKIPPED_GUESS) guessed.add(guess);
        }
    }
    return guessed.size;
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

        // Render Stats & History
        displayHistoryAndStats();

    } catch (err) {
        console.error('Error during initialization:', err);
    }
});
