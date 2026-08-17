/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';
import { readOutputChannelText } from '../shared/pages/outputChannel';

const CLIENT_OUTPUT_CHANNEL = 'Apex Language Server Extension (Client)';
const WORKER_OUTPUT_CHANNEL = 'Apex Language Server Extension (Worker/Server)';

// Advanced + cross-file go-to-definition scenarios. Split out of
// apex-goto-definition.spec.ts: the basic suite is already 20 tests, and these
// cross-file scenarios are the slowest / most race-prone (they depend on full
// workspace ingestion, not just LSP init). Keeping them in their own matrix
// entry means one flake here re-runs 9 tests, not 29 — which is what pushed the
// combined file past the 20-min job timeout and got it cancelled.
//
// Each test launches a compiler-backed VS Code web host against the same
// workspace fixture; running fully parallel starves definition requests and
// races the shared fixture, and CI already runs one worker. Keep serial.
test.describe.configure({ mode: 'serial' });

/**
 * Advanced Go-to-Definition tests with test data files.
 * These tests use the test-data files for more complex scenarios.
 */
test.describe('Apex Go-to-Definition - Advanced Scenarios', () => {
  /**
   * Test: Navigate across inheritance hierarchy.
   * Uses AccountHandler.cls test file.
   */
  test('should navigate to base class from derived class', async ({
    apexEditor,
    page,
  }) => {
    await test.step('Open base class, then inheritance test file', async () => {
      // didOpen is what eagerly prepares a workspace file. Workspace ingestion
      // alone no longer guarantees full symbol enrichment for cross-file
      // references, so prepare the target before opening the source of F12.
      await apexEditor.openFile('BaseHandler.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('AccountHandler.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.waitForWorkspaceReady();
    });

    await test.step('Navigate from derived class to base', async () => {
      await apexEditor.positionCursorOnWord('BaseHandler');
      await apexEditor.goToDefinition();
      let navigationError: unknown;
      try {
        await apexEditor.waitForNavigation('AccountHandler.cls', 12000);
      } catch (error) {
        navigationError = error;
      }

      if (navigationError && process.env.E2E_APEX_DIAGNOSTICS === '1') {
        console.log(
          `[APEX E2E DIAGNOSTICS: client]\n${await readOutputChannelText(page, CLIENT_OUTPUT_CHANNEL)}`,
        );
        console.log(
          `[APEX E2E DIAGNOSTICS: worker]\n${await readOutputChannelText(page, WORKER_OUTPUT_CHANNEL)}`,
        );
      }

      if (navigationError) throw navigationError;

      const content = await apexEditor.findAndGetViewportContent(
        'abstract class BaseHandler',
      );
      expect(content).toMatch(/abstract\s+class\s+BaseHandler/);
    });
  });

  /**
   * Test: Navigate to overridden method.
   */
  test('should navigate to overridden method in derived class', async ({
    apexEditor,
  }) => {
    await test.step('Open inheritance test file', async () => {
      await apexEditor.openFile('AccountHandler.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.waitForWorkspaceReady();
    });

    await test.step('Navigate to overridden execute method', async () => {
      await apexEditor.positionCursorOnWord('execute');
      await apexEditor.goToDefinition();

      // execute override is declared at line 19 in AccountHandler.cls
      await apexEditor.expectCursorAtLine(19);
    });
  });

  /**
   * Test: Navigate to interface definition from implementation.
   * Uses AccountProcessor.cls test file.
   */
  test('should navigate to interface from implementing class', async ({
    apexEditor,
  }) => {
    await test.step('Open interface, then implementation test file', async () => {
      await apexEditor.openFile('DataProcessor.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('AccountProcessor.cls');
      await apexEditor.waitForLanguageServerReady();
      // This is the historically flaky test: it gated only on LSP init, so the
      // DataProcessor interface (defined in another file) could be requested
      // before workspace ingestion finished, returning null with no auto-retry.
      await apexEditor.waitForWorkspaceReady();
    });

    await test.step('Navigate to interface definition', async () => {
      await apexEditor.positionCursorOnWord('DataProcessor');
      await apexEditor.goToDefinition();
      await apexEditor.waitForNavigation('AccountProcessor.cls', 15000);

      const content = await apexEditor.findAndGetViewportContent(
        'interface DataProcessor',
      );
      expect(content).toMatch(/interface\s+DataProcessor/);
    });
  });

  /**
   * Test: Navigate to interface method from implementation.
   */
  test('should navigate to interface method from implementation', async ({
    apexEditor,
  }) => {
    await test.step('Open interface implementation file', async () => {
      await apexEditor.openFile('AccountProcessor.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.waitForWorkspaceReady();
    });

    await test.step('Navigate to processRecords method', async () => {
      await apexEditor.positionCursorOnWord('processRecords');
      await apexEditor.goToDefinition();

      // processRecords is declared at line 20 in AccountProcessor.cls
      await apexEditor.expectCursorAtLine(20);
    });
  });

  /**
   * Test: Navigate in complex class with multiple nested types.
   * Uses ComplexClass.cls test file.
   */
  test('should navigate in complex class structure', async ({ apexEditor }) => {
    await test.step('Open complex class test file', async () => {
      await apexEditor.openFile('ComplexClass.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.waitForWorkspaceReady();
    });

    await test.step('Navigate to inner class in complex file', async () => {
      await apexEditor.positionCursorOnWord('Configuration');
      await apexEditor.goToDefinition();

      // Configuration inner class is declared at line 102 in ComplexClass.cls
      await apexEditor.expectCursorAtLine(102);
    });
  });
});

/**
 * Cross-File Workspace Resolution tests.
 * These tests verify go-to-definition where both the source and target files
 * are user workspace files (not standard Apex library types).
 * Uses CrossFileCaller.cls → CrossFileUtility.cls and
 * CrossFileChildClass.cls → CrossFileBaseClass.cls pairs.
 */
test.describe('Apex Go-to-Definition - Cross-File Workspace Resolution', () => {
  /**
   * Test: Navigate to a class defined in another workspace file (static utility).
   * Opens CrossFileCaller.cls and navigates to CrossFileUtility defined in CrossFileUtility.cls.
   */
  test('should navigate to class defined in another workspace file', async ({
    apexEditor,
    hoverHelper,
  }) => {
    await test.step('Open the caller file', async () => {
      // Open the target file first so the LSP indexes it eagerly.
      // Method-call references like CrossFileUtility.formatName are resolved
      // lazily and may not be indexed by hover warm-up alone.
      await apexEditor.openFile('CrossFileUtility.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('CrossFileCaller.cls');
      await apexEditor.waitForLanguageServerReady();
      // Cross-file resolution needs full workspace ingestion, not just LSP init.
      await apexEditor.waitForWorkspaceReady();
    });

    await test.step('Warm up cross-file LSP resolution via hover', async () => {
      // The Apex LSP uses "missing artifact resolution" to lazily load cross-file
      // types. hoverAtWithResolution triggers this: first hover fires the resolver,
      // waits 3s for the background load, then re-hovers to confirm resolution.
      await hoverHelper.hoverAtWithResolution(11, 27, 'CrossFileUtility');
    });

    await test.step('Position on cross-file class reference and go-to-definition', async () => {
      await apexEditor.goToPosition(11, 27);
      await apexEditor.goToDefinition();
      await apexEditor.waitForNavigation('CrossFileCaller.cls', 15000);

      const content = await apexEditor.findAndGetViewportContent(
        'public class CrossFileUtility',
      );
      expect(content).toMatch(/public\s+class\s+CrossFileUtility/);
    });
  });

  /**
   * Test: Navigate to a static method defined in another workspace file.
   * Opens CrossFileCaller.cls and navigates to formatName in CrossFileUtility.cls.
   */
  test('should navigate to static method defined in another workspace file', async ({
    apexEditor,
    hoverHelper,
  }) => {
    await test.step('Open the caller file', async () => {
      await apexEditor.openFile('CrossFileUtility.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('CrossFileCaller.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.waitForWorkspaceReady();
    });

    await test.step('Warm up cross-file LSP resolution via hover', async () => {
      await hoverHelper.hoverAtWithResolution(11, 27, 'CrossFileUtility');
    });

    await test.step('Position on cross-file method call and go-to-definition', async () => {
      await apexEditor.goToPosition(11, 44);
      await apexEditor.goToDefinition();
      await apexEditor.waitForNavigation('CrossFileCaller.cls', 15000);

      const content = await apexEditor.findAndGetViewportContent(
        'public static String formatName',
      );
      expect(content).toMatch(/public\s+static\s+String\s+formatName/);
    });
  });

  /**
   * Test: Navigate to base class defined in another workspace file.
   * Opens CrossFileChildClass.cls and navigates to CrossFileBaseClass in CrossFileBaseClass.cls.
   */
  test('should navigate to base class defined in another workspace file', async ({
    apexEditor,
    hoverHelper,
  }) => {
    await test.step('Open the child class file', async () => {
      await apexEditor.openFile('CrossFileChildClass.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.waitForWorkspaceReady();
    });

    await test.step('Warm up cross-file LSP resolution via hover', async () => {
      await hoverHelper.hoverAtWithResolution(6, 42, 'CrossFileBaseClass');
    });

    await test.step('Position on cross-file base class reference and go-to-definition', async () => {
      await apexEditor.goToPosition(6, 42);
      await apexEditor.goToDefinition();
      await apexEditor.waitForNavigation('CrossFileChildClass.cls', 15000);

      const content = await apexEditor.findAndGetViewportContent(
        'public virtual class CrossFileBaseClass',
      );
      expect(content).toMatch(/public\s+virtual\s+class\s+CrossFileBaseClass/);
    });
  });

  /**
   * Test: Navigate to an inherited method defined in another workspace file.
   * Opens CrossFileChildClass.cls and navigates to getBaseName defined in CrossFileBaseClass.cls.
   */
  test('should navigate to inherited method defined in another workspace file', async ({
    apexEditor,
    hoverHelper,
  }) => {
    await test.step('Open the child class file', async () => {
      await apexEditor.openFile('CrossFileChildClass.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.waitForWorkspaceReady();
    });

    await test.step('Warm up cross-file LSP resolution via hover', async () => {
      // Hover at base class reference to trigger missing artifact resolution
      // for CrossFileBaseClass.cls, which is needed for getBaseName to resolve.
      await hoverHelper.hoverAtWithResolution(6, 42, 'CrossFileBaseClass');
    });

    await test.step('Call getBaseName to reference inherited method across files', async () => {
      await apexEditor.goToPosition(43, 16);
      await apexEditor.goToDefinition();
      await apexEditor.waitForNavigation('CrossFileChildClass.cls', 15000);

      const content = await apexEditor.findAndGetViewportContent('getBaseName');
      expect(content).toMatch(/public\s+String\s+getBaseName/);
    });
  });
});
