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

// Determine what type of page it is: today's movie, archive calendar, archive movie
const pathSegments = window.location.pathname.split('/').filter(Boolean);
let isArchivePage = (pathSegments[0] === 'archive' && pathSegments.length === 1);
let archiveDate = (pathSegments[0] === 'archive' && pathSegments.length > 1)
  ? pathSegments[1]
  : null;

// Update the title if archive movie
if (archiveDate) {
  document.title = "Guess The Movie | Archive";
}

// Global constants for the game
const SKIPPED_GUESS = '__SKIPPED__'; // Sentinel value to indicate a skipped guess
const MAX_NUM_MOVIES_TO_SHOW = 10;
const SELECTED_COLUMNS = ['title', 'year', 'movieID', 'posterLink']; // Columns to select from the CSV file
const MAX_GUESSES = 5;

// Frequently used DOM elements
const reviewNumButtons = document.getElementById('imageButtons');
const multiButton = document.querySelector('button[id="multi-button"]');
const dateDisplay = document.getElementById('dateDisplayMessage');
const textDisplay = document.getElementById('textDisplay');

// Fetch user's movie data from local storage
var globalGameStats = JSON.parse(localStorage.getItem('gameStats')) || {
  games: [],
  totalPlayed: 0,
  totalWon: 0
};

// Checks whether the user has played the current game
function hasGameBeenPlayed(correctMovieID, stats) {
  if (!stats) return false;
  return stats.games.some(game => game.correctMovieID === correctMovieID);
}

// Checks if user won the current game
function hasGameBeenWon(correctMovieID, stats) {
  if (!stats) return false;
  return stats.games.some(game => game.correctMovieID === correctMovieID && game.won === true);
}

// Utility function to determine if an element is visible.
function isElementVisible(el) {
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden';
}
// Count how many header buttons are visible
function countVisibleHeaderItems() {
  const headerButtons = document.querySelectorAll('#header .header-content button');
  let visibleCount = 0;
  headerButtons.forEach(btn => {
    if (isElementVisible(btn)) {
      visibleCount++;
    }
  });
  return visibleCount;
}
// Removes logo from header when screen width is less than certain amount and all five header items are visible
function toggleLogoBasedOnHeaderItems() {
  const logo = document.querySelector('#header .logo');
  if (!logo) return;

  // Check if width is less than 285px
  if (window.innerWidth < 285) {
    const visibleButtons = countVisibleHeaderItems();
    if (visibleButtons === 5) {
      // Hide the logo if all 5 header items are visible.
      logo.style.display = 'none';
    } else {
      // Otherwise, ensure the logo is visible.
      logo.style.display = '';
    }
  } else {
    // If the window is wider than 285px, show the logo by default.
    logo.style.display = '';
  }
}
// Run the function on initial load and on window resize.
window.addEventListener('DOMContentLoaded', toggleLogoBasedOnHeaderItems);
window.addEventListener('resize', toggleLogoBasedOnHeaderItems);

// Generates ordinal siffux for a given day
function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Formats the date to a more readable string format
function formatDate(isoDate) {
  const localDateString = isoDate.replace(/-/g, '/');
  const date = new Date(localDateString);
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
}

