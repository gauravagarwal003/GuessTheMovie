// Global variables and constants
let gameOver = false; // Indicates if the game is over
let gameWon = false; // Indicates if the game was won

let correctMovieID = ''; // The ID of the correct movie
let correctMovieObject = ''; // The object containing details of the correct movie
let correctMovieDate = ''; // The date of the correct movie
let formattedMovieDate = ''; // The formatted date of the correct movie

let allMovies = []; // Array to store all movie data
let collectedGuesses = []; // Array to store the user's guesses
let currentMovieListIndex = -1; // Index of the current movie in the movie list
let incorrectGuessCount = 0; // Count of incorrect guesses

let currentReviewIndex = 1; // Index of the current review being displayed
let allReviewJSONs = []; // Array to store all review JSONs
let currentReviewJSONs = []; // Array to store the subset of review JSONs

// Determine if the current movie is an archive movie or today's movie
const pathSegments = window.location.pathname.split('/').filter(Boolean);
let archiveDate = (pathSegments[0] === 'archive' && pathSegments.length > 1)
  ? pathSegments[1]
  : null;

// Initialize Fuse with options
let fuse;
function initializeFuse() {
  const options = {
    keys: ["title"],
    threshold: 0.4, // lower = stricter, higher = fuzzier
    includeScore: true,
  };
  fuse = new Fuse(allMovies, options);
}

// Update the title if archive movie
if (archiveDate) {
  document.title = "Guess The Movie | " + archiveDate;
}

// Global constants for the game
const SKIPPED_GUESS = '__SKIPPED__'; // Sentinel value to indicate a skipped guess
const MAX_NUM_MOVIES_TO_SHOW = 50;
const SELECTED_COLUMNS = ['title', 'year', 'movieID', 'posterLink']; // Columns to select from the CSV file
if (typeof MAX_GUESSES === 'undefined') {
  MAX_GUESSES = 5;
}

// Frequently used DOM elements - cached for performance
const domElements = {
  reviewNumButtons: null,
  shareButton: null,
  dateDisplay: null,
  resultDisplay: null,
  searchInput: null,
  movieList: null,
  reviewCard: null,

  init() {
    this.reviewNumButtons = document.getElementById('imageButtons');
    this.shareButton = document.querySelector('button[id="share-button"]');
    this.dateDisplay = document.getElementById('dateDisplayMessage');
    this.resultDisplay = document.getElementById('resultDisplay');
    this.searchInput = document.getElementById('search');
    this.movieList = document.getElementById('movieList');
    this.reviewCard = document.getElementById('reviewCard');
  },

  get(elementName) {
    if (!this[elementName]) {
      switch (elementName) {
        case 'searchInput': this.searchInput = document.getElementById('search'); break;
        case 'movieList': this.movieList = document.getElementById('movieList'); break;
        case 'reviewCard': this.reviewCard = document.getElementById('reviewCard'); break;
        default: break;
      }
    }
    return this[elementName];
  }
};

// Legacy constants for backward compatibility - will be set after DOM is ready
let reviewNumButtons, shareButton, dateDisplay, resultDisplay;

migrateLocalStorage();

// Cache localStorage data to avoid repeated parsing
class GameDataCache {
  constructor() {
    this._gameStats = null;
    this._gameHistory = null;
  }

  get gameStats() {
    if (!this._gameStats) {
      this._gameStats = JSON.parse(localStorage.getItem('gameStats')) || {
        gamesFinished: 0,
        gamesWon: 0,
        gamesLost: 0,
        fastestWin: null,
        slowestWin: null,
        averageGuesses: null,
        winPercentage: 0
      };
    }
    return this._gameStats;
  }

  get gameHistory() {
    if (!this._gameHistory) {
      this._gameHistory = JSON.parse(localStorage.getItem('gameHistory')) || [];
    }
    return this._gameHistory;
  }

  saveGameStats(stats) {
    this._gameStats = stats;
    localStorage.setItem('gameStats', JSON.stringify(stats));
  }

  saveGameHistory(history) {
    this._gameHistory = history;
    localStorage.setItem('gameHistory', JSON.stringify(history));
  }

  invalidateCache() {
    this._gameStats = null;
    this._gameHistory = null;
  }
}

const gameCache = new GameDataCache();
let globalGameStats = gameCache.gameStats;
let globalGameHistory = gameCache.gameHistory;
let ongoingGame = null;

function loadOngoingGame(correctMovieID, correctMovieDate) {
  let game = globalGameHistory.find(g => g.id === correctMovieID && g.status === 'incomplete');
  if (game) {
    // Keep the live game linked to its history record so each resumed guess
    // is persisted immediately instead of only being written at game end.
    ongoingGame = game;
    collectedGuesses = [...(game.guesses || [])];
    incorrectGuessCount = collectedGuesses.length;
    return true;
  }
  return false;
}

function startOngoingGame(correctMovieID, correctMovieDate) {
  if (!ongoingGame) {
    ongoingGame = {
      id: correctMovieID,
      date: correctMovieDate,
      status: 'incomplete',
      guesses: [],
      timeStarted: null,
      timeCompleted: null
    };
    globalGameHistory.push(ongoingGame);
    saveGameHistory();
  }
}

function saveGameHistory() {
  gameCache.saveGameHistory(globalGameHistory);
}

function updateOngoingGameOnGuess(guess, isSkip = false) {
  if (!ongoingGame) return;
  if (!ongoingGame.timeStarted) ongoingGame.timeStarted = new Date().toISOString();
  ongoingGame.guesses.push(guess);
  saveGameHistory();
}

function finishOngoingGame(status) {
  if (!ongoingGame) return;
  ongoingGame.status = status;
  ongoingGame.timeCompleted = new Date().toISOString();

  // Store movie details for future reference
  if (correctMovieObject) {
    ongoingGame.title = correctMovieObject.title;
    ongoingGame.year = correctMovieObject.year;
    ongoingGame.posterLink = correctMovieObject.posterLink;
  }

  // Find and update the corresponding game in globalGameHistory
  const idx = globalGameHistory.findIndex(g => g.id === ongoingGame.id && g.status === 'incomplete');
  if (idx !== -1) {
    globalGameHistory[idx] = { ...ongoingGame };
  }

  saveGameHistory();
  updateGameStats();
  ongoingGame = null;
}

