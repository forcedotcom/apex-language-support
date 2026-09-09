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
 * Capability profile: `renameProvider: { prepareProvider: true }` is advertised
 * in DEVELOPMENT_CAPABILITIES (ApexLanguageServerCapabilities.ts:251-253), and
 * LCSAdapter registers an onPrepareRename handler. The e2e harness boots in
 * development mode (web: `serverMode: 'development'` in workspace settings;
 * desktop: extensionDevelopmentPath → ExtensionMode.Development), so both
 * providers are advertised. Because prepareProvider is on, F2 fires
 * `textDocument/prepareRename` FIRST — the rename input only opens if that
 * returns a range containing the cursor; otherwise VS Code shows "The element
 * can't be renamed". prepareRename is a self-loading requestPool read (standalone
 * parse, ingestion-independent), so on a Web cold-start the file's pool entry
 * must be warmed by a prior resolving read before F2 — see the pool warm-up step
 * in each test.
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
    outlineView,
  }) => {
    await test.step('Open the rename fixture', async () => {
      await apexEditor.openFile('RenameLocalSample.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Warm the request pool for prepareRename', async () => {
      // F2 fires textDocument/prepareRename (prepareProvider is advertised in
      // DEVELOPMENT_CAPABILITIES), which is a self-loading requestPool read that
      // parses the file's LIVE BUFFER standalone (resolvePrepareRenameForLocal
      // returns null when req.content is absent). On a Web cold-start there is a
      // window where the editor is visible but the server-side didOpen hasn't
      // propagated the buffer yet, so F2 gets "The element can't be renamed".
      // A workspace-ready gate is the wrong signal (prepareRename ignores the
      // ingested graph), and a hover probe is a FALSE positive (hover can
      // resolve off the dataOwner graph while the live buffer is still absent).
      // documentSymbol IS the right probe: it is `content: 'live-required'` with
      // no graph fallback, so its symbols only populate once the file's live
      // content is threadable to the pool — exactly prepareRename's precondition.
      // Gate on a symbol from THIS file (RenameLocalSample) to prove it's this
      // file's content, not the previously-active editor's.
      await outlineView.open();
      const mainClass = await outlineView.findSymbol(
        'RenameLocalSample',
        20000,
      );
      expect(
        mainClass,
        'Outline (documentSymbol) must resolve RenameLocalSample before F2 — ' +
          'proves the live buffer is threaded so prepareRename can parse it',
      ).not.toBeNull();
    });

    await test.step('Position on the local variable `total` in compute()', async () => {
      // Line 7 is `        total = total + 1;` — the second `total` (a USAGE of
      // the compute() local; the declaration `Integer total = 0;` is line 6)
      // occupies columns 17-21. Position the cursor at column 19 — INSIDE the
      // token — via Go-to-Line, which is deterministic across desktop and web.
      //
      // Do NOT use positionCursorOnWord('total') here: it drives Monaco's Find
      // widget and, after Escape, leaves the cursor at the END of the match
      // (column 22, the space after `total`). prepareRename's range check is
      // half-open [start, end), so a cursor one past the last character is
      // NOT contained → prepareRename returns null → "The element can't be
      // renamed" and F2 never opens the rename box. This is the actual cause of
      // the Web failure (the cursor sat at Ln 7 Col 22, off the token), not a
      // readiness/cold-start race. An explicit in-word column avoids the
      // boundary entirely.
      await apexEditor.goToPosition(7, 19);
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
      // Normalize non-breaking-space indentation (U+00A0) so the regexes match.
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

  test('renames a method parameter and its usages', async ({
    apexEditor,
    outlineView,
  }) => {
    await test.step('Open the rename fixture', async () => {
      await apexEditor.openFile('RenameLocalSample.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Warm the request pool for prepareRename', async () => {
      // See the local-variable test: F2's prepareRename needs this file's live
      // buffer threaded to the pool. Gate on a documentSymbol from THIS file
      // (live-required, no graph fallback) before F2 — the correct readiness
      // signal on Web cold-start.
      await outlineView.open();
      const mainClass = await outlineView.findSymbol(
        'RenameLocalSample',
        20000,
      );
      expect(mainClass).not.toBeNull();
    });

    await test.step('Position on the parameter `value` in addValue()', async () => {
      // Line 19 is `    public Integer addValue(Integer value) {` — the parameter
      // `value` occupies columns 37-41. Position at column 39 (INSIDE the token)
      // via Go-to-Line. As in the local-variable test, avoid
      // positionCursorOnWord: its Find-then-Escape leaves the cursor at the end
      // of the match (past the token), which prepareRename's half-open range
      // check excludes → "The element can't be renamed".
      await apexEditor.goToPosition(19, 39);
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

/**
 * E2E for textDocument/rename of FIELDS (W-23631087) — single-file + cross-file
 * via F2, like the renameLocal tests. F2 fires prepareRename first; field support
 * was added to DispatchPrepareRename here. Each test warms the pool with a
 * documentSymbol probe so prepareRename can parse the live buffer before F2.
 *
 * @group rename
 */
test.describe('Apex Rename Symbol - Field', () => {
  test.describe.configure({ mode: 'serial' });

  test('renames a field declaration and its this-qualified and implicit-this usages', async ({
    apexEditor,
    outlineView,
  }) => {
    await test.step('Open the field rename fixture', async () => {
      await apexEditor.openFile('RenameFieldSample.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Warm the request pool for prepareRename', async () => {
      // documentSymbol threads the live buffer to the pool — prepareRename's precondition.
      await outlineView.open();
      const mainClass = await outlineView.findSymbol(
        'RenameFieldSample',
        20000,
      );
      expect(
        mainClass,
        'Outline (documentSymbol) must resolve RenameFieldSample before F2',
      ).not.toBeNull();
    });

    await test.step('Position on the `counter` field declaration', async () => {
      // Line 4, column 22 is inside `counter` (in-word avoids prepareRename's boundary).
      await apexEditor.goToPosition(4, 22);
    });

    await test.step('Rename `counter` to `tally`', async () => {
      await apexEditor.rename('tally');
    });

    await test.step('Assert the declaration and all field usages are renamed', async () => {
      await apexEditor.waitForContentToInclude('tally');

      const content = await apexEditor.getContent();
      // Normalize non-breaking-space indentation (U+00A0) so the regexes match.
      const normalized = content.replace(/ /g, ' ');

      // Declaration: `public Integer tally = 0;`
      expect(normalized).toMatch(/public\s+Integer\s+tally\s*=\s*0\s*;/);
      // this-qualified read+write: `this.tally = this.tally + 1;`
      expect(normalized).toMatch(/this\.tally\s*=\s*this\.tally\s*\+\s*1\s*;/);
      // implicit-this read: `return tally;`
      expect(normalized).toMatch(/return\s+tally\s*;/);

      // Old name gone (slice past the comment that also says `counter`).
      const classBody = normalized.slice(
        normalized.indexOf('public with sharing class'),
      );
      expect(classBody).not.toContain('counter');
    });
  });

  test('renames a field across files (declaration + cross-file field access)', async ({
    apexEditor,
    outlineView,
  }) => {
    await test.step('Open the consumer and declaring files', async () => {
      // Consumer first so its usage is ingested, then the declaring file (rename source).
      await apexEditor.openFile('RenameFieldClient.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('RenameFieldModel.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Wait for full workspace ingestion', async () => {
      // renameField declines mid-load rather than emit a partial edit (W-23631084);
      // gate on full ingestion so the consumer file is stored.
      await apexEditor.waitForWorkspaceReady();
    });

    await test.step('Warm the request pool for prepareRename on the declaring file', async () => {
      await apexEditor.openFile('RenameFieldModel.cls');
      await outlineView.open();
      const mainClass = await outlineView.findSymbol('RenameFieldModel', 20000);
      expect(
        mainClass,
        'Outline (documentSymbol) must resolve RenameFieldModel before F2',
      ).not.toBeNull();
    });

    await test.step('Position on the `quantity` field declaration', async () => {
      // Line 4, column 23 is inside `quantity`.
      await apexEditor.goToPosition(4, 23);
    });

    await test.step('Rename `quantity` to `amount`', async () => {
      await apexEditor.rename('amount');
    });

    await test.step('Assert the declaration is renamed in RenameFieldModel', async () => {
      await apexEditor.waitForContentToInclude('amount');
      const content = await apexEditor.getContent();
      const normalized = content.replace(/ /g, ' ');
      expect(normalized).toMatch(/public\s+Integer\s+amount\s*=\s*0\s*;/);
      const classBody = normalized.slice(
        normalized.indexOf('public with sharing class'),
      );
      expect(classBody).not.toContain('quantity');
    });

    await test.step('Assert the cross-file usages are renamed in RenameFieldClient', async () => {
      // Switch to the consumer tab and wait for the cross-file edit to surface.
      await apexEditor.openFile('RenameFieldClient.cls');
      await apexEditor.waitForContentToInclude('model.amount');

      const content = await apexEditor.getContent();
      const normalized = content.replace(/ /g, ' ');

      // Write: `model.amount = 5;`
      expect(normalized).toMatch(/model\.amount\s*=\s*5\s*;/);
      // Read: `return model.amount;`
      expect(normalized).toMatch(/return\s+model\.amount\s*;/);

      // Old name gone (slice past the comment that mentions `quantity`).
      const classBody = normalized.slice(
        normalized.indexOf('public with sharing class'),
      );
      expect(classBody).not.toContain('quantity');
    });
  });
});

/**
 * E2E for textDocument/rename of METHODS (W-23631134 / 5.4) — hierarchy-aware
 * rename across the type-family cone via F2, like the renameField tests. Each
 * case renames a method that participates in an inheritance / interface
 * relationship and asserts that the declaration, the override/implementation
 * declarations in OTHER files, and the modeled call sites are all rewritten.
 *
 * !!! DEPENDENCY ON WI 7.1 (W-23631152) — method `prepareRename` !!!
 * F2 fires `textDocument/prepareRename` FIRST (prepareProvider is advertised in
 * DEVELOPMENT_CAPABILITIES). The renameLocal (3.x) and renameField (W-23631087)
 * branches only wired prepareRename for LOCALS and FIELDS. METHOD prepareRename
 * — the range/eligibility probe that lets F2 open the rename box on a method
 * name — is delivered separately by WI 7.1. Until 7.1 is integrated into this
 * branch, F2 on a method declaration returns "The element can't be renamed" and
 * these three tests CANNOT pass. They are authored against the EXPECTED F2
 * method-rename UX so they go green the moment 7.1 lands; do not treat a failure
 * here as a regression before that integration.
 *
 * Fixture design (so the rename is PROVABLE and never declines): call sites use
 * receivers declared as a family type (`Child child = new Child(); child.foo()`),
 * plus `override`/`implements` declarations — no overloads, no multi-hop chains,
 * and no method/constructor-result receivers, all of which findMethodOccurrences
 * marks `unsafe` → decline. Method names are globally unique across the fixture
 * set so no out-of-family same-named call can force a decline.
 *
 * @group rename
 */
test.describe('Apex Rename Symbol - Method', () => {
  test.describe.configure({ mode: 'serial' });

  test('ancestor override: renaming a base method renames the subclass override + call site cross-file', async ({
    apexEditor,
    outlineView,
  }) => {
    await test.step('Open the subclass (consumer) then the base (rename source)', async () => {
      // Open the consumer first so its override + call are ingested, then the
      // declaring file last (it is the rename source and gets warmed below).
      await apexEditor.openFile('RenameMethodAncestorChild.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('RenameMethodAncestorBase.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Wait for full workspace ingestion', async () => {
      // renameMethod declines mid-load rather than emit a partial edit; gate on
      // full ingestion so the subclass file is stored and the type-family cone
      // (base → subtype) is resolvable before F2.
      await apexEditor.waitForWorkspaceReady();
    });

    await test.step('Warm the request pool for prepareRename on the base file', async () => {
      await apexEditor.openFile('RenameMethodAncestorBase.cls');
      await outlineView.open();
      const mainClass = await outlineView.findSymbol(
        'RenameMethodAncestorBase',
        20000,
      );
      expect(
        mainClass,
        'Outline (documentSymbol) must resolve RenameMethodAncestorBase before F2',
      ).not.toBeNull();
    });

    await test.step('Position on the base `evaluateScore` declaration', async () => {
      // Line 8: `    public virtual Integer evaluateScore() {` — `evaluateScore`
      // starts at column 28; column 31 is INSIDE the token (prepareRename uses a
      // half-open range, so land in-word, not at the boundary).
      await apexEditor.goToPosition(8, 31);
    });

    await test.step('Rename `evaluateScore` to `computeRank`', async () => {
      await apexEditor.rename('computeRank');
    });

    await test.step('Assert the base declaration is renamed', async () => {
      await apexEditor.waitForContentToInclude('computeRank');
      const content = await apexEditor.getContent();
      const normalized = content.replace(/ /g, ' ');
      // `public virtual Integer computeRank() {`
      expect(normalized).toMatch(
        /public\s+virtual\s+Integer\s+computeRank\s*\(\s*\)/,
      );
      // Old name gone from the class body (slice past the comment that names it).
      const classBody = normalized.slice(
        normalized.indexOf('public virtual class'),
      );
      expect(classBody).not.toContain('evaluateScore');
    });

    await test.step('Assert the subclass override + call site are renamed cross-file', async () => {
      await apexEditor.openFile('RenameMethodAncestorChild.cls');
      await apexEditor.waitForContentToInclude('computeRank');
      const content = await apexEditor.getContent();
      const normalized = content.replace(/ /g, ' ');

      // Override declaration: `public override Integer computeRank() {`
      expect(normalized).toMatch(
        /public\s+override\s+Integer\s+computeRank\s*\(\s*\)/,
      );
      // Call site: `return child.computeRank();`
      expect(normalized).toMatch(/return\s+child\.computeRank\s*\(\s*\)/);

      // Old name gone from the class body (slice past the naming comment).
      const classBody = normalized.slice(normalized.indexOf('public class'));
      expect(classBody).not.toContain('evaluateScore');
    });
  });

  test('descendant override: renaming from a subclass override renames base + sibling', async ({
    apexEditor,
    outlineView,
  }) => {
    await test.step('Open the base + sibling (consumers) then the child (rename source)', async () => {
      await apexEditor.openFile('RenameMethodDescendantBase.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('RenameMethodDescendantSibling.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('RenameMethodDescendantChild.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Wait for full workspace ingestion', async () => {
      // The base + sibling must be stored so the cone (child → base → sibling)
      // resolves; renameMethod declines against a partially-loaded graph.
      await apexEditor.waitForWorkspaceReady();
    });

    await test.step('Warm the request pool for prepareRename on the child file', async () => {
      await apexEditor.openFile('RenameMethodDescendantChild.cls');
      await outlineView.open();
      const mainClass = await outlineView.findSymbol(
        'RenameMethodDescendantChild',
        20000,
      );
      expect(
        mainClass,
        'Outline (documentSymbol) must resolve RenameMethodDescendantChild before F2',
      ).not.toBeNull();
    });

    await test.step('Position on the child `refreshCache` override declaration', async () => {
      // Line 9: `    public override void refreshCache() {` — `refreshCache`
      // starts at column 26; column 29 is INSIDE the token.
      await apexEditor.goToPosition(9, 29);
    });

    await test.step('Rename `refreshCache` to `reloadCache`', async () => {
      await apexEditor.rename('reloadCache');
    });

    await test.step('Assert the child override + call site are renamed', async () => {
      await apexEditor.waitForContentToInclude('reloadCache');
      const content = await apexEditor.getContent();
      const normalized = content.replace(/ /g, ' ');
      // Override declaration: `public override void reloadCache() {`
      expect(normalized).toMatch(
        /public\s+override\s+void\s+reloadCache\s*\(\s*\)/,
      );
      // Call site: `child.reloadCache();`
      expect(normalized).toMatch(/child\.reloadCache\s*\(\s*\)/);
      const classBody = normalized.slice(normalized.indexOf('public class'));
      expect(classBody).not.toContain('refreshCache');
    });

    await test.step('Assert the base declaration is renamed (propagated up the cone)', async () => {
      await apexEditor.openFile('RenameMethodDescendantBase.cls');
      await apexEditor.waitForContentToInclude('reloadCache');
      const content = await apexEditor.getContent();
      const normalized = content.replace(/ /g, ' ');
      // `public virtual void reloadCache() {`
      expect(normalized).toMatch(
        /public\s+virtual\s+void\s+reloadCache\s*\(\s*\)/,
      );
      const classBody = normalized.slice(
        normalized.indexOf('public virtual class'),
      );
      expect(classBody).not.toContain('refreshCache');
    });

    await test.step('Assert the sibling override is renamed (propagated across the cone)', async () => {
      await apexEditor.openFile('RenameMethodDescendantSibling.cls');
      await apexEditor.waitForContentToInclude('reloadCache');
      const content = await apexEditor.getContent();
      const normalized = content.replace(/ /g, ' ');
      // `public override void reloadCache() {`
      expect(normalized).toMatch(
        /public\s+override\s+void\s+reloadCache\s*\(\s*\)/,
      );
      const classBody = normalized.slice(normalized.indexOf('public class'));
      expect(classBody).not.toContain('refreshCache');
    });
  });

  test('interface implementer: renaming an interface method renames the implementing class method + call site', async ({
    apexEditor,
    outlineView,
  }) => {
    await test.step('Open the implementer (consumer) then the interface (rename source)', async () => {
      await apexEditor.openFile('RenameMethodImplementer.cls');
      await apexEditor.waitForLanguageServerReady();
      await apexEditor.openFile('RenameMethodContract.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Wait for full workspace ingestion', async () => {
      // The implementor must be stored so the interface's cone (interface →
      // implementor) resolves before F2; otherwise renameMethod declines.
      await apexEditor.waitForWorkspaceReady();
    });

    await test.step('Warm the request pool for prepareRename on the interface file', async () => {
      await apexEditor.openFile('RenameMethodContract.cls');
      await outlineView.open();
      const mainType = await outlineView.findSymbol(
        'RenameMethodContract',
        20000,
      );
      expect(
        mainType,
        'Outline (documentSymbol) must resolve RenameMethodContract before F2',
      ).not.toBeNull();
    });

    await test.step('Position on the interface `handleRecord` declaration', async () => {
      // Line 8: `    void handleRecord();` — `handleRecord` starts at column 10;
      // column 13 is INSIDE the token.
      await apexEditor.goToPosition(8, 13);
    });

    await test.step('Rename `handleRecord` to `processRecord`', async () => {
      await apexEditor.rename('processRecord');
    });

    await test.step('Assert the interface declaration is renamed', async () => {
      await apexEditor.waitForContentToInclude('processRecord');
      const content = await apexEditor.getContent();
      const normalized = content.replace(/ /g, ' ');
      // `void processRecord();`
      expect(normalized).toMatch(/void\s+processRecord\s*\(\s*\)\s*;/);
      const bodyText = normalized.slice(normalized.indexOf('public interface'));
      expect(bodyText).not.toContain('handleRecord');
    });

    await test.step('Assert the implementing class method + call site are renamed cross-file', async () => {
      await apexEditor.openFile('RenameMethodImplementer.cls');
      await apexEditor.waitForContentToInclude('processRecord');
      const content = await apexEditor.getContent();
      const normalized = content.replace(/ /g, ' ');
      // Implementation declaration: `public void processRecord() {`
      expect(normalized).toMatch(/public\s+void\s+processRecord\s*\(\s*\)/);
      // Call site: `impl.processRecord();`
      expect(normalized).toMatch(/impl\.processRecord\s*\(\s*\)/);
      const classBody = normalized.slice(normalized.indexOf('public class'));
      expect(classBody).not.toContain('handleRecord');
    });
  });
});
