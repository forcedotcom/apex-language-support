/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as apexParserAst from '../src/index';

describe('apex-parser-ast exports', () => {
  it('should export core components', () => {
    // Verify parser exports
    expect(apexParserAst.BaseApexParserListener).toBeDefined();
    expect(apexParserAst.ApexSymbolCollectorListener).toBeDefined();
    expect(apexParserAst.CompilerService).toBeDefined();

    // Verify type exports
    expect(apexParserAst.SymbolKind).toBeDefined();
    expect(apexParserAst.SymbolVisibility).toBeDefined();
    expect(apexParserAst.QName).toBeDefined();
    expect(apexParserAst.SymbolTable).toBeDefined();
    expect(apexParserAst.SymbolScope).toBeDefined();
    expect(apexParserAst.createPrimitiveType).toBeDefined();
    expect(apexParserAst.createCollectionType).toBeDefined();
    expect(apexParserAst.createArrayType).toBeDefined();
    expect(apexParserAst.createMapType).toBeDefined();

    // Verify validator exports
    expect(apexParserAst.ClassModifierValidator).toBeDefined();
    expect(apexParserAst.FieldModifierValidator).toBeDefined();
    expect(apexParserAst.MethodModifierValidator).toBeDefined();
    expect(apexParserAst.AnnotationValidator).toBeDefined();
  });

  it('should expose proper types through interfaces', () => {
    // Check that enum types are exported
    expect(typeof apexParserAst.SymbolKind).toBe('object');
    expect(typeof apexParserAst.SymbolVisibility).toBe('object');

    // Check that classes are functions
    expect(typeof apexParserAst.QName).toBe('function');
    expect(typeof apexParserAst.CompilerService).toBe('function');
    expect(typeof apexParserAst.SymbolTable).toBe('function');

    // Check that type exports can be used for type checking
    const mockPrimitiveType = apexParserAst.createPrimitiveType('Integer');
    expect(mockPrimitiveType.isPrimitive).toBe(true);

    // Check that service can be instantiated
    const compilerService = new apexParserAst.CompilerService();
    expect(compilerService).toBeInstanceOf(apexParserAst.CompilerService);

    // Check that symbol table can be instantiated
    const symbolTable = new apexParserAst.SymbolTable();
    expect(symbolTable.getCurrentScope()).toBeDefined();
    expect(symbolTable.getCurrentScope().name).toBe('file');
  });
});
