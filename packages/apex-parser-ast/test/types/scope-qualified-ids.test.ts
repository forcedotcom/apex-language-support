/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { CharStreams, CommonTokenStream } from 'antlr4ts';
import {
  ApexLexer,
  ApexParser,
  ParseTreeWalker,
} from '@apexdevtools/apex-parser';
import { SymbolKind } from '../../src/types/symbol';
import { ReferenceContext } from '../../src/types/typeReference';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';

describe('Scope-Qualified Symbol IDs', () => {
  let listener: ApexSymbolCollectorListener;

  beforeEach(() => {
    listener = new ApexSymbolCollectorListener();
  });

  const parseAndWalk = (code: string): void => {
    const inputStream = CharStreams.fromString(code);
    const lexer = new ApexLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new ApexParser(tokenStream);
    const walker = new ParseTreeWalker();
    walker.walk(listener, parser.compilationUnit());
  };

  test('should create unique IDs for same-name variables in different method scopes', () => {
    const apexCode = `
      public class TestClass {
          public void method1() {
              String result;
          }
          
          public void method2() {
              String result;
          }
      }
    `;

    // Parse the code
    parseAndWalk(apexCode);

    // Get all symbols
    const symbolTable = listener.getResult();
    const allSymbols = symbolTable.getAllSymbols();

    // Find the 'result' variables
    const resultVariables = allSymbols.filter(
      (symbol) =>
        symbol.name === 'result' && symbol.kind === SymbolKind.Variable,
    );

    // Both variables should be captured as separate symbols with unique IDs
    expect(resultVariables).toHaveLength(2);

    // Find variables by their scope paths
    const method1Var = resultVariables.find((v) => v.id.includes('method1'));
    const method2Var = resultVariables.find((v) => v.id.includes('method2'));

    expect(method1Var).toBeDefined();
    expect(method2Var).toBeDefined();

    // Both should have unique IDs with scope paths
    if (method1Var) {
      expect(method1Var.id).toContain('method1');
      expect(method1Var.id).toContain('block');
      expect(method1Var.id).toContain('result');
      expect(method1Var.id).toMatch(/.*:.*method1.*block.*:result/);
    }

    if (method2Var) {
      expect(method2Var.id).toContain('method2');
      expect(method2Var.id).toContain('block');
      expect(method2Var.id).toContain('result');
      expect(method2Var.id).toMatch(/.*:.*method2.*block.*:result/);
    }

    // Verify they have different IDs
    expect(method1Var!.id).not.toBe(method2Var!.id);
  });

  test('should create unique IDs for same-name variables in block scopes', () => {
    const apexCode = `
      public class TestClass {
          public void complexMethod() {
              String data;
              {
                  String data;
              }
          }
      }
    `;

    // Parse the code
    parseAndWalk(apexCode);

    // Get all symbols
    const symbolTable = listener.getResult();
    const allSymbols = symbolTable.getAllSymbols();

    // Find the 'data' variables
    const dataVariables = allSymbols.filter(
      (symbol) => symbol.name === 'data' && symbol.kind === SymbolKind.Variable,
    );

    // Both variables should be captured as separate symbols with unique IDs
    expect(dataVariables).toHaveLength(2);

    // Find variables by their scope paths (outer block vs inner block)
    // Outer variable is in method body block (block1)
    // Inner variable is in nested block (block2)
    const outerVar = dataVariables.find(
      (v) =>
        v.id.includes('complexMethod') &&
        v.id.includes('block1') &&
        !v.id.includes('block2'),
    );
    const innerVar = dataVariables.find(
      (v) =>
        v.id.includes('complexMethod') &&
        v.id.includes('block1') &&
        v.id.includes('block2'),
    );

    expect(outerVar).toBeDefined();
    expect(innerVar).toBeDefined();

    // Both should have unique IDs with scope paths
    if (outerVar) {
      expect(outerVar.id).toContain('complexMethod');
      expect(outerVar.id).toContain('block');
      expect(outerVar.id).toContain('data');
      expect(outerVar.id).toMatch(/.*:.*complexMethod.*block.*:data/);
    }

    if (innerVar) {
      expect(innerVar.id).toContain('complexMethod');
      expect(innerVar.id).toContain('block');
      expect(innerVar.id).toContain('data');
      expect(innerVar.id).toMatch(/.*:.*complexMethod.*block.*block.*:data/);
    }

    // Verify they have different IDs
    expect(outerVar!.id).not.toBe(innerVar!.id);
  });

  test('should maintain backward compatibility for symbols without scope paths', () => {
    const apexCode = `
      public class TestClass {
          private String field1;
          private String field2;
      }
    `;

    // Parse the code
    parseAndWalk(apexCode);

    // Get all symbols
    const symbolTable = listener.getResult();
    const allSymbols = symbolTable.getAllSymbols();

    // Find the field symbols
    const fields = allSymbols.filter(
      (symbol) => symbol.kind === SymbolKind.Field,
    );

    // Should have exactly 2 fields
    expect(fields).toHaveLength(2);

    // Both should have different IDs
    const id1 = fields[0].id;
    const id2 = fields[1].id;
    expect(id1).not.toBe(id2);

    // IDs should follow the original format for class-level symbols
    expect(id1).toMatch(/.*:field1$/);
    expect(id2).toMatch(/.*:field2$/);
  });

  test('should handle nested class scopes correctly', () => {
    const apexCode = `
      public class OuterClass {
          private String outerField;
          
          public class InnerClass {
              private String innerField;
          }
      }
    `;

    // Parse the code
    parseAndWalk(apexCode);

    // Get all symbols
    const symbolTable = listener.getResult();
    const allSymbols = symbolTable.getAllSymbols();

    // Find the field symbols
    const fields = allSymbols.filter(
      (symbol) => symbol.kind === SymbolKind.Field,
    );

    // Should have exactly 2 fields
    expect(fields).toHaveLength(2);

    // Both should have different IDs
    const id1 = fields[0].id;
    const id2 = fields[1].id;
    expect(id1).not.toBe(id2);

    // One should be in OuterClass, one in InnerClass
    const outerField = fields.find((f) => f.name === 'outerField');
    const innerField = fields.find((f) => f.name === 'innerField');

    expect(outerField?.id).toContain('OuterClass');
    expect(innerField?.id).toContain('InnerClass');
  });

  test('should correctly set parentId for local variable that shadows class field', () => {
    const apexCode = `
      public class ScopeExample {
          String a;
          
          public void method1() {
              String a;
              String b = a;
          }
      }
    `;

    // Parse the code
    parseAndWalk(apexCode);

    // Get all symbols
    const symbolTable = listener.getResult();
    const allSymbols = symbolTable.getAllSymbols();

    // Find the class field 'a'
    const classFieldA = allSymbols.find(
      (s) => s.name === 'a' && s.kind === SymbolKind.Field,
    );

    // Find the local variable 'a' in method1
    const localVarA = allSymbols.find(
      (s) =>
        s.name === 'a' &&
        s.kind === SymbolKind.Variable &&
        s.id.includes('method1'),
    );

    // Find the local variable 'b' in method1
    const localVarB = allSymbols.find(
      (s) =>
        s.name === 'b' &&
        s.kind === SymbolKind.Variable &&
        s.id.includes('method1'),
    );

    // Verify both symbols exist
    expect(classFieldA).toBeDefined();
    expect(localVarA).toBeDefined();
    expect(localVarB).toBeDefined();

    // Verify class field has correct parentId (pointing to class)
    if (classFieldA) {
      expect(classFieldA.parentId).toBeDefined();
      expect(classFieldA.parentId).toContain('class:ScopeExample');
      expect(classFieldA.parentId).not.toContain('block:');
    }

    // Verify local variable 'a' has correct parentId (pointing to block, not class)
    if (localVarA) {
      expect(localVarA.parentId).toBeDefined();
      expect(localVarA.parentId).toContain('block:');
      expect(localVarA.parentId).not.toBe(classFieldA!.parentId);
      // Should be parented by a block within method1
      expect(localVarA.parentId).toContain('method1');
    }

    // Verify local variable 'b' has correct parentId (pointing to block)
    if (localVarB) {
      expect(localVarB.parentId).toBeDefined();
      expect(localVarB.parentId).toContain('block:');
      expect(localVarB.parentId).toContain('method1');
      // Both local variables should be in the same block
      expect(localVarB.parentId).toBe(localVarA!.parentId);
    }

    // Verify scope hierarchy can be determined for the reference location
    // The reference to 'a' in 'String b = a;' should be in the method block
    const references = symbolTable.getAllReferences();
    const varUsageRefs = references.filter(
      (ref) =>
        ref.name === 'a' && ref.context === ReferenceContext.VARIABLE_USAGE,
    );

    // Should have at least one reference to 'a' (the one in 'String b = a;')
    expect(varUsageRefs.length).toBeGreaterThan(0);

    // Find the reference in method1 (should be the one used in assignment)
    const method1Ref = varUsageRefs.find((ref) => {
      const position = {
        line: ref.location.identifierRange.startLine,
        character: ref.location.identifierRange.startColumn,
      };
      const scopeHierarchy = symbolTable.getScopeHierarchy(position);
      return scopeHierarchy.some((block) => block.name.includes('method1'));
    });

    expect(method1Ref).toBeDefined();
    if (method1Ref) {
      // Verify the reference location is in the method scope
      const position = {
        line: method1Ref.location.identifierRange.startLine,
        character: method1Ref.location.identifierRange.startColumn,
      };
      const scopeHierarchy = symbolTable.getScopeHierarchy(position);

      // Should have scope hierarchy including method block
      expect(scopeHierarchy.length).toBeGreaterThan(0);
      const methodBlock = scopeHierarchy.find((block) =>
        block.name.includes('method1'),
      );
      expect(methodBlock).toBeDefined();

      // The innermost block should be the method body block
      const innermostBlock = scopeHierarchy[scopeHierarchy.length - 1];
      expect(innermostBlock.name).toContain('block');
      expect(innermostBlock.parentId).toContain('method1');
    }
  });

  test('should correctly resolve reference to class field when no local variable shadows it', () => {
    const apexCode = `
      public class ScopeExample {
          String a;
          
          public void method3() {
              String b = a;
          }
      }
    `;

    // Parse the code
    parseAndWalk(apexCode);

    // Get all symbols
    const symbolTable = listener.getResult();
    const allSymbols = symbolTable.getAllSymbols();

    // Find the class field 'a'
    const classFieldA = allSymbols.find(
      (s) => s.name === 'a' && s.kind === SymbolKind.Field,
    );

    // Find the local variable 'b' in method3
    const localVarB = allSymbols.find(
      (s) =>
        s.name === 'b' &&
        s.kind === SymbolKind.Variable &&
        s.id.includes('method3'),
    );

    // Verify class field exists
    expect(classFieldA).toBeDefined();
    expect(localVarB).toBeDefined();

    // Verify there is NO local variable 'a' in method3
    const localVarA = allSymbols.find(
      (s) =>
        s.name === 'a' &&
        s.kind === SymbolKind.Variable &&
        s.id.includes('method3'),
    );
    expect(localVarA).toBeUndefined();

    // Verify class field has correct parentId (pointing to class)
    if (classFieldA) {
      expect(classFieldA.parentId).toBeDefined();
      expect(classFieldA.parentId).toContain('class:ScopeExample');
      expect(classFieldA.parentId).not.toContain('block:');
    }

    // Verify local variable 'b' has correct parentId (pointing to block)
    if (localVarB) {
      expect(localVarB.parentId).toBeDefined();
      expect(localVarB.parentId).toContain('block:');
      expect(localVarB.parentId).toContain('method3');
    }

    // Verify TypeReference is created for the reference to 'a' in method3
    const references = symbolTable.getAllReferences();
    const varUsageRefs = references.filter(
      (ref) =>
        ref.name === 'a' && ref.context === ReferenceContext.VARIABLE_USAGE,
    );

    // Should have at least one reference to 'a'
    expect(varUsageRefs.length).toBeGreaterThan(0);

    // Find the reference in method3 (should be the one used in assignment)
    const method3Ref = varUsageRefs.find((ref) => {
      const position = {
        line: ref.location.identifierRange.startLine,
        character: ref.location.identifierRange.startColumn,
      };
      const scopeHierarchy = symbolTable.getScopeHierarchy(position);
      return scopeHierarchy.some((block) => block.name.includes('method3'));
    });

    expect(method3Ref).toBeDefined();
    if (method3Ref) {
      // Verify the reference location is in the method scope
      const position = {
        line: method3Ref.location.identifierRange.startLine,
        character: method3Ref.location.identifierRange.startColumn,
      };
      const scopeHierarchy = symbolTable.getScopeHierarchy(position);

      // Should have scope hierarchy including method block
      expect(scopeHierarchy.length).toBeGreaterThan(0);
      const methodBlock = scopeHierarchy.find((block) =>
        block.name.includes('method3'),
      );
      expect(methodBlock).toBeDefined();

      // The innermost block should be the method body block
      const innermostBlock = scopeHierarchy[scopeHierarchy.length - 1];
      expect(innermostBlock.name).toContain('block');
      expect(innermostBlock.parentId).toContain('method3');

      // Verify that there are no symbols named 'a' that are children of the method block
      // This confirms that 'a' is not a local variable in this scope
      const symbolsInMethodBlock = allSymbols.filter(
        (s) => s.parentId === innermostBlock.id && s.name === 'a',
      );
      expect(symbolsInMethodBlock.length).toBe(0);

      // Verify that the class field 'a' exists and is accessible from this scope
      // (it should be found when searching up the scope hierarchy)
      expect(classFieldA).toBeDefined();
      expect(classFieldA!.parentId).toContain('class:ScopeExample');
    }
  });

  test('should correctly resolve variable references in ScopeExample with full source', async () => {
    const apexCode = `public with sharing class ScopeExample {
    String a;
    public ScopeExample() {
    }

    public void method1() {
        String a;
        String b = a;
    }

    public void method2() {
        String a;
        String b = a;
    }

    public void method3() {
        String b = a;
    }
}`;

    // Parse and collect symbols
    const listener = new ApexSymbolCollectorListener();
    const compilerService = new CompilerService();
    const result = compilerService.compile(
      apexCode,
      'file:///ScopeExample.cls',
      listener,
    );

    expect(result.result).toBeDefined();
    const symbolTable = result.result!;

    // Process references through ApexSymbolManager
    const symbolManager = new ApexSymbolManager();
    await symbolManager.addSymbolTable(symbolTable, 'file:///ScopeExample.cls');

    // Wait a bit for async reference processing to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get all symbols
    const allSymbols = symbolTable.getAllSymbols();

    // Find the class field 'a'
    const classFieldA = allSymbols.find(
      (s) => s.name === 'a' && s.kind === SymbolKind.Field,
    );

    // Find local variables in each method
    const method1LocalA = allSymbols.find(
      (s) =>
        s.name === 'a' &&
        s.kind === SymbolKind.Variable &&
        s.id.includes('method1'),
    );
    const method1LocalB = allSymbols.find(
      (s) =>
        s.name === 'b' &&
        s.kind === SymbolKind.Variable &&
        s.id.includes('method1'),
    );

    const method2LocalA = allSymbols.find(
      (s) =>
        s.name === 'a' &&
        s.kind === SymbolKind.Variable &&
        s.id.includes('method2'),
    );
    const method2LocalB = allSymbols.find(
      (s) =>
        s.name === 'b' &&
        s.kind === SymbolKind.Variable &&
        s.id.includes('method2'),
    );

    const method3LocalB = allSymbols.find(
      (s) =>
        s.name === 'b' &&
        s.kind === SymbolKind.Variable &&
        s.id.includes('method3'),
    );

    // Verify all symbols exist
    expect(classFieldA).toBeDefined();
    expect(method1LocalA).toBeDefined();
    expect(method1LocalB).toBeDefined();
    expect(method2LocalA).toBeDefined();
    expect(method2LocalB).toBeDefined();
    expect(method3LocalB).toBeDefined();

    // Verify there's NO local variable 'a' in method3
    const method3LocalA = allSymbols.find(
      (s) =>
        s.name === 'a' &&
        s.kind === SymbolKind.Variable &&
        s.id.includes('method3'),
    );
    expect(method3LocalA).toBeUndefined();

    // Get all references
    const references = symbolTable.getAllReferences();
    const varUsageRefs = references.filter(
      (ref) =>
        ref.name === 'a' && ref.context === ReferenceContext.VARIABLE_USAGE,
    );

    // Find references in each method
    const method1Refs = varUsageRefs.filter((ref) => {
      const position = {
        line: ref.location.identifierRange.startLine,
        character: ref.location.identifierRange.startColumn,
      };
      const scopeHierarchy = symbolTable.getScopeHierarchy(position);
      return scopeHierarchy.some((block) => block.name.includes('method1'));
    });

    const method2Refs = varUsageRefs.filter((ref) => {
      const position = {
        line: ref.location.identifierRange.startLine,
        character: ref.location.identifierRange.startColumn,
      };
      const scopeHierarchy = symbolTable.getScopeHierarchy(position);
      return scopeHierarchy.some((block) => block.name.includes('method2'));
    });

    const method3Refs = varUsageRefs.filter((ref) => {
      const position = {
        line: ref.location.identifierRange.startLine,
        character: ref.location.identifierRange.startColumn,
      };
      const scopeHierarchy = symbolTable.getScopeHierarchy(position);
      return scopeHierarchy.some((block) => block.name.includes('method3'));
    });

    // Verify references exist in each method
    expect(method1Refs.length).toBeGreaterThan(0);
    expect(method2Refs.length).toBeGreaterThan(0);
    expect(method3Refs.length).toBeGreaterThan(0);

    // For method1 and method2: The reference to 'a' should resolve to the local variable
    // We verify this by checking that the reference location is in the same scope as the local variable
    if (method1Refs.length > 0 && method1LocalA) {
      const ref = method1Refs[0];
      const refPosition = {
        line: ref.location.identifierRange.startLine,
        character: ref.location.identifierRange.startColumn,
      };
      const refScopeHierarchy = symbolTable.getScopeHierarchy(refPosition);
      const innermostBlock = refScopeHierarchy[refScopeHierarchy.length - 1];

      // The reference should be in the same block as the local variable
      expect(method1LocalA.parentId).toBe(innermostBlock.id);
    }

    if (method2Refs.length > 0 && method2LocalA) {
      const ref = method2Refs[0];
      const refPosition = {
        line: ref.location.identifierRange.startLine,
        character: ref.location.identifierRange.startColumn,
      };
      const refScopeHierarchy = symbolTable.getScopeHierarchy(refPosition);
      const innermostBlock = refScopeHierarchy[refScopeHierarchy.length - 1];

      // The reference should be in the same block as the local variable
      expect(method2LocalA.parentId).toBe(innermostBlock.id);
    }

    // For method3: The reference to 'a' should resolve to the class field
    // We verify this by checking that there's no local variable 'a' in the scope
    if (method3Refs.length > 0) {
      const ref = method3Refs[0];
      const refPosition = {
        line: ref.location.identifierRange.startLine,
        character: ref.location.identifierRange.startColumn,
      };
      const refScopeHierarchy = symbolTable.getScopeHierarchy(refPosition);
      const innermostBlock = refScopeHierarchy[refScopeHierarchy.length - 1];

      // Verify no local variable 'a' exists in this block
      const symbolsInBlock = allSymbols.filter(
        (s) => s.parentId === innermostBlock.id && s.name === 'a',
      );
      expect(symbolsInBlock.length).toBe(0);

      // Verify class field exists and is accessible
      expect(classFieldA).toBeDefined();
      expect(classFieldA!.parentId).toContain('class:ScopeExample');
    }

    // Verify resolved references in the graph
    // For method1: b should reference local variable a, NOT class field a
    if (method1LocalB) {
      const referencesFromB = symbolManager.findReferencesFrom(method1LocalB);
      const refsToA = referencesFromB.filter((ref) => ref.symbol.name === 'a');

      // Should have exactly one reference to 'a'
      expect(refsToA.length).toBe(1);

      // The reference should be to the LOCAL variable a, not the class field
      const referencedSymbol = refsToA[0].symbol;
      expect(referencedSymbol.id).toBe(method1LocalA!.id);
      expect(referencedSymbol.id).toContain('method1.block2:variable:a');
      expect(referencedSymbol.id).not.toContain('field:a');
    }

    // For method2: b should reference local variable a, NOT class field a
    if (method2LocalB) {
      const referencesFromB = symbolManager.findReferencesFrom(method2LocalB);
      const refsToA = referencesFromB.filter((ref) => ref.symbol.name === 'a');

      // Should have exactly one reference to 'a'
      expect(refsToA.length).toBe(1);

      // The reference should be to the LOCAL variable a, not the class field
      const referencedSymbol = refsToA[0].symbol;
      expect(referencedSymbol.id).toBe(method2LocalA!.id);
      expect(referencedSymbol.id).toContain('method2.block3:variable:a');
      expect(referencedSymbol.id).not.toContain('field:a');
    }

    // For method3: b should reference class field a (since there's no local variable)
    if (method3LocalB && classFieldA) {
      const referencesFromB = symbolManager.findReferencesFrom(method3LocalB);
      const refsToA = referencesFromB.filter((ref) => ref.symbol.name === 'a');

      // Should have exactly one reference to 'a'
      expect(refsToA.length).toBe(1);

      // The reference should be to the CLASS FIELD a, not a local variable
      const referencedSymbol = refsToA[0].symbol;
      expect(referencedSymbol.id).toBe(classFieldA.id);
      expect(referencedSymbol.id).toContain('field:a');
      expect(referencedSymbol.kind).toBe(SymbolKind.Field);
    }
  });
});
