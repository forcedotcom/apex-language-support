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

      // With enhanced reference capture, we now get:
      // 1. CLASS_REFERENCE for FileUtilities
      // 2. METHOD_CALL for createFile
      // 3. VARIABLE_USAGE for base64Data (parameter)
      // 4. VARIABLE_USAGE for fileName (parameter)
      // 5. VARIABLE_USAGE for recordId (parameter)
      // 6. VARIABLE_USAGE for FileUtilities (as part of expression)
      expect(references).toHaveLength(6);

      // Check for CLASS_REFERENCE (FileUtilities)
      const classRef = references.find(
        (ref) =>
          ref.name === 'FileUtilities' &&
          ref.context === ReferenceContext.CLASS_REFERENCE,
      );
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
      expect(methodRef?.qualifier).toBeUndefined();
      expect(methodRef?.parentContext).toBe('testMethod');

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

      // With enhanced reference capture, this complex test captures many more references:
      // - Type declarations (Property__c, String, etc.)
      // - Constructor calls (Property__c, ContentVersion)
      // - Variable usage (property, base64Data, fileName, recordId, contentDocumentLinkId)
      // - Field access (property.Id)
      // - Method calls (FileUtilities.createFile, Assert.isNotNull)
      // - Class references (FileUtilities, Assert)
      // And more...
      expect(references.length).toBeGreaterThan(10);

      // Check CLASS_REFERENCE location accuracy
      const classRef = references.find(
        (ref) =>
          ref.name === 'FileUtilities' &&
          ref.context === ReferenceContext.CLASS_REFERENCE,
      );
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

      // Check for some key references that should exist in this complex test
      const fileUtilitiesRef = references.find(
        (ref) =>
          ref.name === 'FileUtilities' &&
          ref.context === ReferenceContext.CLASS_REFERENCE,
      );
      expect(fileUtilitiesRef).toBeDefined();
      expect(fileUtilitiesRef?.location.startLine).toBeGreaterThan(0);
      expect(fileUtilitiesRef?.location.endLine).toBeGreaterThan(0);

      const createFileRef = references.find((ref) => ref.name === 'createFile');
      expect(createFileRef).toBeDefined();
      expect(createFileRef?.location.startLine).toBeGreaterThan(0);
      expect(createFileRef?.location.endLine).toBeGreaterThan(0);

      const assertRef = references.find(
        (ref) =>
          ref.name === 'Assert' &&
          ref.context === ReferenceContext.CLASS_REFERENCE,
      );
      expect(assertRef).toBeDefined();
      expect(assertRef?.location.startLine).toBeGreaterThan(0);
      expect(assertRef?.location.endLine).toBeGreaterThan(0);
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

      // With enhanced reference capture, we now get:
      // 1. CLASS_REFERENCE for FileUtilities
      // 2. METHOD_CALL for createFile
      // 3. VARIABLE_USAGE for data (parameter)
      // 4. VARIABLE_USAGE for name (parameter)
      // 5. VARIABLE_USAGE for id (parameter)
      // 6. VARIABLE_USAGE for FileUtilities (as part of expression)
      expect(references).toHaveLength(6);

      // Check CLASS_REFERENCE location accuracy
      const classRef = references.find(
        (ref) =>
          ref.name === 'FileUtilities' &&
          ref.context === ReferenceContext.CLASS_REFERENCE,
      );
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
