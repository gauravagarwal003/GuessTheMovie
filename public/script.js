// Global variables and constants
let moviesData = [];
let correctMovieID = '';
let incorrectGuessCount = 0;
let collectedGuessesArray = [];
let currentImageIndex = 1;
let gameOver = false;
let correctMovieDate = '';
let correctMovie = '';
let currentSelectionIndex = -1;
let gameWon = false;
let allReviewJSONs = []; // Array to store all review JSONs
let currentReviewJSONs = []; // Array to store the subset of review JSONs

const isArchivePage = window.location.pathname.startsWith('/archive');
const archiveDate = isArchivePage 
  ? window.location.pathname.split('/')[2] 
  : null;
console.log(isArchivePage);
console.log(`Archive date: ${archiveDate}`);


const SKIPPED_GUESS = '__SKIPPED__'; // Sentinel value to indicate a skipped guess
const maxMoviesToShow = 10;
const selectedColumns = ['title', 'year', 'movieID', 'posterLink']; // Columns to select from the CSV file
const maxIncorrectGuesses = 5;
const imageButtonsContainer = document.getElementById('imageButtons');
const multiButton = document.querySelector('button[id="multi-button"]');

var globalGameStats = JSON.parse(localStorage.getItem('gameStats')) || {
  games: [],
  totalPlayed: 0,
  totalWon: 0
};

function hasGameBeenPlayed(correctMovieID, stats) {
  if (!stats) return false;
  return stats.games.some(game => game.correctMovieID === correctMovieID);
}

function hasGameBeenWon(correctMovieID, stats) {
  if (!stats) return false;
  return stats.games.some(game => game.correctMovieID === correctMovieID && game.won === true);
}


function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th'; // covers 11th-13th
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function formatDate(isoDate) {
  const localDateString = isoDate.replace(/-/g, '/');
  const date = new Date(localDateString);
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
}

// Main function: generate HTML for a given game record
function generateGameHTML(game) {
  const formattedDate = formatDate(game.date);
  const resultText = game.won ? 'won' : 'lost';

  let realGuessCount = 0;
  // Create a copy of guesses to avoid modifying the original data
  let plural = `review`;
  if (game.guessCount > 1) {
    plural += `s`;
  }
  let guessText = ``;

  for (let i = 0; i < game.guesses.length; i++) {
    if (i == game.guesses.length - 1 && game.guesses.length > 1) {
      guessText += `and `;
    }
    if (game.guesses[i] === SKIPPED_GUESS) {
      guessText += `skipped, `;
    }
    else {
      const foundMovie = moviesData.find(movie => movie.movieID === game.guesses[i]);
      realGuessCount++;
      console.log(game.guesses[i]);
      if (game.guesses[i] === game.correctMovieID) {
        guessText += ` correctly guessed ${foundMovie.title} (${foundMovie.year}), `;
      }
      else {
        guessText += ` incorrectly guessed ${foundMovie.title} (${foundMovie.year}), `;
      }
    }
  }
  // Remove the last two characters (", ") from guessText
  if (guessText.endsWith(', ')) {
    guessText = guessText.slice(0, -2);
  }

  if (realGuessCount <= 0) {
    return `
    <p class = "historyFirstLine">On ${formattedDate}, the movie was ${game.title} (${game.year}).</p> 
    <p class = "historySecondLine">You ${resultText} and did not guess any movies.</p>
    `;
  }
  else {
    return `
        <p class = "historyFirstLine">On ${formattedDate}, the movie was ${game.title} (${game.year}).</p> 
        <p class = "historySecondLine">You ${resultText} with ${game.guessCount} ${plural}: ${guessText}.</p>
    `;
  }

}

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