function updateGameStats() {
  const history = gameCache.gameHistory;
  const finishedGames = history.filter(g => g.status === 'won' || g.status === 'lost');
  const gamesFinished = finishedGames.length;
  const gamesWon = finishedGames.filter(g => g.status === 'won').length;
  const gamesLost = finishedGames.filter(g => g.status === 'lost').length;
  const winGames = finishedGames.filter(g => g.status === 'won');

  const stats = {
    gamesFinished,
    gamesWon,
    gamesLost,
    fastestWin: winGames.length ? Math.min(...winGames.map(g => g.guesses.length)) : null,
    slowestWin: winGames.length ? Math.max(...winGames.map(g => g.guesses.length)) : null,
    averageGuesses: gamesFinished ? (finishedGames.reduce((acc, g) => acc + (g.guesses.length || 0), 0) / gamesFinished) : null,
    winPercentage: gamesFinished ? Math.round((gamesWon / gamesFinished) * 100) : 0
  };

  gameCache.saveGameStats(stats);
  globalGameStats = stats;
}

// v1: Checks whether the user has played the current game
function hasGameBeenPlayed(correctMovieID) {
  return gameCache.gameHistory.some(game =>
    game.id === correctMovieID && (game.status === 'won' || game.status === 'lost')
  );
}

// Formats previous guesses for display in incomplete games
function formatPreviousGuesses(guesses) {
  if (!guesses || guesses.length === 0) {
    return [];
  }

  let guessItems = [];

  for (let i = 0; i < guesses.length; i++) {
    if (guesses[i] === SKIPPED_GUESS) {
      guessItems.push({
        text: 'Skipped',
        reviewIndex: i + 1,
        isCorrect: false
      });
    } else {
      // Check if this guess is the correct movie
      const isCorrect = guesses[i] === correctMovieID;

      // Find the movie object for this guess
      let movie = allMovies.find(m => m.movieID === guesses[i]);

      if (movie) {
        guessItems.push({
          text: `${movie.title} (${movie.year})`,
          reviewIndex: i + 1,
          isCorrect: isCorrect
        });
      } else {

        // For completed games, try to look up the movie info from game history
        // This handles the case where the game was completed and we stored movie details
        const history = gameCache.gameHistory;
        const foundMovieInfo = history.find(game =>
          game.id === guesses[i] && game.title && game.year
        );

        if (foundMovieInfo) {
          guessItems.push({
            text: `${foundMovieInfo.title} (${foundMovieInfo.year})`,
            reviewIndex: i + 1,
            isCorrect: isCorrect
          });
        } else {
          // Final fallback - just show the movieID (this should rarely happen)
          guessItems.push({
            text: `Movie ID: ${guesses[i]}`,
            reviewIndex: i + 1,
            isCorrect: isCorrect
          });
        }
      }
    }
  }

  return guessItems;
}

// v1: Checks if user won the current game
function hasGameBeenWon(correctMovieID) {
  return gameCache.gameHistory.some(game =>
    game.id === correctMovieID && game.status === 'won'
  );
}

// Update game based on the movie the user selected
function selectMovie(guessedMovieID) {
  const guessedMovie = allMovies.find(movie => movie.movieID === guessedMovieID);
  const isCorrectMovie = guessedMovieID === correctMovieID;

  dismissHowToPlay();
  startOngoingGame(correctMovieID, correctMovieDate);

  if (isCorrectMovie) {
    collectedGuesses.push(guessedMovie.movieID);
    updateOngoingGameOnGuess(guessedMovie.movieID);
    finishGame(true);
  } else {
    handleGuess(guessedMovie);
  }
}

// Load movie into search bar without submitting
function loadMovieIntoSearchBar(movieID) {
  const movie = allMovies.find(m => m.movieID === movieID);
  if (movie) {
    const searchInput = domElements.get('searchInput');
    if (searchInput) {
      searchInput.value = `${movie.title} (${movie.year})`;
      clearMovieList();
    }
  }
}

// Handle submit button click
function handleSubmit() {
  const searchInput = domElements.get('searchInput');
  if (!searchInput) return;

  const searchQuery = searchInput.value.trim();

  if (searchQuery === '') {
    handleGuess(null);
    return;
  }

  // Check for exact match first (most common case)
  const exactMatch = allMovies.find(movie =>
    `${movie.title} (${movie.year})` === searchQuery
  );

  if (exactMatch) {
    selectMovie(exactMatch.movieID);
    return;
  }

  // Do not silently submit a fuzzy match. A partial title can rank a different
  // movie first, so require the player to choose one of the visible suggestions.
  const filteredMovies = searchMovies(searchQuery);

  if (filteredMovies.length > 0) {
    showToast('Choose a movie from the suggestions, or clear the search to skip.');
    return;
  }

  showToast('No matching movie found. Clear the search to skip.');
}

// Extracted search logic for reusability
function searchMovies(query) {
  if (fuse) {
    return fuse.search(query)
      .slice(0, MAX_NUM_MOVIES_TO_SHOW)
      .map(result => result.item);
  }

  // Fallback search
  const lowerQuery = query.toLowerCase();
  return allMovies.filter(movie =>
    movie.title && movie.title.toLowerCase().includes(lowerQuery)
  ).slice(0, MAX_NUM_MOVIES_TO_SHOW);
}

