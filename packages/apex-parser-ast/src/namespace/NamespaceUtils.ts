/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { ApexSymbol, SymbolTable } from '../types/symbol';
import { getResolutionOrder } from './ResolutionRules';

const TRIGGER_NAMESPACE = 'trigger';
const MAX_PARTS = 4;

// ============================================================================
// NAMESPACE CLASSES AND TYPES
// ============================================================================

/**
 * A namespace descriptor.
 */
export class Namespace {
  readonly global: string;
  readonly module: string;
  private readonly name: string;
  private nameLowerCase: string | null = null;

  constructor(global: string, module: string) {
    this.global = global ?? '';
    this.module = module ?? '';
    this.name = !module ? this.global : `${this.global}__${this.module}`;
  }

  static isEmptyOrNull(namespace: Namespace | null): boolean {
    return (
      namespace == null || (namespace.global === '' && namespace.module === '')
    );
  }

  getGlobal(): string {
    return this.global;
  }

  hasModule(): boolean {
    return !!this.module;
  }

  getModule(): string {
    return this.module;
  }

  getNameLower(): string {
    if (this.nameLowerCase === null) {
      this.nameLowerCase = this.name.toLowerCase();
    }
    return this.nameLowerCase;
  }

  toString(): string {
    return this.name;
  }
}

/**
 * Namespace utilities for creating and managing Apex namespaces.
 *
 * Note: We intentionally do not hardcode built-in namespace constants here
 * because the StandardApexLibrary folder already contains all the actual
 * namespace information. Instead, namespaces should be discovered dynamically
 * from the StandardApexLibrary structure or created on-demand during compilation.
 */
export class Namespaces {
  public static readonly EMPTY: Namespace = Namespaces.create('', '');

  private static readonly NAMESPACES: Set<Namespace> = new Set<Namespace>();

  /**
   * Need a way to parse a while namespace name, such as bmc__foo__c or localModule__bmc__foo__c
   * Then lets intern the namespaces so we don't parse so many damn times.
   */
  public static parse(fullNamespace: string): Namespace {
    const index = fullNamespace.indexOf('__');
    const namespace =
      index > -1
        ? Namespaces.create(
            fullNamespace.substring(0, index),
            fullNamespace.substring(index + 2),
          )
        : Namespaces.create(fullNamespace);

    return Namespaces.intern(namespace);
  }

  /**
   * If this is a raw namespace, then you need to parse it otherwise you can create just a global namespace here.
   */
  public static create(global: string): Namespace;
  public static create(global: string, module: string): Namespace;
  public static create(global: string, module: string = ''): Namespace {
    const namespace = new Namespace(global, module);
    if (Namespace.isEmptyOrNull(namespace)) {
      return Namespaces.EMPTY;
    }
    return namespace;
  }

  private static intern(namespace: Namespace): Namespace {
    for (const existingNamespace of Namespaces.NAMESPACES) {
      if (
        existingNamespace.global === namespace.global &&
        existingNamespace.module === namespace.module
      ) {
        return existingNamespace;
      }
    }
    Namespaces.NAMESPACES.add(namespace);
    return namespace;
  }
}

// ============================================================================
// NAMESPACE RESOLUTION TYPES AND INTERFACES
// ============================================================================

/**
 * Reference types that determine resolution order
 * Maps to Java ReferenceType enum
 */
export const ReferenceTypeEnum = {
  LOAD: 'LOAD',
  STORE: 'STORE',
  METHOD: 'METHOD',
  CLASS: 'CLASS',
  NONE: 'NONE',
} as const;

export type ReferenceTypeValue =
  (typeof ReferenceTypeEnum)[keyof typeof ReferenceTypeEnum];

/**
 * Identifier context for resolution
 * Maps to Java IdentifierContext enum
 */
export const IdentifierContext = {
  STATIC: 'STATIC',
  OBJECT: 'OBJECT',
  NONE: 'NONE',
} as const;

export type IdentifierContextValue =
  (typeof IdentifierContext)[keyof typeof IdentifierContext];

