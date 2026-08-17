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
    const content = await hoverHelper.hoverOnWordWithRetry('ApexClassExample');
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('ApexClassExample');
    expect(content).toContain('Modifiers:');
  });

  /**
   * Test: Hover on static variable shows type information.
   */
  test('should show hover for static variable', async ({
    apexEditor,
    hoverHelper,
  }) => {
    // Hover on DEFAULT_STATUS at its usage site (line 94, col 35) rather than
    // the declaration (line 3). Static field declarations don't reliably
    // produce hover tooltips via keyboard chord in VS Code Web automated tests,
    // but references within method bodies do.
    await apexEditor.openFile('AccountHandler.cls');
    await apexEditor.openFile('ApexClassExample.cls');
    await apexEditor.waitForLanguageServerReady();
    // DEFAULT_STATUS usage at line 94: `acc.Type = DEFAULT_STATUS;`
    // Reissue the hover request until the language server returns resolved content.
    const content = await hoverHelper.hoverAtWithResolution(94, 35, 'String');
    expect(content).toBeTruthy();
    expect(content).toContain('String');
  });

  /**
   * Test: Hover on instance variable shows type information.
   */
  test('should show hover for instance variable', async ({ hoverHelper }) => {
    // Hover on instanceId at its usage site (line 24: this.instanceId = ...)
    // Field declarations near the top of the file don't reliably produce
    // hover tooltips in desktop mode, but references in method bodies do.
    const content = await hoverHelper.hoverAtWithResolution(24, 14, 'String');
    expect(content).toBeTruthy();
    expect(content).toContain('String');
  });

  /**
   * Test: Hover on method name shows method signature.
   */
  test('should show hover for method name', async ({ hoverHelper }) => {
    const content = await hoverHelper.hoverOnWordWithRetry('sayHello');
    expect(content).toContain('void');
    expect(content).toContain('sayHello');
  });

  /**
   * Test: Hover on inner class shows type information.
   */
  test('should show hover for inner class', async ({ hoverHelper }) => {
    const content = await hoverHelper.hoverOnWordWithRetry('Configuration');
    expect(content).toBeTruthy();
    expect(content).toContain('Configuration');
    expect(content).toMatch(/class\b/i);
  });

  /**
   * Test: Hover on inner enum shows enum information.
   */
  test('should show hover for inner enum', async ({ hoverHelper }) => {
    const content = await hoverHelper.hoverOnWordWithRetry(
      'StatusType',
      /StatusType/,
    );
    expect(content).toBeTruthy();
    expect(content).toContain('StatusType');
    expect(content).toMatch(/enum\b/i);
  });

  /**
   * Test: Hover contains type information for typed symbols.
   */
  test('should show type information in hover', async ({ hoverHelper }) => {
    const content = await hoverHelper.hoverOnWordWithRetry(
      'getCurrentUserName',
      'String',
    );
    // Verify actual type name appears, not just any keyword
    expect(content).toContain('String');
  });

  /**
   * Test: Hover is responsive after lazy semantic preparation.
   */
  test('should show hover within reasonable time', async ({ hoverHelper }) => {
    // A fresh VS Code instance lazily starts the language server and prepares
    // the document on the first semantic request. Warm that path separately so
    // this assertion measures hover responsiveness rather than cold startup.
    await hoverHelper.hoverOnWordWithRetry(
      'ApexClassExample',
      'ApexClassExample',
      30_000,
    );
    await hoverHelper.dismissHover();
    await hoverHelper.waitForHoverToDisappear(3000);

    const isResponsive = await hoverHelper.isHoverResponsive(
      'ApexClassExample',
      12000,
    );
    expect(isResponsive).toBe(true);
    console.log('✅ Hover is responsive (< 12s)');
  });

  /**
   * Test: Hover can be dismissed.
   */
  test('should be able to dismiss hover', async ({ hoverHelper }) => {
    await test.step('Trigger hover', async () => {
      await hoverHelper.hoverOnWordWithRetry('ApexClassExample');
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
    // Target the declaration directly. A case-insensitive editor search for
    // `add` can select the preceding Javadoc word "Adds" instead.
    const content = await hoverHelper.hoverAtWithResolution(42, 27, /Integer/);
    expect(content).toMatch(/Integer/);
    expect(content).toMatch(/add/);
  });

  /**
   * Test: Hover on List variable shows generic type.
   */
  test('should show generic type for List variable', async ({
    hoverHelper,
  }) => {
    const content = await hoverHelper.hoverOnWordWithRetry(
      'accounts',
      /List|Account/,
    );
    expect(content).toBeTruthy();
    expect(content).toMatch(/List|Account/);
  });

  /**
   * Test: Hover on Map variable shows generic types.
   */
  test('should show generic types for Map variable', async ({
    hoverHelper,
  }) => {
    const content = await hoverHelper.hoverAtWithResolution(
      79,
      26,
      /Map|Account/,
    );
    expect(content).toBeTruthy();
    expect(content).toMatch(/Map|Account/);
  });

  /**
   * Test: Multiple hovers can be triggered sequentially.
   */
  test('should handle multiple sequential hovers', async ({ hoverHelper }) => {
    const content1 = await hoverHelper.hoverOnWordWithRetry('ApexClassExample');
    expect(content1).toContain('ApexClassExample');

    await hoverHelper.dismissHover();
    const content2 = await hoverHelper.hoverOnWordWithRetry('Configuration');
    expect(content2).toContain('Configuration');

    await hoverHelper.dismissHover();
    const content3 = await hoverHelper.hoverOnWordWithRetry('StatusType');
    expect(content3).toContain('StatusType');
  });

  /**
   * Test: Hover on constructor shows constructor signature.
   */
  test('should show hover for constructor', async ({ hoverHelper }) => {
    const content = await hoverHelper.hoverOnWordWithRetry(
      'ApexClassExample()',
      'ApexClassExample',
    );
    expect(content).toBeTruthy();
    expect(content).toContain('ApexClassExample');
  });

  /**
   * Test: Hover provides content (not empty).
   */
  test('should provide non-empty hover content', async ({ hoverHelper }) => {
    const content = await hoverHelper.hoverOnWordWithRetry('ApexClassExample');
    expect(content.length).toBeGreaterThan(0);
    expect(content.trim()).not.toBe('');
    expect(content).toContain('ApexClassExample');
  });

  /**
   * Test: Hover on private method shows method information.
   */
  test('should show hover for private method', async ({ hoverHelper }) => {
    const content = await hoverHelper.hoverOnWordWithRetry(
      'validateAccounts',
      /void/,
    );
    expect(content).toContain('void');
    expect(content).toContain('validateAccounts');
  });

  /**
   * Test: Hover shows correct information for different symbol types.
   */
  test('should differentiate between symbol types in hover', async ({
    hoverHelper,
  }) => {
    const classHover =
      await hoverHelper.hoverOnWordWithRetry('ApexClassExample');
    expect(classHover).toContain('ApexClassExample');
    expect(classHover).toContain('Modifiers:');

    await hoverHelper.dismissHover();

    const methodHover = await hoverHelper.hoverOnWordWithRetry(
      'sayHello',
      /void/,
    );
    expect(methodHover).toMatch(/void/);

    expect(classHover).not.toBe(methodHover);
  });

  /**
   * Test: Hover can be captured in screenshot.
   */
  test('should be able to capture hover screenshot', async ({
    hoverHelper,
  }) => {
    const content = await hoverHelper.hoverOnWordWithRetry('ApexClassExample');
    expect(content.length).toBeGreaterThan(0);

    await hoverHelper.captureHoverScreenshot('test-hover');
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
      await apexEditor.openFile('CrossFileUtility.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('CrossFileCaller.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Hover on cross-file class reference', async () => {
      const content = await hoverHelper.hoverAtWithResolution(
        11,
        27,
        'CrossFileUtility',
      );
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
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
      await apexEditor.openFile('CrossFileUtility.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('CrossFileCaller.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Hover on cross-file static method reference', async () => {
      const content = await hoverHelper.hoverAtWithResolution(
        11,
        44,
        'formatName',
      );
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
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
      await apexEditor.openFile('CrossFileBaseClass.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('CrossFileChildClass.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Hover on cross-file base class reference', async () => {
      const content = await hoverHelper.hoverAtWithResolution(
        6,
        42,
        'CrossFileBaseClass',
      );
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
    });
  });
});
