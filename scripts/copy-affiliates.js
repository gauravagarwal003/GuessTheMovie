const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'affiliates');
const dest = path.join(root, 'dist', 'affiliates');

async function copyDir(srcDir, destDir) {
  await fs.promises.mkdir(destDir, { recursive: true });
  const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

(async () => {
  try {
    // only copy if source exists
    if (!fs.existsSync(src)) {
      console.log('No affiliates directory to copy.');
      process.exit(0);
    }
    await copyDir(src, dest);
    console.log(`Copied affiliates -> ${dest}`);
  } catch (err) {
    console.error('Failed to copy affiliates:', err);
    process.exit(1);
  }
})();
