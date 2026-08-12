/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';

/**
 * E2E tests for textDocument/rename (W-23631082 / 3.3) — renameLocal for
 * local variables and method parameters.
 *
 * Exercises the LSP `textDocument/rename` path end-to-end through the editor:
 * position the cursor on a local variable or parameter, press F2, type a new
 * name, and confirm (Enter). Assert the WorkspaceEdit applied: all occurrences
 * of the symbol within its scope are renamed, and sibling same-named locals in
 * other methods are untouched (scope-aware rename).
 *
 * Capability profile: `renameProvider: true` is advertised in
 * DEVELOPMENT_CAPABILITIES (packages/apex-lsp-shared/.../ApexLanguageServerCapabilities.ts:252).
 * The e2e harness boots in development mode (web: `serverMode: 'development'`
 * in workspace settings; desktop: extensionDevelopmentPath → ExtensionMode.Development),
 * so the provider IS advertised and reachable. prepareRename is NOT advertised
 * (prepareProvider off) — F2 directly opens the rename input without a prepare step.
 *
 * Scope: renameLocal on the 3.1 branch (feature/W-23631077-scope-aware-local-rename)
 * handles LOCAL variables and method PARAMETERS only (single-file WorkspaceEdit).
 * Fields, methods, and classes are NOT supported yet, so the cursor MUST land
 * on a local or parameter.
 *
 * @group rename
 */

test.describe('Apex Rename Symbol', () => {
  test.describe.configure({ mode: 'serial' });

  test('renames all occurrences of a local variable within scope', async ({
    apexEditor,
  }) => {
    await test.step('Open the rename fixture', async () => {
      await apexEditor.openFile('RenameLocalSample.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Position on the local variable `total` in compute()', async () => {
      // The fixture is terse (23 lines, fits in viewport). goToPosition(7, 1)
      // moves to line 7 — `total = total + 1;`, a USAGE of the local (the
      // declaration `Integer total = 0;` is line 6) — then
      // positionCursorOnWord('total') places the cursor on that line's `total`
      // token. Rename works from any occurrence (declaration or usage); driving
      // it from a usage is the common editor case.
      await apexEditor.goToPosition(7, 1);
      await apexEditor.positionCursorOnWord('total');
    });

    await test.step('Rename `total` to `renamed`', async () => {
      await apexEditor.rename('renamed');
    });

    await test.step('Assert all `total` occurrences in compute() are now `renamed`', async () => {
      // The WorkspaceEdit should have renamed all four occurrences of `total`
      // within compute(): the declaration and three usages. Wait for the new
      // name to appear, then fetch content and assert.
      await apexEditor.waitForContentToInclude('renamed');

      const content = await apexEditor.getContent();
      // Monaco renders indentation with non-breaking spaces (U+00A0); normalize
      // to regular spaces so the structural assertions match reliably.
      const normalized = content.replace(/ /g, ' ');

      // The declaration is now `Integer renamed = 0;`
      expect(normalized).toMatch(/Integer\s+renamed\s*=\s*0\s*;/);

      // The first usage is now `renamed = renamed + 1;`
      expect(normalized).toMatch(/renamed\s*=\s*renamed\s*\+\s*1\s*;/);

      // The second usage is now `renamed = renamed + 2;`
      expect(normalized).toMatch(/renamed\s*=\s*renamed\s*\+\s*2\s*;/);

      // The return statement is now `return renamed;`
      expect(normalized).toMatch(/return\s+renamed\s*;/);

      // The old name `total` should NOT appear in the compute() method anymore.
      // To avoid a false positive from the sibling method's unchanged `total`,
      // match within the compute() method's context.
      const computeMethodMatch = normalized.match(
        /public\s+Integer\s+compute\s*\(\s*\)\s*\{([\s\S]*?)\}/,
      );
      expect(computeMethodMatch).not.toBeNull();
      const computeBody = computeMethodMatch![1];
      expect(computeBody).not.toContain('total');
    });

    await test.step('Assert the sibling method computeOther() is untouched', async () => {
      // The fixture has a second method, computeOther(), with its own local
      // variable ALSO named `total`. Scope-aware rename should NOT touch that
      // symbol — it lives in a different scope. The fixture is terse (23 lines)
      // and fits in a single viewport on CI (~30-40 lines), so getContent()
      // includes both methods. Verify the sibling's `total` is unchanged.
      const content = await apexEditor.getContent();
      const normalized = content.replace(/ /g, ' ');

      // Extract the computeOther() method body.
      const otherMethodMatch = normalized.match(
        /public\s+Integer\s+computeOther\s*\(\s*\)\s*\{([\s\S]*?)\}/,
      );
      expect(
        otherMethodMatch,
        'Expected computeOther() method to exist in the fixture',
      ).not.toBeNull();

      const otherBody = otherMethodMatch![1];
      // The declaration `Integer total = 100;` should still exist (NOT renamed).
      expect(otherBody).toMatch(/Integer\s+total\s*=\s*100\s*;/);
      // The return statement `return total;` should still exist (NOT renamed).
      expect(otherBody).toMatch(/return\s+total\s*;/);
      // The new name `renamed` should NOT appear in computeOther() at all.
      expect(otherBody).not.toContain('renamed');
    });
  });

  test('renames a method parameter and its usages', async ({ apexEditor }) => {
    await test.step('Open the rename fixture', async () => {
      await apexEditor.openFile('RenameLocalSample.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Position on the parameter `value` in addValue()', async () => {
      // positionCursorOnWord('value') alone finds the first (and only) 'value'
      // in the fixture, which is the parameter in addValue(). No explicit
      // goToPosition needed — the word is unique.
      await apexEditor.positionCursorOnWord('value');
    });

    await test.step('Rename `value` to `inputParam`', async () => {
      await apexEditor.rename('inputParam');
    });

    await test.step('Assert the parameter and its usage are renamed', async () => {
      await apexEditor.waitForContentToInclude('inputParam');

      const content = await apexEditor.getContent();
      const normalized = content.replace(/ /g, ' ');

      // The parameter declaration is now `public Integer addValue(Integer inputParam)`
      expect(normalized).toMatch(
        /public\s+Integer\s+addValue\s*\(\s*Integer\s+inputParam\s*\)/,
      );

      // The usage inside the method is now `Integer result = inputParam + 10;`
      expect(normalized).toMatch(
        /Integer\s+result\s*=\s*inputParam\s*\+\s*10\s*;/,
      );

      // The old name `value` should NOT appear in the addValue() method body anymore.
      const addValueMethodMatch = normalized.match(
        /public\s+Integer\s+addValue\s*\([^)]*\)\s*\{([\s\S]*?)\}/,
      );
      expect(addValueMethodMatch).not.toBeNull();
      const addValueBody = addValueMethodMatch![1];
      expect(addValueBody).not.toContain('value');
    });
  });
});