// Finish the game
function finishGame(wonGame) {
  gameOver = true;
  gameWon = wonGame;
  gameOverMessage = wonGame ? "You got it! " : "You lost. ";
  if (resultDisplay) {
    resultDisplay.innerHTML = `${gameOverMessage}<span class="message"></span><a>${correctMovieObject.title} (${correctMovieObject.year})</a><span class="message"> is the correct movie.</span><br>`;
    const comeBackText = document.getElementById('come-back-text');
    if (comeBackText) {
      comeBackText.textContent = "Come back tomorrow for a new movie or use the archive to play past movies!";
    }
  }

  // Update the past guesses accordion for finished games
  const previousGuessesItems = formatPreviousGuesses(collectedGuesses);
  updatePastGuessesDisplay(previousGuessesItems);

  toggleAccordion(false);

  clearSearchAndMovieList();
  // Always show all reviews when game ends, regardless of win/loss
  currentReviewJSONs = allReviewJSONs.slice(0, MAX_GUESSES);
  updateReviewNumButtons();

  if (reviewNumButtons) {
    reviewNumButtons.style.marginRight = "0px";
  }
  const searchElem = document.getElementById('search');
  if (searchElem) searchElem.remove();

  // Poster removed from game screen per user request
  const existingDiv = document.getElementById('movie_poster');
  if (existingDiv) {
    existingDiv.innerHTML = '';
  }
  const searchRow = document.getElementById('search-row');
  if (searchRow) {
    searchRow.remove();
  }

  // Ensure old buttons are removed from #allButtons so only review numbers remain
  if (shareButton) {
    shareButton.style.display = 'none';
  }
  const oldSummaryBtn = document.getElementById('open-summary-button');
  if (oldSummaryBtn) oldSummaryBtn.remove();
  const oldPastGameBtn = document.getElementById('play-past-game-button');
  if (oldPastGameBtn) oldPastGameBtn.remove();
  if (reviewNumButtons) {
    reviewNumButtons.style.marginRight = '5px';
  }

  // v1: Set and update gameHistory and stats only when game is finished
  if (ongoingGame) {
    let status = (incorrectGuessCount < MAX_GUESSES) ? 'won' : 'lost';
    finishOngoingGame(status);
  }

  // Reveal the static affiliate container (if present) and update its content/link
  try {
    const aff = document.getElementById('affiliate-offers');
    if (aff) {
      // Build the affiliate links dynamically using affiliates/services.json
      (async function() {
        const movieTitle = (correctMovieObject && correctMovieObject.title) ? correctMovieObject.title : '';

        // Try to load services definitions (title + icon info)
        // Default services (safe fallback without network). These will be used
        // when the JSON isn't available or fetch fails. Keep minimal defaults
        // so affiliate rendering still works.
        let services = {
          "amazon-dvd": {
            "id": "amazon-dvd",
            "title": "Amazon (DVD)",
            "icon": { "type": "svg", "value": "/images/amazon.svg", "alt": "Amazon logo" }
          },
          "prime-video": {
            "id": "prime-video",
            "title": "Prime Video (Rent/Buy)",
            "icon": { "type": "svg", "value": "/images/prime-video.svg", "alt": "Prime Video logo" }
          }
        };

        // Attempt to fetch an external services.json placed under affiliates/.
        // Use a URL relative to the current page so this works whether the site
        // is hosted at root or under a subpath (GitHub Pages, Cloudflare Pages, etc).
        try {
          const servicesUrl = new URL('affiliates/services.json', window.location.href).href;
          const res = await fetch(servicesUrl, { cache: 'no-cache' });
          if (res.ok) {
            const fetched = await res.json();
            // merge fetched keys over defaults
            services = Object.assign({}, services, fetched);
          }
        } catch (e) {
          // silent fallback to defaults (avoid noisy console errors)
        }

        // If the movie JSON contains explicit affiliate links, prefer those
        const movieAffiliates = (correctMovieObject && correctMovieObject.affiliate_links) ? correctMovieObject.affiliate_links : null;

        // Helper to build link HTML for a given service id and href
        const buildLinkHtml = (id, href) => {
          const svc = services[id] || {};
          const title = svc.title || (id === 'amazon-dvd' ? 'Amazon / DVD' : (id === 'prime-video' ? 'Prime Video — Buy / Rent' : id));

          // Build icon HTML
          let iconHtml = '';
          if (svc.icon) {
            if (svc.icon.type === 'svg' && svc.icon.value) {
              const src = svc.icon.value.replace(/^public\//, '/');
              iconHtml = `<img class="icon" src="${src}" alt="${(svc.icon.alt || title)}" />`;
            } else if (svc.icon.type === 'fa' && svc.icon.value) {
              iconHtml = `<i class="${svc.icon.value} icon" aria-hidden="true"></i>`;
            }
          }
          if (!iconHtml) {
            if (id === 'amazon-dvd') iconHtml = '<i class="fa-brands fa-amazon icon" aria-hidden="true"></i>';
            else iconHtml = '<i class="fa-solid fa-play icon" aria-hidden="true"></i>';
          }

          const aria = `aria-label="${title} (opens in new tab)"`;
          return `<a class="where-link" href="${href}" target="_blank" rel="sponsored noopener noreferrer" ${aria}>${iconHtml}<span>${title}</span></a>`;
        };

        let whereLinksHtml = '';

        if (movieAffiliates && Object.keys(movieAffiliates).length > 0) {
          // Preserve a sensible order if possible, otherwise use keys as-is
          const desiredOrder = ['amazon-dvd', 'prime-video'];
          const keys = Object.keys(movieAffiliates);
          // Order keys: those in desiredOrder first (in that order), then others
          const ordered = [...desiredOrder.filter(k => keys.includes(k)), ...keys.filter(k => !desiredOrder.includes(k))];

          whereLinksHtml = ordered.map(id => {
            const href = movieAffiliates[id] || movieAffiliates[id.toLowerCase()] || movieAffiliates[id.replace('_', '-')] || '';
            if (!href) return '';
            return buildLinkHtml(id, href);
          }).filter(Boolean).join('');
        }

        const inner = aff.querySelector('.affiliate-inner');
        // Only render the affiliate block if we have at least one movie-provided link
        if (whereLinksHtml && whereLinksHtml.trim().length > 0) {
          if (inner) {
            inner.innerHTML = `
              <div class="where-heading">Where to watch</div>
              <div class="where-links">
                ${whereLinksHtml}
              </div>
              <div class="affiliate-disclosure">Some links on this site are affiliate links. Purchases made through these links may support the site at no extra cost to you.</div>
            `;
          }
          aff.classList.add('visible');
          aff.setAttribute('aria-hidden', 'false');
        } else {
          // Ensure the affiliate container is hidden when there are no movie-specific links
          if (inner) inner.innerHTML = '';
          aff.classList.remove('visible');
          aff.setAttribute('aria-hidden', 'true');
        }
      })();
    }
  } catch (e) {
    console.error('Failed to update affiliate container:', e);
  }

  displayCurrentReview(currentReviewIndex);

  // Render native end-game dashboard directly on the page
  renderEndGameDashboard();

  if (wonGame) {
    launchWinConfetti();
  }
}

// Handles the user's guess or skip
function handleGuess(guess) {
  toggleAccordion(true);
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  setTimeout(() => window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'smooth'
  }), 100);

  startOngoingGame(correctMovieID, correctMovieDate);

  if (guess !== null) {
    collectedGuesses.push(guess.movieID);
    updateOngoingGameOnGuess(guess.movieID);
  } else {
    collectedGuesses.push(SKIPPED_GUESS);
    updateOngoingGameOnGuess(SKIPPED_GUESS, true);
  }

  incorrectGuessCount++;
  dismissHowToPlay();

  // Calculate remaining guesses and format previous guesses
  const remainingGuesses = MAX_GUESSES - incorrectGuessCount;
  const guessString = remainingGuesses === 1 ? "1 Guess" : `${remainingGuesses} Guesses`;
  const previousGuessesItems = formatPreviousGuesses(collectedGuesses);

  // Update unified status bar
  updateStatusBar();

  // Update the past guesses accordion
  updatePastGuessesDisplay(previousGuessesItems);

  clearSearchAndMovieList();
  if (incorrectGuessCount < MAX_GUESSES) {
    currentReviewJSONs = allReviewJSONs.slice(0, incorrectGuessCount + 1);
    updateReviewNumButtons();
    displayCurrentReview(incorrectGuessCount + 1);
  } else {
    finishGame(false);
  }
}

