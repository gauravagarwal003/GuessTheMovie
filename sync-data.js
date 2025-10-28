/**
 * Dropbox Sync Script
 * 
 * Downloads today's movie data from Dropbox and consolidates it.
 * This is designed to run as a standalone script in GitHub Actions.
 * 
 * Requires environment variables:
 * - DROPBOX_APP_KEY
 * - DROPBOX_APP_SECRET
 * - DROPBOX_REFRESH_TOKEN
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { Dropbox } = require('dropbox');

const MOVIES_DIR = path.join(__dirname, 'movies');

/**
 * Refresh the Dropbox access token using refresh token
 */
async function refreshAccessToken(appKey, appSecret, refreshToken) {
  const url = "https://api.dropboxapi.com/oauth2/token";
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
  params.append("client_id", appKey);
  params.append("client_secret", appSecret);

  const response = await fetch(url, {
    method: "POST",
    body: params
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh access token: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Recursively download all files and subfolders from a Dropbox folder
 */
async function downloadFolderContents(dbx, dropboxFolderPath, localPath) {
  if (!fs.existsSync(localPath)) {
    fs.mkdirSync(localPath, { recursive: true });
  }

  const response = await dbx.filesListFolder({ path: dropboxFolderPath });
  for (const entry of response.result.entries) {
    const localEntryPath = path.join(localPath, entry.name);
    if (entry['.tag'] === 'file') {
      const downloadResult = await dbx.filesDownload({ path: entry.path_lower });
      fs.writeFileSync(localEntryPath, downloadResult.result.fileBinary, 'binary');
      console.log(`   📄 Downloaded: ${entry.name}`);
    } else if (entry['.tag'] === 'folder') {
      await downloadFolderContents(dbx, entry.path_lower, localEntryPath);
    }
  }
}

/**
 * Download only the folder with name equal to targetFolder from dropboxPath
 */
async function downloadFromDropbox(dbx, dropboxPath, localPath, targetFolder) {
  try {
    // Ensure the local base directory exists
    if (!fs.existsSync(localPath)) {
      fs.mkdirSync(localPath, { recursive: true });
    }

    // Check if the target day's folder already exists locally
    const targetLocalFolder = path.join(localPath, targetFolder);
    if (fs.existsSync(targetLocalFolder)) {
      console.log(`⏭️  ${targetFolder} already exists, skipping download`);
      return false;
    }

    console.log(`📥 Downloading ${targetFolder} from Dropbox...`);

    // List contents of the specified Dropbox folder (with pagination)
    let entries = [];
    let listResponse = await dbx.filesListFolder({ path: dropboxPath });
    entries = entries.concat(listResponse.result.entries || []);
    while (listResponse.result.has_more) {
      listResponse = await dbx.filesListFolderContinue({ cursor: listResponse.result.cursor });
      entries = entries.concat(listResponse.result.entries || []);
    }

    // Debug: show what we found in the Dropbox folder
    try {
      console.log('   📂 Dropbox folder entries:', entries.map(e => `${e.name} (${e['.tag']})`).join(', '));
      
      // TEMPORARY DEBUG: Specifically check for 2025-10-28.json
      const targetFile = entries.find(e => e.name === '2025-10-28.json');
      if (targetFile) {
        console.log('   ✅ DEBUG: Found 2025-10-28.json in Dropbox!');
        console.log(`      - Full path: ${targetFile.path_display || targetFile.path_lower}`);
        console.log(`      - Type: ${targetFile['.tag']}`);
        console.log(`      - ID: ${targetFile.id || 'N/A'}`);
      } else {
        console.log('   ❌ DEBUG: 2025-10-28.json NOT found in entries list');
      }
    } catch (e) {
      // ignore logging errors
    }

    let found = false;

    // First, check whether a consolidated JSON file exists: <targetFolder>.json
    const expectedFileName = `${targetFolder}.json`;

    for (const entry of entries) {
      // Direct file (consolidated JSON) case
      if (entry.name === expectedFileName && entry['.tag'] === 'file') {
        found = true;
        const localFilePath = path.join(localPath, expectedFileName);
        const downloadResult = await dbx.filesDownload({ path: entry.path_lower });
        fs.writeFileSync(localFilePath, downloadResult.result.fileBinary, 'binary');
        console.log(`   ✅ Downloaded consolidated JSON: ${entry.name}`);
        return { downloaded: true, type: 'file' };
      }

      // Folder case (legacy / original format): folder name equals targetFolder
      if (entry.name === targetFolder && entry['.tag'] === 'folder') {
        found = true;
        const localEntryPath = path.join(localPath, entry.name);
        await downloadFolderContents(dbx, entry.path_lower, localEntryPath);
        console.log(`   ✅ Downloaded folder: ${entry.name}`);
        return { downloaded: true, type: 'folder' };
      }
    }

    if (!found) {
      console.log(`   ⚠️  ${targetFolder} not found in Dropbox`);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Error in downloadFromDropbox:', error.message);
    throw error;
  }
}

/**
 * Consolidate the downloaded folder into a single JSON file
 */
function consolidateDownloadedMovie(dateFolder) {
  console.log(`🔄 Consolidating ${dateFolder}...`);
  
  const datePath = path.join(MOVIES_DIR, dateFolder);
  
  if (!fs.existsSync(datePath)) {
    console.log('   ⚠️  Date folder not found, skipping consolidation');
    return;
  }

  // Get movie folder
  const movieFolders = fs.readdirSync(datePath)
    .filter(item => {
      const itemPath = path.join(datePath, item);
      return fs.statSync(itemPath).isDirectory() && !item.startsWith('.');
    });

  if (movieFolders.length === 0) {
    console.log('   ⚠️  No movie folder found');
    return;
  }

  const movieID = movieFolders[0];
  const moviePath = path.join(datePath, movieID);

  // Read all review JSON files
  const reviewFiles = fs.readdirSync(moviePath)
    .filter(file => file.endsWith('.json'))
    .sort();

  if (reviewFiles.length === 0) {
    console.log('   ⚠️  No review files found');
    return;
  }

  // Load all reviews
  const reviews = reviewFiles.map(file => {
    const filePath = path.join(moviePath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  });

  // Create consolidated object
  const consolidatedData = {
    date: dateFolder,
    movieID: movieID,
    reviewCount: reviews.length,
    reviews: reviews
  };

  // Write consolidated file
  const outputPath = path.join(MOVIES_DIR, `${dateFolder}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(consolidatedData, null, 2), 'utf8');
  
  console.log(`   ✅ Created ${dateFolder}.json with ${reviews.length} reviews`);

  // Clean up the folder structure
  fs.rmSync(datePath, { recursive: true, force: true });
  console.log(`   🗑️  Cleaned up temporary folder`);
}

/**
 * Main sync function
 */
async function syncMovieData() {
  console.log('🎬 Starting Dropbox sync...\n');

  try {
    // Validate environment variables
    const appKey = process.env.DROPBOX_APP_KEY;
    const appSecret = process.env.DROPBOX_APP_SECRET;
    const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;

    // TEMPORARY DEBUG: Check if env vars are present (without revealing values)
    console.log('🔍 DEBUG: Environment variables check:');
    console.log(`   - DROPBOX_APP_KEY: ${appKey ? `present (length: ${appKey.length})` : 'MISSING'}`);
    console.log(`   - DROPBOX_APP_SECRET: ${appSecret ? `present (length: ${appSecret.length})` : 'MISSING'}`);
    console.log(`   - DROPBOX_REFRESH_TOKEN: ${refreshToken ? `present (length: ${refreshToken.length})` : 'MISSING'}`);
    console.log('');

    if (!appKey || !appSecret || !refreshToken) {
      throw new Error("Missing Dropbox configuration in environment variables.");
    }

    // Refresh the access token
    console.log('🔑 Refreshing Dropbox access token...');
    const accessToken = await refreshAccessToken(appKey, appSecret, refreshToken);
    console.log('✅ Access token refreshed\n');

    const dbx = new Dropbox({ accessToken, fetch });

    // Define paths
    const dropboxFolderPath = "/movies";
    const localDownloadPath = path.join(__dirname, "movies");
    const todayDate = new Date().toISOString().split('T')[0]; // e.g., "2025-10-27"
    // Allow optional CLI arg: `node sync-data.js 2025-10-01`
    const targetDate = process.argv[2] || todayDate;

    console.log(`📅 Target date: ${targetDate}\n`);

    // TEMPORARY DEBUG: Show what we're looking for
    console.log(`🔍 DEBUG: Looking for file: "${targetDate}.json" or folder: "${targetDate}"\n`);

    // Download from Dropbox
    const result = await downloadFromDropbox(
      dbx,
      dropboxFolderPath,
      localDownloadPath,
      targetDate
    );

    if (result && result.downloaded) {
      if (result.type === 'folder') {
        // Consolidate the downloaded folder into a single JSON
        consolidateDownloadedMovie(targetDate);
        console.log('\n✨ Sync completed successfully (folder consolidated)!');
      } else if (result.type === 'file') {
        console.log('\n✨ Sync completed successfully (consolidated JSON downloaded)!');
      }
      return true;
    } else {
      console.log('\n⏭️  No new data to sync');
      return false;
    }

  } catch (error) {
    console.error("\n❌ Error in syncMovieData:", error.message);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  // Treat "no new data" as a successful run (exit 0).
  // Only non-recoverable exceptions will exit with code 1.
  syncMovieData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { syncMovieData };
