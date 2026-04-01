/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  canonicalizeStandardTypeName,
  isStandardTypeAlias,
} from '../../../../src/semantics/validation/utils/standardTypeIdentity';

describe('standardTypeIdentity', () => {
  it('canonicalizes common System aliases', () => {
    expect(canonicalizeStandardTypeName('System.Object')).toBe('object');
    expect(canonicalizeStandardTypeName('system.type')).toBe('type');
    expect(canonicalizeStandardTypeName('Package.Version')).toBe('version');
  });

  it('checks type aliases consistently', () => {
    expect(
      isStandardTypeAlias('System.SchedulableContext', 'schedulablecontext'),
    ).toBe(true);
    expect(isStandardTypeAlias('Version', 'version')).toBe(true);
    expect(isStandardTypeAlias('System.Formula', 'formula')).toBe(true);
    expect(isStandardTypeAlias('Database.QueryLocator', 'formula')).toBe(false);
  });
});
