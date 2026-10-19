/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export { IdentifierValidator } from './IdentifierValidator';

// Expression validation exports
export { TypePromotionSystem } from './TypePromotionSystem';

export type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
  ValidationScope,
} from './ValidationResult';
export {
  deduplicateValidationErrors,
  deduplicateValidationWarnings,
  deduplicateValidationResult,
} from './ValidationResult';
export { ValidationTier, ARTIFACT_LOADING_LIMITS } from './ValidationTier';
export type {
  ArtifactLoadingOptions,
  ValidationOptions,
} from './ValidationTier';

// Export artifact loading helper
export { ArtifactLoadingHelper } from './ArtifactLoadingHelper';
export type { LoadResult } from './ArtifactLoadingHelper';
export {
  ValidatorRegistry,
  ValidatorRegistryLive,
  registerValidator,
  getValidatorsByTier,
  runValidatorsForTier,
  ValidationError,
} from './ValidatorRegistry';
export type {
  Validator,
  ValidatorRegistration,
  ValidatorRegistryService,
} from './ValidatorRegistry';

// Validator implementations
export { ParameterLimitValidator } from './validators/ParameterLimitValidator';
export { EnumLimitValidator } from './validators/EnumLimitValidator';
export { EnumConstantNamingValidator } from './validators/EnumConstantNamingValidator';
export { DuplicateMethodValidator } from './validators/DuplicateMethodValidator';
export { ConstructorNamingValidator } from './validators/ConstructorNamingValidator';
export { TypeSelfReferenceValidator } from './validators/TypeSelfReferenceValidator';
export { AbstractMethodBodyValidator } from './validators/AbstractMethodBodyValidator';
export { VariableShadowingValidator } from './validators/VariableShadowingValidator';
export { ForwardReferenceValidator } from './validators/ForwardReferenceValidator';
export { FinalAssignmentValidator } from './validators/FinalAssignmentValidator';
export { MethodSignatureEquivalenceValidator } from './validators/MethodSignatureEquivalenceValidator';
export { InterfaceHierarchyValidator } from './validators/InterfaceHierarchyValidator';
export { ClassHierarchyValidator } from './validators/ClassHierarchyValidator';
export { TypeAssignmentValidator } from './validators/TypeAssignmentValidator';

// Validator initialization
export {
  initializeValidators,
  getValidatorCounts,
} from './ValidatorInitialization';

export type { ExpressionType } from './TypePromotionSystem';
