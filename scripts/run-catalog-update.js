const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const localPython = process.platform === 'win32'
  ? path.join(root, '.venv', 'Scripts', 'python.exe')
  : path.join(root, '.venv', 'bin', 'python');
const python = process.env.PYTHON || (fs.existsSync(localPython)
  ? localPython
  : (process.platform === 'win32' ? 'python' : 'python3'));
const script = path.join(__dirname, 'update_movie_catalog.py');

const result = spawnSync(python, [script], { cwd: root, stdio: 'inherit' });
if (result.error) {
  console.error(`Could not run ${python}: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
