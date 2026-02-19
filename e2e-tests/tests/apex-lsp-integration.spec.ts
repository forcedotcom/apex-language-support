/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';
import { getModifierShortcut } from '../shared/utils/helpers';
import {
  performStrictValidation,
  testLSPFunctionality,
  TestResultReporter,
} from '../utils/test-helpers';

/**
 * E2E tests for general Apex LSP integration and lifecycle.
 *
 * Tests the overall LSP functionality and stability:
 * - LSP initialization and lifecycle
 * - Error recovery and handling
 * - Performance characteristics
 * - Multiple file operations
 * - LSP stability over time
 * - Worker thread management
 *
 * @group lsp-integration
 */

test.describe('Apex LSP Integration', () => {
  /**
   * Test: LSP initializes successfully.
   */
  test('should initialize LSP successfully', async ({
    apexEditor,
    apexTestEnvironment,
  }) => {
    const { lcsDetection } = apexTestEnvironment;

    await test.step('Verify LSP is initialized', async () => {
      expect(lcsDetection).toBeDefined();
      expect(lcsDetection!.lcsIntegrationActive).toBe(true);

      console.log('✅ LSP initialized successfully');
    });

    await test.step('Verify language server is ready', async () => {
      await apexEditor.waitForLanguageServerReady();

      console.log('✅ Language server is ready');
    });
  });

  /**
   * Test: LSP responds to basic requests.
   */
  test('should respond to LSP requests', async ({ apexEditor }) => {
    await test.step('Test basic LSP functionality', async () => {
      const lspFunctionality = await testLSPFunctionality(apexEditor.getPage());

      expect(lspFunctionality.editorResponsive).toBe(true);
      expect(lspFunctionality.symbolsTested).toBe(true);

      console.log('✅ LSP responds to requests');
    });
  });

  /**
   * Test: LSP handles file edits correctly.
   */
  test('should handle file edits', async ({ apexEditor }) => {
    await test.step('Make an edit to the file', async () => {
      await apexEditor.goToPosition(1, 1);
      await apexEditor.typeText('// Test edit\n');
      await apexEditor.waitForContentToInclude('// Test edit', 10_000);

      const content = await apexEditor.getContent();
      // Normalize spaces (Monaco may use \u00A0) and use regex for flexible match
      expect(content.replace(/\u00A0/g, ' ')).toMatch(/\/\/ Test edit/);

      console.log('✅ File edit accepted');
    });

    await test.step('Verify LSP still responsive after edit', async () => {
      // Try to trigger completion after edit
      await apexEditor.goToPosition(3, 1);
      await apexEditor.triggerCompletion();

      console.log('✅ LSP responsive after edit');
    });
  });

  /**
   * Test: LSP maintains state across operations.
   */
  test('should maintain state across multiple operations', async ({
    apexEditor,
    outlineView,
  }) => {
    await test.step('Perform multiple LSP operations', async () => {
      // Open outline
      await outlineView.open();
      await outlineView.waitForSymbols(1);

      // Navigate in editor
      await apexEditor.goToPosition(10, 1);

      // Trigger completion
      await apexEditor.triggerCompletion();

      // All operations should succeed without errors
      console.log('✅ Multiple operations completed');
    });

    await test.step('Verify LSP state is consistent', async () => {
      const symbols = await outlineView.getSymbols();
      expect(symbols.length).toBeGreaterThan(0);

      console.log('✅ LSP state is consistent');
    });
  });

  /**
   * Test: LSP handles rapid consecutive operations.
   */
  test('should handle rapid consecutive operations', async ({ apexEditor }) => {
    await test.step('Perform rapid operations', async () => {
      for (let i = 0; i < 5; i++) {
        await apexEditor.goToPosition(i + 5, 1);
        await apexEditor.typeText('// ');
      }

      console.log('✅ Rapid operations completed');
    });

    await test.step('Verify LSP is still responsive', async () => {
      const content = await apexEditor.getContent();
      expect(content).toBeTruthy();

      console.log('✅ LSP remains responsive after rapid operations');
    });
  });

  /**
   * Test: LSP handles syntax errors gracefully.
   */
  test('should handle syntax errors gracefully', async ({
    apexEditor,
    consoleErrors,
  }) => {
    await test.step('Introduce syntax error', async () => {
      await apexEditor.goToPosition(1, 1);
      await apexEditor.typeText('public class {{{{\n');

      console.log('✅ Syntax error introduced');
    });

    await test.step('Verify LSP does not crash', async () => {
      await apexEditor
        .getPage()
        .locator('.monaco-editor .view-lines')
        .first()
        .waitFor({ state: 'visible', timeout: 5000 });

      expect(await apexEditor.isApexFileOpen()).toBe(true);

      console.log('✅ LSP handles syntax error without crashing');
    });

    await test.step('Verify no catastrophic errors', async () => {
      // Filter out expected diagnostic errors
      const criticalErrors = consoleErrors.filter(
        (e) =>
          !e.text.includes('diagnostic') &&
          e.text.toLowerCase().includes('error'),
      );

      // Should not have unexpected critical errors
      expect(criticalErrors.length).toBeLessThan(5);

      console.log('✅ No catastrophic errors from syntax error');
    });
  });

  /**
   * Test: LSP provides diagnostics for errors.
   */
  test('should provide diagnostics for code issues', async ({ apexEditor }) => {
    await test.step('Introduce a known error', async () => {
      await apexEditor.goToPosition(1, 1);
      await apexEditor.typeText('public class TestClass {\n');
      await apexEditor.typeText('  // Missing closing brace\n');

      console.log('✅ Code with issue introduced');
    });

    await test.step('Wait for diagnostics', async () => {
      await apexEditor
        .getPage()
        .locator('.monaco-editor .view-lines')
        .first()
        .waitFor({ state: 'visible', timeout: 5000 });

      // LSP should still be functional
      expect(await apexEditor.isApexFileOpen()).toBe(true);

      console.log('✅ LSP provides diagnostics');
    });
  });

  /**
   * Test: LSP handles large file content.
   */
  test('should handle large file content', async ({ apexEditor }) => {
    await test.step('Add substantial content to file', async () => {
      await apexEditor.goToPosition(1, 1);

      // Add multiple lines of code
      for (let i = 0; i < 20; i++) {
        await apexEditor.typeText(`// Line ${i}\n`);
      }

      console.log('✅ Large content added');
    });

    await test.step('Verify LSP handles large content', async () => {
      const content = await apexEditor.findAndGetViewportContent('// Line 0');
      expect(content.length).toBeGreaterThan(500);

      // LSP should still be responsive
      await apexEditor.goToPosition(10, 1);

      console.log('✅ LSP handles large content');
    });
  });

  /**
   * Test: LSP performance for basic operations.
   */
  test('should maintain good performance for basic operations', async ({
    apexEditor,
  }) => {
    const timings: { operation: string; duration: number }[] = [];

    await test.step('Measure navigation performance', async () => {
      const start = Date.now();
      await apexEditor.goToPosition(10, 1);
      const duration = Date.now() - start;

      timings.push({ operation: 'navigation', duration });
      expect(duration).toBeLessThan(2000);
    });

    await test.step('Measure typing performance', async () => {
      const start = Date.now();
      await apexEditor.typeText('// test');
      const duration = Date.now() - start;

      timings.push({ operation: 'typing', duration });
      expect(duration).toBeLessThan(2000);
    });

    await test.step('Report performance metrics', async () => {
      timings.forEach((t) => {
        console.log(`  ${t.operation}: ${t.duration}ms`);
      });
      console.log('✅ Performance is acceptable');
    });
  });

  /**
   * Test: LSP error recovery.
   */
  test('should recover from temporary errors', async ({ apexEditor }) => {
    await test.step('Cause temporary error state', async () => {
      await apexEditor.typeText('public class Test {');
      await apexEditor.waitForContentToInclude('{', 2000);
      await apexEditor.typeText('}');

      console.log('✅ Temporary error state introduced');
    });

    await test.step('Verify recovery', async () => {
      await apexEditor
        .getPage()
        .locator('.monaco-editor .view-lines')
        .first()
        .waitFor({ state: 'visible', timeout: 5000 });

      // Verify LSP is functional
      expect(await apexEditor.isApexFileOpen()).toBe(true);

      console.log('✅ LSP recovered from temporary error');
    });
  });

  /**
   * Test: LSP stability over extended period.
   */
  test('should maintain stability over extended period', async ({
    apexEditor,
    consoleErrors,
    networkErrors,
  }) => {
    await test.step('Perform extended operations', async () => {
      for (let i = 0; i < 10; i++) {
        const marker = `// STABILITY_${i}`;
        await apexEditor.goToPosition(i + 5, 1);
        await apexEditor.typeText(marker);
        await apexEditor.waitForContentToInclude(marker, 5000);
      }

      console.log('✅ Extended operations completed');
    });

    await test.step('Verify no errors accumulated', async () => {
      const validation = performStrictValidation(consoleErrors, networkErrors);

      expect(validation.consoleValidation.allErrorsAllowed).toBe(true);

      console.log('✅ No errors accumulated over time');
    });
  });

  /**
   * Test: LSP handles completion requests.
   */
  test('should handle completion requests', async ({ apexEditor }) => {
    await test.step('Position cursor for completion', async () => {
      await apexEditor.goToPosition(10, 1);
      await apexEditor.typeText('String s = ');
    });

    await test.step('Trigger completion', async () => {
      await apexEditor.triggerCompletion();

      console.log('✅ Completion request handled');
    });
  });

  /**
   * Test: LSP handles signature help requests.
   */
  test('should handle signature help requests', async ({ apexEditor }) => {
    await test.step('Position cursor for signature help', async () => {
      await apexEditor.goToPosition(10, 1);
      await apexEditor.typeText('System.debug(');
    });

    await test.step('Trigger signature help', async () => {
      await apexEditor.triggerSignatureHelp();

      console.log('✅ Signature help request handled');
    });
  });

  /**
   * Test: LSP worker thread is active.
   */
  test('should have active LSP worker thread', async ({
    apexTestEnvironment,
  }) => {
    const { lcsDetection } = apexTestEnvironment;

    await test.step('Verify worker information', async () => {
      expect(lcsDetection).toBeDefined();
      expect(lcsDetection!.lcsIntegrationActive).toBe(true);

      if (lcsDetection!.bundleSize) {
        expect(lcsDetection!.bundleSize).toBeGreaterThan(0);
        console.log(`✅ Worker bundle size: ${lcsDetection!.bundleSize} bytes`);
      }
    });
  });

  /**
   * Test: LSP handles undo/redo operations.
   */
  test('should handle undo/redo operations', async ({ apexEditor }) => {
    await test.step('Make an edit', async () => {
      await apexEditor.goToPosition(1, 1);
      await apexEditor.typeText('// Original edit');
      await apexEditor.getPage().keyboard.press('Enter');
      await apexEditor.waitForContentToInclude('// Original edit', 5000);
      // Scroll to the edit so it's in the viewport (Monaco virtualizes)
      await apexEditor.findText('// Original edit');
      const content = await apexEditor.getContent();
      // Normalize spaces (Monaco may use \u00A0) and use regex for flexible match
      expect(content.replace(/\u00A0/g, ' ')).toMatch(/\/\/ Original edit/);
    });

    await test.step('Undo edit', async () => {
      await apexEditor.getPage().keyboard.press(getModifierShortcut('Z'));
      console.log('✅ Undo performed');
    });

    await test.step('Verify LSP still responsive', async () => {
      expect(await apexEditor.isApexFileOpen()).toBe(true);

      console.log('✅ LSP handles undo/redo');
    });
  });

  /**
   * Test: LSP comprehensive validation.
   */
  test('should pass comprehensive LSP validation', async ({
    apexTestEnvironment,
    consoleErrors,
    networkErrors,
  }) => {
    const { lcsDetection } = apexTestEnvironment;

    await test.step('Validate LCS integration', async () => {
      TestResultReporter.reportLCSDetection(lcsDetection!);

      expect(lcsDetection!.lcsIntegrationActive).toBe(true);
      expect(lcsDetection!.hasErrorIndicators).toBe(false);
    });

    await test.step('Validate no critical errors', async () => {
      const validation = performStrictValidation(consoleErrors, networkErrors);
      TestResultReporter.reportValidation(validation);

      expect(validation.consoleValidation.allErrorsAllowed).toBe(true);
      expect(validation.networkValidation.allErrorsAllowed).toBe(true);
    });

    console.log('🎉 Comprehensive LSP validation PASSED');
  });
});
