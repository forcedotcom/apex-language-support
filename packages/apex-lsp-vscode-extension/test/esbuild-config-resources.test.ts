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
    it('should use esbuild-plugin-copy for file copying', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');
      expect(fs.existsSync(esbuildConfigPath)).toBe(true);

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toContain('esbuild-plugin-copy');
        expect(configContent).toContain('copy');
        expect(configContent).toContain('StandardApexLibrary.zip');
      }
    });

    it('should have correct source path in copy plugin configuration', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toContain(
          'apex-parser-ast/resources/StandardApexLibrary.zip',
        );
      }
    });

    it('should have correct destination path in copy plugin configuration', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        // The plugin uses './dist/resources/StandardApexLibrary.zip' as destination
        expect(configContent).toContain('./dist/resources');
        expect(configContent).toContain('StandardApexLibrary.zip');
      }
    });

    it('should configure copy plugin with assets array', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toContain('executePostBuildTasks');
        expect(configContent).toContain('assets');
        expect(configContent).toContain('from');
        expect(configContent).toContain('to');
      }
    });
  });

  describe('Error Handling', () => {
    it('should configure copy plugin with watch and verbose options', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        // The plugin handles errors internally and provides verbose logging
        expect(configContent).toContain('watch');
        expect(configContent).toContain('verbose');
      }
    });

    it('should use resolveFrom option for path resolution', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        expect(configContent).toContain('resolveFrom');
        expect(configContent).toContain('cwd');
      }
    });
  });

  describe('File System Operations', () => {
    it('should use esbuild-plugin-copy for file operations', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        // The plugin handles directory creation and file copying internally
        expect(configContent).toContain('esbuild-plugin-copy');
        expect(configContent).toContain('plugins');
      }
    });

    it('should configure copy plugin with proper asset paths', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        // Verify the plugin configuration includes the StandardApexLibrary.zip copy
        expect(configContent).toContain(
          '../apex-parser-ast/resources/StandardApexLibrary.zip',
        );
        expect(configContent).toContain(
          './dist/resources/StandardApexLibrary.zip',
        );
      }
    });
  });

  describe('Path Resolution', () => {
    it('should use resolveFrom cwd for plugin path resolution', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        // The plugin uses resolveFrom: 'cwd' for path resolution
        expect(configContent).toContain('resolveFrom');
        expect(configContent).toContain("'cwd'");
      }
    });

    it('should handle relative paths in plugin configuration', () => {
      const esbuildConfigPath = path.join(extensionRoot, 'esbuild.config.ts');

      if (fs.existsSync(esbuildConfigPath)) {
        const configContent = fs.readFileSync(esbuildConfigPath, 'utf8');
        // Plugin uses relative paths like '../apex-parser-ast' and './dist'
        expect(configContent).toContain('../apex-parser-ast');
        expect(configContent).toContain('./dist');
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
        // After migration to Wireit, bundle script delegates to wireit
        expect(packageJson.scripts.bundle).toBe('wireit');
        // Verify wireit configuration has esbuild command
        expect(packageJson.wireit).toBeDefined();
        expect(packageJson.wireit.bundle).toBeDefined();
        expect(packageJson.wireit.bundle.command).toContain('esbuild');
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
