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

// Frequently used DOM elements
const reviewNumButtons = document.getElementById('imageButtons');
const shareButton = document.querySelector('button[id="share-button"]');
const dateDisplay = document.getElementById('dateDisplayMessage');
const textDisplay = document.getElementById('textDisplay');

migrateLocalStorage();

let globalGameStats = JSON.parse(localStorage.getItem('gameStats')) || {
  gamesFinished: 0,
  gamesWon: 0,
  gamesLost: 0,
  fastestWin: null,
  slowestWin: null,
  averageGuesses: null,
  winPercentage: 0
};
let globalGameHistory = JSON.parse(localStorage.getItem('gameHistory')) || [];
let ongoingGame = null;

function loadOngoingGame(correctMovieID, correctMovieDate) {
  let game = globalGameHistory.find(g => g.id === correctMovieID && g.status === 'incomplete');
  if (game) {
    ongoingGame = { ...game };
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
  localStorage.setItem('gameHistory', JSON.stringify(globalGameHistory));
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
  let history = JSON.parse(localStorage.getItem('gameHistory')) || [];
  let finishedGames = history.filter(g => g.status === 'won' || g.status === 'lost');
  let gamesFinished = finishedGames.length;
  let gamesWon = finishedGames.filter(g => g.status === 'won').length;
  let gamesLost = finishedGames.filter(g => g.status === 'lost').length;
  let winGames = finishedGames.filter(g => g.status === 'won');
  let fastestWin = winGames.length ? Math.min(...winGames.map(g => g.guesses.length)) : null;
  let slowestWin = winGames.length ? Math.max(...winGames.map(g => g.guesses.length)) : null;
  let averageGuesses = gamesFinished ? (finishedGames.reduce((acc, g) => acc + (g.guesses.length || 0), 0) / gamesFinished) : null;
  let winPercentage = gamesFinished ? Math.round((gamesWon / gamesFinished) * 100) : 0;
  let stats = {
    gamesFinished,
    gamesWon,
    gamesLost,
    fastestWin,
    slowestWin,
    averageGuesses,
    winPercentage
  };
  localStorage.setItem('gameStats', JSON.stringify(stats));
}

// v1: Checks whether the user has played the current game
function hasGameBeenPlayed(correctMovieID) {
  let history = JSON.parse(localStorage.getItem('gameHistory')) || [];
  return history.some(game => game.id === correctMovieID && (game.status === 'won' || game.status === 'lost'));
}

// v1: Checks if user won the current game
function hasGameBeenWon(correctMovieID) {
  let history = JSON.parse(localStorage.getItem('gameHistory')) || [];
  return history.some(game => game.id === correctMovieID && game.status === 'won');
}

// Update game based on the movie the user selected
function selectMovie(guessedMovieID) {
  const guessedMovie = allMovies.find(movie => movie.movieID === guessedMovieID);
  const isCorrectMovie = guessedMovieID === correctMovieID;

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
    const searchInput = document.getElementById('search');
    searchInput.value = `${movie.title} (${movie.year})`;
    clearMovieList();
  }
}

// Handle submit button click
function handleSubmit() {
  const searchInput = document.getElementById('search');
  const searchQuery = searchInput.value.trim();
  
  if (searchQuery === '') {
    // Empty search bar counts as skip
    handleGuess(null);
    return;
  }
  
  // Check if the search query exactly matches a movie in the format "Title (Year)"
  const exactMatch = allMovies.find(movie => 
    `${movie.title} (${movie.year})` === searchQuery
  );
  
  if (exactMatch) {
    // Submit the exact match
    selectMovie(exactMatch.movieID);
    return;
  }
  
  // If no exact match, search for movies and auto-select the first result
  let filteredMovies = [];
  if (fuse) {
    const results = fuse.search(searchQuery);
    filteredMovies = results
      .slice(0, MAX_NUM_MOVIES_TO_SHOW)
      .map(result => result.item);
  } else {
    // Simple substring search as backup
    filteredMovies = allMovies.filter(movie =>
      movie.title && movie.title.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, MAX_NUM_MOVIES_TO_SHOW);
  }
  
  if (filteredMovies.length > 0) {
    // Load first result into search bar and submit it
    const firstMovie = filteredMovies[0];
    searchInput.value = `${firstMovie.title} (${firstMovie.year})`;
    clearMovieList();
    selectMovie(firstMovie.movieID);
  } else {
    // No matches found, treat as skip
    handleGuess(null);
  }
}