// -------------------------------------------------------------
// Toast Notification
// -------------------------------------------------------------
function showToast(message) {
  let toast = document.getElementById('game-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'game-toast';
    toast.className = 'game-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

// -------------------------------------------------------------
// Wordle-Style Emoji Share Generator
// -------------------------------------------------------------
function generateShareText() {
  const isArchive = !!archiveDate;
  let movieNum = '';
  if (window.datesManifestData && Array.isArray(window.datesManifestData.dates)) {
    const idx = window.datesManifestData.dates.indexOf(correctMovieDate);
    if (idx !== -1) movieNum = `#${idx + 1}`;
  }

  const titleHeader = isArchive
    ? `Guess The Movie (Archive - ${formattedMovieDate}) 🎬`
    : `Guess The Movie ${movieNum} 🎬`.trim();

  const scoreHeader = gameWon ? `${collectedGuesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;

  // Build emoji tiles: 🟩 = correct, 🟨 = skipped, 🟥 = incorrect, ⬛ = unused
  const tiles = collectedGuesses.map(g => {
    if (g === correctMovieID) return '🟩';
    if (g === SKIPPED_GUESS) return '🟨';
    return '🟥';
  });

  while (tiles.length < MAX_GUESSES) {
    tiles.push('⬛');
  }

  const emojiGrid = tiles.join('');
  const siteUrl = isArchive ? window.location.href : 'https://guessthemovie.me/';

  return `${titleHeader}\n${scoreHeader}\n\n${emojiGrid}\n\nPlay at: ${siteUrl}`;
}

// Handles sharing with native share or clipboard copy + toast feedback
function pressShare() {
  const fullShareText = generateShareText();

  const onCopied = () => {
    showToast("Copied score to clipboard! 📋");
    const dashShareBtn = document.getElementById('dashboard-share-btn');
    const shareBtn = document.getElementById('share-button');
    [dashShareBtn, shareBtn].forEach(btn => {
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-check icon"></i> Copied!`;
        setTimeout(() => { btn.innerHTML = orig; }, 3000);
      }
    });
  };

  if (navigator.share && /mobile|android|iphone|ipad|ipod/i.test(navigator.userAgent)) {
    navigator.share({ text: fullShareText }).catch(() => {
      fallbackCopyText(fullShareText, onCopied);
    });
  } else if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullShareText).then(onCopied).catch(() => {
      fallbackCopyText(fullShareText, onCopied);
    });
  } else {
    fallbackCopyText(fullShareText, onCopied);
  }
}

function fallbackCopyText(text, callback) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    if (callback) callback();
  } catch (err) {
    console.error('Fallback copy failed', err);
  }
  document.body.removeChild(textArea);
}

// -------------------------------------------------------------
// Win Confetti
// -------------------------------------------------------------
function launchWinConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 85,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      confetti({ particleCount: 45, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 45, angle: 120, spread: 55, origin: { x: 1 } });
    }, 200);
  }
}

function updateHowToPlay() {
  const guide = document.getElementById('how-to-play');
  if (!guide) return;

  const hasPlayedBefore = gameCache.gameHistory.some(game =>
    game.status === 'won' || game.status === 'lost' || (game.guesses || []).length > 0
  );
  const dismissed = localStorage.getItem('howToPlayDismissed') === '1';
  guide.hidden = hasPlayedBefore || dismissed;
}

function dismissHowToPlay() {
  const guide = document.getElementById('how-to-play');
  if (guide) guide.hidden = true;
  try {
    localStorage.setItem('howToPlayDismissed', '1');
  } catch (error) {
    // The game remains playable when browser storage is unavailable.
  }
}

// -------------------------------------------------------------
// Native End-of-Game Screen Dashboard
// -------------------------------------------------------------
let countdownInterval = null;

