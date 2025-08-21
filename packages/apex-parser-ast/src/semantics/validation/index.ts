/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export { IdentifierValidator } from './IdentifierValidator';
export { TypeValidator, TypeVisibilityValidator } from './TypeValidator';
export { TypeVisibilityValidator as TypeVisibilityValidatorClass } from './TypeVisibilityValidator';
export { TypeCastingValidator } from './TypeCastingValidator';
export { CollectionTypeValidator } from './CollectionTypeValidator';
export { SObjectTypeValidator } from './SObjectTypeValidator';

// Method validation exports
export { AddErrorMethodValidator } from './AddErrorMethodValidator';
export { DecimalToDoubleValidator } from './DecimalToDoubleValidator';
export { MapPutAllValidator } from './MapPutAllValidator';
export { SObjectCollectionValidator } from './SObjectCollectionValidator';
export { SystemComparatorValidator } from './SystemComparatorValidator';
export { CustomEntityValidator } from './CustomEntityValidator';

// Expression validation exports
export { TypePromotionSystem } from './TypePromotionSystem';
export { BinaryExpressionValidator } from './BinaryExpressionValidator';
export { BooleanExpressionValidator } from './BooleanExpressionValidator';
export { VariableExpressionValidator } from './VariableExpressionValidator';
export { ConstructorExpressionValidator } from './ConstructorExpressionValidator';
export { ExpressionValidator } from './ExpressionValidator';

export type { ValidationResult, ValidationScope } from './ValidationResult';
export type {
  TypeInfo,
  TypeValidationResult,
  TypeValidationContext,
  CompilationContext,
} from './TypeValidator';
export type {
  CollectionValidationContext,
  CompilationContext as CollectionCompilationContext,
} from './CollectionTypeValidator';
export type {
  ValidationScope as SObjectValidationScope,
  SObjectFieldInfo,
  SObjectValidationContext,
} from './SObjectTypeValidator';

// Custom entity validation types
export type {
  CustomEntityTypeInfo,
  CustomEntityFieldInfo,
  CustomEntityOperationInfo,
  CustomEntityVisibilityInfo,
} from './CustomEntityValidator';

// Expression validation types
export type {
  BinaryExpression,
  ComparisonExpression,
  VariableExpression,
  NotExpression,
  ConstructorExpression,
  Expression,
} from './ExpressionValidator';
export type { ExpressionType } from './TypePromotionSystem';
