// Global variables and constants
let moviesData = [];
let correctMovieID = '';
let incorrectGuessCount = 0;
let reviewImages = [];
let reviewTexts = [];
let allImages = [];
let allText = [];   
let collectedGuessesArray = [];
let currentImageIndex = 1;
let gameOver = false;
let correctMovieDate = '';

const maxMoviesToShow = 10;
const selectedColumns = ['title', 'year', 'movieID', 'posterLink']; // Columns to select from the CSV file
const maxIncorrectGuesses = 5;

const imageButtonsContainer = document.getElementById('imageButtons');
const multiButton = document.querySelector('button[id="multi-button"]');
const statsDisplay = document.getElementById('statsDisplay');

// Global game stats from localStorage
var globalGameStats = JSON.parse(localStorage.getItem('gameStats')) || {
    games: [],
    totalPlayed: 0,
    totalWon: 0
};

function hasGameBeenPlayed(correctMovieID, stats) {
    if (!stats) return false;
    console.log("Checking for game:", correctMovieID);
    return stats.games.some(game => game.correctMovieID === correctMovieID);
}

// ---------------------------
// UI update helper function
// ---------------------------
function updateStatsDisplay() {
  statsDisplay.innerHTML = `<a style="color:white;">You have played ${globalGameStats.totalPlayed} games and won ${globalGameStats.totalWon} of them.</a>`;
}

// ---------------------------
// Starter functions (e.g., filtering, displaying, game logic)
// ---------------------------
function filterMovies() {
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

function displayMovieList(movies) {
    const movieListElement = document.getElementById('movieList');
    movieListElement.innerHTML = '';
    movies.slice(0, maxMoviesToShow).forEach(movie => {
        const listItem = document.createElement('li');
        listItem.textContent = `${movie.title} (${movie.year})`;
        listItem.onclick = () => selectMovie(movie.movieID);
        movieListElement.appendChild(listItem);
    });
}

function selectMovie(guessedMovieID) {
    collectedGuessesArray.push(guessedMovieID);
    const guessedMovie = moviesData.find(movie => movie.movieID === guessedMovieID);
    const correctMovie = moviesData.find(movie => movie.movieID === correctMovieID);
    const isCorrectMovie = guessedMovieID === correctMovieID;
    
    const textDisplay = document.getElementById('textDisplay');
    if (isCorrectMovie) {
        textDisplay.innerHTML = `<a href="https://letterboxd.com/film/${guessedMovieID}" style="text-decoration:none; color:white;" target="_blank">
            You got it! ${guessedMovie.title} (${guessedMovie.year}) is the correct movie.
        </a>`;
        finishGame();
    } else {
        incorrectGuessCount++;
        let guessString = (maxIncorrectGuesses - incorrectGuessCount === 1) ? "1 guess" : `${maxIncorrectGuesses - incorrectGuessCount} guesses`;
        textDisplay.innerHTML = `<a href="https://letterboxd.com/film/${guessedMovieID}" style="text-decoration:none; color:white;" target="_blank">
            Wrong! ${guessedMovie.title} (${guessedMovie.year}) is not the correct movie. You have ${guessString} left. Switch between reviews to get more info!
        </a>`;
        clearSearchAndMovieList();
        if (incorrectGuessCount < maxIncorrectGuesses) {
            reviewImages = allImages.slice(0, incorrectGuessCount + 1);
            reviewTexts = allText.slice(0, incorrectGuessCount + 1);
            updateImageButtons();
            displayCurrentImage(incorrectGuessCount + 1);
        } else {
            textDisplay.innerHTML = `<a href="https://letterboxd.com/film/${correctMovieID}" style="text-decoration:none; color:white;" target="_blank">
                You lost! The correct movie is ${correctMovie.title} (${correctMovie.year}).
            </a>`;
            finishGame();
        }
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
    }
}

function updateGameStats(currentGame) {
    console.log('Updating game stats');
    let stats = localStorage.getItem('gameStats');
    stats = stats ? JSON.parse(stats) : {
      games: [],
      totalPlayed: 0,
      totalWon: 0
    };

    stats.games.push(currentGame);
    stats.totalPlayed += 1;
    if (currentGame.won) {
        stats.totalWon += 1;
    }
    localStorage.setItem('gameStats', JSON.stringify(stats));
}

function finishGame() {
    clearSearchAndMovieList();
    if (incorrectGuessCount < maxIncorrectGuesses) {
        reviewImages = allImages.slice(0, maxIncorrectGuesses);
        reviewTexts = allText.slice(0, maxIncorrectGuesses);
        updateImageButtons();
    }
    gameOver = true;
    multiButton.setAttribute('aria-label', 'Play Again');
    multiButton.textContent = 'Play Again';
    document.getElementById('search').remove();

    const img = document.createElement('img');
    const correctMovie = moviesData.find(movie => movie.movieID === correctMovieID);
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
            date: new Date().toISOString().split('T')[0],
            title: correctMovie.title,
            year: correctMovie.year,
            posterLink: correctMovie.posterLink
        };
        updateGameStats(currentGame);
    }
    updateStatsDisplay(); // Display updated stats
}

