require('dotenv').config();

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // Used for HTTP requests
const { Dropbox } = require('dropbox');
const { exec } = require('child_process'); // For running Git commands


// --- Utility Functions ---

// Refresh the Dropbox access token using your refresh token
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

// Clears all files and folders in the given local folder
function clearLocalFolder(localFolder) {
  if (!fs.existsSync(localFolder)) return;
  const files = fs.readdirSync(localFolder);
  for (const file of files) {
    const filePath = path.join(localFolder, file);
    try {
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmdirSync(filePath, { recursive: true });
      } else {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`Failed to delete ${filePath}. Reason: ${err}`);
    }
  }
}

// Recursively download all files and subfolders from a Dropbox folder
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
      console.log(`Downloaded file: ${entry.path_lower} to ${localEntryPath}`);
    } else if (entry['.tag'] === 'folder') {
      await downloadFolderContents(dbx, entry.path_lower, localEntryPath);
    } else {
      console.log(`Skipping unsupported entry: ${entry.name}`);
    }
  }
}

// Download only the file/folder with a name equal to targetFolder from dropboxPath
async function downloadFromDropbox(dbx, dropboxPath, localPath, targetFolder) {
  try {
    // Ensure the local directory exists (or clear it if it does)
    if (fs.existsSync(localPath)) {
      clearLocalFolder(localPath);
    } else {
      fs.mkdirSync(localPath, { recursive: true });
    }
    
    // List contents of the specified Dropbox folder
    const response = await dbx.filesListFolder({ path: dropboxPath });
    for (const entry of response.result.entries) {
      if (entry.name === targetFolder) {
        const localEntryPath = path.join(localPath, entry.name);
        if (entry['.tag'] === 'file') {
          const downloadResult = await dbx.filesDownload({ path: entry.path_lower });
          fs.writeFileSync(localEntryPath, downloadResult.result.fileBinary, 'binary');
          console.log(`Downloaded file: ${entry.path_lower} to ${localEntryPath}`);
        } else if (entry['.tag'] === 'folder') {
          await downloadFolderContents(dbx, entry.path_lower, localEntryPath);
          console.log(`Downloaded folder: ${entry.path_lower} to ${localEntryPath}`);
        }
        return; // Exit after processing the target entry
      }
    }
    console.log(`No folder or file named '${targetFolder}' found in ${dropboxPath}`);
  } catch (error) {
    console.error('Error in downloadFromDropbox:', error);
  }
}

function pushChanges(commitMessage) {
  return new Promise((resolve, reject) => {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return reject(new Error("Missing GITHUB_TOKEN environment variable."));
    }
    
    // Update the remote URL to use the token for authentication.
    const remoteUrl = `https://${githubToken}@github.com/gauravagarwal003/LBGuessMovie.git`;
    exec(`git remote set-url origin ${remoteUrl}`, (err, stdout, stderr) => {
      if (err) {
        console.error("Error updating remote URL:", err);
        return reject(err);
      }
      console.log("Remote URL updated with GITHUB_TOKEN.");
      
      // Stage, commit, and push changes.
      exec(`git add . && git commit -m "${commitMessage}" && git push origin main`, (err, stdout, stderr) => {
        if (err) {
          console.error("Error pushing changes:", err);
          return reject(err);
        }
        console.log("Changes pushed successfully:\n", stdout);
        resolve(stdout);
      });
    });
  });
}


// --- Main Function ---

// Refresh the access token and download today's movie file/folder from Dropbox
async function downloadMoviesData() {
  try {
    const appKey = process.env.DROPBOX_APP_KEY;
    const appSecret = process.env.DROPBOX_APP_SECRET;
    const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
    if (!appKey || !appSecret || !refreshToken) {
      throw new Error("Missing Dropbox configuration in environment variables.");
    }
    
    // Refresh the access token
    const accessToken = await refreshAccessToken(appKey, appSecret, refreshToken);
    console.log("Access token refreshed.");
    
    const dbx = new Dropbox({ accessToken, fetch });
    
    // Define Dropbox and local paths (adjust these as needed)
    const dropboxFolderPath = "/movies";
    const localDownloadPath = path.join(__dirname, "movie");
    const currentDate = new Date().toISOString().split('T')[0]; // e.g., "2025-03-06"
    
    await downloadFromDropbox(dbx, dropboxFolderPath, localDownloadPath, currentDate);
  } catch (error) {
    console.error("Error in downloadMoviesData:", error);
  }
}

cron.schedule('0 21 * * *', async () => {
  console.log("Cron job triggered at " + new Date().toLocaleString());
  try {
    await downloadMoviesData();
    const commitMessage = `Update movie data for ${new Date().toLocaleDateString()}`;
    await pushChanges(commitMessage);

  } catch (err) {
    console.error("Error in cron job:", err);
  }
}, {
  scheduled: true,
  timezone: "America/Los_Angeles"
});

console.log("Scheduler started. Waiting for next scheduled run...");