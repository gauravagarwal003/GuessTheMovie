// server.js
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const ViteExpress = require('vite-express');

if (process.env.NODE_ENV !== 'production') {
  ngrok = require('ngrok');
}

const app = express();
const port = process.env.PORT || 3000;

app.get('/archive', (req, res) => {
  const filePath = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, 'dist', 'archive.html')
    : path.join(__dirname, 'public', 'archive.html');
  res.sendFile(filePath);
});

app.get('/archive/:date?', (req, res) => {
  const filePath = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, 'dist', 'archive.html')
    : path.join(__dirname, 'public', 'archive.html');
    
  res.sendFile(filePath);
});

app.get('/api/json', (req, res) => {
  const { date, name: movieID, index } = req.query;
  const reviewsPath = path.join(__dirname, 'movies', date, movieID);

  fs.readdir(reviewsPath, (err, files) => {
    if (err) {
      return res.status(404).json({ error: 'Error reading directory' });
    }
    const validFiles = files.filter(file => file.endsWith('.json'));
    if (validFiles.length === 0) {
      return res.status(404).json({ error: 'No JSON files found' });
    }
    const idx = parseInt(index, 10);
    if (idx >= 0 && idx < validFiles.length) {
      const jsonPath = path.join(reviewsPath, validFiles[idx]);
      fs.readFile(jsonPath, 'utf8', (err, data) => {
        if (err) {
          return res.status(500).json({ error: 'Error reading JSON file' });
        }
        try {
          const jsonData = JSON.parse(data);
          return res.json(jsonData);
        } catch (parseErr) {
          return res.status(500).json({ error: 'Error parsing JSON file' });
        }
      });
    } else {
      return res.status(404).json({ error: 'JSON file not found' });
    }
  });
});

app.get('/api/get-movie', (req, res) => {
  const { date: requestedDate } = req.query;
  const movieDir = path.join(__dirname, 'movies');

  fs.readdir(movieDir, (err, dateFolders) => {
    if (err) {
      console.error('Error reading movie directory:', err);
      return res.status(404).json({ error: 'Error reading movie directory' });
    }

    const validDateFolders = dateFolders
      .filter(folder => !folder.startsWith('.'))
      .sort();

    if (validDateFolders.length === 0) {
      return res.status(404).json({ error: 'No valid date folders found' });
    }

    let dateFolder;
    if (requestedDate) {
      if (validDateFolders.includes(requestedDate)) {
        dateFolder = requestedDate;
      } else {
        return res.status(404).json({ error: 'Requested date not found' });
      }
    } else {
      dateFolder = validDateFolders[validDateFolders.length - 1];
    }

    const movieFolderPath = path.join(movieDir, dateFolder);
    fs.readdir(movieFolderPath, (err, movieFolders) => {
      if (err) {
        console.error('Error reading movie folder:', err);
        return res.status(404).json({ error: 'Error reading movie folder' });
      }

      const validMovieFolders = movieFolders
        .filter(movie => !movie.startsWith('.'));

      if (validMovieFolders.length === 0) {
        return res.status(404).json({ error: 'No valid movie folders found' });
      }

      const movieID = validMovieFolders[0];
      return res.json({ movie: movieID, date: dateFolder });
    });
  });
});


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



if (process.env.NODE_ENV === 'production') {
  app.listen(port, () => {
    console.log(`Server is running in production on http://localhost:${port}`);
  });
} else {
  ViteExpress.listen(app, port, () => {
    console.log(`Server is running on http://localhost:${port}`);
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
  process.once('SIGUSR2', async () => {
    await cleanupAndExit();
    process.kill(process.pid, 'SIGUSR2');
  });
}