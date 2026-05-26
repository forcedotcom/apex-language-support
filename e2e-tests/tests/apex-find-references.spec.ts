/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';

/**
 * E2E tests for Apex Find-All-References (textDocument/references).
 *
 * Covers two complementary scenarios:
 *  - Single-file references — symbol declared and used inside one file.
 *    Verifies the LSP reports the local references and that the peek
 *    widget shows only one file.
 *  - Cross-file references — symbol declared in one workspace file and
 *    used from another. Verifies the peek widget aggregates results
 *    across multiple workspace files (the indexer must be wired up).
 *
 * Reference counts are asserted with `{ min }` rather than exact numbers
 * because the Apex LSP can stream additional results into the peek widget
 * as cross-file resolution completes; brittle equality assertions caused
 * flake in the past.
 *
 * @group find-references
 */

test.describe('Apex Find All References - Single File', () => {
  /**
   * Test: Find references for an instance field declared and used in one file.
   * `instanceId` in ApexClassExample.cls is declared on line 7 and referenced
   * within the constructor on lines 20 (param), 21, and 24.
   */
  test('should find single-file references for an instance field', async ({
    apexEditor,
    referencesView,
  }) => {
    await test.step('Open source file and position on field usage', async () => {
      await apexEditor.openFile('ApexClassExample.cls');
      await apexEditor.waitForLanguageServerReady();
      // Land on a usage site inside the constructor body
      await apexEditor.goToPosition(24);
      await apexEditor.positionCursorOnWord('instanceId');
    });

    await test.step('Trigger find-all-references', async () => {
      await apexEditor.findReferences();
      await referencesView.waitForVisible();
    });

    await test.step('Verify references are returned for the workspace file', async () => {
      await referencesView.expectReferenceCount({ min: 2 });
      await referencesView.expectFilePresent('ApexClassExample.cls');
    });

    await referencesView.close();
  });

  /**
   * Test: Find references for a static constant within a single file.
   * `DEFAULT_STATUS` in ApexClassExample.cls is declared on line 3 and
   * referenced on line 94.
   */
  test('should find single-file references for a static constant', async ({
    apexEditor,
    referencesView,
  }) => {
    await test.step('Position cursor on usage site of static constant', async () => {
      await apexEditor.openFile('ApexClassExample.cls');
      await apexEditor.waitForLanguageServerReady();
      // positionCursorOnWord lands the cursor at the END of the matched word,
      // which is past the symbol's extent — the LSP then returns
      // "No references found". Use it first to establish editor focus, then
      // jump the cursor explicitly inside the symbol on line 94.
      // Line 94 is `            acc.Type = DEFAULT_STATUS;`. Col 30 is mid-symbol.
      await apexEditor.positionCursorOnWord('DEFAULT_STATUS');
      await apexEditor.goToPosition(94, 30);
    });

    await test.step('Trigger find-all-references', async () => {
      await apexEditor.findReferences();
      await referencesView.waitForVisible();
    });

    await test.step('Verify references for the constant in the workspace file', async () => {
      await referencesView.expectReferenceCount({ min: 2 });
      await referencesView.expectFilePresent('ApexClassExample.cls');
    });

    await referencesView.close();
  });

  /**
   * Test: Find references for a private method declared and called in one file.
   * `validateAccounts` is declared at line 67 and called at line 59.
   */
  test('should find single-file references for a private method', async ({
    apexEditor,
    referencesView,
  }) => {
    await test.step('Position cursor on private method call site', async () => {
      await apexEditor.openFile('ApexClassExample.cls');
      await apexEditor.waitForLanguageServerReady();
      // positionCursorOnWord lands the cursor at the END of the matched word,
      // which is past the symbol's extent — the LSP returns
      // "No references found" there. Use Find first to establish editor focus,
      // then jump explicitly into the call site on line 59.
      // Querying find-references from the CALL site (rather than the
      // declaration on line 67) is more reliable on the Apex LSP.
      // Line 59: `        validateAccounts(inputAccounts);` — col 15 is mid-symbol.
      await apexEditor.positionCursorOnWord('validateAccounts');
      await apexEditor.goToPosition(59, 15);
    });

    await test.step('Trigger find-all-references', async () => {
      await apexEditor.findReferences();
      await referencesView.waitForVisible();
    });

    await test.step('Verify references include declaration plus call', async () => {
      await referencesView.expectReferenceCount({ min: 2 });
      await referencesView.expectFilePresent('ApexClassExample.cls');
    });

    await referencesView.close();
  });
});

