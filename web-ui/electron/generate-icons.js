const png2icons = require('png2icons');
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../public/icon-source.png');
const input = fs.readFileSync(src);

fs.writeFileSync(
  path.join(__dirname, '../public/icon.ico'),
  png2icons.createICO(input, png2icons.BILINEAR, 0, true)
);

fs.writeFileSync(
  path.join(__dirname, '../public/icon.icns'),
  png2icons.createICNS(input, png2icons.BILINEAR, 0)
);

console.log('✓ icon.ico and icon.icns generated from icon-source.png');
