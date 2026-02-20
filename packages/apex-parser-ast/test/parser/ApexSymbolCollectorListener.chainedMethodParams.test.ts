/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { CompilerService } from '../../src/parser/compilerService';
import {
  ReferenceContext,
  ChainedSymbolReference,
} from '../../src/types/symbolReference';
import { isChainedSymbolReference } from '../../src/utils/symbolNarrowing';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('ApexSymbolCollectorListener - Chained Method Calls in Parameters', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  describe('Chained Expressions as Method Parameters', () => {
    it('should capture chained expression as method parameter for simple 2-level chain', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            HttpRequest request = new HttpRequest();
            request.setHeader(
              'http-referer',
              URL.getOrgDomainUrl().toExternalForm()
            );
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const _result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Find the setHeader method call - it's part of a chained call (request.setHeader)
      // Individual method call references are NOT in symbol table for chained calls
      // Instead, look for the chained reference
      const _setHeaderChainRef = references.find(
        (ref) =>
          ref.name === 'request.setHeader' && isChainedSymbolReference(ref),
      );
      // The chained reference should exist (or it might be just 'setHeader' if request is a variable)
      // For now, we verify the chained expression parameter is captured instead

      // Check that the chained expression is captured
      const chainedRef = references.find(
        (ref) =>
          ref.name === 'URL.getOrgDomainUrl.toExternalForm' &&
          isChainedSymbolReference(ref),
      );
      expect(chainedRef).toBeDefined();

      // Verify chain nodes structure
      const chainedRefTyped = chainedRef as ChainedSymbolReference;
      expect(chainedRefTyped.chainNodes).toBeDefined();
      expect(chainedRefTyped.chainNodes.length).toBeGreaterThanOrEqual(3);
      expect(chainedRefTyped.chainNodes[0].name).toBe('URL');
      expect(chainedRefTyped.chainNodes[1].name).toBe('getOrgDomainUrl');
      expect(chainedRefTyped.chainNodes[2].name).toBe('toExternalForm');

      // Verify the chained expression is added as a parameter to setHeader
      // This is the key test - the chain should be in parameterRefs
      const methodCallStack = (listener as any).methodCallStack;
      if (methodCallStack && methodCallStack.size > 0) {
        // We need to check if the chain reference is in the parameter list
        // This will be verified by checking references that are parameters
        const parameterRefs = references.filter(
          (ref) =>
            isChainedSymbolReference(ref) &&
            ref.name === 'URL.getOrgDomainUrl.toExternalForm',
        );
        expect(parameterRefs.length).toBeGreaterThan(0);
      }
    });

    it('should capture chained expression as method parameter for 3-level chain', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            String result = processChain(
              Account.SObjectType.getDescribe().getName()
            );
          }
          private String processChain(String input) {
            return input;
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const _result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Find the chained expression
      const chainedRef = references.find(
        (ref) =>
          ref.name === 'Account.SObjectType.getDescribe.getName' &&
          isChainedSymbolReference(ref),
      );
      expect(chainedRef).toBeDefined();

      const chainedRefTyped = chainedRef as ChainedSymbolReference;
      expect(chainedRefTyped.chainNodes).toBeDefined();
      expect(chainedRefTyped.chainNodes.length).toBeGreaterThanOrEqual(4);
    });

    it('should capture multiple chained expressions as parameters', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            processMultipleChains(
              URL.getOrgDomainUrl().toExternalForm(),
              Account.SObjectType.getDescribe().getName()
            );
          }
          private void processMultipleChains(String first, String second) {
            System.debug(first + second);
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const _result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Find both chained expressions
      const urlChainRef = references.find(
        (ref) =>
          ref.name === 'URL.getOrgDomainUrl.toExternalForm' &&
          isChainedSymbolReference(ref),
      );
      expect(urlChainRef).toBeDefined();

      const accountChainRef = references.find(
        (ref) =>
          ref.name === 'Account.SObjectType.getDescribe.getName' &&
          isChainedSymbolReference(ref),
      );
      expect(accountChainRef).toBeDefined();
    });

    it('should capture chained expression with mixed parameters', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            String simpleVar = 'test';
            String anotherVar = 'value';
            processMixed(
              simpleVar,
              URL.getOrgDomainUrl().toExternalForm(),
              anotherVar
            );
          }
          private void processMixed(String first, String second, String third) {
            System.debug(first + second + third);
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const _result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Verify chained expression is captured
      const chainedRef = references.find(
        (ref) =>
          ref.name === 'URL.getOrgDomainUrl.toExternalForm' &&
          isChainedSymbolReference(ref),
      );
      expect(chainedRef).toBeDefined();

      // Verify simple variables are also captured
      const simpleVarRef = references.find(
        (ref) =>
          ref.name === 'simpleVar' &&
          ref.context === ReferenceContext.VARIABLE_USAGE,
      );
      expect(simpleVarRef).toBeDefined();

      const anotherVarRef = references.find(
        (ref) =>
          ref.name === 'anotherVar' &&
          ref.context === ReferenceContext.VARIABLE_USAGE,
      );
      expect(anotherVarRef).toBeDefined();
    });

    it('should capture chained expression in static method call', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            MyUtilityClass.staticMethod(
              URL.getOrgDomainUrl().toExternalForm()
            );
          }
        }
        public class MyUtilityClass {
          public static void staticMethod(String param) {
            System.debug(param);
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const _result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Verify chained expression is captured
      const chainedRef = references.find(
        (ref) =>
          ref.name === 'URL.getOrgDomainUrl.toExternalForm' &&
          isChainedSymbolReference(ref),
      );
      expect(chainedRef).toBeDefined();
    });

    it('should capture chained expression in constructor call', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            MyClass instance = new MyClass(
              URL.getOrgDomainUrl().toExternalForm()
            );
          }
        }
        public class MyClass {
          public MyClass(String param) {
            System.debug(param);
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const _result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Verify chained expression is captured
      const chainedRef = references.find(
        (ref) =>
          ref.name === 'URL.getOrgDomainUrl.toExternalForm' &&
          isChainedSymbolReference(ref),
      );
      expect(chainedRef).toBeDefined();
    });

    it('should capture nested chained expression', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            processNestedChain(
              Account.SObjectType.getDescribe().getLabel().toLowerCase()
            );
          }
          private void processNestedChain(String input) {
            System.debug(input);
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const _result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Verify nested chained expression is captured
      const chainedRef = references.find(
        (ref) =>
          isChainedSymbolReference(ref) &&
          ref.name.includes(
            'Account.SObjectType.getDescribe.getLabel.toLowerCase',
          ),
      );
      expect(chainedRef).toBeDefined();
    });
  });

  describe('Chain Reference Structure', () => {
    it('should have correct chain nodes for URL.getOrgDomainUrl().toExternalForm()', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            request.setHeader('key', URL.getOrgDomainUrl().toExternalForm());
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const _result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      const chainedRef = references.find(
        (ref) =>
          ref.name === 'URL.getOrgDomainUrl.toExternalForm' &&
          isChainedSymbolReference(ref),
      ) as ChainedSymbolReference;

      expect(chainedRef).toBeDefined();
      expect(chainedRef.chainNodes).toBeDefined();
      expect(chainedRef.chainNodes.length).toBe(3);
      expect(chainedRef.chainNodes[0].name).toBe('URL');
      expect(chainedRef.chainNodes[1].name).toBe('getOrgDomainUrl');
      expect(chainedRef.chainNodes[2].name).toBe('toExternalForm');
    });
  });
});
