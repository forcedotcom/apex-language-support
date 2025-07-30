/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbol, SymbolTable } from '../types/symbol';
import { Namespace } from './namespaces';

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
  findUserType(name: string, namespace?: string): ApexSymbol | null;
  findExternalType(name: string, packageName: string): ApexSymbol | null;
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
 */
export interface BuiltInTypeTables {
  readonly wrapperTypes: Map<string, ApexSymbol>;
  readonly scalarTypes: Map<string, ApexSymbol>;
  readonly systemTypes: Map<string, ApexSymbol>;
  readonly schemaTypes: Map<string, ApexSymbol>;
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
  readonly useBytecodeName: boolean;
  readonly includeNamespace: boolean;
  readonly normalizeCase: boolean;
  readonly separator: string;
}