function deactivateButton(buttonID) {
  const button = document.getElementById(buttonID);
  button.classList.remove("active-button");
  makeButtonActive(currentImageIndex);
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

function displayInstructions() {
  const modalContentDiv = document.getElementById('modalContent');

  modalContentDiv.innerHTML = `
    <h2>How to Play</h2>
    <p>You have ${maxIncorrectGuesses} tries to guess the movie. Each guess (or skip) will reveal an additional review to help you.</p>
    <p>To guess, click the search bar and begin typing. You can use the up and down buttons or cursor to select between reviews and the enter button or to submit one. You can also use the left and right buttons to toggle between available reviews.</p>
    <p>Once the game is over, you can click on the photos to go to that review.</p>
    <p>Every day features a new movie (added at 12AM EST), and you can only play once per day.</p>
    <p>To save your stats and history and access them at any time, please play using the same browser and device and avoid using incognito or private browsing modes.</p>
    <p>Good luck and have fun!</p>
  `;

  setActiveButton("instructionsButton");

  // Display the modal
  const modal = document.getElementById('Modal');
  modal.style.display = "block";

  document.getElementById('closeModal').onclick = function () {
    modal.style.display = "none";
    deactivateButton("instructionsButton");
  };

  // Close the modal if user clicks anywhere outside the modal content
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
      deactivateButton("instructionsButton");
    }
  };

}

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

  document.getElementById('closeModal').onclick = function () {
    modal.style.display = "none";
  };

  // Close the modal if user clicks anywhere outside the modal content
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

  // Set default tab and content to Terms of Service
  switchTab(termsTab, termsContent);
}

function displayContactInfo() {
  const modalContentDiv = document.getElementById('modalContent');
  modalContentDiv.innerHTML = `<iframe src="https://docs.google.com/forms/d/e/1FAIpQLSf1QkFlmLqevhyPgnqCRA-nj3yLsb0lQxgA_BGFtxbZySnNVA/viewform?embedded=true" width="640" height="915" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>`;
  const modal = document.getElementById('Modal');
  modal.style.display = "block";

  document.getElementById('closeModal').onclick = function () {
    modal.style.display = "none";
  };

  // Close the modal if user clicks anywhere outside the modal content
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

}

function displayHistory() {
  const modalContentDiv = document.getElementById('modalContent');

  modalContentDiv.innerHTML = `<h2>Your Game History</h2>`;
  if (globalGameStats.games.length == 0) {
    modalContentDiv.innerHTML += `<p>You have not played any games yet!</p>`;
  }
  else {
    for (const game of globalGameStats.games) {
      modalContentDiv.innerHTML += generateGameHTML(game);
    }
  }
  setActiveButton("displayHistoryButton");

  // Display the modal
  const modal = document.getElementById('Modal');
  modal.style.display = "block";

  document.getElementById('closeModal').onclick = function () {
    modal.style.display = "none";
    deactivateButton("displayHistoryButton");
  };

  // Close the modal if user clicks anywhere outside the modal content
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
      deactivateButton("displayHistoryButton");
    }
  };
}

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

  document.getElementById('closeModal').onclick = function () {
    modal.style.display = "none";
    deactivateButton("displayStatsButton");

  };

  // Close the modal if user clicks anywhere outside the modal content
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
      deactivateButton("displayStatsButton");
    }
  };
}

function filterMovies(event) {
  const allowedRegex = /^[a-zA-Z0-9 !@#$%ﬂ&*()_+\-=\~`{}\|:"<>?\[\]\\;',.\/]$/;

  // Only process if the key pressed matches allowed characters.
  if (event.key !== undefined && event.key !== "Backspace" && !allowedRegex.test(event.key)) {
    return;
  }

  const searchQuery = document.getElementById('search').value.toLowerCase();

  if (searchQuery === '') {
    clearSearchAndMovieList();
    return;
  }
  const filteredMovies = moviesData.filter(movie => {
    const regex = new RegExp(`\\b${searchQuery}`, 'i');
    return regex.test(movie.title.toLowerCase());
  });
  displayMovieList(filteredMovies);
}

function selectMovie(guessedMovieID) {
  collectedGuessesArray.push(guessedMovieID);
  const guessedMovie = moviesData.find(movie => movie.movieID === guessedMovieID);
  const isCorrectMovie = guessedMovieID === correctMovieID;
  textDisplay = document.getElementById('textDisplay');
  if (isCorrectMovie) {
    finishGame(true);
  } else {
    incorrectGuessCount++;
    let guessString = (maxIncorrectGuesses - incorrectGuessCount === 1) ? "1 guess" : `${maxIncorrectGuesses - incorrectGuessCount} guesses`;
    textDisplay.innerHTML = `<div id="textDisplay"><span class="message">Wrong. </span>
    <a href="https://letterboxd.com/film/${guessedMovieID}" class="movie-link" target="_blank">
    ${guessedMovie.title} (${guessedMovie.year})</a>
    <span class="message"> is not the correct movie. You have ${guessString} left. Switch between reviews to get more info!
        </a>`;
    clearSearchAndMovieList();
    if (incorrectGuessCount < maxIncorrectGuesses) {
      currentReviewJSONs = allReviewJSONs.slice(0, incorrectGuessCount + 1);
      updateImageButtons();
      displayCurrentReview(incorrectGuessCount + 1);
    } else {
      finishGame(false);
    }
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    setTimeout(() => window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth' // or 'auto'
    }), 100);
  }
}

