/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Centralized error code constants for semantic validation.
 *
 * These constants hold the original error code keys from the old language server (jorje)
 * for backward compatibility. The constants provide semantic names for code readability,
 * while the values (old LS keys) are used for:
 * - Diagnostic codes (LSP diagnostic.code field)
 * - Message lookup keys (via I18nSupport.getLabel())
 *
 * Format: Constants use UPPER_SNAKE_CASE for readability, values are dot-separated lowercase
 * matching jorje's error code format (e.g., 'invalid.number.parameters').
 */

// Parameter and Enum Limits
export const PARAMETER_LIMIT_EXCEEDED = 'invalid.number.parameters';
export const ENUM_LIMIT_EXCEEDED = 'max.enums.exceeded';

// Identifier Validation
export const INVALID_RESERVED_NAME_IDENTIFIER =
  'invalid.reserved.name.identifier';
export const INVALID_RESERVED_TYPE_IDENTIFIER =
  'invalid.reserved.type.identifier';
export const INVALID_KEYWORD_IDENTIFIER = 'invalid.keyword.identifier';
export const INVALID_CHARACTER_IDENTIFIER = 'invalid.character.identifier';
export const IDENTIFIER_TOO_LONG = 'identifier.too.long';

// Duplicate Validations
export const DUPLICATE_METHOD = 'method.already.exists';
export const DUPLICATE_METHOD_SIGNATURE = 'method.already.exists';
export const DUPLICATE_FIELD = 'duplicate.field';
export const DUPLICATE_VARIABLE = 'duplicate.variable';
export const DUPLICATE_MODIFIER = 'duplicate.modifier';
export const DUPLICATE_EXTENDS = 'generic.interface.already.implemented';

// Variable and Field Validations
export const VARIABLE_SHADOWING = 'duplicate.variable'; // Note: May need separate code if validated as new
export const FORWARD_REFERENCE = 'illegal.forward.reference';
export const FINAL_PARAMETER_REASSIGNMENT = 'invalid.final.field.assignment';
export const FINAL_MULTIPLE_ASSIGNMENT = 'invalid.final.field.assignment';

// Type Hierarchy Validations
export const CIRCULAR_INHERITANCE = 'circular.definition';
export const CLASS_EXTENDS_SELF = 'circular.definition';
export const INTERFACE_EXTENDS_SELF = 'circular.definition';
export const CLASS_IMPLEMENTS_SELF = 'circular.definition';
export const INVALID_FINAL_SUPER_TYPE = 'invalid.final.super.type';
export const INVALID_INTERFACE = 'invalid.interface';
export const INTERFACE_ALREADY_IMPLEMENTED = 'interface.already.implemented';
export const MISSING_INTERFACE_METHOD =
  'interface.implementation.missing.method';
export const MISSING_INTERFACE = 'interface.implementation.missing.method'; // Fallback for missing interface

// Constructor Validations
export const CONSTRUCTOR_NAME_MISMATCH = 'invalid.constructor.name';
export const CONSTRUCTOR_NO_PARENT = 'invalid.constructor.name'; // May need separate code

// Abstract Method Validations
export const ABSTRACT_METHOD_HAS_BODY = 'abstract.methods.cannot.have.body';
export const ABSTRACT_IN_CONCRETE_CLASS = 'abstract.methods.cannot.have.body'; // May need separate code
export const REDUNDANT_ABSTRACT_MODIFIER = 'abstract.methods.cannot.have.body'; // May need separate code

// Enum Constant Naming
export const INVALID_ENUM_CONSTANT_NAME = 'invalid.character.identifier'; // Uses same as identifier validation
export const ENUM_CONSTANT_NAMING_WARNING = 'invalid.character.identifier'; // Warning variant

// Class Hierarchy
export const EXTEND_FINAL_CLASS = 'invalid.final.super.type'; // Alias for consistency
export const INVALID_SUPERCLASS_TYPE = 'invalid.class'; // For invalid superclass types
export const MISSING_SUPERCLASS = 'invalid.super.type'; // For missing superclasses

// Type Assignment
export const TYPE_MISMATCH = 'illegal.assignment'; // For type mismatches

// Source Size Validation
export const SCRIPT_TOO_LARGE = 'script.too.large'; // File exceeds maximum size limit

/**
 * Namespace export for convenience (allows import { ErrorCodes } from './ErrorCodes')
 * All error code constants are also available as named exports
 */
export const ErrorCodes = {
  // Parameter and Enum Limits
  PARAMETER_LIMIT_EXCEEDED,
  ENUM_LIMIT_EXCEEDED,

  // Identifier Validation
  INVALID_RESERVED_NAME_IDENTIFIER,
  INVALID_RESERVED_TYPE_IDENTIFIER,
  INVALID_KEYWORD_IDENTIFIER,
  INVALID_CHARACTER_IDENTIFIER,
  IDENTIFIER_TOO_LONG,

  // Duplicate Validations
  DUPLICATE_METHOD,
  DUPLICATE_METHOD_SIGNATURE,
  DUPLICATE_FIELD,
  DUPLICATE_VARIABLE,
  DUPLICATE_MODIFIER,
  DUPLICATE_EXTENDS,

  // Variable and Field Validations
  VARIABLE_SHADOWING,
  FORWARD_REFERENCE,
  FINAL_PARAMETER_REASSIGNMENT,
  FINAL_MULTIPLE_ASSIGNMENT,

  // Type Hierarchy Validations
  CIRCULAR_INHERITANCE,
  CLASS_EXTENDS_SELF,
  INTERFACE_EXTENDS_SELF,
  CLASS_IMPLEMENTS_SELF,
  INVALID_FINAL_SUPER_TYPE,
  INVALID_INTERFACE,
  INTERFACE_ALREADY_IMPLEMENTED,
  MISSING_INTERFACE_METHOD,
  MISSING_INTERFACE,

  // Constructor Validations
  CONSTRUCTOR_NAME_MISMATCH,
  CONSTRUCTOR_NO_PARENT,

  // Abstract Method Validations
  ABSTRACT_METHOD_HAS_BODY,
  ABSTRACT_IN_CONCRETE_CLASS,
  REDUNDANT_ABSTRACT_MODIFIER,

  // Enum Constant Naming
  INVALID_ENUM_CONSTANT_NAME,
  ENUM_CONSTANT_NAMING_WARNING,

  // Class Hierarchy
  EXTEND_FINAL_CLASS,
  INVALID_SUPERCLASS_TYPE,
  MISSING_SUPERCLASS,

  // Type Assignment
  TYPE_MISMATCH,

  // Source Size Validation
  SCRIPT_TOO_LARGE,
} as const;
