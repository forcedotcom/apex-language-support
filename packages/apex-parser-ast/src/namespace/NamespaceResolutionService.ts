/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { SymbolTable } from '../types/symbol';
import {
  CompilationContext,
  SymbolProvider,
  resolveTypeName,
  ReferenceTypeEnum,
  IdentifierContext,
} from './NamespaceUtils';

/**
 * Service for handling deferred namespace resolution
 */
export class NamespaceResolutionService {
  private readonly logger = getLogger();

  /**
   * Resolve deferred references in a symbol table
   */
  resolveDeferredReferences(
    symbolTable: SymbolTable,
    compilationContext: CompilationContext,
    symbolProvider: SymbolProvider,
  ): void {
    this.logger.debug(() => 'Starting deferred namespace resolution');

    // Process type references in variable declarations
    this.resolveTypeReferences(symbolTable, compilationContext, symbolProvider);

    // Process method calls and field access
    this.resolveExpressionReferences(
      symbolTable,
      compilationContext,
      symbolProvider,
    );

    this.logger.debug(() => 'Completed deferred namespace resolution');
  }

  /**
   * Resolve type references in variable declarations and parameters
   */
  private resolveTypeReferences(
    symbolTable: SymbolTable,
    compilationContext: CompilationContext,
    symbolProvider: SymbolProvider,
  ): void {
    const symbols = symbolTable.getAllSymbols();

    for (const symbol of symbols) {
      this.resolveSymbolTypeReference(
        symbol,
        compilationContext,
        symbolProvider,
      );
    }
  }

  /**
   * Resolve type reference for a single symbol
   */
  private resolveSymbolTypeReference(
    symbol: any,
    compilationContext: CompilationContext,
    symbolProvider: SymbolProvider,
  ): void {
    // Use VariableSymbol.type directly instead of _typeData.type
    const variableSymbol = symbol as import('../types/symbol').VariableSymbol;
    if (!variableSymbol.type?.name) {
      return;
    }

    const typeInfo = variableSymbol.type;
    const nameParts = this.parseTypeName(typeInfo.name);

    const resolutionResult = resolveTypeName(
      nameParts,
      compilationContext,
      ReferenceTypeEnum.CLASS,
      IdentifierContext.NONE,
      symbolProvider,
    );

    if (resolutionResult.isResolved && resolutionResult.symbol) {
      // Update the type info with resolved symbol
      typeInfo.resolvedSymbol = resolutionResult.symbol;
      typeInfo.resolutionConfidence = resolutionResult.confidence;
    }
  }

  /**
   * Parse a type name into parts for resolution
   */
  private parseTypeName(typeName: string): string[] {
    if (typeName.includes('.')) {
      return typeName.split('.');
    }
    return [typeName];
  }

  /**
   * Resolve expression references (method calls, field access)
   */
  private resolveExpressionReferences(
    symbolTable: SymbolTable,
    compilationContext: CompilationContext,
    symbolProvider: SymbolProvider,
  ): void {
    // This will be implemented when expression parsing is added
    // For now, this is a placeholder for future enhancement
    this.logger.debug(
      () => 'Expression reference resolution not yet implemented',
    );
  }
}
