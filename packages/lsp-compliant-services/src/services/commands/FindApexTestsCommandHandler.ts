/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Location } from 'vscode-languageserver-protocol';
import {
  LoggerInterface,
  FindApexTestsResult,
} from '@salesforce/apex-lsp-shared';
import {
  ISymbolManager,
  SymbolKind,
  TypeSymbol,
  MethodSymbol,
  AnnotationUtils,
  isBlockSymbol,
  ScopeSymbol,
} from '@salesforce/apex-lsp-parser-ast';
import { CommandHandler } from './CommandHandler';

/**
 * Command handler for finding Apex test classes and test methods
 */
export class FindApexTestsCommandHandler implements CommandHandler {
  readonly commandName = 'apex.findApexTests';

  async execute(
    args: any[],
    symbolManager: ISymbolManager,
    logger: LoggerInterface,
  ): Promise<FindApexTestsResult> {
    logger.debug(() => 'Finding Apex test classes and methods');

    try {
      // Get all symbols from symbol manager
      const allSymbols = symbolManager.getAllSymbolsForCompletion();

      // Handle case where getAllSymbolsForCompletion returns undefined or null
      if (!allSymbols || !Array.isArray(allSymbols)) {
        logger.debug(
          () =>
            'No symbols available or getAllSymbolsForCompletion returned invalid result',
        );
        return {
          testClasses: [],
        };
      }

      // Filter for test classes (classes with @isTest annotation)
      const testClasses: TypeSymbol[] = allSymbols.filter(
        (symbol): symbol is TypeSymbol =>
          symbol.kind === SymbolKind.Class &&
          AnnotationUtils.isTestClass(symbol),
      );

      logger.debug(() => `Found ${testClasses.length} test classes`);

      const result: FindApexTestsResult = {
        testClasses: [],
      };

      // For each test class, find its test methods
      for (const testClass of testClasses) {
        // Find the class block (scope symbol with scopeType === 'class' and parentId === classSymbol.id)
        const classBlock = allSymbols.find(
          (s): s is ScopeSymbol =>
            isBlockSymbol(s) &&
            s.scopeType === 'class' &&
            s.parentId === testClass.id,
        );

        // Find methods that belong to this class
        // Methods have parentId pointing to the class block
        const classMethods = allSymbols.filter(
          (symbol): symbol is MethodSymbol =>
            symbol.kind === SymbolKind.Method &&
            (classBlock
              ? symbol.parentId === classBlock.id
              : symbol.parentId === testClass.id), // Fallback if class block not found
        );

        // Filter for test methods (methods with @isTest annotation or isTestMethod modifier)
        const testMethods = classMethods.filter((method) => {
          // Check if method has @isTest annotation
          // Methods can have annotations directly on the symbol
          const hasIsTestAnnotation =
            method.annotations?.some(
              (ann) => ann.name.toLowerCase() === 'istest',
            ) || false;

          // Check if method has isTestMethod modifier
          // The parser converts @isTest annotation to isTestMethod modifier
          const isTestMethod = method.modifiers?.isTestMethod || false;

          return hasIsTestAnnotation || isTestMethod;
        });

        logger.debug(
          () =>
            `Class ${testClass.name}: found ${testMethods.length} test methods`,
        );

        // Convert class location to LSP Location
        const classLocation: Location = {
          uri: testClass.fileUri,
          range: {
            start: {
              line: testClass.location.symbolRange.startLine - 1, // Convert to 0-based
              character: testClass.location.symbolRange.startColumn,
            },
            end: {
              line: testClass.location.symbolRange.endLine - 1, // Convert to 0-based
              character: testClass.location.symbolRange.endColumn,
            },
          },
        };

        // Convert method locations to LSP Locations
        const methodLocations = testMethods.map((method) => ({
          methodName: method.name,
          location: {
            uri: method.fileUri,
            range: {
              start: {
                line: method.location.symbolRange.startLine - 1, // Convert to 0-based
                character: method.location.symbolRange.startColumn,
              },
              end: {
                line: method.location.symbolRange.endLine - 1, // Convert to 0-based
                character: method.location.symbolRange.endColumn,
              },
            },
          },
        }));

        result.testClasses.push({
          class: {
            name: testClass.name,
            fileUri: testClass.fileUri,
            location: classLocation,
          },
          methods: methodLocations.map((method) => ({
            name: method.methodName,
            location: method.location,
          })),
        });
      }

      logger.debug(
        () =>
          `Found ${result.testClasses.length} test classes with ${result.testClasses.reduce(
            (sum, tc) => sum + tc.methods.length,
            0,
          )} total test methods`,
      );

      return result;
    } catch (error) {
      logger.error(() => `Error finding Apex tests: ${error}`);
      throw error;
    }
  }
}
