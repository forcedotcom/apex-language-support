/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  getFoundationNamespaceOrder,
  getImplicitQualifiedCandidates,
  getImplicitNamespaceOrder,
  getRegistryNamespacePreference,
  isPrimaryImplicitNamespace,
} from '../../src/namespace/NamespaceResolutionPolicy';

describe('NamespaceResolutionPolicy', () => {
  it('returns configured implicit namespace order', () => {
    expect(getImplicitNamespaceOrder()).toEqual(['System', 'Schema']);
  });

  it('builds deduplicated qualified candidates', () => {
    expect(getImplicitQualifiedCandidates('Assert', 'System')).toEqual([
      'System.Assert',
      'Schema.Assert',
    ]);
    expect(getImplicitQualifiedCandidates('Assert', 'MyNs')).toEqual([
      'MyNs.Assert',
      'System.Assert',
      'Schema.Assert',
    ]);
  });

  it('matches implicit namespace names case-insensitively', () => {
    expect(isPrimaryImplicitNamespace('system')).toBe(true);
    expect(isPrimaryImplicitNamespace('Schema')).toBe(true);
    expect(isPrimaryImplicitNamespace('Database')).toBe(false);
  });

  it('returns registry and foundation preference defaults', () => {
    expect(getRegistryNamespacePreference()).toEqual(['System', 'Database']);
    expect(getFoundationNamespaceOrder()).toEqual([
      'System',
      'Database',
      'Schema',
    ]);
  });
});
