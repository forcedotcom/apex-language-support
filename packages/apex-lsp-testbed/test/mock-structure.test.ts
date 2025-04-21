/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';

// Avoid importing source files directly to prevent dependency issues in tests
// Instead, check that the expected files and directories exist

describe('apex-lsp-testbed structure validation', () => {
  const rootDir = path.resolve(__dirname, '..');
  const srcDir = path.join(rootDir, 'src');

  describe('File structure', () => {
    it('should have required source files', () => {
      // Main source files
      expect(fs.existsSync(path.join(srcDir, 'cli.ts'))).toBeTruthy();

      // Client files
      expect(
        fs.existsSync(path.join(srcDir, 'client', 'ApexJsonRpcClient.ts')),
      ).toBeTruthy();

      // Server files
      expect(
        fs.existsSync(path.join(srcDir, 'servers', 'demo', 'mockServer.ts')),
      ).toBeTruthy();
      expect(
        fs.existsSync(
          path.join(srcDir, 'servers', 'jorje', 'javaServerLauncher.ts'),
        ),
      ).toBeTruthy();
      expect(
        fs.existsSync(
          path.join(srcDir, 'servers', 'jorje', 'runJavaServer.ts'),
        ),
      ).toBeTruthy();
    });

    it('should have packageon with required fields', () => {
      const packageJsonPath = path.join(rootDir, 'packageon');
      expect(fs.existsSync(packageJsonPath)).toBeTruthy();

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      expect(packageJson.name).toBe('@salesforce/apex-lsp-testbed');
      expect(packageJson.main).toBe('dist/cli');
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts['start:jorje']).toBeDefined();
      expect(packageJson.scripts['start:demo']).toBeDefined();
    });

    it('should have a valid README.md', () => {
      const readmePath = path.join(rootDir, 'README.md');
      expect(fs.existsSync(readmePath)).toBeTruthy();

      const readmeContent = fs.readFileSync(readmePath, 'utf8');
      // Check for important sections in README
      expect(readmeContent).toContain('# Apex Language Server Testbed');
      expect(readmeContent).toContain('Installation');
      expect(readmeContent).toContain('Usage');
      expect(readmeContent).toContain('Java Debugging');
    });

    it('should have a proper build configuration', () => {
      // Check for build config files
      expect(fs.existsSync(path.join(rootDir, 'vite.config.ts'))).toBeTruthy();
      expect(fs.existsSync(path.join(rootDir, 'tsconfigon'))).toBeTruthy();
    });
  });

  describe('Mock resources', () => {
    it('should have mock files for testing', () => {
      expect(fs.existsSync(path.join(rootDir, 'mock-packageon'))).toBeTruthy();
      expect(fs.existsSync(path.join(rootDir, 'mock-server'))).toBeTruthy();
    });
  });
});
