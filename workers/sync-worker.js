/**
 * Cloudflare Worker for syncing movie data from Dropbox
 * This worker runs on a schedule (cron trigger) to download and commit movie data
 */

export default {
  async scheduled(event, env, ctx) {
    console.log('Starting scheduled movie sync...');
    
    try {
      // Refresh Dropbox access token
      const accessToken = await refreshAccessToken(
        env.DROPBOX_APP_KEY,
        env.DROPBOX_APP_SECRET,
        env.DROPBOX_REFRESH_TOKEN
      );

      // Download movie data from Dropbox
      const movieData = await downloadTodaysMovies(accessToken);

      // If no data, exit gracefully
      if (!movieData) {
        console.log('No movie data to sync today');
        return new Response('No data to sync', { status: 200 });
      }

      // Commit to GitHub using GitHub API
      await commitToGitHub(env.GITHUB_TOKEN, movieData);

      console.log('Movie sync completed successfully');
      return new Response('Sync completed', { status: 200 });
    } catch (error) {
      console.error('Error syncing movies:', error);
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  },

  // Optional: Handle HTTP requests for manual triggering
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === '/sync' && request.method === 'POST') {
      // Manually trigger the sync
      return await this.scheduled(null, env, ctx);
    }

    return new Response('Guess The Movie Sync Worker', { status: 200 });
  }
};

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
 * Download today's movies from Dropbox
 */
async function downloadTodaysMovies(accessToken) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Try the consolidated file first (newer format)
  const consolidatedPath = `/movies/${today}.json`;
  
  const response = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path: consolidatedPath })
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Dropbox download error (${response.status}):`, errorText);
    
    // If file doesn't exist (404), that's okay - no data to sync today
    if (response.status === 409) {
      console.log(`No movie file found for ${today} - skipping sync`);
      return null;
    }
    
    throw new Error(`Failed to download from Dropbox (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Commit movie data to GitHub repository
 */
async function commitToGitHub(githubToken, movieData) {
  const owner = 'gauravagarwal003';
  const repo = 'GuessTheMovie';
  const today = new Date().toISOString().split('T')[0];
  const filePath = `movies/${today}.json`;

  // Get current file SHA if it exists
  let sha = null;
  try {
    const getResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Cloudflare-Worker-Movie-Sync'
        }
      }
    );
    if (getResponse.ok) {
      const data = await getResponse.json();
      sha = data.sha;
    }
  } catch (error) {
    // File doesn't exist, that's okay
  }

  // Create or update the file
  // Use proper UTF-8 encoding for GitHub API (base64)
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(movieData, null, 2));
  const content = btoa(String.fromCharCode(...data));
  
  const body = {
    message: `🎬 Update movie data for ${today}`,
    content: content,
    branch: 'main',
    committer: {
      name: 'Cloudflare Worker',
      email: 'worker@cloudflare.com'
    }
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Cloudflare-Worker-Movie-Sync'
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to commit to GitHub: ${await response.text()}`);
  }

  return await response.json();
}
