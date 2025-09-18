window.STORAGE_VERSION = 'v1';
const MAX_GUESSES = 5;
window.migrateLocalStorage = function() {
  // Cleanup: remove the one-time migration flag after 2025-09-17 so clients
  // don't keep the `migration_2025-09-17_done` key forever.
  try {
    const cleanupDate = new Date('2025-09-18T00:00:00Z');
    const now = new Date();
    if (now >= cleanupDate) {
      localStorage.removeItem('migration_2025-09-17_done');
    }
  } catch (e) {}

  if (localStorage.getItem('storageVersion') === window.STORAGE_VERSION) return;

  try {
    const migrationKey = 'migration_2025-09-17_done';
    if (!localStorage.getItem(migrationKey)) {
      const history = JSON.parse(localStorage.getItem('gameHistory')) || [];
      const filtered = history.filter(g => g.date !== '2025-09-17');
      if (filtered.length !== history.length) {
        localStorage.setItem('gameHistory', JSON.stringify(filtered));
      }
      localStorage.setItem(migrationKey, '1');
      localStorage.setItem('storageVersion', window.STORAGE_VERSION);
    }
  } catch (e) {
    console.error('Migration error for 2025-09-17:', e);
  }

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

  let gameHistory = games.map(g => {
    let guesses = g.guesses || [];
    let isWin = g.won;
    // Fix: If won, but correctMovieID not in guesses and guesses.length < MAX_GUESSES, add it
    if (isWin && (!guesses.includes(g.correctMovieID)) && guesses.length < MAX_GUESSES) {
      guesses = [...guesses, g.correctMovieID];
    }
    // If guesses is max and correctMovieID not in guesses, set as loss
    if (guesses.length === MAX_GUESSES && !guesses.includes(g.correctMovieID)) {
      isWin = false;
    }
    return {
      id: g.correctMovieID,
      date: g.date,
      status: isWin ? 'won' : 'lost',
      guesses,
      title: g.title || null,
      year: g.year || null,
      posterLink: g.posterLink || null,
      timeStarted: null,
      timeCompleted: null
    };
  });

  localStorage.setItem('gameStats', JSON.stringify(gameStats));
  localStorage.setItem('gameHistory', JSON.stringify(gameHistory));
  localStorage.setItem('storageVersion', window.STORAGE_VERSION);
}
migrateLocalStorage();
