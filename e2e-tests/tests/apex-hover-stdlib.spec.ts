/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';

/**
 * E2E tests for Apex Hover on standard library types (e.g. `String`).
 *
 * These tests hover on the bare stdlib identifier itself — not on a user
 * variable whose type happens to render as `"String"`. A passing hover must
 * surface a real stdlib class signature (e.g. `class System.String`), which
 * requires the `ApexSymbolManager` to be wired to a real
 * `ResourceLoader`-backed stdlib provider rather than the default no-op.
 *
 * @group hover
 * @group stdlib
 */
test.describe('Apex Hover - Standard Library Types', () => {
  /**
   * `String` as qualifier of a static method call: `String.isBlank(instanceId)`.
   * ApexClassExample.cls line 21: `        if (String.isBlank(instanceId)) {`
   * Column 15 lands inside `String`.
   */
  test('should show hover for String as method-call qualifier', async ({
    hoverHelper,
  }) => {
    const content = await hoverHelper.hoverAtWithResolution(21, 15);
    expect(content).toBeTruthy();
    expect(content.length).toBeGreaterThan(0);
    // Must render the stdlib class signature, not just mention the word
    // "String" (which can appear via a thin primitive type record).
    expect(content).toMatch(/class\s+(System\.)?String/);
  });

  /**
   * `String` as a declared instance field type.
   * ApexClassExample.cls line 7: `    private String instanceId;`
   * Column 15 lands inside `String`.
   */
  test('should show hover for String as declared field type', async ({
    hoverHelper,
  }) => {
    const content = await hoverHelper.hoverAtWithResolution(7, 15);
    expect(content).toBeTruthy();
    expect(content.length).toBeGreaterThan(0);
    expect(content).toMatch(/class\s+(System\.)?String/);
  });

  /**
   * `String` as a method return type.
   * ApexClassExample.cls line 51: `    public static String getCurrentUserName() {`
   * Column 21 lands inside `String`.
   */
  test('should show hover for String as method return type', async ({
    hoverHelper,
  }) => {
    const content = await hoverHelper.hoverAtWithResolution(51, 21);
    expect(content).toBeTruthy();
    expect(content.length).toBeGreaterThan(0);
    expect(content).toMatch(/class\s+(System\.)?String/);
  });
});