test.describe('Apex Find All References - Cross File', () => {
  /**
   * Test: Find references for a class defined in one file but called from another.
   * `CrossFileUtility` is declared in CrossFileUtility.cls and referenced
   * 4 times in CrossFileCaller.cls.
   */
  test('should find cross-file references for a workspace class', async ({
    apexEditor,
    hoverHelper,
    referencesView,
  }) => {
    await test.step('Open both files so the LSP indexes them', async () => {
      await apexEditor.openFile('CrossFileUtility.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('CrossFileCaller.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Warm up cross-file LSP resolution via hover', async () => {
      // The Apex LSP loads cross-file targets lazily. Without this warm-up,
      // find-references may return only the source-file matches before the
      // target file is indexed. Mirrors the apex-goto-definition pattern.
      await hoverHelper.hoverAtWithResolution(11, 27);
    });

    await test.step('Position on the cross-file class reference', async () => {
      await apexEditor.goToPosition(11, 27);
    });

    await test.step('Trigger find-all-references', async () => {
      await apexEditor.findReferences();
      await referencesView.waitForVisible();
    });

    await test.step('Verify references span multiple files', async () => {
      await referencesView.expectReferenceCount({ min: 2 });
      await referencesView.expectFileCount({ min: 2 });
      await referencesView.expectFilePresent('CrossFileCaller.cls');
      await referencesView.expectFilePresent('CrossFileUtility.cls');
    });

    await referencesView.close();
  });

  /**
   * Test: Find references for a static method whose declaration and callers
   * live in different workspace files.
   * `formatName` is declared in CrossFileUtility.cls (line 10) and called
   * twice in CrossFileCaller.cls (lines 11, 21).
   */
  test('should find cross-file references for a static method', async ({
    apexEditor,
    hoverHelper,
    referencesView,
  }) => {
    await test.step('Open both files so the LSP indexes them', async () => {
      await apexEditor.openFile('CrossFileUtility.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('CrossFileCaller.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Warm up cross-file LSP resolution via hover', async () => {
      await hoverHelper.hoverAtWithResolution(11, 44);
    });

    await test.step('Position on the cross-file method call', async () => {
      // Column 44 is the start of `formatName` in: CrossFileUtility.formatName('John', 'Doe')
      await apexEditor.goToPosition(11, 44);
    });

    await test.step('Trigger find-all-references', async () => {
      await apexEditor.findReferences();
      await referencesView.waitForVisible();
    });

    await test.step('Verify references span both files', async () => {
      await referencesView.expectReferenceCount({ min: 2 });
      await referencesView.expectFileCount({ min: 2 });
      await referencesView.expectFilePresent('CrossFileCaller.cls');
      await referencesView.expectFilePresent('CrossFileUtility.cls');
    });

    await referencesView.close();
  });

  /**
   * Test: Find references for a base class extended in another workspace file.
   * `CrossFileBaseClass` is declared in CrossFileBaseClass.cls and extended
   * by CrossFileChildClass.cls.
   */
  test('should find cross-file references for an extended base class', async ({
    apexEditor,
    hoverHelper,
    referencesView,
  }) => {
    await test.step('Open the child class file', async () => {
      await apexEditor.openFile('CrossFileChildClass.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Warm up cross-file LSP resolution via hover', async () => {
      // Hover on the `extends CrossFileBaseClass` clause (line 6, col 42)
      await hoverHelper.hoverAtWithResolution(6, 42);
    });

    await test.step('Position on the cross-file base class reference', async () => {
      await apexEditor.goToPosition(6, 42);
    });

    await test.step('Trigger find-all-references', async () => {
      await apexEditor.findReferences();
      await referencesView.waitForVisible();
    });

    await test.step('Verify references include both files', async () => {
      await referencesView.expectReferenceCount({ min: 2 });
      await referencesView.expectFileCount({ min: 2 });
      await referencesView.expectFilePresent('CrossFileBaseClass.cls');
      await referencesView.expectFilePresent('CrossFileChildClass.cls');
    });

    await referencesView.close();
  });
});

test.describe('Apex Find All References - Edge Cases', () => {
  /**
   * Test: Finding references on a non-existent symbol does not crash and
   * either returns no results or leaves the editor functional.
   */
  test('should not crash on find-references for unknown symbol', async ({
    apexEditor,
    referencesView,
  }) => {
    await test.step('Insert a fake symbol and position cursor on it', async () => {
      await apexEditor.openFile('ApexClassExample.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.goToPosition(1, 1);
      await apexEditor.typeText('// NonExistentReferenceSymbol\n');
      await apexEditor.positionCursorOnWord('NonExistentReferenceSymbol');
    });

    await test.step('Trigger find-all-references', async () => {
      await apexEditor.findReferences();
    });

    await test.step('Verify editor remains functional', async () => {
      // VS Code may show "No references" toast or open an empty peek; either
      // is acceptable. The important contract is that the editor stays alive.
      expect(await apexEditor.isApexFileOpen()).toBe(true);
      const content = await apexEditor.getContent();
      expect(content.length).toBeGreaterThan(0);
      // If a peek opened, close it so it doesn't leak into the next test.
      await referencesView.close();
    });
  });
});
