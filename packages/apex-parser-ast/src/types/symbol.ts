/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap } from 'data-structure-typed';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { TypeInfo } from './typeInfo';
import {
  Namespace,
  createTypeWithNamespace,
} from '../namespace/NamespaceUtils';
import { SymbolReference, ReferenceContext } from './symbolReference';
import { generateSymbolId } from './UriBasedIdGenerator';
import { HierarchicalReference } from './hierarchicalReference';
import { DetailLevel } from '../parser/listeners/LayeredSymbolListenerBase';

/**
 * Types of symbols that can be defined in Apex code
 */
export enum SymbolKind {
  Class = 'class',
  Interface = 'interface',
  Trigger = 'trigger',
  Method = 'method',
  Constructor = 'constructor',
  Property = 'property',
  Field = 'field',
  Variable = 'variable',
  Parameter = 'parameter',
  Enum = 'enum',
  EnumValue = 'enumValue',
  Block = 'block',
}

/**
 * Represents the visibility (access modifier) of a symbol
 */
export enum SymbolVisibility {
  Public = 'public',
  Private = 'private',
  Protected = 'protected',
  Global = 'global',
  Default = 'default',
}

/**
 * Modifier bit flags for memory efficiency
 */
export const ModifierFlags = {
  PUBLIC: 1 << 0,
  PRIVATE: 1 << 1,
  PROTECTED: 1 << 2,
  GLOBAL: 1 << 3,
  STATIC: 1 << 4,
  FINAL: 1 << 5,
  ABSTRACT: 1 << 6,
  VIRTUAL: 1 << 7,
  OVERRIDE: 1 << 8,
  TRANSIENT: 1 << 9,
  TEST_METHOD: 1 << 10,
  WEB_SERVICE: 1 << 11,
  BUILT_IN: 1 << 12,
} as const;

/**
 * Symbol kind enum as numbers for memory efficiency
 */
export const SymbolKindValues = {
  [SymbolKind.Class]: 0,
  [SymbolKind.Interface]: 1,
  [SymbolKind.Trigger]: 2,
  [SymbolKind.Method]: 3,
  [SymbolKind.Constructor]: 4,
  [SymbolKind.Property]: 5,
  [SymbolKind.Field]: 6,
  [SymbolKind.Variable]: 7,
  [SymbolKind.Parameter]: 8,
  [SymbolKind.Enum]: 9,
  [SymbolKind.EnumValue]: 10,
  [SymbolKind.Block]: 11,
} as const;

/**
 * Factory for creating unified ApexSymbol instances
 */
export class SymbolFactory {
  /**
   * Create a minimal symbol with lazy loading support
   */
  static createMinimalSymbol(
    name: string,
    kind: SymbolKind,
    location: SymbolLocation,
    fileUri: string,
    parentId: string | null = null,
    modifiers: SymbolModifiers = this.createDefaultModifiers(),
    scopePath?: string[],
  ): ApexSymbol {
    const id = this.generateId(name, fileUri, scopePath, kind, location);
    const key: SymbolKey = {
      prefix: kind,
      name,
      path: [fileUri, name],
      unifiedId: id,
      fileUri: fileUri,
      kind,
    };

    return {
      id,
      name,
      kind,
      location,
      fileUri: fileUri,
      parentId,
      key,
      _isLoaded: false,
      modifiers,
    };
  }

  /**
   * Create default modifiers
   */
  private static createDefaultModifiers(): SymbolModifiers {
    return {
      visibility: SymbolVisibility.Default,
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      isVirtual: false,
      isOverride: false,
      isTransient: false,
      isTestMethod: false,
      isWebService: false,
      isBuiltIn: false,
    };
  }

  /**
   * Create a full symbol with all data loaded
   */
  static createFullSymbol(
    name: string,
    kind: SymbolKind,
    location: SymbolLocation,
    fileUri: string,
    modifiers: SymbolModifiers,
    parentId: string | null = null,
    typeData?: any,
    fqn?: string,
    namespace?: string,
    annotations?: Annotation[],
    identifierLocation?: SymbolLocation,
    parentSymbol?: ApexSymbol, // Optional parent symbol (for future use)
    scopePath?: string[],
  ): ApexSymbol {
    const id = this.generateId(name, fileUri, scopePath, kind, location);
    const key: SymbolKey = {
      prefix: kind,
      name,
      path: [fileUri, name],
      unifiedId: id,
      fileUri: fileUri,
      fqn,
      kind,
    };

    return {
      id,
      name,
      kind,
      location,
      fileUri,
      parentId,
      key,
      fqn,
      namespace: namespace || null, // Ensure null instead of undefined
      annotations,
      identifierLocation,
      _isLoaded: true,
      modifiers,
    };
  }

  /**
   * Create a full symbol with explicit namespace support
   */
  static createFullSymbolWithNamespace(
    name: string,
    kind: SymbolKind,
    location: SymbolLocation,
    fileUri: string,
    modifiers: SymbolModifiers,
    parentId: string | null = null,
    typeData?: any,
    namespace?: string | Namespace | null,
    annotations?: Annotation[],
    scopePath?: string[],
  ): ApexSymbol {
    const id = this.generateId(name, fileUri, scopePath, kind, location);

    // Calculate FQN if namespace is provided (case-insensitive for Apex)
    // For top-level symbols, this gives us the full FQN immediately.
    // For child symbols, this gives us a partial FQN (namespace.name) which will be
    // recalculated later with the full parent hierarchy when the symbol is added to the graph.
    const fqn =
      namespace && typeof namespace === 'object' && 'toString' in namespace
        ? createTypeWithNamespace(namespace as Namespace, name, {
            includeNamespace: true,
            normalizeCase: true, // Normalize to lowercase for Apex case-insensitive convention
            separator: '.', // Use dot separator for Apex namespace convention
          })
        : undefined;

    const key: SymbolKey = {
      prefix: kind,
      name,
      path: [fileUri, name],
      unifiedId: id,
      fileUri,
      fqn,
      kind,
    };

    return {
      id,
      name,
      kind,
      location,
      fileUri,
      parentId,
      key,
      fqn,
      namespace, // Store the Namespace object directly
      annotations,
      _isLoaded: true,
      modifiers,
    };
  }

  /**
   * Create a block symbol
   * @param name The block name
   * @param scopeType The type of block (file, class, method, block, if, while, for,
   *   doWhile, try, catch, finally, switch, when, runAs, getter, setter)
   * @param location The location of the block (both symbolRange and identifierRange are set to the same value)
   * @param fileUri The file URI
   * @param parentId The parent block symbol ID, if any
   * @param scopePath Optional scope path for uniqueness
   * @returns A ScopeSymbol instance
   */
  /**
   * Create a block symbol
   * @deprecated Use createScopeSymbolByType instead
   * This method is kept for backward compatibility
   */
  static createBlockSymbol(
    name: string,
    scopeType: ScopeType,
    location: SymbolLocation,
    fileUri: string,
    parentId: string | null = null,
    scopePath?: string[],
  ): ScopeSymbol {
    // For block symbols, symbolRange and identifierRange should be the same
    const blockLocation: SymbolLocation = {
      symbolRange: location.symbolRange,
      identifierRange: location.symbolRange, // Same as symbolRange for blocks
    };

    const id = this.generateId(
      name,
      fileUri,
      scopePath,
      'block',
      blockLocation,
    );
    const key: SymbolKey = {
      prefix: 'block',
      name,
      path: [fileUri, name],
      unifiedId: id,
      fileUri,
      kind: SymbolKind.Block,
    };

    const modifiers: SymbolModifiers = {
      visibility: SymbolVisibility.Default,
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      isVirtual: false,
      isOverride: false,
      isTransient: false,
      isTestMethod: false,
      isWebService: false,
      isBuiltIn: false,
    };
    return new ScopeSymbol(
      id,
      name,
      blockLocation,
      fileUri,
      parentId,
      key,
      modifiers,
      scopeType,
    );
  }

