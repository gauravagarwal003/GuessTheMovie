/**
 * Copy Assets Script
 * 
 * Copies necessary files to the dist directory after Vite build.
 * This includes:
 * - Consolidated movie JSON files (movies/*.json)
 * - dates.json manifest
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const MOVIES_DIR = path.join(__dirname, '..', 'movies');
const DATES_FILE = path.join(__dirname, '..', 'dates.json');

function copyAssets() {
  console.log('📦 Copying assets to dist...\n');

  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Dist directory does not exist. Run build first.');
    process.exit(1);
  }

  // Create movies directory in dist
  const distMoviesDir = path.join(DIST_DIR, 'movies');
  if (!fs.existsSync(distMoviesDir)) {
    fs.mkdirSync(distMoviesDir, { recursive: true });
  }

  // Copy consolidated movie JSON files
  let copiedMovies = 0;
  if (fs.existsSync(MOVIES_DIR)) {
    const files = fs.readdirSync(MOVIES_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json') && /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
    
    for (const file of jsonFiles) {
      const src = path.join(MOVIES_DIR, file);
      const dest = path.join(distMoviesDir, file);
      fs.copyFileSync(src, dest);
      copiedMovies++;
    }
    console.log(`✅ Copied ${copiedMovies} movie files to dist/movies/`);
  } else {
    console.warn('⚠️  Movies directory not found');
  }

  // Copy dates.json
  if (fs.existsSync(DATES_FILE)) {
    const dest = path.join(DIST_DIR, 'dates.json');
    fs.copyFileSync(DATES_FILE, dest);
    console.log('✅ Copied dates.json to dist/');
  } else {
    console.warn('⚠️  dates.json not found. Run "npm run prebuild" first.');
  }

  console.log('\n✨ Asset copying complete!\n');
}

// Main execution
if (require.main === module) {
  copyAssets();
}

module.exports = { copyAssets };
