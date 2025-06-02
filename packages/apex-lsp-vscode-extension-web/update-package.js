const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, 'dist', 'package.json');
const pkg = require(packagePath);
pkg.main = './extension.js';
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
