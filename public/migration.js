window.STORAGE_VERSION = 'v1';
const MAX_GUESSES = 5;
// --- REMOVE AFTER 2025-09-18: Cleanup snippet ---
// This small block removes the one-time migration flag after 2025-09-17 so
// clients don't keep the `migration_2025-09-17_done` key forever. Remove this
// entire block after 2025-09-18 and redeploy to keep the codebase clean.
// Runs on load and is safe to call repeatedly.
try {
  const cleanupDate = new Date('2025-09-18T00:00:00Z');
  const now = new Date();
  if (now >= cleanupDate) {
    // If it's on/after 2025-09-18 UTC, remove the migration flag so it
    // doesn't linger in client localStorage. Safe to remove this line/block
    // after 2025-09-18.
    localStorage.removeItem('migration_2025-09-17_done');
    // Note: we intentionally do not remove `storageVersion` here.
  }
} catch (e) {
  // ignore
}
window.migrateLocalStorage = function() {
  if (localStorage.getItem('storageVersion') === window.STORAGE_VERSION) return;

  // --- REMOVE AFTER 2025-09-18: Emergency migration for 2025-09-17 ---
  // One-time emergency reset for 2025-09-17: if the admin accidentally set
  // today's answer to a movie that wasn't in the CSV, clear any stored
  // progress for that date so users can replay. This block sets
  // `migration_2025-09-17_done` and `storageVersion`. Once you confirm it's
  // no longer needed (after 2025-09-17/18), remove this entire try/catch
  // block and redeploy.
  try {
    const migrationKey = 'migration_2025-09-17_done';
    if (!localStorage.getItem(migrationKey)) {
      // Load existing game history and filter out any entries for 2025-09-17
      const history = JSON.parse(localStorage.getItem('gameHistory')) || [];
      const filtered = history.filter(g => g.date !== '2025-09-17');
      if (filtered.length !== history.length) {
        localStorage.setItem('gameHistory', JSON.stringify(filtered));
      }

      // Also clear any per-day incomplete game that might reference the bad movie
      // (some users may have an 'incomplete' entry for that id). We removed by date
      // above, but remove dangling keys if you used alternate storage patterns.
      // (No additional per-day keys are expected in current codebase.)

  // Mark migration applied so we don't run again
  localStorage.setItem(migrationKey, '1');
  // Also bump storageVersion so other migrations don't re-run immediate logic
  localStorage.setItem('storageVersion', window.STORAGE_VERSION);
  // End of emergency block — safe to remove after 2025-09-18
    }
  } catch (e) {
    // If anything goes wrong, avoid blocking normal app start — just log.
    // (Logging only; don't expose to users.)
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
