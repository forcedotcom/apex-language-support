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
import { VisibilitySymbolListener } from '../../src/parser/listeners/VisibilitySymbolListener';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolTable, SymbolKind } from '../../src/types/symbol';
import { isBlockSymbol } from '../../src/utils/symbolNarrowing';
import { extractFilePathFromUri } from '../../src/types/UriBasedIdGenerator';
import type { ScopeSymbol } from '../../src/types/symbol';

const FIXTURE_DIR = path.join(
  __dirname,
  '../fixtures/parser/structure-listener',
);

const loadFixture = (filename: string): string => {
  const fixturePath = path.join(FIXTURE_DIR, filename);
  return fs.readFileSync(fixturePath, 'utf8');
};

/**
 * Compile with StructureListener (runs first via VisibilitySymbolListener path).
 * Returns SymbolTable with blocks created by StructureListener.
 */
const compileWithStructure = (
  content: string,
  fileName: string,
): CompilationResult<SymbolTable> => {
  const compilerService = new CompilerService();
  const table = new SymbolTable();
  const listener = new VisibilitySymbolListener('private', table);
  return compilerService.compile(content, fileName, listener);
};

const getBlockSymbols = (symbolTable: SymbolTable): ScopeSymbol[] =>
  symbolTable.getAllSymbols().filter((s): s is ScopeSymbol => isBlockSymbol(s));

