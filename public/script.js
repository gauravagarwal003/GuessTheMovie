let moviesData = [];
let correctMovieID = '';
let incorrectGuessCount = 0;
let reviewImages = [];
let allImages = [];
let currentImageIndex = 1;
let gameOver = false;
const maxMoviesToShow = 10;
const selectedColumns = ['title', 'year', 'movieID', 'posterLink']; // Columns to select from the CSV file
const maxIncorrectGuesses = 5;

const imageButtonsContainer = document.getElementById('imageButtons');
const multiButton = document.querySelector('button[id="multi-button"]');
const textDisplay = document.getElementById('textDisplay');
textDisplay.innerHTML = `<a style="color:white;">You have ${maxIncorrectGuesses} tries to guess the movie. For every incorrect guess, you'll get a new review. You can switch between reviews. Search and click on a movie to submit it. Good luck!</a>`;

// Function to filter movies based on search input
function filterMovies() {
    const searchQuery = document.getElementById('search').value.toLowerCase();
    if (searchQuery === '') {
        clearSearchAndMovieList();
        return;
    }
    const filteredMovies = moviesData.filter(movie => {
        const regex = new RegExp(`\\b${searchQuery}`, 'i'); // \b asserts position at a word boundary
        return regex.test(movie.title.toLowerCase());
    });
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
        if (maxIncorrectGuesses - incorrectGuessCount == 1) {
            guessString = "1 guess"
        }
        else{
            guessString = `${maxIncorrectGuesses - incorrectGuessCount} guesses`
        }

        textDisplay.innerHTML = `<a href="https://letterboxd.com/film/${guessedMovieID}" style="text-decoration:none; color:white;" target="_blank">Wrong! ${guessedMovie.title} (${guessedMovie.year}) is not the correct movie. You have ${guessString} left. Switch between reviews to get more info!</a>`;
        clearSearchAndMovieList();
        if (incorrectGuessCount < maxIncorrectGuesses) {
            reviewImages = allImages.slice(0, incorrectGuessCount + 1);
            updateImageButtons();
            displayCurrentImage(incorrectGuessCount + 1);
        } else {
            textDisplay.innerHTML = `<a href="https://letterboxd.com/film/${correctMovieID}" style="text-decoration:none; color:white;" target="_blank">You lost! The correct movie is ${correctMovie.title} (${correctMovie.year}).</a>`;
            finishGame();
        }
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);

    }
}

function finishGame() {
    clearSearchAndMovieList();
    if(incorrectGuessCount < maxIncorrectGuesses){
        reviewImages = allImages.slice(0, maxIncorrectGuesses);
        updateImageButtons();
    }
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
    // const orderDivs = ["reviewContainer", "allButtons","movie_container", "textDisplay"];
    // for (let i = 0; i < orderDivs.length; i++) {
    //     let current_div = document.getElementById(orderDivs[i]);
    //     parent.prepend(current_div);
    // }
    const div1 = document.getElementById('movie_container');
    parent.appendChild(div1);
    const search_row = document.getElementById('search-row');
    search_row.style.margin = "0px";
}

// Function to skip guess 
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
            updateImageButtons();
            displayCurrentImage(incorrectGuessCount + 1);
            if (maxIncorrectGuesses - incorrectGuessCount == 1) {
                guessString = "1 guess"
            }
            else{
                guessString = `${maxIncorrectGuesses - incorrectGuessCount} guesses`
            }
            textDisplay.innerHTML = `<a style="text-decoration:none; color:white;" target="_blank">You skipped! You have ${guessString} left. Switch between reviews to get more info!</a>`;
        } else {
            const correctMovie = moviesData.find(movie => movie.movieID === correctMovieID);
            textDisplay.innerHTML = `<a href="https://letterboxd.com/film/${correctMovieID}" style="text-decoration:none; color:white;" target="_blank">You lost! The correct movie is ${correctMovie.title} (${correctMovie.year}).</a>`;
            finishGame();
        }
    }
}

// Function to clear search input and movie list
function clearSearchAndMovieList() {
    document.getElementById('search').value = '';
    document.getElementById('movieList').innerHTML = '';
}

// Function to display all images from the reviews folder
async function fetchImages(movieName, index) {
    try {
        const response = await fetch(`/images?name=${movieName}&index=${index}`);
        if (response.status === 404) return;
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        allImages.push(imageUrl);
        if (index == 0) {
            reviewImages.push(imageUrl);
        }

        updateImageButtons();
        displayCurrentImage();
    } catch (error) {
        console.error('Error fetching random image:', error);
    }
}

async function fetchAllImagesSequentially(movieID) {
    for (let i = 0; i < maxIncorrectGuesses; i++) {
        await fetchImages(movieID, i);
    }
}


// Function to display the current image in the reviewImages array
function displayCurrentImage(index = 1) {
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
        if (button.textContent == index) {
            button.classList.toggle('active', true);
        } else {
            button.classList.toggle('active', false);
        }
    });
}

// Function to update image navigation buttons
function updateImageButtons() {
    imageButtonsContainer.innerHTML = ''; // Clear any existing buttons
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
        fetchAllImagesSequentially(correctMovieID);
    })
    .catch(error => console.error('Error fetching random movie:', error));