// Generates HTML for history given a game record
function generateGameHTML(game) {
  const formattedDate = formatDate(game.date);
  // Bold and color the result text: green if won, red if lost
  const resultText = game.won
    ? '<strong style="color: green;">won</strong>'
    : '<strong style="color: red;">lost</strong>';

  // Counts non-skip guesses
  let realGuessCount = 0;
  let plural = `review`;
  if (game.guessCount > 1) {
    plural += `s`;
  }
  let guessText = ``;

  for (let i = 0; i < game.guesses.length; i++) {
    if (i === game.guesses.length - 1 && game.guesses.length > 1) {
      guessText += `and `;
    }
    if (game.guesses[i] === SKIPPED_GUESS) {
      guessText += `skipped, `;
    }
    else {
      const foundMovie = allMovies.find(movie => movie.movieID === game.guesses[i]);
      realGuessCount++;
      if (game.guesses[i] === game.correctMovieID) {
        guessText += `correctly`;
      }
      else {
        guessText += `incorrectly`;
      }
      // Underline movie title and link to page
      guessText += ` guessed <a href="https://letterboxd.com/film/${foundMovie.movieID}/" target="_blank" class="history-link"><u>${foundMovie.title} (${foundMovie.year})</u></a>, `;
    }
  }

  // Remove the trailing comma and space if there's one
  if (guessText.endsWith(', ')) {
    guessText = guessText.slice(0, -2);
  }
  const historyCorrectMovie = allMovies.find(movie => movie.movieID === game.correctMovieID);
  let returnString = ``;
  returnString += `      <h3 class="historyFirstLine"><strong>${formattedDate}: <a href="https://letterboxd.com/film/${historyCorrectMovie.movieID}/" target="_blank" class="history-link"><u>${game.title} (${game.year})</u></a></strong></h3> `;
  if (realGuessCount <= 0) {
    // User made no guesses
    returnString += `
      <p class="historySecondLine">You ${resultText} and did not guess any movies</p>
    `;
  }
  else {
    returnString += `
      <p class="historySecondLine">You ${resultText} with ${game.guessCount} ${plural}: ${guessText}.</p>
    `;
  }
  return returnString;
}

// Sets the active modal buttons
function setActiveButton(buttonID) {
  const button = document.getElementById(buttonID);
  button.classList.add("active-button");
  if (buttonID == "displayStatsButton") {
    document.getElementById('displayStatsButton').classList.add("active-stats");
  }
  else if (buttonID == "displayHistoryButton") {
    document.getElementById('displayHistoryButton').classList.add("active-history");
  }
  else if (buttonID == "instructionsButton") {
    document.getElementById('instructionsButton').classList.add("active-instructions");
  }
  else if (buttonID == "archiveButton") {
    document.getElementById('archiveButton').classList.add("active-archive");
  }

}

// Deactivates the active modal button
function deactivateButton(buttonID) {
  const button = document.getElementById(buttonID);
  button.classList.remove("active-button");
  if (buttonID == "displayStatsButton") {
    document.getElementById('displayStatsButton').classList.remove("active-stats");
  }
  else if (buttonID == "displayHistoryButton") {
    document.getElementById('displayHistoryButton').classList.remove("active-history");
  }
  else if (buttonID == "instructionsButton") {
    document.getElementById('instructionsButton').classList.remove("active-instructions");
  }
  else if (buttonID == "archiveButton") {
    document.getElementById('archiveButton').classList.remove("active-archive");
  }
}

// Displays the instruction modal
function displayInstructions() {
  const modalContentDiv = document.getElementById('modalContent');

  modalContentDiv.innerHTML = `
    <h2>How to Play</h2>
    <p>You have ${MAX_GUESSES} tries to guess the movie. Each guess (or skip) will reveal an additional review to help you.</p>
    <p>To guess, click the search bar and begin typing. You can use the up/down buttons or cursor to select movies and the enter button or to submit one. You can also use the left/right buttons to toggle between available reviews.</p>
    <p>Every day features a new movie (added at 12AM EST), but you can use the archive to play previous days. On each day, a gray background means it doesn't have a movie, white background means it does have a movie and you can play it, and green background means you've played it already</p>
    <p>To save your stats and history and access them at any time, please play using the same browser and device and avoid using incognito or private browsing modes.</p>
    <p>Good luck and have fun!</p>
  `;

  setActiveButton("instructionsButton");
  const modal = document.getElementById('Modal');
  modal.style.display = "block";

  // If x button is clicked or outside of modal is clicked, close modal
  document.getElementById('closeModal').onclick = function () {
    modal.style.display = "none";
    deactivateButton("instructionsButton");
  };
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
      deactivateButton("instructionsButton");
    }
  };
}