/**
 * Resolution order types based on reference type
 * Maps to Java TypeNameResolutionOrder
 */
export const ResolutionOrder = {
  VARIABLE: 'VARIABLE',
  METHOD: 'METHOD',
  CLASS_REF: 'CLASS_REF',
  DEFAULT: 'DEFAULT',
} as const;

export type ResolutionOrderValue =
  (typeof ResolutionOrder)[keyof typeof ResolutionOrder];

/**
 * Compilation context information
 * Maps to Java CodeUnitDetails
 */
export interface CompilationContext {
  readonly namespace: Namespace | null;
  readonly version: number;
  readonly isTrusted: boolean;
  readonly sourceType: 'FILE' | 'DATABASE' | 'GENERATED';
  readonly referencingType: ApexSymbol;
  readonly enclosingTypes: ApexSymbol[];
  readonly parentTypes: ApexSymbol[];
  readonly isStaticContext: boolean;
  /** Current compilation unit's symbol table for constrained resolution during compilation */
  readonly currentSymbolTable?: SymbolTable;
}

/**
 * Symbol resolution context with all required information
 * Maps to Java resolution context requirements
 */
export interface NamespaceResolutionContext {
  readonly compilationContext: CompilationContext;
  readonly referenceType: ReferenceTypeValue;
  readonly identifierContext: IdentifierContextValue;
  readonly nameParts: string[];
  readonly adjustedNameParts: string[];
  readonly isCaseInsensitive: boolean;
}

/**
 * Resolution rule interface
 * Maps to Java resolution rule pattern
 */
export interface ResolutionRule {
  readonly name: string;
  readonly priority: number;
  readonly appliesTo: (context: NamespaceResolutionContext) => boolean;
  readonly resolve: (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ) => ApexSymbol | null;
}

/**
 * Symbol provider interface
 * Maps to Java SymbolProvider
 */
export interface SymbolProvider {
  find(referencingType: ApexSymbol, fullName: string): ApexSymbol | null;
  findBuiltInType(name: string): ApexSymbol | null;
  findSObjectType(name: string): ApexSymbol | null;
  findExternalType(name: string, packageName: string): ApexSymbol | null;
}

/**
 * Extended SymbolProvider with support for standard namespace lookup.
 * Used by BuiltInMethodNamespace to resolve types in Canvas, Database, etc.
 * Excludes System and Schema (handled by FileBaseSystemNamespace/FileBaseSchemaNamespace).
 */
export interface SymbolProviderWithStandardNamespace extends SymbolProvider {
  findInAnyStandardNamespace(
    name: string,
    referencingType: ApexSymbol,
  ): ApexSymbol | null;
}

/**
 * Resolution result with detailed information
 */
export interface NamespaceResolutionResult {
  readonly symbol: ApexSymbol | null;
  readonly isResolved: boolean;
  readonly resolutionRule: string | null;
  readonly confidence: number;
  readonly errorMessage?: string;
  readonly unresolvedNameParts?: string[];
}

/**
 * Built-in type tables
 * Maps to Java TypeInfoTables
 * Note: Wrapper types, collection types (List, Set, Map), System types,
 * and Schema types are now resolved via ResourceLoader
 * This interface only includes types that aren't real classes (scalar, sObject)
 */
export interface BuiltInTypeTables {
  readonly scalarTypes: Map<string, ApexSymbol>;
  readonly sObjectTypes: Map<string, ApexSymbol>;
}

/**
 * Namespace resolution order configuration
 * Maps to Java TypeNameResolutionOrders
 */
export interface ResolutionOrderConfig {
  readonly maxParts: number;
  readonly onePartRules: ResolutionRule[];
  readonly twoPartRules: ResolutionRule[];
  readonly threePartRules: ResolutionRule[];
  readonly fourPartRules: ResolutionRule[];
}

/**
 * Version compatibility information
 */
export interface VersionCompatibility {
  readonly minVersion: number;
  readonly maxVersion: number;
  readonly isDeprecated: boolean;
  readonly replacementRule?: string;
}