  /**
   * Generate a unique ID for a symbol using URI-based format
   * @param name The symbol name
   * @param fileUri The file path
   * @param scopePath Optional scope path for uniqueness (e.g., ["TestClass", "method1", "block1"])
   * @param prefix Optional symbol prefix/kind for uniqueness
   * @param location Optional symbol location for including line numbers in ID
   * @returns URI-based symbol ID
   */
  static generateId(
    name: string,
    fileUri: string,
    scopePath?: string[],
    prefix?: string,
    location?: SymbolLocation,
  ): string {
    // Use the new unified URI-based ID generator
    // Include prefix to ensure uniqueness between semantic symbols and their block scopes
    // NOTE: Option 2A - IDs remain stable (no line numbers) to preserve cross-file reference stability
    // Duplicates are handled via union type (ApexSymbol | ApexSymbol[]) in symbolMap
    // Do NOT include line numbers - keep IDs stable
    return generateSymbolId(name, fileUri, scopePath, undefined, prefix);
  }

  /**
   * Create a scope symbol of the appropriate subclass based on scopeType
   * Uses a registry pattern to avoid large switch statements
   * @param name The block name
   * @param scopeType The type of block
   * @param location The location of the block
   * @param fileUri The file URI
   * @param parentId The parent block symbol ID, if any
   * @param key The symbol key
   * @param modifiers The symbol modifiers
   * @returns A ScopeSymbol instance of the appropriate subclass
   */
  static createScopeSymbolByType(
    name: string,
    scopeType: ScopeType,
    location: SymbolLocation,
    fileUri: string,
    parentId: string | null,
    key: SymbolKey,
    modifiers: SymbolModifiers,
  ): ScopeSymbol {
    // For block symbols, symbolRange and identifierRange should be the same
    const blockLocation: SymbolLocation = {
      symbolRange: location.symbolRange,
      identifierRange: location.symbolRange, // Same as symbolRange for blocks
    };

    // Use file location for file scope, block location for others
    const effectiveLocation = scopeType === 'file' ? location : blockLocation;

    // Ensure unifiedId is set - generate it if missing, including location for duplicate detection
    const id =
      key.unifiedId || generateUnifiedId(key, fileUri, effectiveLocation);

    // Create a single ScopeSymbol instance with the specified scopeType
    return new ScopeSymbol(
      id,
      name,
      effectiveLocation,
      fileUri,
      parentId,
      key,
      modifiers,
      scopeType,
    );
  }
}

/**
 * Represents an Apex annotation
 */
export interface Annotation {
  /** The name of the annotation (without @ symbol) */
  name: string;
  /** The source code location of the annotation */
  location: SymbolLocation;
  /** Optional parameters for the annotation */
  parameters?: AnnotationParameter[];
}

/**
 * Represents a parameter for an annotation
 */
export interface AnnotationParameter {
  /** The name of the parameter, null for positional parameters */
  name?: string;
  /** The value of the parameter as a string */
  value: string;
}

/**
 * Modifiers that can be applied to Apex symbols
 */
export interface SymbolModifiers {
  visibility: SymbolVisibility;
  isStatic: boolean;
  isFinal: boolean;
  isAbstract: boolean;
  isVirtual: boolean;
  isOverride: boolean;
  isTransient: boolean;
  isTestMethod: boolean;
  isWebService: boolean;
  isBuiltIn: boolean;
}

export type Position = {
  line: number;
  character: number;
};

/**
 * Strategy for resolving symbols at a given position
 */
export type SymbolResolutionStrategy =
  | 'scope' // Multi-step with SymbolReference + fallback
  | 'precise'; // No fallback to containing symbols

export type Range = {
  /** Start line (1-based) */
  startLine: number;
  /** Start column (0-based) */
  startColumn: number;
  /** End line (1-based) */
  endLine: number;
  /** End column (0-based) */
  endColumn: number;
};

/**
 * Location information for a symbol in the source code
 */
export interface SymbolLocation {
  symbolRange: Range;
  identifierRange: Range;
}

/**
 * Unified Apex symbol interface with lazy loading support
 * Supports both minimal (lazy) and full (eager) loading modes
 */
export interface ApexSymbol {
  // Core properties (always present)
  id: string;
  name: string;
  kind: SymbolKind;
  location: SymbolLocation;
  fileUri: string;
  parentId: string | null;
  key: SymbolKey;

  // Optional properties (lazy loaded)
  fqn?: string;
  namespace?: string | Namespace | null;
  annotations?: Annotation[];
  identifierLocation?: SymbolLocation;

  // Lazy loading support
  _isLoaded: boolean;
  _loadPromise?: Promise<void>;

  // Layered compilation support - tracks what level of detail has been captured
  _detailLevel?: 'public-api' | 'protected' | 'private' | 'full';

  modifiers: SymbolModifiers;
}

/**
 * Represents a class, interface, enum, or trigger
 */
export interface TypeSymbol extends ApexSymbol {
  kind:
    | SymbolKind.Class
    | SymbolKind.Interface
    | SymbolKind.Trigger
    | SymbolKind.Enum;
  /**
   * The superclass that this class extends.
   * Only applicable for classes (not interfaces or triggers).
   * For example, in `public class Child extends Parent`, the superClass would be "Parent".
   */
  superClass?: string;
  /**
   * The interfaces that this type implements or extends.
   * - For classes: interfaces implemented by the class (e.g., `class C implements I1, I2`)
   * - For interfaces: interfaces extended by the interface (e.g., `interface I extends I1, I2`)
   * - For triggers: always an empty array
   * - For enums: always an empty array
   */
  interfaces: string[];
  /** Annotations for this type */
  annotations?: Annotation[];
}

/**
 * Represents a method or constructor
 */
export interface MethodSymbol extends ApexSymbol {
  kind: SymbolKind.Method | SymbolKind.Constructor;
  returnType: TypeInfo;
  parameters: VariableSymbol[];
  isConstructor?: boolean;
  /** Annotations for this method */
  annotations?: Annotation[];
}

/**
 * Represents a property, field, variable, parameter, or enum value
 */
export interface VariableSymbol extends ApexSymbol {
  kind:
    | SymbolKind.Property
    | SymbolKind.Field
    | SymbolKind.Variable
    | SymbolKind.Parameter
    | SymbolKind.EnumValue;
  type: TypeInfo;
  initialValue?: string;
  initializerType?: TypeInfo; // Type of the initializer expression (if present)
}

/**
 * Represents an enum type declaration
 */
export interface EnumSymbol extends TypeSymbol {
  kind: SymbolKind.Enum;
  values: VariableSymbol[];
}

/**
 * Scope type for block symbols
 */
