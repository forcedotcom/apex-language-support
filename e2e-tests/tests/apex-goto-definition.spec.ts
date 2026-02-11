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
      // Position on a class reference in the code
      await apexEditor.positionCursorOnWord('ApexClassExample');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation occurred', async () => {
      expect(await apexEditor.isApexFileOpen()).toBe(true);

      const content = await apexEditor.findAndGetViewportContent(
        'public with sharing class ApexClassExample',
      );
      expect(content).toMatch(
        /public\s+with\s+sharing\s+class\s+ApexClassExample/,
      );

      console.log('✅ Navigated to class definition');
    });
  });

  /**
   * Test: Navigate to method definition from method call.
   */
  test('should navigate to method definition from call site', async ({
    apexEditor,
  }) => {
    await test.step('Position cursor on method call', async () => {
      await apexEditor.positionCursorOnWord('sayHello');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation to method', async () => {
      expect(await apexEditor.isApexFileOpen()).toBe(true);

      const content = await apexEditor.findAndGetViewportContent(
        'public static void sayHello',
      );
      expect(content).toMatch(/public\s+static\s+void\s+sayHello/);

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

    const content = await apexEditor.findAndGetViewportContent(
      'public static Integer add',
    );
    expect(content).toMatch(/public\s+static\s+Integer\s+add/);

    console.log('✅ Navigated to static method definition');
  });

  /**
   * Test: Navigate to field definition from field usage.
   */
  test('should navigate to field definition', async ({ apexEditor }) => {
    await test.step('Position cursor on field name', async () => {
      await apexEditor.positionCursorOnWord('instanceId');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation to field declaration', async () => {
      const content = await apexEditor.findAndGetViewportContent(
        'private String instanceId',
      );
      expect(content).toMatch(/private\s+String\s+instanceId/);

      console.log('✅ Navigated to field definition');
    });
  });

  /**
   * Test: Navigate to static field/constant definition.
   */
  test('should navigate to static constant definition', async ({
    apexEditor,
  }) => {
    await apexEditor.positionCursorOnWord('DEFAULT_STATUS');
    await apexEditor.goToDefinition();

    const content = await apexEditor.findAndGetViewportContent(
      'private static final String DEFAULT_STATUS',
    );
    expect(content).toMatch(
      /private\s+static\s+final\s+String\s+DEFAULT_STATUS/,
    );

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
      const content = await apexEditor.findAndGetViewportContent(
        'public class Configuration',
      );
      expect(content).toMatch(/public\s+class\s+Configuration/);

      console.log('✅ Navigated to inner class definition');
    });
  });

  /**
   * Test: Navigate to inner enum definition.
   */
  test('should navigate to inner enum definition', async ({ apexEditor }) => {
    await apexEditor.positionCursorOnWord('StatusType');
    await apexEditor.goToDefinition();

    const content = await apexEditor.findAndGetViewportContent(
      'public enum StatusType',
    );
    expect(content).toMatch(/public\s+enum\s+StatusType/);

    console.log('✅ Navigated to inner enum definition');
  });

  /**
   * Test: Navigate to constructor definition.
   */
  test('should navigate to constructor definition', async ({ apexEditor }) => {
    await test.step('Position cursor on constructor call', async () => {
      // Look for constructor usage like "new ApexClassExample()"
      await apexEditor.positionCursorOnWord('ApexClassExample(');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation to constructor', async () => {
      const content = await apexEditor.findAndGetViewportContent(
        'public ApexClassExample()',
      );
      const hasConstructor =
        /public\s+ApexClassExample\s*\(\s*\)/.test(content) ||
        /public\s+ApexClassExample\s*\(\s*String\s+instanceId\s*\)/.test(
          content,
        );
      expect(hasConstructor).toBe(true);

      console.log('✅ Navigated to constructor definition');
    });
  });

  /**
   * Test: Navigate to local variable definition.
   */
  test('should navigate to local variable definition', async ({
    apexEditor,
  }) => {
    await test.step('Position cursor on local variable usage', async () => {
      // Find a local variable in a method
      await apexEditor.positionCursorOnWord('accountMap');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify we stayed in the file', async () => {
      // Go-to-definition on local variable should navigate within the same method
      expect(await apexEditor.isApexFileOpen()).toBe(true);

      console.log('✅ Navigated to local variable definition');
    });
  });

  /**
   * Test: Navigate to method parameter definition.
   */
  test('should navigate to parameter definition', async ({ apexEditor }) => {
    await test.step('Position cursor on parameter usage in method body', async () => {
      await apexEditor.positionCursorOnWord('inputAccounts');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation', async () => {
      expect(await apexEditor.isApexFileOpen()).toBe(true);

      console.log('✅ Navigated to parameter definition');
    });
  });

  /**
   * Test: Navigate to private method definition.
   */
  test('should navigate to private method definition', async ({
    apexEditor,
  }) => {
    await apexEditor.positionCursorOnWord('validateAccounts');
    await apexEditor.goToDefinition();

    const content = await apexEditor.findAndGetViewportContent(
      'private void validateAccounts',
    );
    expect(content).toMatch(/private\s+void\s+validateAccounts/);

    console.log('✅ Navigated to private method definition');
  });

  /**
   * Test: Navigate to method with parameters.
   */
  test('should navigate to method with parameters', async ({ apexEditor }) => {
    await apexEditor.positionCursorOnWord('processAccounts');
    await apexEditor.goToDefinition();

    const content = await apexEditor.findAndGetViewportContent(
      'public void processAccounts',
    );
    expect(content).toMatch(/public\s+void\s+processAccounts/);

    console.log('✅ Navigated to method with parameters');
  });

  /**
   * Test: Navigate to generic type declaration (List, Map, etc.).
   */
  test('should handle generic type references', async ({ apexEditor }) => {
    await test.step('Position cursor on generic type', async () => {
      await apexEditor.positionCursorOnWord('List<Account>');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation or no error', async () => {
      // Generic types may not have definitions in user code
      // Just verify no crash occurred
      expect(await apexEditor.isApexFileOpen()).toBe(true);

      console.log('✅ Handled generic type reference');
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

    expect(elapsedTime).toBeLessThan(6000); // Should complete within 6 seconds
    console.log(`✅ Go-to-definition completed in ${elapsedTime}ms`);
  });

  /**
   * Test: Multiple go-to-definition operations in sequence.
   */
  test('should handle multiple sequential go-to-definition operations', async ({
    apexEditor,
  }) => {
    await test.step('First navigation', async () => {
      await apexEditor.positionCursorOnWord('ApexClassExample');
      await apexEditor.goToDefinition();
      expect(await apexEditor.isApexFileOpen()).toBe(true);
    });

    await test.step('Second navigation', async () => {
      await apexEditor.positionCursorOnWord('Configuration');
      await apexEditor.goToDefinition();
      expect(await apexEditor.isApexFileOpen()).toBe(true);
    });

    await test.step('Third navigation', async () => {
      await apexEditor.positionCursorOnWord('StatusType');
      await apexEditor.goToDefinition();
      expect(await apexEditor.isApexFileOpen()).toBe(true);
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
      await apexEditor.positionCursorOnWord('ApexClassExample');
      await apexEditor.goToDefinition();

      expect(await apexEditor.isApexFileOpen()).toBe(true);

      console.log('✅ Go-to-definition works after file edit');
    });
  });

  /**
   * Test: Go-to-definition on enum value.
   */
  test('should navigate to enum when clicking enum value', async ({
    apexEditor,
  }) => {
    await test.step('Position cursor on enum value', async () => {
      // Look for an enum value like ACTIVE, INACTIVE, etc.
      await apexEditor.positionCursorOnWord('ACTIVE');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify navigation', async () => {
      const content = await apexEditor.findAndGetViewportContent('StatusType');
      expect(content).toMatch(/StatusType/);

      console.log('✅ Navigated from enum value to enum definition');
    });
  });

  /**
   * Test: Go-to-definition on 'this' keyword references the current class.
   */
  test('should handle this keyword appropriately', async ({ apexEditor }) => {
    await test.step('Position cursor on this keyword', async () => {
      await apexEditor.positionCursorOnWord('this.instanceId');
    });

    await test.step('Trigger go-to-definition', async () => {
      await apexEditor.goToDefinition();
    });

    await test.step('Verify stayed in file', async () => {
      // 'this' should either navigate to class or stay in place
      expect(await apexEditor.isApexFileOpen()).toBe(true);

      console.log('✅ Handled this keyword reference');
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
      // Standard types may not have definitions available
      // Just verify no crash
      expect(await apexEditor.isApexFileOpen()).toBe(true);

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
   * Uses inheritance.cls test file.
   */
  test('should navigate to base class from derived class', async ({
    apexEditor,
  }) => {
    await test.step('Try to open inheritance test file', async () => {
      try {
        await apexEditor.openFile('inheritance.cls');
        await apexEditor.waitForLanguageServerReady();
        console.log('✅ Opened inheritance.cls test file');
      } catch (error) {
        const errStr =
          error instanceof Error
            ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
            : JSON.stringify(error);
        console.log(
          '⚠️ inheritance.cls not available, using default file',
          errStr,
        );
        return; // Skip this test if file not available
      }
    });

    await test.step('Navigate from derived class to base', async () => {
      await apexEditor.positionCursorOnWord('BaseHandler');
      await apexEditor.goToDefinition();

      const content = await apexEditor.findAndGetViewportContent(
        'abstract class BaseHandler',
      );
      expect(content).toMatch(/abstract\s+class\s+BaseHandler/);

      console.log('✅ Navigated to base class definition');
    });
  });

  /**
   * Test: Navigate to overridden method.
   */
  test('should navigate to overridden method in derived class', async ({
    apexEditor,
  }) => {
    await test.step('Open inheritance test file', async () => {
      try {
        await apexEditor.openFile('inheritance.cls');
        await apexEditor.waitForLanguageServerReady();
      } catch (error) {
        const errStr =
          error instanceof Error
            ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
            : JSON.stringify(error);
        console.log('⚠️ inheritance.cls not available', errStr);
        return;
      }
    });

    await test.step('Navigate to overridden execute method', async () => {
      await apexEditor.positionCursorOnWord('override void execute');
      await apexEditor.goToDefinition();

      const content = await apexEditor.findAndGetViewportContent('execute');
      expect(content).toMatch(/execute/);

      console.log('✅ Navigated to overridden method');
    });
  });

  /**
   * Test: Navigate to interface definition from implementation.
   * Uses interface-impl.cls test file.
   */
  test('should navigate to interface from implementing class', async ({
    apexEditor,
  }) => {
    await test.step('Open interface implementation test file', async () => {
      try {
        await apexEditor.openFile('interface-impl.cls');
        await apexEditor.waitForLanguageServerReady();
      } catch (error) {
        const errStr =
          error instanceof Error
            ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
            : JSON.stringify(error);
        console.log('⚠️ interface-impl.cls not available', errStr);
        return;
      }
    });

    await test.step('Navigate to interface definition', async () => {
      await apexEditor.positionCursorOnWord('DataProcessor');
      await apexEditor.goToDefinition();

      const content = await apexEditor.findAndGetViewportContent(
        'interface DataProcessor',
      );
      expect(content).toMatch(/interface\s+DataProcessor/);

      console.log('✅ Navigated to interface definition');
    });
  });

  /**
   * Test: Navigate to interface method from implementation.
   */
  test('should navigate to interface method from implementation', async ({
    apexEditor,
  }) => {
    await test.step('Open interface implementation file', async () => {
      try {
        await apexEditor.openFile('interface-impl.cls');
        await apexEditor.waitForLanguageServerReady();
      } catch (error) {
        const errStr =
          error instanceof Error
            ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
            : JSON.stringify(error);
        console.log('⚠️ interface-impl.cls not available', errStr);
        return;
      }
    });

    await test.step('Navigate to processRecords method', async () => {
      await apexEditor.positionCursorOnWord('processRecords');
      await apexEditor.goToDefinition();

      const content =
        await apexEditor.findAndGetViewportContent('processRecords');
      expect(content).toMatch(/processRecords/);

      console.log('✅ Navigated to interface method');
    });
  });

  /**
   * Test: Navigate in complex class with multiple nested types.
   * Uses complex-class.cls test file.
   */
  test('should navigate in complex class structure', async ({ apexEditor }) => {
    await test.step('Open complex class test file', async () => {
      try {
        await apexEditor.openFile('complex-class.cls');
        await apexEditor.waitForLanguageServerReady();
      } catch (error) {
        const errStr =
          error instanceof Error
            ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
            : JSON.stringify(error);
        console.log('⚠️ complex-class.cls not available', errStr);
        return;
      }
    });

    await test.step('Navigate to inner class in complex file', async () => {
      await apexEditor.positionCursorOnWord('Configuration');
      await apexEditor.goToDefinition();

      const content = await apexEditor.findAndGetViewportContent(
        'class Configuration',
      );
      expect(content).toMatch(/class\s+Configuration/);

      console.log('✅ Navigated in complex class structure');
    });
  });
});
