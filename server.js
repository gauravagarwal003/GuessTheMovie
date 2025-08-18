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

// --- API ROUTES ---

app.get('/api/dates', (req, res) => {
  const moviesDir = path.join(__dirname, 'movies');
  fs.readdir(moviesDir, { withFileTypes: true }, (err, items) => {
    if (err) return res.status(404).json({ error: 'Error reading movies directory' });
    const dateFolders = items
      .filter(dirent => dirent.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(dirent.name))
      .map(dirent => dirent.name);
    res.json({ dates: dateFolders });
  });
});

app.get('/api/json', (req, res) => {
  const { date, name: movieID, index } = req.query;
  const reviewsPath = path.join(__dirname, 'movies', date, movieID);

  fs.readdir(reviewsPath, (err, files) => {
    if (err) return res.status(404).json({ error: 'Error reading directory' });
    const validFiles = files.filter(f => f.endsWith('.json'));
    if (validFiles.length === 0) return res.status(404).json({ error: 'No JSON files found' });

    const idx = parseInt(index, 10);
    if (idx >= 0 && idx < validFiles.length) {
      fs.readFile(path.join(reviewsPath, validFiles[idx]), 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error reading JSON file' });
        try {
          res.json(JSON.parse(data));
        } catch {
          res.status(500).json({ error: 'Error parsing JSON file' });
        }
      });
    } else {
      res.status(404).json({ error: 'JSON file not found' });
    }
  });
});

app.get('/api/get-movie', (req, res) => {
  const { date: requestedDate } = req.query;
  const movieDir = path.join(__dirname, 'movies');

  fs.readdir(movieDir, (err, dateFolders) => {
    if (err) return res.status(404).json({ error: 'Error reading movie directory' });

    const validDateFolders = dateFolders.filter(d => !d.startsWith('.')).sort();
    if (validDateFolders.length === 0) return res.status(404).json({ error: 'No valid date folders found' });

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
      if (err) return res.status(404).json({ error: 'Error reading movie folder' });

      const validMovieFolders = movieFolders.filter(m => !m.startsWith('.'));
      if (validMovieFolders.length === 0) return res.status(404).json({ error: 'No valid movie folders found' });

      res.json({ movieID: validMovieFolders[0], date: dateFolder });
    });
  });
});

// --- STATIC ASSETS ---

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
} else {
  app.use(express.static(path.join(__dirname, 'public')));
}

// --- HELPERS TO SEND PAGES ---

function sendIndex(res) {
  const file = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, 'dist', 'today.html')
    : path.join(__dirname, 'today.html');
  res.sendFile(file);
}

function sendIncorrect(res) {
  const file = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, 'dist', 'incorrect_url.html')
    : path.join(__dirname, 'public', 'incorrect_url.html');
  res.status(404).sendFile(file);
}

// --- VALID URL ROUTES ---

// 1) Home
app.get('/', (req, res) => {
  sendIndex(res);
});

// 2) Archive landing
app.get('/archive', (req, res) => {
  const file = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, 'dist', 'archive.html')
    : path.join(__dirname, 'public', 'archive.html');
  res.sendFile(file);
});

app.get('/about', (req, res) => {
  const file = process.env.NODE_ENV === 'prod`suction'
    ? path.join(__dirname, 'dist', 'about.html')
    : path.join(__dirname, 'public', 'about.html');
  res.sendFile(file);
});

app.get('/history', (req, res) => {
  const file = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, 'dist', 'history.html')
    : path.join(__dirname, 'public', 'history.html');
  res.sendFile(file);
});

// 3) Archive by date
app.get('/archive/:date', (req, res) => {
  const { date } = req.params;
  const folder = path.join(__dirname, 'movies', date);

  if (fs.existsSync(folder) && fs.statSync(folder).isDirectory()) {
    sendIndex(res);
  } else {
    sendIncorrect(res);
  }
});

// 4) Everything else → incorrect
app.get('*', (req, res) => {
  sendIncorrect(res);
});

// --- START SERVER ---

if (process.env.NODE_ENV === 'production') {
  app.listen(port, () => {
    console.log(`Server running in production on http://localhost:${port}`);
  });
} else {
  ViteExpress.listen(app, port, async () => {
    console.log(`Server running on http://localhost:${port}`);
    try {
      const url = await ngrok.connect({
        addr: port,
        hostname: 'virtually-alive-cockatoo.ngrok-free.app'
      });
      console.log(`ngrok tunnel: ${url}`);
    } catch (err) {
      console.error('ngrok error:', err);
    }
  });

  async function cleanupAndExit() {
    try {
      await ngrok.disconnect();
      console.log('ngrok disconnected.');
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