export type ScopeType =
  | 'file' // File scope (root)
  | 'class' // Class/interface/enum/trigger body
  | 'method' // Method/constructor body
  | 'block' // Generic block (fallback for anonymous blocks)
  | 'if' // If statement block
  | 'while' // While loop block
  | 'for' // For loop block
  | 'doWhile' // Do-while loop block
  | 'try' // Try block
  | 'catch' // Catch block
  | 'finally' // Finally block
  | 'switch' // Switch statement container
  | 'when' // Switch when clause block
  | 'runAs' // RunAs block
  | 'getter' // Property getter block
  | 'setter'; // Property setter block

/**
 * Represents a scope symbol that can contain other symbols
 * All blocks are scopes - this class represents all block/scope symbols
 * Containment is determined by parentId - symbols with parentId === this.id belong to this scope
 */
export class ScopeSymbol implements ApexSymbol {
  // ApexSymbol properties
  id: string;
  name: string;
  kind: SymbolKind.Block;
  location: SymbolLocation;
  fileUri: string;
  parentId: string | null;
  key: SymbolKey;
  fqn?: string;
  namespace?: string | Namespace | null;
  annotations?: Annotation[];
  identifierLocation?: SymbolLocation;
  _isLoaded: boolean;
  _loadPromise?: Promise<void>;
  _detailLevel?: 'public-api' | 'protected' | 'private' | 'full';
  modifiers: SymbolModifiers;

  // ScopeSymbol-specific properties
  readonly scopeType: ScopeType;

  constructor(
    id: string,
    name: string,
    location: SymbolLocation,
    fileUri: string,
    parentId: string | null,
    key: SymbolKey,
    modifiers: SymbolModifiers,
    scopeType: ScopeType,
  ) {
    this.id = id;
    this.name = name;
    this.kind = SymbolKind.Block;
    this.location = location;
    this.fileUri = fileUri;
    this.parentId = parentId;
    this.key = key;
    this.modifiers = modifiers;
    this.scopeType = scopeType;
    this._isLoaded = true;
  }
}

/**
 * Represents a unique key for a symbol or scope in the symbol table
 * Enhanced for Phase 6.5.2: Symbol Key System Unification
 */
export interface SymbolKey {
  /** The type of scope (file, class, method, block) */
  prefix: string;
  /** The name of the symbol/scope */
  name: string;
  /** The hierarchical path to this symbol/scope */
  path: string[];

  // Phase 6.5.2: Unified Key System
  /** The unified symbol ID for graph operations */
  unifiedId?: string;
  /** The file path where this symbol is defined */
  fileUri?: string;
  /** The fully qualified name if available */
  fqn?: string;
  /** The symbol kind for enhanced identification */
  kind?: SymbolKind;
}

/**
 * Generate a unified symbol ID from a SymbolKey using URI-based format
 * @param key The symbol key
 * @param fileUri Optional file path for uniqueness
 * @param location Optional symbol location for including line numbers in ID
 * @returns URI-based symbol ID string
 */
export const generateUnifiedId = (
  key: SymbolKey,
  fileUri?: string,
  location?: SymbolLocation,
): string => {
  // Use the new unified URI-based ID generator
  // Include prefix/kind to ensure uniqueness between semantic symbols and their block scopes
  // NOTE: Option 2A - IDs remain stable (no line numbers) to preserve cross-file reference stability
  // Duplicates are handled via union type (ApexSymbol | ApexSymbol[]) in symbolMap
  const validFileUri = fileUri || key.fileUri || 'unknown';
  // Do NOT include line numbers - keep IDs stable for cross-file references
  return generateSymbolId(
    key.name,
    validFileUri,
    key.path.length > 0 ? key.path : undefined,
    undefined, // No line numbers - stable IDs for Option 2A
    key.prefix, // Include prefix to make IDs unique
  );
};

/**
 * Convert a SymbolKey to a string for use as a map key (legacy compatibility)
 * @param key The symbol key
 * @returns String representation
 */
export const keyToString = (key: SymbolKey, fileUri?: string): string =>
  // Always use unifiedId - generate if missing
  // This ensures consistent map keys and eliminates path-based fallback inconsistencies
  getUnifiedId(key, fileUri);

/**
 * Create a SymbolKey from an ApexSymbol with unified ID
 * @param symbol The Apex symbol
 * @param fileUri Optional file path
 * @returns Enhanced SymbolKey with unified ID
 */
export const createFromSymbol = (
  symbol: ApexSymbol,
  fileUri?: string,
): SymbolKey => {
  const key: SymbolKey = {
    prefix: symbol.key.prefix || symbol.kind,
    // Prefer symbol.name over key.name - symbol.name is the source of truth
    name: symbol.name || symbol.key.name || '',
    path: symbol.key.path || [symbol.fileUri, symbol.name],
    kind: symbol.kind,
    fqn: symbol.fqn,
    fileUri: fileUri || symbol.fileUri,
  };

  // Generate unified ID with location to include line numbers for duplicate detection
  key.unifiedId = generateUnifiedId(
    key,
    fileUri || symbol.fileUri,
    symbol.location,
  );

  return key;
};

/**
 * Create a SymbolKey from a parent symbol (for parentKey relationships)
 * @param parentSymbol The parent Apex symbol
 * @param fileUri Optional file path
 * @returns Enhanced SymbolKey for parent relationship
 */
export const createParentKey = (
  parentSymbol: ApexSymbol,
  fileUri?: string,
): SymbolKey => createFromSymbol(parentSymbol, fileUri);

/**
 * Check if two SymbolKeys are equivalent
 * @param key1 First symbol key
 * @param key2 Second symbol key
 * @returns True if keys are equivalent
 */
export const areEquivalent = (key1: SymbolKey, key2: SymbolKey): boolean => {
  // Compare unified IDs if available
  if (key1.unifiedId && key2.unifiedId) {
    return key1.unifiedId === key2.unifiedId;
  }

  // Fallback to legacy comparison
  return (
    key1.prefix === key2.prefix &&
    key1.name === key2.name &&
    key1.path.join('.') === key2.path.join('.')
  );
};

/**
 * Get the unified ID from a SymbolKey, generating if needed
 * @param key The symbol key
 * @param fileUri Optional file path for generation
 * @returns Unified symbol ID
 */
export const getUnifiedId = (key: SymbolKey, fileUri?: string): string => {
  if (key.unifiedId) {
    return key.unifiedId;
  }

  // Generate and cache the unified ID
  key.unifiedId = generateUnifiedId(key, fileUri);
  return key.unifiedId;
};

/**
 * Symbol table representing all symbols in a source file.
 * Maintains a hierarchy of scopes and provides symbol lookup functionality.
 */
export class SymbolTable {
  private root: ApexSymbol | null = null; // Track the single top-level symbol (parentId === null)
  // Union type: single symbol (common case) or array (duplicates)
  // Optimistic approach: duplicates are rare and short-lived
  private symbolMap: HashMap<string, ApexSymbol | ApexSymbol[]> = new HashMap();
  // idIndex removed: symbolMap now serves both purposes since keys are always unifiedId
  // and symbol.id is synchronized with key.unifiedId, so symbolMap.get(id) === idIndex.get(id)
  private references: SymbolReference[] = []; // Store symbol references
  private hierarchicalReferences: HierarchicalReference[] = []; // NEW: Store hierarchical references
  // Array maintained incrementally to avoid expensive HashMap iterator in getAllSymbols()
  private symbolArray: ApexSymbol[] = [];
  private fileUri: string = 'unknown';

