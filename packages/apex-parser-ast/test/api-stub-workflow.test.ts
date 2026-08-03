/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Integration test for API stub generation workflow
 * Tests the end-to-end flow: JSON → .cls → Symbol Table
 */

import { generateApexStubs } from '../scripts/apexStubGenerator.js';
import { CompilerService } from '../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../src/parser/listeners/ApexSymbolCollectorListener';

describe('API Stub Workflow Integration', () => {
  describe('JSON to .cls conversion', () => {
    test('generates compilable Apex from API JSON', () => {
      // Sample API response format
      const apiResponse = {
        typeStubs: [
          {
            name: 'TestClass',
            kind: 'CLASS',
            modifiers: ['public'],
            fields: [
              {
                name: 'testField',
                type: { name: 'String' },
                modifiers: ['public'],
              },
            ],
            methods: [
              {
                name: '<init>',
                returnType: { name: 'void' },
                modifiers: ['public'],
                parameters: [],
              },
              {
                name: 'testMethod',
                returnType: { name: 'String' },
                modifiers: ['public'],
                parameters: [
                  {
                    name: 'input',
                    type: { name: 'Integer' },
                  },
                ],
              },
            ],
          },
        ],
      };

      // Generate stubs
      const stubs = generateApexStubs(apiResponse);

      expect(stubs).toHaveLength(1);
      expect(stubs[0].filename).toBe('TestClass.cls');

      const source = stubs[0].source;

      // Verify generated Apex structure
      expect(source).toContain('public class TestClass');
      expect(source).toContain('public String testField;');
      expect(source).toContain('public TestClass() { }');
      expect(source).toContain('public String testMethod(Integer input)');
      expect(source).toContain('return null;');
    });
  });

  describe('.cls to Symbol Table compilation', () => {
    test('generated stub compiles to valid symbol table', () => {
      // Generate stub from API JSON
      const apiResponse = {
        typeStubs: [
          {
            name: 'MyClass',
            kind: 'CLASS',
            modifiers: ['global'],
            methods: [
              {
                name: 'myMethod',
                returnType: { name: 'String' },
                modifiers: ['global', 'static'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const stubs = generateApexStubs(apiResponse);
      const source = stubs[0].source;

      // Compile the generated source
      const listener = new ApexSymbolCollectorListener();
      const compiler = new CompilerService('System');
      const fileUri = 'apexlib://test/MyClass.cls';

      const result = compiler.compile(source, fileUri, listener, {
        projectNamespace: 'System',
        includeComments: false,
      });

      // Verify compilation succeeded
      expect(result.result).toBeDefined();
      expect(result.result).not.toBeNull();

      const symbolTable = result.result;
      const symbols = symbolTable.getAllSymbols();

      // Verify symbol table contains expected symbols
      const classSymbol = symbols.find((s) => s.name === 'MyClass');
      expect(classSymbol).toBeDefined();
      // Symbol kind varies by implementation, just verify it exists
      expect(classSymbol?.kind).toBeDefined();

      const methodSymbol = symbols.find((s) => s.name === 'myMethod');
      expect(methodSymbol).toBeDefined();
    });
  });

  describe('Generic type handling', () => {
    test('handles List<T> return types correctly', () => {
      const apiResponse = {
        typeStubs: [
          {
            name: 'GenericClass',
            kind: 'CLASS',
            modifiers: ['public'],
            methods: [
              {
                name: 'getStrings_rList$$lString$$r',
                returnType: { name: 'List' },
                modifiers: ['public'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const stubs = generateApexStubs(apiResponse);
      const source = stubs[0].source;

      // Verify demangled generic type
      expect(source).toContain('public List<String> getStrings()');

      // Verify it compiles
      const listener = new ApexSymbolCollectorListener();
      const compiler = new CompilerService('System');
      const result = compiler.compile(
        source,
        'apexlib://test/GenericClass.cls',
        listener,
        {
          projectNamespace: 'System',
          includeComments: false,
        },
      );

      expect(result.result).toBeDefined();
      expect(result.result).not.toBeNull();
    });

    test('handles Map<K,V> return types correctly', () => {
      const apiResponse = {
        typeStubs: [
          {
            name: 'MapClass',
            kind: 'CLASS',
            modifiers: ['public'],
            methods: [
              {
                name: 'getMapping_rMap$$lString$$cInteger$$r',
                returnType: { name: 'Map' },
                modifiers: ['public'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const stubs = generateApexStubs(apiResponse);
      const source = stubs[0].source;

      // Verify demangled generic type
      expect(source).toContain('public Map<String, Integer> getMapping()');

      // Verify it compiles
      const listener = new ApexSymbolCollectorListener();
      const compiler = new CompilerService('System');
      const result = compiler.compile(
        source,
        'apexlib://test/MapClass.cls',
        listener,
        {
          projectNamespace: 'System',
          includeComments: false,
        },
      );

      expect(result.result).toBeDefined();
      expect(result.result).not.toBeNull();
    });
  });

  describe('Namespace handling', () => {
    test('handles namespace prefix in types', () => {
      const apiResponse = {
        typeStubs: [
          {
            name: 'CustomClass',
            namespacePrefix: 'MyNamespace',
            kind: 'CLASS',
            modifiers: ['public'],
          },
        ],
      };

      const stubs = generateApexStubs(apiResponse);

      expect(stubs[0].filename).toBe('MyNamespace_CustomClass.cls');
    });

    test('handles dotted class names', () => {
      const apiResponse = {
        typeStubs: [
          {
            name: 'ConnectApi.FeedItem',
            kind: 'CLASS',
            modifiers: ['global'],
          },
        ],
      };

      const stubs = generateApexStubs(apiResponse);

      expect(stubs[0].filename).toBe('FeedItem.cls');
      expect(stubs[0].source).toContain('global class FeedItem');
    });
  });

  describe('Special cases', () => {
    test('handles abstract classes and methods', () => {
      const apiResponse = {
        typeStubs: [
          {
            name: 'AbstractBase',
            kind: 'CLASS',
            modifiers: ['public', 'abstract'],
            methods: [
              {
                name: 'abstractMethod',
                returnType: { name: 'void' },
                modifiers: ['public', 'abstract'],
                parameters: [],
              },
              {
                name: 'concreteMethod',
                returnType: { name: 'void' },
                modifiers: ['public'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const stubs = generateApexStubs(apiResponse);
      const source = stubs[0].source;

      expect(source).toContain('public abstract class AbstractBase');
      expect(source).toContain('public abstract void abstractMethod();');
      expect(source).not.toContain('abstractMethod() {');
      expect(source).toContain('public void concreteMethod() { }');
    });

    test('handles interfaces correctly', () => {
      const apiResponse = {
        typeStubs: [
          {
            name: 'MyInterface',
            kind: 'INTERFACE',
            modifiers: ['public'],
            methods: [
              {
                name: 'interfaceMethod',
                returnType: { name: 'void' },
                modifiers: ['public'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const stubs = generateApexStubs(apiResponse);
      const source = stubs[0].source;

      expect(source).toContain('public interface MyInterface');
      expect(source).toContain('public void interfaceMethod();');
      expect(source).not.toContain('interfaceMethod() {');
    });

    test('handles triggers with helper class', () => {
      const apiResponse = {
        typeStubs: [
          {
            name: '__sfdc_trigger.AccountTrigger',
            kind: 'TRIGGER',
            triggerObjectType: { name: 'Account' },
            methods: [
              {
                name: 'beforeInsert',
                returnType: { name: 'void' },
                modifiers: ['public', 'static'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const stubs = generateApexStubs(apiResponse);

      expect(stubs[0].filename).toBe('AccountTrigger.trigger');
      expect(stubs[0].source).toContain('trigger AccountTrigger on Account');
      expect(stubs[0].source).toContain('before insert');
      expect(stubs[0].source).toContain('public class AccountTriggerHandler');
    });
  });
});
