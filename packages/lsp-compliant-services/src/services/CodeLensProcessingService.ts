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
import { LoggerInterface, formattedError } from '@salesforce/apex-lsp-shared';
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

    try {
      const uri = params.textDocument.uri;
      return [
        ...this.provideAnonymousCodeLenses(uri),
        ...(await this.provideTestCodeLenses(uri)),
      ];
    } catch (error) {
      this.logger.error(() => `Error processing code lens: ${error}`);
      return [];
    }
  }

  /**
   * Provide code lenses for anonymous Apex files
   * @returns Array of code lenses for Execute and Debug commands
   */
  private provideAnonymousCodeLenses(uri: string): CodeLens[] {
    if (!uri.toLowerCase().endsWith('.apex')) {
      return [];
    }

    // Both Execute and Debug code lenses appear at position (0, 0)
    const position = Position.create(0, 0);
    const range = Range.create(position, position);

    // Execute command (no arguments needed for anonymous Apex)
    return [
      {
        range,
        command: {
          title: LABELS.ANON_RUN,
          command: ANON_RUN,
        },
      },

      // Debug command (no arguments needed for anonymous Apex)
      {
        range,
        command: {
          title: LABELS.ANON_DEBUG,
          command: ANON_DEBUG,
        },
      },
    ];
  }

  /**
   * Provide code lenses for test classes and methods
   * @param fileUri The file URI
   * @returns Array of code lenses for test-related commands
   */
  private async provideTestCodeLenses(fileUri: string): Promise<CodeLens[]> {
    try {
      this.logger.debug(() => `Accessing symbol manager for ${fileUri}`);

      // Get the symbols for this file
      const symbols = this.symbolManager.findSymbolsInFile(fileUri);

      if (!symbols.length) {
        this.logger.debug(
          () => `No symbols found for ${fileUri} - file may not be parsed yet`,
        );
        return [];
      }
      // Find test classes and methods
      const codeLenses: CodeLens[] = symbols.flatMap((symbol) => {
        this.logger.debug(
          () =>
            `🔍 [CodeLens] Checking symbol: ${symbol.name} (kind: ${symbol.kind})`,
        );

        if (this.isTest(symbol)) {
          if (isClassSymbol(symbol)) {
            return this.createTestClassCodeLenses(symbol);
          } else if (isMethodSymbol(symbol)) {
            return this.createTestMethodCodeLenses(symbol);
          }
        }
        return [];
      });

      this.logger.debug(
        () => `Total test code lenses created: ${codeLenses.length}`,
      );

      return codeLenses;
    } catch (error) {
      this.logger.error(
        () =>
          `Error providing test code lenses: ${formattedError(error, { includeStack: true })}`,
      );
      return [];
    }
  }

  /**
   * Check if a class or method is a test
   * @param symbol The class or method symbol
   * @returns True if the symbol has @isTest annotation
   */
  private isTest(symbol: ApexSymbol): boolean {
    // Check modifiers (parser converts @isTest to isTestMethod modifier)
    if (symbol.modifiers?.isTestMethod === true) {
      return true;
    }
    
    // Also check annotations directly (for compatibility with FullSymbolCollectorListener)
    if (symbol.annotations) {
      return symbol.annotations.some(
        (ann) => ann.name.toLowerCase() === 'istest',
      );
    }
    
    return false;
  }

  /**
   * Create code lenses for a test class
   * @param classSymbol The test class symbol
   * @returns Array of code lenses for Run All Tests and Debug All Tests
   */
  private createTestClassCodeLenses(classSymbol: ApexSymbol): CodeLens[] {
    if (!classSymbol.location) {
      return [];
    }

    // Convert AST position (1-based line) to LSP position (0-based line)
    const line = Math.max(0, classSymbol.location.symbolRange.startLine - 1);
    const position = Position.create(line, 0);
    const range = Range.create(position, position);

    const className = classSymbol.name;

    // Run All Tests command
    return [
      {
        range,
        command: {
          title: LABELS.TEST_CLASS_RUN,
          command: TEST_CLASS_RUN,
          arguments: [className],
        },
      },
      // Debug All Tests command
      {
        range,
        command: {
          title: LABELS.TEST_CLASS_DEBUG,
          command: TEST_CLASS_DEBUG,
          arguments: [className],
        },
      },
    ];
  }

  /**
   * Create code lenses for a test method
   * @param methodSymbol The test method symbol
   * @returns Array of code lenses for Run Test and Debug Test
   */
  private createTestMethodCodeLenses(methodSymbol: ApexSymbol): CodeLens[] {
    if (!methodSymbol.location) {
      return [];
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
      return [];
    }

    // Run Test command
    return [
      {
        range,
        command: {
          title: LABELS.TEST_METHOD_RUN,
          command: TEST_METHOD_RUN,
          arguments: [methodName],
        },
      },
      // Debug Test command
      {
        range,
        command: {
          title: LABELS.TEST_METHOD_DEBUG,
          command: TEST_METHOD_DEBUG,
          arguments: [methodName],
        },
      },
    ];
  }

  /**
   * Get the qualified method name (ClassName.methodName)
   * @param methodSymbol The method symbol
   * @returns Qualified method name or null if it cannot be determined
   */
  private getQualifiedMethodName(methodSymbol: ApexSymbol): string | null {
    try {
      // Use getContainingType to find the parent class/interface/enum
      // This walks up the parentId chain to find the containing type
      const containingType = this.symbolManager.getContainingType(methodSymbol);
      if (containingType) {
        return `${containingType.name}.${methodSymbol.name}`;
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