  /**
   * Creates a new symbol table.
   * The SymbolTable instance IS the file container.
   */
  constructor() {
    // No root node needed - SymbolTable instance is the file container
    // Top-level symbol (parentId === null) is tracked in root field
    // Only one top-level type can exist per file
  }

  /**
   * Set the file URI for this symbol table
   * @param fileUri The file URI
   */
  setFileUri(fileUri: string): void {
    this.fileUri = fileUri;
  }

  /**
   * Get the file URI for this symbol table
   * @returns The file URI
   */
  getFileUri(): string {
    return this.fileUri;
  }

  /**
   * Convert a SymbolKey to a string for use as a map key
   * Updated for Phase 6.5.2: Symbol Key System Unification
   */
  private keyToString(key: SymbolKey, fileUri?: string): string {
    // Use fileUri from symbol table if not provided
    const effectiveFileUri = fileUri || this.fileUri;
    return keyToString(key, effectiveFileUri);
  }

  /**
   * Add a symbol to the current scope.
   * @param symbol The symbol to add
   * @param currentScope The current scope (null when at file level)
   * Updated for Phase 6.5.2: Symbol Key System Unification
   */
  addSymbol(symbol: ApexSymbol, currentScope?: ScopeSymbol | null): void {
    // Ensure symbol key has unified ID for graph operations
    if (!symbol.key.unifiedId) {
      symbol.key = createFromSymbol(symbol);
      // Synchronize id with key.unifiedId to avoid duplication
      // unifiedId is guaranteed to be set after createFromSymbol
      if (symbol.key.unifiedId) {
        symbol.id = symbol.key.unifiedId;
      }
      // Synchronize fileUri with key.fileUri (key.fileUri is source of truth)
      if (symbol.key.fileUri && symbol.fileUri !== symbol.key.fileUri) {
        symbol.fileUri = symbol.key.fileUri;
      }
    } else {
      // If unifiedId exists but id is different, synchronize them
      // unifiedId is the source of truth
      if (symbol.id !== symbol.key.unifiedId) {
        symbol.id = symbol.key.unifiedId;
      }
      // Synchronize fileUri with key.fileUri (key.fileUri is source of truth)
      if (symbol.key.fileUri && symbol.fileUri !== symbol.key.fileUri) {
        symbol.fileUri = symbol.key.fileUri;
      }
    }

    // Parent property removed - use parentId for parent resolution via getParent() helper

    // Set parentId if not already set - symbols added to current scope should have current scope as parent
    // When currentScope is null or undefined (stack empty), symbol is top-level (parentId === null)
    if (symbol.parentId === undefined) {
      if (currentScope === null || currentScope === undefined) {
        // At file level - symbol is top-level
        symbol.parentId = null;
      } else {
        // In a scope - set parentId to current scope
        symbol.parentId = currentScope.id;
      }
    }
    // If parentId is already set (including explicitly null), use it as-is

    // Containment is determined by parentId - no need to call scope.addSymbol()
    // The symbol's parentId already establishes the containment relationship
    // Normalize key to ensure unifiedId is always present and used as map key
    const normalizedUnifiedId = getUnifiedId(symbol.key, symbol.fileUri);
    // Always use unifiedId as the map key (never path-based fallback)
    const symbolKey = normalizedUnifiedId;
    const existing = this.symbolMap.get(symbolKey);

    // Handle union type: existing could be ApexSymbol or ApexSymbol[]
    const existingSymbol = Array.isArray(existing) ? existing[0] : existing;
    const isDuplicate = Array.isArray(existing);

    // Track previous parentId for roots array maintenance
    const previousParentId = existingSymbol?.parentId;

    // Logging for duplicate debugging
    const logger = getLogger();
    if (symbol.kind === SymbolKind.Class && symbol.parentId === null) {
      logger.debug(
        () =>
          `[SymbolTable.addSymbol] Top-level class: ${symbol.name}, ` +
          `id=${symbolKey}, existing=${existing ? 'yes' : 'no'}, ` +
          `isDuplicate=${isDuplicate}, ` +
          `location=${symbol.location.identifierRange.startLine}:${symbol.location.identifierRange.startColumn}`,
      );
    }

    // Layered compilation: enrich existing symbol if it has lower detail level
    // Skip enrichment for duplicates (they're errors, not enrichment candidates)
    // Also skip if both symbols are the same object (already enriched)
    let symbolToAdd = symbol;
    if (
      existingSymbol &&
      !isDuplicate &&
      existingSymbol !== symbol && // Don't enrich if it's the same object
      symbol._detailLevel // New symbol must have detail level for enrichment
    ) {
      const detailLevelOrder: Record<string, number> = {
        'public-api': 1,
        protected: 2,
        private: 3,
        full: 4,
      };
      const existingLevel = existingSymbol._detailLevel
        ? detailLevelOrder[existingSymbol._detailLevel] || 0
        : 0; // If existing has no detail level, treat as 0 (lowest)
      const newLevel = detailLevelOrder[symbol._detailLevel] || 0;

      // If new symbol has higher detail level, enrich the existing symbol
      // Also enrich if existing has no detail level (undefined) and new has one
      if (
        newLevel > existingLevel ||
        (!existingSymbol._detailLevel && symbol._detailLevel)
      ) {
        if (symbol.kind === SymbolKind.Class && symbol.parentId === null) {
          logger.debug(
            () =>
              `[SymbolTable.addSymbol] ENRICHMENT: ${symbol.name}, ` +
              `existingLevel=${existingSymbol._detailLevel}, newLevel=${symbol._detailLevel}, ` +
              `existingLocation=${existingSymbol.location.identifierRange.startLine}, ` +
              `newLocation=${symbol.location.identifierRange.startLine}`,
          );
        }
        // Merge properties from new symbol into existing symbol
        // Preserve existing properties, add new ones
        Object.assign(existingSymbol, {
          ...symbol,
          // Preserve existing ID and key (they shouldn't change)
          id: existingSymbol.id,
          key: existingSymbol.key,
          // CRITICAL: Preserve existing parentId during enrichment
          // The parentId should be set correctly during the first listener walk
          // Subsequent walks should not override it, as the parent-child relationship
          // is established during the first walk and shouldn't change
          parentId: existingSymbol.parentId,
        });
        // Ensure unifiedId is preserved after enrichment
        if (!existingSymbol.key.unifiedId) {
          existingSymbol.key.unifiedId = getUnifiedId(
            existingSymbol.key,
            existingSymbol.fileUri,
          );
        }
        // Validate that unifiedId exists (should always be true)
        if (!existingSymbol.key.unifiedId) {
          logger.warn(
            () =>
              `Symbol ${existingSymbol.name} missing unifiedId after enrichment - this should not happen`,
          );
        }
        // Use enriched symbol
        symbolToAdd = existingSymbol;
        // Update map with enriched symbol
        this.symbolMap.set(symbolKey, symbolToAdd);
        // Update array - remove ALL occurrences with this ID and add the enriched symbol once
        // This prevents duplicates if the same symbol was added multiple times
        let i = this.symbolArray.length - 1;
        while (i >= 0) {
          if (this.symbolArray[i].id === symbolToAdd.id) {
            this.symbolArray.splice(i, 1);
          }
          i--;
        }
        // Add the enriched symbol once
        this.symbolArray.push(symbolToAdd);
        // Update roots array if needed
        this.updateRootsArray(symbolToAdd, previousParentId);
        return;
      } else if (newLevel <= existingLevel) {
        // Existing symbol has same or higher detail level, skip enrichment
        // Keep existing symbol
        return;
      }
    }

    // Handle duplicates: convert single symbol to array when duplicate detected
    if (!existing) {
      // First symbol - store as single symbol (optimistic approach)
      if (symbol.kind === SymbolKind.Class && symbol.parentId === null) {
        logger.debug(
          () =>
            `[SymbolTable.addSymbol] FIRST ADD: ${symbol.name}, ` +
            `location=${symbol.location.identifierRange.startLine}`,
        );
      }
      this.symbolMap.set(symbolKey, symbolToAdd);
      // Add to array (check by object reference to avoid duplicates with same id)
      if (!this.symbolArray.includes(symbolToAdd)) {
        this.symbolArray.push(symbolToAdd);
      }
    } else if (isDuplicate) {
      // Already have duplicates - add to array
      if (symbol.kind === SymbolKind.Class && symbol.parentId === null) {
        logger.debug(
          () =>
            `[SymbolTable.addSymbol] ADDING TO EXISTING DUPLICATES: ${symbol.name}, ` +
            `existingCount=${existing.length}, ` +
            `location=${symbol.location.identifierRange.startLine}`,
        );
      }
      // Check if this symbol is already in the duplicate array (by object reference)
      if (!existing.includes(symbolToAdd)) {
        existing.push(symbolToAdd);
      }
      // Add to symbolArray (check by object reference)
      if (!this.symbolArray.includes(symbolToAdd)) {
        this.symbolArray.push(symbolToAdd);
      }
    } else if (existingSymbol) {
      // Second duplicate detected - convert to array
      // BUT: if it's the same object, don't create a duplicate array entry
      if (existingSymbol === symbolToAdd) {
        if (symbol.kind === SymbolKind.Class && symbol.parentId === null) {
          logger.debug(
            () =>
              `[SymbolTable.addSymbol] SAME OBJECT - skipping duplicate: ${symbol.name}, ` +
              `location=${symbol.location.identifierRange.startLine}`,
          );
        }
        // Same object - don't add as duplicate, just return
        return;
      }
      if (symbol.kind === SymbolKind.Class && symbol.parentId === null) {
        logger.debug(
          () =>
            `[SymbolTable.addSymbol] DUPLICATE DETECTED (converting to array): ${symbol.name}, ` +
            `existingLocation=${existingSymbol.location.identifierRange.startLine}, ` +
            `newLocation=${symbol.location.identifierRange.startLine}, ` +
            `existingDetailLevel=${existingSymbol._detailLevel}, ` +
            `newDetailLevel=${symbol._detailLevel}, ` +
            `sameObject=${existingSymbol === symbolToAdd}`,
        );
      }
      this.symbolMap.set(symbolKey, [existingSymbol, symbolToAdd]);
      // Add to symbolArray (check by object reference)
      if (!this.symbolArray.includes(symbolToAdd)) {
        this.symbolArray.push(symbolToAdd);
      }
      // Ensure existingSymbol is also in array
      if (!this.symbolArray.includes(existingSymbol)) {
        this.symbolArray.push(existingSymbol);
      }
    } else {
      // Fallback: should not happen, but handle gracefully
      if (symbol.kind === SymbolKind.Class && symbol.parentId === null) {
        logger.warn(
          () =>
            `[SymbolTable.addSymbol] FALLBACK: ${symbol.name}, ` +
            `existing=${existing}, existingSymbol=${existingSymbol}`,
        );
      }
      this.symbolMap.set(symbolKey, symbolToAdd);
      // Add to array (check by object reference)
      if (!this.symbolArray.includes(symbolToAdd)) {
        this.symbolArray.push(symbolToAdd);
      }
    }

    // Update roots array if needed
    this.updateRootsArray(symbolToAdd, previousParentId);
  }

