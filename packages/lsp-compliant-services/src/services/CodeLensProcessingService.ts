/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CodeLens,
  CodeLensParams,
  Position,
  Range,
} from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
  ApexSymbol,
  isClassSymbol,
  isMethodSymbol,
} from '@salesforce/apex-lsp-parser-ast';

/**
 * Command IDs that match the VSCode extension commands
 * These must match the commands registered in salesforcedx-vscode-core
 */
const TEST_CLASS_RUN = 'sf.apex.test.class.run.delegate';
const TEST_CLASS_DEBUG = 'sf.apex.test.class.debug.delegate';
const TEST_METHOD_RUN = 'sf.apex.test.method.run.delegate';
const TEST_METHOD_DEBUG = 'sf.apex.test.method.debug.delegate';
const ANON_RUN = 'sf.anon.apex.run.delegate';
const ANON_DEBUG = 'sf.anon.apex.debug.delegate';

/**
 * Labels for code lens commands
 */
const LABELS = {
  TEST_CLASS_RUN: 'Run All Tests',
  TEST_CLASS_DEBUG: 'Debug All Tests',
  TEST_METHOD_RUN: 'Run Test',
  TEST_METHOD_DEBUG: 'Debug Test',
  ANON_RUN: 'Execute',
  ANON_DEBUG: 'Debug',
};

/**
 * Interface for code lens processing functionality
 */
export interface ICodeLensProcessor {
  /**
   * Process a code lens request
   * @param params The code lens parameters
   * @returns Array of code lenses for the document
   */
  processCodeLens(params: CodeLensParams): Promise<CodeLens[]>;
}

/**
 * Service for processing code lens requests
 *
 * Provides code lenses for:
 * - Test classes and methods (@isTest annotation)
 * - Anonymous Apex files (Execute/Debug)
 */
