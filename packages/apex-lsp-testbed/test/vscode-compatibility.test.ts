/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';

describe('VS Code Compatibility', () => {
  const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
  let packageJson: any;

  beforeAll(() => {
    if (fs.existsSync(packageJsonPath)) {
      const content = fs.readFileSync(packageJsonPath, 'utf8');
      packageJson = JSON.parse(content);
    }
  });

  it('should have proper VS Code engine compatibility', () => {
    expect(packageJson).toBeDefined();
    expect(packageJson.engines).toBeDefined();
    expect(packageJson.engines.vscode).toBeDefined();

    // Extract the minimum VS Code version and ensure it's reasonable
    const vscodeVersionRange = packageJson.engines.vscode;
    const minVersionMatch = vscodeVersionRange.match(
      /\^?([0-9]+\.[0-9]+\.[0-9]+)/,
    );

    if (minVersionMatch) {
      const minVersion = minVersionMatch[1];
      const [major, minor] = minVersion.split('.').map(Number);

      // Assert that the major version is at least 1
      expect(major).toBeGreaterThanOrEqual(1);

      // For VS Code versions 1.x, ensure minor version is reasonable
      if (major === 1) {
        expect(minor).toBeGreaterThanOrEqual(50);
      }
    }
  });

  it('should have VS Code contribution points', () => {
    expect(packageJson.contributes).toBeDefined();

    // Check configuration settings
    expect(packageJson.contributes.configuration).toBeDefined();
    expect(packageJson.contributes.configuration.properties).toBeDefined();

    // Check specific settings
    const props = packageJson.contributes.configuration.properties;
    expect(props['apex.server.type']).toBeDefined();
    expect(props['apex.javaMemory']).toBeDefined();

    // Check commands
    expect(packageJson.contributes.commands).toBeDefined();
    expect(packageJson.contributes.commands.length).toBeGreaterThan(0);

    // Verify at least one server-related command
    const commands = packageJson.contributes.commands.map(
      (cmd: any) => cmd.command,
    );
    expect(commands.some((cmd: string) => cmd.includes('server'))).toBeTruthy();
  });
});
