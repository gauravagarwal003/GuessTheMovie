require('dotenv').config();
const { exec } = require('child_process'); // For running Git commands

function pushChanges(commitMessage) {
    return new Promise((resolve, reject) => {
      const githubTokenRaw = process.env.GITHUB_TOKEN;
      if (!githubTokenRaw) {
        return reject(new Error("Missing GITHUB_TOKEN environment variable."));
      }
      // Trim the token to remove any extra whitespace or newlines
      const githubToken = githubTokenRaw.trim();
  
      // Use the recommended URL format with the "x-access-token" prefix.
      const remoteUrl = `https://x-access-token:${githubToken}@github.com/gauravagarwal003/LBGuessMovie.git`;
      // Alternatively, if issues persist, try this:
      // const remoteUrl = `https://${githubToken}@github.com/gauravagarwal003/LBGuessMovie.git`;
  
      const envOptions = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  
      exec(`git remote set-url origin ${remoteUrl}`, { env: envOptions }, (err) => {
        if (err) {
          console.error("Error updating remote URL:", err);
          return reject(err);
        }
        console.log("Remote URL updated with GITHUB_TOKEN.");
  
        // Configure Git identity locally for this repository.
        const gitConfigCommand = `git config user.email "gagarwal003@gmail.com" && git config user.name "gauravagarwal003"`;
        exec(gitConfigCommand, { env: envOptions }, (err) => {
          if (err) {
            console.error("Error configuring Git user identity:", err);
            return reject(err);
          }
          console.log("Git user identity configured.");
  
          // Checkout the correct branch before committing.
          const checkoutCommand = `git checkout one_movie_per_day`;
          exec(checkoutCommand, { env: envOptions }, (err) => {
            if (err) {
              console.error("Error checking out branch one_movie_per_day:", err);
              return reject(err);
            }
            console.log("Checked out branch one_movie_per_day.");
  
            // Stage, commit, and push changes to the one_movie_per_day branch.
            const gitPushCommand = `git add . && git commit -m "${commitMessage}" && git push origin one_movie_per_day`;
            exec(gitPushCommand, { env: envOptions }, (err, stdout) => {
              if (err) {
                console.error("Error pushing changes:", err);
                return reject(err);
              }
              console.log("Changes pushed successfully:\n", stdout);
              resolve(stdout);
            });
          });
        });
      });
    });
  }
  
pushChanges(`Pushing changes from testPush.js`);