function pressButton() {
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    if (gameOver) {
        location.reload();
    } else {
        incorrectGuessCount++;
        clearSearchAndMovieList();
        if (incorrectGuessCount < maxIncorrectGuesses) {
            reviewImages = allImages.slice(0, incorrectGuessCount + 1);
            reviewTexts = allText.slice(0, incorrectGuessCount + 1);
            updateImageButtons();
            displayCurrentImage(incorrectGuessCount + 1);
            let guessString = (maxIncorrectGuesses - incorrectGuessCount === 1) ? "1 guess" : `${maxIncorrectGuesses - incorrectGuessCount} guesses`;
            document.getElementById('textDisplay').innerHTML = `<a style="text-decoration:none; color:white;" target="_blank">
                You skipped! You have ${guessString} left. Switch between reviews to get more info!
            </a>`;
        } else {
            const correctMovie = moviesData.find(movie => movie.movieID === correctMovieID);
            document.getElementById('textDisplay').innerHTML = `<a href="https://letterboxd.com/film/${correctMovieID}" style="text-decoration:none; color:white;" target="_blank">
                You lost! The correct movie is ${correctMovie.title} (${correctMovie.year}).
            </a>`;
            finishGame();
        }
    }
}

function clearSearchAndMovieList() {
    document.getElementById('search').value = '';
    document.getElementById('movieList').innerHTML = '';
}

async function fetchImages(movieID, date, index) {
    try {
        const response1 = await fetch(`/images?date=${date}&name=${movieID}&index=${index}`);
        const response2 = await fetch(`/text?date=${date}&name=${movieID}&index=${index}`);
        if (response1.status === 404 || response2.status === 404) return;
        const blob1 = await response1.blob();
        const blob2 = await response2.text();
        const imageUrl = URL.createObjectURL(blob1);
        allImages.push(imageUrl);
        allText.push(blob2);
        if (index === 0) {
            reviewImages.push(imageUrl);
            reviewTexts.push(blob2);
        }
        updateImageButtons();
        displayCurrentImage();
    } catch (error) {
        console.error('Error fetching image/text:', error);
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
        const correctMovie = moviesData.find(movie => movie.movieID === correctMovieID);
        img.alt = `Review: ${reviewTexts[index - 1]}`;
        img.id = 'reviewImage';
        img.src = reviewImages[index - 1];
        reviewContainer.appendChild(img);
    }
}

function makeButtonActive(index) {
    const buttons = document.querySelectorAll('#imageButtons button');
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
        };
        imageButtonsContainer.appendChild(button);
    });
    makeButtonActive(incorrectGuessCount + 1);
}

// ---------------------------
// Initialize the game (all starter logic here)
// ---------------------------
document.addEventListener('DOMContentLoaded', async function initializeGame() {
    try {
        // Load CSV file and parse movie data
        const csvResponse = await fetch('movies.csv');
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
        const response = await fetch('/get-movie');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        correctMovieID = data.movie;
        correctMovieDate = data.date;

        // Fetch all images and text for the movie
        await fetchAllImagesSequentially(correctMovieID, correctMovieDate);

        // Check if this game has already been played.
        if (hasGameBeenPlayed(correctMovieID, globalGameStats)) {
            console.log("Game has been played before");
            finishGame();
        } else {
            const textDisplay = document.getElementById('textDisplay');
            textDisplay.innerHTML = `<a style="color:white;">You have ${maxIncorrectGuesses} tries to guess the movie. For every incorrect guess, you'll get a new review. You can switch between reviews. Search and click on a movie to submit it. Good luck!</a>`;
        }
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});
