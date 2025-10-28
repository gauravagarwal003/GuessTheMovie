# Cloudflare Wrangler Setup Guide

This guide will help you migrate from GitHub Actions to Cloudflare Workers.

## What We're Doing

- ✅ **Replacing**: `sync-movies.yml` GitHub Action with a Cloudflare Worker
- ℹ️ **Keeping**: GitHub Pages for hosting (or you can switch to Cloudflare Pages later)
- 📅 **Schedule**: Same daily sync at 9:00 PM PST

## Prerequisites

You've already completed:
- ✅ Installed Wrangler: `npm install -g wrangler`
- ✅ Authenticated: `wrangler login`

## Setup Steps

### 1. Set Up Environment Secrets

Store your sensitive credentials as Cloudflare Worker secrets:

```bash
# Dropbox credentials
wrangler secret put DROPBOX_APP_KEY
wrangler secret put DROPBOX_APP_SECRET
wrangler secret put DROPBOX_REFRESH_TOKEN

# GitHub token for committing data back to repo
wrangler secret put GITHUB_TOKEN
```

**For GITHUB_TOKEN**: Create a Personal Access Token at https://github.com/settings/tokens with `repo` scope.

### 2. Deploy the Sync Worker

Deploy the scheduled worker that syncs movie data:

```bash
npm run cf:worker:deploy
```

This will:
- Deploy the worker to Cloudflare
- Set up the cron trigger (daily at 9:00 PM PST / 5:00 AM UTC)

### 3. Test the Worker Manually

Trigger the worker manually to test:

```bash
# Method 1: Test the scheduled trigger
npm run cf:worker:trigger

# Method 2: Call the HTTP endpoint
curl -X POST https://guess-the-movie.<your-subdomain>.workers.dev/sync
```

### 4. (Optional) Deploy Your Site to Cloudflare Pages

Your site will continue to be hosted on GitHub Pages by default. If you want to switch to Cloudflare Pages:

**Option A: Using Wrangler CLI**
```bash
npm run cf:deploy
```

**Option B: Connect GitHub (recommended)**
1. Go to https://dash.cloudflare.com/
2. Navigate to Workers & Pages > Create application > Pages > Connect to Git
3. Select your `GuessTheMovie` repository
4. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variables: (none needed for the static site)
5. Your site will auto-deploy on every push to main

### 5. Monitor Worker Logs

View real-time logs from your worker:

```bash
npm run cf:worker:tail
```

## What's Different?

### Before (GitHub Actions):
- **sync-movies.yml**: Ran daily on GitHub servers
- **deploy.yml**: Built and deployed to GitHub Pages (still works!)
- **Cost**: Free (within GitHub limits)
- **Limitations**: 2,000 minutes/month for private repos

### After (Cloudflare Worker):
- **Sync Worker**: Runs daily on Cloudflare's edge network
- **Hosting**: Keep using GitHub Pages (or optionally switch to Cloudflare Pages)
- **Cost**: Free tier includes:
  - 100,000 Worker requests/day
  - Scheduled cron triggers included
- **Benefits**: 
  - More reliable scheduling
  - Better global performance
  - More generous free tier limits

## Deactivate GitHub Actions (Optional)

Once everything is working with Cloudflare, you can disable the GitHub Actions:

### Option 1: Disable workflows in GitHub UI
1. Go to your repository on GitHub
2. Click on "Actions" tab
3. Select each workflow
4. Click "..." > "Disable workflow"

### Option 2: Delete workflow files
```bash
rm .github/workflows/sync-movies.yml
# Keep deploy.yml if you want GitHub Pages as a backup
```

## Troubleshooting

### Worker not triggering on schedule?
- Check the cron syntax in `wrangler.toml`
- View scheduled runs in Cloudflare dashboard

### Secrets not working?
- Verify secrets are set: `wrangler secret list`
- Re-add any missing secrets

### Build failing?
- Ensure Node.js 18+ is available
- Check that all dependencies are installed

### GitHub API errors?
- Verify your GITHUB_TOKEN has `repo` scope
- Check rate limits: https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting

## Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
