/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';

/**
 * E2E tests for Apex Hover functionality.
 *
 * Tests the LSP hover capabilities for various Apex symbols:
 * - Hover on classes, methods, variables
 * - Hover on user-defined types
 * - Hover on inner classes and enums
 * - Hover content validation
 *
 * IMPORTANT: Hover tests require the standard Apex library to be fully loaded.
 * The standard library provides type information for String, System, Map, List,
 * Account, and other standard Apex types. Without it, the LSP reports semantic
 * errors and cannot provide hover content.
 *
 * Current Status: Tests are enabled. The standard library loads correctly
 * and the hover functionality is working in VS Code Web test environment.
 *
 * @group hover
 */

test.describe('Apex Hover Functionality', () => {
  /**
   * Test: Hover on class name shows class information.
   */
  test('should show hover for class name', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('ApexClassExample');
    const content = await hoverHelper.getHoverContent();
    expect(content.length).toBeGreaterThan(0);
    expect(content).toMatch(/class\b/i);
    expect(content).toContain('ApexClassExample');
  });

  /**
   * Test: Hover on static variable shows type information.
   */
  test('should show hover for static variable', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('DEFAULT_STATUS');
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
    expect(content).toContain('String');
  });

  /**
   * Test: Hover on instance variable shows type information.
   */
  test('should show hover for instance variable', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('instanceId');
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
    expect(content).toContain('String');
  });

  /**
   * Test: Hover on method name shows method signature.
   */
  test('should show hover for method name', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('sayHello');
    const content = await hoverHelper.getHoverContent();
    expect(content).toContain('void');
    expect(content).toContain('sayHello');
  });

  /**
   * Test: Hover on inner class shows type information.
   */
  test('should show hover for inner class', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('Configuration');
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
    expect(content).toContain('Configuration');
    expect(content).toMatch(/class\b/i);
  });

  /**
   * Test: Hover on inner enum shows enum information.
   */
  test('should show hover for inner enum', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('StatusType');
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
    expect(content).toContain('StatusType');
    expect(content).toMatch(/enum\b/i);
  });

  /**
   * Test: Hover contains type information for typed symbols.
   */
  test('should show type information in hover', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('instanceId');
    const content = await hoverHelper.getHoverContent();
    // Verify actual type name appears, not just any keyword
    expect(content).toContain('String');
  });

  /**
   * Test: Hover is responsive (appears within reasonable time).
   */
  test('should show hover within reasonable time', async ({ hoverHelper }) => {
    const isResponsive = await hoverHelper.isHoverResponsive(
      'ApexClassExample',
      8000,
    );
    expect(isResponsive).toBe(true);
  });

  /**
   * Test: Hover can be dismissed.
   */
  test('should be able to dismiss hover', async ({ hoverHelper }) => {
    await test.step('Trigger hover', async () => {
      await hoverHelper.hoverOnWord('ApexClassExample');
      await hoverHelper.waitForHover();
    });

    await test.step('Dismiss hover', async () => {
      await hoverHelper.dismissHover();
      await hoverHelper.waitForHoverToDisappear(3000);
    });

    expect(await hoverHelper.isHoverVisible()).toBe(false);
  });

  /**
   * Test: Hover on method with parameters shows parameter types.
   */
  test('should show parameter types in method hover', async ({
    hoverHelper,
  }) => {
    await hoverHelper.hoverOnWord('add');
    const content = await hoverHelper.getHoverContent();
    expect(content).toMatch(/Integer/);
    expect(content).toMatch(/add/);
  });

  /**
   * Test: Hover on List variable shows generic type.
   */
  test('should show generic type for List variable', async ({
    hoverHelper,
  }) => {
    await hoverHelper.hoverOnWord('accounts');
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
    expect(content).toMatch(/List|Account/);
  });

  /**
   * Test: Hover on Map variable shows generic types.
   */
  test('should show generic types for Map variable', async ({
    hoverHelper,
  }) => {
    await hoverHelper.hoverOnWord('accountMap');
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
    expect(content).toMatch(/Map|Account/);
  });

  /**
   * Test: Multiple hovers can be triggered sequentially.
   */
  test('should handle multiple sequential hovers', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('ApexClassExample');
    const content1 = await hoverHelper.getHoverContent();
    expect(content1).toContain('ApexClassExample');

    await hoverHelper.dismissHover();
    await hoverHelper.hoverOnWord('Configuration');
    const content2 = await hoverHelper.getHoverContent();
    expect(content2).toContain('Configuration');

    await hoverHelper.dismissHover();
    await hoverHelper.hoverOnWord('StatusType');
    const content3 = await hoverHelper.getHoverContent();
    expect(content3).toContain('StatusType');
  });

  /**
   * Test: Hover on constructor shows constructor signature.
   */
  test('should show hover for constructor', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('ApexClassExample(');
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
    expect(content).toContain('ApexClassExample');
  });

  /**
   * Test: Hover provides content (not empty).
   */
  test('should provide non-empty hover content', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('ApexClassExample');
    const content = await hoverHelper.getHoverContent();
    expect(content.length).toBeGreaterThan(0);
    expect(content.trim()).not.toBe('');
    expect(content).toContain('ApexClassExample');
  });

  /**
   * Test: Hover on private method shows method information.
   */
  test('should show hover for private method', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('validateAccounts');
    const content = await hoverHelper.getHoverContent();
    expect(content).toContain('void');
    expect(content).toContain('validateAccounts');
  });

  /**
   * Test: Hover shows correct information for different symbol types.
   */
  test('should differentiate between symbol types in hover', async ({
    hoverHelper,
  }) => {
    await hoverHelper.hoverOnWord('ApexClassExample');
    const classHover = await hoverHelper.getHoverContent();
    expect(classHover).toMatch(/class\b/i);

    await hoverHelper.dismissHover();

    await hoverHelper.hoverOnWord('sayHello');
    const methodHover = await hoverHelper.getHoverContent();
    expect(methodHover).toMatch(/void/);

    expect(classHover).not.toBe(methodHover);
  });

  /**
   * Test: Hover can be captured in screenshot.
   */
  test('should be able to capture hover screenshot', async ({
    hoverHelper,
  }) => {
    await hoverHelper.hoverOnWord('ApexClassExample');
    const content = await hoverHelper.getHoverContent();
    expect(content.length).toBeGreaterThan(0);

    await hoverHelper.captureHoverScreenshot('test-hover');
  });
});
