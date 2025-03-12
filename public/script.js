// Global variables and constants
let moviesData = [];
let correctMovieID = '';
let incorrectGuessCount = 0;
let reviewImages = [];
let reviewTexts = [];
let allLinks = [];
let links = [];
let allImages = [];
let allText = [];
let collectedGuessesArray = [];
let currentImageIndex = 1;
let gameOver = false;
let correctMovieDate = '';
let correctMovie = '';
let currentSelectionIndex = -1;

const SKIPPED_GUESS = '__SKIPPED__'; // Sentinel value to indicate a skipped guess
const maxMoviesToShow = 10;
const selectedColumns = ['title', 'year', 'movieID', 'posterLink']; // Columns to select from the CSV file
const maxIncorrectGuesses = 5;
const imageButtonsContainer = document.getElementById('imageButtons');
const skipButton = document.querySelector('button[id="skip-button"]');

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
    if (game.guesses[i] === SKIPPED_GUESS){ 
      guessText += `skipped, `;
    } 
    else{
      const foundMovie = moviesData.find(movie => movie.movieID === game.guesses[i]);
      realGuessCount++;
      console.log(game.guesses[i]);
      if (game.guesses[i] === game.correctMovieID){
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

  if (realGuessCount <= 0){
    return `
    <p class = "historyFirstLine">On ${formattedDate}, the movie was ${game.title} (${game.year}).</p> 
    <p class = "historySecondLine">You ${resultText} and did not guess any movies.</p>
    `;
  }
  else{
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
  makeButtonActive('displayHistoryButton');
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
  if (event.key !== "Backspace" && !allowedRegex.test(event.key)) {
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
      reviewImages = allImages.slice(0, incorrectGuessCount + 1);
      reviewTexts = allText.slice(0, incorrectGuessCount + 1);
      links = allLinks.slice(0, incorrectGuessCount + 1);
      updateImageButtons();
      displayCurrentImage(incorrectGuessCount + 1);
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
      if (guess !== SKIPPED_GUESS){
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
  const textDisplay = document.getElementById('textDisplay');
  gameOverMessage = wonGame ? "You got it! " : "You lost. ";
  textDisplay.innerHTML = `<div id="textDisplay">${gameOverMessage}<span class="message"></span><a href="https://letterboxd.com/film/${correctMovieID}" class="movie-link" target="_blank">${correctMovie.title} (${correctMovie.year})</a><span class="message"> is the correct movie.</span><br><span class="message"> Come back tomorrow to play again!</span></div>`;


  clearSearchAndMovieList();
  if (incorrectGuessCount < maxIncorrectGuesses) {
    reviewImages = allImages.slice(0, maxIncorrectGuesses);
    reviewTexts = allText.slice(0, maxIncorrectGuesses);
    links = allLinks.slice(0, maxIncorrectGuesses);
    updateImageButtons();
  }

  skipButton.remove();
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
  displayCurrentImage(currentImageIndex);
}

function pressSkipButton() {
  collectedGuessesArray.push(SKIPPED_GUESS);
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
    reviewImages = allImages.slice(0, incorrectGuessCount + 1);
    reviewTexts = allText.slice(0, incorrectGuessCount + 1);
    links = allLinks.slice(0, incorrectGuessCount + 1);
    updateImageButtons();
    displayCurrentImage(incorrectGuessCount + 1);
    let guessString = (maxIncorrectGuesses - incorrectGuessCount === 1) ? "1 guess" : `${maxIncorrectGuesses - incorrectGuessCount} guesses`;
    document.getElementById('textDisplay').innerHTML = `<a style="text-decoration:none; color:white;" target="_blank">
              You skipped! You have ${guessString} left. Switch between reviews to get more info!
          </a>`;
  } 
  else {
    finishGame(false);
  }
}

function clearSearchAndMovieList() {
  document.getElementById('search').value = '';
  document.getElementById('movieList').innerHTML = '';
}

async function fetchImages(movieID, date, index) {
  try {
    const response1 = await fetch(`/api/images?date=${date}&name=${movieID}&index=${index}`);
    const response2 = await fetch(`/api/text?date=${date}&name=${movieID}&index=${index}`);
    const response3 = await fetch(`/api/links?date=${date}&name=${movieID}&index=${index}`);
    if (response1.status === 404 || response2.status === 404 || response3.staus === 404) return;
    const blob1 = await response1.blob();
    const blob2 = await response2.text();
    const blob3 = await response3.text();
    const imageUrl = URL.createObjectURL(blob1);
    allImages.push(imageUrl);
    allText.push(blob2);
    allLinks.push(blob3);
    if (index === 0) {
      reviewImages.push(imageUrl);
      reviewTexts.push(blob2);
      links.push(blob3);
    }
  } catch (error) {
    console.error('Error fetching image, text, or link:', error);
  }
}

async function fetchAllImagesSequentially(movieID, date) {
  for (let i = 0; i < maxIncorrectGuesses; i++) {
    await fetchImages(movieID, date, i);
  }
}

function displayCurrentImage(index = 1) {
  const reviewContainer = document.getElementById('reviewContainer');
  reviewContainer.innerHTML = '';
  if (reviewImages.length > 0) {
    const img = document.createElement('img');
    img.classList.add('movie-poster-img');
    img.alt = `Review: ${reviewTexts[index - 1]}`;
    img.id = 'reviewImage';
    img.src = reviewImages[index - 1];

    if (gameOver) {
      const link = document.createElement('a');
      link.href = links[index - 1]; // Replace with your desired URL
      link.target = '_blank'; // Opens the link in a new tab
      link.appendChild(img);
      reviewContainer.appendChild(link);
    } else {
      reviewContainer.appendChild(img);
    }
  }
}

function makeButtonActive(index) {
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.classList.toggle('active', button.textContent == index);
  });
}

function updateImageButtons() {
  imageButtonsContainer.innerHTML = '';
  reviewImages.forEach((image, index) => {
    const button = document.createElement('button');
    button.textContent = index + 1;
    button.onclick = () => {
      displayCurrentImage(button.textContent);
      makeButtonActive(button.textContent);
      currentImageIndex = button.textContent;
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
    if (currentImageIndex < reviewImages.length){
      displayCurrentImage(currentImageIndex + 1);
      makeButtonActive(currentImageIndex + 1);
      currentImageIndex = currentImageIndex + 1;
    }
  }
  else if (event.key === 'ArrowLeft') {
    if (currentImageIndex > 1){
      displayCurrentImage(currentImageIndex - 1);
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
    correctMovie = moviesData.find(movie => movie.movieID === correctMovieID);

    // Fetch all images, text, and links for the movie
    await fetchAllImagesSequentially(correctMovieID, correctMovieDate);
    document.getElementById('loading-overlay').style.display = 'none';
  

    // Check if this game has already been played.
    if (hasGameBeenPlayed(correctMovieID, globalGameStats)) {
      finishGame(hasGameBeenWon(correctMovieID, globalGameStats));
    }
    updateImageButtons();
    displayCurrentImage();

    hoverCoffee();
    hoverLetterboxd();
    hoverHistory();
    hoverStats();
    hoverInstructions();

  } catch (error) {
    console.error('Error during initialization:', error);
  }
});