// Displays the policies modal
function displayPolicies() {
  const modalContentDiv = document.getElementById('modalContent');

  modalContentDiv.innerHTML = `

    <!-- Navigation Tabs -->
    <div class="tab-nav">
      <a href="#" id="termsTab" class="active">Terms of Service</a>
      <a href="#" id="privacyTab">Privacy Policy</a>
      <a href="#" id="cookieTab">Cookie Policy</a>
    </div>

    <!-- Content Sections -->
    <div id="termsContent" class="policy-content">
      <h1>Terms of Service</h1>
      <p>Last updated: April 09, 2025</p>
      <p>By accessing or using the "Guess The Movie" game (the Game), you agree to comply with and be bound by these Terms of Service. If you do not agree with these terms, please do not use the Game.</p>
      <p>This Game is intended for personal, non-commercial use. You are responsible for maintaining the confidentiality of your session, and for all activities that occur on your session.</p>
      <p>We reserve the right to modify or discontinue the Game at any time. We may also modify these Terms of Service at any time, with or without notice. Your continued use of the Game after any such changes constitutes your acceptance of the new Terms of Service.</p>
      <p>Any dispute arising out of or in connection with the Game shall be governed by the laws of the jurisdiction in which we operate, and you agree to submit to the exclusive jurisdiction of the courts in that jurisdiction.</p>
    </div>
    
    <div id="privacyContent" class="policy-content" style="display: none;">
      <h1>Privacy Policy</h1>
      <p>Last updated: April 09, 2025</p>
      <p>This Privacy Policy outlines how we collect, use, and protect your personal data when you use the "Guess The Movie" game (the Game). By using the Game, you consent to the collection and use of information in accordance with this policy.</p>
      <p>We collect personal information when you register for the Game or voluntarily provide it. This may include your name, email address, and gameplay data. We use this information to personalize your experience and to improve the Game.</p>
      <p>We do not share your personal information with third parties, except as required by law or to facilitate our business operations (such as processing payments or providing customer support).</p>
      <p>We take appropriate security measures to protect your personal data, but no method of transmission over the internet is completely secure. We cannot guarantee the security of your information transmitted to the Game.</p>
      <p>You have the right to access, update, or delete your personal information. If you wish to exercise any of these rights, please contact us through the provided contact details.</p>
    </div>
    
    <div id="cookieContent" class="policy-content" style="display: none;">
      <h1>Cookie Policy</h1>
      <p>Last updated: April 09, 2025</p>
      <p>This Cookie Policy explains how the "Guess The Movie" game (the Game) uses cookies and similar technologies to collect information when you interact with the Game. By using the Game, you consent to our use of cookies in accordance with this policy.</p>
      <p>Cookies are small files that are placed on your device when you access the Game. We use cookies to enhance your user experience by remembering your preferences, tracking your activity, and analyzing usage trends.</p>
      <p>We use two types of cookies: session cookies, which expire when you close your browser, and persistent cookies, which remain on your device for a specified period. These cookies help us understand how you interact with the Game and allow us to improve its functionality.</p>
      <p>You can control cookie settings in your browser to accept or reject cookies. Please note that rejecting cookies may affect the functionality of the Game, and you may not be able to use certain features.</p>
      <p>We may also use third-party services, such as analytics tools, which may place cookies on your device. These third-party cookies are subject to the privacy policies of the respective providers.</p>
    </div>
  `;

  // Tab navigation logic
  const termsTab = document.getElementById('termsTab');
  const privacyTab = document.getElementById('privacyTab');
  const cookieTab = document.getElementById('cookieTab');
  const termsContent = document.getElementById('termsContent');
  const privacyContent = document.getElementById('privacyContent');
  const cookieContent = document.getElementById('cookieContent');

  // Switch tabs
  function switchTab(activeTab, contentToShow) {
    // Remove active class from all tabs and hide all content sections
    document.querySelectorAll('.tab-nav a').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.policy-content').forEach(content => content.style.display = 'none');

    // Add active class to the clicked tab and show corresponding content
    activeTab.classList.add('active');
    contentToShow.style.display = 'block';
  }

  termsTab.addEventListener('click', () => switchTab(termsTab, termsContent));
  privacyTab.addEventListener('click', () => switchTab(privacyTab, privacyContent));
  cookieTab.addEventListener('click', () => switchTab(cookieTab, cookieContent));

  // Display the modal
  const modal = document.getElementById('Modal');
  modal.style.display = "block";

  // If x button is clicked or outside of modal is clicked, close modal
  document.getElementById('closeModal').onclick = function () {
    modal.style.display = "none";
  };
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

  // Set default tab and content to Terms of Service
  switchTab(termsTab, termsContent);
}