function renderEndGameDashboard() {
  let dashboard = document.getElementById('end-game-dashboard');
  if (!dashboard) {
    dashboard = document.createElement('div');
    dashboard.id = 'end-game-dashboard';
    dashboard.className = 'end-game-dashboard';
    const textDisplay = document.getElementById('textDisplay');
    if (textDisplay && textDisplay.parentNode) {
      textDisplay.parentNode.insertBefore(dashboard, textDisplay.nextSibling);
    } else {
      const contentWrap = document.getElementById('content-wrap') || document.body;
      contentWrap.prepend(dashboard);
    }
  }

  const title = (correctMovieObject && correctMovieObject.title) || 'Movie';
  const year = (correctMovieObject && correctMovieObject.year) || '';
  const poster = (correctMovieObject && correctMovieObject.posterLink) || '';
  const movieID = correctMovieID || '';

  const outcomeStatusText = gameWon ? 'You got it!' : 'You lost.';
  const outcomeClass = gameWon ? 'won' : 'lost';

  dashboard.innerHTML = `
    <div class="end-game-card ${poster ? 'has-poster' : 'no-poster'}">
      ${poster ? `
        <div class="end-game-poster-col">
          <img src="${poster}" alt="${title} (${year})" class="end-game-poster">
        </div>
      ` : ''}
      <div class="end-game-content-col">
        <div class="end-game-status ${outcomeClass}">${outcomeStatusText}</div>
        <div class="end-game-movie-title">${title} (${year})</div>

        <div class="end-game-actions">
          <button id="dashboard-share-btn" class="end-game-btn share-btn" onclick="pressShare()">
            <i class="fa-solid fa-share-nodes icon"></i> Share
          </button>
          <button class="end-game-btn past-btn" onclick="playRandomUnplayedGame()">
            <i class="fa-solid fa-shuffle icon"></i> Play Past Movie
          </button>
          <a href="https://letterboxd.com/film/${movieID}/" target="_blank" rel="noopener noreferrer" class="end-game-btn lb-btn">
            <img src="/images/LBColorLogo.png" class="btn-icon" alt="Letterboxd logo"> View on Letterboxd
          </a>
        </div>

        <div class="end-game-countdown-line">
          ⏱ New movie in <strong id="next-movie-countdown" class="countdown-val">--:--:--</strong>
        </div>
      </div>
    </div>
  `;

  dashboard.style.display = 'block';

  // Hide old result text to avoid duplicate message
  const textDisplay = document.getElementById('textDisplay');
  if (textDisplay) textDisplay.style.display = 'none';

  updateStatusBar();
  startCountdownTimer();
}

function updateStatusBar() {
  const statusBar = document.getElementById('game-status-bar');
  if (!statusBar) return;

  const leftEl = statusBar.querySelector('.status-left');
  const dateEl = document.getElementById('status-movie-date');
  const pillEl = document.getElementById('status-progress-pill');
  const progressEl = document.getElementById('status-guesses-text');

  let movieNum = '';
  if (window.datesManifestData && Array.isArray(window.datesManifestData.dates)) {
    const idx = window.datesManifestData.dates.indexOf(correctMovieDate);
    if (idx !== -1) movieNum = `#${idx + 1}`;
  }

  const movieText = movieNum ? `Movie ${movieNum}` : 'Movie';
  const dateText = archiveDate ? `Archive • ${formattedMovieDate}` : formattedMovieDate;

  if (gameOver && !gameWon) {
    // When you lose: archive and date go first, left aligned with movie number after it right above the poster
    statusBar.classList.add('lost');
    if (leftEl) {
      leftEl.innerHTML = `<span class="status-date">${dateText}</span><span class="status-sep">•</span><span class="status-movie"><i class="fa-solid fa-film icon"></i> <strong>${movieText}</strong></span>`;
    }
    if (dateEl) {
      dateEl.textContent = '';
    }
    if (pillEl) {
      if (progressEl) {
        progressEl.textContent = '';
        progressEl.hidden = true;
      }
    }
  } else {
    statusBar.classList.remove('lost');
    if (leftEl) {
      leftEl.innerHTML = `<i class="fa-solid fa-film icon"></i> <strong id="status-movie-num">${movieText}</strong>`;
    }
    if (dateEl && formattedMovieDate) {
      dateEl.textContent = dateText;
    }
    if (pillEl) {
      if (progressEl) progressEl.hidden = false;
      if (gameOver && gameWon) {
        const reviewCount = collectedGuesses.length;
        const reviewText = reviewCount === 1 ? 'Won in 1 guess' : `Won in ${reviewCount} guesses`;
        if (progressEl) progressEl.innerHTML = `<i class="fa-solid fa-check icon"></i> ${reviewText}`;
        if (progressEl) progressEl.classList.add('won');
      } else {
        const remainingGuesses = MAX_GUESSES - incorrectGuessCount;
        const guessString = remainingGuesses === 1 ? "1 Guess Left" : `${remainingGuesses} Guesses Left`;
        if (progressEl) {
          progressEl.textContent = guessString;
          progressEl.classList.remove('won');
        }
      }
    }
  }
}

function startCountdownTimer() {
  if (countdownInterval) clearInterval(countdownInterval);

  function update() {
    const timerElem = document.getElementById('next-movie-countdown');
    const previewElems = document.querySelectorAll('.countdown-preview');
    if (!timerElem && previewElems.length === 0) return;
    const now = new Date();
    // Read the Eastern wall clock directly. Parsing a localized date string
    // as local time shifts the countdown for visitors outside that timezone.
    const eastern = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(now);
    const parts = Object.fromEntries(eastern.map(part => [part.type, part.value]));
    const elapsedToday = Number(parts.hour) * 3600000 + Number(parts.minute) * 60000 + Number(parts.second) * 1000;
    const diff = Math.max(0, 86400000 - elapsedToday);
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    const timeStr = `${h}:${m}:${s}`;
    if (timerElem) timerElem.textContent = timeStr;
    previewElems.forEach(el => { el.textContent = timeStr; });
  }

  update();
  countdownInterval = setInterval(update, 1000);
}

// -------------------------------------------------------------
// Play Random Unplayed Archive Movie
// -------------------------------------------------------------
async function playRandomUnplayedGame() {
  try {
    let dates = [];
    if (window.datesManifestData && Array.isArray(window.datesManifestData.dates)) {
      dates = window.datesManifestData.dates;
    } else {
      const resp = await fetch('/dates.json');
      if (resp.ok) {
        const json = await resp.json();
        window.datesManifestData = json;
        dates = json.dates || [];
      }
    }
    if (!dates.length) return;

    const history = JSON.parse(localStorage.getItem('gameHistory')) || [];
    const completed = new Set(
      history.filter(g => g.status === 'won' || g.status === 'lost').map(g => g.date)
    );

    const unplayed = dates.filter(d => !completed.has(d));
    let targetDate = '';
    if (unplayed.length > 0) {
      targetDate = unplayed[Math.floor(Math.random() * unplayed.length)];
    } else {
      showToast("You've completed every archive game! Replaying a random favorite 🎬");
      targetDate = dates[Math.floor(Math.random() * dates.length)];
    }

    if (targetDate) {
      window.location.href = '/archive/' + targetDate;
    }
  } catch (e) {
    console.error('Failed to pick random unplayed movie:', e);
  }
}


