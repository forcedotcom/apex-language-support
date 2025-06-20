const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, 'out', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

pkg.main = './extension.js';

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
