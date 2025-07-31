/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /** List of error messages */
  errors: string[];
  /** List of warning messages */
  warnings: string[];
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