// Clear the search input and movie list
function clearSearchAndMovieList() {
  const searchInput = domElements.get('searchInput');
  const movieList = domElements.get('movieList');

  if (searchInput) searchInput.value = '';
  if (movieList) movieList.innerHTML = '';
}

// Clear only the movie list
function clearMovieList() {
  const movieList = domElements.get('movieList');
  if (movieList) movieList.innerHTML = '';
}

// Fetch all movie data for a given date (now fetches single consolidated JSON file)
async function fetchMovieData(date) {
  try {
    const response = await fetch(`/movies/${date}.json`);
    if (!response.ok) {
      console.error(`Movie data not found for ${date}`);
      return null;
    }
    const data = await response.json();
    
    // Populate allReviewJSONs with all reviews
    allReviewJSONs = data.reviews || [];
    
    // Set the first review as current
    if (allReviewJSONs.length > 0) {
      currentReviewJSONs = [allReviewJSONs[0]];
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching movie data:', error);
    return null;
  }
}

// Legacy function for compatibility - now just returns review from allReviewJSONs
async function fetchData(movieID, date, index) {
  // This function is kept for compatibility but data is now loaded via fetchMovieData
  // Reviews are already in allReviewJSONs array
  return;
}

// Display the current review based on the review index
function displayCurrentReview(index = 1) {

  const review = currentReviewJSONs[index - 1];
  const reviewCard = document.getElementById('reviewCard');
  if (!review || currentReviewJSONs.length === 0) {
    reviewCard.style.display = 'none';
    return;
  }
  reviewCard.style.display = 'block';

  // Profile photo
  const profileImg = document.getElementById('reviewProfilePhoto');
  profileImg.src = review.profilePhotoLink;
  profileImg.alt = `${review.username}'s profile photo`;

  // Username
  document.getElementById('reviewUsername').textContent = review.username;

  // Date
  document.getElementById('reviewDate').textContent = review.date;

  // Rating
  const ratingContainer = document.getElementById('reviewRating');
  ratingContainer.innerHTML = '';
  if (review.rating !== '') {
    const ratingDecimal = parseFloat(review.rating);
    for (let i = 0; i < 5; i++) {
      let star = document.createElement('i');
      if (i < Math.floor(ratingDecimal)) {
        star.classList.add('fa-solid', 'fa-star', 'star', 'icon');
      } else if (i < ratingDecimal) {
        star.classList.add('fa-solid', 'fa-star-half-stroke', 'star', 'icon');
      } else {
        star.classList.add('fa-regular', 'fa-star', 'star', 'icon');
      }
      ratingContainer.appendChild(star);
    }
  }

  // Liked
  const likedIcon = document.getElementById('reviewLiked');
  likedIcon.style.display = review.liked ? 'inline-block' : 'none';

  // Review text
  if (review.collapsed) {
    document.getElementById('reviewText').innerHTML = review.text + '<p class="truncated-label">Review Truncated</p>';
  }
  else {
    document.getElementById('reviewText').innerHTML = review.text;
  }

  // Number of likes and comments
  document.getElementById('likesCount').textContent = Number(review.numLikes).toLocaleString();
  document.getElementById('commentsCount').textContent = Number(review.num_comments).toLocaleString();

  // Link: Only show if game is over
  const reviewLink = document.getElementById('reviewLink');
  if (gameOver) {
    reviewLink.href = review.link;
    reviewLink.style.display = 'inline-block';
  } else {
    reviewLink.style.display = 'none';
  }
}

// Make review number button active 
function makeButtonActive(index) {
  if (!reviewNumButtons) return;

  const buttons = reviewNumButtons.querySelectorAll('button');
  buttons.forEach(button => {
    if (parseInt(button.textContent) === index) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
      button.blur()
    }
  });
}

// Update the review number buttons based on the current review JSONs
function updateReviewNumButtons() {
  if (!reviewNumButtons) return;

  reviewNumButtons.innerHTML = '';
  currentReviewJSONs.forEach((review, index) => {
    const button = document.createElement('button');
    button.textContent = index + 1;
    button.onclick = () => {
      let numReview = parseInt(button.textContent, 10)
      displayCurrentReview(numReview);
      makeButtonActive(numReview);
      currentReviewIndex = parseInt(numReview);
    };
    reviewNumButtons.appendChild(button);
  });

  // When game is over, ensure currentReviewIndex is valid for available reviews
  if (gameOver) {
    const validIndex = Math.min(currentReviewIndex, currentReviewJSONs.length);
    makeButtonActive(validIndex);
    currentReviewIndex = validIndex;
  } else {
    makeButtonActive(incorrectGuessCount + 1);
    currentReviewIndex = incorrectGuessCount + 1;
  }
}

