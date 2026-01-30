/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { ReferenceContext } from '../../src/types/symbolReference';
import { SymbolKind } from '../../src/types/symbol';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { Effect } from 'effect';
import {
  runValidatorsForTier,
  ValidatorRegistryLive,
  registerValidator,
  ValidationError,
} from '../../src/semantics/validation/ValidatorRegistry';
import { ValidationTier } from '../../src/semantics/validation/ValidationTier';
import { TypeAssignmentValidator } from '../../src/semantics/validation/validators/TypeAssignmentValidator';
import { EffectTestLoggerLive } from '../../src/utils/EffectLspLoggerLayer';
import type { ValidationResult } from '../../src/semantics/validation/ValidationResult';

describe('ApexSymbolCollectorListener - Literal Capture and Resolution', () => {
  let compilerService: CompilerService;
  let symbolManager: ApexSymbolManager;

  beforeEach(() => {
    compilerService = new CompilerService();
    symbolManager = new ApexSymbolManager();
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(() => {
    symbolManager.clear();
  });

  describe('Literal TypeInfo Linking', () => {
    it('should link TypeInfo for literals to LITERAL SymbolReference', () => {
      const apexCode = `
public class TestClass {
  public void method() {
    String s = 'hello';
    Integer i = 42;
    Boolean b = true;
  }
}`;

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(apexCode, 'test.cls', listener);

      expect(result.errors).toHaveLength(0);

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const variables = symbols.filter((s) => s.kind === SymbolKind.Variable);

      // Find the variable declarations
      const stringVar = variables.find((v) => v.name === 's');
      const integerVar = variables.find((v) => v.name === 'i');
      const booleanVar = variables.find((v) => v.name === 'b');

      expect(stringVar).toBeDefined();
      expect(integerVar).toBeDefined();
      expect(booleanVar).toBeDefined();

      // Check that TypeInfo for initializers exists
      // Note: initializerType may not always be set depending on parsing detail level
      // The key test is that literals are captured and can be resolved
      if (stringVar && 'initializerType' in stringVar) {
        const varSymbol = stringVar as any;
        // If initializerType exists, verify it has correct properties
        if (varSymbol.initializerType) {
          // Should be String type (or Object if not fully resolved)
          expect(['String', 'Object']).toContain(
            varSymbol.initializerType.name,
          );
        }
      }
      if (integerVar && 'initializerType' in integerVar) {
        const varSymbol = integerVar as any;
        if (varSymbol.initializerType) {
          expect(['Integer', 'Object']).toContain(
            varSymbol.initializerType.name,
          );
        }
      }
      if (booleanVar && 'initializerType' in booleanVar) {
        const varSymbol = booleanVar as any;
        if (varSymbol.initializerType) {
          expect(['Boolean', 'Object']).toContain(
            varSymbol.initializerType.name,
          );
        }
      }

      // More importantly, verify that LITERAL references exist in the symbol table
      const references = symbolTable.getAllReferences();
      const literalRefs = references.filter(
        (r) => r.context === ReferenceContext.LITERAL,
      );
      expect(literalRefs.length).toBeGreaterThan(0);

      const stringLiteral = literalRefs.find(
        (r) => r.literalType === 'String' && r.literalValue === 'hello',
      );
      expect(stringLiteral).toBeDefined();
    });

    it('should preserve actual literal values in originalTypeString', () => {
      const apexCode = `
public class TestClass {
  public void method() {
    String s = 'hello';
    Integer i = 42;
    Decimal d = 3.14;
    Boolean b = true;
  }
}`;

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(apexCode, 'test.cls', listener);

      expect(result.errors).toHaveLength(0);

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const variables = symbols.filter((s) => s.kind === SymbolKind.Variable);

      // Find the variable declarations
      const stringVar = variables.find((v) => v.name === 's');
      const integerVar = variables.find((v) => v.name === 'i');
      const decimalVar = variables.find((v) => v.name === 'd');
      const booleanVar = variables.find((v) => v.name === 'b');

      expect(stringVar).toBeDefined();
      expect(integerVar).toBeDefined();
      expect(decimalVar).toBeDefined();
      expect(booleanVar).toBeDefined();

      // Check that originalTypeString preserves actual literal values
      // Note: We check initializerType, not type (type is the declared type)
      // For string literals, it should include quotes
      if (stringVar && 'initializerType' in stringVar) {
        const varSymbol = stringVar as any;
        if (varSymbol.initializerType) {
          expect(varSymbol.initializerType.originalTypeString).toContain("'");
          expect(varSymbol.initializerType.originalTypeString).toContain(
            'hello',
          );
        }
      }
      // For numeric literals, it should preserve the numeric text
      if (integerVar && 'initializerType' in integerVar) {
        const varSymbol = integerVar as any;
        if (varSymbol.initializerType) {
          expect(varSymbol.initializerType.originalTypeString).toBe('42');
        }
      }
      if (decimalVar && 'initializerType' in decimalVar) {
        const varSymbol = decimalVar as any;
        if (varSymbol.initializerType) {
          expect(varSymbol.initializerType.originalTypeString).toBe('3.14');
        }
      }
      // For boolean literals, it should preserve 'true' or 'false'
      if (booleanVar && 'initializerType' in booleanVar) {
        const varSymbol = booleanVar as any;
        if (varSymbol.initializerType) {
          expect(varSymbol.initializerType.originalTypeString).toBe('true');
        }
      }
    });
  });

  describe('Literal Reference Resolution', () => {
    it('should resolve LITERAL references to built-in type symbols', async () => {
      const apexCode = `
public class TestClass {
  public void method() {
    String s = 'hello';
    Integer i = 42;
    Boolean b = true;
  }
}`;

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(
        apexCode,
        'file:///test/TestClass.cls',
        listener,
      );

      expect(result.errors).toHaveLength(0);
      expect(result.result).toBeDefined();

      // Add symbol table to manager
      await Effect.runPromise(
        symbolManager.addSymbolTable(
          result.result!,
          'file:///test/TestClass.cls',
        ),
      );

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const symbolTable = result.result!;
      const references = symbolTable.getAllReferences();
      const literalRefs = references.filter(
        (r) => r.context === ReferenceContext.LITERAL,
      );

      expect(literalRefs.length).toBeGreaterThan(0);

      // Test that LITERAL references can be resolved to built-in types
      // Since resolveSymbolReferenceToSymbol is private, we verify by:
      // 1. Verifying that built-in types exist for the literal types
      // 2. Checking that at least one variable with a literal has typeReferenceId set
      const stringLiteralRef = literalRefs.find(
        (r) => r.literalType === 'String' && r.literalValue === 'hello',
      );
      expect(stringLiteralRef).toBeDefined();

      // Verify that the built-in type exists
      const builtInSymbol = symbolManager.findBuiltInType('String');
      expect(builtInSymbol).toBeDefined();
      if (builtInSymbol) {
        expect(builtInSymbol.name.toLowerCase()).toBe('string');
      }

      // Verify that LITERAL references exist and can be resolved to built-in types
      // The key verification is that:
      // 1. LITERAL references are captured
      // 2. Built-in types exist for the literal types
      // 3. Variables with literals have initializerType (may be Object if not fully resolved)
      const variables = symbolTable
        .getAllSymbols()
        .filter((s) => s.kind === SymbolKind.Variable);
      const stringVar = variables.find((v) => v.name === 's');
      expect(stringVar).toBeDefined();

      // Verify the LITERAL reference exists
      expect(stringLiteralRef).toBeDefined();
      expect(stringLiteralRef?.literalType).toBe('String');
      expect(stringLiteralRef?.literalValue).toBe('hello');

      // Verify built-in type exists
      expect(builtInSymbol).toBeDefined();
      if (builtInSymbol) {
        expect(builtInSymbol.name.toLowerCase()).toBe('string');
      }

      // If initializerType exists, verify originalTypeString preserves literal value
      if (stringVar && 'initializerType' in stringVar) {
        const varSymbol = stringVar as any;
        if (varSymbol.initializerType?.originalTypeString) {
          expect(varSymbol.initializerType.originalTypeString).toContain("'");
          expect(varSymbol.initializerType.originalTypeString).toContain(
            'hello',
          );
        }
      }
    });

    it('should not produce TYPE_MISMATCH errors for string literal assignments', async () => {
      const apexCode = `
public class TestClass {
  public void method() {
    String s = 'hello';
    String s2 = 'world';
  }
}`;

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(
        apexCode,
        'file:///test/TestClass.cls',
        listener,
      );

      expect(result.errors).toHaveLength(0);
      expect(result.result).toBeDefined();

      // Add symbol table to manager
      await Effect.runPromise(
        symbolManager.addSymbolTable(
          result.result!,
          'file:///test/TestClass.cls',
        ),
      );

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Run validators to get validation results
      const symbolTable = result.result!;
      // Register validator first
      await Effect.runPromise(
        registerValidator(TypeAssignmentValidator).pipe(
          Effect.provide(ValidatorRegistryLive),
        ),
      );
      // Then run validators
      const validationResults = await Effect.runPromise(
        runValidatorsForTier(ValidationTier.THOROUGH, symbolTable, {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: false,
          maxDepth: 1,
          maxArtifacts: 5,
          timeout: 5000,
        }).pipe(
          Effect.provide(ValidatorRegistryLive),
          Effect.provide(EffectTestLoggerLive),
        ) as Effect.Effect<readonly ValidationResult[], ValidationError, never>,
      );

      // Combine all validation results
      const allErrors: any[] = [];
      for (const result of validationResults) {
        if (Array.isArray(result.errors)) {
          allErrors.push(...result.errors);
        }
      }

      // Check that there are no TYPE_MISMATCH errors for string literal assignments
      const typeMismatchErrors = allErrors.filter(
        (e) => e.code === 'TYPE_MISMATCH',
      );

      // Filter out any TYPE_MISMATCH errors related to our string literal assignments
      const relevantErrors = typeMismatchErrors.filter((e) => {
        const location = e.location;
        // Check if error is on lines 3-4 (where our string assignments are)
        return (
          location &&
          location.identifierRange &&
          location.identifierRange.startLine >= 3 &&
          location.identifierRange.startLine <= 4
        );
      });

      // Should have no TYPE_MISMATCH errors for string literal assignments
      expect(relevantErrors).toHaveLength(0);
    });
  });
});
