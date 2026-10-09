const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const zipPath = resolve(__dirname, '../../resources/StandardApexLibrary.zip');

module.exports = `data:application/zip;base64,${readFileSync(zipPath).toString('base64')}`;