  /**
   * Helper method to update roots array when symbol parentId changes
   * @private
   */
  private updateRootsArray(
    symbol: ApexSymbol,
    previousParentId: string | null | undefined,
  ): void {
    const logger = getLogger();
    // Maintain root: track the single symbol with parentId === null
    // If parentId changed from null to non-null, clear root if it matches
    if (previousParentId === null && symbol.parentId !== null) {
      if (this.root && this.root.id === symbol.id) {
        if (symbol.kind === SymbolKind.Class) {
          logger.debug(
            () =>
              `[SymbolTable.updateRootsArray] REMOVING root: ${symbol.name}, ` +
              `parentId changed from null to ${symbol.parentId}`,
          );
        }
        this.root = null;
      }
    }
    // If parentId is null (top-level), set as root
    // Only one top-level type can exist per file, so simple assignment
    if (symbol.parentId === null) {
      if (this.root && this.root.id !== symbol.id) {
        // Defensive check: if root exists with different ID, log warning
        // (shouldn't happen since parser only recognizes one top-level type)
        const existingRootName = this.root.name;
        logger.warn(
          () =>
            `[SymbolTable.updateRootsArray] Replacing root ${existingRootName} ` +
            `with ${symbol.name} - multiple roots detected`,
        );
      }
      if (symbol.kind === SymbolKind.Class) {
        logger.debug(
          () =>
            `[SymbolTable.updateRootsArray] SETTING root: ${symbol.name}, ` +
            `location=${symbol.location.identifierRange.startLine}`,
        );
      }
      // Replace root with current symbol (handles enrichment scenarios)
      this.root = symbol;
    }
  }

  /**
   * Create a scope symbol of the appropriate subclass based on scopeType
   * Delegates to SymbolFactory to avoid code duplication
   * @private
   */
  private createScopeSymbol(
    name: string,
    scopeType: ScopeType,
    location: SymbolLocation,
    fileUri: string,
    parentId: string | null,
    scopePath?: string[],
  ): ScopeSymbol {
    const id = SymbolFactory.generateId(
      name,
      fileUri,
      scopePath,
      'block',
      location,
    );
    const key: SymbolKey = {
      prefix: scopeType,
      name,
      path: scopePath ? [fileUri, ...scopePath, name] : [fileUri, name],
      unifiedId: id,
      fileUri,
      kind: SymbolKind.Block,
    };
    const modifiers: SymbolModifiers = {
      visibility: SymbolVisibility.Default,
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      isVirtual: false,
      isOverride: false,
      isTransient: false,
      isTestMethod: false,
      isWebService: false,
      isBuiltIn: false,
    };

    // Delegate to SymbolFactory to create the appropriate scope symbol subclass
    return SymbolFactory.createScopeSymbolByType(
      name,
      scopeType,
      location,
      fileUri,
      parentId,
      key,
      modifiers,
    );
  }

