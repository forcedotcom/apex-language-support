/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-len */

import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { CompilerService } from '../../src/parser/compilerService';
import { ReferenceContext } from '../../src/types/symbolReference';
import { isChainedSymbolReference } from '../../src/utils/symbolNarrowing';
import { SymbolKind } from '../../src/types/symbol';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('ApexSymbolCollectorListener with Type References', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
    // Enable console logging for debugging
    enableConsoleLogging();
    setLogLevel('error');
  });

  describe('Method Call References', () => {
    it('preserves this as the receiver of a chained field reference', () => {
      const sourceCode = `
        public class TestClass {
          Integer value;
          Integer readValue() { return this.value; }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TestClass.cls', listener, {
        collectReferences: true,
        resolveReferences: true,
      });

      const chain = listener
        .getResult()
        .getAllReferences()
        .find(
          (reference) =>
            isChainedSymbolReference(reference) &&
            reference.name === 'this.value',
        );

      expect(chain?.chainNodes?.map((node) => node.name)).toEqual([
        'this',
        'value',
      ]);
      expect(chain?.chainNodes?.[0].context).toBe(ReferenceContext.CHAIN_STEP);
      expect(chain?.chainNodes?.[1].context).toBe(
        ReferenceContext.FIELD_ACCESS,
      );
    });

    it('records indexed receivers on chained field and method references', () => {
      const sourceCode = `
        public class TestClass {
          class Row {
            Integer value;
            String label() { return null; }
          }
          void exerciseMethod() {
            List<Row> rows;
            Integer value = rows[0].value;
            String label = rows[0].label();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TestClass.cls', listener);

      const chains = listener
        .getResult()
        .getAllReferences()
        .filter(isChainedSymbolReference);
      const valueChain = chains.find((reference) =>
        reference.chainNodes?.some((node) => node.name === 'value'),
      );
      const labelChain = chains.find((reference) =>
        reference.chainNodes?.some((node) => node.name === 'label'),
      );

      for (const chain of [valueChain, labelChain]) {
        expect(chain).toBeDefined();
        expect(chain?.chainNodes?.[0].name).toBe('rows');
        expect(chain?.chainNodes?.[0].semanticContext?.indexedAccess).toEqual(
          expect.objectContaining({
            kind: 'indexed-access',
            receiverRange: expect.objectContaining({
              startLine: expect.any(Number),
              startColumn: expect.any(Number),
            }),
            indexRange: expect.objectContaining({
              startLine: expect.any(Number),
              startColumn: expect.any(Number),
            }),
          }),
        );
      }
    });

    it('should capture method call references', () => {
      const sourceCode = `
        public class TestClass {
          public void exerciseMethod() {
            FileUtilities.createFile(base64Data, fileName, recordId);
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // With chained calls, we have:
      // 1. Chained reference (FileUtilities.createFile)
      // 2. Base VARIABLE_USAGE (FileUtilities)
      // 3-5. Parameter VARIABLE_USAGE (base64Data, fileName, recordId)
      // Individual method call reference is NOT added for chained calls (only in methodCallStack)
      expect(references.length).toBeGreaterThanOrEqual(5);

      // Check for CHAINED_EXPRESSION (FileUtilities.createFile)
      const chainedRef = references.find(
        (ref) =>
          ref.name === 'FileUtilities.createFile' &&
          isChainedSymbolReference(ref),
      );
      expect(chainedRef).toBeDefined();
      expect(isChainedSymbolReference(chainedRef)).toBe(true);
      expect(chainedRef?.parentContext).toBe('exerciseMethod');
      expect(chainedRef?.resolvedSymbolId).toBeUndefined();
      // Check chainNodes structure
      const chainedRefTyped = chainedRef as any;
      expect(chainedRefTyped?.chainNodes).toBeDefined();
      expect(chainedRefTyped?.chainNodes).toHaveLength(2);
      expect(chainedRefTyped?.chainNodes?.[0].name).toBe('FileUtilities');
      expect(chainedRefTyped?.chainNodes?.[1].name).toBe('createFile');

      // Check for VARIABLE_USAGE references (parameters)
      const base64DataRef = references.find(
        (ref) =>
          ref.name === 'base64Data' &&
          ref.context === ReferenceContext.VARIABLE_USAGE,
      );
      expect(base64DataRef).toBeDefined();
      expect(base64DataRef?.context).toBe(ReferenceContext.VARIABLE_USAGE);

      const fileNameRef = references.find(
        (ref) =>
          ref.name === 'fileName' &&
          ref.context === ReferenceContext.VARIABLE_USAGE,
      );
      expect(fileNameRef).toBeDefined();
      expect(fileNameRef?.context).toBe(ReferenceContext.VARIABLE_USAGE);

      const recordIdRef = references.find(
        (ref) =>
          ref.name === 'recordId' &&
          ref.context === ReferenceContext.VARIABLE_USAGE,
      );
      expect(recordIdRef).toBeDefined();
      expect(recordIdRef?.context).toBe(ReferenceContext.VARIABLE_USAGE);
    });

    it('should capture method call references without qualifier', () => {
      const sourceCode = `
        public class TestClass {
          public void exerciseMethod() {
            createFile(base64Data, fileName, recordId);
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // With enhanced reference capture, we now get:
      // 1. METHOD_CALL for createFile
      // 2. VARIABLE_USAGE for base64Data (parameter)
      // 3. VARIABLE_USAGE for fileName (parameter)
      // 4. VARIABLE_USAGE for recordId (parameter)
      expect(references).toHaveLength(4);

      // Check for METHOD_CALL (createFile)
      const methodRef = references.find((ref) => ref.name === 'createFile');
      expect(methodRef).toBeDefined();
      expect(methodRef?.context).toBe(ReferenceContext.METHOD_CALL);
      // Simple method call - no qualifier
      expect(methodRef?.parentContext).toBe('exerciseMethod');

      // Check for VARIABLE_USAGE references (parameters)
      const base64DataRef = references.find(
        (ref) =>
          ref.name === 'base64Data' &&
          ref.context === ReferenceContext.VARIABLE_USAGE,
      );
      expect(base64DataRef).toBeDefined();
      expect(base64DataRef?.context).toBe(ReferenceContext.VARIABLE_USAGE);

      const fileNameRef = references.find(
        (ref) =>
          ref.name === 'fileName' &&
          ref.context === ReferenceContext.VARIABLE_USAGE,
      );
      expect(fileNameRef).toBeDefined();
      expect(fileNameRef?.context).toBe(ReferenceContext.VARIABLE_USAGE);

      const recordIdRef = references.find(
        (ref) =>
          ref.name === 'recordId' &&
          ref.context === ReferenceContext.VARIABLE_USAGE,
      );
      expect(recordIdRef).toBeDefined();
      expect(recordIdRef?.context).toBe(ReferenceContext.VARIABLE_USAGE);
    });
  });

  describe('Type Declaration References', () => {
    it('should capture type declaration references', () => {
      const sourceCode = `
        public class TestClass {
          public void exerciseMethod() {
            Property__c property = new Property__c();
            String contentDocumentLinkId;
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Filter for type declaration references only
      const typeDeclRefs = references.filter(
        (ref) => ref.context === ReferenceContext.TYPE_DECLARATION,
      );
      expect(typeDeclRefs).toHaveLength(2);

      const propertyRef = typeDeclRefs.find(
        (ref) => ref.name === 'Property__c',
      );
      expect(propertyRef).toBeDefined();
      expect(propertyRef?.context).toBe(ReferenceContext.TYPE_DECLARATION);
      expect(propertyRef?.parentContext).toBe('exerciseMethod');

      const stringRef = typeDeclRefs.find((ref) => ref.name === 'String');
      expect(stringRef).toBeDefined();
      expect(stringRef?.context).toBe(ReferenceContext.TYPE_DECLARATION);
      expect(stringRef?.parentContext).toBe('exerciseMethod');
    });

    it('should capture type literal references via TypeName.class', () => {
      const sourceCode = `
        public class TypeLiteralTest {
          public void m() {
            Object x = String.class;
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TypeLiteralTest.cls', listener);
      const references = listener.getResult().getAllReferences();

      const typeLiteralRefs = references.filter(
        (r) =>
          r.context === ReferenceContext.CLASS_REFERENCE && r.name === 'String',
      );
      expect(typeLiteralRefs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Field Access References', () => {
    it('should capture field access references', () => {
      const sourceCode = `
        public class TestClass {
          public void exerciseMethod() {
            Property__c property = new Property__c(); // dotted method call
            String id = property.Id; // dotted field access
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Should have chained expression reference for field access
      const chainedRefs = references.filter((ref) =>
        isChainedSymbolReference(ref),
      );
      expect(chainedRefs).toHaveLength(1);
      expect(chainedRefs[0].name).toBe('property.Id');
      expect(chainedRefs[0].parentContext).toBe('exerciseMethod');
      // Check chainNodes structure
      const chainedRefTyped = chainedRefs[0] as any;
      expect(chainedRefTyped.chainNodes).toBeDefined();
      expect(chainedRefTyped.chainNodes).toHaveLength(2);
      expect(chainedRefTyped.chainNodes?.[0].name).toBe('property');
      expect(chainedRefTyped.chainNodes?.[1].name).toBe('Id');
    });
  });

  describe('Constructor Call References', () => {
    it('should capture constructor call references', () => {
      const sourceCode = `
        public class TestClass {
          public void myMethod() {
            Property__c property = new Property__c();
            ContentVersion cv = new ContentVersion();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      const constructorRefs = references.filter(
        (ref) => ref.context === ReferenceContext.CONSTRUCTOR_CALL,
      );
      expect(constructorRefs).toHaveLength(2);

      const propertyConstructor = constructorRefs.find(
        (ref) => ref.name === 'Property__c',
      );
      expect(propertyConstructor).toBeDefined();
      expect(propertyConstructor?.parentContext).toBe('myMethod');

      const contentVersionConstructor = constructorRefs.find(
        (ref) => ref.name === 'ContentVersion',
      );
      expect(contentVersionConstructor).toBeDefined();
      expect(contentVersionConstructor?.parentContext).toBe('myMethod');
    });

    it('should capture constructor and generic parameter types (maps/lists, nested generics)', () => {
      const sourceCode = `
        public class GenericCtorTest {
          public void m() {
            Map<String, Integer> m = new Map<String, Integer>();
            List<List<String>> l = new List<List<String>>();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'GenericCtorTest.cls', listener);
      const references = listener.getResult().getAllReferences();

      const ctorRefs = references.filter(
        (r) => r.context === ReferenceContext.CONSTRUCTOR_CALL,
      );
      expect(ctorRefs.some((r) => r.name === 'Map')).toBe(true);
      expect(ctorRefs.some((r) => r.name === 'List')).toBe(true);

      // Generic type arguments in constructor calls should use GENERIC_PARAMETER_TYPE
      const genericParamRefs = references.filter(
        (r) => r.context === ReferenceContext.GENERIC_PARAMETER_TYPE,
      );
      expect(genericParamRefs.some((r) => r.name.includes('String'))).toBe(
        true,
      );
      expect(genericParamRefs.some((r) => r.name.includes('Integer'))).toBe(
        true,
      );
    });
  });

  describe('Catch Clause References', () => {
    it('should capture exception type in catch clause', () => {
      const sourceCode = `
        public class CatchTest {
          public void m() {
            try {
              Integer i = 1;
            } catch (Exception e) {
              System.debug(e);
            }
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'CatchTest.cls', listener);
      const references = listener.getResult().getAllReferences();
      const exceptionRefs = references.filter(
        (r) =>
          r.context === ReferenceContext.CLASS_REFERENCE &&
          r.name === 'Exception',
      );
      expect(exceptionRefs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Complex Example from FileUtilitiesTest', () => {
    it('should capture all references from the FileUtilitiesTest class', () => {
      const sourceCode = `
        @isTest
        private with sharing class FileUtilitiesTest {
          @isTest
          static void createFileSucceedsWhenCorrectInput() {
            // GIVEN
            Property__c property = new Property__c();
            insert property;

            String base64Data = '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb';
            String fileName = 'file.png';
            String recordId = property.Id;

            // WHEN
            String contentDocumentLinkId = FileUtilities.createFile(
              base64Data,
              fileName,
              recordId
            );

            // THEN
            Assert.isNotNull(contentDocumentLinkId);
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'FileUtilitiesTest.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // With enhanced reference capture, this complex test captures many more references:
      // - Type declarations (Property__c, String, etc.)
      // - Constructor calls (Property__c, ContentVersion)
      // - Variable usage (property, base64Data, fileName, recordId, contentDocumentLinkId)
      // - Field access (property.Id)
      // - Method calls (FileUtilities.createFile, Assert.isNotNull)
      // - Class references (FileUtilities, Assert)
      // And more...
      expect(references.length).toBeGreaterThan(10);

      // Check CHAINED_EXPRESSION location accuracy
      const chainedRef = references.find(
        (ref) =>
          ref.name === 'FileUtilities.createFile' &&
          isChainedSymbolReference(ref),
      );
      expect(chainedRef).toBeDefined();
      expect(chainedRef?.location.identifierRange.startLine).toBeGreaterThan(0);
      expect(chainedRef?.location.identifierRange.endLine).toBeGreaterThan(0);
      expect(
        chainedRef?.location.identifierRange.startColumn,
      ).toBeGreaterThanOrEqual(0);
      expect(chainedRef?.location.identifierRange.endColumn).toBeGreaterThan(0);

      // Check chained expression properties
      const chainedRefTyped = chainedRef as any;
      expect(chainedRefTyped?.chainNodes).toBeDefined();
      expect(chainedRefTyped?.chainNodes?.length).toBeGreaterThan(1);

      // Check for some key references that should exist in this complex test
      const fileUtilitiesRef = references.find(
        (ref) =>
          ref.name === 'FileUtilities.createFile' &&
          isChainedSymbolReference(ref),
      );
      expect(fileUtilitiesRef).toBeDefined();
      expect(
        fileUtilitiesRef?.location.identifierRange.startLine,
      ).toBeGreaterThan(0);
      expect(
        fileUtilitiesRef?.location.identifierRange.endLine,
      ).toBeGreaterThan(0);

      const assertRef = references.find(
        (ref) =>
          ref.name === 'Assert.isNotNull' && isChainedSymbolReference(ref),
      );
      expect(assertRef).toBeDefined();
      expect(assertRef?.location.identifierRange.startLine).toBeGreaterThan(0);
      expect(assertRef?.location.identifierRange.endLine).toBeGreaterThan(0);
    });
  });

  describe('Reference Location Accuracy', () => {
    it('should capture accurate location information', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            FileUtilities.createFile(data, name, id);
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // With chained calls, we have:
      // 1. Chained reference (FileUtilities.createFile)
      // 2. Base VARIABLE_USAGE (FileUtilities)
      // 3-5. Parameter VARIABLE_USAGE (data, name, id)
      // Individual method call reference is NOT added for chained calls (only in methodCallStack)
      expect(references.length).toBeGreaterThanOrEqual(5);

      // Check CHAINED_EXPRESSION location accuracy
      const chainedRef = references.find(
        (ref) =>
          ref.name === 'FileUtilities.createFile' &&
          isChainedSymbolReference(ref),
      );
      expect(chainedRef).toBeDefined();
      expect(chainedRef?.location.identifierRange.startLine).toBeGreaterThan(0);
      expect(chainedRef?.location.identifierRange.endLine).toBeGreaterThan(0);
      expect(
        chainedRef?.location.identifierRange.startColumn,
      ).toBeGreaterThanOrEqual(0);
      expect(chainedRef?.location.identifierRange.endColumn).toBeGreaterThan(0);

      // Check chained expression properties
      const chainedRefTyped = chainedRef as any;
      expect(chainedRefTyped?.chainNodes).toBeDefined();
      expect(chainedRefTyped?.chainNodes?.length).toBeGreaterThan(1);

      // End should be after start for chained reference
      expect(
        chainedRef?.location.identifierRange.endLine,
      ).toBeGreaterThanOrEqual(
        chainedRef?.location.identifierRange.startLine || 0,
      );
      expect(
        chainedRef?.location.identifierRange.endLine,
      ).toBeGreaterThanOrEqual(
        chainedRef?.location.identifierRange.startLine || 0,
      );

      if (
        chainedRef?.location.identifierRange.endLine ===
        chainedRef?.location.identifierRange.startLine
      ) {
        expect(chainedRef?.location.identifierRange.endColumn).toBeGreaterThan(
          chainedRef?.location.identifierRange.startColumn || 0,
        );
      }
    });
  });

  describe('Parameter Type References', () => {
    it('should capture parameter type references', () => {
      const sourceCode = `
        public class TestClass {
          public void exerciseMethod(String param1, Property__c param2, List<String> param3, Map<String, Property__c> param4) {
            // Method body
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Filter for parameter type references (including generic parameter types)
      const paramTypeRefs = references.filter(
        (ref) =>
          ref.context === ReferenceContext.PARAMETER_TYPE ||
          ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE,
      );

      // Should capture: String, Property__c, List, String (from List<String>), Map, String, Property__c (from Map<String, Property__c>)
      // Generic type arguments now only create GENERIC_PARAMETER_TYPE references (not PARAMETER_TYPE)
      expect(paramTypeRefs).toHaveLength(7);

      // Check for simple types
      const stringRefs = paramTypeRefs.filter((ref) => ref.name === 'String');
      expect(stringRefs).toHaveLength(3); // param1, and from List<String> (GENERIC_PARAMETER_TYPE), Map<String, Property__c> (GENERIC_PARAMETER_TYPE)

      const propertyRefs = paramTypeRefs.filter(
        (ref) => ref.name === 'Property__c',
      );
      expect(propertyRefs).toHaveLength(2); // param2, and from Map<String, Property__c> (GENERIC_PARAMETER_TYPE)

      // Check for generic base types
      const listRef = paramTypeRefs.find((ref) => ref.name === 'List');
      expect(listRef).toBeDefined();
      expect(listRef?.parentContext).toBe('exerciseMethod');

      const mapRef = paramTypeRefs.find((ref) => ref.name === 'Map');
      expect(mapRef).toBeDefined();
      expect(mapRef?.parentContext).toBe('exerciseMethod');
    });

    it('should capture enhanced for control: parameter type and source variable usage', () => {
      const sourceCode = `
        public class ForEachTest {
          public void m() {
            List<String> items = new List<String>();
            for (String s : items) {
              System.debug(s);
            }
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'ForEachTest.cls', listener);
      const references = listener.getResult().getAllReferences();

      const paramTypeRefs = references.filter(
        (r) =>
          r.context === ReferenceContext.PARAMETER_TYPE && r.name === 'String',
      );
      const sourceUsageRefs = references.filter(
        (r) =>
          r.context === ReferenceContext.VARIABLE_USAGE && r.name === 'items',
      );
      expect(paramTypeRefs.length).toBeGreaterThanOrEqual(1);
      expect(sourceUsageRefs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Enhanced Hierarchical Type Reference Properties', () => {
    it('should populate hierarchical method call references with enhanced properties', () => {
      const sourceCode = `
        public class HierarchicalTest {
          public void testMethod() {
            FileUtilities.createFile(base64Data, fileName, recordId);
            EncodingUtil.urlEncode('Hello World', 'UTF-8');
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'HierarchicalTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Find the chained expression reference for FileUtilities.createFile
      const fileUtilMethodRef = references.find(
        (ref) =>
          ref.name === 'FileUtilities.createFile' &&
          isChainedSymbolReference(ref),
      );

      expect(fileUtilMethodRef).toBeDefined();

      // Test enhanced hierarchical properties
      // Check chainNodes structure for chained expression
      const fileUtilMethodRefTyped = fileUtilMethodRef as any;
      expect(fileUtilMethodRefTyped?.chainNodes).toBeDefined();
      expect(fileUtilMethodRefTyped?.chainNodes?.length).toBeGreaterThan(1);

      // Test location properties
      expect(fileUtilMethodRef?.location).toBeDefined();
      expect(
        fileUtilMethodRef?.location.identifierRange.startLine,
      ).toBeGreaterThan(0);

      // Find the chained expression reference for EncodingUtil.urlEncode
      const encodingUtilMethodRef = references.find(
        (ref) =>
          ref.name === 'EncodingUtil.urlEncode' &&
          isChainedSymbolReference(ref),
      );

      expect(encodingUtilMethodRef).toBeDefined();
      // Check chainNodes structure for chained expression
      const encodingUtilMethodRefTyped = encodingUtilMethodRef as any;
      expect(encodingUtilMethodRefTyped?.chainNodes).toBeDefined();
      expect(encodingUtilMethodRefTyped?.chainNodes?.length).toBeGreaterThan(1);
    });

    it('should populate hierarchical field access references with enhanced properties', () => {
      const sourceCode = `
        public class FieldAccessTest {
          public void testMethod() {
            Account acc = new Account();
            String name = acc.Name;
            String owner = acc.Owner.Name;
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'FieldAccessTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Find chained expression references for field access
      const nameFieldRef = references.find(
        (ref) => ref.name === 'acc.Name' && isChainedSymbolReference(ref),
      );

      expect(nameFieldRef).toBeDefined();
      // Check chainNodes structure for chained expression
      const nameFieldRefTyped = nameFieldRef as any;
      expect(nameFieldRefTyped?.chainNodes).toBeDefined();
      expect(nameFieldRefTyped?.chainNodes?.length).toBeGreaterThan(1);

      // Test nested field access (acc.Owner.Name)
      const ownerNameFieldRef = references.find(
        (ref) => ref.name === 'owner.Name' && isChainedSymbolReference(ref),
      );

      if (ownerNameFieldRef) {
        // Check chainNodes structure for chained expression
        const ownerNameFieldRefTyped = ownerNameFieldRef as any;
        expect(ownerNameFieldRefTyped.chainNodes).toBeDefined();
        expect(ownerNameFieldRefTyped.chainNodes?.length).toBeGreaterThan(1);
      }
    });

    it('should populate constructor call references with enhanced properties', () => {
      const sourceCode = `
        public class ConstructorTest {
          public void testMethod() {
            List<String> stringList = new List<String>();
            Map<String, Integer> stringIntMap = new Map<String, Integer>();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'ConstructorTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Find constructor call references
      const listConstructorRef = references.find(
        (ref) =>
          ref.name === 'List' &&
          ref.context === ReferenceContext.CONSTRUCTOR_CALL,
      );

      expect(listConstructorRef).toBeDefined();
      // Simple constructor call - no chainNodes
      const listConstructorRefTyped = listConstructorRef as any;
      expect(listConstructorRefTyped?.chainNodes).toBeUndefined();

      const mapConstructorRef = references.find(
        (ref) =>
          ref.name === 'Map' &&
          ref.context === ReferenceContext.CONSTRUCTOR_CALL,
      );

      expect(mapConstructorRef).toBeDefined();
      // Simple constructor call - no chainNodes
      const mapConstructorRefTyped = mapConstructorRef as any;
      expect(mapConstructorRefTyped?.chainNodes).toBeUndefined();
    });

    it('should populate type declaration references with enhanced properties', () => {
      const sourceCode = `
        public class TypeDeclarationTest {
          public void testMethod() {
            String text = 'Hello';
            List<String> items = new List<String>();
            Map<String, Account> accountMap = new Map<String, Account>();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TypeDeclarationTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Find type declaration references
      const stringTypeRef = references.find(
        (ref) =>
          ref.name === 'String' &&
          ref.context === ReferenceContext.TYPE_DECLARATION,
      );

      expect(stringTypeRef).toBeDefined();
      // Simple type declaration - no chainNodes
      const stringTypeRefTyped = stringTypeRef as any;
      expect(stringTypeRefTyped?.chainNodes).toBeUndefined();

      const listTypeRef = references.find(
        (ref) =>
          ref.name === 'List' &&
          ref.context === ReferenceContext.TYPE_DECLARATION,
      );

      expect(listTypeRef).toBeDefined();
      // Simple type declaration - no chainNodes
      const listTypeRefTyped = listTypeRef as any;
      expect(listTypeRefTyped?.chainNodes).toBeUndefined();

      const mapTypeRef = references.find(
        (ref) =>
          ref.name === 'Map' &&
          ref.context === ReferenceContext.TYPE_DECLARATION,
      );

      expect(mapTypeRef).toBeDefined();
      // Simple type declaration - no chainNodes
      const mapTypeRefTyped = mapTypeRef as any;
      expect(mapTypeRefTyped?.chainNodes).toBeUndefined();
    });

    it('should find List/Map type references at correct positions', () => {
      const sourceCode = `
        public class TypeDeclarationTest {
          public void testMethod() {
            List<Integer> numbers = new List<Integer>{1, 2, 3};
            Map<String, Object> dataMap = new Map<String, Object>();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TypeDeclarationTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Find List type declaration reference
      const listTypeRef = references.find(
        (ref) =>
          ref.name === 'List' &&
          ref.context === ReferenceContext.TYPE_DECLARATION,
      );

      expect(listTypeRef).toBeDefined();
      if (listTypeRef) {
        // Verify we can find it at its location
        const listPosRefs = symbolTable.getReferencesAtPosition({
          line: listTypeRef.location.identifierRange.startLine,
          character: listTypeRef.location.identifierRange.startColumn,
        });
        expect(listPosRefs.length).toBeGreaterThan(0);
        expect(listPosRefs.some((r) => r.name === 'List')).toBe(true);
      }

      // Find Map type declaration reference
      const mapTypeRef = references.find(
        (ref) =>
          ref.name === 'Map' &&
          ref.context === ReferenceContext.TYPE_DECLARATION,
      );

      expect(mapTypeRef).toBeDefined();
      if (mapTypeRef) {
        // Verify we can find it at its location
        const mapPosRefs = symbolTable.getReferencesAtPosition({
          line: mapTypeRef.location.identifierRange.startLine,
          character: mapTypeRef.location.identifierRange.startColumn,
        });
        expect(mapPosRefs.length).toBeGreaterThan(0);
        expect(mapPosRefs.some((r) => r.name === 'Map')).toBe(true);
      }
    });

    it('should populate variable usage references with enhanced properties', () => {
      const sourceCode = `
        public class VariableUsageTest {
          public void testMethod(String param1, String param2) {
            String localVar = param1 + param2;
            System.debug(localVar);
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'VariableUsageTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Find variable usage references
      const param1UsageRef = references.find(
        (ref) =>
          ref.name === 'param1' &&
          ref.context === ReferenceContext.VARIABLE_USAGE,
      );

      expect(param1UsageRef).toBeDefined();
      // Simple variable usage - no chainNodes
      const param1UsageRefTyped = param1UsageRef as any;
      expect(param1UsageRefTyped?.chainNodes).toBeUndefined();

      const localVarUsageRef = references.find(
        (ref) =>
          ref.name === 'localVar' &&
          ref.context === ReferenceContext.VARIABLE_USAGE,
      );

      expect(localVarUsageRef).toBeDefined();
      // Simple variable usage - no chainNodes
      const localVarUsageRefTyped = localVarUsageRef as any;
      expect(localVarUsageRefTyped?.chainNodes).toBeUndefined();
    });

    it('should populate class references with enhanced properties', () => {
      const sourceCode = `
        public class ClassReferenceTest {
          public void testMethod() {
            Account acc = new Account();
            Contact con = new Contact();
            List<Account> accounts = new List<Account>();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'ClassReferenceTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Verify that references are being captured correctly

      // Find constructor call references (which should capture the class names)
      const accountConstructorRef = references.find(
        (ref) =>
          ref.name === 'Account' &&
          ref.context === ReferenceContext.CONSTRUCTOR_CALL,
      );

      expect(accountConstructorRef).toBeDefined();
      // Simple class reference - no chainNodes
      const accountConstructorRefTyped = accountConstructorRef as any;
      expect(accountConstructorRefTyped?.chainNodes).toBeUndefined();

      const contactConstructorRef = references.find(
        (ref) =>
          ref.name === 'Contact' &&
          ref.context === ReferenceContext.CONSTRUCTOR_CALL,
      );

      expect(contactConstructorRef).toBeDefined();
      // Simple class reference - no chainNodes
      const contactConstructorRefTyped = contactConstructorRef as any;
      expect(contactConstructorRefTyped?.chainNodes).toBeUndefined();

      // Also check for type declaration references in generic types
      const accountTypeDeclRef = references.find(
        (ref) =>
          ref.name === 'Account' &&
          ref.context === ReferenceContext.TYPE_DECLARATION,
      );

      if (accountTypeDeclRef) {
        // Simple type declaration - no chainNodes
        const accountTypeDeclRefTyped = accountTypeDeclRef as any;
        expect(accountTypeDeclRefTyped.chainNodes).toBeUndefined();
      }
    });

    it('should handle complex nested hierarchical references correctly', () => {
      const sourceCode = `
        public class NestedHierarchicalTest {
          public void testMethod() {
            // Test complex nested method calls and field access
            String result = EncodingUtil.urlEncode(
              Account.SObjectType.getDescribe().getName(), 
              'UTF-8'
            );
            
            // Test chained method calls
            String domain = URL.getOrgDomainUrl().toExternalForm();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(
        sourceCode,
        'NestedHierarchicalTest.cls',
        listener,
      );

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Find the chained expression passed as argument to urlEncode
      // Account.SObjectType.getDescribe().getName() is a separate chained expression
      const accountChainRef = references.find(
        (ref) =>
          ref.name === 'Account.SObjectType.getDescribe.getName' &&
          isChainedSymbolReference(ref),
      );

      expect(accountChainRef).toBeDefined();
      // Check chainNodes structure for chained expression
      const accountChainRefTyped = accountChainRef as any;
      expect(accountChainRefTyped?.chainNodes).toBeDefined();
      expect(accountChainRefTyped?.chainNodes?.length).toBeGreaterThan(1);

      // Also check for EncodingUtil.urlEncode reference (method call)
      const urlEncodeRef = references.find(
        (ref) =>
          (ref.name === 'EncodingUtil.urlEncode' || ref.name === 'urlEncode') &&
          (isChainedSymbolReference(ref) ||
            ref.context === ReferenceContext.METHOD_CALL),
      );

      expect(urlEncodeRef).toBeDefined();

      // Find the URL.getOrgDomainUrl.toExternalForm reference
      const urlRef = references.find(
        (ref) =>
          ref.name === 'URL.getOrgDomainUrl.toExternalForm' &&
          isChainedSymbolReference(ref),
      );

      expect(urlRef).toBeDefined();
      // Check chainNodes structure for chained expression
      const urlRefTyped = urlRef as any;
      expect(urlRefTyped?.chainNodes).toBeDefined();
      expect(urlRefTyped?.chainNodes?.length).toBeGreaterThan(1);
    });
  });

  describe('Array Expression Identifier Extraction', () => {
    it('should extract only "contacts" from contacts[0]', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            List<Contact> contacts = new List<Contact>();
            Contact c = contacts[0];
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TestClass.cls', listener);
      const references = listener.getResult().getAllReferences();

      // Should have VARIABLE_USAGE reference for "contacts" only, not "contacts[0]"
      const contactsRefs = references.filter(
        (r) =>
          r.name === 'contacts' &&
          r.context === ReferenceContext.VARIABLE_USAGE,
      );
      expect(contactsRefs.length).toBeGreaterThanOrEqual(1);

      // Should NOT have any reference with name "contacts[0]"
      const invalidRefs = references.filter((r) => r.name.includes('['));
      expect(invalidRefs.length).toBe(0);
    });

    it('should extract "obj" and "field" from obj.field[0]', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            List<Contact> obj = new List<Contact>();
            Contact c = obj.field[0];
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TestClass.cls', listener);
      const references = listener.getResult().getAllReferences();

      // Should have VARIABLE_USAGE references for "obj" and "field" separately
      const objRefs = references.filter(
        (r) =>
          r.name === 'obj' && r.context === ReferenceContext.VARIABLE_USAGE,
      );
      const fieldRefs = references.filter(
        (r) =>
          r.name === 'field' && r.context === ReferenceContext.VARIABLE_USAGE,
      );

      expect(objRefs.length).toBeGreaterThanOrEqual(1);
      expect(fieldRefs.length).toBeGreaterThanOrEqual(1);

      // Should NOT have any reference with name containing "["
      const invalidRefs = references.filter((r) => r.name.includes('['));
      expect(invalidRefs.length).toBe(0);
    });

    it('should extract "arr" and "i" from arr[i]', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            List<Integer> arr = new List<Integer>();
            Integer i = 0;
            Integer x = arr[i];
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TestClass.cls', listener);
      const references = listener.getResult().getAllReferences();

      // Should have VARIABLE_USAGE references for both "arr" and "i"
      const arrRefs = references.filter(
        (r) =>
          r.name === 'arr' && r.context === ReferenceContext.VARIABLE_USAGE,
      );
      const iRefs = references.filter(
        (r) => r.name === 'i' && r.context === ReferenceContext.VARIABLE_USAGE,
      );

      expect(arrRefs.length).toBeGreaterThanOrEqual(1);
      expect(iRefs.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract identifiers from nested arrays arr[0][1]', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            List<List<Integer>> arr = new List<List<Integer>>();
            Integer x = arr[0][1];
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TestClass.cls', listener);
      const references = listener.getResult().getAllReferences();

      // Should have VARIABLE_USAGE reference for "arr" only
      const arrRefs = references.filter(
        (r) =>
          r.name === 'arr' && r.context === ReferenceContext.VARIABLE_USAGE,
      );
      expect(arrRefs.length).toBeGreaterThanOrEqual(1);

      // Should NOT have any reference with name containing "["
      const invalidRefs = references.filter((r) => r.name.includes('['));
      expect(invalidRefs.length).toBe(0);
    });
  });

  describe('Second Pass Resolution for Chained References', () => {
    it('should resolve chained reference to final member (method) in same-file scenario', () => {
      const sourceCode = `
        public class ScopeExample {
          public static String method4() {
            return 'test';
          }
          
          public void method3() {
            String c = ScopeExample.method4();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'ScopeExample.cls', listener);
      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();
      const allSymbols = symbolTable.getAllSymbols();

      // Find the chained reference for ScopeExample.method4
      const chainedRef = references.find(
        (ref) =>
          ref.name === 'ScopeExample.method4' && isChainedSymbolReference(ref),
      );
      expect(chainedRef).toBeDefined();

      // Chained reference should be resolved to the method, not the class
      expect(chainedRef?.resolvedSymbolId).toBeDefined();

      // Verify it resolves to the method symbol
      const resolvedSymbol = allSymbols.find(
        (s) => s.id === chainedRef?.resolvedSymbolId,
      );
      expect(resolvedSymbol).toBeDefined();
      expect(resolvedSymbol?.kind).toBe(SymbolKind.Method);
      expect(resolvedSymbol?.name).toBe('method4');

      // Verify chain nodes are also resolved
      const chainedRefTyped = chainedRef as any;
      expect(chainedRefTyped?.chainNodes).toBeDefined();
      expect(chainedRefTyped?.chainNodes).toHaveLength(2);

      // First node (qualifier) should resolve to the class
      const firstNode = chainedRefTyped.chainNodes[0];
      expect(firstNode.name).toBe('ScopeExample');
      expect(firstNode.resolvedSymbolId).toBeDefined();
      const qualifierSymbol = allSymbols.find(
        (s) => s.id === firstNode.resolvedSymbolId,
      );
      expect(qualifierSymbol).toBeDefined();
      expect(qualifierSymbol?.kind).toBe(SymbolKind.Class);
      expect(qualifierSymbol?.name).toBe('ScopeExample');

      // Last node (member) should resolve to the method
      const lastNode = chainedRefTyped.chainNodes[1];
      expect(lastNode.name).toBe('method4');
      expect(lastNode.resolvedSymbolId).toBeDefined();
      const memberSymbol = allSymbols.find(
        (s) => s.id === lastNode.resolvedSymbolId,
      );
      expect(memberSymbol).toBeDefined();
      expect(memberSymbol?.kind).toBe(SymbolKind.Method);
      expect(memberSymbol?.name).toBe('method4');
    });

    it('should resolve chained reference to final member (field) in same-file scenario', () => {
      const sourceCode = `
        public class ScopeExample {
          static String b;
          
          public void method3() {
            String c = ScopeExample.b;
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'ScopeExample.cls', listener);
      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();
      const allSymbols = symbolTable.getAllSymbols();

      // Find the chained reference for ScopeExample.b
      const chainedRef = references.find(
        (ref) => ref.name === 'ScopeExample.b' && isChainedSymbolReference(ref),
      );
      expect(chainedRef).toBeDefined();

      // Chained reference should be resolved to the field, not the class
      expect(chainedRef?.resolvedSymbolId).toBeDefined();

      // Verify it resolves to the field symbol
      const resolvedSymbol = allSymbols.find(
        (s) => s.id === chainedRef?.resolvedSymbolId,
      );
      expect(resolvedSymbol).toBeDefined();
      expect(resolvedSymbol?.kind).toBe(SymbolKind.Field);
      expect(resolvedSymbol?.name).toBe('b');

      // Verify chain nodes are also resolved
      const chainedRefTyped = chainedRef as any;
      expect(chainedRefTyped?.chainNodes).toBeDefined();
      expect(chainedRefTyped?.chainNodes).toHaveLength(2);

      // First node (qualifier) should resolve to the class
      const firstNode = chainedRefTyped.chainNodes[0];
      expect(firstNode.name).toBe('ScopeExample');
      expect(firstNode.resolvedSymbolId).toBeDefined();

      // Last node (member) should resolve to the field
      const lastNode = chainedRefTyped.chainNodes[1];
      expect(lastNode.name).toBe('b');
      expect(lastNode.resolvedSymbolId).toBeDefined();
      const memberSymbol = allSymbols.find(
        (s) => s.id === lastNode.resolvedSymbolId,
      );
      expect(memberSymbol).toBeDefined();
      expect(memberSymbol?.kind).toBe(SymbolKind.Field);
      expect(memberSymbol?.name).toBe('b');
    });

    it('should not resolve chained reference for cross-file references', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            FileUtilities.createFile('test.txt', 'content');
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TestClass.cls', listener);
      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      // Find the chained reference for FileUtilities.createFile
      const chainedRef = references.find(
        (ref) =>
          ref.name === 'FileUtilities.createFile' &&
          isChainedSymbolReference(ref),
      );
      expect(chainedRef).toBeDefined();

      // Chained reference should NOT be resolved for cross-file references
      // (FileUtilities is not defined in this file)
      expect(chainedRef?.resolvedSymbolId).toBeUndefined();

      // Chain nodes should also not be resolved
      const chainedRefTyped = chainedRef as any;
      if (chainedRefTyped?.chainNodes) {
        for (const node of chainedRefTyped.chainNodes) {
          expect(node.resolvedSymbolId).toBeUndefined();
        }
      }
    });
  });

  describe('Incomplete member access', () => {
    it('captures an incomplete indexed receiver without reconstructing source text', () => {
      const sourceCode = `public class TestClass {
  class Row { Integer value; }
  public void testMethod() {
    List<Row> rows = new List<Row>();
    rows[0].
  }
}`;
      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TestClass.cls', listener);

      const reference = listener
        .getResult()
        .getAllReferences()
        .find(
          (candidate) =>
            candidate.name === 'rows' &&
            candidate.semanticContext?.indexedAccess &&
            candidate.semanticContext.memberAccess?.incomplete,
        );

      expect(reference?.semanticContext).toEqual(
        expect.objectContaining({
          indexedAccess: expect.objectContaining({
            kind: 'indexed-access',
            receiverRange: expect.objectContaining({
              startLine: 5,
              startColumn: 4,
            }),
            indexRange: expect.objectContaining({
              startLine: 5,
              startColumn: 9,
            }),
          }),
          memberAccess: expect.objectContaining({
            kind: 'member-access',
            incomplete: true,
            operatorRange: expect.objectContaining({
              startLine: 5,
              startColumn: 11,
            }),
          }),
        }),
      );
    });

    it('does not synthesize a method or corrupt scope after a missing method identifier', () => {
      const sourceCode = `public class TestClass {
  public void testMethod() {
    String skippedBodyValue;
  }
  public void validMethod() {
    String ;
    String retainedValue;
    consume(retainedValue);
  }
}`;
      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TestClass.cls', listener);
      const symbolTable = listener.getResult();

      expect(
        symbolTable
          .getAllSymbols()
          .some((symbol) =>
            ['unknownMethod', 'unknownVariable', 'unknownParameter'].includes(
              symbol.name,
            ),
          ),
      ).toBe(false);
      expect(
        symbolTable
          .getAllSymbols()
          .some(
            (symbol) =>
              symbol.name === 'validMethod' &&
              symbol.kind === SymbolKind.Method,
          ),
      ).toBe(true);
      expect(
        symbolTable
          .getAllReferences()
          .find((reference) => reference.name === 'consume')?.parentContext,
      ).toBe('validMethod');
    });

    it.each(['property.', 'property.Bed'])(
      'captures %s from parser error nodes with structural ranges',
      (expression) => {
        const sourceCode = `public class TestClass {
  public void testMethod() {
    Property__c property = new Property__c();
    insert property;
    ${expression}
  }
}`;
        const listener = new ApexSymbolCollectorListener();
        compilerService.compile(sourceCode, 'TestClass.cls', listener);

        const reference = listener
          .getResult()
          .getAllReferences()
          .find(
            (candidate) =>
              candidate.semanticContext?.memberAccess?.kind === 'member-access',
          );

        expect(reference).toEqual(
          expect.objectContaining({
            name: 'property',
            context: ReferenceContext.VARIABLE_USAGE,
            resolvedSymbolId: expect.stringContaining('property'),
            semanticContext: expect.objectContaining({
              memberAccess: expect.objectContaining({
                kind: 'member-access',
                incomplete: true,
                receiverRange: expect.objectContaining({
                  startLine: 5,
                  startColumn: 4,
                }),
                operatorRange: expect.objectContaining({
                  startLine: 5,
                  startColumn: 12,
                }),
              }),
            }),
          }),
        );
        if (expression.endsWith('Bed')) {
          expect(reference?.semanticContext?.memberAccess?.memberRange).toEqual(
            expect.objectContaining({
              startLine: 5,
              startColumn: 13,
              endColumn: 16,
            }),
          );
        }
      },
    );

    it('attaches a trailing dot to the parser-owned method-call chain', () => {
      const sourceCode = `public class TestClass {
  TestClass load() { return null; }
  public void testMethod() {
    TestClass service = new TestClass();
    service.load().
  }
}`;
      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TestClass.cls', listener);

      const reference = listener
        .getResult()
        .getAllReferences()
        .find(
          (candidate) =>
            candidate.name === 'service.load' &&
            candidate.semanticContext?.memberAccess?.kind === 'member-access',
        );

      expect(reference).toEqual(
        expect.objectContaining({
          context: ReferenceContext.METHOD_CALL,
          resolvedSymbolId: expect.stringContaining('load'),
          semanticContext: expect.objectContaining({
            memberAccess: expect.objectContaining({
              incomplete: true,
              operatorRange: expect.objectContaining({
                startLine: 5,
                startColumn: 18,
              }),
            }),
          }),
        }),
      );
    });
  });

  describe('DML semantic context', () => {
    it('annotates operands for every DML operation without creating keyword references', () => {
      const sourceCode = `public class DmlContexts {
  public void run() {
    Account record;
    List<Account> duplicates;
    insert record;
    update record;
    delete record;
    undelete record;
    upsert record Account.External_Id__c;
    merge record duplicates;
  }
}`;
      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'DmlContexts.cls', listener);
      const references = listener.getResult().getAllReferences();
      const dmlReferences = references.filter(
        (reference) => reference.semanticContext?.dml,
      );

      expect(
        dmlReferences
          .filter((reference) => reference.semanticContext?.dml?.isOperandRoot)
          .map((reference) => reference.semanticContext?.dml?.operation),
      ).toEqual(
        expect.arrayContaining([
          'insert',
          'update',
          'delete',
          'undelete',
          'upsert',
          'merge',
        ]),
      );
      expect(
        dmlReferences.some(
          (reference) =>
            reference.semanticContext?.dml?.operation === 'merge' &&
            reference.semanticContext.dml.operandRole === 'duplicate',
        ),
      ).toBe(true);
      expect(
        dmlReferences.find(
          (reference) => reference.semanticContext?.dml?.operation === 'upsert',
        )?.semanticContext?.dml?.upsertFieldRange,
      ).toBeDefined();
      expect(
        references.some((reference) =>
          [
            'insert',
            'update',
            'delete',
            'undelete',
            'upsert',
            'merge',
          ].includes(reference.name.toLowerCase()),
        ),
      ).toBe(false);
    });
  });

  describe('Invocation result context', () => {
    it('captures declared and existing assignment targets from parser structure', () => {
      const sourceCode = `public class InvocationTargets {
  public String calculate() { return ''; }
  public void run() {
    String declaredValue = calculate();
    String existingValue;
    existingValue = calculate();
  }
}`;
      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'InvocationTargets.cls', listener);
      const calls = listener
        .getResult()
        .getAllReferences()
        .filter(
          (reference) =>
            reference.name === 'calculate' &&
            reference.context === ReferenceContext.METHOD_CALL,
        );

      expect(calls).toHaveLength(2);
      expect(calls[0].semanticContext?.invocation?.resultTarget).toEqual(
        expect.objectContaining({
          kind: 'declared-variable',
          targetIdentifier: 'declaredValue',
          expectedType: 'String',
          expectedTypeShape: expect.objectContaining({
            name: 'String',
            isArray: false,
            isCollection: false,
          }),
        }),
      );
      expect(calls[1].semanticContext?.invocation?.resultTarget).toEqual(
        expect.objectContaining({
          kind: 'assignment',
          targetIdentifier: 'existingValue',
        }),
      );
    });
  });

  describe('Invalid void declarations', () => {
    it('preserves parser-owned void recovery without inventing declarations', () => {
      const sourceCode = `public class InvalidVoidDeclarations {
  void fieldValue;
  void propertyValue { get; set; }
  public void run(void parameterValue) {
    void localValue;
  }
}`;
      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(
        sourceCode,
        'InvalidVoidDeclarations.cls',
        listener,
      );
      const symbols = listener.getResult().getAllSymbols();

      // The grammar recovers each class member as a method declaration because
      // `void` is only a legal method return type. Preserve those concrete
      // parser facts rather than reinterpreting malformed tokens as fields or
      // properties.
      for (const name of ['fieldValue', 'propertyValue', 'run']) {
        expect(
          symbols.find(
            (symbol) =>
              symbol.kind === SymbolKind.Method && symbol.name === name,
          ),
        ).toEqual(
          expect.objectContaining({
            returnType: expect.objectContaining({ name: 'void' }),
          }),
        );
      }

      // The recovered formal parameter has no identifier, and the local line
      // is an expression plus an error node. Neither is a declaration-shaped
      // parser fact, so the collector must preserve that uncertainty instead
      // of synthesizing symbols from token order or source text.
      expect(
        symbols.some(
          (symbol) =>
            symbol.kind === SymbolKind.Parameter &&
            symbol.name === 'parameterValue',
        ),
      ).toBe(false);
      expect(
        symbols.some(
          (symbol) =>
            symbol.kind === SymbolKind.Variable && symbol.name === 'localValue',
        ),
      ).toBe(false);
    });
  });

  describe('ChainedSymbolReference vs Array Access', () => {
    it('should use ChainedSymbolReference for contacts.Id', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            Contact contacts = new Contact();
            String id = contacts.Id;
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TestClass.cls', listener);
      const references = listener.getResult().getAllReferences();

      // Should have ChainedSymbolReference for contacts.Id
      const chainedRefs = references.filter((ref) =>
        isChainedSymbolReference(ref),
      );
      expect(chainedRefs.length).toBeGreaterThanOrEqual(1);
      expect(chainedRefs.some((r) => r.name === 'contacts.Id')).toBe(true);
    });

    it('should use VARIABLE_USAGE for contacts[0], not ChainedSymbolReference', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            List<Contact> contacts = new List<Contact>();
            Contact c = contacts[0];
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'TestClass.cls', listener);
      const references = listener.getResult().getAllReferences();

      // Should have VARIABLE_USAGE for contacts
      const contactsRefs = references.filter(
        (r) =>
          r.name === 'contacts' &&
          r.context === ReferenceContext.VARIABLE_USAGE,
      );
      expect(contactsRefs.length).toBeGreaterThanOrEqual(1);

      // Should NOT have ChainedSymbolReference for contacts[0]
      const chainedRefs = references.filter(
        (ref) => isChainedSymbolReference(ref) && ref.name.includes('contacts'),
      );
      expect(chainedRefs.length).toBe(0);
    });
  });
});