function calculateWinPercentage(stats) {
  const total = stats.games.length;
  if (total === 0) return 0;
  let wins = 0;
  for (const game of stats.games) {
    if (game.won) wins++;
  }
  return (wins / total) * 100;
}

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
function calculateCurrentStreak(stats) {
  if (stats.games.length === 0) return { streak: 0, type: "none" };

  let streak = 0;
  // Determine the result (win or loss) of the most recent game.
  const mostRecentResult = stats.games[stats.games.length - 1].won;
  const streakType = mostRecentResult ? "win" : "loss";

  // Traverse the games array backwards.
  for (let i = stats.games.length - 1; i >= 0; i--) {
    if (stats.games[i].won === mostRecentResult) {
      streak++;
    } else {
      break;
    }
  }

  return { streak, type: streakType };
}

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
  const mostGuessedMovie = moviesData.find(movie => movie.movieID === mostGuessed);
  if (maxCount === 1 || !mostGuessedMovie) return null;
  return `${mostGuessedMovie.title} (${mostGuessedMovie.year})`;
}
function fewestGuessesInSingleWin(stats) {
  let minGuesses = Infinity;
  for (const game of stats.games) {
    if (game.won && game.guessCount < minGuesses) {
      minGuesses = game.guessCount;
    }
  }
  return minGuesses === Infinity ? 0 : minGuesses;
}

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



function updateGameStats(currentGame) {
  globalGameStats.games.push(currentGame);
  globalGameStats.totalPlayed += 1;
  if (currentGame.won) {
    globalGameStats.totalWon += 1;
  }
  localStorage.setItem('gameStats', JSON.stringify(globalGameStats));
}

function finishGame(wonGame) {
  gameOver = true;
  gameWon = wonGame;
  const textDisplay = document.getElementById('textDisplay');
  gameOverMessage = wonGame ? "You got it! " : "You lost. ";
  textDisplay.innerHTML = `<div id="textDisplay">${gameOverMessage}<span class="message"></span><a href="https://letterboxd.com/film/${correctMovieID}" class="movie-link" target="_blank">${correctMovie.title} (${correctMovie.year})</a><span class="message"> is the correct movie.</span><br><span class="message"> Come back tomorrow to play again!</span></div>`;


  clearSearchAndMovieList();
  if (incorrectGuessCount < maxIncorrectGuesses) {
    currentReviewJSONs = allReviewJSONs.slice(0, maxIncorrectGuesses);
    updateImageButtons();
  }
  multiButton.textContent = "Share";
  multiButton.onclick = pressShare;
  imageButtonsContainer.style.marginRight = "0px";
  document.getElementById('search').remove();

  const img = document.createElement('img');
  img.classList.add('movie-poster-img');
  img.src = correctMovie.posterLink;
  img.alt = `${correctMovie.title} (${correctMovie.year}) movie poster`;
  const existingDiv = document.getElementById('movie_poster');
  if (existingDiv) {
    existingDiv.innerHTML = '';
    existingDiv.appendChild(img);
  } else {
    console.error('Div with specified ID not found.');
  }
  existingDiv.setAttribute("href", "https://letterboxd.com/film/" + correctMovieID);
  existingDiv.setAttribute("target", "_blank");
  const parent = document.getElementById('content-wrap');
  const div1 = document.getElementById('movie_container');
  parent.appendChild(div1);
  document.getElementById('search-row').style.margin = "0px";

  if (!hasGameBeenPlayed(correctMovieID, globalGameStats)) {
    const currentGame = {
      correctMovieID: correctMovieID,
      won: (incorrectGuessCount < maxIncorrectGuesses),
      guessCount: collectedGuessesArray.length,
      guesses: collectedGuessesArray,
      date: correctMovieDate,
      title: correctMovie.title,
      year: correctMovie.year,
      posterLink: correctMovie.posterLink
    };
    updateGameStats(currentGame);
  }
  displayCurrentReview(currentImageIndex);
}