/**
 * Namespace parsing result
 */
export interface NamespaceParseResult {
  readonly namespace: Namespace;
  readonly isValid: boolean;
  readonly errorMessage?: string;
}

/**
 * Type name construction options
 */
export interface TypeNameConstructionOptions {
  readonly includeNamespace: boolean;
  readonly normalizeCase: boolean;
  readonly separator: string;
}

// ============================================================================
// NAMESPACE UTILITY FUNCTIONS
// ============================================================================

/**
 * Get default type name construction options
 */
const getDefaultOptions = (): TypeNameConstructionOptions => ({
  includeNamespace: true,
  normalizeCase: true,
  separator: '/',
});

/**
 * Create an empty/null namespace
 * Maps to Java Namespaces.empty()
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createEmptyNamespace = (): Namespace => Namespaces.EMPTY;

/**
 * Check if namespace is null or empty
 * Maps to Java Namespace.isEmptyOrNull()
 */
const isEmptyOrNull = (namespace: Namespace): boolean =>
  Namespace.isEmptyOrNull(namespace);

/**
 * Create type name with namespace
 * Maps to Java createTypeWithNamespace()
 */
export const createTypeWithNamespace = (
  namespace: Namespace,
  typeName: string,
  options: TypeNameConstructionOptions = getDefaultOptions(),
): string => {
  if (isEmptyOrNull(namespace)) {
    return options.normalizeCase ? typeName.toLowerCase() : typeName;
  }

  const namespacePart = namespace.toString();

  const separator = options.separator || '/';
  const result = `${namespacePart}${separator}${typeName}`;

  return options.normalizeCase ? result.toLowerCase() : result;
};

/**
 * Validate trigger namespace usage
 * Maps to Java trigger namespace validation
 */
export const validateTriggerNamespace = (nameParts: string[]): boolean => {
  if (nameParts.length === 0) return true;

  const firstPart = nameParts[0];
  if (firstPart && firstPart.toLowerCase() === TRIGGER_NAMESPACE) {
    getLogger().warn(
      () => 'Trigger namespace cannot be used for type references',
    );
    return false;
  }

  return true;
};

/**
 * Adjust empty names in type name parts
 * Maps to Java adjustEmptyNames()
 */
export const adjustEmptyNames = (
  nameParts: string[],
  version: number,
): string[] => {
  const adjusted: string[] = [];

  for (let i = 0; i < nameParts.length; i++) {
    const part = nameParts[i];

    // Handle double dots (..) which create empty parts
    if (part === '' || part === null || part === undefined) {
      // For older versions, empty parts might be allowed
      if (version < 50) {
        adjusted.push(''); // Keep empty part for older versions
      }
      // For newer versions, skip empty parts
    } else {
      adjusted.push(part);
    }
  }

  return adjusted;
};

// ============================================================================
// NAMESPACE RESOLVER FUNCTIONS
// ============================================================================

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
 * Maps to Apex rule application process
 */
const applyResolutionRules = (
  context: NamespaceResolutionContext,
  rules: ResolutionRule[],
  symbolProvider: SymbolProvider,
): NamespaceResolutionResult => {
  // Apply rules in priority order
  // Note: This is a synchronous function. For better performance with many rules,
  // consider calling from an async context or converting to Effect-based resolution
  for (const rule of rules) {
    // Check if rule applies to this context
    if (!rule.appliesTo(context)) {
      continue;
    }

    // Try to resolve using this rule
    // Each rule.resolve() may perform symbol lookups which can be expensive
    const symbol = rule.resolve(context, symbolProvider);

    if (symbol) {
      return {
        symbol,
        isResolved: true,
        resolutionRule: rule.name,
        confidence: calculateConfidence(rule, context),
      };
    }
    // Note: Yielding between rules would require async/Effect conversion
    // For now, this remains synchronous for backward compatibility
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
    getLogger().error(
      () =>
        `Error in namespace resolution: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );

    return createUnresolvedResult(
      `Resolution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      nameParts,
    );
  }
};
