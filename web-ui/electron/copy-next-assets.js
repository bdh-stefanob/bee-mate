// Copies Next.js static assets into the standalone folder after `next build`.
// Required because standalone output does not include .next/static or public/.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

// monorepo: standalone mirrors subfolder structure, server lives under web-ui/
const appInStandalone = path.join(standalone, 'web-ui');
copyDir(path.join(root, '.next', 'static'), path.join(appInStandalone, '.next', 'static'));
copyDir(path.join(root, 'public'), path.join(appInStandalone, 'public'));

console.log('✓ Next.js assets copied to standalone');
