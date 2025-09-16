#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Consolidated post-build script that handles all necessary fixes
 * after tsup bundling for VSCode extension compatibility
 */

function copyWorkerFiles() {
  console.log('🔧 Copying worker files...');
  const workerSrc = path.resolve(
    __dirname,
    '../../apex-ls/dist/worker.global.js',
  );
  const workerMapSrc = path.resolve(
    __dirname,
    '../../apex-ls/dist/worker.global.js.map',
  );
  const workerWebSrc = path.resolve(
    __dirname,
    '../../apex-ls/dist/worker-web.global.js',
  );
  const workerWebMapSrc = path.resolve(
    __dirname,
    '../../apex-ls/dist/worker-web.global.js.map',
  );
  const distDir = path.resolve(__dirname, '../dist');

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy main worker
  if (fs.existsSync(workerSrc)) {
    // Copy worker keeping .js extension since it's IIFE
    fs.copyFileSync(workerSrc, path.join(distDir, 'worker.js'));
    console.log('✅ Copied worker.js');
  } else {
    console.warn('⚠️ worker.js not found at:', workerSrc);
  }

  if (fs.existsSync(workerMapSrc)) {
    fs.copyFileSync(workerMapSrc, path.join(distDir, 'worker.js.map'));
    console.log('✅ Copied worker.js.map');
  } else {
    console.warn('⚠️ worker.js.map not found at:', workerMapSrc);
  }

  // Copy web worker variant
  if (fs.existsSync(workerWebSrc)) {
    fs.copyFileSync(workerWebSrc, path.join(distDir, 'worker-web.js'));
    console.log('✅ Copied worker-web.js');
  } else {
    console.warn('⚠️ worker-web.js not found at:', workerWebSrc);
  }

  if (fs.existsSync(workerWebMapSrc)) {
    fs.copyFileSync(workerWebMapSrc, path.join(distDir, 'worker-web.js.map'));
    console.log('✅ Copied worker-web.js.map');
  } else {
    console.warn('⚠️ worker-web.js.map not found at:', workerWebMapSrc);
  }
}

function copyManifestFiles() {
  console.log('🔧 Copying manifest and configuration files...');
  const packageSrcDir = path.resolve(__dirname, '..');
  const distDir = path.resolve(__dirname, '../dist');

  const filesToCopy = [
    'package.json',
    'package.nls.json',
    'language-configuration.json',
  ];

  const dirsToCopy = ['grammars', 'snippets', 'resources'];

  // Copy files
  filesToCopy.forEach((file) => {
    const srcFile = path.join(packageSrcDir, file);
    const destFile = path.join(distDir, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`✅ Copied ${file}`);
    }
  });

  // Copy directories recursively
  dirsToCopy.forEach((dir) => {
    const srcDirPath = path.join(packageSrcDir, dir);
    const destDirPath = path.join(distDir, dir);
    if (fs.existsSync(srcDirPath)) {
      fs.cpSync(srcDirPath, destDirPath, { recursive: true });
      console.log(`✅ Copied ${dir}/`);
    }
  });
}

function fixPackagePaths() {
  console.log('🔧 Fixing package.json paths for dist directory...');

  const packagePath = path.resolve(__dirname, '../dist/package.json');

  if (!fs.existsSync(packagePath)) {
    console.log(
      '⚠️ package.json not found in dist directory, skipping path fix',
    );
    return;
  }

  let content = fs.readFileSync(packagePath, 'utf8');
  const packageJson = JSON.parse(content);

  // Fix main and browser paths
  if (packageJson.main && packageJson.main.includes('./dist/')) {
    packageJson.main = packageJson.main.replace('./dist/', './');
    console.log(`✅ Fixed main path: ${packageJson.main}`);
  }

  if (packageJson.browser && packageJson.browser.includes('./dist/')) {
    packageJson.browser = packageJson.browser.replace('./dist/', './');
    console.log(`✅ Fixed browser path: ${packageJson.browser}`);
  }

  // Write the updated package.json
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
  console.log('✅ Fixed package.json paths for VSCode extension loading');
}

function validateBuild() {
  console.log('🔧 Validating build output...');

  const extensionPath = path.resolve(__dirname, '../dist/extension.js');

  if (!fs.existsSync(extensionPath)) {
    console.log('⚠️ extension.js not found');
    return;
  }

  let content = fs.readFileSync(extensionPath, 'utf8');

  // Count any remaining problematic imports (these should be polyfilled by tsup)
  const utilCount = (content.match(/require\("util"\)/g) || []).length;
  const urlCount = (content.match(/require\("url"\)/g) || []).length;
  const childProcessCount = (content.match(/require\("child_process"\)/g) || [])
    .length;

  console.log(
    `📊 Node.js imports found: ${utilCount} util, ${urlCount} url, ${childProcessCount} child_process`,
  );

  if (utilCount === 0 && urlCount === 0 && childProcessCount === 0) {
    console.log(
      '✅ All Node.js imports properly polyfilled by tsup configuration',
    );
  } else {
    console.log(
      'ℹ️ Some Node.js imports present - these should be handled by tsup polyfill configuration',
    );
  }

  // Check if critical files exist
  const criticalFiles = ['extension.js', 'extension.web.js', 'package.json'];
  let allPresent = true;

  criticalFiles.forEach((file) => {
    const filePath = path.resolve(__dirname, '../dist', file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} present`);
    } else {
      console.log(`❌ ${file} missing`);
      allPresent = false;
    }
  });

  if (allPresent) {
    console.log('✅ All critical files present for VSCode extension');
  }
}

function main() {
  console.log('🚀 Running consolidated post-build fixes...');
  console.log('='.repeat(50));

  try {
    copyWorkerFiles();
    console.log();

    copyManifestFiles();
    console.log();

    fixPackagePaths();
    console.log();

    validateBuild();
    console.log();

    console.log('✅ All post-build fixes completed successfully!');
  } catch (error) {
    console.error('❌ Error during post-build fixes:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  copyWorkerFiles,
  copyManifestFiles,
  fixPackagePaths,
  validateBuild,
  main,
};
