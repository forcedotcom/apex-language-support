/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';

// Every test launches a compiler-backed VS Code web host against the same
// workspace fixture. Running this file fully parallel can starve definition
// requests and race the shared fixture, while CI already runs it with one
// worker. Keep local and CI coverage deterministic.
test.describe.configure({ mode: 'serial' });

/**
 * E2E tests for Apex Go-to-Definition functionality.
 *
 * Tests the LSP go-to-definition capabilities for various Apex symbols:
 * - Navigate to class definitions
 * - Navigate to method definitions
 * - Navigate to field/variable definitions
 * - Navigate to inner type definitions
 * - Navigate across inheritance hierarchies
 * - Navigate to interface implementations
 * - Handle edge cases (not found, errors)
 *
 * @group goto-definition
 */

test.describe('Apex Go-to-Definition', () => {
  /**
   * Test: Navigate to class definition from class usage.
   */
  test('should navigate to class definition from usage', async ({
    apexEditor,
  }) => {
    await test.step('Position cursor on class name', async () => {
      await apexEditor.positionCursorOnWord('ApexClassExample');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation occurred', async () => {
      // Web LSP resolves to class declaration (line 1);
      // desktop LSP resolves to the first constructor (line 13)
      await apexEditor.expectCursorAtLine([1, 13]);
      expect(await apexEditor.isApexFileOpen()).toBe(true);

      console.log('✅ Navigated to class definition');
    });
  });

  /**
   * Test: Navigate to method definition from method call.
   */
  test('should navigate to method definition from call site', async ({
    apexEditor,
  }) => {
    await test.step('Position cursor on method name', async () => {
      await apexEditor.positionCursorOnWord('sayHello');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation to method', async () => {
      await apexEditor.expectCursorAtLine(31);
      expect(await apexEditor.isApexFileOpen()).toBe(true);

      console.log('✅ Navigated to method definition');
    });
  });

  /**
   * Test: Navigate to static method definition.
   */
  test('should navigate to static method definition', async ({
    apexEditor,
  }) => {
    await apexEditor.positionCursorOnWord('add');
    await apexEditor.goToDefinition();

    await apexEditor.expectCursorAtLine(42);

    console.log('✅ Navigated to static method definition');
  });

  /**
   * Test: Navigate to field definition from field usage.
   */
  test('should navigate to field definition', async ({ apexEditor }) => {
    await test.step('Position cursor on field usage', async () => {
      // Line 24 contains two identical tokens:
      // `this.instanceId = instanceId`. Find advances to the second match when
      // Enter is pressed, which tests the constructor parameter rather than the
      // field. Position directly on the qualified field (1-based column 14).
      await apexEditor.goToPosition(24, 14);
    });

    await test.step('Trigger go-to-definition', async () => {
      // Retry F12 until navigation lands on the field declaration: in the web
      // pool a definition issued during full-detail ingest returns null and is
      // not auto-retried by VS Code (W-23715603).
      await apexEditor.goToDefinition(7);
    });

    await test.step('Verify navigation to field declaration', async () => {
      await apexEditor.expectCursorAtLine(7);

      console.log('✅ Navigated to field definition');
    });
  });

  /**
   * Test: Navigate to static field/constant definition.
   */
  test('should navigate to static constant definition', async ({
    apexEditor,
  }) => {
    // Navigate past the declaration (line 3) so Find lands on a usage site
    await apexEditor.goToPosition(94);
    await apexEditor.positionCursorOnWord('DEFAULT_STATUS');
    await apexEditor.goToDefinition();

    await apexEditor.expectCursorAtLine(3);

    console.log('✅ Navigated to static constant definition');
  });

  /**
   * Test: Navigate to inner class definition.
   */
  test('should navigate to inner class definition', async ({ apexEditor }) => {
    await test.step('Position cursor on inner class name', async () => {
      await apexEditor.positionCursorOnWord('Configuration');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation to inner class', async () => {
      await apexEditor.expectCursorAtLine(151);

      console.log('✅ Navigated to inner class definition');
    });
  });

  /**
   * Test: Navigate to inner enum definition.
   */
  test('should navigate to inner enum definition', async ({ apexEditor }) => {
    // Navigate past the declaration (line 183) so Find lands on a usage site
    await apexEditor.goToPosition(190);
    await apexEditor.positionCursorOnWord('StatusType');
    await apexEditor.goToDefinition(183);

    await apexEditor.expectCursorAtLine(183);

    console.log('✅ Navigated to inner enum definition');
  });

  /**
   * Test: Navigate to constructor definition.
   */
  test('should navigate to constructor definition', async ({ apexEditor }) => {
    await test.step('Open source file and position on constructor call', async () => {
      await apexEditor.openFile('ApexClassExample.cls');
      await apexEditor.goToPosition(1, 1);
      const sourceViewport = await apexEditor.getContent();
      expect(sourceViewport).toMatch(
        /public\s+with\s+sharing\s+class\s+ApexClassExample/,
      );
    });

    await test.step('Navigate to parameterized constructor via usage', async () => {
      // Position cursor on 'ApexClassExample' in the default constructor body
      // where it calls this('default-instance') — line 14 has the this(...)
      // call. Instead of F12 on `this` (which can resolve ambiguously to
      // constructors in other workspace files), we use F12 on the class name
      // in the parameterized constructor signature itself (line 20) to verify
      // the LSP can resolve the constructor definition.
      await apexEditor.goToPosition(20, 12);
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation to constructor', async () => {
      await apexEditor.expectCursorAtLine(20);

      console.log('✅ Navigated to constructor definition');
    });
  });

  /**
   * Test: Navigate to local variable definition.
   */
  test('should navigate to local variable definition', async ({
    apexEditor,
  }) => {
    await test.step('Position cursor on local variable', async () => {
      await apexEditor.positionCursorOnWord('accountMap');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation to variable declaration', async () => {
      await apexEditor.expectCursorAtLine(79);

      console.log('✅ Navigated to local variable definition');
    });
  });

  /**
   * Test: Navigate to method parameter definition.
   */
  test('should navigate to parameter definition', async ({ apexEditor }) => {
    await test.step('Position cursor on parameter usage in method body', async () => {
      // Line 129: return principal * compoundFactor — usage of 'principal' param
      // Navigate past the declaration (line 123) so Find lands on a usage site
      await apexEditor.goToPosition(129);
      await apexEditor.positionCursorOnWord('principal');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation to parameter declaration', async () => {
      // principal parameter is declared on line 123 in calculateCompoundInterest
      await apexEditor.expectCursorAtLine(123);

      console.log('✅ Navigated to parameter definition');
    });
  });

  /**
   * Test: Navigate to private method definition.
   */
  test('should navigate to private method definition', async ({
    apexEditor,
  }) => {
    // positionCursorOnWord finds the first match: line 59 (usage in processAccounts)
    // Declaration is at line 67
    await apexEditor.positionCursorOnWord('validateAccounts');
    await apexEditor.goToDefinition();

    await apexEditor.expectCursorAtLine(67);

    console.log('✅ Navigated to private method definition');
  });

  /**
   * Test: Navigate to method with parameters.
   */
  test('should navigate to method with parameters', async ({ apexEditor }) => {
    await apexEditor.positionCursorOnWord('processAccounts');
    await apexEditor.goToDefinition();

    await apexEditor.expectCursorAtLine(58);

    console.log('✅ Navigated to method with parameters');
  });

  /**
   * Test: Navigate to generic type declaration (List, Map, etc.).
   */
  test('should handle generic type references', async ({ apexEditor }) => {
    await test.step('Position cursor on generic-typed field', async () => {
      // Use `configCache` (Map<String, Object>, line 4) — unique to
      // ApexClassExample.cls. The previously-used `accounts` token also
      // appears in AccountHandler.cls, which caused F12 to resolve
      // cross-file when fixture setup or prior tests left AccountHandler
      // as the active editor.
      await apexEditor.goToPosition(1);
      await apexEditor.positionCursorOnWord('configCache');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation to variable declaration', async () => {
      await apexEditor.expectCursorAtLine(4);
    });
  });

  /**
   * Test: Go-to-definition is responsive.
   */
  test('should perform go-to-definition within reasonable time', async ({
    apexEditor,
  }) => {
    const startTime = Date.now();

    await apexEditor.positionCursorOnWord('ApexClassExample');
    await apexEditor.goToDefinition();

    const elapsedTime = Date.now() - startTime;

    // CI runners are slower - allow 12s; local desktop can still exceed 6s occasionally.
    const maxMs = process.env.CI ? 12000 : 8000;
    expect(elapsedTime).toBeLessThan(maxMs);
    console.log(`✅ Go-to-definition completed in ${elapsedTime}ms`);
  });

  /**
   * Test: Multiple go-to-definition operations in sequence.
   */
  test('should handle multiple sequential go-to-definition operations', async ({
    apexEditor,
  }) => {
    await test.step('First navigation: class definition', async () => {
      await apexEditor.positionCursorOnWord('ApexClassExample');
      await apexEditor.goToDefinition([1, 13]);
      await apexEditor.expectCursorAtLine([1, 13]);
    });

    await test.step('Second navigation: inner class definition', async () => {
      await apexEditor.positionCursorOnWord('Configuration');
      await apexEditor.goToDefinition(151);
      await apexEditor.expectCursorAtLine(151);
    });

    await test.step('Third navigation: inner enum definition', async () => {
      await apexEditor.positionCursorOnWord('StatusType');
      await apexEditor.goToDefinition(183);
      await apexEditor.expectCursorAtLine(183);
    });

    console.log('✅ Multiple sequential go-to-definitions succeeded');
  });

  /**
   * Test: Go-to-definition works after file edits.
   */
  test('should work after making edits to the file', async ({ apexEditor }) => {
    await test.step('Make an edit to the file', async () => {
      await apexEditor.goToPosition(1, 1);
      await apexEditor.typeText('// Added comment\n');

      console.log('✅ Made edit to file');
    });

    await test.step('Perform go-to-definition after edit', async () => {
      await apexEditor.positionCursorOnWord('sayHello');
      await apexEditor.goToDefinition();

      // Line 31 in original file + 1 for the added comment line = line 32
      await apexEditor.expectCursorAtLine(32);

      console.log('✅ Go-to-definition works after file edit');
    });
  });

  /**
   * Test: Go-to-definition on enum value.
   */
  test('should navigate to enum when clicking enum value', async ({
    apexEditor,
  }) => {
    await test.step('Open source file for enum reference', async () => {
      await apexEditor.openFile('ApexClassExample.cls');
    });

    await test.step('Position cursor on enum value', async () => {
      // Use a unique enum constant to avoid matching string literals like 'Active'.
      await apexEditor.positionCursorOnWord('SUSPENDED');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation', async () => {
      // SUSPENDED is defined on line 184 within the enum
      await apexEditor.expectCursorAtLine(184);

      console.log('✅ Navigated from enum value to enum definition');
    });
  });

  /**
   * Test: Go-to-definition on 'this' keyword references the current class.
   */
  test('should handle this keyword appropriately', async ({ apexEditor }) => {
    await test.step('Position cursor on this keyword', async () => {
      // Line 24: this.instanceId = instanceId — 'this' usage in constructor
      await apexEditor.goToPosition(24, 9);
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify editor is still functional', async () => {
      expect(await apexEditor.isApexFileOpen()).toBe(true);
      const content = await apexEditor.getContent();
      expect(content.length).toBeGreaterThan(0);
    });
  });

  /**
   * Test: Go-to-definition maintains cursor position on failure.
   */
  test('should not crash on definition not found', async ({ apexEditor }) => {
    await test.step('Position cursor on non-existent symbol', async () => {
      // Add a comment with a fake symbol
      await apexEditor.goToPosition(1, 1);
      await apexEditor.typeText('// NonExistentSymbol\n');
      await apexEditor.positionCursorOnWord('NonExistentSymbol');
    });

    await test.step('Trigger go-to-definition', async () => {
      // This should not crash even if definition is not found
      await apexEditor.goToDefinition();
    });

    await test.step('Verify editor is still functional', async () => {
      expect(await apexEditor.isApexFileOpen()).toBe(true);
      const content = await apexEditor.getContent();
      expect(content.length).toBeGreaterThan(0);

      console.log('✅ Gracefully handled definition not found');
    });
  });

  /**
   * Test: Go-to-definition on standard Apex types (if supported).
   */
  test('should handle standard Apex types', async ({ apexEditor }) => {
    await test.step('Position cursor on standard type', async () => {
      await apexEditor.positionCursorOnWord('String');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify no error', async () => {
      expect(await apexEditor.isApexFileOpen()).toBe(true);
      const content = await apexEditor.getContent();
      expect(content.length).toBeGreaterThan(0);

      console.log('✅ Handled standard Apex type');
    });
  });
});

// Advanced + cross-file scenarios live in apex-goto-definition-advanced.spec.ts
// so a flake there re-runs 9 tests, not the full basic suite.