function pressSkipButton() {
  collectedGuessesArray.push(SKIPPED_GUESS);
  multiButton.blur();

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  setTimeout(() => window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'smooth' // or 'auto'
  }), 100);

  incorrectGuessCount++;
  clearSearchAndMovieList();
  if (incorrectGuessCount < maxIncorrectGuesses) {
    currentReviewJSONs = allReviewJSONs.slice(0, incorrectGuessCount + 1);
    updateImageButtons();
    displayCurrentReview(incorrectGuessCount + 1);
    let guessString = (maxIncorrectGuesses - incorrectGuessCount === 1) ? "1 guess" : `${maxIncorrectGuesses - incorrectGuessCount} guesses`;
    document.getElementById('textDisplay').innerHTML = `<a style="text-decoration:none; color:white;" target="_blank">
              You skipped! You have ${guessString} left. Switch between reviews to get more info!
          </a>`;
  }
  else {
    finishGame(false);
  }
}

function pressShare() {

  let shareText = ''
  if (gameWon) {
    shareText = `I played "Guess The Movie" and got it in ${collectedGuessesArray.length} guesses! Can you do better?`;
  }
  else {
    shareText = `I played "Guess The Movie" but wasn't able to get it. Can you do better?`;
  }
  const shareData = {
    text: shareText,
    url: window.location.href,
  };
  if (navigator.share && navigator.canShare(shareData)) {
    navigator.share(shareData)
  } else {
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

function clearSearchAndMovieList() {
  document.getElementById('search').value = '';
  document.getElementById('movieList').innerHTML = '';
}

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

function displayCurrentReview(index = 1) {
  const review = currentReviewJSONs[index - 1];
  const reviewCard = document.getElementById('reviewCard');
  if (!review || currentReviewJSONs.length === 0) {
    reviewCard.style.display = 'none';
    return;
  }

  // Show card
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
  if (review.collapsed){
    document.getElementById('reviewText').innerHTML = review.text + '<p class="truncated-label">Review Truncated</p>';
  }
  else{
    document.getElementById('reviewText').innerHTML = review.text;
  }
  

  // Likes and comments
  document.getElementById('likesCount').textContent = Number(review.numLikes).toLocaleString();
  document.getElementById('commentsCount').textContent = Number(review.num_comments).toLocaleString();
    
  // Link
  const reviewLink = document.getElementById('reviewLink');
  if (gameOver) {
    reviewLink.href = review.link;
    reviewLink.style.display = 'inline-block';
  } else {
    reviewLink.style.display = 'none';
  }
}

function makeButtonActive(index) {
  const buttons = imageButtonsContainer.querySelectorAll('button');
  buttons.forEach(button => {
    if (parseInt(button.textContent) === index) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
      button.blur()
    }
  });
}

function updateImageButtons() {
  imageButtonsContainer.innerHTML = '';
  currentReviewJSONs.forEach((image, index) => {
    const button = document.createElement('button');
    button.textContent = index + 1;
    button.onclick = () => {
      numReview = parseInt(button.textContent, 10)
      displayCurrentReview(numReview);
      makeButtonActive(numReview);
      currentImageIndex = parseInt(numReview);
    };
    imageButtonsContainer.appendChild(button);
  });
  makeButtonActive(incorrectGuessCount + 1);
  currentImageIndex = incorrectGuessCount + 1;
}

function hoverCoffee() {
  const coffeeText = document.getElementById('footerItemCoffee');
  const coffeeIcon = document.getElementById('coffeeIcon');

  // Add event listeners for hover and focus
  coffeeText.addEventListener('pointerenter', function () {
    coffeeIcon.classList.add('hover');// // Change to the new image
  });

  coffeeText.addEventListener('pointerleave', function () {
    coffeeIcon.classList.remove('hover'); // Change back to the original image
  });

  coffeeIcon.addEventListener('pointerenter', function () {
    coffeeText.classList.add('hover');// Change to the new image
  });

  coffeeIcon.addEventListener('pointerleave', function () {
    coffeeText.classList.remove('hover'); // Change back to the original image
  });
}

function hoverContactUs() {
  const contactUsText = document.getElementById('footerItemContactUs');
  const contactUsIcon = document.getElementById('contactUsIcon');

  // Add event listeners for hover and focus
  contactUsText.addEventListener('pointerenter', function () {
    contactUsIcon.classList.add('hover');// // Change to the new image
  });

  contactUsText.addEventListener('pointerleave', function () {
    contactUsIcon.classList.remove('hover'); // Change back to the original image
  });

  contactUsIcon.addEventListener('pointerenter', function () {
    contactUsText.classList.add('hover');// Change to the new image
  });

  contactUsIcon.addEventListener('pointerleave', function () {
    contactUsText.classList.remove('hover'); // Change back to the original image
  });
}


function hoverPolicies() {
  const policyText = document.getElementById('footerItemPolicies');
  const policiesIcon = document.getElementById('policiesIcon');

  // Add event listeners for hover and focus
  policyText.addEventListener('pointerenter', function () {
    policiesIcon.classList.add('hover');// // Change to the new image
  });

  policyText.addEventListener('pointerleave', function () {
    policiesIcon.classList.remove('hover'); // Change back to the original image
  });

  policiesIcon.addEventListener('pointerenter', function () {
    policyText.classList.add('hover');// Change to the new image
  });

  policiesIcon.addEventListener('pointerleave', function () {
    policyText.classList.remove('hover'); // Change back to the original image
  });
}


function hoverLetterboxd() {
  const footerItemLetterboxd = document.getElementById('footerItemLetterboxd');
  const footerImage = document.querySelector('.footer-image');

  // Add event listeners for hover and focus
  footerItemLetterboxd.addEventListener('pointerenter', function () {
    footerImage.src = '/LBBWLogo.png'; // Change to the new image
  });

  footerItemLetterboxd.addEventListener('pointerleave', function () {
    footerImage.src = '/LBColorLogo.png'; // Change back to the original image
  });

  footerImage.addEventListener('pointerenter', function () {
    footerItemLetterboxd.classList.add('hover');// Change to the new image
  });

  footerImage.addEventListener('pointerleave', function () {
    footerItemLetterboxd.classList.remove('hover'); // Change back to the original image
  });
}

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


// Function to update the "selected" class on list items.
function updateSelectedItem() {
  const items = document.querySelectorAll('.movie-list li');
  items.forEach((item, index) => {
    if (index === currentSelectionIndex) {
      item.classList.add('selected');
      // Optionally scroll the item into view.
      //item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

// Attach mouseover (and click) listeners to list items so that hovering activates them.
function addMouseListeners() {
  const items = document.querySelectorAll('.movie-list li');
  items.forEach((item, index) => {
    item.addEventListener('mousemove', () => {
      currentSelectionIndex = index;
      updateSelectedItem();
    });
    item.addEventListener('click', () => {
      currentSelectionIndex = index;
      updateSelectedItem();
    });
  });
}

// Keydown listener for keyboard navigation.
window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown') {
    const items = document.querySelectorAll('.movie-list li');
    if (items.length === 0) return;
    const activeElement = document.activeElement;

    event.preventDefault();
    // If the search textbox is focused, select the first movie.
    if (activeElement.id === 'search' && currentSelectionIndex == -1) {
      currentSelectionIndex = 0;
    } else {
      // Otherwise, move to the next item (with wrapping).
      if (currentSelectionIndex < items.length - 1) {
        currentSelectionIndex++;
      }
    }
    updateSelectedItem();
  }
  else if (event.key === 'ArrowUp') {
    const items = document.querySelectorAll('.movie-list li');
    if (items.length === 0) return;
    const activeElement = document.activeElement;

    event.preventDefault();
    // Only handle ArrowUp if focus is NOT in the search box.
    if (currentSelectionIndex > 0) {
      currentSelectionIndex--;
    }
    updateSelectedItem();
  }
  else if (event.key === 'Enter') {
    const items = document.querySelectorAll('.movie-list li');
    if (items.length === 0) return;
    const activeElement = document.activeElement;
    if (activeElement.id === 'search' && currentSelectionIndex === -1) {
      currentSelectionIndex = 0;
      updateSelectedItem();
    }
    // Trigger a click on the currently selected movie.
    else if (currentSelectionIndex >= 0 && currentSelectionIndex < items.length) {
      items[currentSelectionIndex].click();
    }
  }
  else if (event.key === 'ArrowRight') {
    if (currentImageIndex < currentReviewJSONs.length) {
      displayCurrentReview(currentImageIndex + 1);
      makeButtonActive(currentImageIndex + 1);
      currentImageIndex = currentImageIndex + 1;
    }
  }
  else if (event.key === 'ArrowLeft') {
    if (currentImageIndex > 1) {
      displayCurrentReview(currentImageIndex - 1);
      makeButtonActive(currentImageIndex - 1);
      currentImageIndex = currentImageIndex - 1;
    }
  }

});

// Updated displayMovieList that resets the selection and attaches mouse events.
function displayMovieList(movies) {
  const movieListElement = document.getElementById('movieList');
  movieListElement.innerHTML = '';
  movies.slice(0, maxMoviesToShow).forEach(movie => {
    const listItem = document.createElement('li');
    listItem.textContent = `${movie.title} (${movie.year})`;
    listItem.onclick = () => selectMovie(movie.movieID);
    movieListElement.appendChild(listItem);
  });
  // Reset the selection index on list update.
  currentSelectionIndex = -1;
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
        moviesData = results.data
          .map(row => {
            let selectedRow = {};
            selectedColumns.forEach(col => {
              selectedRow[col] = row[col];
            });
            return selectedRow;
          })
          .filter(row =>
            Object.values(row).every(value => value !== undefined && value !== null && value !== "")
          );
      }
    });

    // Fetch movie info
    const response = await fetch('/api/get-movie');
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    correctMovieID = data.movie;
    correctMovieDate = data.date;
    console.log("Correct Movie ID: " + correctMovieID);
    console.log("Correct Movie Date: " + correctMovieDate);
    correctMovie = moviesData.find(movie => movie.movieID === correctMovieID);

    // Fetch all images, text, and links for the movie
    for (let i = 0; i < maxIncorrectGuesses; i++) {
      await fetchData(correctMovieID, correctMovieDate, i);
    }
  
    document.getElementById('loading-overlay').style.display = 'none';

    // Check if this game has already been played.
    if (hasGameBeenPlayed(correctMovieID, globalGameStats)) {
      finishGame(hasGameBeenWon(correctMovieID, globalGameStats));
    }
    else{
      textDisplay = document.getElementById('textDisplay');
      textDisplay.innerHTML = `<div id="textDisplay"><span class="message">Welcome to Guess the Movie! You get 5 reviews (one at a time) to guess the movie. You can skip if you don't have a guess. Click on "How To Play" to learn more and check your history and stats once you've played a few times. The movie updates every day at 12AM EST. Have fun!</span>`;

    }
    updateImageButtons();
    displayCurrentReview();

    hoverCoffee();
    hoverLetterboxd();
    hoverHistory();
    hoverStats();
    hoverInstructions();
    hoverPolicies();
    hoverContactUs();
    hoverArchive();

  } catch (error) {
    console.error('Error during initialization:', error);
  }

});

