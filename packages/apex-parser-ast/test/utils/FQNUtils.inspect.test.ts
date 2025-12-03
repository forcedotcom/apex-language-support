/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolTable, ApexSymbol, SymbolKind } from '../../src/types/symbol';
import { isBlockSymbol } from '../../src/utils/symbolNarrowing';
import { calculateFQN } from '../../src/utils/FQNUtils';
import {
  initializeResourceLoaderForTests,
  resetResourceLoader,
} from '../helpers/testHelpers';

let compilerService: CompilerService;

beforeAll(async () => {
  await initializeResourceLoaderForTests({ loadMode: 'lazy' });
  compilerService = new CompilerService();
});

afterAll(() => {
  resetResourceLoader();
});

// Helper function to compile Apex code and get symbols
const compileAndGetSymbols = (
  apexCode: string,
  fileUri: string = 'file:///test/TestClass.cls',
): {
  symbolTable: SymbolTable;
  getParent: (parentId: string) => ApexSymbol | null;
} => {
  const listener = new ApexSymbolCollectorListener();
  const result = compilerService.compile(apexCode, fileUri, listener);

  if (result.errors.length > 0) {
    console.warn('Compilation errors:', result.errors);
  }

  const symbolTable = result.result;
  if (!symbolTable) {
    throw new Error('No symbol table generated');
  }

  // Create getParent function that looks up from symbol table
  const getParent = (parentId: string): ApexSymbol | null => {
    const allSymbols = symbolTable.getAllSymbols();
    return allSymbols.find((s: ApexSymbol) => s.id === parentId) || null;
  };

  return { symbolTable, getParent };
};

// Helper to print the parent chain
const printParentChain = (
  symbol: ApexSymbol,
  getParent: (parentId: string) => ApexSymbol | null,
): void => {
  console.log('\n=== Parent Chain for:', symbol.name, `(${symbol.kind}) ===`);
  let current: ApexSymbol | null = symbol;
  let depth = 0;
  while (current && depth < 20) {
    const indent = '  '.repeat(depth);
    console.log(
      `${indent}${current.name} (${current.kind}${isBlockSymbol(current) ? `, scopeType: ${current.scopeType}` : ''}) [id: ${current.id}, parentId: ${current.parentId || 'null'}]`,
    );
    if (current.parentId) {
      current = getParent(current.parentId);
      depth++;
    } else {
      break;
    }
  }
  console.log('');
};

