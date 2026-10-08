/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, describe, it } from '@jest/globals';
import { getDebuggerCommandUri } from '../../src/commands/ApexDebuggerCommands';

describe('getDebuggerCommandUri', () => {
  it('accepts exactly one URI string argument', () => {
    expect(getDebuggerCommandUri(['file:///workspace/Example.cls'])).toBe(
      'file:///workspace/Example.cls',
    );
  });

  it.each([undefined, [], [42], ['file:///workspace/Example.cls', 'extra']])(
    'rejects an invalid command argument list: %p',
    (arguments_) => {
      expect(() => getDebuggerCommandUri(arguments_)).toThrow(
        'requires exactly one document URI string argument',
      );
    },
  );
});
