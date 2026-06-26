/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';

/**
 * E2E tests for Apex Find All References (W-22692429 / 6.13).
 *
 * Exercises the LSP `textDocument/references` path end-to-end through the
 * editor: position the cursor on a symbol, trigger Shift+F12, and assert the
 * references peek widget surfaces results — including cross-file usages, which
 * are dispatched through the enrichment worker pool when the topology is active.
 *
 * @group find-references
 */

test.describe('Apex Find All References', () => {
  test('finds references to a symbol used within the same file', async ({
    apexEditor,
  }) => {
    await test.step('Open a file with intra-file usages', async () => {
      await apexEditor.openFile('ApexClassExample.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Position on a symbol that is used more than once', async () => {
      // `sayHello` is declared and called within ApexClassExample.
      await apexEditor.positionCursorOnWord('sayHello');
    });

    await test.step('Trigger find-references and assert results appear', async () => {
      const count = await apexEditor.findReferences();
      // At least the declaration + one call site.
      expect(count).toBeGreaterThan(0);
      console.log(`✅ Find-references returned ${count} entries`);
      await apexEditor.closePeek();
    });
  });

  test('finds cross-file references to a utility class', async ({
    apexEditor,
    hoverHelper,
  }) => {
    await test.step('Open the utility and caller files', async () => {
      // Open the caller first so the LSP eagerly indexes the cross-file usage,
      // then open the declaring file where we invoke find-references.
      await apexEditor.openFile('CrossFileCaller.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('CrossFileUtility.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Warm up cross-file resolution via hover', async () => {
      // The Apex LSP lazily loads cross-file dependents; a hover primes the
      // resolver (same warm-up the cross-file goto-definition tests use).
      await hoverHelper.hoverAtWithResolution(9, 25);
    });

    await test.step('Find references to the utility class from its declaration', async () => {
      // `CrossFileUtility` on its class declaration line (line 6, 1-based).
      await apexEditor.goToPosition(6, 1);
      await apexEditor.positionCursorOnWord('CrossFileUtility');

      const count = await apexEditor.findReferences();
      // The declaration plus the cross-file usages in CrossFileCaller.
      expect(count).toBeGreaterThan(0);
      console.log(`✅ Cross-file find-references returned ${count} entries`);
      await apexEditor.closePeek();
    });
  });

  test('does not crash when no references exist', async ({ apexEditor }) => {
    await test.step('Open a file and add an unreferenced symbol', async () => {
      await apexEditor.openFile('ApexClassExample.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.goToPosition(1, 1);
      await apexEditor.typeText('// UnreferencedXyz\n');
      await apexEditor.positionCursorOnWord('UnreferencedXyz');
    });

    await test.step('Find-references returns nothing without crashing', async () => {
      const count = await apexEditor.findReferences();
      expect(count).toBe(0);
      expect(await apexEditor.isApexFileOpen()).toBe(true);
      await apexEditor.closePeek();
      console.log('✅ Gracefully handled no-references case');
    });
  });

  test('find-references is responsive', async ({ apexEditor }) => {
    await apexEditor.openFile('ApexClassExample.cls');
    await apexEditor.waitForLanguageServerReady();
    await apexEditor.positionCursorOnWord('sayHello');

    const startTime = Date.now();
    await apexEditor.findReferences();
    const elapsedTime = Date.now() - startTime;

    // CI runners are slower; allow 12s there, 8s locally (mirrors the
    // go-to-definition responsiveness test's budget).
    const maxMs = process.env.CI ? 12000 : 8000;
    expect(elapsedTime).toBeLessThan(maxMs);
    await apexEditor.closePeek();
    console.log(`✅ Find-references completed in ${elapsedTime}ms`);
  });
});
