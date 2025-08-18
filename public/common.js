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

// Prevent archiveDate from being set if it's the latest day (today)
if (archiveDate) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  if (archiveDate === todayStr) {
    archiveDate = null;
  }
}

// Update the title if archive movie
if (archiveDate) {
  document.title = "Guess The Movie | Archive";
}

// Global constants for the game
const SKIPPED_GUESS = '__SKIPPED__'; // Sentinel value to indicate a skipped guess
const MAX_NUM_MOVIES_TO_SHOW = 50;
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



// Update game based on the movie the user selected
function selectMovie(guessedMovieID) {
  const guessedMovie = allMovies.find(movie => movie.movieID === guessedMovieID);
  const isCorrectMovie = guessedMovieID === correctMovieID;
  
  if (isCorrectMovie) {
    // Won game
    collectedGuesses.push(guessedMovie.movieID);
    finishGame(true);
  } else {
    // Incorrect guess
    handleGuess(guessedMovie);
  }
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
    textDisplay.innerHTML = `<div id="textDisplay">${gameOverMessage}<span class="message"></span><a href="https://letterboxd.com/film/${correctMovieID}" class="text-link" target="_blank">${correctMovieObject.title} (${correctMovieObject.year})</a><span class="message"> is the correct movie.</span><br><span class="message"> Come back tomorrow to play again!</span></div>`;
  }
  else {
    textDisplay.innerHTML = `<div id="textDisplay">${gameOverMessage}<span class="message"></span><a href="https://letterboxd.com/film/${correctMovieID}" class="text-link" target="_blank">${correctMovieObject.title} (${correctMovieObject.year})</a><span class="message"> is the correct movie.</span><br></div>`;
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
    <a href="https://letterboxd.com/film/${guess.movieID}" class="text-link" target="_blank">
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


function filterMovies(event) {
  const allowedRegex = /^[a-zA-Z0-9 !@#$ﬂ&*()_+\-=\~`{}|:"<>?$$\\;',./]$/;

  // Only process if the key pressed matches allowed characters
  if (event.key !== undefined && event.key !== "Backspace" && !allowedRegex.test(event.key)) {
    return;
  }

  const searchQuery = document.getElementById("search").value.trim().toLowerCase();

  if (searchQuery === "") {
    clearSearchAndMovieList();
    return;
  }

  // Use Fuse for fuzzy search
  const results = fuse.search(searchQuery);

  // Map back to original movie objects
  const filteredMovies = results
    .slice(0, MAX_NUM_MOVIES_TO_SHOW)
    .map(result => result.item);

  displayMovieList(filteredMovies);
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
    initializeFuse();
    if (!isArchivePage) {
      let response = '';
      if (archiveDate) {
        response = await fetch('/api/get-movie?date=' + archiveDate);
      }
      else if (!isArchivePage) {
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
                cell.classList.add("clickable-cell");
                // Only show clickable if the date isn't today
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const todayStr = `${yyyy}-${mm}-${dd}`;
                if (dateStr !== todayStr) {
                  cell.onclick = function () {
                    window.location.href = "/archive/" + dateStr;
                  };
                } else {
                  cell.onclick = function () {
                    window.location.href = "/";
                  };
                }
                cell.textContent = day; // Display the day number
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
  }
  catch (error) {
    console.error('Error during initialization:', error);
  }

});