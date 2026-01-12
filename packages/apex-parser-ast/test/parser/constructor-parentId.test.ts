/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  CompilerService,
  CompilationResult,
} from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  SymbolTable,
  SymbolKind,
  MethodSymbol,
  ScopeSymbol,
} from '../../src/types/symbol';
import { TestLogger } from '../utils/testLogger';
import { isBlockSymbol, isMethodSymbol } from '../../src/utils/symbolNarrowing';

/**
 * Read a fixture file from the constructor-parentId fixtures directory
 * @param filename The name of the fixture file
 * @returns The contents of the fixture file
 */
const readFixture = (filename: string): string => {
  const fixturePath = path.join(
    __dirname,
    '../fixtures/constructor-parentId',
    filename,
  );
  return fs.readFileSync(fixturePath, 'utf8');
};

describe('Constructor ParentId Relationships - ApexSymbolCollectorListener', () => {
  let compilerService: CompilerService;
  let logger: TestLogger;

  beforeEach(() => {
    logger = TestLogger.getInstance();
    logger.debug('Setting up test environment');
    compilerService = new CompilerService();
  });

  describe('Top-Level Class Constructor ParentId', () => {
    it('should set constructor parentId to top-level class block', () => {
      logger.debug('Testing top-level class constructor parentId');

      const apexCode = readFixture('OuterClass.cls');
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        apexCode,
        'OuterClass.cls',
        listener,
      );

      // Should not have compilation errors
      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));

      // Find outer class symbol
      const outerClassSymbol = semanticSymbols.find(
        (s) => s.name === 'OuterClass' && s.kind === SymbolKind.Class,
      );
      expect(outerClassSymbol).toBeDefined();

      // Find outer class block by parentId pointing to class symbol
      const outerClassBlock = allSymbols.find(
        (s) =>
          isBlockSymbol(s) &&
          s.scopeType === 'class' &&
          s.parentId === outerClassSymbol!.id,
      ) as ScopeSymbol | undefined;
      expect(outerClassBlock).toBeDefined();

      // Find constructor symbol - should be in outer class block scope
      const constructorSymbols = allSymbols.filter(
        (s) =>
          (isMethodSymbol(s) && s.isConstructor) ||
          s.kind === SymbolKind.Constructor,
      ) as MethodSymbol[];

      const constructor = constructorSymbols.find(
        (s) => s.name === 'OuterClass',
      );
      expect(constructor).toBeDefined();
      expect(constructor!.isConstructor).toBe(true);

      // CRITICAL: Constructor's parentId should point to the class block, not the class symbol
      expect(constructor!.parentId).toBe(outerClassBlock!.id);
      expect(constructor!.parentId).not.toBe(outerClassSymbol!.id);
    });

    it('should handle multiple inner classes with constructors', () => {
      logger.debug('Testing multiple inner classes');

      const apexCode = readFixture('MultipleClasses.cls');
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        apexCode,
        'MultipleClasses.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));

      // Find both classes
      const classA = semanticSymbols.find(
        (s) => s.name === 'ClassA' && s.kind === SymbolKind.Class,
      );
      const classB = semanticSymbols.find(
        (s) => s.name === 'ClassB' && s.kind === SymbolKind.Class,
      );
      expect(classA).toBeDefined();
      expect(classB).toBeDefined();

      // Find class blocks
      const classABlock = allSymbols.find(
        (s) =>
          isBlockSymbol(s) &&
          s.scopeType === 'class' &&
          s.parentId === classA!.id,
      ) as ScopeSymbol | undefined;
      const classBBlock = allSymbols.find(
        (s) =>
          isBlockSymbol(s) &&
          s.scopeType === 'class' &&
          s.parentId === classB!.id,
      ) as ScopeSymbol | undefined;
      expect(classABlock).toBeDefined();
      expect(classBBlock).toBeDefined();

      // Find constructors
      const constructorA = allSymbols.find(
        (s) =>
          ((isMethodSymbol(s) && s.isConstructor) ||
            s.kind === SymbolKind.Constructor) &&
          s.name === 'ClassA',
      ) as MethodSymbol | undefined;
      const constructorB = allSymbols.find(
        (s) =>
          ((isMethodSymbol(s) && s.isConstructor) ||
            s.kind === SymbolKind.Constructor) &&
          s.name === 'ClassB',
      ) as MethodSymbol | undefined;

      expect(constructorA).toBeDefined();
      expect(constructorB).toBeDefined();

      // Each constructor should point to its own class block
      expect(constructorA!.parentId).toBe(classABlock!.id);
      expect(constructorB!.parentId).toBe(classBBlock!.id);
    });
  });

  describe('Inner Class Constructor ParentId', () => {
    it('should set inner class constructor parentId to inner class block', () => {
      logger.debug('Testing inner class constructor parentId');

      const apexCode = readFixture('OuterWithInner.cls');
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        apexCode,
        'OuterWithInner.cls',
        listener,
      );

      // Should not have compilation errors
      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));

      // Find outer class symbol
      const outerClassSymbol = semanticSymbols.find(
        (s) => s.name === 'OuterClass' && s.kind === SymbolKind.Class,
      );
      expect(outerClassSymbol).toBeDefined();

      // Find outer class block
      const outerClassBlock = allSymbols.find(
        (s) =>
          isBlockSymbol(s) &&
          s.scopeType === 'class' &&
          s.parentId === outerClassSymbol!.id,
      ) as ScopeSymbol | undefined;
      expect(outerClassBlock).toBeDefined();

      // Find inner class symbol - should have parentId pointing to outer class symbol
      const innerClassSymbol = semanticSymbols.find(
        (s) =>
          s.name === 'InnerClass' &&
          s.kind === SymbolKind.Class &&
          s.parentId === outerClassSymbol!.id,
      );
      expect(innerClassSymbol).toBeDefined();

      // Find inner class block - should have parentId pointing to inner class symbol
      const innerClassBlock = allSymbols.find(
        (s) =>
          isBlockSymbol(s) &&
          s.scopeType === 'class' &&
          s.parentId === innerClassSymbol!.id,
      ) as ScopeSymbol | undefined;

      // Debug: Log all class blocks if inner class block not found
      if (!innerClassBlock) {
        const allClassBlocks = allSymbols.filter(
          (s) => isBlockSymbol(s) && s.scopeType === 'class',
        );
        logger.debug(
          `Inner class block not found. Inner class symbol ID: ${innerClassSymbol!.id}. ` +
            `All class blocks: ${allClassBlocks.map((b) => `id=${b.id}, parentId=${b.parentId}, scopeType=${b.scopeType}`).join('; ')}`,
        );
        logger.debug(
          `All symbols: ${allSymbols.map((s) => `name=${s.name}, kind=${s.kind}, id=${s.id}, parentId=${s.parentId}`).join('; ')}`,
        );
      }
      expect(innerClassBlock).toBeDefined();

      // Find inner class constructor
      const constructor = allSymbols.find(
        (s) =>
          ((isMethodSymbol(s) && s.isConstructor) ||
            s.kind === SymbolKind.Constructor) &&
          s.name === 'InnerClass',
      ) as MethodSymbol | undefined;

      expect(constructor).toBeDefined();
      expect(constructor!.isConstructor).toBe(true);

      // CRITICAL: Inner class constructor's parentId should point to inner class block,
      // NOT the inner class symbol, and NOT the outer class block
      expect(constructor!.parentId).toBe(innerClassBlock!.id);
      expect(constructor!.parentId).not.toBe(innerClassSymbol!.id);
      expect(constructor!.parentId).not.toBe(outerClassBlock!.id);
      expect(constructor!.parentId).not.toBe(outerClassSymbol!.id);
    });

    it('should handle nested inner classes with constructors', () => {
      logger.debug('Testing nested inner classes');

      const apexCode = readFixture('NestedInnerClasses.cls');
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        apexCode,
        'NestedInnerClasses.cls',
        listener,
      );

      // Nested inner classes are invalid in Apex, so we expect 1 error
      // But symbols should still be collected for testing purposes
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain('nested inner class');

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));

      // Find all classes - use more flexible search
      const outerClass = semanticSymbols.find(
        (s) =>
          s.name === 'OuterClass' && s.kind === SymbolKind.Class && !s.parentId,
      );
      expect(outerClass).toBeDefined();

      // Find inner class - search all symbols with parentId matching outer class
      let innerClass = semanticSymbols.find(
        (s) =>
          s.name === 'InnerClass' &&
          s.kind === SymbolKind.Class &&
          s.parentId === outerClass!.id,
      );
      // Fallback: search all symbols if not found
      if (!innerClass) {
        innerClass = semanticSymbols.find(
          (s) => s.name === 'InnerClass' && s.kind === SymbolKind.Class,
        );
      }
      expect(innerClass).toBeDefined();

      // Find nested inner class - search with parentId matching inner class
      let nestedInnerClass = semanticSymbols.find(
        (s) =>
          s.name === 'NestedInnerClass' &&
          s.kind === SymbolKind.Class &&
          s.parentId === innerClass!.id,
      );
      // Fallback: search all symbols if not found
      if (!nestedInnerClass) {
        nestedInnerClass = semanticSymbols.find(
          (s) => s.name === 'NestedInnerClass' && s.kind === SymbolKind.Class,
        );
      }
      expect(nestedInnerClass).toBeDefined();

      // Find all class blocks
      const innerClassBlock = allSymbols.find(
        (s) =>
          isBlockSymbol(s) &&
          s.scopeType === 'class' &&
          s.parentId === innerClass!.id,
      ) as ScopeSymbol | undefined;
      const nestedInnerClassBlock = allSymbols.find(
        (s) =>
          isBlockSymbol(s) &&
          s.scopeType === 'class' &&
          s.parentId === nestedInnerClass!.id,
      ) as ScopeSymbol | undefined;

      expect(innerClassBlock).toBeDefined();
      expect(nestedInnerClassBlock).toBeDefined();

      // Find constructors
      const innerConstructor = allSymbols.find(
        (s) =>
          ((isMethodSymbol(s) && s.isConstructor) ||
            s.kind === SymbolKind.Constructor) &&
          s.name === 'InnerClass',
      ) as MethodSymbol | undefined;
      const nestedConstructor = allSymbols.find(
        (s) =>
          ((isMethodSymbol(s) && s.isConstructor) ||
            s.kind === SymbolKind.Constructor) &&
          s.name === 'NestedInnerClass',
      ) as MethodSymbol | undefined;

      expect(innerConstructor).toBeDefined();
      expect(nestedConstructor).toBeDefined();

      // Each constructor should point to its own class block
      expect(innerConstructor!.parentId).toBe(innerClassBlock!.id);
      expect(nestedConstructor!.parentId).toBe(nestedInnerClassBlock!.id);

      // Verify they don't point to wrong blocks
      expect(innerConstructor!.parentId).not.toBe(nestedInnerClassBlock!.id);
      expect(nestedConstructor!.parentId).not.toBe(innerClassBlock!.id);
    });
  });

  describe('Mixed Top-Level and Inner Class Constructors', () => {
    it('should correctly set parentId for both outer and inner class constructors', () => {
      logger.debug('Testing mixed outer and inner class constructors');

      const apexCode = readFixture('MixedConstructors.cls');
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        apexCode,
        'MixedConstructors.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));

      // Find classes
      const outerClass = semanticSymbols.find(
        (s) => s.name === 'OuterClass' && s.kind === SymbolKind.Class,
      );
      expect(outerClass).toBeDefined();

      // Find inner class - use fallback search if parentId doesn't match
      let innerClass = semanticSymbols.find(
        (s) =>
          s.name === 'InnerClass' &&
          s.kind === SymbolKind.Class &&
          s.parentId === outerClass!.id,
      );
      // Fallback: search all symbols if not found
      if (!innerClass) {
        innerClass = semanticSymbols.find(
          (s) => s.name === 'InnerClass' && s.kind === SymbolKind.Class,
        );
      }
      expect(innerClass).toBeDefined();

      // Find class blocks
      const outerClassBlock = allSymbols.find(
        (s) =>
          isBlockSymbol(s) &&
          s.scopeType === 'class' &&
          s.parentId === outerClass!.id,
      ) as ScopeSymbol | undefined;
      const innerClassBlock = allSymbols.find(
        (s) =>
          isBlockSymbol(s) &&
          s.scopeType === 'class' &&
          s.parentId === innerClass!.id,
      ) as ScopeSymbol | undefined;

      expect(outerClassBlock).toBeDefined();
      expect(innerClassBlock).toBeDefined();

      // Find constructors
      const outerConstructor = allSymbols.find(
        (s) =>
          ((isMethodSymbol(s) && s.isConstructor) ||
            s.kind === SymbolKind.Constructor) &&
          s.name === 'OuterClass',
      ) as MethodSymbol | undefined;
      const innerConstructor = allSymbols.find(
        (s) =>
          ((isMethodSymbol(s) && s.isConstructor) ||
            s.kind === SymbolKind.Constructor) &&
          s.name === 'InnerClass',
      ) as MethodSymbol | undefined;

      expect(outerConstructor).toBeDefined();
      expect(innerConstructor).toBeDefined();

      // Outer constructor should point to outer class block
      expect(outerConstructor!.parentId).toBe(outerClassBlock!.id);
      expect(outerConstructor!.parentId).not.toBe(outerClass!.id);

      // Inner constructor should point to inner class block
      expect(innerConstructor!.parentId).toBe(innerClassBlock!.id);
      expect(innerConstructor!.parentId).not.toBe(innerClass!.id);
      expect(innerConstructor!.parentId).not.toBe(outerClassBlock!.id);
      expect(innerConstructor!.parentId).not.toBe(outerClass!.id);
    });
  });
});
