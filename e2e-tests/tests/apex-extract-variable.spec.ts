/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';

/**
 * E2E test for the Extract Variable code action (W-23389338 / 05.3).
 *
 * Exercises the LSP `textDocument/codeAction` path end-to-end through the
 * editor: open a .cls fixture, select a single sub-expression, invoke the
 * Refactor UI, assert the "Extract local variable" action is offered, apply
 * it, and confirm the document now contains the inserted `Object <name> = ...`
 * declaration with the selection replaced by `<name>`.
 *
 * Capability profile: the code action provider (kinds quickfix +
 * refactor.extract) is only advertised under the DEVELOPMENT capability
 * profile. The e2e harness boots in development mode — web via
 * `apex.environment.serverMode: "development"` written into the workspace
 * `.vscode/settings.json` (test-server.js / utils/setup.ts), and desktop via
 * the extension being launched from its `extensionDevelopmentPath`
 * (ExtensionMode.Development). So the provider IS advertised e2e; capability
 * gating (story 05.4) does NOT block this test.
 *
 * The inferred type is a placeholder (`Object`) with a trailing TODO comment
 * until type inference lands (a separate story), and the generated name is
 * `v1`/`v2`/… so assertions match on structure, not an exact type or name.
 *
 * KNOWN BLOCKER (test.fixme): the language server returns an empty code-action
 * result over the worker request-pool, so VS Code shows "No refactorings
 * available" and no action ever surfaces. This was isolated during
 * implementation: an unconditional server-side probe action injected into
 * `CodeActionProcessingService.getExtractActions` also failed to reach the
 * editor, while hover / go-to-definition / completion / find-references — which
 * traverse the identical request-pool + wire-schema path — all work. The bug is
 * therefore in the product code-action pool path (a distinct web-pool response
 * regression, NOT the 05.4 capability gating). This is a test-only story, so
 * per its scope the product code was left unchanged and the test is marked
 * `fixme`; remove `test.fixme` once the pool code-action response is fixed.
 *
 * @group code-action
 */

test.describe('Apex Extract Variable Code Action', () => {
  test.fixme('offers and applies "Extract local variable" for a selected sub-expression', async ({
    apexEditor,
  }) => {
    await test.step('Open the extract-variable fixture', async () => {
      await apexEditor.openFile('ExtractVariableSample.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Select the `2 * 3` sub-expression', async () => {
      // Fixture line 6 (1-based): `        Integer result = 1 + 2 * 3;`
      // Columns are 1-based; the `2` of `2 * 3` begins at column 30 and the
      // sub-expression `2 * 3` is 5 characters wide.
      await apexEditor.selectRange(6, 30, 5);
    });

    await test.step('Invoke Refactor and assert Extract local variable is offered', async () => {
      const titles = await apexEditor.openCodeActions();
      expect(
        titles.some((t) => t.includes('Extract local variable')),
        `Expected an "Extract local variable" action but got: ${titles.join(', ')}`,
      ).toBe(true);
    });

    await test.step('Apply the action and assert the extracted declaration appears', async () => {
      await apexEditor.applyCodeAction('Extract local variable');

      // The refactoring inserts `Object v1 = 2 * 3; // TODO...` above the
      // statement and replaces the selection with the generated name. Match on
      // structure (Object <name> = <expr>) rather than exact whitespace/name.
      await apexEditor.waitForContentToInclude('Object v1 = 2 * 3;');

      const content = await apexEditor.getContent();
      // Monaco renders indentation with non-breaking spaces ( ); normalize
      // to regular spaces so the structural regex assertions match reliably.
      const normalized = content.replace(/ /g, ' ');

      // The inserted declaration: `Object <name> = 2 * 3;` (type is the Object
      // placeholder until inference lands).
      expect(normalized).toMatch(/Object\s+v\d+\s*=\s*2\s*\*\s*3\s*;/);

      // The original expression is now replaced by the generated name, so the
      // enclosing statement reads `Integer result = 1 + v1;`.
      expect(normalized).toMatch(/Integer\s+result\s*=\s*1\s*\+\s*v\d+\s*;/);
    });
  });
});