// Finish the game
function finishGame(wonGame) {
  gameOver = true;
  gameWon = wonGame;
  gameOverMessage = wonGame ? "You got it! " : "You lost. ";
  textDisplay.innerHTML = `<div id="textDisplay">${gameOverMessage}<span class="message"></span><a href="https://letterboxd.com/film/${correctMovieID}" class="text-link" target="_blank">${correctMovieObject.title} (${correctMovieObject.year})</a><span class="message"> is the correct movie.</span><br>`;
  if (!archiveDate) {
    textDisplay.innerHTML += `<span class="message"> Come back tomorrow to play again!</span>`;
  }
  textDisplay.innerHTML += `</div>`;

  clearSearchAndMovieList();
  if (incorrectGuessCount < MAX_GUESSES) {
    currentReviewJSONs = allReviewJSONs.slice(0, MAX_GUESSES);
    updateReviewNumButtons();
  }

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
  const searchRow = document.getElementById('search-row');
  if (searchRow) {
    searchRow.remove();
  }

  // Show the share button now that the game is over
  shareButton.style.display = 'inline-block';
  document.getElementById('imageButtons').style.marginRight = '5px';

  // v1: Set and update gameHistory and stats only when game is finished
  if (ongoingGame) {
    let status = (incorrectGuessCount < MAX_GUESSES) ? 'won' : 'lost';
    finishOngoingGame(status);
  }
  displayCurrentReview(currentReviewIndex);
}