  /**
   * Enter a new scope.
   * Creates a new scope as a child of the current scope.
   * @param name The name of the new scope
   * @param scopeType The type of scope (file, class, method, block, if, while, for,
   *   doWhile, try, catch, finally, switch, when, runAs, getter, setter)
   * @param location Optional location for the scope (if provided, creates a scope symbol)
   * @param fileUri Optional file URI (defaults to this.fileUri)
   * @returns The created scope symbol if location was provided, null otherwise
   */
  enterScope(
    name: string,
    scopeType: ScopeType = 'block',
    location?: SymbolLocation,
    fileUri?: string,
    parentScope?: ScopeSymbol | null,
  ): ScopeSymbol | null {
    if (!location) {
      return null;
    }

    const effectiveFileUri = fileUri || this.fileUri;
    const currentScopePath = this.getCurrentScopePath(parentScope ?? null);

    // Determine parentId
    // For class/method/constructor scopes, parentId should point to the semantic symbol
    // For other scopes, parentId points to the parent scope
    let parentId: string | null = parentScope ? parentScope.id : null;

    if (scopeType === 'class' || scopeType === 'method') {
      // Find the semantic symbol (class/method) that was just added
      // Search in the current scope (where it was just added) and also check all symbols
      // to find the most recently added one with matching name and kind
      const currentScopeId = parentScope ? parentScope.id : null;

      // For method scope, prioritize constructor over class (constructors have same name as class)
      // Search all symbols to find the most recently added one with matching name and kind
      let semanticSymbol: ApexSymbol | undefined;

      if (scopeType === 'method') {
        // For method scope, look for Method or Constructor symbols
        // Search in reverse order to get the most recently added (last one)
        for (let i = this.symbolArray.length - 1; i >= 0; i--) {
          const s = this.symbolArray[i];
          if (
            s.name === name &&
            s.kind !== SymbolKind.Block &&
            (s.kind === SymbolKind.Method || s.kind === SymbolKind.Constructor)
          ) {
            semanticSymbol = s;
            break; // Found the most recent one
          }
        }
      } else if (scopeType === 'class') {
        // For class scope, look for Class, Interface, Enum, or Trigger symbols
        semanticSymbol = this.findSymbolInScope(currentScopeId, name);
        if (semanticSymbol) {
          // Verify it's the right kind
          if (
            !(
              semanticSymbol.kind === SymbolKind.Class ||
              semanticSymbol.kind === SymbolKind.Interface ||
              semanticSymbol.kind === SymbolKind.Enum ||
              semanticSymbol.kind === SymbolKind.Trigger
            )
          ) {
            semanticSymbol = undefined;
          }
        }

        // If not found in current scope, search all symbols
        if (!semanticSymbol) {
          for (let i = this.symbolArray.length - 1; i >= 0; i--) {
            const s = this.symbolArray[i];
            if (
              s.name === name &&
              s.kind !== SymbolKind.Block &&
              (s.kind === SymbolKind.Class ||
                s.kind === SymbolKind.Interface ||
                s.kind === SymbolKind.Enum ||
                s.kind === SymbolKind.Trigger)
            ) {
              semanticSymbol = s;
              break;
            }
          }
        }
      }

      if (semanticSymbol) {
        parentId = semanticSymbol.id;
      }
    }

    // Create scope symbol (which IS the block symbol)
    const scopeSymbol = this.createScopeSymbol(
      name,
      scopeType,
      location,
      effectiveFileUri,
      parentId,
      currentScopePath,
    );

    // Add scope symbol to symbol table (via addSymbol which updates symbolArray and symbolMap)
    this.addSymbol(scopeSymbol, parentScope ?? null);

    return scopeSymbol;
  }

  /**
   * Get the current scope's block symbol
   * @param currentScope The current scope (null when at file level)
   * @returns The current scope symbol (scope IS the block symbol)
   */
  getCurrentBlockSymbol(currentScope: ScopeSymbol | null): ScopeSymbol | null {
    return currentScope;
  }

  /**
   * Find a block symbol by scope name
   * @param scopeName The name of the scope to find
   * @returns The scope symbol if found, undefined otherwise
   */
  findBlockSymbol(scopeName: string): ScopeSymbol | undefined {
    return this.findScopeByName(scopeName);
  }

  /**
   * Find the block symbol containing a given position
   * @param position The position to search for (1-based line, 0-based column)
   * @returns The most specific block symbol containing the position, or null if not found
   */
  findContainingBlockSymbol(position: Position): ScopeSymbol | null {
    const blockSymbols = this.symbolArray.filter(
      (s) => s.kind === SymbolKind.Block,
    ) as ScopeSymbol[];

    // Find all block symbols that contain this position
    const containingBlocks = blockSymbols.filter((blockSymbol) => {
      const { startLine, startColumn, endLine, endColumn } =
        blockSymbol.location.symbolRange;

      return (
        (position.line > startLine ||
          (position.line === startLine && position.character >= startColumn)) &&
        (position.line < endLine ||
          (position.line === endLine && position.character <= endColumn))
      );
    });

    if (containingBlocks.length === 0) {
      return null;
    }

    // Return the most specific (smallest) block symbol
    return containingBlocks.reduce((smallest, current) => {
      const smallestSize =
        (smallest.location.symbolRange.endLine -
          smallest.location.symbolRange.startLine) *
          1000 +
        (smallest.location.symbolRange.endColumn -
          smallest.location.symbolRange.startColumn);
      const currentSize =
        (current.location.symbolRange.endLine -
          current.location.symbolRange.startLine) *
          1000 +
        (current.location.symbolRange.endColumn -
          current.location.symbolRange.startColumn);
      return currentSize < smallestSize ? current : smallest;
    });
  }

  /**
   * Get the scope hierarchy chain from root to the scope containing a position
   * @param position The position to search for (1-based line, 0-based column)
   * @returns Array of scope symbols from root (file) to most specific containing scope
   */
  getScopeHierarchy(position: Position): ScopeSymbol[] {
    const hierarchy: ScopeSymbol[] = [];
    const containingBlock = this.findContainingBlockSymbol(position);

    if (!containingBlock) {
      return hierarchy;
    }

    // Build hierarchy by following parentId chain using symbolMap for O(1) lookup
    let current: ScopeSymbol | null = containingBlock as ScopeSymbol;
    while (current) {
      hierarchy.unshift(current);
      if (current.parentId) {
        const parentResult = this.symbolMap.get(current.parentId);
        const parent = Array.isArray(parentResult)
          ? parentResult[0]
          : parentResult;
        if (parent && parent.kind === SymbolKind.Block) {
          current = parent as ScopeSymbol;
        } else {
          current = null;
        }
      } else {
        current = null;
      }
    }

    return hierarchy;
  }

  /**
   * Exit the current scope, moving to the parent scope.
   * This is now a no-op - the stack handles scope exit.
   */
  exitScope(): void {
    // No-op - stack handles scope exit via pop()
  }

  /**
   * Get all top-level symbols (symbols with parentId === null).
   * Only one top-level type can exist per file, so returns array with at most one element.
   * @returns Array containing the root symbol, or empty array if none exists
   */
  getRoots(): ApexSymbol[] {
    return this.root ? [this.root] : [];
  }

  /**
   * Get the hierarchical path to the current scope.
   * @param currentScope The current scope (null when at file level)
   * @returns Array of scope names from root to current scope
   */
  getCurrentScopePath(currentScope: ScopeSymbol | null): string[] {
    if (!currentScope) {
      return [];
    }

    const path: string[] = [];
    let current: ScopeSymbol | null = currentScope;
    while (current) {
      // Include 'block:' prefix for block scopes to match ID hierarchy format
      // Block ID format: fileUri:...:block:blockName
      // This ensures method IDs include: fileUri:...:block:blockName:method:methodName
      if (current.kind === SymbolKind.Block && current.scopeType) {
        path.unshift('block', current.name);
      } else {
        path.unshift(current.name);
      }
      if (current.parentId) {
        const parentResult = this.symbolMap.get(current.parentId);
        const parent = Array.isArray(parentResult)
          ? parentResult[0]
          : parentResult;
        if (parent && parent.kind === SymbolKind.Block) {
          current = parent as ScopeSymbol;
        } else {
          current = null;
        }
      } else {
        current = null;
      }
    }

    return path;
  }