export class CodeLensProcessingService implements ICodeLensProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    // Use the passed symbol manager or fall back to the singleton
    this.symbolManager =
      symbolManager ??
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
  }

  /**
   * Process a code lens request
   * @param params The code lens parameters
   * @returns Array of code lenses for the document
   */
  public async processCodeLens(params: CodeLensParams): Promise<CodeLens[]> {
    this.logger.debug(
      () => `Processing code lens for ${params.textDocument.uri}`,
    );

    const codeLenses: CodeLens[] = [];

    try {
      const uri = params.textDocument.uri;

      // Check if this is an anonymous Apex file
      if (this.isAnonymousApex(uri)) {
        this.logger.debug(() => `Detected anonymous Apex file: ${uri}`);
        codeLenses.push(...this.provideAnonymousCodeLenses());
        return codeLenses;
      }

      // Get symbol table for this file to find test classes/methods
      this.logger.debug(() => `Looking for test symbols in ${uri}`);
      const testLenses = await this.provideTestCodeLenses(uri);
      codeLenses.push(...testLenses);

      this.logger.debug(
        () => `Generated ${codeLenses.length} code lenses for ${uri}`,
      );

      return codeLenses;
    } catch (error) {
      this.logger.error(() => `Error processing code lens: ${error}`);
      return [];
    }
  }

  /**
   * Check if a URI represents an anonymous Apex file
   * @param uri The file URI
   * @returns True if the file is anonymous Apex
   */
  private isAnonymousApex(uri: string): boolean {
    const lowerUri = uri.toLowerCase();
    // Check for standard anonymous Apex file extensions (.apex or .anonymous.cls)
    // This matches the VS Code language definition for 'apex-anon' language ID
    const isAnon =
      lowerUri.endsWith('.apex') || lowerUri.endsWith('.anonymous.cls');
    return isAnon;
  }

  /**
   * Provide code lenses for anonymous Apex files
   * @returns Array of code lenses for Execute and Debug commands
   */
  private provideAnonymousCodeLenses(): CodeLens[] {
    const codeLenses: CodeLens[] = [];

    // Both Execute and Debug code lenses appear at position (0, 0)
    const position = Position.create(0, 0);
    const range = Range.create(position, position);

    // Execute command (no arguments needed for anonymous Apex)
    codeLenses.push({
      range,
      command: {
        title: LABELS.ANON_RUN,
        command: ANON_RUN,
      },
    });

    // Debug command (no arguments needed for anonymous Apex)
    codeLenses.push({
      range,
      command: {
        title: LABELS.ANON_DEBUG,
        command: ANON_DEBUG,
      },
    });

    return codeLenses;
  }

  /**
   * Provide code lenses for test classes and methods
   * @param fileUri The file URI
   * @returns Array of code lenses for test-related commands
   */
  private async provideTestCodeLenses(fileUri: string): Promise<CodeLens[]> {
    const codeLenses: CodeLens[] = [];

    try {
      this.logger.debug(() => `Accessing symbol manager for ${fileUri}`);

      // Get the symbol table for this file
      const symbolTable = (
        this.symbolManager as any
      ).symbolGraph?.getSymbolTableForFile?.(fileUri);

      this.logger.debug(() => `Symbol table found: ${!!symbolTable}`);

      if (!symbolTable) {
        this.logger.debug(
          () =>
            `No symbol table found for ${fileUri} - file may not be parsed yet`,
        );
        return codeLenses;
      }

      // Get all symbols in the file
      const allSymbols = symbolTable.getAllSymbols();

      this.logger.debug(
        () => `Found ${allSymbols.length} symbols in ${fileUri}`,
      );

      // Find test classes and methods
      for (const symbol of allSymbols) {
        this.logger.debug(
          () =>
            `🔍 [CodeLens] Checking symbol: ${symbol.name} (kind: ${symbol.kind})`,
        );

        if (isClassSymbol(symbol)) {
          const isTest = this.isTestClass(symbol);
          if (isTest) {
            const classLenses = this.createTestClassCodeLenses(symbol);
            codeLenses.push(...classLenses);
          }
        } else if (isMethodSymbol(symbol)) {
          const isTest = this.isTestMethod(symbol);
          if (isTest) {
            const methodLenses = this.createTestMethodCodeLenses(symbol);
            codeLenses.push(...methodLenses);
          }
        }
      }

      this.logger.debug(
        () => `Total test code lenses created: ${codeLenses.length}`,
      );

      return codeLenses;
    } catch (error) {
      this.logger.error(() => `Error providing test code lenses: ${error}`);
      return [];
    }
  }

  /**
   * Check if a class is a test class
   * @param symbol The class symbol
   * @returns True if the class has @isTest annotation
   */
  private isTestClass(symbol: ApexSymbol): boolean {
    // Check annotations
    if (symbol.annotations) {
      const hasIsTest = symbol.annotations.some(
        (ann) => ann.name.toLowerCase() === 'istest',
      );
      if (hasIsTest) {
        return true;
      }
    }

    // Check modifiers (fallback)
    if (symbol.modifiers) {
      return symbol.modifiers.isTestMethod === true;
    }

    return false;
  }

  /**
   * Check if a method is a test method
   * @param symbol The method symbol
   * @returns True if the method has @isTest annotation
   */
  private isTestMethod(symbol: ApexSymbol): boolean {
    // Check annotations
    if (symbol.annotations) {
      const hasIsTest = symbol.annotations.some(
        (ann) => ann.name.toLowerCase() === 'istest',
      );
      if (hasIsTest) {
        return true;
      }
    }

    // Check modifiers (fallback)
    if (symbol.modifiers) {
      return symbol.modifiers.isTestMethod === true;
    }

    return false;
  }

  /**
   * Create code lenses for a test class
   * @param classSymbol The test class symbol
   * @returns Array of code lenses for Run All Tests and Debug All Tests
   */
  private createTestClassCodeLenses(classSymbol: ApexSymbol): CodeLens[] {
    const codeLenses: CodeLens[] = [];

    if (!classSymbol.location) {
      return codeLenses;
    }

    // Convert AST position (1-based line) to LSP position (0-based line)
    const line = Math.max(0, classSymbol.location.symbolRange.startLine - 1);
    const position = Position.create(line, 0);
    const range = Range.create(position, position);

    const className = classSymbol.name;

    // Run All Tests command
    codeLenses.push({
      range,
      command: {
        title: LABELS.TEST_CLASS_RUN,
        command: TEST_CLASS_RUN,
        arguments: [className],
      },
    });

    // Debug All Tests command
    codeLenses.push({
      range,
      command: {
        title: LABELS.TEST_CLASS_DEBUG,
        command: TEST_CLASS_DEBUG,
        arguments: [className],
      },
    });

    return codeLenses;
  }

  /**
   * Create code lenses for a test method
   * @param methodSymbol The test method symbol
   * @returns Array of code lenses for Run Test and Debug Test
   */
  private createTestMethodCodeLenses(methodSymbol: ApexSymbol): CodeLens[] {
    const codeLenses: CodeLens[] = [];

    if (!methodSymbol.location) {
      return codeLenses;
    }

    // Convert AST position (1-based line) to LSP position (0-based line)
    const line = Math.max(0, methodSymbol.location.symbolRange.startLine - 1);
    const position = Position.create(line, 0);
    const range = Range.create(position, position);

    // Get the qualified method name (ClassName.methodName)
    const methodName = this.getQualifiedMethodName(methodSymbol);

    if (!methodName) {
      this.logger.warn(
        () =>
          `Could not determine qualified name for method ${methodSymbol.name}`,
      );
      return codeLenses;
    }

    // Run Test command
    codeLenses.push({
      range,
      command: {
        title: LABELS.TEST_METHOD_RUN,
        command: TEST_METHOD_RUN,
        arguments: [methodName],
      },
    });

    // Debug Test command
    codeLenses.push({
      range,
      command: {
        title: LABELS.TEST_METHOD_DEBUG,
        command: TEST_METHOD_DEBUG,
        arguments: [methodName],
      },
    });

    return codeLenses;
  }

  /**
   * Get the qualified method name (ClassName.methodName)
   * @param methodSymbol The method symbol
   * @returns Qualified method name or null if it cannot be determined
   */
  private getQualifiedMethodName(methodSymbol: ApexSymbol): string | null {
    try {
      // Get the parent class symbol
      const parentSymbol = methodSymbol.parent;

      if (parentSymbol && isClassSymbol(parentSymbol)) {
        return `${parentSymbol.name}.${methodSymbol.name}`;
      }

      // Fallback: try to get parent by ID
      if (methodSymbol.parentId) {
        const parent = (this.symbolManager as any).getSymbol?.(
          methodSymbol.parentId,
        );
        if (parent && isClassSymbol(parent)) {
          return `${parent.name}.${methodSymbol.name}`;
        }
      }

      // If we can't find the parent, just return the method name
      // This might not work for the extension, but it's better than nothing
      this.logger.warn(
        () => `Could not find parent class for method ${methodSymbol.name}`,
      );
      return methodSymbol.name;
    } catch (error) {
      this.logger.error(() => `Error getting qualified method name: ${error}`);
      return null;
    }
  }
}
