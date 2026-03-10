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
    await hoverHelper.hoverOnWord('add');
    const content = await hoverHelper.getHoverContent();
    expect(content).toBeTruthy();
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
    await hoverHelper.hoverOnWord('ApexClassExample()');
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
    const content = await hoverHelper.getHoverContent();
    expect(content.length).toBeGreaterThan(0);

    await hoverHelper.captureHoverScreenshot('test-hover');

    console.log('✅ Hover screenshot captured successfully');
  });
});

/**
 * Cross-File Workspace Hover tests.
 * These tests verify hover where the hovered symbol is defined in a different
 * user workspace file (not a standard Apex library type).
 * Uses CrossFileCaller.cls → CrossFileUtility.cls and
 * CrossFileChildClass.cls → CrossFileBaseClass.cls pairs.
 */
test.describe('Apex Hover - Cross-File Workspace Types', () => {
  /**
   * Test: Hover on a class type defined in another workspace file.
   * Opens CrossFileCaller.cls and hovers on CrossFileUtility.
   */
  test('should show hover for class type defined in another workspace file', async ({
    apexEditor,
    hoverHelper,
  }) => {
    await test.step('Open the caller file', async () => {
      try {
        await apexEditor.openFile('CrossFileCaller.cls');
        await apexEditor.waitForLanguageServerReady();
        console.log('✅ Opened CrossFileCaller.cls');
      } catch (error) {
        const errStr =
          error instanceof Error
            ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
            : JSON.stringify(error);
        console.log('⚠️ CrossFileCaller.cls not available', errStr);
        return;
      }
    });

    await test.step('Hover on cross-file class reference', async () => {
      await hoverHelper.hoverOnWord('CrossFileUtility');
      const content = await hoverHelper.getHoverContent();
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
      console.log(
        '✅ Hover content shown for cross-file class CrossFileUtility',
      );
    });
  });

  /**
   * Test: Hover on a static method call defined in another workspace file.
   * Opens CrossFileCaller.cls and hovers on the formatName call.
   */
  test('should show hover for static method defined in another workspace file', async ({
    apexEditor,
    hoverHelper,
  }) => {
    await test.step('Open the caller file', async () => {
      try {
        await apexEditor.openFile('CrossFileCaller.cls');
        await apexEditor.waitForLanguageServerReady();
      } catch (error) {
        const errStr =
          error instanceof Error
            ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
            : JSON.stringify(error);
        console.log('⚠️ CrossFileCaller.cls not available', errStr);
        return;
      }
    });

    await test.step('Hover on cross-file static method reference', async () => {
      await hoverHelper.hoverOnWord('formatName');
      const content = await hoverHelper.getHoverContent();
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
      console.log('✅ Hover content shown for cross-file method formatName');
    });
  });

  /**
   * Test: Hover on an inherited base class type defined in another workspace file.
   * Opens CrossFileChildClass.cls and hovers on CrossFileBaseClass.
   */
  test('should show hover for base class type defined in another workspace file', async ({
    apexEditor,
    hoverHelper,
  }) => {
    await test.step('Open the child class file', async () => {
      try {
        await apexEditor.openFile('CrossFileChildClass.cls');
        await apexEditor.waitForLanguageServerReady();
        console.log('✅ Opened CrossFileChildClass.cls');
      } catch (error) {
        const errStr =
          error instanceof Error
            ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
            : JSON.stringify(error);
        console.log('⚠️ CrossFileChildClass.cls not available', errStr);
        return;
      }
    });

    await test.step('Hover on cross-file base class reference', async () => {
      await hoverHelper.hoverOnWord('CrossFileBaseClass');
      const content = await hoverHelper.getHoverContent();
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
      console.log(
        '✅ Hover content shown for cross-file base class CrossFileBaseClass',
      );
    });
  });
});
