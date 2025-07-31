/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { CompilerService } from '../../src/parser/compilerService';
import { ReferenceContext } from '../../src/types/typeReference';

describe('ApexSymbolCollectorListener with Type References', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  describe('Method Call References', () => {
    it('should capture method call references', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
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

      expect(references).toHaveLength(2);

      // Check for CLASS_REFERENCE (FileUtilities)
      const classRef = references.find((ref) => ref.name === 'FileUtilities');
      expect(classRef).toBeDefined();
      expect(classRef?.context).toBe(ReferenceContext.CLASS_REFERENCE);
      expect(classRef?.parentContext).toBe('testMethod');
      expect(classRef?.isResolved).toBe(false);

      // Check for METHOD_CALL (createFile)
      const methodRef = references.find((ref) => ref.name === 'createFile');
      expect(methodRef).toBeDefined();
      expect(methodRef?.context).toBe(ReferenceContext.METHOD_CALL);
      expect(methodRef?.qualifier).toBe('FileUtilities');
      expect(methodRef?.parentContext).toBe('testMethod');
      expect(methodRef?.isResolved).toBe(false);
    });

    it('should capture method call references without qualifier', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
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

      expect(references).toHaveLength(1);
      expect(references[0].name).toBe('createFile');
      expect(references[0].context).toBe(ReferenceContext.METHOD_CALL);
      expect(references[0].qualifier).toBeUndefined();
      expect(references[0].parentContext).toBe('testMethod');
    });
  });

  describe('Type Declaration References', () => {
    it('should capture type declaration references', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
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
      expect(propertyRef?.parentContext).toBe('testMethod');

      const stringRef = typeDeclRefs.find((ref) => ref.name === 'String');
      expect(stringRef).toBeDefined();
      expect(stringRef?.context).toBe(ReferenceContext.TYPE_DECLARATION);
      expect(stringRef?.parentContext).toBe('testMethod');
    });
  });

  describe('Field Access References', () => {
    it('should capture field access references', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            Property__c property = new Property__c();
            String id = property.Id;
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

      // Should have type declaration and field access references
      const fieldAccessRefs = references.filter(
        (ref) => ref.context === ReferenceContext.FIELD_ACCESS,
      );
      expect(fieldAccessRefs).toHaveLength(1);
      expect(fieldAccessRefs[0].name).toBe('Id');
      expect(fieldAccessRefs[0].qualifier).toBe('property');
      expect(fieldAccessRefs[0].parentContext).toBe('testMethod');
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

      // Should capture various types of references
      expect(references.length).toBeGreaterThan(0);

      // Check for method call reference
      const methodCallRefs = references.filter(
        (ref) => ref.context === ReferenceContext.METHOD_CALL,
      );
      expect(methodCallRefs.length).toBeGreaterThan(0);

      // Check for type declaration references
      const typeDeclRefs = references.filter(
        (ref) => ref.context === ReferenceContext.TYPE_DECLARATION,
      );
      expect(typeDeclRefs.length).toBeGreaterThan(0);

      // Check for field access references
      const fieldAccessRefs = references.filter(
        (ref) => ref.context === ReferenceContext.FIELD_ACCESS,
      );
      expect(fieldAccessRefs.length).toBeGreaterThan(0);

      // Check for constructor call references
      const constructorRefs = references.filter(
        (ref) => ref.context === ReferenceContext.CONSTRUCTOR_CALL,
      );
      expect(constructorRefs.length).toBeGreaterThan(0);
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

      expect(references).toHaveLength(2);

      // Check CLASS_REFERENCE location accuracy
      const classRef = references.find((ref) => ref.name === 'FileUtilities');
      expect(classRef).toBeDefined();
      expect(classRef?.location.startLine).toBeGreaterThan(0);
      expect(classRef?.location.endLine).toBeGreaterThan(0);
      expect(classRef?.location.startColumn).toBeGreaterThanOrEqual(0);
      expect(classRef?.location.endColumn).toBeGreaterThan(0);

      // Check METHOD_CALL location accuracy
      const methodRef = references.find((ref) => ref.name === 'createFile');
      expect(methodRef).toBeDefined();
      expect(methodRef?.location.startLine).toBeGreaterThan(0);
      expect(methodRef?.location.endLine).toBeGreaterThan(0);
      expect(methodRef?.location.startColumn).toBeGreaterThanOrEqual(0);
      expect(methodRef?.location.endColumn).toBeGreaterThan(0);

      // End should be after start for both references
      expect(classRef?.location.endLine).toBeGreaterThanOrEqual(
        classRef?.location.startLine || 0,
      );
      expect(methodRef?.location.endLine).toBeGreaterThanOrEqual(
        methodRef?.location.startLine || 0,
      );

      if (classRef?.location.endLine === classRef?.location.startLine) {
        expect(classRef?.location.endColumn).toBeGreaterThan(
          classRef?.location.startColumn || 0,
        );
      }
      if (methodRef?.location.endLine === methodRef?.location.startLine) {
        expect(methodRef?.location.endColumn).toBeGreaterThan(
          methodRef?.location.startColumn || 0,
        );
      }
    });
  });

  describe('Parameter Type References', () => {
    it('should capture parameter type references', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod(String param1, Property__c param2, List<String> param3, Map<String, Property__c> param4) {
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

      // Filter for parameter type references only
      const paramTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.PARAMETER_TYPE,
      );

      // Should capture: String, Property__c, List, String (from List<String>), Map, String, Property__c (from Map<String, Property__c>)
      expect(paramTypeRefs).toHaveLength(7);

      // Check for simple types
      const stringRefs = paramTypeRefs.filter((ref) => ref.name === 'String');
      expect(stringRefs).toHaveLength(3); // param1, and from List<String>, Map<String, Property__c>

      const propertyRefs = paramTypeRefs.filter(
        (ref) => ref.name === 'Property__c',
      );
      expect(propertyRefs).toHaveLength(2); // param2, and from Map<String, Property__c>

      // Check for generic base types
      const listRef = paramTypeRefs.find((ref) => ref.name === 'List');
      expect(listRef).toBeDefined();
      expect(listRef?.parentContext).toBe('testMethod');

      const mapRef = paramTypeRefs.find((ref) => ref.name === 'Map');
      expect(mapRef).toBeDefined();
      expect(mapRef?.parentContext).toBe('testMethod');
    });
  });
});
