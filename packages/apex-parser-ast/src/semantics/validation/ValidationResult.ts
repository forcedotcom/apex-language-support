/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { SymbolLocation } from '../../types/symbol';
import type { ValidationEnrichmentData } from './enrichment/SymbolTableEnrichmentService';

/**
 * A validation error with location information
 * Note: This is different from the ValidationError class in ValidatorRegistry
 * which is used for Effect error handling.
 */
export interface ValidationErrorInfo {
  /** Error message */
  message: string;
  /** Location in source code where the error occurs */
  location?: SymbolLocation;
  /** Optional error code for categorization */
  code?: string;
}

/**
 * A validation warning with location information
 */
export interface ValidationWarningInfo {
  /** Warning message */
  message: string;
  /** Location in source code where the warning occurs */
  location?: SymbolLocation;
  /** Optional warning code for categorization */
  code?: string;
}

/**
 * Result of a validation operation
 *
 * Supports both legacy format (string[]) and new format (ValidationError[])
 * for backward compatibility during migration.
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /**
   * List of validation errors.
   * Can be either string[] (legacy) or ValidationErrorInfo[] (new format with locations).
   * New validators should use ValidationErrorInfo[] format.
   */
  errors: ValidationErrorInfo[] | string[];
  /**
   * List of validation warnings.
   * Can be either string[] (legacy) or ValidationWarningInfo[] (new format with locations).
   * New validators should use ValidationWarningInfo[] format.
   */
  warnings: ValidationWarningInfo[] | string[];
  /** Type information (for expression validation) */
  type?: any;
  /**
   * Optional enrichment data discovered during validation that can improve symbol table quality
   */
  enrichmentData?: ValidationEnrichmentData;
}

/**
 * Context for validation operations
 */
export interface ValidationScope {
  /** Whether long identifiers are supported */
  supportsLongIdentifiers: boolean;
  /** Apex version for validation rules */
  version: number;
  /** Whether the code is file-based */
  isFileBased: boolean;
}

/**
 * Create a unique key for a validation error/warning for deduplication
 * Uses code, location (if available), and message to identify duplicates
 */
function createErrorKey(
  error: ValidationErrorInfo | ValidationWarningInfo,
): string {
  const code = error.code || 'UNKNOWN';
  const message = error.message;

  if (error.location?.identifierRange) {
    const range = error.location.identifierRange;
    return `${code}|${range.startLine}:${range.startColumn}-${range.endLine}:${range.endColumn}|${message}`;
  } else if (error.location?.symbolRange) {
    const range = error.location.symbolRange;
    return `${code}|${range.startLine}:${range.startColumn}-${range.endLine}:${range.endColumn}|${message}`;
  }

  // Fallback: use code and message only (less precise but still helps)
  return `${code}|${message}`;
}

/**
 * Deduplicate validation errors by code, location, and message
 * Prevents duplicate diagnostics from being reported when duplicate symbols exist
 */
export function deduplicateValidationErrors(
  errors: ValidationErrorInfo[],
): ValidationErrorInfo[] {
  const seen = new Set<string>();
  const deduplicated: ValidationErrorInfo[] = [];

  for (const error of errors) {
    const key = createErrorKey(error);
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(error);
    }
  }

  return deduplicated;
}

/**
 * Deduplicate validation warnings by code, location, and message
 * Prevents duplicate diagnostics from being reported when duplicate symbols exist
 */
export function deduplicateValidationWarnings(
  warnings: ValidationWarningInfo[],
): ValidationWarningInfo[] {
  const seen = new Set<string>();
  const deduplicated: ValidationWarningInfo[] = [];

  for (const warning of warnings) {
    const key = createErrorKey(warning);
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(warning);
    }
  }

  return deduplicated;
}

/**
 * Deduplicate a ValidationResult's errors and warnings
 * Handles both legacy format (string[]) and new format (ValidationErrorInfo[])
 */
export function deduplicateValidationResult(
  result: ValidationResult,
): ValidationResult {
  // Deduplicate errors
  let deduplicatedErrors: ValidationErrorInfo[] | string[];
  if (Array.isArray(result.errors) && result.errors.length > 0) {
    if (typeof result.errors[0] === 'string') {
      // Legacy format: deduplicate strings
      deduplicatedErrors = Array.from(new Set(result.errors as string[]));
    } else {
      // New format: deduplicate ValidationErrorInfo
      deduplicatedErrors = deduplicateValidationErrors(
        result.errors as ValidationErrorInfo[],
      );
    }
  } else {
    deduplicatedErrors = result.errors;
  }

  // Deduplicate warnings
  let deduplicatedWarnings: ValidationWarningInfo[] | string[];
  if (Array.isArray(result.warnings) && result.warnings.length > 0) {
    if (typeof result.warnings[0] === 'string') {
      // Legacy format: deduplicate strings
      deduplicatedWarnings = Array.from(new Set(result.warnings as string[]));
    } else {
      // New format: deduplicate ValidationWarningInfo
      deduplicatedWarnings = deduplicateValidationWarnings(
        result.warnings as ValidationWarningInfo[],
      );
    }
  } else {
    deduplicatedWarnings = result.warnings;
  }

  return {
    ...result,
    errors: deduplicatedErrors,
    warnings: deduplicatedWarnings,
  };
}