// Displays the contact info modal
function displayContactInfo() {
  const modalContentDiv = document.getElementById('modalContent');
  modalContentDiv.innerHTML = `<iframe src="https://docs.google.com/forms/d/e/1FAIpQLSf1QkFlmLqevhyPgnqCRA-nj3yLsb0lQxgA_BGFtxbZySnNVA/viewform?embedded=true" width="640" height="915" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>`;
  const modal = document.getElementById('Modal');
  modal.style.display = "block";

    // If x button is clicked or outside of modal is clicked, close modal
  document.getElementById('closeModal').onclick = function () {
    modal.style.display = "none";
  };
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
}

// Displays the game history modal
function displayHistory() {
  const modalContentDiv = document.getElementById('modalContent');
  modalContentDiv.innerHTML = `<h2>Your Game History</h2>`;

  if (globalGameStats.games.length === 0) {
    modalContentDiv.innerHTML += `<p>You have not played any games yet!</p>`;
  } else {
    // Create a shallow copy and sort in ascending order by date (oldest first)
    const sortedGames = globalGameStats.games.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    for (const game of sortedGames) {
      modalContentDiv.innerHTML += generateGameHTML(game);
    }
  }
  setActiveButton("displayHistoryButton");

  // Display the modal
  const modal = document.getElementById('Modal');
  modal.style.display = "block";

  // If x button is clicked or outside of modal is clicked, close modal
  document.getElementById('closeModal').onclick = function () {
    modal.style.display = "none";
    deactivateButton("displayHistoryButton");
  };
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
      deactivateButton("displayHistoryButton");
    }
  };
}

// Displays the stats modal
function displayStats() {
  const modalContentDiv = document.getElementById('modalContent');
  modalContentDiv.innerHTML = `<h2>Your Stats</h2>`;
  setActiveButton("displayStatsButton");
  if (globalGameStats.games.length === 0) {
    modalContentDiv.innerHTML += `<p>You have not played any games yet!</p>`;
  }
  else {
    const winPct = calculateWinPercentage(globalGameStats);
    const avgGuesses = calculateAverageGuessCount(globalGameStats);
    const currentStreak = calculateCurrentStreak(globalGameStats);
    const mostGuessed = getMostGuessedMovie(globalGameStats);
    const fewestGuessesInWin = fewestGuessesInSingleWin(globalGameStats);
    const longestWinStreak = longestWinningStreak(globalGameStats);
    const totalMoviesGuessed = totalUniqueMoviesGuessed(globalGameStats);

    modalContentDiv.innerHTML += `<p>You've played ${globalGameStats.totalPlayed} games and won ${globalGameStats.totalWon} of them which gives you a win percentage of ${Math.round(winPct)}%.</p>`;
    if (longestWinStreak) {
      modalContentDiv.innerHTML += `<p>When you win, you get it on the ${avgGuesses.toFixed(2)}th guess on average.</p>`;

    }
    modalContentDiv.innerHTML += `<p>You are on a  ${currentStreak.streak} ${currentStreak.type} streak.</p>`;
    if (mostGuessed) {
      modalContentDiv.innerHTML += `<p>The movie you've guessed the most is ${mostGuessed}.</p>`;
    }
    if (fewestGuessesInWin > 0) {
      modalContentDiv.innerHTML += `<p>Your fewest guesses in a win is ${fewestGuessesInWin}.</p>`;
    }
    if (longestWinStreak > 0) {
      modalContentDiv.innerHTML += `<p>Your longest win streak is ${longestWinStreak}.</p>`;
    }
    if (totalMoviesGuessed == 1) {
      modalContentDiv.innerHTML += `<p>You've guessed 1 unique movie.</p>`;
    }
    else if (totalMoviesGuessed > 0) {
      modalContentDiv.innerHTML += `<p>You've guessed ${totalMoviesGuessed} unique movies.</p>`;
    }

  }

  // Display the modal
  const modal = document.getElementById('Modal');
  modal.style.display = "block";

  // If x button is clicked or outside of modal is clicked, close modal
  document.getElementById('closeModal').onclick = function () {
    modal.style.display = "none";
    deactivateButton("displayStatsButton");

  };
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
      deactivateButton("displayStatsButton");
    }
  };
}

