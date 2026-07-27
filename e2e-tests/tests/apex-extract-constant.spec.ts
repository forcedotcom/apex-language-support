/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';

/**
 * E2E test for the Extract Constant code action (W-23389338 / 05.3) with
 * expression type inference (W-23389334 / 01.1).
 *
 * Exercises the LSP `textDocument/codeAction` path end-to-end through the
 * editor: open a .cls fixture, select a literal sub-expression, invoke the
 * Refactor UI, assert the "Extract constant" action is offered, apply it, and
 * confirm a class-body `private static final <Type> <name> = <literal>;`
 * constant is inserted with the selection replaced by `<name>`.
 *
 * Extract Constant is gated (Jorje parity) to literal expressions, so the
 * fixture selection is a string literal (`'greeting'`), which the constant
 * finder accepts and type inference resolves to `String`.
 *
 * Capability profile / development-mode notes: see apex-extract-variable.spec.ts.
 *
 * @group code-action
 */

test.describe('Apex Extract Constant Code Action', () => {
  test('offers and applies "Extract constant" for a string literal, inferring String', async ({
    apexEditor,
  }) => {
    await test.step('Open the extract-constant fixture', async () => {
      await apexEditor.openFile('ExtractConstantSample.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step("Select the `'greeting'` string literal", async () => {
      // Fixture line 7 (1-based): `        String message = 'greeting';`
      // `'greeting'` begins at column 26 and is 10 characters wide (quotes
      // included).
      await apexEditor.selectRange(7, 26, 10);
    });

    await test.step('Invoke Refactor and assert Extract constant is offered', async () => {
      const titles = await apexEditor.openCodeActions();
      expect(
        titles.some((t) => t.includes('Extract constant')),
        `Expected an "Extract constant" action but got: ${titles.join(', ')}`,
      ).toBe(true);
    });

    await test.step('Apply the action and assert the String constant appears', async () => {
      await apexEditor.applyCodeAction('Extract constant');

      // A top-level class constant uses `private static final`; the string
      // literal infers to `String`. Match on structure rather than exact
      // whitespace/name.
      await apexEditor.waitForContentToInclude(
        "private static final String v1 = 'greeting';",
      );

      const content = await apexEditor.getContent();
      // Monaco renders indentation with non-breaking spaces ( ); normalize
      // to regular spaces so the structural regex assertions (including the
      // exact leading-space count below) match reliably.
      const normalized = content.replace(/ /g, ' ');

      expect(normalized).toMatch(
        /private\s+static\s+final\s+String\s+v\d+\s*=\s*'greeting'\s*;/,
      );
      expect(normalized).not.toContain('// TODO');

      // The constant must line up with the existing four-space members
      // (regression: the indent was previously a fixed two-space unit, leaving
      // the inserted line under-indented by two spaces). Assert the inserted
      // line's leading whitespace is exactly four spaces — matching the
      // fixture's members. Split on the constant line and measure its indent
      // directly so a wrong count surfaces the actual value.
      const constantLine = normalized
        .split('\n')
        .find((line) => line.includes('private static final String'));
      expect(constantLine).toBeDefined();
      const leadingSpaces = constantLine!.match(/^\s*/)?.[0] ?? '';
      expect(leadingSpaces).toBe('    ');

      // The original literal is now replaced by the generated name.
      expect(normalized).toMatch(/String\s+message\s*=\s*v\d+\s*;/);
    });
  });
});