// Updates the selected movie for styling
function updateSelectedItem() {
  const items = document.querySelectorAll('.movie-list li');
  items.forEach((item, index) => {
    if (index === currentMovieListIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

// Adds mouse listeners to the movie list items so hover and click events select the movie
function addMouseListeners() {
  const items = document.querySelectorAll('.movie-list li');
  items.forEach((item, index) => {
    item.addEventListener('mousemove', () => {
      currentMovieListIndex = index;
      updateSelectedItem();
    });
    item.addEventListener('click', () => {
      currentMovieListIndex = index;
      updateSelectedItem();
    });
  });
}

// Keydown listener for keyboard navigation (up/down for movie selection, enter for movie submission, left/right for review navigation)
window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown') {
    const items = document.querySelectorAll('.movie-list li');
    if (items.length === 0) return;
    const activeElement = document.activeElement;

    event.preventDefault();
    // If the search textbox is focused, select the first movie
    if (activeElement && activeElement.id === 'search' && currentMovieListIndex === -1) {
      currentMovieListIndex = 0;
    } else {
      // Otherwise, move to the next item (with wrapping)
      if (currentMovieListIndex < items.length - 1) {
        currentMovieListIndex++;
      } else {
        currentMovieListIndex = 0;
      }
    }
    updateSelectedItem();
  }

  else if (event.key === 'ArrowUp') {
    const items = document.querySelectorAll('.movie-list li');
    if (items.length === 0) return;

    event.preventDefault();
    // Move to previous item (with wrapping)
    if (currentMovieListIndex > 0) {
      currentMovieListIndex--;
    } else if (currentMovieListIndex === 0) {
      currentMovieListIndex = items.length - 1;
    }
    updateSelectedItem();
  }
  else if (event.key === 'Enter') {
    const items = document.querySelectorAll('.movie-list li');
    const activeElement = document.activeElement;

    // If an item in the movie list is currently selected via arrow keys, select it into search bar
    if (items.length > 0 && currentMovieListIndex >= 0 && currentMovieListIndex < items.length) {
      event.preventDefault();
      items[currentMovieListIndex].click();
      return;
    }

    // If Enter is pressed while search input is focused and no list item is selected, submit
    if (activeElement && activeElement.id === 'search') {
      handleSubmit();
      return;
    }
  }
  else if (event.key === 'ArrowRight') {
    if (currentReviewIndex < currentReviewJSONs.length) {
      displayCurrentReview(currentReviewIndex + 1);
      makeButtonActive(currentReviewIndex + 1);
      currentReviewIndex = currentReviewIndex + 1;
    }
  }
  else if (event.key === 'ArrowLeft') {
    if (currentReviewIndex > 1) {
      displayCurrentReview(currentReviewIndex - 1);
      makeButtonActive(currentReviewIndex - 1);
      currentReviewIndex = currentReviewIndex - 1;
    }
  }
});

// Display the updated movie list 
function displayMovieList(movies) {
  const movieListElement = domElements.get('movieList');
  if (!movieListElement) return;

  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();

  movies.slice(0, MAX_NUM_MOVIES_TO_SHOW).forEach(movie => {
    const listItem = document.createElement('li');
    listItem.textContent = `${movie.title} (${movie.year})`;
    listItem.onclick = () => loadMovieIntoSearchBar(movie.movieID);
    fragment.appendChild(listItem);
  });

  movieListElement.innerHTML = '';
  movieListElement.appendChild(fragment);

  // Reset the selection index on list update and add mouse listeners
  currentMovieListIndex = -1;
  addMouseListeners();
}


function filterMovies(event) {
  const searchInput = domElements.get('searchInput');
  if (!searchInput) return;

  const searchQuery = searchInput.value.trim();

  if (searchQuery === "") {
    clearSearchAndMovieList();
    return;
  }

  const filteredMovies = searchMovies(searchQuery);
  displayMovieList(filteredMovies);
}

document.addEventListener('DOMContentLoaded', async function initializeGame() {
  try {
    // Initialize DOM elements cache
    domElements.init();

    // Set legacy constants after DOM is ready
    reviewNumButtons = domElements.reviewNumButtons;
    shareButton = domElements.shareButton;
    dateDisplay = domElements.dateDisplay;
    resultDisplay = domElements.resultDisplay;
    const csvResponse = await fetch('/movies.csv');
    const csvText = await csvResponse.text();

    Papa.parse(csvText, {
      header: true,
      complete: results => {
        allMovies = results.data
          .map(row => {
            let selectedRow = {};
            SELECTED_COLUMNS.forEach(col => {
              selectedRow[col] = row[col];
            });
            return selectedRow;
          })
          .filter(row =>
            Object.values(row).every(value => value !== undefined && value !== null && value !== "")
          );
      }
    });
    initializeFuse();

    // Fetch dates manifest to get latest date
    const datesResponse = await fetch('/dates.json');
    if (!datesResponse.ok) throw new Error('Could not load dates manifest');
    const datesData = await datesResponse.json();
    window.datesManifestData = datesData;
    
    // Determine which date to use
    const targetDate = archiveDate || datesData.latestDate;
    
    // Fetch movie data for the target date
    const movieData = await fetchMovieData(targetDate);
    if (!movieData) throw new Error(`No movie data found for ${targetDate}`);

    correctMovieID = movieData.movieID;
    // The manifest/archive URL is keyed by the canonical archive filename.
    // Prefer that date so an inconsistent JSON `date` cannot misfile game history.
    correctMovieDate = targetDate;
    formattedMovieDate = new Date(correctMovieDate).toLocaleDateString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Try to get correctMovieObject from localStorage game history if available
    const gameObj = gameCache.gameHistory.find(g => g.id === correctMovieID);
    if (gameObj && gameObj.title && gameObj.year && gameObj.posterLink) {
      correctMovieObject = {
        title: gameObj.title,
        year: gameObj.year,
        posterLink: gameObj.posterLink,
        movieID: correctMovieID
      };
    } else {
      correctMovieObject = allMovies.find(movie => movie.movieID === correctMovieID);
    }

    // If movie JSON contains affiliate links, attach them to correctMovieObject so finishGame can use them
    if (movieData && movieData.affiliate_links && Object.keys(movieData.affiliate_links).length > 0) {
      if (!correctMovieObject) correctMovieObject = {};
      correctMovieObject.affiliate_links = movieData.affiliate_links;
    }

    // Reviews are already loaded via fetchMovieData, no need to fetch individually
    // The old fetchData loop is no longer needed

    let game_in_progress = loadOngoingGame(correctMovieID, correctMovieDate);

    // Game was lost or won (completed)
    if (hasGameBeenPlayed(correctMovieID)) {
      // Load the completed game data to populate collectedGuesses and incorrectGuessCount
      const completedGame = gameCache.gameHistory.find(g =>
        g.id === correctMovieID && (g.status === 'won' || g.status === 'lost')
      );
      if (completedGame && completedGame.guesses) {
        collectedGuesses = [...completedGame.guesses];
        incorrectGuessCount = completedGame.guesses.length;
      }
      window.suppressAutoModal = true;
      finishGame(hasGameBeenWon(correctMovieID));
      window.suppressAutoModal = false;
    }
    // Game was attempted but not completed
    else if (game_in_progress) {
      incorrectGuessCount = ongoingGame.guesses.length;
      collectedGuesses = [...ongoingGame.guesses];

      // Calculate remaining guesses
      const remainingGuesses = MAX_GUESSES - incorrectGuessCount;
      const guessString = remainingGuesses === 1 ? "1 Guess" : `${remainingGuesses} Guesses`;

      // Format previous guesses
      const previousGuessesItems = formatPreviousGuesses(collectedGuesses);

      // Update the past guesses accordion
      updatePastGuessesDisplay(previousGuessesItems);

      currentReviewJSONs = allReviewJSONs.slice(0, incorrectGuessCount + 1);
      updateReviewNumButtons();
      // Show the last review the user unlocked, not always the first
      if (incorrectGuessCount > 0) {
        displayCurrentReview(incorrectGuessCount + 1);
      } else {
        displayCurrentReview();
      }

      if (shareButton) {
        shareButton.style.display = 'none';
      }
      const existingSummaryBtn = document.getElementById('open-summary-button');
      if (existingSummaryBtn) existingSummaryBtn.remove();
      const existingPastGameBtn = document.getElementById('play-past-game-button');
      if (existingPastGameBtn) existingPastGameBtn.remove();
      const endDashboard = document.getElementById('end-game-dashboard');
      if (endDashboard) endDashboard.style.display = 'none';
      const textDisplayEl = document.getElementById('textDisplay');
      if (textDisplayEl) textDisplayEl.style.display = 'none';
    }
    // New game
    else {
      updateReviewNumButtons();
      displayCurrentReview();

      // Hide share button for new games
      if (shareButton) {
        shareButton.style.display = 'none';
      }
      const existingSummaryBtn = document.getElementById('open-summary-button');
      if (existingSummaryBtn) existingSummaryBtn.remove();
      const existingPastGameBtn = document.getElementById('play-past-game-button');
      if (existingPastGameBtn) existingPastGameBtn.remove();
      const endDashboard = document.getElementById('end-game-dashboard');
      if (endDashboard) endDashboard.style.display = 'none';
      const textDisplayEl = document.getElementById('textDisplay');
      if (textDisplayEl) textDisplayEl.style.display = 'none';
    }

    // Update unified status bar
    updateStatusBar();
    updateHowToPlay();

    const dismissGuideButton = document.getElementById('dismiss-how-to-play');
    if (dismissGuideButton) dismissGuideButton.addEventListener('click', dismissHowToPlay);
  }
  catch (error) {
    console.error('Error during initialization:', error);
  }
});

// Past Guesses Accordion Functions
function toggleAccordion(forceState) {
  const container = document.querySelector('.accordion-container');
  const content = document.querySelector('.accordion-content');
  const expandText = document.querySelector('.expand-minimize-text');

  if (!container || !content) return;

  if (typeof forceState === 'boolean') {
    if (forceState) {
      container.classList.add('open');
      if (expandText) expandText.textContent = 'Click to minimize';
    } else {
      container.classList.remove('open');
      if (expandText) expandText.textContent = 'Click to expand';
    }
  } else {
    container.classList.toggle('open');
    if (expandText) {
      if (container.classList.contains('open')) {
        expandText.textContent = 'Click to minimize';
      } else {
        expandText.textContent = 'Click to expand';
      }
    }
  }
}

function updatePastGuessesDisplay(guesses) {
  const container = document.getElementById('past-guesses-display');
  const guessCountBadge = document.querySelector('.guess-count-badge');
  const content = document.querySelector('.accordion-content');

  if (!container || !guessCountBadge || !content) {
    return;
  }

  // Show/hide the container based on whether there are guesses
  if (!guesses || guesses.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';    // Update the header title and badge count
  guessCountBadge.textContent = guesses.length;

  // Add winning class if game was won
  if (gameWon) {
    container.classList.add('won');
    container.classList.remove('lost');
  } else {
    container.classList.remove('won');
    container.classList.add('lost');
  }

  // Populate the accordion content
  populateAccordionContent(guesses);
}

function populateAccordionContent(guesses) {
  const content = document.querySelector('.accordion-content');
  if (!content) return;

  content.innerHTML = '';

  // Create a horizontal container for the guesses
  const horizontalContainer = document.createElement('div');
  horizontalContainer.className = 'guess-horizontal-container';
  // Set a CSS variable for the number of guesses (for spacing)
  horizontalContainer.style.setProperty('--guess-count', guesses.length);

  guesses.forEach((guess, index) => {
    const item = document.createElement('div');
    item.className = 'guess-item-horizontal';

    const isSkipped = guess.text === 'Skipped';
    const titleClass = isSkipped ? 'guess-title skipped' : 'guess-title';
    const numberClass = guess.isCorrect ? 'guess-number correct' : 'guess-number';

    // Try to get posterLink from allMovies or game history
    let posterLink = '';
    let movieID = '';
    let title = '';
    let year = '';
    if (!isSkipped) {
      // Extract movieID from guess.text if possible
      const match = guess.text.match(/\((\d{4})\)$/);
      if (match) {
        // Try to find the movie in allMovies
        const found = allMovies.find(m => `${m.title} (${m.year})` === guess.text);
        if (found) {
          posterLink = found.posterLink;
          movieID = found.movieID;
          title = found.title;
          year = found.year;
        } else {
          // Try to find in game history
          const foundHistory = (gameCache && gameCache.gameHistory) ? gameCache.gameHistory.find(g => `${g.title} (${g.year})` === guess.text) : null;
          if (foundHistory) {
            posterLink = foundHistory.posterLink;
            movieID = foundHistory.movieID;
            title = foundHistory.title;
            year = foundHistory.year;
          }
        }
      }
    }

    item.innerHTML = `
      <div class="${numberClass}">${index + 1}</div>
      <div class="guess-poster-container">
        ${posterLink ? `<img class="guess-poster" src="${posterLink}" alt="${title} (${year}) poster">` : `<div class="guess-poster-placeholder">?</div>`}
      </div>
      <div class="guess-content-horizontal">
        <div class="${titleClass}">${guess.text}</div>
      </div>
    `;

    horizontalContainer.appendChild(item);
  });

  content.appendChild(horizontalContainer);
}
