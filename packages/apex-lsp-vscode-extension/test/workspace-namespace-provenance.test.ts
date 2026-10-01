/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { namespaceForUri } from '../src/workspace-namespace-provenance';

describe('namespaceForUri', () => {
  const projectRoot = vscode.Uri.parse('file:///workspace');
  it('uses the containing workspace project namespace', () => {
    expect(
      namespaceForUri(
        vscode.Uri.parse('file:///workspace/force-app/Managed.cls'),
        [{ root: projectRoot, namespace: 'project' }],
      ),
    ).toBe('project');
  });

  it('does not infer a namespace when no manifest root contains the file', () => {
    expect(
      namespaceForUri(vscode.Uri.parse('file:///outside/Example.cls'), [
        { root: projectRoot, namespace: 'project' },
      ]),
    ).toBeUndefined();
  });
});
