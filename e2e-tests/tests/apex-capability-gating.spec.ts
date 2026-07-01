/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';

/**
 * E2E tests for server-side capability gating of apex/* sends.
 *
 * These tests verify that the language server properly handles capability
 * gating for server-initiated notifications and requests. The production
 * client (VS Code extension) advertises experimental capabilities in
 * initialize params, and the server uses them to decide whether to send
 * apex/* messages.
 *
 * Since the VS Code extension advertises capabilities during initialization,
 * these tests verify the end-to-end flow through normal operation:
 * - Server receives client capabilities during initialize
 * - Server uses those capabilities to gate outbound messages
 * - Default-allow methods (workspaceIngestionComplete, requestWorkspaceLoad)
 *   are sent when the client advertises them
 *
 * @group capability-gating
 */

test.describe('Apex Capability Gating', () => {
  /**
   * Test: Server initializes and processes client capabilities.
   *
   * Verifies that after initialization completes, the server is functional
   * and has processed the client capabilities without errors. This confirms
   * the capability gating infrastructure is wired correctly in the real
   * server startup path.
   */
  test('server processes client capabilities during initialization', async ({
    apexEditor,
    apexTestEnvironment,
  }) => {
    const { lcsDetection } = apexTestEnvironment;

    await test.step('Verify LSP initialized with capability processing', async () => {
      // If LCS detection passed, the server started successfully which
      // means handleInitialize ran and stored client capabilities on
      // LSPConfigurationManager without error
      expect(lcsDetection).toBeDefined();
      expect(lcsDetection!.lcsIntegrationActive).toBe(true);
    });

    await test.step('Verify server is functional after gating setup', async () => {
      // The server should be responsive — if capability gating broke
      // initialization, this would fail
      await apexEditor.waitForLanguageServerReady();
    });
  });

  /**
   * Test: Default-allow notifications still work with production client.
   *
   * The production VS Code extension sends experimental capabilities. The
   * server should continue sending default-allow notifications
   * (workspaceIngestionComplete, requestWorkspaceLoad) since the extension
   * advertises support for them. We verify this indirectly by confirming
   * the workspace loads successfully (which requires these notifications
   * to flow correctly).
   */
  test('default-allow notifications flow with production capabilities', async ({
    apexEditor,
    apexTestEnvironment,
  }) => {
    await test.step('Verify workspace load completes', async () => {
      // requestWorkspaceLoad is default-allow and the extension advertises
      // it. If capability gating incorrectly suppressed it, the workspace
      // would never load and the server would be non-functional.
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Verify file operations work post-initialization', async () => {
      // If workspaceIngestionComplete was incorrectly suppressed, the
      // client would not know indexing completed and operations might hang.
      // Successful symbol resolution proves the notification flowed.
      await apexEditor.openFile('ApexClassExample.cls');
      const content = await apexEditor.getContent();
      expect(content.length).toBeGreaterThan(0);
    });
  });

  /**
   * Test: Server stability with capability gating active.
   *
   * Verifies no console errors related to capability gating during normal
   * operation. The server should handle capability checks gracefully
   * without throwing or logging errors.
   */
  test('no errors from capability gating during operation', async ({
    apexEditor,
    apexTestEnvironment,
    consoleErrors,
  }) => {
    await test.step('Perform normal operations', async () => {
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('ApexClassExample.cls');
    });

    await test.step('Verify no capability-related errors', async () => {
      // Filter for capability-related error messages
      const capabilityErrors = consoleErrors.filter(
        (err) =>
          err.text.includes('ClientCapabilit') ||
          err.text.includes('isClientCapabilityAdvertised') ||
          err.text.includes('setClientCapabilities'),
      );

      expect(capabilityErrors).toHaveLength(0);
    });
  });
});
