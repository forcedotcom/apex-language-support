/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexSymbolGraph,
  ReferenceType,
} from '../../src/symbols/ApexSymbolGraph';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolKind } from '../../src/types/symbol';

describe.skip('Symbol Management - Integration Tests', () => {
  let symbolGraph: ApexSymbolGraph;
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolGraph = new ApexSymbolGraph();
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  describe('Full Pipeline Integration', () => {
    it('should process real Apex code and build complete symbol graph', async () => {
      // Real Apex code with classes, methods, and references
      const apexCode = `
        public class AccountService {
          private static final String DEFAULT_STATUS = 'Active';
          
          public Account createAccount(String name, String type) {
            Account acc = new Account();
            acc.Name = name;
            acc.Type = type;
            acc.Status__c = DEFAULT_STATUS;
            
            insert acc;
            return acc;
          }
          
          public List<Account> findAccountsByType(String type) {
            return [SELECT Id, Name, Type FROM Account WHERE Type = :type];
          }
          
          public void updateAccountStatus(Account acc, String status) {
            acc.Status__c = status;
            update acc;
          }
        }
        
        public class ContactService {
          public Contact createContact(String firstName, String lastName, Account acc) {
            Contact con = new Contact();
            con.FirstName = firstName;
            con.LastName = lastName;
            con.AccountId = acc.Id;
            
            insert con;
            return con;
          }
        }
      `;

      // Process the code through the full pipeline
      // Use ApexSymbolCollectorListener with 'full' detail level
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = await compilerService.compile(
        apexCode,
        'AccountService.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      expect(result.errors).toHaveLength(0);

      // Get the built symbol table
      const symbolTable = listener.getResult();
      expect(symbolTable).toBeDefined();

      // Add symbols to the graph
      const symbols = symbolTable.getAllSymbols();
      expect(symbols.length).toBeGreaterThan(0);

      // Add all symbols to the graph
      for (const symbol of symbols) {
        symbolGraph.addSymbol(symbol, 'AccountService.cls', symbolTable);
      }

      // Verify symbols are accessible
      const accountService = symbolGraph.findSymbolByName('AccountService');
      expect(accountService).toHaveLength(1);
      expect(accountService[0].kind).toBe(SymbolKind.Class);

      const contactService = symbolGraph.findSymbolByName('ContactService');
      expect(contactService).toHaveLength(1);
      expect(contactService[0].kind).toBe(SymbolKind.Class);

      // Verify method symbols
      const createAccountMethod = symbolGraph.findSymbolByName('createAccount');
      expect(createAccountMethod.length).toBeGreaterThan(0);

      // Verify scope-based resolution using context
      const lookupResult = symbolGraph.lookupSymbolWithContext(
        'createAccount',
        {
          fileUri: 'AccountService.cls',
          currentScope: 'AccountService',
        },
      );
      expect(lookupResult).toBeDefined();
      expect(lookupResult?.symbol.name).toBe('createAccount');
    });

    it('should handle cross-file symbol references and dependencies', async () => {
      // First file: AccountService
      const accountServiceCode = `
        public class AccountService {
          public Account createAccount(String name) {
            Account acc = new Account();
            acc.Name = name;
            insert acc;
            return acc;
          }
        }
      `;

      // Second file: ContactService that references AccountService
      const contactServiceCode = `
        public class ContactService {
          private AccountService accountService;
          
          public ContactService() {
            this.accountService = new AccountService();
          }
          
          public Contact createContact(String firstName, String lastName) {
            Account acc = accountService.createAccount(firstName + ' ' + lastName);
            Contact con = new Contact();
            con.FirstName = firstName;
            con.LastName = lastName;
            con.AccountId = acc.Id;
            insert con;
            return con;
          }
        }
      `;

      // Process both files
      const accountListener = new ApexSymbolCollectorListener();
      const contactListener = new ApexSymbolCollectorListener();

      const accountResult = await compilerService.compile(
        accountServiceCode,
        'AccountService.cls',
        accountListener,
      );
      const contactResult = await compilerService.compile(
        contactServiceCode,
        'ContactService.cls',
        contactListener,
      );

      expect(accountResult.result).toBeDefined();
      expect(contactResult.result).toBeDefined();

      // Get symbol tables
      const accountSymbolTable = accountListener.getResult();
      const contactSymbolTable = contactListener.getResult();

      // Add symbols to graph
      const accountSymbols = accountSymbolTable.getAllSymbols();
      const contactSymbols = contactSymbolTable.getAllSymbols();

      for (const symbol of accountSymbols) {
        symbolGraph.addSymbol(symbol, 'AccountService.cls', accountSymbolTable);
      }

      for (const symbol of contactSymbols) {
        symbolGraph.addSymbol(symbol, 'ContactService.cls', contactSymbolTable);
      }

      // Add cross-file references
      const contactServiceSymbol = contactSymbolTable.lookup('ContactService');
      const accountServiceSymbol = accountSymbolTable.lookup('AccountService');

      if (contactServiceSymbol && accountServiceSymbol) {
        symbolGraph.addReference(
          contactServiceSymbol,
          accountServiceSymbol,
          ReferenceType.TYPE_REFERENCE,
          {
            symbolRange: {
              startLine: 3,
              startColumn: 1,
              endLine: 3,
              endColumn: 20,
            },
            identifierRange: {
              startLine: 3,
              startColumn: 1,
              endLine: 3,
              endColumn: 20,
            },
          },
        );
      }

      // Verify cross-file symbol resolution
      const accountServiceFromContact = symbolGraph.lookupSymbolWithContext(
        'AccountService',
        {
          fileUri: 'ContactService.cls',
          currentScope: 'ContactService',
        },
      );

      expect(accountServiceFromContact).toBeDefined();
      expect(accountServiceFromContact?.symbol.name).toBe('AccountService');
      expect(accountServiceFromContact?.symbol.fileUri).toBe(
        'AccountService.cls',
      );

      // Verify dependency analysis
      const contactService = contactSymbolTable.lookup('ContactService');
      if (contactService) {
        const analysis = symbolGraph.analyzeDependencies(contactService);
        expect(analysis.dependencies.length).toBeGreaterThan(0);
        expect(
          analysis.dependencies.some((dep) => dep.name === 'AccountService'),
        ).toBe(true);
      }
    });

    it('should handle complex scope hierarchies and nested symbols', async () => {
      const complexCode = `
        public class ComplexService {
          private static final String DEFAULT_VALUE = 'default';
          
          public class InnerClass {
            private String innerField;
            
            public InnerClass(String value) {
              this.innerField = value;
            }
            
            public String getInnerField() {
              return this.innerField;
            }
          }
          
          public void processData(String data) {
            InnerClass inner = new InnerClass(data);
            String result = inner.getInnerField();
            System.debug(result);
          }
          
          public class NestedClass {
            public void nestedMethod() {
              String localVar = DEFAULT_VALUE;
              System.debug(localVar);
            }
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = await compilerService.compile(
        complexCode,
        'ComplexService.cls',
        listener,
      );

      expect(result.result).toBeDefined();

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Add to graph
      for (const symbol of symbols) {
        symbolGraph.addSymbol(symbol, 'ComplexService.cls', symbolTable);
      }

      // Test scope-based resolution with context
      const innerClassLookup = symbolGraph.lookupSymbolWithContext(
        'InnerClass',
        {
          fileUri: 'ComplexService.cls',
          currentScope: 'ComplexService',
        },
      );
      expect(innerClassLookup).toBeDefined();

      const nestedClassLookup = symbolGraph.lookupSymbolWithContext(
        'NestedClass',
        {
          fileUri: 'ComplexService.cls',
          currentScope: 'ComplexService',
        },
      );
      expect(nestedClassLookup).toBeDefined();

      // Test method resolution within scope
      const getInnerFieldLookup = symbolGraph.lookupSymbolWithContext(
        'getInnerField',
        {
          fileUri: 'ComplexService.cls',
          currentScope: 'InnerClass',
        },
      );
      expect(getInnerFieldLookup).toBeDefined();
    });
  });

  describe('Symbol Manager Integration', () => {
    it('should integrate symbol manager with optimized graph', async () => {
      const apexCode = `
        public class TestService {
          public String processData(String input) {
            return input.toUpperCase();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexCode,
        'TestService.cls',
        listener,
      );

      expect(result.result).toBeDefined();

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Add symbols through symbol manager
      for (const symbol of symbols) {
        symbolManager.addSymbol(symbol, 'TestService.cls');
      }

      // Test symbol manager methods
      const testServiceSymbols = symbolManager.findSymbolByName('TestService');
      expect(testServiceSymbols).toHaveLength(1);
      expect(testServiceSymbols[0].kind).toBe(SymbolKind.Class);

      const processDataSymbols = symbolManager.findSymbolByName('processData');
      expect(processDataSymbols.length).toBeGreaterThan(0);

      // Test file-based lookup
      const fileSymbols = symbolManager.findSymbolsInFile('TestService.cls');
      expect(fileSymbols.length).toBeGreaterThan(0);

      // Test stats
      const stats = symbolManager.getStats();
      expect(stats.totalSymbols).toBeGreaterThan(0);
    });

    it('should handle multiple files and cross-file references', async () => {
      const file1Code = `
        public class ServiceA {
          public String methodA() {
            return 'A';
          }
        }
      `;

      const file2Code = `
        public class ServiceB {
          public String methodB() {
            ServiceA serviceA = new ServiceA();
            return serviceA.methodA() + 'B';
          }
        }
      `;

      // Process both files
      const listener1 = new ApexSymbolCollectorListener();
      const listener2 = new ApexSymbolCollectorListener();

      const result1 = await compilerService.compile(
        file1Code,
        'ServiceA.cls',
        listener1,
      );
      const result2 = await compilerService.compile(
        file2Code,
        'ServiceB.cls',
        listener2,
      );

      expect(result1.result).toBeDefined();
      expect(result2.result).toBeDefined();

      // Add symbols to manager
      const symbols1 = listener1.getResult().getAllSymbols();
      const symbols2 = listener2.getResult().getAllSymbols();

      for (const symbol of symbols1) {
        symbolManager.addSymbol(symbol, 'ServiceA.cls');
      }

      for (const symbol of symbols2) {
        symbolManager.addSymbol(symbol, 'ServiceB.cls');
      }

      // Test cross-file symbol resolution
      const serviceASymbols = symbolManager.findSymbolByName('ServiceA');
      expect(serviceASymbols).toHaveLength(1);

      const serviceBSymbols = symbolManager.findSymbolByName('ServiceB');
      expect(serviceBSymbols).toHaveLength(1);

      // Test file-based lookups
      const serviceASymbolsInFile =
        symbolManager.findSymbolsInFile('ServiceA.cls');
      const serviceBSymbolsInFile =
        symbolManager.findSymbolsInFile('ServiceB.cls');

      expect(serviceASymbolsInFile.length).toBeGreaterThan(0);
      expect(serviceBSymbolsInFile.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Integration', () => {
    it('should handle large-scale integration efficiently', async () => {
      // Generate large-scale Apex code
      const generateLargeCode = (numClasses: number) => {
        let code = '';
        for (let i = 0; i < numClasses; i++) {
          code += `
            public class LargeClass${i} {
              private String field${i};
              
              public LargeClass${i}() {
                this.field${i} = 'value${i}';
              }
              
              public String getField${i}() {
                return this.field${i};
              }
              
              public void setField${i}(String value) {
                this.field${i} = value;
              }
            }
          `;
        }
        return code;
      };

      const largeCode = generateLargeCode(50); // 50 classes
      const listener = new ApexSymbolCollectorListener();

      const startTime = Date.now();
      const result = await compilerService.compile(
        largeCode,
        'LargeClasses.cls',
        listener,
      );
      const compileTime = Date.now() - startTime;

      expect(result.result).toBeDefined();
      expect(compileTime).toBeLessThan(5000); // Should compile within 5 seconds

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Add to graph
      const graphStartTime = Date.now();
      for (const symbol of symbols) {
        symbolGraph.addSymbol(symbol, 'LargeClasses.cls', symbolTable);
      }
      const graphTime = Date.now() - graphStartTime;

      expect(graphTime).toBeLessThan(1000); // Should add to graph within 1 second

      // Test symbol lookups
      const lookupStartTime = Date.now();
      for (let i = 0; i < 10; i++) {
        const found = symbolGraph.findSymbolByName(`LargeClass${i}`);
        expect(found.length).toBeGreaterThan(0);
      }
      const lookupTime = Date.now() - lookupStartTime;

      expect(lookupTime).toBeLessThan(100); // Should lookup within 100ms

      // Verify memory optimization
      const stats = symbolGraph.getStats();
      expect(stats.totalSymbols).toBeGreaterThan(0);
      expect(stats.totalFiles).toBe(1);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle parsing errors gracefully', async () => {
      const invalidCode = `
        public class InvalidClass {
          public String method() {
            // Missing closing brace
            return "test";
          // Missing closing brace for class
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = await compilerService.compile(
        invalidCode,
        'InvalidClass.cls',
        listener,
      );

      // Should handle errors gracefully
      expect(result.result).toBeUndefined();
      expect(result.errors.length).toBeGreaterThan(0);

      // Symbol table should still be available with partial symbols
      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Should still be able to add valid symbols to graph
      for (const symbol of symbols) {
        symbolGraph.addSymbol(symbol, 'InvalidClass.cls', symbolTable);
      }

      // Graph should still function with partial data
      const stats = symbolGraph.getStats();
      expect(stats.totalSymbols).toBeGreaterThanOrEqual(0);
    });

    it('should handle duplicate symbol additions gracefully', async () => {
      const code = `
        public class TestClass {
          public String method() {
            return "test";
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = await compilerService.compile(
        code,
        'TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Add symbols multiple times
      for (const symbol of symbols) {
        symbolGraph.addSymbol(symbol, 'TestClass.cls', symbolTable);
        symbolGraph.addSymbol(symbol, 'TestClass.cls', symbolTable); // Duplicate
      }

      // Should handle duplicates gracefully
      const testClassSymbols = symbolGraph.findSymbolByName('TestClass');
      expect(testClassSymbols).toHaveLength(1); // Should not have duplicates
    });
  });
});
