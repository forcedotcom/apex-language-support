/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  InFlightPrerequisiteRegistry,
  resetInFlightPrerequisiteRegistry,
} from '../../src/services/InFlightPrerequisiteRegistry';

describe('InFlightPrerequisiteRegistry', () => {
  afterEach(() => {
    resetInFlightPrerequisiteRegistry();
  });

  it('joins existing entries and upgrades requirements', () => {
    const registry = new InFlightPrerequisiteRegistry();
    const first = registry.acquireOrJoin({
      fileUri: 'file:///Demo.cls',
      documentVersion: 1,
      targetDetailLevel: 'private',
      needsCrossFileResolution: false,
    });

    const second = registry.acquireOrJoin({
      fileUri: 'file:///Demo.cls',
      documentVersion: 1,
      targetDetailLevel: 'full',
      needsCrossFileResolution: true,
    });

    expect(first.joined).toBe(false);
    expect(second.joined).toBe(true);
    expect(second.upgraded).toBe(true);
    expect(second.entry.targetDetailLevel).toBe('full');
    expect(second.entry.needsCrossFileResolution).toBe(true);
  });

  it('treats completed entry as satisfied for weaker/equal requirements', () => {
    const registry = new InFlightPrerequisiteRegistry();
    const acquired = registry.acquireOrJoin({
      fileUri: 'file:///Demo.cls',
      documentVersion: 2,
      targetDetailLevel: 'full',
      needsCrossFileResolution: true,
    });
    registry.complete(acquired.key);

    expect(
      registry.isSatisfied({
        fileUri: 'file:///Demo.cls',
        documentVersion: 2,
        targetDetailLevel: 'private',
        needsCrossFileResolution: true,
      }),
    ).toBe(true);
    expect(
      registry.isSatisfied({
        fileUri: 'file:///Demo.cls',
        documentVersion: 2,
        targetDetailLevel: 'full',
        needsCrossFileResolution: false,
      }),
    ).toBe(true);
  });
});