// Filter movies based on user's input 
function filterMovies(event) {
  const allowedRegex = /^[a-zA-Z0-9 !@#$%ﬂ&*()_+\-=\~`{}\|:"<>?\[\]\\;',.\/]$/;

  // Only process if the key pressed matches allowed characters
  if (event.key !== undefined && event.key !== "Backspace" && !allowedRegex.test(event.key)) {
    return;
  }

  const searchQuery = document.getElementById('search').value.toLowerCase();

  if (searchQuery === '') {
    clearSearchAndMovieList();
    return;
  }
  const filteredMovies = allMovies.filter(movie => {
    const regex = new RegExp(`\\b${searchQuery}`, 'i');
    return regex.test(movie.title.toLowerCase());
  });
  displayMovieList(filteredMovies);
}

// Update game based on the movie the user selected
function selectMovie(guessedMovieID) {
  const guessedMovie = allMovies.find(movie => movie.movieID === guessedMovieID);
  const isCorrectMovie = guessedMovieID === correctMovieID;
  
  if (isCorrectMovie) {
    // Won game
    finishGame(true);
  } else {
    // Incorrect guess
    handleGuess(guessedMovie);
  }
}

// Calculate the user's total win percentage for stats
function calculateWinPercentage(stats) {
  const total = stats.games.length;
  if (total === 0) return 0;
  let wins = 0;
  for (const game of stats.games) {
    if (game.won) wins++;
  }
  return (wins / total) * 100;
}

// Calculate the user's average guess count for stats
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

// Calculate the user's current streak for stats
function calculateCurrentStreak(stats) {
  if (stats.games.length === 0) return { streak: 0, type: "none" };

  let streak = 0;
  const mostRecentResult = stats.games[stats.games.length - 1].won;
  const streakType = mostRecentResult ? "win" : "loss";

  for (let i = stats.games.length - 1; i >= 0; i--) {
    if (stats.games[i].won === mostRecentResult) {
      streak++;
    } else {
      break;
    }
  }
  return { streak, type: streakType };
}

// Get the user's most guessed movie for stats
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
  const mostGuessedMovie = allMovies.find(movie => movie.movieID === mostGuessed);
  if (maxCount === 1 || !mostGuessedMovie) return null;
  return `${mostGuessedMovie.title} (${mostGuessedMovie.year})`;
}

// Get the fewest guesses in a user's win for stats
function fewestGuessesInSingleWin(stats) {
  let minGuesses = Infinity;
  for (const game of stats.games) {
    if (game.won && game.guessCount < minGuesses) {
      minGuesses = game.guessCount;
    }
  }
  return minGuesses === Infinity ? 0 : minGuesses;
}

// Get the user's longest winning streak for stats
function longestWinningStreak(stats) {
  let maxStreak = 0;
  let currentStreak = 0;

  for (const game of stats.games) {
    if (game.won) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }
  return maxStreak;
}

// Get the total number of unique movies guessed by the user for stats
function totalUniqueMoviesGuessed(stats) {
  const guessedMovies = new Set();
  for (const game of stats.games) {
    for (const guess of game.guesses) {
      if (guess !== SKIPPED_GUESS) {
        guessedMovies.add(guess);
      }
    }
  }
  return guessedMovies.size;
}

// Update the game stats in local storage 
function updateGameStats(currentGame) {
  globalGameStats.games.push(currentGame);
  globalGameStats.totalPlayed += 1;
  if (currentGame.won) {
    globalGameStats.totalWon += 1;
  }
  localStorage.setItem('gameStats', JSON.stringify(globalGameStats));
}

