const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Kill any running electron instances
  execSync('taskkill /F /IM electron.exe /T', { stdio: 'ignore' });
} catch (e) {}

try {
  // Kill any 7z instances
  execSync('taskkill /F /IM 7z.exe /T', { stdio: 'ignore' });
} catch (e) {}

const distDir = path.join(__dirname, '..', 'dist-electron');
if (fs.existsSync(distDir)) {
  try {
    fs.rmSync(distDir, { recursive: true, force: true });
    console.log('dist-electron cleared successfully');
  } catch (err) {
    console.log('Failed to delete dist-electron:', err.message);
  }
}
