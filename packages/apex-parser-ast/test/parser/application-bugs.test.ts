/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompilerService,
  CompilationResult,
} from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  SymbolTable,
  SymbolKind,
  ApexSymbol,
  MethodSymbol,
  VariableSymbol,
} from '../../src/types/symbol';
import { TestLogger } from '../utils/testLogger';
import * as fs from 'fs';
import * as path from 'path';

describe('Application.cls Bug Tests', () => {
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;
  let logger: TestLogger;
  let applicationClsContent: string;

  beforeAll(() => {
    // Read the Application.cls file
    const fixturePath = path.join(
      __dirname,
      '../fixtures/bugs/Application.cls',
    );
    applicationClsContent = fs.readFileSync(fixturePath, 'utf-8');
  });

  beforeEach(() => {
    logger = TestLogger.getInstance();
    logger.debug('Setting up test environment');
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
  });

  describe('Bug 1: Constructor name shows as "unknownConstructor"', () => {
    it('should collect constructor with correct name instead of "unknownConstructor"', () => {
      logger.debug('Testing constructor name bug');

      // Parse the Application.cls file
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        applicationClsContent,
        'Application.cls',
        listener,
      );

      // Log compilation errors but continue with analysis
      if (result.errors.length > 0) {
        logger.debug(`Compilation errors found: ${result.errors.length}`);
        result.errors.forEach((error, index) => {
          logger.debug(`Error ${index + 1}: ${JSON.stringify(error)}`);
        });
      }

      // Get the symbol table
      const symbolTable = result.result;
      expect(symbolTable).toBeDefined();

      // Find the Application class
      const fileScope = symbolTable?.getCurrentScope();
      const applicationClass = fileScope
        ?.getAllSymbols()
        .find((s) => s.name === 'Application');
      expect(applicationClass).toBeDefined();

      // Get the Application class scope
      const applicationScope = symbolTable
        ?.getCurrentScope()
        .getChildren()
        .find((s) => s.name === 'Application');
      expect(applicationScope).toBeDefined();

      // Find the ServiceFactory inner class
      const serviceFactoryClass = applicationScope
        ?.getAllSymbols()
        .find((s) => s.name === 'ServiceFactory');
      expect(serviceFactoryClass).toBeDefined();

      // Get the ServiceFactory class scope
      const serviceFactoryScope = applicationScope
        ?.getChildren()
        .find((s) => s.name === 'ServiceFactory');
      expect(serviceFactoryScope).toBeDefined();

      // Find the constructor in ServiceFactory
      const constructorSymbol = serviceFactoryScope
        ?.getAllSymbols()
        .find((s) => isMethodSymbol(s) && s.isConstructor) as MethodSymbol;

      expect(constructorSymbol).toBeDefined();

      // This is the bug: the constructor name should be 'ServiceFactory', not 'unknownConstructor'
      logger.debug(`Constructor name: ${constructorSymbol.name}`);
      expect(constructorSymbol.name).toBe('ServiceFactory');
      expect(constructorSymbol.isConstructor).toBe(true);
      expect(constructorSymbol.kind).toBe(SymbolKind.Constructor);

      // Verify constructor parameters
      expect(constructorSymbol.parameters).toBeDefined();
      expect(constructorSymbol.parameters?.length).toBe(1);
      expect(constructorSymbol.parameters?.[0].type.originalTypeString).toBe(
        'Map<Type,Type>',
      );
    });
  });

  describe('Bug 2: Field name should include type information', () => {
    it('should collect field with type information in name', () => {
      logger.debug('Testing field type information bug');

      // Parse the Application.cls file
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        applicationClsContent,
        'Application.cls',
        listener,
      );

      // Log compilation errors but continue with analysis
      if (result.errors.length > 0) {
        logger.debug(`Compilation errors found: ${result.errors.length}`);
        result.errors.forEach((error, index) => {
          logger.debug(`Error ${index + 1}: ${JSON.stringify(error)}`);
        });
      }

      // Get the symbol table
      const symbolTable = result.result;
      expect(symbolTable).toBeDefined();

      // Find the Application class
      const fileScope = symbolTable?.getCurrentScope();
      const applicationClass = fileScope
        ?.getAllSymbols()
        .find((s) => s.name === 'Application');
      expect(applicationClass).toBeDefined();

      // Get the Application class scope
      const applicationScope = symbolTable
        ?.getCurrentScope()
        .getChildren()
        .find((s) => s.name === 'Application');
      expect(applicationScope).toBeDefined();

      // Find the Selector field
      const selectorField = applicationScope
        ?.getAllSymbols()
        .find(
          (s) => s.name === 'Selector' && s.kind === SymbolKind.Field,
        ) as VariableSymbol;

      expect(selectorField).toBeDefined();
      expect(selectorField.name).toBe('Selector');
      expect(selectorField.kind).toBe(SymbolKind.Field);
      expect(selectorField.type).toBeDefined();

      // The field should have type information available
      logger.debug(`Field type: ${selectorField.type.originalTypeString}`);
      expect(selectorField.type.originalTypeString).toBe(
        'fflib_Application.SelectorFactory',
      );
      // The type.name should be just the type name, not the full qualified name
      expect(selectorField.type.name).toBe('SelectorFactory');
    });
  });

  describe('LSP Document Symbol Format Tests', () => {
    it('should format constructor name correctly for LSP', () => {
      logger.debug('Testing LSP constructor name formatting');

      // Parse the Application.cls file
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        applicationClsContent,
        'Application.cls',
        listener,
      );

      // Log compilation errors but continue with analysis
      if (result.errors.length > 0) {
        logger.debug(`Compilation errors found: ${result.errors.length}`);
        result.errors.forEach((error, index) => {
          logger.debug(`Error ${index + 1}: ${JSON.stringify(error)}`);
        });
      }

      const symbolTable = result.result;
      const applicationScope = symbolTable
        ?.getCurrentScope()
        .getChildren()
        .find((s) => s.name === 'Application');
      const serviceFactoryScope = applicationScope
        ?.getChildren()
        .find((s) => s.name === 'ServiceFactory');

      const constructorSymbol = serviceFactoryScope
        ?.getAllSymbols()
        .find((s) => isMethodSymbol(s) && s.isConstructor) as MethodSymbol;

      expect(constructorSymbol).toBeDefined();

      // The constructor should have the correct name for LSP formatting
      // Expected format: "ServiceFactory(Map<Type,Type>) : void"
      const expectedName = 'ServiceFactory';
      logger.debug(`Constructor name for LSP: ${constructorSymbol.name}`);
      expect(constructorSymbol.name).toBe(expectedName);

      // Verify parameters are available for LSP formatting
      expect(constructorSymbol.parameters).toBeDefined();
      expect(constructorSymbol.parameters?.length).toBe(1);
      expect(constructorSymbol.parameters?.[0].type.originalTypeString).toBe(
        'Map<Type,Type>',
      );
    });

    it('should format field name with type information for LSP', () => {
      logger.debug('Testing LSP field name formatting');

      // Parse the Application.cls file
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        applicationClsContent,
        'Application.cls',
        listener,
      );

      // Log compilation errors but continue with analysis
      if (result.errors.length > 0) {
        logger.debug(`Compilation errors found: ${result.errors.length}`);
        result.errors.forEach((error, index) => {
          logger.debug(`Error ${index + 1}: ${JSON.stringify(error)}`);
        });
      }

      const symbolTable = result.result;
      const applicationScope = symbolTable
        ?.getCurrentScope()
        .getChildren()
        .find((s) => s.name === 'Application');

      const selectorField = applicationScope
        ?.getAllSymbols()
        .find(
          (s) => s.name === 'Selector' && s.kind === SymbolKind.Field,
        ) as VariableSymbol;

      expect(selectorField).toBeDefined();

      // The field should have type information available for LSP formatting
      // Expected format: "Selector : fflib_Application.SelectorFactory"
      logger.debug(
        `Field type for LSP: ${selectorField.type.originalTypeString}`,
      );
      expect(selectorField.name).toBe('Selector');
      expect(selectorField.type.originalTypeString).toBe(
        'fflib_Application.SelectorFactory',
      );
      // The type.name should be just the type name, not the full qualified name
      expect(selectorField.type.name).toBe('SelectorFactory');
    });
  });
});

// Helper function to check if symbol is a method symbol
function isMethodSymbol(symbol: ApexSymbol): symbol is MethodSymbol {
  return (
    symbol.kind === SymbolKind.Method || symbol.kind === SymbolKind.Constructor
  );
}