// Finish the game
function finishGame(wonGame) {
  gameOver = true;
  gameWon = wonGame;
  gameOverMessage = wonGame ? "You got it! " : "You lost. ";
  if (!archiveDate) {
    textDisplay.innerHTML = `<div id="textDisplay">${gameOverMessage}<span class="message"></span><a href="https://letterboxd.com/film/${correctMovieID}" class="movie-link" target="_blank">${correctMovieObject.title} (${correctMovieObject.year})</a><span class="message"> is the correct movie.</span><br><span class="message"> Come back tomorrow to play again!</span></div>`;
  }
  else {
    textDisplay.innerHTML = `<div id="textDisplay">${gameOverMessage}<span class="message"></span><a href="https://letterboxd.com/film/${correctMovieID}" class="movie-link" target="_blank">${correctMovieObject.title} (${correctMovieObject.year})</a><span class="message"> is the correct movie.</span><br></div>`;
  }

  clearSearchAndMovieList();
  if (incorrectGuessCount < MAX_GUESSES) {
    currentReviewJSONs = allReviewJSONs.slice(0, MAX_GUESSES);
    updateReviewNumButtons();
  }
  
  // Set up share button
  multiButton.textContent = "Share";
  multiButton.onclick = pressShare;
  reviewNumButtons.style.marginRight = "0px";
  document.getElementById('search').remove();

  // Add movie poster to page
  const img = document.createElement('img');
  img.classList.add('movie-poster-img');
  img.src = correctMovieObject.posterLink;
  img.alt = `${correctMovieObject.title} (${correctMovieObject.year}) movie poster`;
  const existingDiv = document.getElementById('movie_poster');
  if (existingDiv) {
    existingDiv.innerHTML = '';
    existingDiv.appendChild(img);
  } else {
    console.error('Movie poster div with id movie_poster not found');
  }
  existingDiv.setAttribute("href", "https://letterboxd.com/film/" + correctMovieID);
  existingDiv.setAttribute("target", "_blank");
  document.getElementById('search-row').style.margin = "0px";

  // Set and update game stats only when game is finished
  if (!hasGameBeenPlayed(correctMovieID, globalGameStats)) {
    const currentGame = {
      correctMovieID: correctMovieID,
      won: (incorrectGuessCount < MAX_GUESSES),
      guessCount: collectedGuesses.length,
      guesses: collectedGuesses,
      date: correctMovieDate,
      title: correctMovieObject.title,
      year: correctMovieObject.year,
      posterLink: correctMovieObject.posterLink,
    };
    updateGameStats(currentGame);
  }
  displayCurrentReview(currentReviewIndex);
}

// Handles the user's guess or skip
function handleGuess(guess){
  // Scroll to top of page
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  setTimeout(() => window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'smooth' // or 'auto'
  }), 100);

  // Update the text display with the guess result and add guess to collected guesses
  let guessString = (MAX_GUESSES - incorrectGuessCount === 1) ? "1 guess" : `${MAX_GUESSES - incorrectGuessCount} guesses`;  
  if (guess !== null) {
    collectedGuesses.push(guess.movieID);
    textDisplay.innerHTML = `<div id="textDisplay"><span class="message">Wrong. </span>
    <a href="https://letterboxd.com/film/${guess.movieID}" class="movie-link" target="_blank">
    ${guess.title} (${guess.year})</a>
    <span class="message"> is not the correct movie. You have ${guessString} left. Switch between reviews to get more info!
        </a>`;  
  }
  else{
    collectedGuesses.push(SKIPPED_GUESS);
    multiButton.blur();
    textDisplay.innerHTML = `<a style="text-decoration:none; color:white;" target="_blank">
              You skipped! You have ${guessString} left. Switch between reviews to get more info!
          </a>`;
  }

  // Update the game state
  clearSearchAndMovieList();
  incorrectGuessCount++;
  if (incorrectGuessCount < MAX_GUESSES) {
    currentReviewJSONs = allReviewJSONs.slice(0, incorrectGuessCount + 1);
    updateReviewNumButtons();
    displayCurrentReview(incorrectGuessCount + 1);
  } else {
    finishGame(false);
  }
}

