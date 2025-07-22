/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CrossFileSymbolManager } from '../../src/utils/CrossFileSymbolManager';
import { GlobalSymbolRegistry } from '../../src/utils/GlobalSymbolRegistry';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { ResourceLoader } from '../../src/utils/resourceLoader';
import { SymbolTable } from '../../src/types/symbol';

describe('Cross-File Symbol Management Integration', () => {
  let symbolManager: CrossFileSymbolManager;
  let globalRegistry: GlobalSymbolRegistry;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new CrossFileSymbolManager();
    globalRegistry = new GlobalSymbolRegistry();
    compilerService = new CompilerService();

    // Clear the registry to ensure clean state between tests
    globalRegistry.clear();

    // Clear the ResourceLoader singleton to ensure clean state
    // This is needed because ResourceLoader is a singleton and previous tests may have initialized it
    (ResourceLoader as any).instance = undefined;
  });

  describe('Real Apex Code Compilation', () => {
    it('should compile and register symbols from multiple Apex files', async () => {
      const apexFiles = [
        {
          content: `
            public class TestClass1 {
              public String field1;
              
              public void method1() {
                System.debug('Hello from TestClass1');
              }
            }
          `,
          fileName: 'TestClass1.cls',
        },
        {
          content: `
            public class TestClass2 {
              public Integer field2;
              
              public void method2() {
                List<String> items = new List<String>();
                items.add('test');
              }
            }
          `,
          fileName: 'TestClass2.cls',
        },
        {
          content: `
            public interface TestInterface {
              void interfaceMethod();
            }
          `,
          fileName: 'TestInterface.cls',
        },
      ];

      // Compile each file
      for (const file of apexFiles) {
        const listener = new ApexSymbolCollectorListener();
        const result = compilerService.compile(
          file.content,
          file.fileName,
          listener,
        );

        if (result.result) {
          globalRegistry.registerSymbolTable(result.result, file.fileName);
        }
      }

      // Test symbol registration
      const testClass1Symbol = globalRegistry.lookupSymbol('TestClass1');
      const testClass2Symbol = globalRegistry.lookupSymbol('TestClass2');
      const testInterfaceSymbol = globalRegistry.lookupSymbol('TestInterface');

      expect(testClass1Symbol).toBeDefined();
      expect(testClass1Symbol?.symbol.kind).toBe('class');
      expect(testClass1Symbol?.filePath).toBe('TestClass1.cls');

      expect(testClass2Symbol).toBeDefined();
      expect(testClass2Symbol?.symbol.kind).toBe('class');
      expect(testClass2Symbol?.filePath).toBe('TestClass2.cls');

      expect(testInterfaceSymbol).toBeDefined();
      expect(testInterfaceSymbol?.symbol.kind).toBe('interface');
      expect(testInterfaceSymbol?.filePath).toBe('TestInterface.cls');
    });

    it('should handle method and field symbols', async () => {
      const apexCode = `
        public class TestClass {
          public String publicField;
          private Integer privateField;
          
          public void publicMethod() {
            System.debug('public method');
          }
          
          private void privateMethod() {
            List<String> items = new List<String>();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      if (result.result) {
        globalRegistry.registerSymbolTable(result.result, 'TestClass.cls');
      }

      // Test field symbols
      const publicFieldSymbol = globalRegistry.lookupSymbol('publicField');
      const privateFieldSymbol = globalRegistry.lookupSymbol('privateField');

      expect(publicFieldSymbol).toBeDefined();
      expect(publicFieldSymbol?.symbol.kind).toBe('field');
      expect(publicFieldSymbol?.symbol.modifiers.visibility).toBe('public');

      expect(privateFieldSymbol).toBeDefined();
      expect(privateFieldSymbol?.symbol.kind).toBe('field');
      expect(privateFieldSymbol?.symbol.modifiers.visibility).toBe('private');

      // Test method symbols
      const publicMethodSymbol = globalRegistry.lookupSymbol('publicMethod');
      const privateMethodSymbol = globalRegistry.lookupSymbol('privateMethod');

      expect(publicMethodSymbol).toBeDefined();
      expect(publicMethodSymbol?.symbol.kind).toBe('method');
      expect(publicMethodSymbol?.symbol.modifiers.visibility).toBe('public');

      expect(privateMethodSymbol).toBeDefined();
      expect(privateMethodSymbol?.symbol.kind).toBe('method');
      expect(privateMethodSymbol?.symbol.modifiers.visibility).toBe('private');
    });

    it('should handle nested classes and scopes', async () => {
      const apexCode = `
        public class OuterClass {
          public class InnerClass {
            public void innerMethod() {
              System.debug('inner method');
            }
          }
          
          public void outerMethod() {
            InnerClass inner = new InnerClass();
            inner.innerMethod();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexCode,
        'OuterClass.cls',
        listener,
      );

      if (result.result) {
        globalRegistry.registerSymbolTable(result.result, 'OuterClass.cls');
      }

      // Test outer class
      const outerClassSymbol = globalRegistry.lookupSymbol('OuterClass');
      expect(outerClassSymbol).toBeDefined();
      expect(outerClassSymbol?.symbol.kind).toBe('class');

      // Test inner class
      const innerClassSymbol = globalRegistry.lookupSymbol('InnerClass');
      expect(innerClassSymbol).toBeDefined();
      expect(innerClassSymbol?.symbol.kind).toBe('class');

      // Test methods
      const outerMethodSymbol = globalRegistry.lookupSymbol('outerMethod');
      const innerMethodSymbol = globalRegistry.lookupSymbol('innerMethod');

      expect(outerMethodSymbol).toBeDefined();
      expect(innerMethodSymbol).toBeDefined();
    });

    it('should handle ambiguous symbols correctly', async () => {
      // Initialize ResourceLoader to get access to standard Apex classes
      const resourceLoader = ResourceLoader.getInstance({ loadMode: 'full' });
      await resourceLoader.initialize();
      await resourceLoader.waitForCompilation();

      // Get compiled artifacts from the standard library
      const standardArtifacts = resourceLoader.getAllCompiledArtifacts();

      // Prepare symbol tables for CrossFileSymbolManager (as LSP services would do)
      const symbolTables = new Map<string, SymbolTable>();
      for (const [path, artifact] of standardArtifacts.entries()) {
        if (artifact?.compilationResult?.result) {
          symbolTables.set(path, artifact.compilationResult.result);
        }
      }

      // Create a user-defined class that conflicts with a standard library class
      const userSystemClass = `
        public class System {
          public static void customDebug(String message) {
            // Custom implementation that conflicts with standard System class
          }
        }
      `;

      // Compile the user-defined System class
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        userSystemClass,
        'CustomSystem.cls',
        listener,
      );

      if (result.result) {
        symbolTables.set('CustomSystem.cls', result.result);
      }

      // Initialize CrossFileSymbolManager with the symbol tables (as LSP services would do)
      await symbolManager.initialize(symbolTables);

      // Now we should have ambiguity between the standard System class and user System class
      const systemSymbol = symbolManager.lookupSymbol('System');
      expect(systemSymbol).toBeDefined();
      expect(systemSymbol?.isAmbiguous).toBe(true);
      expect(systemSymbol?.candidates).toBeDefined();
      expect(systemSymbol?.candidates!.length).toBeGreaterThanOrEqual(2); // At least standard + user System

      const allSystemSymbols = symbolManager.getSymbolsByName('System');
      expect(allSystemSymbols.length).toBeGreaterThanOrEqual(2);

      // Verify we have both the standard System and user System
      const systemFilePaths = allSystemSymbols.map((entry) => entry.filePath);
      expect(systemFilePaths).toContain('CustomSystem.cls');

      // Should also contain standard library System class (in system.system.cls)
      const hasStandardSystem = systemFilePaths.some(
        (path) => path === 'system.system.cls',
      );
      expect(hasStandardSystem).toBe(true);
    });

    it('should work with lazy mode ResourceLoader for on-demand compilation', async () => {
      // Initialize ResourceLoader in lazy mode - no compilation happens
      const resourceLoader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      await resourceLoader.initialize();

      // In lazy mode, we have access to raw file data but no compiled artifacts
      const allFiles = resourceLoader.getAllFiles();
      expect(allFiles.size).toBeGreaterThan(0);

      // Get a specific file - this will decode it on demand
      const systemFile = resourceLoader.getFile('system/system.cls');
      expect(systemFile).toBeDefined();
      expect(systemFile).toContain('global class System');

      // In lazy mode, no compiled artifacts are available yet
      const compiledArtifacts = resourceLoader.getAllCompiledArtifacts();
      expect(compiledArtifacts.size).toBe(0);

      // We can manually compile specific files as needed
      const filesToCompile = ['system/system.cls', 'system/database.cls'];

      const symbolTables = new Map<string, SymbolTable>();

      for (const filePath of filesToCompile) {
        const fileContent = resourceLoader.getFile(filePath);
        if (fileContent) {
          const listener = new ApexSymbolCollectorListener();
          const result = compilerService.compile(
            fileContent,
            filePath,
            listener,
          );

          if (result.result) {
            symbolTables.set(filePath, result.result);
          }
        }
      }

      // Create a user-defined class that conflicts with standard System
      const userSystemClass = `
        public class System {
          public static void customDebug(String message) {
            // Custom implementation
          }
        }
      `;

      // Compile the user-defined System class
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        userSystemClass,
        'CustomSystem.cls',
        listener,
      );

      if (result.result) {
        symbolTables.set('CustomSystem.cls', result.result);
      }

      // Initialize CrossFileSymbolManager with manually compiled symbol tables
      await symbolManager.initialize(symbolTables);

      // Now we should have ambiguity between the manually compiled standard System and user System
      const systemSymbol = symbolManager.lookupSymbol('System');
      expect(systemSymbol).toBeDefined();
      expect(systemSymbol?.isAmbiguous).toBe(true);
      expect(systemSymbol?.candidates).toBeDefined();
      expect(systemSymbol?.candidates!.length).toBeGreaterThanOrEqual(2);

      const allSystemSymbols = symbolManager.getSymbolsByName('System');
      expect(allSystemSymbols.length).toBeGreaterThanOrEqual(2);

      // Verify we have both the standard System and user System
      const systemFilePaths = allSystemSymbols.map((entry) => entry.filePath);
      expect(systemFilePaths).toContain('CustomSystem.cls');
      expect(systemFilePaths).toContain('system/system.cls');
    });

    it('should provide correct file mappings', async () => {
      const apexFiles = [
        {
          content: `
            public class ClassA {
              public void methodA() {}
            }
          `,
          fileName: 'ClassA.cls',
        },
        {
          content: `
            public class ClassB {
              public void methodB() {}
            }
          `,
          fileName: 'ClassB.cls',
        },
      ];

      // Compile files
      for (const file of apexFiles) {
        const listener = new ApexSymbolCollectorListener();
        const result = compilerService.compile(
          file.content,
          file.fileName,
          listener,
        );

        if (result.result) {
          globalRegistry.registerSymbolTable(result.result, file.fileName);
        }
      }

      // Test file mappings
      const classAFiles = globalRegistry.getFilesForSymbol('ClassA');
      expect(classAFiles).toContain('ClassA.cls');
      expect(classAFiles).toHaveLength(1);

      const classBFiles = globalRegistry.getFilesForSymbol('ClassB');
      expect(classBFiles).toContain('ClassB.cls');
      expect(classBFiles).toHaveLength(1);

      // Test symbols in files
      const symbolsInClassA = globalRegistry.getSymbolsInFile('ClassA.cls');
      expect(symbolsInClassA).toContain('ClassA');
      expect(symbolsInClassA).toContain('methodA');

      const symbolsInClassB = globalRegistry.getSymbolsInFile('ClassB.cls');
      expect(symbolsInClassB).toContain('ClassB');
      expect(symbolsInClassB).toContain('methodB');
    });

    it('should provide accurate statistics', async () => {
      const apexCode = `
        public class TestClass {
          public String field1;
          private Integer field2;
          
          public void method1() {}
          private void method2() {}
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      if (result.result) {
        globalRegistry.registerSymbolTable(result.result, 'TestClass.cls');
      }

      const stats = globalRegistry.getStats();

      expect(stats.totalFiles).toBe(1);
      expect(stats.totalSymbols).toBeGreaterThan(0);
      expect(stats.uniqueSymbolNames).toBeGreaterThan(0);
      expect(stats.ambiguousSymbols).toBe(0); // No ambiguous symbols in this test
    });

    it('should handle symbol removal correctly', async () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {}
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      if (result.result) {
        globalRegistry.registerSymbolTable(result.result, 'TestClass.cls');
      }

      // Verify symbol exists
      const symbolBefore = globalRegistry.lookupSymbol('TestClass');
      expect(symbolBefore).toBeDefined();

      // Remove file
      globalRegistry.removeFile('TestClass.cls');

      // Verify symbol is removed
      const symbolAfter = globalRegistry.lookupSymbol('TestClass');
      expect(symbolAfter).toBeNull();

      // Verify file is removed
      const files = globalRegistry.getAllFiles();
      expect(files).not.toContain('TestClass.cls');
    });
  });

  describe('CrossFileSymbolManager Integration', () => {
    it('should initialize and provide access to symbols', async () => {
      // This test would require mocking the ResourceLoader
      // For now, we'll test the basic functionality
      expect(symbolManager).toBeDefined();

      // Test that initialization is required
      expect(() => symbolManager.getAllSymbols()).toThrow(
        'CrossFileSymbolManager not initialized. Call initialize() first.',
      );
    });
  });
});
