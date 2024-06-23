let movieData = [];
var currentMovie = ''; // Global variable

// Load the CSV file and parse it
fetch('movies.csv')
    .then(response => response.text())
    .then(data => {
        Papa.parse(data, {
            header: true,
            complete: function(results) {
                movieData = results.data; // Store the entire row data
            }
        });
    });

// Function to clear search input and movie list
function clearSearchAndMovies() {
    // Clear search input
    document.getElementById('search').value = '';
    
    // Clear movie list
    const movieList = document.getElementById('movieList');
    movieList.innerHTML = '';
}

function refresh() {
    currentMovieDisplay.innerHTML = ``;
    clearSearchAndMovies();
    fetch('/random-movie')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        currentMovie = data.movie;
        displayRandomImage(currentMovie);
    })
    .catch(error => {
        console.error('Error fetching random movie:', error);
    });

}
    

// Function to display movies
function displayMovies(movies) {
    const movieList = document.getElementById('movieList');
    movieList.innerHTML = '';
    const moviesToShow = movies.slice(0, 10); // Only show the first 10 movies
    moviesToShow.forEach(movie => {
        const li = document.createElement('li');
        li.textContent = `${movie.title} (${movie.year})`;
        li.onclick = () => selectMovie(movie.movieID);
        movieList.appendChild(li);
    });
}

// Function to filter movies based on search input
function filterMovies() {
    const query = document.getElementById('search').value.toLowerCase();
    if (query === '') {
        document.getElementById('movieList').innerHTML = '';
        return;
    }
    const filteredMovies = movieData.filter(movie => movie.title.toLowerCase().includes(query));
    displayMovies(filteredMovies);
}

// Function to handle movie selection
function selectMovie(movieID) {
    const selectedMovie = movieID === currentMovie;
    const currentMovieDisplay = document.getElementById('currentMovieDisplay');
    const movie = movieData.find(movie => movie.movieID === movieID);
    console.log(movie);
    if (movie) {
        if (selectedMovie) {
            currentMovieDisplay.innerHTML = `<a href="https://letterboxd.com/film/${movieID}" style="text-decoration:none; color:white;" target="_blank">${`You got it! ${movie.title} (${movie.year}) is the correct movie.`}</a>`;
            clearSearchAndMovies();
        } else {
            currentMovieDisplay.innerHTML = `<a href="https://letterboxd.com/film/${movieID}" style="text-decoration:none; color:white;" target="_blank">${`Wrong! ${movie.title} (${movie.year}) is not the correct movie.`}</a>`;
            clearSearchAndMovies();
        }
    }
}

// Function to display a random image from the reviews folder
function displayRandomImage(folderName) {
    fetch(`/random-image?name=${folderName}`)
        .then(response => {
            if (response.status === 404) {
                return;
            }
            return response.blob();
        })
        .then(blob => {
            if (blob) {
                const imgContainer = document.getElementById('currentReview');
                if (imgContainer) {
                    imgContainer.innerHTML = ''; // Clear any existing content
                    const img = document.createElement('img');
                    img.id = 'randomImage';
                    img.src = URL.createObjectURL(blob);
                    imgContainer.appendChild(img);
                } else {
                    console.error('Div with ID "currentReview" not found.');
                }
            }
        })
        .catch(error => {
            console.error('Error fetching random image:', error);
        });
}

// Fetch and display a random movie on page load
fetch('/random-movie')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        currentMovie = data.movie;
        displayRandomImage(currentMovie);
    })
    .catch(error => {
        console.error('Error fetching random movie:', error);
    });
