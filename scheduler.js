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
    } else if (entry['.tag'] === 'folder') {
      await downloadFolderContents(dbx, entry.path_lower, localEntryPath);
    }
  }
}

// Download only the file/folder with a name equal to targetFolder from dropboxPath
async function downloadFromDropbox(dbx, dropboxPath, localPath, targetFolder) {
  try {
    // Ensure the local base directory exists.
    if (!fs.existsSync(localPath)) {
      fs.mkdirSync(localPath, { recursive: true });
    }

    // Check if the target day's folder already exists locally.
    const targetLocalFolder = path.join(localPath, targetFolder);
    if (fs.existsSync(targetLocalFolder)) {
      return;
    }

    // List contents of the specified Dropbox folder.
    const response = await dbx.filesListFolder({ path: dropboxPath });
    for (const entry of response.result.entries) {
      if (entry.name === targetFolder) {
        const localEntryPath = path.join(localPath, entry.name);
        if (entry['.tag'] === 'file') {
          const downloadResult = await dbx.filesDownload({ path: entry.path_lower });
          fs.writeFileSync(localEntryPath, downloadResult.result.fileBinary, 'binary');
        } else if (entry['.tag'] === 'folder') {
          await downloadFolderContents(dbx, entry.path_lower, localEntryPath);
        }
        return; // Exit after processing the target entry.
      }
    }
  } catch (error) {
    console.error('Error in downloadFromDropbox:', error);
  }
}

function pushChanges(commitMessage) {
  return new Promise((resolve, reject) => {
    const githubTokenRaw = process.env.GITHUB_TOKEN;
    if (!githubTokenRaw) return reject(new Error("Missing GITHUB_TOKEN environment variable."));
    const githubToken = githubTokenRaw.trim();

    const remoteUrl = `https://x-access-token:${githubToken}@github.com/gauravagarwal003/GuessTheMovie.git`;
    const envOptions = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

    exec(`git remote set-url origin ${remoteUrl}`, { env: envOptions }, (err) => {
      if (err) return reject(err);

      exec(`git config user.email "gagarwal003@gmail.com" && git config user.name "gauravagarwal003"`, { env: envOptions }, (err) => {
        if (err) return reject(err);

        exec(`git checkout main`, { env: envOptions }, (err) => {
          if (err) return reject(err);

          // Pull first to integrate remote changes
          exec(`git pull --rebase origin main`, { env: envOptions }, (err, stdout, stderr) => {
            if (err) {
              console.error("Git pull failed:", stderr);
              return reject(err);
            }

            // Now stage, commit, and push
            const gitPushCommand = `git add . && git commit -m "${commitMessage}" || echo "No changes to commit" && git push origin main`;
            exec(gitPushCommand, { env: envOptions }, (err, stdout, stderr) => {
              if (err) {
                console.error("Git push failed:", stderr);
                return reject(err);
              }
              resolve(stdout);
            });
          });
        });
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

    const dbx = new Dropbox({ accessToken, fetch });

    // Define Dropbox and local paths (adjust these as needed)
    const dropboxFolderPath = "/movies";
    const localDownloadPath = path.join(__dirname, "movies");
    const currentDate = new Date().toISOString().split('T')[0]; // e.g., "2025-03-06"

    await downloadFromDropbox(dbx, dropboxFolderPath, localDownloadPath, currentDate);
  } catch (error) {
    console.error("Error in downloadMoviesData:", error);
  }
}

cron.schedule('00 21 * * *', async () => {
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

module.exports = { pushChanges };
