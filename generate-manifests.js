/**
 * Generate Manifests Script
 * 
 * Creates dates.json with all available movie dates and metadata.
 * This file is used by the frontend to:
 * - Display available dates in the calendar
 * - Determine the latest/current movie
 * - Navigate between dates
 */

const fs = require('fs');
const path = require('path');

const MOVIES_DIR = path.join(__dirname, 'movies');
const OUTPUT_FILE = path.join(__dirname, 'dates.json');

function generateManifests() {
  console.log('📋 Generating manifests...\n');

  if (!fs.existsSync(MOVIES_DIR)) {
    console.error('❌ Movies directory not found!');
    process.exit(1);
  }

  // Get all .json files in movies directory
  const movieFiles = fs.readdirSync(MOVIES_DIR)
    .filter(file => typeof file === 'string' && file.trim().endsWith('.json') && /^\d{4}-\d{2}-\d{2}\.json$/.test(file.trim()))
    .map(file => file.trim().replace('.json', ''))
    // sort by actual date value to avoid lexical anomalies
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (movieFiles.length === 0) {
    console.error('❌ No movie JSON files found!');
    console.log('💡 Run "node consolidate-movies.js" first to create consolidated files.');
    process.exit(1);
  }

  // Get latest date
  const latestDate = movieFiles[movieFiles.length - 1];

  // Collect additional metadata from each file
  const moviesMetadata = {};
  for (const date of movieFiles) {
    try {
      const filePath = path.join(MOVIES_DIR, `${date}.json`);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      moviesMetadata[date] = {
        movieID: content.movieID,
        reviewCount: content.reviewCount || content.reviews.length
      };
    } catch (error) {
      console.warn(`⚠️  Warning: Could not read metadata for ${date}`);
    }
  }

  // Create manifest object
  const manifest = {
    generatedAt: new Date().toISOString(),
    totalDates: movieFiles.length,
    latestDate: latestDate,
    dates: movieFiles,
    metadata: moviesMetadata
  };

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('✅ Generated dates.json');
  console.log(`   📅 Total dates: ${movieFiles.length}`);
  console.log(`   🎬 Latest date: ${latestDate}`);
  console.log(`   📍 First date: ${movieFiles[0]}`);
  console.log(`\n💾 Manifest saved to: ${OUTPUT_FILE}\n`);
}

// Main execution
if (require.main === module) {
  generateManifests();
}

module.exports = { generateManifests };
