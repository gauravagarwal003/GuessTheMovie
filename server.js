const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

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

// Endpoint to get a random image from the reviews folder of a movie
app.get('/random-image', (req, res) => {
    const folderName = req.query.name;
    const reviewsPath = path.join(__dirname, 'images', folderName);

    // Log the reviewsPath to check if it is correct
    console.log(`Reviews path: ${reviewsPath}`);

    fs.readdir(reviewsPath, (err, files) => {
        if (err || files.length === 0) {
            res.status(404).json({ error: 'No images found or an error occurred' });
            return;
        }

        const randomImage = files[Math.floor(Math.random() * files.length)];
        res.sendFile(path.join(reviewsPath, randomImage));
    });
});

app.get('/random-movie', (req, res) => {
    const imagesPath = path.join(__dirname, 'images');

    fs.readdir(imagesPath, (err, folders) => {
        if (err || folders.length === 0) {
            res.status(404).json({ error: 'No folders found or an error occurred' });
            return;
        }

        const randomFolder = folders[Math.floor(Math.random() * folders.length)];
        res.json({ movie: randomFolder });
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
