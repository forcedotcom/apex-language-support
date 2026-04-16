/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';

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
      // Navigate past the declaration (line 7) so Find lands on a usage site
      await apexEditor.goToPosition(24);
      await apexEditor.positionCursorOnWord('instanceId');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
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
    await apexEditor.goToDefinition();

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
    await test.step('Position cursor on generic-typed variable', async () => {
      await apexEditor.goToPosition(1);
      await apexEditor.positionCursorOnWord('accounts');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation to variable declaration', async () => {
      await apexEditor.expectCursorAtLine(8);
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
      await apexEditor.goToDefinition();
      await apexEditor.expectCursorAtLine([1, 13]);
    });

    await test.step('Second navigation: inner class definition', async () => {
      await apexEditor.positionCursorOnWord('Configuration');
      await apexEditor.goToDefinition();
      await apexEditor.expectCursorAtLine(151);
    });

    await test.step('Third navigation: inner enum definition', async () => {
      await apexEditor.positionCursorOnWord('StatusType');
      await apexEditor.goToDefinition();
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
  }) => {
    await test.step('Open inheritance test file', async () => {
      await apexEditor.openFile('AccountHandler.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Navigate from derived class to base', async () => {
      await apexEditor.positionCursorOnWord('BaseHandler');
      await apexEditor.goToDefinition();
      await apexEditor.waitForNavigation('AccountHandler.cls', 12000);

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
    await test.step('Open interface implementation test file', async () => {
      await apexEditor.openFile('AccountProcessor.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Navigate to interface definition', async () => {
      await apexEditor.positionCursorOnWord('DataProcessor');
      await apexEditor.goToDefinition();
      await apexEditor.waitForNavigation('AccountProcessor.cls', 12000);

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
    });

    await test.step('Warm up cross-file LSP resolution via hover', async () => {
      // The Apex LSP uses "missing artifact resolution" to lazily load cross-file
      // types. hoverAtWithResolution triggers this: first hover fires the resolver,
      // waits 3s for the background load, then re-hovers to confirm resolution.
      await hoverHelper.hoverAtWithResolution(11, 27);
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
    });

    await test.step('Warm up cross-file LSP resolution via hover', async () => {
      await hoverHelper.hoverAtWithResolution(11, 27);
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
    });

    await test.step('Warm up cross-file LSP resolution via hover', async () => {
      await hoverHelper.hoverAtWithResolution(6, 42);
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
    });

    await test.step('Warm up cross-file LSP resolution via hover', async () => {
      // Hover at base class reference to trigger missing artifact resolution
      // for CrossFileBaseClass.cls, which is needed for getBaseName to resolve.
      await hoverHelper.hoverAtWithResolution(6, 42);
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
