#!/usr/bin/env node
/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const { execFileSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');

execFileSync(
  process.execPath,
  ['--test', 'eslint-rules/parser-owned-semantics.test.mjs'],
  { stdio: 'inherit' },
);
mkdirSync('.wireit', { recursive: true });
writeFileSync('.wireit/test-eslint-rules', 'passed\n');
