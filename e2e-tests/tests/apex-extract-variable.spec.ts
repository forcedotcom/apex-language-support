/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';

/**
 * E2E tests for the Extract Variable code action (W-23389338 / 05.3) with
 * expression type inference (W-23389334 / 01.1).
 *
 * Exercises the LSP `textDocument/codeAction` path end-to-end through the
 * editor: open a .cls fixture, select a single sub-expression, invoke the
 * Refactor UI, assert the "Extract local variable" action is offered, apply
 * it, and confirm the document now contains the inserted `<Type> <name> = ...`
 * declaration with the selection replaced by `<name>`.
 *
 * Capability profile: the code action provider (kinds quickfix +
 * refactor.extract) is only advertised under the DEVELOPMENT capability
 * profile. The e2e harness boots in development mode — web via
 * `apex.environment.serverMode: "development"` written into the workspace
 * `.vscode/settings.json` (test-server.js / utils/setup.ts), and desktop via
 * the extension being launched from its `extensionDevelopmentPath`
 * (ExtensionMode.Development). So the provider IS advertised e2e; capability
 * gating (story 05.4) does NOT block these tests.
 *
 * Type inference (W-23389334): the extracted declaration now carries the
 * inferred Apex type rather than the former `Object` placeholder. These cases
 * cover the three inference kinds that resolve from the expression / same-file
 * symbol table alone (no cross-file resolution, so no reliance on symbol-index
 * warm-up): numeric promotion (`Integer`), a string literal (`String`), and a
 * constructor expression (`Account`, casing preserved). The generated name is
 * `v1`/`v2`/… so assertions match on structure, not an exact name.
 *
 * @group code-action
 */

test.describe('Apex Extract Variable Code Action', () => {
  test('infers Integer for a numeric sub-expression', async ({
    apexEditor,
  }) => {
    await test.step('Open the extract-variable fixture', async () => {
      await apexEditor.openFile('ExtractVariableSample.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Select the `2 * 3` sub-expression', async () => {
      // Fixture line 7 (1-based): `        Integer result = 1 + 2 * 3;`
      // Columns are 1-based; the `2` of `2 * 3` begins at column 30 and the
      // sub-expression `2 * 3` is 5 characters wide.
      await apexEditor.selectRange(7, 30, 5);
    });

    await test.step('Invoke Refactor and assert Extract local variable is offered', async () => {
      const titles = await apexEditor.openCodeActions('Extract local variable');
      expect(
        titles.some((t) => t.includes('Extract local variable')),
        `Expected an "Extract local variable" action but got: ${titles.join(', ')}`,
      ).toBe(true);
    });

    await test.step('Apply the action and assert the Integer declaration appears', async () => {
      await apexEditor.applyCodeAction('Extract local variable');

      // The refactoring infers `Integer` (Integer * Integer) and inserts
      // `Integer v1 = 2 * 3;` above the statement, replacing the selection with
      // the generated name. Match on structure rather than exact whitespace.
      await apexEditor.waitForContentToInclude('Integer v1 = 2 * 3;');

      const content = await apexEditor.getContent();
      // Monaco renders indentation with non-breaking spaces ( ); normalize
      // to regular spaces so the structural regex assertions match reliably.
      const normalized = content.replace(/ /g, ' ');

      // The inserted declaration carries the inferred type (no `Object`
      // placeholder, no `// TODO`).
      expect(normalized).toMatch(/Integer\s+v\d+\s*=\s*2\s*\*\s*3\s*;/);
      expect(normalized).not.toContain('// TODO');

      // The original expression is now replaced by the generated name, so the
      // enclosing statement reads `Integer result = 1 + v1;`.
      expect(normalized).toMatch(/Integer\s+result\s*=\s*1\s*\+\s*v\d+\s*;/);
    });
  });

  test('infers String for a string-literal sub-expression', async ({
    apexEditor,
  }) => {
    await test.step('Open the extract-variable fixture', async () => {
      await apexEditor.openFile('ExtractVariableSample.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step("Select the `'value'` string literal", async () => {
      // Fixture line 14 (1-based): `        String label = 'value';`
      // `'value'` begins at column 24 and is 7 characters wide (quotes
      // included).
      await apexEditor.selectRange(14, 24, 7);
    });

    await test.step('Invoke Refactor and assert Extract local variable is offered', async () => {
      const titles = await apexEditor.openCodeActions('Extract local variable');
      expect(
        titles.some((t) => t.includes('Extract local variable')),
        `Expected an "Extract local variable" action but got: ${titles.join(', ')}`,
      ).toBe(true);
    });

    await test.step('Apply the action and assert the String declaration appears', async () => {
      await apexEditor.applyCodeAction('Extract local variable');

      // A string literal infers to `String`.
      await apexEditor.waitForContentToInclude("String v1 = 'value';");

      const content = await apexEditor.getContent();
      const normalized = content.replace(/ /g, ' ');

      expect(normalized).toMatch(/String\s+v\d+\s*=\s*'value'\s*;/);
      expect(normalized).not.toContain('// TODO');
    });
  });

  test('infers the constructed type for a `new` expression, casing preserved', async ({
    apexEditor,
  }) => {
    await test.step('Open the extract-variable fixture', async () => {
      await apexEditor.openFile('ExtractVariableSample.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Select the `new Account()` expression', async () => {
      // Fixture line 22 (1-based): `        Account acct = new Account();`
      // `new Account()` begins at column 24 and is 13 characters wide.
      await apexEditor.selectRange(22, 24, 13);
    });

    await test.step('Invoke Refactor and assert Extract local variable is offered', async () => {
      const titles = await apexEditor.openCodeActions('Extract local variable');
      expect(
        titles.some((t) => t.includes('Extract local variable')),
        `Expected an "Extract local variable" action but got: ${titles.join(', ')}`,
      ).toBe(true);
    });

    await test.step('Apply the action and assert the Account declaration appears', async () => {
      await apexEditor.applyCodeAction('Extract local variable');

      // A `new T(...)` expression infers to the constructed type `T`, with
      // user-defined casing preserved (`Account`, not `account`).
      await apexEditor.waitForContentToInclude('Account v1 = new Account();');

      const content = await apexEditor.getContent();
      const normalized = content.replace(/ /g, ' ');

      expect(normalized).toMatch(/Account\s+v\d+\s*=\s*new\s+Account\(\)\s*;/);
      expect(normalized).not.toContain('// TODO');
    });
  });
});
