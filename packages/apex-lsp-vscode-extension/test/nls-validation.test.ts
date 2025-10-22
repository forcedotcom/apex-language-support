/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';

describe('NLS Validation', () => {
  let packageJson: any;
  let packageNls: any;

  beforeAll(() => {
    // Read package.json
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    packageJson = JSON.parse(packageJsonContent);

    // Read package.nls.json
    const packageNlsPath = path.join(__dirname, '../package.nls.json');
    const packageNlsContent = fs.readFileSync(packageNlsPath, 'utf8');
    packageNls = JSON.parse(packageNlsContent);
  });

  describe('Configuration Settings NLS References', () => {
    it('should have NLS references for all configuration descriptions', () => {
      const configuration = packageJson.contributes?.configuration;
      expect(configuration).toBeDefined();
      expect(configuration.properties).toBeDefined();

      const properties = configuration.properties;
      const nlsKeys = Object.keys(packageNls);

      // Check each configuration property has an NLS reference
      for (const [key, value] of Object.entries(properties)) {
        if (typeof value === 'object' && value !== null) {
          const configValue = value as any;
          if (
            configValue.description &&
            typeof configValue.description === 'string'
          ) {
            // Check if it's an NLS reference (starts and ends with %)
            if (
              configValue.description.startsWith('%') &&
              configValue.description.endsWith('%')
            ) {
              const nlsKey = configValue.description.slice(1, -1); // Remove % symbols
              expect(nlsKeys).toContain(nlsKey);
            }
          }

          // Check nested properties for missing artifact settings
          if (configValue.properties) {
            for (const [nestedKey, nestedValue] of Object.entries(
              configValue.properties,
            )) {
              const nestedConfigValue = nestedValue as any;
              if (
                nestedConfigValue.description &&
                typeof nestedConfigValue.description === 'string'
              ) {
                if (
                  nestedConfigValue.description.startsWith('%') &&
                  nestedConfigValue.description.endsWith('%')
                ) {
                  const nlsKey = nestedConfigValue.description.slice(1, -1);
                  expect(nlsKeys).toContain(nlsKey);
                }
              }
            }
          }
        }
      }
    });

    it('should have NLS references for all command titles', () => {
      const commands = packageJson.contributes?.commands;
      expect(commands).toBeDefined();

      const nlsKeys = Object.keys(packageNls);

      for (const command of commands) {
        if (command.title && typeof command.title === 'string') {
          // Check if it's an NLS reference
          if (command.title.startsWith('%') && command.title.endsWith('%')) {
            const nlsKey = command.title.slice(1, -1);
            expect(nlsKeys).toContain(nlsKey);
          }
        }
      }
    });

    it('should have NLS references for configuration title', () => {
      const configuration = packageJson.contributes?.configuration;
      expect(configuration).toBeDefined();

      if (configuration.title && typeof configuration.title === 'string') {
        if (
          configuration.title.startsWith('%') &&
          configuration.title.endsWith('%')
        ) {
          const nlsKey = configuration.title.slice(1, -1);
          expect(Object.keys(packageNls)).toContain(nlsKey);
        }
      }
    });

    it('should have NLS references for views containers', () => {
      const viewsContainers = packageJson.contributes?.viewsContainers;
      expect(viewsContainers).toBeDefined();

      const nlsKeys = Object.keys(packageNls);

      for (const container of viewsContainers.activitybar || []) {
        if (container.title && typeof container.title === 'string') {
          if (
            container.title.startsWith('%') &&
            container.title.endsWith('%')
          ) {
            const nlsKey = container.title.slice(1, -1);
            expect(nlsKeys).toContain(nlsKey);
          }
        }
      }
    });
  });

  describe('NLS Content Validation', () => {
    it('should have all required NLS keys for new settings', () => {
      const requiredNlsKeys = [
        'configuration.apex-ls-ts.worker.logLevel.description',
        'configuration.apex-ls-ts.worker.enablePerformanceLogs.description',
        'configuration.apex-ls-ts.worker.logCategories.description',
        'configuration.apex-ls-ts.custom.description',
        'configuration.apex-ls-ts.findMissingArtifact.description',
        'configuration.apex-ls-ts.findMissingArtifact.enabled.description',
        'configuration.apex-ls-ts.findMissingArtifact.blockingWaitTimeoutMs.description',
        'configuration.apex-ls-ts.findMissingArtifact.indexingBarrierPollMs.description',
        'configuration.apex-ls-ts.findMissingArtifact.maxCandidatesToOpen.description',
        'configuration.apex-ls-ts.findMissingArtifact.timeoutMsHint.description',
        'configuration.apex-ls-ts.findMissingArtifact.enablePerfMarks.description',
        'commands.apex.showAggregatedLogs.title',
        'configuration.apex.title',
      ];

      for (const key of requiredNlsKeys) {
        expect(packageNls.hasOwnProperty(key)).toBe(true);
        expect(packageNls[key]).toBeTruthy();
        expect(typeof packageNls[key]).toBe('string');
      }
    });

    it('should have consistent NLS key naming convention', () => {
      const nlsKeys = Object.keys(packageNls);

      for (const key of nlsKeys) {
        // Configuration keys should follow the pattern: configuration.apex-ls-ts.*.description
        if (key.startsWith('configuration.apex-ls-ts.')) {
          expect(key).toMatch(
            /^configuration\.apex-ls-ts\.[a-zA-Z0-9.]+\.description$/,
          );
        }

        // Command keys should follow the pattern: commands.*.title
        if (key.startsWith('commands.')) {
          expect(key).toMatch(/^commands\.[a-zA-Z0-9.-]+\.title$/);
        }

        // Views container keys should follow the pattern: viewsContainers.*.title
        if (key.startsWith('viewsContainers.')) {
          expect(key).toMatch(/^viewsContainers\.[a-zA-Z0-9.-]+\.title$/);
        }
      }
    });
  });

  describe('Missing Artifact Settings Validation', () => {
    it('should have all missing artifact NLS keys defined', () => {
      const missingArtifactKeys = [
        'configuration.apex-ls-ts.findMissingArtifact.description',
        'configuration.apex-ls-ts.findMissingArtifact.enabled.description',
        'configuration.apex-ls-ts.findMissingArtifact.blockingWaitTimeoutMs.description',
        'configuration.apex-ls-ts.findMissingArtifact.indexingBarrierPollMs.description',
        'configuration.apex-ls-ts.findMissingArtifact.maxCandidatesToOpen.description',
        'configuration.apex-ls-ts.findMissingArtifact.timeoutMsHint.description',
        'configuration.apex-ls-ts.findMissingArtifact.enablePerfMarks.description',
      ];

      for (const key of missingArtifactKeys) {
        expect(packageNls.hasOwnProperty(key)).toBe(true);
        expect(packageNls[key]).toBeTruthy();
        expect(packageNls[key].length).toBeGreaterThan(0);
      }
    });

    it('should have meaningful descriptions for missing artifact settings', () => {
      const descriptions = {
        'configuration.apex-ls-ts.findMissingArtifact.description':
          packageNls[
            'configuration.apex-ls-ts.findMissingArtifact.description'
          ],
        'configuration.apex-ls-ts.findMissingArtifact.enabled.description':
          packageNls[
            'configuration.apex-ls-ts.findMissingArtifact.enabled.description'
          ],
        'configuration.apex-ls-ts.findMissingArtifact.blockingWaitTimeoutMs.description':
          packageNls[
            'configuration.apex-ls-ts.findMissingArtifact.blockingWaitTimeoutMs.description'
          ],
        'configuration.apex-ls-ts.findMissingArtifact.indexingBarrierPollMs.description':
          packageNls[
            'configuration.apex-ls-ts.findMissingArtifact.indexingBarrierPollMs.description'
          ],
        'configuration.apex-ls-ts.findMissingArtifact.maxCandidatesToOpen.description':
          packageNls[
            'configuration.apex-ls-ts.findMissingArtifact.maxCandidatesToOpen.description'
          ],
        'configuration.apex-ls-ts.findMissingArtifact.timeoutMsHint.description':
          packageNls[
            'configuration.apex-ls-ts.findMissingArtifact.timeoutMsHint.description'
          ],
        'configuration.apex-ls-ts.findMissingArtifact.enablePerfMarks.description':
          packageNls[
            'configuration.apex-ls-ts.findMissingArtifact.enablePerfMarks.description'
          ],
      };

      // Check that descriptions are meaningful (not just placeholder text)
      for (const [key, description] of Object.entries(descriptions)) {
        expect(description).not.toMatch(/^(TODO|FIXME|TBD|placeholder)/i);
        expect(description.length).toBeGreaterThan(10); // At least 10 characters
        expect(description).not.toContain('undefined');
        expect(description).not.toContain('null');
      }
    });
  });
});