  /**
   * Get the parent scope of a given scope.
   * @param scope The scope to get the parent of
   * @returns The parent scope, or null if at file level
   */
  getParentScope(scope: ScopeSymbol): ScopeSymbol | null {
    if (scope.parentId) {
      const parentResult = this.symbolMap.get(scope.parentId);
      const parent = Array.isArray(parentResult)
        ? parentResult[0]
        : parentResult;
      if (parent && parent.kind === SymbolKind.Block) {
        return parent as ScopeSymbol;
      }
    }
    return null;
  }

  /**
   * Get all symbols in a specific scope by scope ID.
   * @param scopeId The ID of the scope (null for file level)
   * @returns Array of all symbols in the scope
   */
  getSymbolsInScope(scopeId: string | null): ApexSymbol[] {
    // For file level, return all symbols with parentId === null
    // This includes the root (top-level type) and any other symbols manually added with parentId: null
    if (scopeId === null) {
      return this.symbolArray.filter((s) => s.parentId === null);
    }
    // For other scopes, symbols with parentId === scopeId belong here
    return this.symbolArray.filter((s) => s.parentId === scopeId);
  }

  /**
   * Find a symbol by name in a specific scope.
   * @param scopeId The ID of the scope (null for root/file scope)
   * @param name The name of the symbol to find
   * @returns The symbol if found, undefined otherwise
   */
  findSymbolInScope(
    scopeId: string | null,
    name: string,
  ): ApexSymbol | undefined {
    return this.getSymbolsInScope(scopeId).find((s) => s.name === name);
  }

  /**
   * Find a symbol in the current scope only.
   * @param name The name of the symbol to find
   * @param currentScope The current scope (null when at file level)
   * @returns The symbol if found in current scope, undefined otherwise
   */
  findSymbolInCurrentScope(
    name: string,
    currentScope: ScopeSymbol | null,
  ): ApexSymbol | undefined {
    // For file level, use null as scopeId
    const scopeId = currentScope ? currentScope.id : null;
    return this.findSymbolInScope(scopeId, name);
  }

  /**
   * Find a scope by name, searching through all scopes.
   * @param name The name of the scope to find
   * @returns The scope if found, undefined otherwise
   */
  findScopeByName(name: string): ScopeSymbol | undefined {
    // Search symbolArray for ScopeSymbol with matching name
    return this.symbolArray.find(
      (s) => s.kind === SymbolKind.Block && s.name === name,
    ) as ScopeSymbol | undefined;
  }

  /**
   * Lookup a symbol by name, searching through nested scopes.
   * Searches from starting scope up through parent scopes, and also down through child scopes.
   * @param name The name of the symbol to find
   * @param startingScope The starting scope (null when at file level)
   * @returns The symbol if found, undefined otherwise
   */
  lookup(
    name: string,
    startingScope?: ScopeSymbol | null,
  ): ApexSymbol | undefined {
    // Default to file level if no starting scope provided
    const startScope = startingScope ?? null;

    // First, search from starting scope up through parent scopes
    let scope: ScopeSymbol | null = startScope;
    while (scope) {
      // For file level, use null as scopeId
      const scopeId = scope.id;
      const symbol = this.findSymbolInScope(scopeId, name);
      if (symbol) {
        return symbol;
      }
      // Navigate to parent using symbolMap
      if (scope.parentId) {
        const parentResult = this.symbolMap.get(scope.parentId);
        const parent = Array.isArray(parentResult)
          ? parentResult[0]
          : parentResult;
        if (parent && parent.kind === SymbolKind.Block) {
          scope = parent as ScopeSymbol;
        } else {
          scope = null;
        }
      } else {
        scope = null;
      }
    }

    // If not found in starting scope or parents, search file level (roots)
    // Always search roots (when startScope is null, we're already at file level)
    // When startScope is provided but not found, also search roots as fallback
    const rootSymbol = this.findSymbolInScope(null, name);
    if (rootSymbol) {
      return rootSymbol;
    }

    // If not found in starting scope or parents, search all child scopes
    if (startScope) {
      const searchChildren = (
        currentScope: ScopeSymbol,
      ): ApexSymbol | undefined => {
        // Find children by searching symbolArray for symbols with parentId === currentScope.id
        const children = this.symbolArray.filter(
          (s) => s.parentId === currentScope.id && s.kind === SymbolKind.Block,
        ) as ScopeSymbol[];
        for (const child of children) {
          const symbol = this.findSymbolInScope(child.id, name);
          if (symbol) {
            return symbol;
          }
          // Recursively search children of children
          const foundInChild = searchChildren(child);
          if (foundInChild) {
            return foundInChild;
          }
        }
        return undefined;
      };

      return searchChildren(startScope);
    }

    return undefined;
  }

  /**
   * Lookup a symbol by key
   * @param key The key of the symbol to find
   * @returns The symbol if found, undefined otherwise
   */
  lookupByKey(key: SymbolKey): ApexSymbol | undefined {
    // Use symbol table's fileUri for key normalization
    const result = this.symbolMap.get(this.keyToString(key, this.fileUri));
    if (!result) return undefined;
    // Handle union type: return first match if array, or single symbol
    return Array.isArray(result) ? result[0] : result;
  }

  /**
   * Get all symbols in the symbol table
   * @returns Array of all symbols
   */
  getAllSymbols(): ApexSymbol[] {
    return this.symbolArray;
  }

  /**
   * Get a symbol by its ID using O(1) HashMap lookup.
   * Returns first match if duplicates exist (backward compatible).
   * @param id The symbol ID to look up
   * @returns The symbol if found, undefined otherwise
   */
  getSymbolById(id: string): ApexSymbol | undefined {
    // Use symbolMap instead of idIndex since map keys are now always unifiedId
    // and symbol.id is synchronized with key.unifiedId
    const result = this.symbolMap.get(id);
    if (!result) return undefined;
    // Handle union type: return first match if array, or single symbol
    return Array.isArray(result) ? result[0] : result;
  }

  /**
   * Get all symbols with the same unified ID (for duplicate detection).
   * @param id The symbol ID to look up
   * @returns Array of all symbols with this ID (empty if not found)
   */
  getAllSymbolsById(id: string): ApexSymbol[] {
    const result = this.symbolMap.get(id);
    if (!result) return [];
    // Handle union type: return array as-is, or wrap single symbol in array
    return Array.isArray(result) ? result : [result];
  }

  /**
   * Get all non-block symbols from the file scope
   * This provides a reliable way to get top-level symbols (classes, interfaces, enums, triggers)
   * without manually filtering block symbols
   * @returns Array of all semantic symbols in the file scope
   */
  getFileScopeSymbols(): ApexSymbol[] {
    // Root scope has parentId === null
    const allSymbols = this.getSymbolsInScope(null);
    // Filter out block symbols to return only semantic symbols
    return allSymbols.filter((s) => s.kind !== SymbolKind.Block);
  }

  findSymbolWith(
    predicate: (entry: ApexSymbol) => boolean,
  ): ApexSymbol | undefined {
    return this.symbolArray.find((symbol) => predicate(symbol));
  }

  /**
   * Add a type reference to the symbol table
   * @param ref The type reference to add
   */
  addTypeReference(ref: SymbolReference): void {
    this.references.push(ref);
  }

  /**
   * Get all type references in the symbol table
   * @returns Array of all type references
   */
  getAllReferences(): SymbolReference[] {
    return [...this.references]; // Return a copy to prevent external modification
  }

