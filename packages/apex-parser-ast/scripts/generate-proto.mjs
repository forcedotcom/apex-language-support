#!/usr/bin/env node
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Script to generate TypeScript types from Protocol Buffers schema.
 * Uses @protobuf-ts/plugin to generate strongly-typed TypeScript classes.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const protoFile = join(projectRoot, 'proto', 'apex-stdlib.proto');
const outputDir = join(projectRoot, 'src', 'generated');

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Check if proto file exists
if (!existsSync(protoFile)) {
  console.error(`Proto file not found: ${protoFile}`);
  process.exit(1);
}

console.log('Generating TypeScript from Protocol Buffers schema...');
console.log(`  Input: ${protoFile}`);
console.log(`  Output: ${outputDir}`);

try {
  // Use npx to run the protobuf-ts plugin
  // The plugin is invoked via protoc with the --ts_out option
  const command = [
    'npx',
    'protoc',
    '--ts_out', outputDir,
    '--ts_opt', 'generate_dependencies',
    '--ts_opt', 'long_type_string',
    '--proto_path', join(projectRoot, 'proto'),
    protoFile,
  ].join(' ');

  console.log(`  Running: ${command}`);
  execSync(command, { 
    stdio: 'inherit',
    cwd: projectRoot,
  });

  console.log('✅ Proto generation complete');
} catch (error) {
  console.error('❌ Proto generation failed:', error.message);
  
  // Provide helpful error message
  console.error('\nTroubleshooting:');
  console.error('1. Ensure protoc is installed: brew install protobuf (macOS) or apt install protobuf-compiler (Linux)');
  console.error('2. Ensure @protobuf-ts/plugin is installed: npm install');
  console.error('3. Check that the proto file is valid');
  
  process.exit(1);
}
