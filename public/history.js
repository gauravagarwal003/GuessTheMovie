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

// Load new v1 localStorage structure
gameHistory = JSON.parse(localStorage.getItem('gameHistory')) || [];
gameStats = JSON.parse(localStorage.getItem('gameStats')) || {};

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
    let plural = (game.guesses && game.guesses.length > 1) ? 'reviews' : 'review';
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
                        guessItems.push(`${correctness} guessed <a href="https://letterboxd.com/film/${movie.movieID}/" target="_blank" class="text-link"><u>${movie.title} (${movie.year})</u></a>`);
                    } else {
                        guessItems.push(`${correctness} guessed <a href="https://letterboxd.com/film/${movie.movieID}/" target="_blank" class="text-link"><u>${movie.title} (${movie.year})</u></a> ${sameMovieCount} times`);
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

function displayHistoryAndStats() {
    const container = document.getElementById('historyBody');
    if (!gameHistory.length) {
        container.innerHTML += `<p>You have not played any games yet!</p>`;
        return;
    }

    // --- History ---
    container.innerHTML += `<h2 class="history-about-subheading" >Your Game History</h2>`;
    const sortedGames = gameHistory.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    sortedGames.forEach(game => container.innerHTML += generateGameHTML(game));

    // --- Stats ---
    container.innerHTML += `<h2 class="history-about-subheading" >Your Stats</h2>`;
    container.innerHTML += `<p>You've played ${gameStats.gamesFinished || 0} games and won ${gameStats.gamesWon || 0}, giving a win percentage of ${gameStats.winPercentage || 0}%.</p>`;
    container.innerHTML += `<p>Average guesses per win: ${(gameStats.averageGuesses || 0).toFixed(2)}</p>`;
    if (gameStats.fastestWin !== undefined) container.innerHTML += `<p>Fastest win (fewest guesses): ${gameStats.fastestWin}</p>`;

    // --- Calculated stats from v1 gameHistory ---
    const currentStreak = calculateCurrentStreak(gameHistory);
    const mostGuessed = getMostGuessedMovie(gameHistory);
    const longestWinStreak = longestWinningStreak(gameHistory);
    const totalMoviesGuessed = totalUniqueMoviesGuessed(gameHistory);

    container.innerHTML += `<p>Current streak: ${currentStreak.streak} ${currentStreak.type}</p>`;
    if (mostGuessed) container.innerHTML += `<p>Most guessed movie: ${mostGuessed}</p>`;
    if (longestWinStreak > 0) container.innerHTML += `<p>Longest win streak: ${longestWinStreak}</p>`;
    if (totalMoviesGuessed === 1) container.innerHTML += `<p>Unique movies guessed: 1</p>`;
    else if (totalMoviesGuessed > 0) container.innerHTML += `<p>Unique movies guessed: ${totalMoviesGuessed}</p>`;
// --- v1 versions of stats functions ---
function calculateCurrentStreak(games) {
    if (!games.length) return { streak: 0, type: "none" };
    let streak = 0;
    const mostRecentResult = games[games.length - 1].status === 'won';
    const streakType = mostRecentResult ? "win" : "loss";
    for (let i = games.length - 1; i >= 0; i--) {
        if ((games[i].status === 'won') === mostRecentResult) streak++;
        else break;
    }
    return { streak, type: streakType };
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
    // return `${movie.title} (${movie.year})`;
    return `<a href="https://letterboxd.com/film/${movie.movieID}/" target="_blank" class="text-link"><u>${movie.title} (${movie.year})</u></a>`;

}

function longestWinningStreak(games) {
    let maxStreak = 0, currentStreak = 0;
    for (const game of games) {
        if (game.status === 'won') {
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
            currentStreak = 0;
        }
    }
    return maxStreak;
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
