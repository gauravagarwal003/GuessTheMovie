// server.js
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const ViteExpress = require('vite-express');
const ngrok = require('ngrok');

const app = express();
const port = process.env.PORT || 3000;

/* 
  API endpoint to get all the text for reviews of a movie
  (expects query parameters: date, name, and index)
*/
app.get('/api/text', (req, res) => {
  const { date, name: movieID, index } = req.query;
  const reviewsPath = path.join(__dirname, 'movie', date, movieID, 'text');

  fs.readdir(reviewsPath, (err, files) => {
    if (err) {
      return res.status(404).json({ error: 'Error reading text directory' });
    }
    const validFiles = files.filter(file => !file.startsWith('.'));
    if (validFiles.length === 0) {
      return res.status(404).json({ error: 'No text found or an error occurred' });
    }
    const idx = parseInt(index, 10);
    if (idx >= 0 && idx < validFiles.length) {
      const textPath = path.join(reviewsPath, validFiles[idx]);
      return res.sendFile(textPath);
    }
    return res.status(404).json({ error: 'Text not found' });
  });
});

/* 
  API endpoint to get all the links for reviews of a movie 
*/
app.get('/api/links', (req, res) => {
  const { date, name: movieID, index } = req.query;
  const reviewsPath = path.join(__dirname, 'movie', date, movieID, 'links');

  fs.readdir(reviewsPath, (err, files) => {
    if (err) {
      return res.status(404).json({ error: 'Error reading links directory' });
    }
    const validFiles = files.filter(file => !file.startsWith('.'));
    if (validFiles.length === 0) {
      return res.status(404).json({ error: 'No links found or an error occurred' });
    }
    const idx = parseInt(index, 10);
    if (idx >= 0 && idx < validFiles.length) {
      const linkPath = path.join(reviewsPath, validFiles[idx]);
      return res.sendFile(linkPath);
    }
    return res.status(404).json({ error: 'Link not found' });
  });
});

/* 
  API endpoint to get all images from the reviews folder of a movie 
*/
app.get('/api/images', (req, res) => {
  const { date, name: movieID, index } = req.query;
  const reviewsPath = path.join(__dirname, 'movie', date, movieID, 'images');

  fs.readdir(reviewsPath, (err, files) => {
    if (err) {
      return res.status(404).json({ error: 'Error reading images directory' });
    }
    const validFiles = files.filter(file => !file.startsWith('.'));
    if (validFiles.length === 0) {
      return res.status(404).json({ error: 'No images found or an error occurred' });
    }
    const idx = parseInt(index, 10);
    if (idx >= 0 && idx < validFiles.length) {
      const imagePath = path.join(reviewsPath, validFiles[idx]);
      return res.sendFile(imagePath);
    }
    return res.status(404).json({ error: 'Image not found' });
  });
});

/* 
  API endpoint to get the selected movie from the "movie" folder 
*/
app.get('/api/get-movie', (req, res) => {
  const movieDir = path.join(__dirname, 'movie');
  fs.readdir(movieDir, (err, dateFolders) => {
    if (err) {
      console.error('Error reading movie directory:', err);
      return res.status(404).json({ error: 'Error reading movie directory' });
    }
    const validDateFolders = dateFolders.filter(folder => !folder.startsWith('.'));
    if (validDateFolders.length === 0) {
      return res.status(404).json({ error: 'No valid date folders found' });
    }
    const dateFolder = validDateFolders[0];
    const movieFolderPath = path.join(movieDir, dateFolder);
    fs.readdir(movieFolderPath, (err, movieFolders) => {
      if (err) {
        console.error('Error reading movie folder:', err);
        return res.status(404).json({ error: 'Error reading movie folder' });
      }
      const validMovieFolders = movieFolders.filter(movie => !movie.startsWith('.'));
      if (validMovieFolders.length === 0) {
        return res.status(404).json({ error: 'No valid movie folders found' });
      }
      const movieID = validMovieFolders[0];
      return res.json({ movie: movieID, date: dateFolder });
    });
  });
});

/* 
  Serve static files and handle client-side routing:
  - In production, serve from the "dist" folder (built by Vite).
  - In development, serve from the "public" folder.
*/
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
}

/*
  Start the server:
  - In development, use ViteExpress to enable features like HMR.
  - In production, simply start the Express server.
*/
if (process.env.NODE_ENV === 'production') {
  app.listen(port, () => {
    console.log(`Server is running in production on http://localhost:${port}`);
  });
} else {
  ViteExpress.listen(app, port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    
    // Automatically start ngrok tunnel in development mode
    (async () => {
      try {
        const url = await ngrok.connect({
          addr: port,
          hostname: 'virtually-alive-cockatoo.ngrok-free.app'
        });
        console.log(`ngrok tunnel established at: ${url}`);
      } catch (err) {
        console.error('Error starting ngrok:', err);
      }
    })();
  });
}

// In development mode, add graceful shutdown handlers to disconnect ngrok on restart.
if (process.env.NODE_ENV !== 'production') {
  async function cleanupAndExit() {
    try {
      await ngrok.disconnect();
      console.log('ngrok tunnel disconnected.');
    } catch (err) {
      console.error('Error disconnecting ngrok:', err);
    } finally {
      process.exit();
    }
  }
  
  process.once('SIGINT', cleanupAndExit);
  process.once('SIGTERM', cleanupAndExit);
  // nodemon emits SIGUSR2 on restart
  process.once('SIGUSR2', async () => {
    await cleanupAndExit();
    process.kill(process.pid, 'SIGUSR2');
  });
}
