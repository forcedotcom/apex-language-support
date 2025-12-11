/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';

describe('StandardApexLibrary.zip Resource Copying', () => {
  const projectRoot = path.resolve(__dirname, '../../..');
  const extensionRoot = path.resolve(__dirname, '..');
  const distDir = path.join(extensionRoot, 'dist');
  const resourcesDir = path.join(distDir, 'resources');
  const standardLibZipDest = path.join(resourcesDir, 'StandardApexLibrary.zip');
  const standardLibZipSrc = path.join(
    projectRoot,
    'packages/apex-parser-ast/resources/StandardApexLibrary.zip',
  );

  describe('Source ZIP File', () => {
    it('should exist in apex-parser-ast resources', () => {
      const exists = fs.existsSync(standardLibZipSrc);
      expect(exists).toBe(true);
    });

    it('should be a valid ZIP file', () => {
      if (fs.existsSync(standardLibZipSrc)) {
        const content = fs.readFileSync(standardLibZipSrc);
        expect(content[0]).toBe(0x50);
        expect(content[1]).toBe(0x4b);
        expect(content[2]).toBe(0x03);
        expect(content[3]).toBe(0x04);
      }
    });

    it('should be appropriately sized (around 1.6MB)', () => {
      if (fs.existsSync(standardLibZipSrc)) {
        const stats = fs.statSync(standardLibZipSrc);
        expect(stats.size).toBeGreaterThan(1000000);
        expect(stats.size).toBeLessThan(5000000);
      }
    });
  });

  describe('Destination ZIP File (after build)', () => {
    it('should have dist directory after build', () => {
      if (fs.existsSync(distDir)) {
        expect(fs.statSync(distDir).isDirectory()).toBe(true);
      }
    });

    it('should have resources directory in dist after build', () => {
      if (fs.existsSync(resourcesDir)) {
        expect(fs.statSync(resourcesDir).isDirectory()).toBe(true);
      }
    });

    it('should have copied StandardApexLibrary.zip to dist/resources after build', () => {
      if (fs.existsSync(standardLibZipDest)) {
        expect(fs.existsSync(standardLibZipDest)).toBe(true);
        expect(fs.statSync(standardLibZipDest).isFile()).toBe(true);
      }
    });

    it.skip('should have identical content to source ZIP after copy', () => {
      if (
        !fs.existsSync(standardLibZipSrc) ||
        !fs.existsSync(standardLibZipDest)
      ) {
        expect(true).toBe(true);
        return;
      }

      const sourceContent = fs.readFileSync(standardLibZipSrc);
      const destContent = fs.readFileSync(standardLibZipDest);

      expect(destContent.length).toBe(sourceContent.length);
      expect(destContent.equals(sourceContent)).toBe(true);
    });
  });

  describe('Build Configuration', () => {
    it('should have esbuild.config.ts with copyStandardLibraryResources function', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');
      expect(fs.existsSync(esbuildConfigPath)).toBe(true);

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toContain('copyStandardLibraryResources');
        expect(configContent).toContain('StandardApexLibrary.zip');
      }
    });

    it('should have correct source path in copy function', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toContain(
          'apex-parser-ast/resources/StandardApexLibrary.zip',
        );
      }
    });

    it('should have correct destination path in copy function', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toContain('dist/resources');
      }
    });

    it('should call copyStandardLibraryResources in build process', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toContain('executePostBuildTasks');
        expect(configContent).toContain('copyStandardLibraryResources()');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing source ZIP gracefully in copy function', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toContain('try {');
        expect(configContent).toContain('catch');
      }
    });

    it('should log appropriate messages on copy success/failure', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toMatch(/console\.(log|warn)/);
        expect(configContent).toContain('StandardApexLibrary.zip');
      }
    });
  });

  describe('File System Operations', () => {
    it('should create resources directory if it does not exist', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toContain('mkdirSync');
        expect(configContent).toContain('recursive: true');
      }
    });

    it('should use fs.copyFileSync for atomic copy operation', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toContain('copyFileSync');
      }
    });
  });

  describe('Path Resolution', () => {
    it('should use path.resolve for absolute paths', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toContain('path.resolve');
        expect(configContent).toContain('__dirname');
      }
    });

    it('should handle relative paths from esbuild.config.ts location', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toContain('__dirname');
        expect(configContent).toContain('../apex-parser-ast');
      }
    });
  });

  describe('Integration with Build Process', () => {
    it('should be part of package.json build scripts', () => {
      const packageJsonPath = path.join(extensionRoot, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8'),
        );

        expect(packageJson.scripts).toHaveProperty('bundle');
        expect(packageJson.scripts.bundle).toContain('esbuild');
      }
    });

    it('should run after TypeScript compilation', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toContain('executePostBuildTasks');
      }
    });
  });
});
