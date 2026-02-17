/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';
import {
  performStrictValidation,
  testLSPFunctionality,
  verifyVSCodeStability,
  TestResultReporter,
  TestConfiguration,
} from '../utils/test-helpers';
import { SELECTORS } from '../utils/constants';

/**
 * Core E2E tests for Apex Language Server Extension activation and integration.
 *
 * This test suite focuses on the fundamental extension functionality:
 * - VS Code Web startup and workbench loading
 * - Extension activation and LSP worker initialization
 * - LCS (LSP-Compliant-Services) integration validation
 * - Worker bundle validation
 * - Extension stability
 * - Error monitoring and validation
 *
 * Note: Specific feature tests (outline, hover, go-to-definition) are in separate spec files.
 *
 * @group core
 */

test.describe('Apex Extension Core Activation', () => {
  /**
   * Core activation test: Verify VS Code starts, extension activates, and LCS integrates correctly.
   *
   * This test verifies the fundamental requirements:
   * - VS Code Web environment loads correctly
   * - Extension activates when opening Apex files
   * - LCS services are integrated (not using stub fallback)
   * - Worker loading and bundle size indicates LCS inclusion
   * - Extension remains stable after activation
   * - No critical errors occur during activation
   */
  test('should start VS Code, activate extension, and validate LCS integration', async ({
    apexEditor,
    apexTestEnvironment,
    consoleErrors,
    networkErrors,
  }) => {
    const { lcsDetection } = apexTestEnvironment;

    await test.step('Verify test environment setup completed', async () => {
      // Environment setup by fixture includes:
      // - VS Code Web loaded
      // - Apex file opened
      // - Extension activated
      console.log('✅ Test environment setup completed');
    });

    await test.step('Report LCS detection results', async () => {
      TestResultReporter.reportLCSDetection(lcsDetection!);

      expect(lcsDetection!.lcsIntegrationActive).toBe(true);
      expect(lcsDetection!.hasErrorIndicators).toBe(false);

      console.log('✅ LCS integration validated');
    });

    await test.step('Test basic LSP functionality', async () => {
      const lspFunctionality = await testLSPFunctionality(apexEditor.getPage());
      TestResultReporter.reportLSPFunctionality(lspFunctionality);

      expect(lspFunctionality.editorResponsive).toBe(true);

      console.log('✅ LSP functionality verified');
    });

    await test.step('Verify extension in extensions list', async () => {
      console.log('📋 Checking extension list...');

      await apexEditor.getPage().keyboard.press('Control+Shift+X');
      await apexEditor.waitForSelector(SELECTORS.EXTENSIONS_VIEW, 30_000);

      const installedSection = apexEditor
        .getPage()
        .locator('text=INSTALLED')
        .first();
      if (await installedSection.isVisible()) {
        await installedSection.click();
        await apexEditor
          .getPage()
          .waitForSelector('.extensions-list', { timeout: 5000 });
        console.log('✅ Found INSTALLED extensions section');
      }
    });

    await test.step('Verify VS Code stability', async () => {
      await verifyVSCodeStability(apexEditor.getPage());
      console.log('✅ VS Code is stable');
    });

    await test.step('Validate bundle size', async () => {
      if (lcsDetection!.bundleSize) {
        const bundleValidation = TestConfiguration.validateBundleSize(
          lcsDetection!.bundleSize,
        );

        expect(bundleValidation.meetsLCSThreshold).toBe(true);
        expect(bundleValidation.isValid).toBe(true);

        console.log(`✅ Bundle size valid: ${lcsDetection!.bundleSize} bytes`);
      }
    });

    await test.step('Perform comprehensive error validation', async () => {
      const validation = performStrictValidation(consoleErrors, networkErrors);
      TestResultReporter.reportValidation(validation);

      expect(validation.consoleValidation.allErrorsAllowed).toBe(true);
      expect(validation.networkValidation.allErrorsAllowed).toBe(true);

      console.log('✅ No critical errors detected');
    });

    console.log('🎉 Core functionality with LCS integration test PASSED');
  });

  /**
   * Test: Verify Apex file opens correctly.
   */
  test('should open Apex file successfully', async ({ apexEditor }) => {
    await test.step('Verify Apex file is open', async () => {
      const isOpen = await apexEditor.isApexFileOpen();
      expect(isOpen).toBe(true);

      console.log('✅ Apex file opened successfully');
    });
  });

  /**
   * Test: Verify language server initializes.
   */
  test('should initialize language server', async ({ apexEditor }) => {
    await test.step('Wait for language server', async () => {
      // Simply await the method - if it throws, the test will fail
      await apexEditor.waitForLanguageServerReady();
      console.log('✅ Language server initialized');
    });
  });

  /**
   * Test: Verify editor is responsive.
   */
  test('should have responsive editor', async ({ apexEditor }) => {
    await test.step('Type text in editor', async () => {
      // Type a unique marker that we can search for
      const marker = 'TEST_MARKER_' + Date.now();
      await apexEditor.typeText(`// ${marker}`);

      await apexEditor.waitForContentToInclude(marker);

      const content = await apexEditor.findAndGetViewportContent(marker);
      const hasMarker = content.toLowerCase().includes(marker.toLowerCase());
      expect(hasMarker).toBe(true);

      console.log('✅ Editor is responsive');
    });
  });

  /**
   * Test: Verify workbench is loaded.
   */
  test('should have workbench loaded', async ({ apexEditor }) => {
    await test.step('Verify workbench elements', async () => {
      // Workbench should be loaded by test environment
      await apexEditor.waitForWorkbenchLoad();

      console.log('✅ Workbench is loaded');
    });
  });

  /**
   * Test: Verify extension stability over time.
   */
  test('should maintain stability after activation', async ({
    apexEditor,
    consoleErrors,
  }) => {
    await test.step('Wait for stability period', async () => {
      // Wait for editor to be idle (tab still visible, no loading state)
      await apexEditor
        .getPage()
        .locator('.tab[aria-selected="true"]')
        .waitFor({ state: 'visible', timeout: 5000 });
    });

    await test.step('Check for new critical errors', async () => {
      const criticalErrors = consoleErrors.filter((e) =>
        e.text.toLowerCase().includes('error'),
      );
      const allowedErrors = criticalErrors.filter((e) =>
        e.text.includes('Request textDocument/diagnostic failed'),
      );

      // All critical errors should be in allow list
      expect(criticalErrors.length).toBe(allowedErrors.length);

      console.log('✅ No new critical errors after stability period');
    });
  });

  /**
   * Test: Verify console has expected startup logs.
   */
  test('should have console logs indicating successful startup', async ({
    apexTestEnvironment,
  }) => {
    const { lcsDetection } = apexTestEnvironment;

    await test.step('Verify LCS detection logs', async () => {
      expect(lcsDetection).toBeDefined();
      expect(lcsDetection!.lcsIntegrationActive).toBe(true);

      console.log('✅ Startup logs indicate successful LCS activation');
    });
  });

  /**
   * Test: Verify network requests are successful (or acceptably failed).
   */
  test('should handle network requests appropriately', async ({
    networkErrors,
  }) => {
    await test.step('Validate network errors', async () => {
      const validation = performStrictValidation([], networkErrors);

      expect(validation.networkValidation.allErrorsAllowed).toBe(true);

      console.log(
        `✅ Network errors handled appropriately (${networkErrors.length} total)`,
      );
    });
  });
});
