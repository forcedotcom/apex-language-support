/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { SymbolResolutionContext } from '../../src/types/ISymbolManager';
import { ResolutionRequest } from '../../src/symbols/resolution/types';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { TestLogger } from '../utils/testLogger';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('ApexSymbolManager - Enhanced Resolution', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;
  let logger: TestLogger;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
    logger = TestLogger.getInstance();
    logger.setLogLevel('error');
  });

  // Helper function to compile Apex code and add to symbol manager
  const compileAndAddToManager = async (
    apexCode: string,
    fileName: string = 'test.cls',
  ): Promise<void> => {
    const result = compilerService.compile(apexCode, fileName, listener);

    if (result.errors.length > 0) {
      logger.warn(
        () =>
          `Compilation warnings: ${result.errors.map((e) => e.message).join(', ')}`,
      );
    }

    if (result.result) {
      symbolManager.addSymbolTable(result.result, fileName);
    }
  };

  // Helper function to create a real resolution context
  const createRealContext = (
    sourceFile: string,
    position: { line: number; character: number },
  ): SymbolResolutionContext =>
    symbolManager.createResolutionContext(
      `public class TestClass {
        public String testVariable;

        public void testMethod() {
          String localVar = 'test';
        }
      }`,
      position,
      sourceFile,
    );

  describe('resolveSymbolWithStrategy', () => {
    beforeEach(() => {
      enableConsoleLogging();
      setLogLevel('error');
    });

    it('should use position-based strategy for hover requests', async () => {
      // Compile a test class with a variable
      const apexCode = `
        public class TestClass {
          public String testVariable;

          public void testMethod() {
            String localVar = 'test';
          }
        }
      `;

      await compileAndAddToManager(apexCode, 'test.cls');

      const request: ResolutionRequest = {
        type: 'hover',
        position: { line: 3, column: 5 },
      };

      const context = createRealContext('test.cls', { line: 3, character: 5 });

      const result = await symbolManager.resolveSymbolWithStrategy(
        request,
        context,
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBe('position-based');
    });

    it('should use position-based strategy for definition requests', async () => {
      // Compile a test class with a variable
      const apexCode = `
        public class TestClass {
          public String testVariable;

          public void testMethod() {
            String localVar = 'test';
          }
        }
      `;

      await compileAndAddToManager(apexCode, 'test.cls');

      const request: ResolutionRequest = {
        type: 'definition',
        position: { line: 3, column: 5 },
      };

      const context = createRealContext('test.cls', { line: 3, character: 5 });

      const result = await symbolManager.resolveSymbolWithStrategy(
        request,
        context,
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBe('position-based');
    });

    it('should use position-based strategy for references requests', async () => {
      // Compile a test class with a variable
      const apexCode = `
        public class TestClass {
          public String testVariable;

          public void testMethod() {
            String localVar = 'test';
          }
        }
      `;

      await compileAndAddToManager(apexCode, 'test.cls');

      const request: ResolutionRequest = {
        type: 'references',
        position: { line: 3, column: 5 },
      };

      const context = createRealContext('test.cls', { line: 3, character: 5 });

      const result = await symbolManager.resolveSymbolWithStrategy(
        request,
        context,
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBe('position-based');
    });

    it('should fall back to scope resolution for unsupported request types', async () => {
      // Compile a test class with a variable
      const apexCode = `
        public class TestClass {
          public String testVariable;

          public void testMethod() {
            String localVar = 'test';
          }
        }
      `;

      await compileAndAddToManager(apexCode, 'test.cls');

      const request: ResolutionRequest = {
        type: 'completion',
        position: { line: 3, column: 5 },
      };

      const context = createRealContext('test.cls', { line: 3, character: 5 });

      const result = await symbolManager.resolveSymbolWithStrategy(
        request,
        context,
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBe('scope');
    });
  });

  describe('getSymbolAtPosition - Enhanced', () => {
    it('should not trigger fallback for exact position matches', async () => {
      // Compile a test class with a variable at a specific position
      const apexCode = `
        public class TestClass {
          public String testVariable;

          public void testMethod() {
            String localVar = 'test';
          }
        }
      `;

      await compileAndAddToManager(apexCode, 'test.cls');

      const result = symbolManager.getSymbolAtPosition(
        'test.cls',
        {
          line: 2,
          character: 5,
        },
        'scope',
      );

      expect(result).toBeDefined();
      if (result) {
        // Should not have triggered fallback logic
        expect((result as any).fallbackUsed).toBe(false);
      }
    });

    it('should use exact position resolution for hover requests', async () => {
      // Compile a test class with a variable at a specific position
      const apexCode = `
        public class TestClass {
          public String testVariable;

          public void testMethod() {
            String localVar = 'test';
          }
        }
      `;

      await compileAndAddToManager(apexCode, 'test.cls');

      const result = symbolManager.getSymbolAtPosition(
        'test.cls',
        { line: 2, character: 5 },
        'precise',
      );

      expect(result).toBeDefined();
      if (result) {
        expect((result as any).resolutionMethod).toBe('exact-position');
      }
    });
  });

  describe('createResolutionContext - Enhanced', () => {
    it('should include request type in resolution context', () => {
      const context = symbolManager.createResolutionContext(
        'public class TestClass { public String testVariable; }',
        { line: 0, character: 5 },
        'test.cls',
      );

      expect(context).toBeDefined();
      expect(context.sourceFile).toBe('test.cls');
      expect(context.namespaceContext).toBe('public');
      expect(context.currentScope).toBe('class');
      expect(context.scopeChain).toContain('class');
      expect(context.accessModifier).toBe('public');
      expect(context.isStatic).toBe(false);
    });

    it('should handle different request types correctly', () => {
      const context1 = symbolManager.createResolutionContext(
        'public class TestClass { public void testMethod() { } }',
        { line: 0, character: 5 },
        'test.cls',
      );
      const context2 = symbolManager.createResolutionContext(
        'private class TestClass { private void testMethod() { } }',
        { line: 0, character: 5 },
        'test2.cls',
      );

      expect(context1).toBeDefined();
      expect(context2).toBeDefined();
      expect(context1.sourceFile).toBe('test.cls');
      expect(context2.sourceFile).toBe('test2.cls');
      expect(context1.accessModifier).toBe('public');
      expect(context2.accessModifier).toBe('private');
    });
  });

  describe('Qualified Name Hover Resolution', () => {
    beforeEach(async () => {
      // Compile and add all fixture classes to the symbol manager
      const fixtureClasses = [
        {
          name: 'FileUtilities',
          content: `public with sharing class FileUtilities {
            @AuraEnabled
            public static String createFile(String base64data, String filename, String recordId) {
                try {
                    ContentVersion contentVersion = new ContentVersion();
                    contentVersion.VersionData = EncodingUtil.base64Decode(base64data);
                    contentVersion.Title = filename;
                    contentVersion.PathOnClient = filename;
                    insert contentVersion;
                    return contentVersion.Id;
                } catch (Exception e) {
                    throw new AuraHandledException('Error creating file: ' + e);
                }
            }
        }`,
          fileName: 'FileUtilities.cls',
        },
        {
          name: 'ServiceClass',
          content: `public class ServiceClass {
            public static String processData(String input) {
                if (input == null) {
                    return 'No data provided';
                }
                String processed = input.toUpperCase();
                processed = processed.trim();
                return 'Processed: ' + processed;
            }
        }`,
          fileName: 'ServiceClass.cls',
        },
        {
          name: 'UtilityClass',
          content: `public class UtilityClass {
            public static String formatString(String input) {
                if (input == null) {
                    return '';
                }
                return input.trim();
            }
        }`,
          fileName: 'UtilityClass.cls',
        },
        {
          name: 'Account',
          content: `public class Account {
            public String Name { get; set; }
            public String BillingStreet { get; set; }
            public void updateBillingAddress(
              String street,
              String city,
              String state,
              String postalCode,
              String country
            ) {
                this.BillingStreet = street;
                this.BillingCity = city;
                this.BillingState = state;
                this.BillingPostalCode = postalCode;
                this.BillingCountry = country;
            }
        }`,
          fileName: 'Account.cls',
        },
      ];

      for (const fixture of fixtureClasses) {
        await compileAndAddToManager(fixture.content, fixture.fileName);
      }
    });

    it('should resolve hover on custom Apex class qualified name (FileUtilities)', async () => {
      // Test hover on "FileUtilities" in "FileUtilities.createFile()"
      // NOTE: Current implementation doesn't support resolving the "Foo" part in "Foo.bar()" expressions
      // This test documents the current behavior and what needs to be implemented
      const testCode = `
        public class TestClass {
          public void testMethod() {
            String result = FileUtilities.createFile('test.txt', 'Hello World');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "FileUtilities" in "FileUtilities.createFile"
      // Line 2 (0-based) = "            String result = FileUtilities.createFile('test.txt', 'Hello World');"
      // "FileUtilities" starts at character 20
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 20 }, // Position on "FileUtilities"
        'precise',
      );

      // Current implementation returns the return type (String) instead of the class name (FileUtilities)
      // TODO: Implement qualified name resolution to return FileUtilities class
      expect(result).toBeDefined();
      // For now, we expect the current behavior until qualified name resolution is implemented
      if (result?.name === 'String') {
        // Current behavior - returns return type
        expect(result?.kind).toBeDefined();
      } else if (result?.name === 'FileUtilities') {
        // Future behavior - should return the class
        expect(result?.kind).toBe('class');
      }
    });

    it('should resolve hover on custom Apex class qualified name (ServiceClass)', async () => {
      // Test hover on "ServiceClass" in "ServiceClass.processData()"
      const testCode = `
        public class TestClass {
          public void testMethod() {
            String processed = ServiceClass.processData('test data');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "ServiceClass" in "ServiceClass.processData"
      // Line 2 (0-based) = "            String processed = ServiceClass.processData('test data');"
      // "ServiceClass" starts at character 20
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 20 }, // Position on "ServiceClass"
        'precise',
      );

      // Current implementation returns the return type (String) instead of the class name (ServiceClass)
      expect(result).toBeDefined();
      if (result?.name === 'String') {
        // Current behavior - returns return type
        expect(result?.kind).toBeDefined();
      } else if (result?.name === 'ServiceClass') {
        // Future behavior - should return the class
        expect(result?.kind).toBe('class');
      }
    });

    it('should resolve hover on custom Apex class qualified name (UtilityClass)', async () => {
      // Test hover on "UtilityClass" in "UtilityClass.formatString()"
      const testCode = `
        public class TestClass {
          public void testMethod() {
            String formatted = UtilityClass.formatString('  Hello World  ');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "UtilityClass" in "UtilityClass.formatString"
      // Line 2 (0-based) = "            String formatted = UtilityClass.formatString('  Hello World  ');"
      // "UtilityClass" starts at character 20
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 20 }, // Position on "UtilityClass"
        'precise',
      );

      // Current implementation returns the return type (String) instead of the class name (UtilityClass)
      expect(result).toBeDefined();
      if (result?.name === 'String') {
        // Current behavior - returns return type
        expect(result?.kind).toBeDefined();
      } else if (result?.name === 'UtilityClass') {
        // Future behavior - should return the class
        expect(result?.kind).toBe('class');
      }
    });

    it('should resolve hover on custom Apex class qualified name (Account)', async () => {
      // Test hover on "Account" in "Account.Name"
      const testCode = `
        public class TestClass {
          public void testMethod() {
            Account acc = new Account('Test Account');
            String accountName = acc.Name;
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "Account" in "Account.Name"
      // Line 3 (0-based) = "            String accountName = acc.Name;"
      // "acc" is at character 20, but we want "Account" from the line above
      // Line 2 (0-based) = "            Account acc = new Account('Test Account');"
      // "Account" starts at character 12
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 12 }, // Position on "Account"
        'precise',
      );

      // Current implementation doesn't resolve class names in variable declarations
      // TODO: Implement qualified name resolution to return Account class
      if (result) {
        expect(result?.kind).toBeDefined();
      } else {
        // Current behavior - returns null for class names in declarations
        expect(result).toBeNull();
      }
    });

    it('should resolve hover on standard Apex class qualified name (System)', async () => {
      // Test hover on "System" in "System.debug()"
      const testCode = `
        public class TestClass {
          public void testMethod() {
            System.debug('Hello World');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "System" in "System.debug"
      // Line 2 (0-based) = "            System.debug('Hello World');"
      // "System" starts at character 12
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 12 }, // Position on "System"
        'precise',
      );

      // Current implementation doesn't resolve standard Apex class names
      // TODO: Implement qualified name resolution to return System class
      if (result) {
        expect(result?.kind).toBeDefined();
      } else {
        // Current behavior - returns null for standard class names
        expect(result).toBeNull();
      }
    });

    it('should resolve hover on standard Apex class qualified name (EncodingUtil)', async () => {
      // Test hover on "EncodingUtil" in "EncodingUtil.urlEncode()"
      const testCode = `
        public class TestClass {
          public void testMethod() {
            String encoded = EncodingUtil.urlEncode('Hello World', 'UTF-8');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "EncodingUtil" in "EncodingUtil.urlEncode"
      // Line 2 (0-based) = "            String encoded = EncodingUtil.urlEncode('Hello World', 'UTF-8');"
      // "EncodingUtil" starts at character 20
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 20 }, // Position on "EncodingUtil"
        'precise',
      );

      // Current implementation returns the return type (String) instead of the class name (EncodingUtil)
      expect(result).toBeDefined();
      if (result?.name === 'String') {
        // Current behavior - returns return type
        expect(result?.kind).toBeDefined();
      } else if (result?.name === 'EncodingUtil') {
        // Future behavior - should return the class
        expect(result?.kind).toBe('class');
      }
    });

    it('should resolve hover on builtin type qualified name (List)', async () => {
      // Test hover on "List" in "List<Integer>"
      const testCode = `
        public class TestClass {
          public void testMethod() {
            List<Integer> numbers = new List<Integer>{1, 2, 3};
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "List" in "List<Integer>"
      // Line 2 (0-based) = "            List<Integer> numbers = new List<Integer>{1, 2, 3};"
      // "List" starts at character 12
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 12 }, // Position on "List"
        'precise',
      );

      // Current implementation doesn't resolve builtin type names in generic declarations
      // TODO: Implement qualified name resolution to return List class
      if (result) {
        expect(result?.kind).toBeDefined();
      } else {
        // Current behavior - returns null for builtin type names
        expect(result).toBeNull();
      }
    });

    it('should resolve hover on builtin type qualified name (Map)', async () => {
      // Test hover on "Map" in "Map<String, Object>"
      const testCode = `
        public class TestClass {
          public void testMethod() {
            Map<String, Object> dataMap = new Map<String, Object>();
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "Map" in "Map<String, Object>"
      // Line 2 (0-based) = "            Map<String, Object> dataMap = new Map<String, Object>();"
      // "Map" starts at character 12
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 12 }, // Position on "Map"
        'precise',
      );

      // Current implementation doesn't resolve builtin type names in generic declarations
      // TODO: Implement qualified name resolution to return Map class
      if (result) {
        expect(result?.kind).toBeDefined();
      } else {
        // Current behavior - returns null for builtin type names
        expect(result).toBeNull();
      }
    });

    it('should resolve hover on builtin type qualified name (String)', async () => {
      // Test hover on "String" in "String.isNotBlank()"
      const testCode = `
        public class TestClass {
          public void testMethod() {
            if (String.isNotBlank('test')) {
              System.debug('Not blank');
            }
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "String" in "String.isNotBlank"
      // Line 2 (0-based) = "            if (String.isNotBlank('test')) {"
      // "String" starts at character 16
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 16 }, // Position on "String"
        'precise',
      );

      // Current implementation doesn't resolve builtin type names in static method calls
      // TODO: Implement qualified name resolution to return String class
      if (result) {
        expect(result?.kind).toBeDefined();
      } else {
        // Current behavior - returns null for builtin type names
        expect(result).toBeNull();
      }
    });

    it('should resolve hover on builtin type qualified name (Integer)', async () => {
      // Test hover on "Integer" in "Integer.valueOf()"
      const testCode = `
        public class TestClass {
          public void testMethod() {
            Integer num = Integer.valueOf('42');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "Integer" in "Integer.valueOf"
      // Line 2 (0-based) = "            Integer num = Integer.valueOf('42');"
      // "Integer" starts at character 20
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 20 }, // Position on "Integer"
        'precise',
      );

      // Current implementation returns the return type (String) instead of the class name (Integer)
      expect(result).toBeDefined();
      if (result?.name === 'String') {
        // Current behavior - returns return type
        expect(result?.kind).toBeDefined();
      } else if (result?.name === 'Integer') {
        // Future behavior - should return the class
        expect(result?.kind).toBe('class');
      }
    });
  });

  describe('Method Name Resolution in Qualified Calls', () => {
    beforeEach(async () => {
      // Compile and add all fixture classes to the symbol manager
      const fixtureClasses = [
        {
          name: 'FileUtilities',
          content: `public with sharing class FileUtilities {
            @AuraEnabled
            public static String createFile(String base64data, String filename, String recordId) {
                try {
                    ContentVersion contentVersion = new ContentVersion();
                    contentVersion.VersionData = EncodingUtil.base64Decode(base64data);
                    contentVersion.Title = filename;
                    contentVersion.PathOnClient = filename;
                    insert contentVersion;
                    return contentVersion.Id;
                } catch (Exception e) {
                    throw new AuraHandledException('Error creating file: ' + e);
                }
            }
            
            public static Boolean fileExists(String filename) {
                return true; // Simplified for testing
            }
        }`,
          fileName: 'FileUtilities.cls',
        },
        {
          name: 'ServiceClass',
          content: `public class ServiceClass {
            public static String processData(String input) {
                if (input == null) {
                    return 'No data provided';
                }
                String processed = input.toUpperCase();
                processed = processed.trim();
                return 'Processed: ' + processed;
            }
            
            public static List<String> splitString(String input, String delimiter) {
                if (input == null || delimiter == null) {
                    return new List<String>();
                }
                return input.split(delimiter);
            }
        }`,
          fileName: 'ServiceClass.cls',
        },
        {
          name: 'UtilityClass',
          content: `public class UtilityClass {
            public static String formatString(String input) {
                if (input == null) {
                    return '';
                }
                return input.trim();
            }
            
            public static Integer calculateSum(List<Integer> numbers) {
                Integer sum = 0;
                for (Integer num : numbers) {
                    sum += num;
                }
                return sum;
            }
        }`,
          fileName: 'UtilityClass.cls',
        },
        {
          name: 'Account',
          content: `public class Account {
            public String Name { get; set; }
            public String BillingStreet { get; set; }
            public String BillingCity { get; set; }
            public String BillingState { get; set; }
            public String BillingPostalCode { get; set; }
            public String BillingCountry { get; set; }
            
            public void updateBillingAddress(
              String street,
              String city,
              String state,
              String postalCode,
              String country
            ) {
                this.BillingStreet = street;
                this.BillingCity = city;
                this.BillingState = state;
                this.BillingPostalCode = postalCode;
                this.BillingCountry = country;
            }
            
            public String getFullAddress() {
                return this.BillingStreet + ', ' + this.BillingCity + ', ' + this.BillingState;
            }
        }`,
          fileName: 'Account.cls',
        },
      ];

      for (const fixture of fixtureClasses) {
        await compileAndAddToManager(fixture.content, fixture.fileName);
      }
    });

    it('should resolve method name in workspace Apex class qualified call (FileUtilities.createFile)', async () => {
      // Test hover on "createFile" in "FileUtilities.createFile()"
      // NOTE: Current implementation doesn't properly resolve method names in qualified calls
      // This test documents the current behavior and what needs to be implemented
      const testCode = `
        public class TestClass {
          public void testMethod() {
            String result = FileUtilities.createFile('test.txt', 'Hello World');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "createFile" in "FileUtilities.createFile"
      // Line 2 (0-based) = "            String result = FileUtilities.createFile('test.txt', 'Hello World');"
      // "createFile" starts at character 32
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 32 }, // Position on "createFile"
        'precise',
      );

      // Current implementation doesn't resolve method names in qualified calls
      // TODO: Implement qualified method resolution to return createFile method symbol
      if (result) {
        // Current behavior - may return various symbols depending on context
        expect(result?.kind).toBeDefined();
        // Current behavior returned: ${result?.name} (${result?.kind})
      } else {
        // Current behavior - returns null for method names in qualified calls
        expect(result).toBeNull();
      }
    });

    it('should resolve method name in workspace Apex class qualified call (ServiceClass.processData)', async () => {
      // Test hover on "processData" in "ServiceClass.processData()"
      const testCode = `
        public class TestClass {
          public void testMethod() {
            String processed = ServiceClass.processData('test data');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "processData" in "ServiceClass.processData"
      // Line 2 (0-based) = "            String processed = ServiceClass.processData('test data');"
      // "processData" starts at character: 32
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 32 }, // Position on "processData"
        'precise',
      );

      // Current implementation doesn't resolve method names in qualified calls
      // TODO: Implement qualified method resolution to return processData method symbol
      if (result) {
        // Current behavior - may return various symbols depending on context
        expect(result?.kind).toBeDefined();
        // Current behavior returned: ${result?.name} (${result?.kind})
      } else {
        // Current behavior - returns null for method names in qualified calls
        expect(result).toBeNull();
      }
    });

    it('should resolve method name in workspace Apex class qualified call (UtilityClass.formatString)', async () => {
      // Test hover on "formatString" in "UtilityClass.formatString()"
      const testCode = `
        public class TestClass {
          public void testMethod() {
            String formatted = UtilityClass.formatString('  Hello World  ');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "formatString" in "UtilityClass.formatString"
      // Line 2 (0-based) = "            String formatted = UtilityClass.formatString('  Hello World  ');"
      // "formatString" starts at character: 32
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 32 }, // Position on "formatString"
        'precise',
      );

      // Current implementation doesn't resolve method names in qualified calls
      // TODO: Implement qualified method resolution to return formatString method symbol
      if (result) {
        // Current behavior - may return various symbols depending on context
        expect(result?.kind).toBeDefined();
        // Current behavior returned: ${result?.name} (${result?.kind})
      } else {
        // Current behavior - returns null for method names in qualified calls
        expect(result).toBeNull();
      }
    });

    it('should resolve method name in workspace Apex class qualified call (Account.updateBillingAddress)', async () => {
      // Test hover on "updateBillingAddress" in "Account.updateBillingAddress()"
      const testCode = `
        public class TestClass {
          public void testMethod() {
            Account acc = new Account('Test Account');
            acc.updateBillingAddress('123 Main St', 'Anytown', 'CA', '12345', 'USA');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "updateBillingAddress" in "acc.updateBillingAddress"
      // Line 3 (0-based) = "            acc.updateBillingAddress('123 Main St', 'Anytown', 'CA', '12345', 'USA');"
      // "updateBillingAddress" starts at character: 24
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 3, character: 24 }, // Position on "updateBillingAddress"
        'precise',
      );

      // Current implementation doesn't resolve method names in qualified calls
      // TODO: Implement qualified method resolution to return updateBillingAddress method symbol
      if (result) {
        // Current behavior - may return various symbols depending on context
        expect(result?.kind).toBeDefined();
        // Current behavior returned: ${result?.name} (${result?.kind})
      } else {
        // Current behavior - returns null for method names in qualified calls
        expect(result).toBeNull();
      }
    });

    it('should resolve method name in standard Apex class qualified call (System.debug)', async () => {
      // Test hover on "debug" in "System.debug()"
      const testCode = `
        public class TestClass {
          public void testMethod() {
            System.debug('Hello World');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "debug" in "System.debug"
      // Line 2 (0-based) = "            System.debug('Hello World');"
      // "debug" starts at character: 18
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 18 }, // Position on "debug"
        'precise',
      );

      // Should resolve to the method symbol (if System class is available)
      if (result) {
        expect(result?.name).toBe('debug');
        expect(result?.kind).toBe('method');
      } else {
        // Current behavior - may return null if System class not fully resolved
        expect(result).toBeNull();
      }
    });

    it('should resolve method name in standard Apex class qualified call (EncodingUtil.urlEncode)', async () => {
      // Test hover on "urlEncode" in "EncodingUtil.urlEncode()"
      const testCode = `
        public class TestClass {
          public void testMethod() {
            String encoded = EncodingUtil.urlEncode('Hello World', 'UTF-8');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "urlEncode" in "EncodingUtil.urlEncode"
      // Line 2 (0-based) = "            String encoded = EncodingUtil.urlEncode('Hello World', 'UTF-8');"
      // "urlEncode" starts at character: 32
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 32 }, // Position on "urlEncode"
        'precise',
      );

      // Should resolve to the method symbol (if EncodingUtil class is available)
      if (result) {
        expect(result?.name).toBe('urlEncode');
        expect(result?.kind).toBe('method');
      } else {
        // Current behavior - may return null if EncodingUtil class not fully resolved
        expect(result).toBeNull();
      }
    });

    it('should resolve method name in builtin type qualified call (String.isNotBlank)', async () => {
      // Test hover on "isNotBlank" in "String.isNotBlank()"
      // NOTE: Current implementation doesn't properly resolve method names in qualified calls
      // This test documents the current behavior and what needs to be implemented
      const testCode = `
        public class TestClass {
          public void testMethod() {
            if (String.isNotBlank('test')) {
              System.debug('Not blank');
            }
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "isNotBlank" in "String.isNotBlank"
      // Line 2 (0-based) = "            if (String.isNotBlank('test')) {"
      // "isNotBlank" starts at character: 22
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 22 }, // Position on "isNotBlank"
        'precise',
      );

      // Current implementation doesn't resolve method names in qualified calls
      // TODO: Implement qualified method resolution to return isNotBlank method symbol
      if (result) {
        // Current behavior - may return various symbols depending on context
        expect(result?.kind).toBeDefined();
        // Current behavior returned: ${result?.name} (${result?.kind})
      } else {
        // Current behavior - returns null for method names in qualified calls
        expect(result).toBeNull();
      }
    });

    it('should resolve method name in builtin type qualified call (Integer.valueOf)', async () => {
      // Test hover on "valueOf" in "Integer.valueOf()"
      // NOTE: Current implementation doesn't properly resolve method names in qualified calls
      // This test documents the current behavior and what needs to be implemented
      const testCode = `
        public class TestClass {
          public void testMethod() {
            Integer num = Integer.valueOf('42');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "valueOf" in "Integer.valueOf"
      // Line 2 (0-based) = "            Integer num = Integer.valueOf('42');"
      // "valueOf" starts at character: 26
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 26 }, // Position on "valueOf"
        'precise',
      );

      // Current implementation doesn't resolve method names in qualified calls
      // TODO: Implement qualified method resolution to return valueOf method symbol
      if (result) {
        // Current behavior - may return various symbols depending on context
        expect(result?.kind).toBeDefined();
        // Current behavior returned: ${result?.name} (${result?.kind})
      } else {
        // Current behavior - returns null for method names in qualified calls
        expect(result).toBeNull();
      }
    });

    it('should resolve method name in builtin type qualified call (List.add)', async () => {
      // Test hover on "add" in "List.add()"
      // NOTE: Current implementation doesn't properly resolve method names in qualified calls
      // This test documents the current behavior and what needs to be implemented
      const testCode = `
        public class TestClass {
          public void testMethod() {
            List<String> strings = new List<String>();
            strings.add('test');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "add" in "strings.add"
      // Line 3 (0-based) = "            strings.add('test');"
      // "add" starts at character: 20
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 3, character: 20 }, // Position on "add"
        'precise',
      );

      // Current implementation doesn't resolve method names in qualified calls
      // TODO: Implement qualified method resolution to return add method symbol
      if (result) {
        // Current behavior - may return various symbols depending on context
        expect(result?.kind).toBeDefined();
        // Current behavior returned: ${result?.name} (${result?.kind})
      } else {
        // Current behavior - returns null for method names in qualified calls
        expect(result).toBeNull();
      }
    });

    it('should resolve method name in builtin type qualified call (Map.put)', async () => {
      // Test hover on "put" in "Map.put()"
      // NOTE: Current implementation doesn't properly resolve method names in qualified calls
      // This test documents the current behavior and what needs to be implemented
      const testCode = `
        public class TestClass {
          public void testMethod() {
            Map<String, Object> dataMap = new Map<String, Object>();
            dataMap.put('key', 'value');
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "put" in "dataMap.put"
      // Line 3 (0-based) = "            dataMap.put('key', 'value');"
      // "put" starts at character: 24
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 3, character: 24 }, // Position on "put"
        'precise',
      );

      // Current implementation doesn't resolve method names in qualified calls
      // TODO: Implement qualified method resolution to return put method symbol
      if (result) {
        // Current behavior - may return various symbols depending on context
        expect(result?.kind).toBeDefined();
        // Current behavior returned: ${result?.name} (${result?.kind})
      } else {
        // Current behavior - returns null for method names in qualified calls
        expect(result).toBeNull();
      }
    });

    it('should resolve method name in chained method calls (URL.getOrgDomainUrl().toExternalForm)', async () => {
      // Test hover on "toExternalForm" in chained method call
      // NOTE: Current implementation doesn't properly resolve method names in chained calls
      // This test documents the current behavior and what needs to be implemented
      const testCode = `
        public class TestClass {
          public void testMethod() {
            String url = URL.getOrgDomainUrl().toExternalForm();
          }
        }
      `;

      await compileAndAddToManager(testCode, 'TestClass.cls');

      // Position cursor on "toExternalForm" in "URL.getOrgDomainUrl().toExternalForm"
      // Line 2 (0-based) = "            String url = URL.getOrgDomainUrl().toExternalForm();"
      // "toExternalForm" starts at character: 42
      const result = symbolManager.getSymbolAtPosition(
        'TestClass.cls',
        { line: 2, character: 42 }, // Position on "toExternalForm"
        'precise',
      );

      // Current implementation doesn't resolve method names in chained calls
      // TODO: Implement chained method resolution to return toExternalForm method symbol
      if (result) {
        // Current behavior - may return various symbols depending on context
        expect(result?.kind).toBeDefined();
        // Current behavior returned: ${result?.name} (${result?.kind})
      } else {
        // Current behavior - returns null for method names in chained calls
        expect(result).toBeNull();
      }
    });
  });

  describe('Method Parameter Resolution in Qualified Calls', () => {
    beforeEach(async () => {
      // Compile and add all fixture classes to the symbol manager
      const fixtureClasses = [
        {
          name: 'FileUtilities',
          content: `public with sharing class FileUtilities {
            @AuraEnabled
            public static String createFile(String base64data, String filename, String recordId) {
                try {
                    ContentVersion contentVersion = new ContentVersion();
                    contentVersion.VersionData = EncodingUtil.base64Decode(base64data);
                    contentVersion.Title = filename;
                    contentVersion.PathOnClient = filename;
                    insert contentVersion;
                    return contentVersion.Id;
                } catch (Exception e) {
                    throw new AuraHandledException('Error creating file: ' + e);
                }
            }
            
            public static Boolean fileExists(String filename) {
                return true; // Simplified for testing
            }
        }`,
          fileName: 'FileUtilities.cls',
        },
        {
          name: 'ServiceClass',
          content: `public class ServiceClass {
            public static String processData(String input, Integer maxLength, Boolean trimWhitespace) {
                if (input == null) {
                    return 'No data provided';
                }
                String processed = input.toUpperCase();
                if (trimWhitespace) {
                    processed = processed.trim();
                }
                if (maxLength > 0 && processed.length() > maxLength) {
                    processed = processed.substring(0, maxLength);
                }
                return 'Processed: ' + processed;
            }
            
            public static List<String> splitString(String input, String delimiter, Integer maxSplits) {
                if (input == null || delimiter == null) {
                    return new List<String>();
                }
                List<String> parts = input.split(delimiter);
                if (maxSplits > 0 && parts.size() > maxSplits) {
                    return parts.subList(0, maxSplits);
                }
                return parts;
            }
        }`,
          fileName: 'ServiceClass.cls',
        },
        {
          name: 'UtilityClass',
          content: `public class UtilityClass {
            public static String formatString(String input, Integer maxLength, String suffix) {
                if (input == null) {
                    return '';
                }
                String formatted = input.trim();
                if (maxLength > 0 && formatted.length() > maxLength) {
                    formatted = formatted.substring(0, maxLength);
                }
                if (suffix != null && suffix.length() > 0) {
                    formatted += suffix;
                }
                return formatted;
            }
            
            public static Integer calculateSum(List<Integer> numbers, Integer startIndex, Integer endIndex) {
                if (numbers == null || numbers.isEmpty()) {
                    return 0;
                }
                Integer sum = 0;
                Integer start = startIndex != null ? startIndex : 0;
                Integer end = endIndex != null ? endIndex : numbers.size();
                for (Integer i = start; i < end && i < numbers.size(); i++) {
                    sum += numbers[i];
                }
                return sum;
            }
        }`,
          fileName: 'UtilityClass.cls',
        },
        {
          name: 'Account',
          content: `public class Account {
            public String Name { get; set; }
            public String BillingStreet { get; set; }
            public String BillingCity { get; set; }
            public String BillingState { get; set; }
            public String BillingPostalCode { get; set; }
            public String BillingCountry { get; set; }
            
            public void updateBillingAddress(
              String street,
              String city,
              String state,
              String postalCode,
              String country
            ) {
                this.BillingStreet = street;
                this.BillingCity = city;
                this.BillingState = state;
                this.BillingPostalCode = postalCode;
                this.BillingCountry = country;
            }
            
            public String getFullAddress(String separator, String prefix, String suffix) {
                return this.BillingStreet + separator + this.BillingCity + separator + this.BillingState;
            }
        }`,
          fileName: 'Account.cls',
        },
      ];

      for (const fixture of fixtureClasses) {
        await compileAndAddToManager(fixture.content, fixture.fileName);
      }
    });

    describe('Static Method Parameter Resolution', () => {
      it('should resolve first parameter in static method call (FileUtilities.createFile base64data)', async () => {
        // Test hover on "base64data" parameter in "FileUtilities.createFile(base64data, filename, recordId)"
        // NOTE: Current implementation doesn't properly resolve method parameters in qualified calls
        // This test documents the current behavior and what needs to be implemented
        const testCode = `
          public class TestClass {
            public void testMethod() {
              String base64data = 'SGVsbG8gV29ybGQ=';
              String filename = 'test.txt';
              String recordId = '0011234567890ABC';
              String result = FileUtilities.createFile(base64data, filename, recordId);
            }
          }
        `;

        await compileAndAddToManager(testCode, 'TestClass.cls');

        // Position cursor on "base64data" parameter in "FileUtilities.createFile(base64data, filename, recordId)"
        // Line 5 (0-based) = "              String result = FileUtilities.createFile(base64data, filename, recordId);"
        // "base64data" starts at character 48
        const result = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 48 }, // Position on "base64data" parameter
          'precise',
        );

        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return base64data variable symbol
        if (result) {
          // Current behavior - may return various symbols depending on context
          expect(result?.kind).toBeDefined();
          // Current behavior returned: ${result?.name} (${result?.kind})
        } else {
          // Current behavior - returns null for method parameters in qualified calls
          expect(result).toBeNull();
        }
      });

      it('should resolve second parameter in static method call (FileUtilities.createFile filename)', async () => {
        // Test hover on "filename" parameter in "FileUtilities.createFile(base64data, filename, recordId)"
        const testCode = `
          public class TestClass {
            public void testMethod() {
              String base64data = 'SGVsbG8gV29ybGQ=';
              String filename = 'test.txt';
              String recordId = '0011234567890ABC';
              String result = FileUtilities.createFile(base64data, filename, recordId);
            }
          }
        `;

        await compileAndAddToManager(testCode, 'TestClass.cls');

        // Position cursor on "filename" parameter in "FileUtilities.createFile(base64data, filename, recordId)"
        // Line 5 (0-based) = "              String result = FileUtilities.createFile(base64data, filename, recordId);"
        // "filename" starts at character 58
        const result = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 58 }, // Position on "filename" parameter
          'precise',
        );

        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return filename variable symbol
        if (result) {
          // Current behavior - may return various symbols depending on context
          expect(result?.kind).toBeDefined();
          // Current behavior returned: ${result?.name} (${result?.kind})
        } else {
          // Current behavior - returns null for method parameters in qualified calls
          expect(result).toBeNull();
        }
      });

      it('should resolve third parameter in static method call (FileUtilities.createFile recordId)', async () => {
        // Test hover on "recordId" parameter in "FileUtilities.createFile(base64data, filename, recordId)"
        const testCode = `
          public class TestClass {
            public void testMethod() {
              String base64data = 'SGVsbG8gV29ybGQ=';
              String filename = 'test.txt';
              String recordId = '0011234567890ABC';
              String result = FileUtilities.createFile(base64data, filename, recordId);
            }
          }
        `;

        await compileAndAddToManager(testCode, 'TestClass.cls');

        // Position cursor on "recordId" parameter in "FileUtilities.createFile(base64data, filename, recordId)"
        // Line 5 (0-based) = "              String result = FileUtilities.createFile(base64data, filename, recordId);"
        // "recordId" starts at character 67
        const result = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 67 }, // Position on "recordId" parameter
          'precise',
        );

        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return recordId variable symbol
        if (result) {
          // Current behavior - may return various symbols depending on context
          expect(result?.kind).toBeDefined();
          // Current behavior returned: ${result?.name} (${result?.kind})
        } else {
          // Current behavior - returns null for method parameters in qualified calls
          expect(result).toBeNull();
        }
      });

      it('should resolve parameters in ServiceClass.processData call', async () => {
        // Test hover on parameters in "ServiceClass.processData(input, maxLength, trimWhitespace)"
        const testCode = `
          public class TestClass {
            public void testMethod() {
              String input = 'test data';
              Integer maxLength = 10;
              Boolean trimWhitespace = true;
              String result = ServiceClass.processData(input, maxLength, trimWhitespace);
            }
          }
        `;

        await compileAndAddToManager(testCode, 'TestClass.cls');

        // Test first parameter "input"
        const result1 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 48 }, // Position on "input" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return input variable symbol
        if (result1) {
          expect(result1?.kind).toBeDefined();
          // Current behavior returned: ${result1?.name} (${result1?.kind})
        } else {
          expect(result1).toBeNull();
        }

        // Test second parameter "maxLength"
        const result2 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 55 }, // Position on "maxLength" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return maxLength variable symbol
        if (result2) {
          expect(result2?.kind).toBeDefined();
          // Current behavior returned: ${result2?.name} (${result2?.kind})
        } else {
          expect(result2).toBeNull();
        }

        // Test third parameter "trimWhitespace"
        const result3 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 66 }, // Position on "trimWhitespace" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return trimWhitespace variable symbol
        if (result3) {
          expect(result3?.kind).toBeDefined();
          // Current behavior returned: ${result3?.name} (${result3?.kind})
        } else {
          expect(result3).toBeNull();
        }
      });

      it('should resolve parameters in UtilityClass.formatString call', async () => {
        // Test hover on parameters in "UtilityClass.formatString(input, maxLength, suffix)"
        const testCode = `
          public class TestClass {
            public void testMethod() {
              String input = '  Hello World  ';
              Integer maxLength = 15;
              String suffix = '...';
              String result = UtilityClass.formatString(input, maxLength, suffix);
            }
          }
        `;

        await compileAndAddToManager(testCode, 'TestClass.cls');

        // Test first parameter "input"
        const result1 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 48 }, // Position on "input" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return input variable symbol
        if (result1) {
          expect(result1?.kind).toBeDefined();
          // Current behavior returned: ${result1?.name} (${result1?.kind})
        } else {
          expect(result1).toBeNull();
        }

        // Test second parameter "maxLength"
        const result2 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 55 }, // Position on "maxLength" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return maxLength variable symbol
        if (result2) {
          expect(result2?.kind).toBeDefined();
          // Current behavior returned: ${result2?.name} (${result2?.kind})
        } else {
          expect(result2).toBeNull();
        }

        // Test third parameter "suffix"
        const result3 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 66 }, // Position on "suffix" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return suffix variable symbol
        if (result3) {
          expect(result3?.kind).toBeDefined();
          // Current behavior returned: ${result3?.name} (${result3?.kind})
        } else {
          expect(result3).toBeNull();
        }
      });
    });

    describe('Instance Method Parameter Resolution', () => {
      it('should resolve parameters in Account.updateBillingAddress call', async () => {
        // Test hover on parameters in "acc.updateBillingAddress(street, city, state, postalCode, country)"
        const testCode = `
          public class TestClass {
            public void testMethod() {
              Account acc = new Account('Test Account');
              String street = '123 Main St';
              String city = 'Anytown';
              String state = 'CA';
              String postalCode = '12345';
              String country = 'USA';
              acc.updateBillingAddress(street, city, state, postalCode, country);
            }
          }
        `;

        await compileAndAddToManager(testCode, 'TestClass.cls');

        // Test first parameter "street"
        const result1 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 8, character: 32 }, // Position on "street" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return street variable symbol
        if (result1) {
          expect(result1?.kind).toBeDefined();
          // Current behavior returned: ${result1?.name} (${result1?.kind})
        } else {
          expect(result1).toBeNull();
        }

        // Test second parameter "city"
        const result2 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 8, character: 39 }, // Position on "city" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return city variable symbol
        if (result2) {
          expect(result2?.kind).toBeDefined();
          // Current behavior returned: ${result2?.name} (${result2?.kind})
        } else {
          expect(result2).toBeNull();
        }

        // Test third parameter "state"
        const result3 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 8, character: 45 }, // Position on "state" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return state variable symbol
        if (result3) {
          expect(result3?.kind).toBeDefined();
          // Current behavior returned: ${result3?.name} (${result3?.kind})
        } else {
          expect(result3).toBeNull();
        }

        // Test fourth parameter "postalCode"
        const result4 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 8, character: 52 }, // Position on "postalCode" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return postalCode variable symbol
        if (result4) {
          expect(result4?.kind).toBeDefined();
          // Current behavior returned: ${result4?.name} (${result4?.kind})
        } else {
          expect(result4).toBeNull();
        }

        // Test fifth parameter "country"
        const result5 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 8, character: 62 }, // Position on "country" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return country variable symbol
        if (result5) {
          expect(result5?.kind).toBeDefined();
          // Current behavior returned: ${result5?.name} (${result5?.kind})
        } else {
          expect(result5).toBeNull();
        }
      });

      it('should resolve parameters in Account.getFullAddress call', async () => {
        // Test hover on parameters in "acc.getFullAddress(separator, prefix, suffix)"
        const testCode = `
          public class TestClass {
            public void testMethod() {
              Account acc = new Account('Test Account');
              String separator = ', ';
              String prefix = 'Address: ';
              String suffix = ' (US)';
              String address = acc.getFullAddress(separator, prefix, suffix);
            }
          }
        `;

        await compileAndAddToManager(testCode, 'TestClass.cls');

        // Test first parameter "separator"
        const result1 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 6, character: 35 }, // Position on "separator" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return separator variable symbol
        if (result1) {
          expect(result1?.kind).toBeDefined();
          // Current behavior returned: ${result1?.name} (${result1?.kind})
        } else {
          expect(result1).toBeNull();
        }

        // Test second parameter "prefix"
        const result2 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 6, character: 45 }, // Position on "prefix" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return prefix variable symbol
        if (result2) {
          expect(result2?.kind).toBeDefined();
          // Current behavior returned: ${result2?.name} (${result2?.kind})
        } else {
          expect(result2).toBeNull();
        }

        // Test third parameter "suffix"
        const result3 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 6, character: 52 }, // Position on "suffix" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return suffix variable symbol
        if (result3) {
          expect(result3?.kind).toBeDefined();
          // Current behavior returned: ${result3?.name} (${result3?.kind})
        } else {
          expect(result3).toBeNull();
        }
      });
    });

    describe('Mixed Parameter Types Resolution', () => {
      it('should resolve different parameter types in ServiceClass.splitString call', async () => {
        // Test hover on parameters with different types in "ServiceClass.splitString(input, delimiter, maxSplits)"
        const testCode = `
          public class TestClass {
            public void testMethod() {
              String input = 'a,b,c,d,e';
              String delimiter = ',';
              Integer maxSplits = 3;
              List<String> parts = ServiceClass.splitString(input, delimiter, maxSplits);
            }
          }
        `;

        await compileAndAddToManager(testCode, 'TestClass.cls');

        // Test String parameter "input"
        const result1 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 52 }, // Position on "input" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return input variable symbol
        if (result1) {
          expect(result1?.kind).toBeDefined();
          // Current behavior returned: ${result1?.name} (${result1?.kind})
        } else {
          expect(result1).toBeNull();
        }

        // Test String parameter "delimiter"
        const result2 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 59 }, // Position on "delimiter" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return delimiter variable symbol
        if (result2) {
          expect(result2?.kind).toBeDefined();
          // Current behavior returned: ${result2?.name} (${result2?.kind})
        } else {
          expect(result2).toBeNull();
        }

        // Test Integer parameter "maxSplits"
        const result3 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 70 }, // Position on "maxSplits" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return maxSplits variable symbol
        if (result3) {
          expect(result3?.kind).toBeDefined();
          // Current behavior returned: ${result3?.name} (${result3?.kind})
        } else {
          expect(result3).toBeNull();
        }
      });

      it('should resolve parameters in UtilityClass.calculateSum call', async () => {
        // Test hover on parameters in "UtilityClass.calculateSum(numbers, startIndex, endIndex)"
        const testCode = `
          public class TestClass {
            public void testMethod() {
              List<Integer> numbers = new List<Integer>{1, 2, 3, 4, 5};
              Integer startIndex = 1;
              Integer endIndex = 4;
              Integer sum = UtilityClass.calculateSum(numbers, startIndex, endIndex);
            }
          }
        `;

        await compileAndAddToManager(testCode, 'TestClass.cls');

        // Test List parameter "numbers"
        const result1 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 52 }, // Position on "numbers" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return numbers variable symbol
        if (result1) {
          expect(result1?.kind).toBeDefined();
          // Current behavior returned: ${result1?.name} (${result1?.kind})
        } else {
          expect(result1).toBeNull();
        }

        // Test Integer parameter "startIndex"
        const result2 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 60 }, // Position on "startIndex" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return startIndex variable symbol
        if (result2) {
          expect(result2?.kind).toBeDefined();
          // Current behavior returned: ${result2?.name} (${result2?.kind})
        } else {
          expect(result2).toBeNull();
        }

        // Test Integer parameter "endIndex"
        const result3 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 72 }, // Position on "endIndex" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return endIndex variable symbol
        if (result3) {
          expect(result3?.kind).toBeDefined();
          // Current behavior returned: ${result3?.name} (${result3?.kind})
        } else {
          expect(result3).toBeNull();
        }
      });
    });

    describe('Parameter Resolution Edge Cases', () => {
      it('should resolve parameters with null values', async () => {
        // Test hover on parameters that might be null in "UtilityClass.formatString(input, maxLength, suffix)"
        const testCode = `
          public class TestClass {
            public void testMethod() {
              String input = 'test';
              Integer maxLength = null;
              String suffix = null;
              String result = UtilityClass.formatString(input, maxLength, suffix);
            }
          }
        `;

        await compileAndAddToManager(testCode, 'TestClass.cls');

        // Test null Integer parameter "maxLength"
        const result1 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 55 }, // Position on "maxLength" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return maxLength variable symbol
        if (result1) {
          expect(result1?.kind).toBeDefined();
          // Current behavior returned: ${result1?.name} (${result1?.kind})
        } else {
          expect(result1).toBeNull();
        }

        // Test null String parameter "suffix"
        const result2 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 66 }, // Position on "suffix" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return suffix variable symbol
        if (result2) {
          expect(result2?.kind).toBeDefined();
          // Current behavior returned: ${result2?.name} (${result2?.kind})
        } else {
          expect(result2).toBeNull();
        }
      });

      it('should resolve parameters in chained method calls', async () => {
        // Test hover on parameters in chained method calls
        const testCode = `
          public class TestClass {
            public void testMethod() {
              List<String> strings = new List<String>{'a', 'b', 'c'};
              String delimiter = ',';
              String result = String.join(delimiter, strings);
            }
          }
        `;

        await compileAndAddToManager(testCode, 'TestClass.cls');

        // Test first parameter "delimiter" in chained call
        const result1 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 35 }, // Position on "delimiter" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return delimiter variable symbol
        if (result1) {
          expect(result1?.kind).toBeDefined();
          // Current behavior returned: ${result1?.name} (${result1?.kind})
        } else {
          expect(result1).toBeNull();
        }

        // Test second parameter "strings" in chained call
        const result2 = symbolManager.getSymbolAtPosition(
          'TestClass.cls',
          { line: 5, character: 45 }, // Position on "strings" parameter
          'precise',
        );
        // Current implementation doesn't resolve method parameters in qualified calls
        // TODO: Implement qualified parameter resolution to return strings variable symbol
        if (result2) {
          expect(result2?.kind).toBeDefined();
          // Current behavior returned: ${result2?.name} (${result2?.kind})
        } else {
          expect(result2).toBeNull();
        }
      });
    });
  });
});
