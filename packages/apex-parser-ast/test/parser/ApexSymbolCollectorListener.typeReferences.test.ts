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
      
      expect(references).toHaveLength(1);
      expect(references[0].name).toBe('createFile');
      expect(references[0].context).toBe(ReferenceContext.METHOD_CALL);
      expect(references[0].qualifier).toBe('FileUtilities');
      expect(references[0].parentContext).toBe('testMethod');
      expect(references[0].isResolved).toBe(false);
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
      
      expect(references).toHaveLength(2);
      
      const propertyRef = references.find(ref => ref.name === 'Property__c');
      expect(propertyRef).toBeDefined();
      expect(propertyRef?.context).toBe(ReferenceContext.TYPE_DECLARATION);
      expect(propertyRef?.parentContext).toBe('testMethod');
      
      const stringRef = references.find(ref => ref.name === 'String');
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
      const fieldAccessRefs = references.filter(ref => ref.context === ReferenceContext.FIELD_ACCESS);
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
          public void testMethod() {
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
      
      const constructorRefs = references.filter(ref => ref.context === ReferenceContext.CONSTRUCTOR_CALL);
      expect(constructorRefs).toHaveLength(2);
      
      const propertyConstructor = constructorRefs.find(ref => ref.name === 'Property__c');
      expect(propertyConstructor).toBeDefined();
      expect(propertyConstructor?.parentContext).toBe('testMethod');
      
      const contentVersionConstructor = constructorRefs.find(ref => ref.name === 'ContentVersion');
      expect(contentVersionConstructor).toBeDefined();
      expect(contentVersionConstructor?.parentContext).toBe('testMethod');
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
      const methodCallRefs = references.filter(ref => ref.context === ReferenceContext.METHOD_CALL);
      expect(methodCallRefs.length).toBeGreaterThan(0);
      
      // Check for type declaration references
      const typeDeclRefs = references.filter(ref => ref.context === ReferenceContext.TYPE_DECLARATION);
      expect(typeDeclRefs.length).toBeGreaterThan(0);
      
      // Check for field access references
      const fieldAccessRefs = references.filter(ref => ref.context === ReferenceContext.FIELD_ACCESS);
      expect(fieldAccessRefs.length).toBeGreaterThan(0);
      
      // Check for constructor call references
      const constructorRefs = references.filter(ref => ref.context === ReferenceContext.CONSTRUCTOR_CALL);
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
      
      expect(references).toHaveLength(1);
      const reference = references[0];
      
      // Location should be accurate
      expect(reference.location.startLine).toBeGreaterThan(0);
      expect(reference.location.endLine).toBeGreaterThan(0);
      expect(reference.location.startColumn).toBeGreaterThanOrEqual(0);
      expect(reference.location.endColumn).toBeGreaterThan(0);
      
      // End should be after start
      expect(reference.location.endLine).toBeGreaterThanOrEqual(reference.location.startLine);
      if (reference.location.endLine === reference.location.startLine) {
        expect(reference.location.endColumn).toBeGreaterThan(reference.location.startColumn);
      }
    });
  });
}); 