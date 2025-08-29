/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Type system for expression validation
 */
export interface ExpressionType {
  kind: 'primitive' | 'object' | 'collection' | 'void' | 'unresolved';
  name: string;
  isNullable: boolean;
  isArray: boolean;
  elementType?: ExpressionType;
  keyType?: ExpressionType; // For maps
  valueType?: ExpressionType; // For maps
}

/**
 * Type promotion system for Apex expressions
 */
export class TypePromotionSystem {
  // Primitive types
  static readonly VOID: ExpressionType = {
    kind: 'primitive',
    name: 'void',
    isNullable: false,
    isArray: false,
  };

  static readonly BOOLEAN: ExpressionType = {
    kind: 'primitive',
    name: 'boolean',
    isNullable: false,
    isArray: false,
  };

  static readonly INTEGER: ExpressionType = {
    kind: 'primitive',
    name: 'integer',
    isNullable: false,
    isArray: false,
  };

  static readonly LONG: ExpressionType = {
    kind: 'primitive',
    name: 'long',
    isNullable: false,
    isArray: false,
  };

  static readonly DOUBLE: ExpressionType = {
    kind: 'primitive',
    name: 'double',
    isNullable: false,
    isArray: false,
  };

  static readonly DECIMAL: ExpressionType = {
    kind: 'primitive',
    name: 'decimal',
    isNullable: false,
    isArray: false,
  };

  static readonly STRING: ExpressionType = {
    kind: 'primitive',
    name: 'string',
    isNullable: false,
    isArray: false,
  };

  static readonly DATE: ExpressionType = {
    kind: 'primitive',
    name: 'date',
    isNullable: false,
    isArray: false,
  };

  static readonly DATETIME: ExpressionType = {
    kind: 'primitive',
    name: 'datetime',
    isNullable: false,
    isArray: false,
  };

  static readonly TIME: ExpressionType = {
    kind: 'primitive',
    name: 'time',
    isNullable: false,
    isArray: false,
  };

  /**
   * Check if type is numeric
   */
  static isNumeric(type: ExpressionType): boolean {
    return (
      type === this.INTEGER ||
      type === this.LONG ||
      type === this.DOUBLE ||
      type === this.DECIMAL
    );
  }

  /**
   * Check if type is integer or long
   */
  static isIntegerOrLong(type: ExpressionType): boolean {
    return type === this.INTEGER || type === this.LONG;
  }

  /**
   * Check if type is date/time
   */
  static isDateTime(type: ExpressionType): boolean {
    return type === this.DATE || type === this.DATETIME || type === this.TIME;
  }

  /**
   * Promote types for arithmetic operations
   */
  static promoteTypes(
    left: ExpressionType,
    right: ExpressionType,
  ): ExpressionType {
    // String concatenation
    if (left === this.STRING || right === this.STRING) {
      return this.STRING;
    }

    // Date/Time operations
    if (this.isDateTime(left)) {
      return left;
    }

    // Numeric promotion
    if (left === this.DECIMAL || right === this.DECIMAL) {
      return this.DECIMAL;
    }
    if (left === this.DOUBLE || right === this.DOUBLE) {
      return this.DOUBLE;
    }
    if (left === this.LONG || right === this.LONG) {
      return this.LONG;
    }

    return this.INTEGER;
  }
}
