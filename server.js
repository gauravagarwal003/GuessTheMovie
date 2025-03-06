const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to check if a folder exists in "images" directory
app.get('/check-folder', (req, res) => {
    const folderName = req.query.name;
    const folderPath = path.join(__dirname, 'images', folderName);

    fs.access(folderPath, fs.constants.F_OK, (err) => {
        if (err) {
            res.json({ exists: false });
        } else {
            res.json({ exists: true });
        }
    });
});

// Endpoint to get all the text for reviews of a movie
app.get('/text', (req, res) => {
    const date = req.query.date;
    const movieID = req.query.name;
    const index = parseInt(req.query.index, 10);
    const reviewsPath = path.join(__dirname, 'movie', date, movieID, 'text');

    fs.readdir(reviewsPath, (err, files) => {
        if (err) {
            res.status(404).json({ error: 'Error reading text directory' });
            return;
        }
        // Filter out hidden files (e.g., .DS_Store)
        files = files.filter(file => !file.startsWith('.'));
        if (files.length === 0) {
            res.status(404).json({ error: 'No text found or an error occurred' });
            return;
        }
        if (index >= 0 && index < files.length) {
            const textPath = path.join(reviewsPath, files[index]);
            res.sendFile(textPath);
        } else {
            res.status(404).json({ error: 'Text not found' });
        }
    });
});

// Endpoint to get all the links for reviews of a movie
app.get('/links', (req, res) => {
    const date = req.query.date;
    const movieID = req.query.name;
    const index = parseInt(req.query.index, 10);
    const reviewsPath = path.join(__dirname, 'movie', date, movieID, 'links');

    fs.readdir(reviewsPath, (err, files) => {
        if (err) {
            res.status(404).json({ error: 'Error reading links directory' });
            return;
        }
        // Filter out hidden files (e.g., .DS_Store)
        files = files.filter(file => !file.startsWith('.'));
        if (files.length === 0) {
            res.status(404).json({ error: 'No links found or an error occurred' });
            return;
        }
        if (index >= 0 && index < files.length) {
            const linkPath = path.join(reviewsPath, files[index]);
            res.sendFile(linkPath);
        } else {
            res.status(404).json({ error: 'Link not found' });
        }
    });
});


// Endpoint to get all images from the reviews folder of a movie
app.get('/images', (req, res) => {
    const date = req.query.date;
    const movieID = req.query.name;
    const index = parseInt(req.query.index, 10);
    const reviewsPath = path.join(__dirname, 'movie', date, movieID, 'images');

    fs.readdir(reviewsPath, (err, files) => {
        if (err) {
            res.status(404).json({ error: 'Error reading images directory' });
            return;
        }
        // Filter out hidden files (e.g., .DS_Store)
        files = files.filter(file => !file.startsWith('.'));
        if (files.length === 0) {
            res.status(404).json({ error: 'No images found or an error occurred' });
            return;
        }
        if (index >= 0 && index < files.length) {
            const imagePath = path.join(reviewsPath, files[index]);
            res.sendFile(imagePath);
        } else {
            res.status(404).json({ error: 'Image not found' });
        }
    });
});

// Updated endpoint to get the selected movie from the "movie" folder,
// filtering out hidden files (like .DS_Store) from both the date folders and movie folders.
app.get('/get-movie', (req, res) => {
    const movieDir = path.join(__dirname, 'movie');
    fs.readdir(movieDir, (err, dateFolders) => {
        if (err) {
            console.error("Error reading movie directory:", err);
            res.status(404).json({ error: 'Error reading movie directory' });
            return;
        }
        // Filter out hidden files (e.g., .DS_Store)
        dateFolders = dateFolders.filter(folder => !folder.startsWith('.'));
        if (dateFolders.length === 0) {
            res.status(404).json({ error: 'No valid date folders found' });
            return;
        }
        // Assume there's only one date folder (e.g. today's date)
        const dateFolder = dateFolders[0];
        const movieFolderPath = path.join(movieDir, dateFolder);
        fs.readdir(movieFolderPath, (err, movieFolders) => {
            if (err) {
                console.error("Error reading movie folder:", err);
                res.status(404).json({ error: 'Error reading movie folder' });
                return;
            }
            // Filter out hidden files (e.g., .DS_Store)
            movieFolders = movieFolders.filter(movie => !movie.startsWith('.'));
            if (movieFolders.length === 0) {
                res.status(404).json({ error: 'No valid movie folders found' });
                return;
            }
            // Assume there's only one movie folder
            const movieID = movieFolders[0];
            res.json({ movie: movieID, date: dateFolder });
        });
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});