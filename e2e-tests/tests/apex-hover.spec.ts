/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';
import { TestResultReporter } from '../utils/test-helpers';
import { HOVER_TEST_SCENARIOS } from '../utils/constants';

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
   * Core hover test: Execute all hover scenarios from constants.
   */
  test('should provide comprehensive hover information for Apex symbols', async ({
    hoverHelper,
  }) => {
    test.setTimeout(120_000);
    console.log('🔍 Testing hover functionality for Apex symbols...');

    await test.step('Execute all hover test scenarios', async () => {
      const hoverResults =
        await hoverHelper.testScenarios(HOVER_TEST_SCENARIOS);

      // Report results
      TestResultReporter.reportHoverResults(hoverResults);

      // Assert all scenarios passed
      expect(hoverResults.length).toBe(HOVER_TEST_SCENARIOS.length);
      expect(hoverResults.every((result) => result.success)).toBe(true);
    });

    console.log('🎉 Comprehensive hover functionality test PASSED');
  });

  /**
   * Test: Hover on class name shows class information.
   */
  test('should show hover for class name', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('ApexClassExample');
    const content = await hoverHelper.getHoverContent();
    expect(content.length).toBeGreaterThan(0);
    console.log(`✅ Class hover content: ${content.substring(0, 50)}...`);
  });

  /**
   * Test: Hover on static variable shows type information.
   */
  test('should show hover for static variable', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('DEFAULT_STATUS');
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
    expect(content.length).toBeGreaterThan(0);
    console.log('✅ Static variable hover provided');
  });

  /**
   * Test: Hover on instance variable shows type information.
   */
  test('should show hover for instance variable', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('instanceId');
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
    console.log('✅ Instance variable hover provided');
  });

  /**
   * Test: Hover on method name shows method signature.
   */
  test('should show hover for method name', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('sayHello');
    const hasMethodSig = await hoverHelper.hasMethodSignature();
    expect(hasMethodSig).toBe(true);
    console.log('✅ Method hover shows signature');
  });

  /**
   * Test: Hover on inner class shows type information.
   */
  test('should show hover for inner class', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('Configuration');
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
    expect(content.length).toBeGreaterThan(0);
    console.log('✅ Inner class hover provided');
  });

  /**
   * Test: Hover on inner enum shows enum information.
   */
  test('should show hover for inner enum', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('StatusType');
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
    console.log('✅ Inner enum hover provided');
  });

  /**
   * Test: Hover contains type information for typed symbols.
   */
  test('should show type information in hover', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('instanceId');
    const hasTypeInfo = await hoverHelper.hasTypeInformation();
    expect(hasTypeInfo).toBe(true);
    console.log('✅ Hover contains type information');
  });

  /**
   * Test: Hover is responsive (appears within reasonable time).
   */
  test('should show hover within reasonable time', async ({ hoverHelper }) => {
    // LSP hover can take a few seconds to resolve in web environment
    const isResponsive = await hoverHelper.isHoverResponsive(
      'ApexClassExample',
      8000,
    );
    expect(isResponsive).toBe(true);
    console.log('✅ Hover is responsive (< 8s)');
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
    console.log('✅ Hover can be dismissed');
  });

  /**
   * Test: Hover on method with parameters shows parameter types.
   */
  test('should show parameter types in method hover', async ({
    hoverHelper,
  }) => {
    await hoverHelper.hoverOnWord('Integer add(Integer a');
    const methodSignaturePattern = /\w+\s*\([^)]*\)/;
    const parameterSymbolPattern = /\b\w+\s+\w+(?:\.\w+){2,}\b/;
    await expect
      .poll(
        async () => {
          const content = await hoverHelper.getHoverContent();
          const normalized = content.trim();
          if (!normalized) return false;
          return (
            methodSignaturePattern.test(normalized) ||
            parameterSymbolPattern.test(normalized)
          );
        },
        {
          timeout: 8000,
          message:
            'Expected hover to include method signature or parameter symbol details',
        },
      )
      .toBe(true);
    console.log('✅ Method with parameters shows signature in hover');
  });

  /**
   * Test: Hover on List variable shows generic type.
   */
  test('should show generic type for List variable', async ({
    hoverHelper,
  }) => {
    await hoverHelper.hoverOnWord('List<Account> accounts');
    const content = await hoverHelper.getHoverContent();
    const hasTypeInfo = await hoverHelper.hasTypeInformation();
    expect(hasTypeInfo).toBe(true);
    expect(content).toBeTruthy();
    console.log('✅ List variable hover shows generic type');
  });

  /**
   * Test: Hover on Map variable shows generic types.
   */
  test('should show generic types for Map variable', async ({
    hoverHelper,
  }) => {
    await hoverHelper.hoverOnWord('Map<Id, Account> accountMap');
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
    console.log('✅ Map variable hover shows generic types');
  });

  /**
   * Test: Multiple hovers can be triggered sequentially.
   */
  test('should handle multiple sequential hovers', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('ApexClassExample');
    let content1 = await hoverHelper.getHoverContent();
    expect(content1).toBeTruthy();

    await hoverHelper.dismissHover();
    await hoverHelper.hoverOnWord('Configuration');
    let content2 = await hoverHelper.getHoverContent();
    expect(content2).toBeTruthy();

    await hoverHelper.dismissHover();
    await hoverHelper.hoverOnWord('StatusType');
    let content3 = await hoverHelper.getHoverContent();
    expect(content3).toBeTruthy();

    console.log('✅ Multiple sequential hovers work correctly');
  });

  /**
   * Test: Hover on constructor shows constructor signature.
   */
  test('should show hover for constructor', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord("this('default-instance')");
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
    console.log('✅ Constructor hover provided');
  });

  /**
   * Test: Hover provides content (not empty).
   */
  test('should provide non-empty hover content', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('ApexClassExample');
    const content = await hoverHelper.getHoverContent();
    expect(content.length).toBeGreaterThan(0);
    expect(content.trim()).not.toBe('');
    console.log(`✅ Hover content is non-empty (${content.length} chars)`);
  });

  /**
   * Test: Hover on private method shows method information.
   */
  test('should show hover for private method', async ({ hoverHelper }) => {
    await hoverHelper.hoverOnWord('validateAccounts');
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
    console.log('✅ Private method hover provided');
  });

  /**
   * Test: Hover shows correct information for different symbol types.
   */
  test('should differentiate between symbol types in hover', async ({
    hoverHelper,
  }) => {
    await hoverHelper.hoverOnWord('ApexClassExample');
    const classHover = await hoverHelper.getHoverContent();

    await hoverHelper.dismissHover();

    await hoverHelper.hoverOnWord('sayHello');
    const methodHover = await hoverHelper.getHoverContent();

    expect(classHover).not.toBe(methodHover);
    console.log('✅ Different symbols provide different hover content');
  });

  /**
   * Test: Hover can be captured in screenshot.
   */
  test('should be able to capture hover screenshot', async ({
    hoverHelper,
  }) => {
    await hoverHelper.hoverOnWord('ApexClassExample');
    await hoverHelper.waitForHover();

    await hoverHelper.captureHoverScreenshot('test-hover');

    console.log('✅ Hover screenshot captured successfully');
  });
});