describe('FQN Hierarchy Inspection', () => {
  it('should inspect the complete hierarchy structure', () => {
    const apexCode = `
      public class MyClass {
        public void myMethod() {
          if (true) {
            String localVar = 'test';
          }
        }
      }
    `;

    const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
    const allSymbols = symbolTable.getAllSymbols();

    console.log('\n=== COMPLETE HIERARCHY STRUCTURE ===\n');

    // Find all relevant symbols
    const classSymbol = allSymbols.find(
      (s: ApexSymbol) => s.name === 'MyClass' && s.kind === SymbolKind.Class,
    );
    const classBlock = allSymbols.find(
      (s: ApexSymbol) =>
        isBlockSymbol(s) && s.name === 'MyClass' && s.scopeType === 'class',
    );
    const methodSymbol = allSymbols.find(
      (s: ApexSymbol) => s.name === 'myMethod' && s.kind === SymbolKind.Method,
    );
    const methodBlock = allSymbols.find(
      (s: ApexSymbol) =>
        isBlockSymbol(s) && s.name === 'myMethod' && s.scopeType === 'method',
    );
    const variableSymbol = allSymbols.find(
      (s: ApexSymbol) =>
        s.name === 'localVar' && s.kind === SymbolKind.Variable,
    );

    console.log('1. CLASS SYMBOL:');
    if (classSymbol) {
      console.log(`   ${classSymbol.name} (${classSymbol.kind})`);
      console.log(`   id: ${classSymbol.id}`);
      console.log(`   parentId: ${classSymbol.parentId || 'null'}`);
      console.log('   → Top-level symbol (root)');
    }

    console.log('\n2. CLASS BLOCK:');
    if (classBlock) {
      console.log(
        `   ${classBlock.name} (${classBlock.kind}, scopeType: ${classBlock.scopeType})`,
      );
      console.log(`   id: ${classBlock.id}`);
      console.log(`   parentId: ${classBlock.parentId}`);
      const classBlockParent = classBlock.parentId
        ? getParent(classBlock.parentId)
        : null;
      console.log(
        `   → Points to: ${classBlockParent?.name} (${classBlockParent?.kind})`,
      );
    }

    console.log('\n3. METHOD SYMBOL:');
    if (methodSymbol) {
      console.log(`   ${methodSymbol.name} (${methodSymbol.kind})`);
      console.log(`   id: ${methodSymbol.id}`);
      console.log(`   parentId: ${methodSymbol.parentId}`);
      const methodParent = methodSymbol.parentId
        ? getParent(methodSymbol.parentId)
        : null;
      console.log(
        `   → Points to: ${methodParent?.name} (${methodParent?.kind})`,
      );
      if (methodParent?.kind === SymbolKind.Class) {
        console.log(
          '   ⚠️  Method symbol points to CLASS SYMBOL, not class block!',
        );
      }
    }

    console.log('\n4. METHOD BLOCK:');
    if (methodBlock) {
      console.log(
        `   ${methodBlock.name} (${methodBlock.kind}, scopeType: ${methodBlock.scopeType})`,
      );
      console.log(`   id: ${methodBlock.id}`);
      console.log(`   parentId: ${methodBlock.parentId}`);
      const methodBlockParent = methodBlock.parentId
        ? getParent(methodBlock.parentId)
        : null;
      console.log(
        `   → Points to: ${methodBlockParent?.name} (${methodBlockParent?.kind})`,
      );
    }

    console.log('\n5. VARIABLE SYMBOL (localVar):');
    if (variableSymbol) {
      console.log(`   ${variableSymbol.name} (${variableSymbol.kind})`);
      console.log(`   id: ${variableSymbol.id}`);
      console.log(`   parentId: ${variableSymbol.parentId}`);
      console.log('\n   FULL PARENT CHAIN:');
      printParentChain(variableSymbol, getParent);

      const fqn = calculateFQN(
        variableSymbol,
        { normalizeCase: true },
        getParent,
      );
      console.log('\n6. RESULTING FQN:');
      console.log(`   ${fqn}`);
      console.log('\n   ISSUES:');
      console.log('   - Method name appears twice: "mymethod.mymethod"');
      console.log('   - Class block is missing from hierarchy');
      console.log(
        '   - Expected: myclass.block(n).mymethod.block1.if_2.block3.localvar',
      );
    }

    console.log('\n=== HIERARCHY SUMMARY ===');
    console.log('Current structure:');
    console.log('  MyClass (class) [root]');
    console.log('    └─ MyClass (block, class) [points to class]');
    console.log('    └─ myMethod (method) [points to class, NOT class block]');
    console.log('        └─ myMethod (block, method) [points to method]');
    console.log('            └─ block1 [points to method block]');
    console.log('                └─ if_2 [points to block1]');
    console.log('                    └─ block3 [points to if_2]');
    console.log('                        └─ localVar [points to block3]');
    console.log('\nDesired structure:');
    console.log('  MyClass (class) [root]');
    console.log('    └─ MyClass (block, class) [points to class]');
    console.log(
      '        └─ myMethod (block, method) [should point to class block]',
    );
    console.log('            └─ block1 [points to method block]');
    console.log('                └─ if_2 [points to block1]');
    console.log('                    └─ block3 [points to if_2]');
    console.log('                        └─ localVar [points to block3]');
  });
});
