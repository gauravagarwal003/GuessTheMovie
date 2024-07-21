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

// Endpoint to get all images from the reviews folder of a movie
app.get('/images', (req, res) => {
    const folderName = req.query.name;
    const index = parseInt(req.query.index, 10);
    const reviewsPath = path.join(__dirname, 'images', folderName);

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

// Endpoint to get a random movie
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