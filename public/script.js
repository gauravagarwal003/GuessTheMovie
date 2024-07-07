let moviesData = [];
let correctMovieID = '';
let incorrectGuessCount = 0;
let reviewImages = [];
let currentImageIndex = 1;
let gameOver = false;
const maxMoviesToShow = 10;
const selectedColumns = ['title', 'year', 'movieID', 'posterLink']; // Columns to select from the CSV file
const maxIncorrectGuesses = 5;


const imageButtonsContainer = document.getElementById('imageButtons');
const multiButton = document.querySelector('button[id="multi-button"]');
const textDisplay = document.getElementById('textDisplay');
textDisplay.innerHTML = `<a style="color:white;">You have ${maxIncorrectGuesses} tries to guess the movie. For every wrong guess, you will get a new review. Search and click on a movie to submit it. Good luck!</a>`;


// Function to filter movies based on search input
function filterMovies() {
    const searchQuery = document.getElementById('search').value.toLowerCase();
    if (searchQuery === '') {
        clearSearchAndMovieList();
        return;
    }
    const filteredMovies = moviesData.filter(movie => movie.title.toLowerCase().includes(searchQuery));
    displayMovieList(filteredMovies);
}

// Function to display movie list
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

// Function to handle movie selection
function selectMovie(guessedMovieID) {
    const guessedMovie = moviesData.find(movie => movie.movieID === guessedMovieID);
    const correctMovie = moviesData.find(movie => movie.movieID === correctMovieID);
    const isCorrectMovie = guessedMovieID === correctMovieID;

    if (isCorrectMovie) {
        textDisplay.innerHTML = `<a href="https://letterboxd.com/film/${guessedMovieID}" style="text-decoration:none; color:white;" target="_blank">You got it! ${guessedMovie.title} (${guessedMovie.year}) is the correct movie.</a>`;
        finishGame();
    } else {
        incorrectGuessCount++;
        textDisplay.innerHTML = `<a href="https://letterboxd.com/film/${guessedMovieID}" style="text-decoration:none; color:white;" target="_blank">Wrong! ${guessedMovie.title} (${guessedMovie.year}) is not the correct movie.</a>`;
        clearSearchAndMovieList();
        if (incorrectGuessCount < maxIncorrectGuesses) {
            fetchRandomImage(correctMovieID);
        } else {
            textDisplay.innerHTML = `<a href="https://letterboxd.com/film/${correctMovieID}" style="text-decoration:none; color:white;" target="_blank">You lost! The correct movie is ${correctMovie.title} (${correctMovie.year}).</a>`;
            finishGame();
        }
    }
}

function finishGame() {
    clearSearchAndMovieList();
    gameOver = true;
    multiButton.textContent = 'Play Again';
    document.getElementById('search').remove();

    const img = document.createElement('img');
    const correctMovie = moviesData.find(movie => movie.movieID === correctMovieID);
    img.src = correctMovie.posterLink;
    const existingDiv = document.getElementById('movie_poster');
    if (existingDiv) {
        existingDiv.innerHTML = '';  
        existingDiv.appendChild(img);
    } else {
        console.error('Div with specified ID not found.');
    }
    existingDiv.setAttribute("href", "https://letterboxd.com/film/" + correctMovieID);
    existingDiv.setAttribute("target", "_blank"); // Add this line to open in a new tab
    const parent = document.getElementById('content-wrap');
    const div1 = document.getElementById('textDisplay');
    parent.appendChild(div1);
    const search_row = document.getElementById('search-row');
    search_row.style.margin = "0px";

  
}

// Function to skip guess 
function pressButton() {
    if (gameOver) {
        location.reload();
    } else {
        incorrectGuessCount++;
        clearSearchAndMovieList();
        console.log('Incorrect guess count:', incorrectGuessCount);
        if (incorrectGuessCount < maxIncorrectGuesses) {
            fetchRandomImage(correctMovieID);
            if (maxIncorrectGuesses - incorrectGuessCount == 1) {
                guessString = "1 guess"
            }
            else{
                guessString = `${maxIncorrectGuesses - incorrectGuessCount} guesses`
            }
            textDisplay.innerHTML = `<a style="text-decoration:none; color:white;" target="_blank">You skipped! You have ${guessString} left.</a>`;
        } else {
            const correctMovie = moviesData.find(movie => movie.movieID === correctMovieID);
            textDisplay.innerHTML = `<a style="text-decoration:none; color:white;" target="_blank">You lost! The correct movie is ${correctMovie.title} (${correctMovie.year}).</a>`;
            finishGame();
        }
    }
}

// Function to clear search input and movie list
function clearSearchAndMovieList() {
    document.getElementById('search').value = '';
    document.getElementById('movieList').innerHTML = '';
}

// Function to display a random image from the reviews folder
function fetchRandomImage(movieName) {
    fetch(`/random-image?name=${movieName}`)
        .then(response => {
            if (response.status === 404) return;
            return response.blob();
        })
        .then(blob => {
            if (blob) {
                const imageUrl = URL.createObjectURL(blob);
                reviewImages.push(imageUrl);
                updateImageButtons();
                displayCurrentImage();

            }
        })
        .catch(error => console.error('Error fetching random image:', error));
}

// Function to display the current image in the reviewImages array
function displayCurrentImage(index = currentImageIndex) {
    const reviewContainer = document.getElementById('reviewContainer');
    reviewContainer.innerHTML = ''; // Clear any existing content
    if (reviewImages.length > 0) {
        const img = document.createElement('img');
        img.id = 'reviewImage';
        img.src = reviewImages[index - 1];
        reviewContainer.appendChild(img);
    }
}

function makeButtonActive(index) {
    const buttons = document.querySelectorAll('#imageButtons button');
    buttons.forEach(button => {
        if (button.textContent === index) {
            button.classList.toggle('active', true);
        } else {
            button.classList.toggle('active', false);
        }
    });
}

// Function to update image navigation buttons
function updateImageButtons() {
    currentImageIndex = reviewImages.length;
    const button = document.createElement('button');
    button.textContent = currentImageIndex;
    button.onclick = () => {
        displayCurrentImage(button.textContent);
        makeButtonActive(button.textContent);

    };
    imageButtonsContainer.appendChild(button);
    makeButtonActive(button.textContent);

}

// Load the CSV file and parse it
fetch('movies.csv')
    .then(response => response.text())
    .then(data => {
        Papa.parse(data, {
            header: true,
            complete: results => {
                moviesData = results.data.map(row => {
                    let selectedRow = {};
                    selectedColumns.forEach(col => {
                        selectedRow[col] = row[col];
                    });
                    return selectedRow;
                });
            }
        });
    });


// Fetch and display a random movie on page load
fetch('/random-movie')
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    })
    .then(data => {
        correctMovieID = data.movie;
        fetchRandomImage(correctMovieID);
    })
    .catch(error => console.error('Error fetching random movie:', error));