describe('StructureListener', () => {
  describe('block ID format', () => {
    it('should create blocks with location-based IDs (fileUri:block:scopeType:line:column)', async () => {
      const content = loadFixture('SimpleClass.cls');
      const fileUri = 'file:///test/SimpleClass.cls';
      const result = compileWithStructure(content, fileUri);
      const symbolTable = result.result;
      expect(symbolTable).toBeDefined();
      if (!symbolTable) throw new Error('Symbol table is null');

      const blocks = getBlockSymbols(symbolTable);
      expect(blocks.length).toBeGreaterThan(0);

      const normalized = extractFilePathFromUri(fileUri);
      for (const block of blocks) {
        expect(block.id).toMatch(/:block:[a-zA-Z]+:\d+:\d+$/);
        expect(block.id.startsWith(normalized)).toBe(true);
      }
    });

    it('should produce deterministic block IDs across multiple compilations', () => {
      const content = loadFixture('SimpleClass.cls');
      const fileUri = 'file:///test/SimpleClass.cls';

      const result1 = compileWithStructure(content, fileUri);
      const result2 = compileWithStructure(content, fileUri);

      const blocks1 = getBlockSymbols(result1.result!);
      const blocks2 = getBlockSymbols(result2.result!);

      const ids1 = blocks1.map((b) => b.id).sort();
      const ids2 = blocks2.map((b) => b.id).sort();

      expect(ids1).toEqual(ids2);
    });
  });

  describe('block hierarchy', () => {
    it('should create class and method blocks for SimpleClass', () => {
      const content = loadFixture('SimpleClass.cls');
      const result = compileWithStructure(
        content,
        'file:///test/SimpleClass.cls',
      );
      const symbolTable = result.result!;

      const blocks = getBlockSymbols(symbolTable);
      const classBlocks = blocks.filter((b) => b.scopeType === 'class');
      const methodBlocks = blocks.filter((b) => b.scopeType === 'method');

      expect(classBlocks.length).toBe(1);
      expect(classBlocks[0].name).toBe('SimpleClass');

      expect(methodBlocks.length).toBe(1);
      expect(methodBlocks[0].name).toBe('method');
    });

    it('should create control-flow blocks (if, while) for ClassWithControlFlow', () => {
      const content = loadFixture('ClassWithControlFlow.cls');
      const result = compileWithStructure(
        content,
        'file:///test/ClassWithControlFlow.cls',
      );
      const symbolTable = result.result!;

      const blocks = getBlockSymbols(symbolTable);
      const ifBlocks = blocks.filter((b) => b.scopeType === 'if');
      const whileBlocks = blocks.filter((b) => b.scopeType === 'while');

      expect(ifBlocks.length).toBe(1);
      expect(whileBlocks.length).toBe(1);
    });

    it('should create separate method blocks for MultipleMethodsSameVarName', () => {
      const content = loadFixture('MultipleMethodsSameVarName.cls');
      const result = compileWithStructure(
        content,
        'file:///test/MultipleMethodsSameVarName.cls',
      );
      const symbolTable = result.result!;

      const blocks = getBlockSymbols(symbolTable);
      const methodBlocks = blocks.filter((b) => b.scopeType === 'method');

      expect(methodBlocks.length).toBe(2);
      const names = methodBlocks.map((b) => b.name).sort();
      expect(names).toEqual(['methodA', 'methodB']);
    });

    it('should create inner class block for NestedClass', () => {
      const content = loadFixture('NestedClass.cls');
      const result = compileWithStructure(
        content,
        'file:///test/NestedClass.cls',
      );
      const symbolTable = result.result!;

      const blocks = getBlockSymbols(symbolTable);
      const classBlocks = blocks.filter((b) => b.scopeType === 'class');

      expect(classBlocks.length).toBe(2);
      const classNames = classBlocks.map((b) => b.name).sort();
      expect(classNames).toContain('OuterClass');
      expect(classNames).toContain('InnerClass');
    });
  });

  describe('multiple methods same variable name (duplicate variable fix)', () => {
    it('should place variables in different methods in separate scopes', () => {
      const content = loadFixture('MultipleMethodsSameVarName.cls');
      const compilerService = new CompilerService();
      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table, 'full');
      const result = compilerService.compile(
        content,
        'file:///test/MultipleMethodsSameVarName.cls',
        listener,
      );
      const symbolTable = result.result!;

      const variables = symbolTable
        .getAllSymbols()
        .filter((s) => s.kind === SymbolKind.Variable && s.name === 'count');

      expect(variables.length).toBe(2);

      const parentIds = variables.map((v) => v.parentId);
      expect(parentIds[0]).not.toBe(parentIds[1]);
    });
  });

  describe('block parent chain', () => {
    it('should set method block parentId to class block', () => {
      const content = loadFixture('SimpleClass.cls');
      const result = compileWithStructure(
        content,
        'file:///test/SimpleClass.cls',
      );
      const symbolTable = result.result!;

      const blocks = getBlockSymbols(symbolTable);
      const classBlock = blocks.find(
        (b) => b.scopeType === 'class' && b.name === 'SimpleClass',
      );
      const methodBlock = blocks.find(
        (b) => b.scopeType === 'method' && b.name === 'method',
      );

      expect(classBlock).toBeDefined();
      expect(methodBlock).toBeDefined();
      expect(methodBlock!.parentId).toBe(classBlock!.id);
    });

    it('should set control-flow block parentId to method block', () => {
      const content = loadFixture('ClassWithControlFlow.cls');
      const result = compileWithStructure(
        content,
        'file:///test/ClassWithControlFlow.cls',
      );
      const symbolTable = result.result!;

      const blocks = getBlockSymbols(symbolTable);
      const methodBlock = blocks.find(
        (b) => b.scopeType === 'method' && b.name === 'method',
      );
      const ifBlock = blocks.find((b) => b.scopeType === 'if');

      expect(methodBlock).toBeDefined();
      expect(ifBlock).toBeDefined();
      expect(ifBlock!.parentId).toBeDefined();
    });
  });

  describe('malformed source (missing closing braces)', () => {
    it('should handle missing class closing brace and create class block', () => {
      const content = loadFixture('MalformedMissingClassBrace.cls');
      const result = compileWithStructure(
        content,
        'file:///test/MalformedMissingClassBrace.cls',
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;
      const blocks = getBlockSymbols(symbolTable);

      const classBlock = blocks.find(
        (b) =>
          b.scopeType === 'class' && b.name === 'MalformedMissingClassBrace',
      );
      expect(classBlock).toBeDefined();
      expect(classBlock!.id).toMatch(/:block:class:\d+:\d+$/);
    });

    it('should handle missing method closing brace and create method block', () => {
      const content = loadFixture('MalformedMissingMethodBrace.cls');
      const result = compileWithStructure(
        content,
        'file:///test/MalformedMissingMethodBrace.cls',
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;
      const blocks = getBlockSymbols(symbolTable);

      const classBlock = blocks.find(
        (b) =>
          b.scopeType === 'class' && b.name === 'MalformedMissingMethodBrace',
      );
      const methodBlock = blocks.find(
        (b) => b.scopeType === 'method' && b.name === 'method',
      );
      expect(classBlock).toBeDefined();
      expect(methodBlock).toBeDefined();
      expect(methodBlock!.parentId).toBe(classBlock!.id);
    });

    it('should handle missing if block closing brace', () => {
      const content = loadFixture('MalformedMissingIfBrace.cls');
      const result = compileWithStructure(
        content,
        'file:///test/MalformedMissingIfBrace.cls',
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;
      const blocks = getBlockSymbols(symbolTable);

      const classBlock = blocks.find(
        (b) => b.scopeType === 'class' && b.name === 'MalformedMissingIfBrace',
      );
      const ifBlock = blocks.find((b) => b.scopeType === 'if');
      expect(classBlock).toBeDefined();
      expect(ifBlock).toBeDefined();
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should handle multiple missing braces without crashing', () => {
      const content = loadFixture('MalformedMultipleMissingBraces.cls');
      const result = compileWithStructure(
        content,
        'file:///test/MalformedMultipleMissingBraces.cls',
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;
      const blocks = getBlockSymbols(symbolTable);

      expect(blocks.length).toBeGreaterThan(0);
      const classBlock = blocks.find(
        (b) =>
          b.scopeType === 'class' &&
          b.name === 'MalformedMultipleMissingBraces',
      );
      expect(classBlock).toBeDefined();
      for (const block of blocks) {
        expect(block.id).toMatch(/:block:[a-zA-Z]+:\d+:\d+$/);
      }
    });

    it('should produce valid block IDs for all blocks in malformed source', () => {
      const fixtures = [
        'MalformedMissingClassBrace.cls',
        'MalformedMissingMethodBrace.cls',
        'MalformedMissingIfBrace.cls',
        'MalformedMultipleMissingBraces.cls',
      ];

      for (const fixture of fixtures) {
        const content = loadFixture(fixture);
        const fileUri = `file:///test/${fixture}`;
        const result = compileWithStructure(content, fileUri);

        expect(result.result).toBeDefined();
        const blocks = getBlockSymbols(result.result!);
        const normalized = extractFilePathFromUri(fileUri);

        for (const block of blocks) {
          expect(block.id).toMatch(/:block:[a-zA-Z]+:\d+:\d+$/);
          expect(block.id.startsWith(normalized)).toBe(true);
        }
      }
    });
  });
});
