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
        if (err || files.length === 0) {
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


// Endpoint to get all images from the reviews folder of a movie
app.get('/images', (req, res) => {
    const date = req.query.date;
    const movieID = req.query.name;
    const index = parseInt(req.query.index, 10);
    const reviewsPath = path.join(__dirname, 'movie', date, movieID, 'images');

    fs.readdir(reviewsPath, (err, files) => {
        if (err || files.length === 0) {
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

// Endpoint to get the selected movie from the "movie" folder
app.get('/get-movie', (req, res) => {
    const movieDir = path.join(__dirname, 'movie');
    fs.readdir(movieDir, (err, dateFolders) => {
        if (err || dateFolders.length === 0) {
            res.status(404).json({ error: 'No date folders found or an error occurred' });
            return;
        }
        // Assume there's only one date folder (e.g. today's date)
        const dateFolder = dateFolders[0];
        const movieFolderPath = path.join(movieDir, dateFolder);
        fs.readdir(movieFolderPath, (err, movieFolders) => {
            if (err || movieFolders.length === 0) {
                res.status(404).json({ error: 'No movie folders found or an error occurred' });
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