/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');

// Get all packages
const packages = fs
  .readdirSync(packagesDir, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name);

console.log(`Found ${packages.length} packages to update`);

// Process each package
for (const pkg of packages) {
  const packageJsonPath = path.join(packagesDir, pkg, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.log(`No package.json found for ${pkg}, skipping`);
    continue;
  }

  // Read and parse package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Skip if already configured
  if (packageJson.scripts?.['test:coverage']) {
    console.log(`Package ${pkg} already has test:coverage script, skipping`);
    continue;
  }

  console.log(`Adding coverage configuration to ${pkg}`);

  // Add scripts if they don't exist
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.test = 'wireit';
  packageJson.scripts['test:coverage'] = 'wireit';
  packageJson.scripts['clean:coverage'] = 'rimraf coverage';

  // Add wireit configurations
  packageJson.wireit = packageJson.wireit || {};

  // Add test configuration
  packageJson.wireit.test = {
    command: 'jest',
    service: false,
    files: [
      'src/**/*.ts',
      'test/**/*.ts',
      '../../jest.config.mjs',
      '../../babel.config.cjs',
    ],
    output: [],
  };

  // Add test:coverage configuration
  packageJson.wireit['test:coverage'] = {
    command: 'jest --coverage --coverageDirectory=./coverage',
    service: false,
    files: [
      'src/**/*.ts',
      'test/**/*.ts',
      '../../jest.config.mjs',
      '../../babel.config.cjs',
    ],
    output: ['coverage/**'],
  };

  // Write updated package.json
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2),
    'utf8',
  );
  console.log(`Updated ${pkg} package.json`);
}

console.log('All packages updated successfully!');