  /**
   * Check if the symbol table has any references
   * @returns True if there are any references
   */
  hasReferences(): boolean {
    return this.references.length > 0;
  }

  /**
   * Get the detail level of this symbol table
   * Returns the highest detail level found in any symbol, or null if no symbols
   * @returns The detail level or null
   */
  getDetailLevel(): DetailLevel | null {
    const symbols = this.getAllSymbols();
    if (symbols.length === 0) {
      return null;
    }

    const levelOrder: Record<DetailLevel, number> = {
      'public-api': 1,
      protected: 2,
      private: 3,
      full: 4,
    };

    let maxLevel: DetailLevel | null = null;
    let maxOrder = 0;

    for (const symbol of symbols) {
      if (symbol._detailLevel) {
        const order = levelOrder[symbol._detailLevel] || 0;
        if (order > maxOrder) {
          maxOrder = order;
          maxLevel = symbol._detailLevel;
        }
      }
    }

    return maxLevel;
  }

  /**
   * Get type references at a specific position
   * @param position The position to search for references (1-based line, 0-based column)
   * @returns Array of type references at the position
   */
  getReferencesAtPosition(position: {
    line: number;
    character: number;
  }): SymbolReference[] {
    const matched = this.references.filter((ref) => {
      if (this.positionInRange(position, ref.location)) {
        return true;
      }
      // Also match when cursor is on precise qualifier/member ranges if provided
      const qLoc = (ref as any).qualifierLocation;
      if (qLoc && this.positionInRange(position, qLoc)) {
        return true;
      }
      const mLoc = (ref as any).memberLocation;
      if (mLoc && this.positionInRange(position, mLoc)) {
        return true;
      }
      // For chained references, also check if position is within any chain node
      const chainNodes = (ref as any).chainNodes;
      if (chainNodes && Array.isArray(chainNodes)) {
        for (const node of chainNodes) {
          if (node?.location && this.positionInRange(position, node.location)) {
            return true;
          }
        }
      }
      return false;
    });

    return matched;
  }

  /**
   * Get type references by context
   * @param context The reference context to filter by
   * @returns Array of type references with the specified context
   */
  getReferencesByContext(context: ReferenceContext): SymbolReference[] {
    return this.references.filter((ref) => ref.context === context);
  }

  /**
   * Add a hierarchical reference to the symbol table
   * @param ref The hierarchical reference to add
   */
  addHierarchicalReference(ref: HierarchicalReference): void {
    this.hierarchicalReferences.push(ref);
  }

  /**
   * Get all hierarchical references in the symbol table
   * @returns Array of all hierarchical references
   */
  getAllHierarchicalReferences(): HierarchicalReference[] {
    return structuredClone(this.hierarchicalReferences); // Return a copy to prevent external modification
  }

  /**
   * Get hierarchical references at a specific position
   * @param position The position to search for references (0-based)
   * @returns Array of hierarchical references at the position
   */
  getHierarchicalReferencesAtPosition(position: {
    line: number;
    character: number;
  }): HierarchicalReference[] {
    return this.hierarchicalReferences.filter((ref) => {
      if (this.positionInRange(position, ref.location)) {
        return true;
      }
      // Check if position is within any child references
      return this.isPositionInHierarchicalReference(position, ref);
    });
  }

  /**
   * Check if a position is within a hierarchical reference or any of its children
   * @param position The position to check
   * @param ref The hierarchical reference to check
   * @returns True if position is within the reference or any of its children
   */
  private isPositionInHierarchicalReference(
    position: { line: number; character: number },
    ref: HierarchicalReference,
  ): boolean {
    // Check the main reference
    if (this.positionInRange(position, ref.location)) {
      return true;
    }

    // Recursively check all children
    for (const child of ref.children) {
      if (this.isPositionInHierarchicalReference(position, child)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find a hierarchical reference by its full qualified name
   * @param qualifiedName The full qualified name to search for (e.g., "System.debug")
   * @returns The hierarchical reference if found, undefined otherwise
   */
  findHierarchicalReference(
    qualifiedName: string,
  ): HierarchicalReference | undefined {
    return this.hierarchicalReferences.find(
      (ref) => ref.name === qualifiedName,
    );
  }

  /**
   * Find hierarchical references that start with a given prefix
   * @param prefix The prefix to search for (e.g., "System")
   * @returns Array of hierarchical references that start with the prefix
   */
  findHierarchicalReferencesByPrefix(prefix: string): HierarchicalReference[] {
    return this.hierarchicalReferences.filter(
      (ref) => ref.name.startsWith(prefix + '.') || ref.name === prefix,
    );
  }

  /**
   * Check if a position is within a location range
   * @param position The position to check (line: 1-based, character: 0-based)
   * @param location The location range (line: 1-based, character: 0-based)
   * @returns True if position is within the location range
   */
  private positionInRange(
    position: Position,
    location: SymbolLocation,
  ): boolean {
    return (
      position.line >= location.identifierRange.startLine &&
      position.line <= location.identifierRange.endLine &&
      position.character >= location.identifierRange.startColumn &&
      position.character <= location.identifierRange.endColumn
    );
  }

  /**
   * Convert the symbol table to a JSON-serializable format
   */
  toJSON() {
    type CleanedSymbol = ApexSymbol & {
      values?: VariableSymbol[];
    };

    const cleanSymbol = (symbol: ApexSymbol): CleanedSymbol => {
      const cleaned = { ...symbol } as CleanedSymbol;

      // Handle enum values
      if (symbol.kind === SymbolKind.Enum) {
        const enumSymbol = symbol as EnumSymbol;
        if (enumSymbol.values) {
          cleaned.values = enumSymbol.values;
        }
      }

      return cleaned;
    };

    // Convert HashMap entries to plain arrays
    const symbolEntries = Array.from(this.symbolMap.entries());

    // Create a new object with cleaned symbols
    // Handle union type: clean first symbol if array, or single symbol
    const cleanedSymbols = symbolEntries.map(([key, symbol]) => {
      const symbolToClean = Array.isArray(symbol) ? symbol[0] : symbol;
      return {
        key,
        symbol: symbolToClean ? cleanSymbol(symbolToClean) : undefined,
      };
    });

    // Get all scope symbols (ScopeSymbols) for scopes array
    const scopeSymbols = this.symbolArray.filter(
      (s) => s.kind === SymbolKind.Block,
    ) as ScopeSymbol[];

    // Create a new object with cleaned scopes
    const cleanedScopes = scopeSymbols.map((scope) => ({
      key: this.keyToString(scope.key, scope.fileUri || this.fileUri),
      scope: {
        key: scope.key,
        symbols: this.getSymbolsInScope(scope.id).map((symbol: ApexSymbol) => ({
          name: symbol.name,
          key: symbol.key,
        })),
        // Children are found by parentId, not stored directly
        children: this.symbolArray
          .filter((s) => s.parentId === scope.id && s.kind === SymbolKind.Block)
          .map((child) => child.key),
      },
    }));

    return {
      symbols: cleanedSymbols,
      scopes: cleanedScopes,
    };
  }

  /**
   * Create a new symbol table from a JSON representation
   * @param json The JSON representation of a symbol table
   * @returns A new symbol table
   */
  static fromJSON(json: any): SymbolTable {
    const table = new SymbolTable();
    // TODO: Implement reconstruction of symbol table from JSON
    return table;
  }
}
