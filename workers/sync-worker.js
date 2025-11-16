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

      // Decide whether to update dates.json in the repo.
      // Set USE_GITHUB_ACTIONS=true in Worker env to indicate your CI (GitHub Actions) will maintain dates.json,
      // in which case the worker will skip updating the manifest.
      const useActions = String(env.USE_GITHUB_ACTIONS || '').toLowerCase() === 'true';
      const updateDatesFlag = (env.UPDATE_DATES === undefined) ? 'true' : String(env.UPDATE_DATES).toLowerCase();

      if (useActions) {
        console.log('USE_GITHUB_ACTIONS=true, skipping dates.json update (CI will maintain manifest).');
      } else if (updateDatesFlag === 'false') {
        console.log('UPDATE_DATES=false, skipping dates.json update (disabled via env).');
      } else {
        try {
          await updateDatesJsonOnGitHub(env.GITHUB_TOKEN, movieData);
          console.log('dates.json updated successfully by worker');
        } catch (err) {
          console.warn('Failed to update dates.json:', err);
        }
      }

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

/**
 * Fetch, update (or create) dates.json in the GitHub repo to include today's date + metadata
 */
async function updateDatesJsonOnGitHub(githubToken, movieData) {
  const owner = 'gauravagarwal003';
  const repo = 'GuessTheMovie';
  const path = 'dates.json';
  const today = new Date().toISOString().split('T')[0];

  // Helper to get existing dates.json (returns { json, sha } or { json: null, sha: null })
  async function getDatesJson() {
    try {
      const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Cloudflare-Worker-Movie-Sync'
        }
      });
      if (resp.ok) {
        const data = await resp.json();
        const contentBase64 = data.content || '';
        const decoded = atob(contentBase64.replace(/\n/g, ''));
        return { json: JSON.parse(decoded), sha: data.sha };
      } else if (resp.status === 404) {
        return { json: null, sha: null };
      } else {
        const text = await resp.text();
        throw new Error(`Failed to fetch dates.json: ${resp.status} ${text}`);
      }
    } catch (err) {
      throw new Error(`Error fetching dates.json: ${err.message}`);
    }
  }

  const { json: existingManifest, sha: existingSha } = await getDatesJson();

  const manifest = existingManifest && typeof existingManifest === 'object'
    ? existingManifest
    : { generatedAt: new Date().toISOString(), totalDates: 0, latestDate: today, dates: [], metadata: {} };

  // Ensure dates array is an array of trimmed strings
  manifest.dates = Array.isArray(manifest.dates) ? manifest.dates.map(d => String(d).trim()).filter(Boolean) : [];

  // Add today's date if missing
  if (!manifest.dates.includes(today)) {
    manifest.dates.push(today);
  }

  // De-duplicate and sort by actual date value
  manifest.dates = Array.from(new Set(manifest.dates)).sort((a, b) => new Date(a) - new Date(b));

  // Update metadata for today's date
  const reviewCount = movieData.reviewCount || (Array.isArray(movieData.reviews) ? movieData.reviews.length : 0);
  manifest.metadata = manifest.metadata || {};
  manifest.metadata[today] = {
    movieID: movieData.movieID,
    reviewCount: reviewCount
  };

  // Update generatedAt, totalDates, latestDate
  manifest.generatedAt = new Date().toISOString();
  manifest.totalDates = manifest.dates.length;
  manifest.latestDate = manifest.dates[manifest.dates.length - 1] || today;

  // Prepare content and commit
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(JSON.stringify(manifest, null, 2));
  const contentBase64 = btoa(String.fromCharCode(...contentBytes));

  const body = {
    message: `🗓️ Update dates.json (add ${today})`,
    content: contentBase64,
    branch: 'main',
    committer: {
      name: 'Cloudflare Worker',
      email: 'worker@cloudflare.com'
    }
  };
  if (existingSha) body.sha = existingSha;

  const putResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Cloudflare-Worker-Movie-Sync'
    },
    body: JSON.stringify(body)
  });

  if (!putResp.ok) {
    const text = await putResp.text();
    throw new Error(`Failed to update dates.json: ${putResp.status} ${text}`);
  }

  return await putResp.json();
}