// Handles sharing
function pressShare() {
  let shareText = ''
  // Sets share text 
  if (gameWon) {
    shareText = `I played "Guess The Movie" and got it in ${collectedGuesses.length} guesses! Can you do better?`;
  }
  else {
    shareText = `I played "Guess The Movie" but wasn't able to get it. Can you do better?`;
  }
  const shareData = {
    text: shareText,
    url: window.location.href,
  };
  // Check if the share API is supported
  if (navigator.share && navigator.canShare(shareData)) {
    navigator.share(shareData)
  } else {
    // If not, copy to clipboard
    shareText += ` Play now at ${window.location.href}`;
    navigator.clipboard.writeText(shareText)
      .then(() => {

        multiButton.textContent = "Copied";
        setTimeout(() => {
          multiButton.textContent = "Share";
        }, 4000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  }
}

// Clear the search input and movie list
function clearSearchAndMovieList() {
  document.getElementById('search').value = '';
  document.getElementById('movieList').innerHTML = '';
}

// Fetch the JSON data for the reviews based on the movie ID, date, and review index
async function fetchData(movieID, date, index) {
  try {
    const response = await fetch(`/api/json?date=${date}&name=${movieID}&index=${index}`);
    if (response.status === 404) return;
    const jsonData = await response.json();
    allReviewJSONs.push(jsonData);
    if (index === 0) {
      currentReviewJSONs.push(jsonData);
    }

  } catch (error) {
    console.error('Error fetching JSONs:', error);
  }
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
  makeButtonActive(incorrectGuessCount + 1);
  currentReviewIndex = incorrectGuessCount + 1;
}

// Function to handle hover effects for history header item
function hoverHistory() {
  const historyButton = document.getElementById('displayHistoryButton');
  const historyIcon = document.getElementById('historyIcon');
  historyButton.addEventListener('pointerenter', () => {
    historyIcon.classList.add('fa-spin', 'fa-spin-reverse');
  });
  historyButton.addEventListener('pointerleave', () => {
    historyIcon.classList.remove('fa-spin', 'fa-spin-reverse');
  });
}

// Function to handle hover effects for stats header item
function hoverStats() {
  const statsButton = document.getElementById('displayStatsButton');
  const statsIcon = document.getElementById('statsIcon');
  statsButton.addEventListener('pointerenter', () => {
    statsIcon.classList.add('fa-flip');
  });
  statsButton.addEventListener('pointerleave', () => {
    statsIcon.classList.remove('fa-flip');
  });
}

// Function to handle hover effects for instructions header item
function hoverInstructions() {
  const instructionsButton = document.getElementById('instructionsButton');
  const instructionsIcon = document.getElementById('instructionsIcon');

  instructionsButton.addEventListener('pointerenter', () => {
    instructionsIcon.classList.add('fa-bounce');
  });
  instructionsButton.addEventListener('pointerleave', () => {
    instructionsIcon.classList.remove('fa-bounce');
  });
}

// Function to handle hover effects for archive header item
function hoverArchive() {
  const archiveButton = document.getElementById('archiveButton');
  const archiveIcon = document.getElementById('archiveIcon');

  archiveButton.addEventListener('pointerenter', () => {
    archiveIcon.classList.add('fa-beat');
  });
  archiveButton.addEventListener('pointerleave', () => {
    archiveIcon.classList.remove('fa-beat');
  });
}

// Function to handle hover effects for today's movie header item
function hoverToday() {
  const todayButton = document.getElementById('todayButton');
  const todayIcon = document.getElementById('todayIcon');

  todayButton.addEventListener('pointerenter', () => {
    todayIcon.classList.add('fa-beat');
  });
  todayButton.addEventListener('pointerleave', () => {
    todayIcon.classList.remove('fa-beat');
  });
}

// Updates the selected movie for styling
function updateSelectedItem() {
  const items = document.querySelectorAll('.movie-list li');
  items.forEach((item, index) => {
    if (index === currentMovieListIndex) {
      item.classList.add('selected');
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
    if (activeElement.id === 'search' && currentMovieListIndex == -1) {
      currentMovieListIndex = 0;
    } else {
      // Otherwise, move to the next item (with wrapping)
      if (currentMovieListIndex < items.length - 1) {
        currentMovieListIndex++;
      }
    }
    updateSelectedItem();
  }
  else if (event.key === 'ArrowUp') {
    const items = document.querySelectorAll('.movie-list li');
    if (items.length === 0) return;
    const activeElement = document.activeElement;

    event.preventDefault();
    // Only change index if the search box is not focused
    if (currentMovieListIndex > 0) {
      currentMovieListIndex--;
    }
    updateSelectedItem();
  }
  else if (event.key === 'Enter') {
    const items = document.querySelectorAll('.movie-list li');
    if (items.length === 0) return;
    const activeElement = document.activeElement;
    // If the search textbox is focused, select the first movie
    if (activeElement.id === 'search' && currentMovieListIndex === -1) {
      currentMovieListIndex = 0;
      updateSelectedItem();
    }
    // Select the movie if valid
    else if (currentMovieListIndex >= 0 && currentMovieListIndex < items.length) {
      items[currentMovieListIndex].click();
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
  const movieListElement = document.getElementById('movieList');
  movieListElement.innerHTML = '';
  movies.slice(0, MAX_NUM_MOVIES_TO_SHOW).forEach(movie => {
    const listItem = document.createElement('li');
    listItem.textContent = `${movie.title} (${movie.year})`;
    listItem.onclick = () => selectMovie(movie.movieID);
    movieListElement.appendChild(listItem);
  });
  // Reset the selection index on list update and add mouse listeners
  currentMovieListIndex = -1;
  addMouseListeners();
}

document.addEventListener('DOMContentLoaded', async function initializeGame() {
  try {
    // Load CSV file and parse movie data
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
    if (!isArchivePage) {
      let response = '';
      if (archiveDate) {
        response = await fetch('/api/get-movie?date=' + archiveDate);
      }
      else if (!isArchivePage) {
        document.getElementById('todayButton').style.display = 'none';
        response = await fetch('/api/get-movie');
      }

      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      correctMovieID = data.movieID;
      correctMovieObject = allMovies.find(movie => movie.movieID === correctMovieID);
      correctMovieDate = data.date;
      formattedMovieDate = new Date(correctMovieDate).toLocaleDateString('en-US', {
        timeZone: 'UTC',  // Set timezone to UTC to ignore local timezones
        year: 'numeric',
        month: 'long',     // Full month name (e.g. "February")
        day: 'numeric'     // Day without leading zeros (e.g. "2")
      });

      // Fetch all images, text, and links for the movie
      for (let i = 0; i < MAX_GUESSES; i++) {
        await fetchData(correctMovieID, correctMovieDate, i);
      }
      // Check if this game has already been played.
      if (hasGameBeenPlayed(correctMovieID, globalGameStats)) {
        finishGame(hasGameBeenWon(correctMovieID, globalGameStats));
      }
      else {
        if (archiveDate) {
          textDisplay.innerHTML = `<div id="textDisplay"><span class="message">You get 5 reviews (one at a time) to guess the movie. You can skip if you don't have a guess. Check your history and stats once you've played a few times. Have fun!</span>`;
        }
        else {
          textDisplay.innerHTML = `<div id="textDisplay"><h2></h2><span class="message">Welcome to Guess the Movie! You get 5 reviews (one at a time) to guess the movie. You can skip if you don't have a guess. Click on "How To Play" to learn more and check your history and stats once you've played a few times. The movie updates every day at 12AM EST. Have fun!</span>`;
        }
      }
      if (archiveDate) {
        dateDisplay.innerHTML = `<h2>Archive (${formattedMovieDate})</h2>`;
      }
      else {
        dateDisplay.innerHTML = `<h2>Today's movie (${formattedMovieDate})</h2>`;
      }

      updateReviewNumButtons();
      displayCurrentReview();
    }
    else {
      fetch('/api/dates')
        .then(response => response.json())
        .then(data => {
          const movieDates = new Set(data.dates);
          // Retrieve user game stats (assumed stored as JSON under 'gameStats')
          let userGames = [];
          try {
            const storedData = localStorage.getItem('gameStats');
            if (storedData) {
              const parsed = JSON.parse(storedData);
              if (parsed.games) userGames = parsed.games;
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
                let link = document.createElement("a");
                link.href = "/archive/" + dateStr;
                link.textContent = day;  // Display the day number
                cell.appendChild(link);
              } else {
                let span = document.createElement("span");
                span.textContent = day;
                cell.appendChild(span);
              }

              // Set cell color based on movie availability and user completion
              if (movieDates.has(dateStr)) {
                if (completedDates.has(dateStr)) {
                  cell.classList.add("completed");
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

    }

    hoverHistory();
    hoverStats();
    hoverInstructions();
    if (!isArchivePage) {
      hoverArchive();
    }
    hoverToday();

  }
  catch (error) {
    console.error('Error during initialization:', error);
  }

});

