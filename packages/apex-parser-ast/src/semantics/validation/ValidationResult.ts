/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { SymbolLocation } from '../../types/symbol';

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