// Handles the user's guess or skip
function handleGuess(guess) {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  setTimeout(() => window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'smooth'
  }), 100);

  startOngoingGame(correctMovieID, correctMovieDate);

  let guessString = (MAX_GUESSES - incorrectGuessCount - 1 === 1) ? "1 guess" : `${MAX_GUESSES - incorrectGuessCount - 1} guesses`;
  if (guess !== null) {
    collectedGuesses.push(guess.movieID);
    updateOngoingGameOnGuess(guess.movieID);
    textDisplay.innerHTML = `<div id="textDisplay"><span class="message">Wrong. </span>
    <a href="https://letterboxd.com/film/${guess.movieID}" class="text-link" target="_blank">
    ${guess.title} (${guess.year})</a>
    <span class="message"> is not the correct movie. You have ${guessString} left. Switch between reviews to get more info!
        </a>`;
  }
  else {
    collectedGuesses.push(SKIPPED_GUESS);
    updateOngoingGameOnGuess(SKIPPED_GUESS, true);
    textDisplay.innerHTML = `<a style="text-decoration:none; color:white;" target="_blank">
              You skipped! You have ${guessString} left. Switch between reviews to get more info!
          </a>`;
  }

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
    shareText = `I played "Guess The Movie" but wasn't able to get it. Can you?`;
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
        shareButton.textContent = "Copied";
        setTimeout(() => {
          shareButton.textContent = "Share";
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

// Clear only the movie list
function clearMovieList() {
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
    const activeElement = document.activeElement;
    
    // If Enter is pressed while search input is focused and no movie is selected from list
    if (activeElement.id === 'search' && currentMovieListIndex === -1) {
      // Submit the current search query
      handleSubmit();
      return;
    }
    
    // If there are movies in the list
    if (items.length > 0) {
      // If the search textbox is focused and no movie is selected, select the first movie
      if (activeElement.id === 'search' && currentMovieListIndex === -1) {
        currentMovieListIndex = 0;
        updateSelectedItem();
      }
      // Load the selected movie into search bar if valid
      else if (currentMovieListIndex >= 0 && currentMovieListIndex < items.length) {
        items[currentMovieListIndex].click();
      }
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
    listItem.onclick = () => loadMovieIntoSearchBar(movie.movieID);
    movieListElement.appendChild(listItem);
  });
  // Reset the selection index on list update and add mouse listeners
  currentMovieListIndex = -1;
  addMouseListeners();
}


function filterMovies(event) {
  // Backup: If Fuse is not ready, fallback to simple substring search
  const searchInput = document.getElementById("search");
  if (!searchInput) return;

  const allowedRegex = /^[a-zA-Z0-9 !@#$ﬂ&*()_+\-=\~`{}|:"<>?$$\\;',./]$/;

  if (event.key !== undefined && event.key !== "Backspace" && !allowedRegex.test(event.key)) {
    return;
  }

  const searchQuery = searchInput.value.trim().toLowerCase();

  if (searchQuery === "") {
    clearSearchAndMovieList();
    return;
  }

  let filteredMovies = [];
  if (fuse) {
    const results = fuse.search(searchQuery);
    filteredMovies = results
      .slice(0, MAX_NUM_MOVIES_TO_SHOW)
      .map(result => result.item);
  } else {
    // Simple substring search as backup
    filteredMovies = allMovies.filter(movie =>
      movie.title && movie.title.toLowerCase().includes(searchQuery)
    ).slice(0, MAX_NUM_MOVIES_TO_SHOW);
  }

  displayMovieList(filteredMovies);
}

document.addEventListener('DOMContentLoaded', async function initializeGame() {
  try {
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

    let response = '';
    if (archiveDate) {
      response = await fetch('/api/get-movie?date=' + archiveDate);
    }
    else{
      response = await fetch('/api/get-movie');
    }
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();

    correctMovieID = data.movieID;
      correctMovieDate = data.date;
      formattedMovieDate = new Date(correctMovieDate).toLocaleDateString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Try to get correctMovieObject from localStorage game history if available
      let history = JSON.parse(localStorage.getItem('gameHistory')) || [];
      let gameObj = history.find(g => g.id === correctMovieID);
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

    for (let i = 0; i < MAX_GUESSES; i++) {
      await fetchData(correctMovieID, correctMovieDate, i);
    }

    let game_in_progress = loadOngoingGame(correctMovieID, correctMovieDate);

    // Game was lost or won (completed)
    if (hasGameBeenPlayed(correctMovieID)) {
      finishGame(hasGameBeenWon(correctMovieID));
    }
    // Game was attempted but not completed
    else if (game_in_progress) {
      textDisplay.innerHTML = `<div id="textDisplay"><span class="message">You have an incomplete game for this movie. Continue guessing or skip!</span>`;
      incorrectGuessCount = ongoingGame.guesses.length;
      collectedGuesses = [...ongoingGame.guesses];
      currentReviewJSONs = allReviewJSONs.slice(0, incorrectGuessCount + 1);
      updateReviewNumButtons();
      // Show the last review the user unlocked, not always the first
      if (incorrectGuessCount > 0) {
        displayCurrentReview(incorrectGuessCount + 1);
      } else {
        displayCurrentReview();
      }
      
      shareButton.style.display = 'none';
    }
    // New game
    else {
      if (archiveDate) {
        textDisplay.innerHTML = `<div id="textDisplay"><span class="message">You get 5 reviews (one at a time) to guess the movie. You can skip. Check your history and stats once you've played a few times. Have fun!</span>`;
      }
      else {
        textDisplay.innerHTML = `<div id="textDisplay"><span class="message">You get 5 reviews (one at a time) to guess the movie. You can skip. Click on "About & Policies" in the navbar to learn more or on "History & Stats" to check your history and stats once you've played a few times. The movie updates every day at 12AM EST. Have fun!</span>`;
      }
      updateReviewNumButtons();
      displayCurrentReview();
      
      // Hide share button for new games
      shareButton.style.display = 'none';

    }

    if (archiveDate) {
      dateDisplay.innerHTML = `<h2>Archive (${formattedMovieDate})</h2>`;
    }
    else {
      dateDisplay.innerHTML = `<h2>Today's movie (${formattedMovieDate})</h2>`;
    }

  }
  catch (error) {
    console.error('Error during initialization:', error);
  }
});