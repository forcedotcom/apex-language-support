/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { ApexSymbol } from '../types/symbol';
import {
  NamespaceResolutionContext,
  NamespaceResolutionResult,
  SymbolProvider,
  ReferenceTypeValue,
  IdentifierContextValue,
  CompilationContext,
  ResolutionRule,
} from '../types/namespaceResolution';
import { NamespaceUtils } from './NamespaceUtils';
import { ResolutionOrderFactory } from './ResolutionRules';
import { BuiltInTypeTablesImpl } from './BuiltInTypeTables';

/**
 * Main namespace resolver implementing Java compiler's resolution process
 * Maps to Java TypeNameResolver
 */
export class NamespaceResolver {
  private static readonly logger = getLogger();
  private static readonly builtInTables = BuiltInTypeTablesImpl.getInstance();
  private static readonly MAX_PARTS = 4;

  /**
   * Resolve a type name using the Java compiler's rule-based system
   * Maps to Java TypeNameResolver.resolve()
   */
  static resolveTypeName(
    nameParts: string[],
    compilationContext: CompilationContext,
    referenceType: ReferenceTypeValue,
    identifierContext: IdentifierContextValue,
    symbolProvider: SymbolProvider,
  ): NamespaceResolutionResult {
    try {
      // Step 1: Input Validation and Normalization
      const validationResult = this.validateAndNormalizeInput(
        nameParts,
        compilationContext,
      );
      if (!validationResult.isValid) {
        return this.createUnresolvedResult(
          validationResult.errorMessage!,
          nameParts,
        );
      }

      const adjustedNameParts = validationResult.adjustedNameParts;

      // Step 2: Create resolution context
      const resolutionContext: NamespaceResolutionContext = {
        compilationContext,
        referenceType,
        identifierContext,
        nameParts,
        adjustedNameParts,
        isCaseInsensitive: true,
      };

      // Step 3: Select resolution order based on reference type
      const resolutionRules =
        ResolutionOrderFactory.getResolutionOrder(referenceType);

      // Step 4: Apply resolution rules in order
      const resolutionResult = this.applyResolutionRules(
        resolutionContext,
        resolutionRules,
        symbolProvider,
      );

      return resolutionResult;
    } catch (error) {
      this.logger.error(
        () =>
          `Error in namespace resolution: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return this.createUnresolvedResult(
        `Resolution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nameParts,
      );
    }
  }

  /**
   * Step 1: Input Validation and Normalization
   * Maps to Java input validation and normalization
   */
  private static validateAndNormalizeInput(
    nameParts: string[],
    compilationContext: CompilationContext,
  ): { isValid: boolean; adjustedNameParts: string[]; errorMessage?: string } {
    // Handle double dots (..) in type names
    const adjustedNameParts = NamespaceUtils.adjustEmptyNames(
      nameParts,
      compilationContext.version,
    );

    // Validate maximum parts (up to 4 parts allowed)
    if (adjustedNameParts.length > this.MAX_PARTS) {
      return {
        isValid: false,
        adjustedNameParts,
        errorMessage: `Too many name parts: ${adjustedNameParts.length} (max: ${this.MAX_PARTS})`,
      };
    }

    // Validate trigger namespace usage
    if (!NamespaceUtils.validateTriggerNamespace(adjustedNameParts)) {
      return {
        isValid: false,
        adjustedNameParts,
        errorMessage: 'Trigger namespace cannot be used for type references',
      };
    }

    // Convert all names to lowercase for case-insensitive resolution
    const normalizedParts = adjustedNameParts.map((part) => part.toLowerCase());

    return {
      isValid: true,
      adjustedNameParts: normalizedParts,
    };
  }

  /**
   * Step 4: Apply resolution rules in order
   * Maps to Java rule application process
   */
  private static applyResolutionRules(
    context: NamespaceResolutionContext,
    rules: ResolutionRule[],
    symbolProvider: SymbolProvider,
  ): NamespaceResolutionResult {
    // Apply rules in priority order
    for (const rule of rules) {
      // Check if rule applies to this context
      if (!rule.appliesTo(context)) {
        continue;
      }

      // Try to resolve using this rule
      const symbol = rule.resolve(context, symbolProvider);

      if (symbol) {
        return {
          symbol,
          isResolved: true,
          resolutionRule: rule.name,
          confidence: this.calculateConfidence(rule, context),
        };
      }
    }

    // No rule matched - create unresolved result
    return this.createUnresolvedResult(
      'No resolution rule matched',
      context.adjustedNameParts,
    );
  }

