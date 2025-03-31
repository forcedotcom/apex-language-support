/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as assert from 'assert';

import * as vscode from 'vscode';

// This is a minimal test suite to ensure the extension activates correctly
suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Starting extension tests');

  test('Extension should be present', () => {
    assert.ok(
      vscode.extensions.getExtension(
        'salesforce.apex-language-server-extension',
      ),
    );
  });

  test('Extension should activate', async () => {
    const extension = vscode.extensions.getExtension(
      'salesforce.apex-language-server-extension',
    );
    if (!extension) {
      assert.fail('Extension not found');
      return;
    }

    try {
      await extension.activate();
      assert.ok(true, 'Extension activated successfully');
    } catch (err) {
      assert.fail(`Failed to activate extension: ${err}`);
    }
  });

  test('Language server commands should be registered', async () => {
    // Check if the command exists
    const commands = await vscode.commands.getCommands();
    assert.ok(
      commands.includes('apex.restart.server'),
      'Restart command is registered',
    );
  });
});
