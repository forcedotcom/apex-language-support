/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { workspaceIdentifierKey } from '../../src/utils/WorkspaceIdentifierKey';

describe('workspaceIdentifierKey', () => {
  it.each([
    [{ name: '  Example  ' }, 'apex-class:example'],
    [{ name: 'Example', identifierType: 'apex-class' }, 'apex-class:example'],
    [{ name: 'Account', identifierType: 'sobject' }, 'sobject:account'],
    [
      { name: 'ExampleTrigger', identifierType: 'trigger' },
      'trigger:exampletrigger',
    ],
  ] as const)('normalizes %o as %s', (identifier, expected) => {
    expect(workspaceIdentifierKey(identifier)).toBe(expected);
  });
});
