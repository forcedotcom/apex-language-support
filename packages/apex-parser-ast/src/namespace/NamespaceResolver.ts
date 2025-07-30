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
} from './namespaceResolution';
import { adjustEmptyNames, validateTriggerNamespace } from './NamespaceUtils';
import { getResolutionOrder } from './ResolutionRules';
import { BuiltInTypeTablesImpl } from '../utils/BuiltInTypeTables';

// Module-level constants (previously private static fields)
const logger = getLogger();
const builtInTables = BuiltInTypeTablesImpl.getInstance();
const MAX_PARTS = 4;

/**
 * Create unresolved resolution result
 * Maps to Java UnresolvedTypeInfoFactory.create()
 */
const createUnresolvedResult = (
  errorMessage: string,
  nameParts: string[],
): NamespaceResolutionResult => ({
  symbol: null,
  isResolved: false,
  resolutionRule: null,
  confidence: 0,
  errorMessage,
  unresolvedNameParts: nameParts,
});

/**
 * Calculate confidence score for resolution result
 */
const calculateConfidence = (
  rule: ResolutionRule,
  context: NamespaceResolutionContext,
): number => {
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
};

/**
 * Step 1: Input Validation and Normalization
 * Maps to Java input validation and normalization
 */
const validateAndNormalizeInput = (
  nameParts: string[],
  compilationContext: CompilationContext,
): { isValid: boolean; adjustedNameParts: string[]; errorMessage?: string } => {
  // Handle double dots (..) in type names
  const adjustedNameParts = adjustEmptyNames(
    nameParts,
    compilationContext.version,
  );

  // Validate maximum parts (up to 4 parts allowed)
  if (adjustedNameParts.length > MAX_PARTS) {
    return {
      isValid: false,
      adjustedNameParts,
      errorMessage: `Too many name parts: ${adjustedNameParts.length} (max: ${MAX_PARTS})`,
    };
  }

  // Validate trigger namespace usage
  if (!validateTriggerNamespace(adjustedNameParts)) {
    return {
      isValid: false,
      adjustedNameParts,
      errorMessage: 'Trigger namespace cannot be used for type references',
    };
  }

  // Convert all names to lowercase for case-insensitive resolution
  const normalizedParts = adjustedNameParts.map((part: string) =>
    part.toLowerCase(),
  );

  return {
    isValid: true,
    adjustedNameParts: normalizedParts,
  };
};

/**
 * Step 4: Apply resolution rules in order
 * Maps to Java rule application process
 */
const applyResolutionRules = (
  context: NamespaceResolutionContext,
  rules: ResolutionRule[],
  symbolProvider: SymbolProvider,
): NamespaceResolutionResult => {
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
        confidence: calculateConfidence(rule, context),
      };
    }
  }

  // No rule matched - create unresolved result
  return createUnresolvedResult(
    'No resolution rule matched',
    context.adjustedNameParts,
  );
};

/**
 * Main namespace resolver implementing Java compiler's resolution process
 * Maps to Java TypeNameResolver
 */
export const resolveTypeName = (
  nameParts: string[],
  compilationContext: CompilationContext,
  referenceType: ReferenceTypeValue,
  identifierContext: IdentifierContextValue,
  symbolProvider: SymbolProvider,
): NamespaceResolutionResult => {
  try {
    // Step 1: Input Validation and Normalization
    const validationResult = validateAndNormalizeInput(
      nameParts,
      compilationContext,
    );
    if (!validationResult.isValid) {
      return createUnresolvedResult(validationResult.errorMessage!, nameParts);
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
    const resolutionRules = getResolutionOrder(referenceType);

    // Step 4: Apply resolution rules in order
    const resolutionResult = applyResolutionRules(
      resolutionContext,
      resolutionRules,
      symbolProvider,
    );

    return resolutionResult;
  } catch (error) {
    logger.error(
      () =>
        `Error in namespace resolution: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );

    return createUnresolvedResult(
      `Resolution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      nameParts,
    );
  }
};
