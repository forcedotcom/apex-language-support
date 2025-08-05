import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { CharStreams, CommonTokenStream } from 'antlr4ts';
import { ApexLexer, ApexParser, ParseTreeWalker } from '@apexdevtools/apex-parser';
import { SymbolKind } from '../../src/types/symbol';

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

    // Find the two 'result' variables
    const resultVariables = allSymbols.filter(
      (symbol) => symbol.name === 'result' && symbol.kind === SymbolKind.Variable,
    );

    // Should have exactly 2 result variables
    expect(resultVariables).toHaveLength(2);

    // Both should have different IDs
    const id1 = resultVariables[0].id;
    const id2 = resultVariables[1].id;
    expect(id1).not.toBe(id2);

    // IDs should include scope path
    expect(id1).toContain('method1');
    expect(id2).toContain('method2');

    // Verify the IDs follow the new format: filePath:scopePath:symbolName
    expect(id1).toMatch(/.*:.*method1.*:result/);
    expect(id2).toMatch(/.*:.*method2.*:result/);
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

    // Find the two 'data' variables
    const dataVariables = allSymbols.filter(
      (symbol) => symbol.name === 'data' && symbol.kind === SymbolKind.Variable,
    );

    // Should have exactly 2 data variables
    expect(dataVariables).toHaveLength(2);

    // Both should have different IDs
    const id1 = dataVariables[0].id;
    const id2 = dataVariables[1].id;
    expect(id1).not.toBe(id2);

    // One should be in the method scope, one in a block scope
    const hasBlockScope = id1.includes('block') || id2.includes('block');
    expect(hasBlockScope).toBe(true);
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
}); 