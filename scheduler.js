// Load environment variables from a .env file (make sure to add this file to your project root)
require('dotenv').config();

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { Dropbox } = require('dropbox');
const fetch = require('node-fetch'); // Dropbox SDK needs a fetch implementation

// Function to get the Dropbox access token from env variables.
// If you need to refresh tokens, you can add that logic here.
async function getDropboxAccessToken() {
  const accessToken = process.env.DROPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('Missing DROPBOX_ACCESS_TOKEN environment variable.');
  }
  return accessToken;
}

// Function to download the movie data from Dropbox.
// This example assumes that your Dropbox folder is named "/movies"
// and that each day's file is named with today's date (e.g., "2025-03-06.json").
async function downloadMoviesData() {
  try {
    const accessToken = await getDropboxAccessToken();
    const dbx = new Dropbox({ accessToken, fetch });

    // Format today's date (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    // Construct the Dropbox file path (adjust file extension and folder if needed)
    const dropboxFilePath = `/movies/${today}.json`;
    console.log(`Attempting to download file from Dropbox: ${dropboxFilePath}`);

    // Download the file from Dropbox
    const result = await dbx.filesDownload({ path: dropboxFilePath });

    if (result.result && result.result.fileBinary) {
      // Save the downloaded file locally
      const localFilePath = path.join(__dirname, 'moviesData.json');
      fs.writeFileSync(localFilePath, result.result.fileBinary, 'binary');
      console.log(`Downloaded ${dropboxFilePath} to ${localFilePath}`);
    } else {
      console.log(`File ${dropboxFilePath} not found or is empty.`);
    }
  } catch (error) {
    console.error('Error downloading movies data:', error);
  }
}

// Schedule the cron job to run every day at midnight.
// Adjust the timezone (e.g., "America/New_York") via an environment variable or directly in the code.
cron.schedule('0 0 * * *', async () => {
  console.log('Cron job triggered at midnight.');
  await downloadMoviesData();
}, {
  scheduled: true,
  timezone: process.env.TIMEZONE || 'America/New_York'
});

// Optionally, run the download on startup.
downloadMoviesData();

console.log('Scheduler started. Waiting for next scheduled run...');