  /**
   * Calculate confidence score for resolution result
   */
  private static calculateConfidence(
    rule: ResolutionRule,
    context: NamespaceResolutionContext,
  ): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for built-in types
    if (
      rule.name === 'NamedScalarOrVoid' ||
      rule.name === 'BuiltInSystemSchema'
    ) {
      confidence += 0.3;
    }

    // Higher confidence for explicit namespace usage
    if (context.adjustedNameParts.length >= 2) {
      confidence += 0.2;
    }

    // Higher confidence for current namespace matches
    if (
      context.compilationContext.namespace &&
      rule.name === 'TopLevelTypeInSameNamespace'
    ) {
      confidence += 0.2;
    }

    // Cap confidence at 0.95
    return Math.min(confidence, 0.95);
  }

  /**
   * Create unresolved resolution result
   * Maps to Java UnresolvedTypeInfoFactory.create()
   */
  private static createUnresolvedResult(
    errorMessage: string,
    nameParts: string[],
  ): NamespaceResolutionResult {
    return {
      symbol: null,
      isResolved: false,
      resolutionRule: null,
      confidence: 0,
      errorMessage,
      unresolvedNameParts: nameParts,
    };
  }

  /**
   * Find symbol using the Java compiler's lookup process
   * Maps to Java symbols.find()
   */
  static findSymbol(
    referencingType: ApexSymbol,
    lowerCaseFullName: string,
    symbolProvider: SymbolProvider,
  ): ApexSymbol | null {
    // Check wrapper types first (highest priority)
    const wrapperType = this.builtInTables.wrapperTypes.get(lowerCaseFullName);
    if (wrapperType) {
      return wrapperType;
    }

    // Check compiled types (would be in symbol provider)
    const compiledType = symbolProvider.find(
      referencingType,
      lowerCaseFullName,
    );
    if (compiledType) {
      return compiledType;
    }

    // Check built-in type tables
    const builtInType = this.builtInTables.findType(lowerCaseFullName);
    if (builtInType) {
      return builtInType;
    }

    // Check symbol provider for org-specific types
    const orgType = symbolProvider.findUserType(lowerCaseFullName);
    if (orgType) {
      return orgType;
    }

    return null;
  }

  /**
   * Resolve with version compatibility check
   * Maps to Java version-dependent resolution
   */
  static resolveWithVersionCheck(
    nameParts: string[],
    compilationContext: CompilationContext,
    referenceType: ReferenceTypeValue,
    identifierContext: IdentifierContextValue,
    symbolProvider: SymbolProvider,
  ): NamespaceResolutionResult {
    const result = this.resolveTypeName(
      nameParts,
      compilationContext,
      referenceType,
      identifierContext,
      symbolProvider,
    );

    // Add version compatibility information
    if (result.symbol) {
      const versionCompatibility = this.checkVersionCompatibility(
        result.symbol,
        compilationContext.version,
      );

      if (!versionCompatibility.isCompatible) {
        return {
          ...result,
          confidence: result.confidence * 0.5, // Reduce confidence for version issues
          errorMessage: `Version compatibility issue: ${versionCompatibility.message}`,
        };
      }
    }

    return result;
  }

  /**
   * Check version compatibility for a symbol
   */
  private static checkVersionCompatibility(
    symbol: ApexSymbol,
    currentVersion: number,
  ): { isCompatible: boolean; message?: string } {
    // Built-in symbols are always compatible
    if (symbol.modifiers?.isBuiltIn) {
      return { isCompatible: true };
    }

    // For user-defined symbols, check if they have version constraints
    // This would be implemented based on symbol metadata
    return { isCompatible: true };
  }

  /**
   * Get resolution statistics
   */
  static getResolutionStats(): {
    totalResolutions: number;
    successfulResolutions: number;
    failedResolutions: number;
    averageConfidence: number;
    ruleUsage: Map<string, number>;
  } {
    // This would track statistics over time
    return {
      totalResolutions: 0,
      successfulResolutions: 0,
      failedResolutions: 0,
      averageConfidence: 0,
      ruleUsage: new Map(),
    };
  }
}
