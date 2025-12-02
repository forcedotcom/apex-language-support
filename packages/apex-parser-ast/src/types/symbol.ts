/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap } from 'data-structure-typed';
import { TypeInfo } from './typeInfo';
import {
  Namespace,
  createTypeWithNamespace,
} from '../namespace/NamespaceUtils';
import { TypeReference, ReferenceContext } from './typeReference';
import { generateSymbolId } from './UriBasedIdGenerator';
import { HierarchicalReference } from './hierarchicalReference';

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
    const id = this.generateId(name, fileUri, scopePath, kind);
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
    const id = this.generateId(name, fileUri, scopePath, kind);
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
      _typeData: typeData,
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
    const id = this.generateId(name, fileUri, scopePath, kind);

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
      _typeData: typeData,
      _isLoaded: true,
      modifiers,
    };
  }

  /**
   * Create a block symbol
   * @param name The block name
   * @param scopeType The type of block ('file', 'class', 'method', 'block')
   * @param location The location of the block (both symbolRange and identifierRange are set to the same value)
   * @param fileUri The file URI
   * @param parentId The parent block symbol ID, if any
   * @param scopePath Optional scope path for uniqueness
   * @returns A BlockSymbol instance
   */
  static createBlockSymbol(
    name: string,
    scopeType: 'file' | 'class' | 'method' | 'block',
    location: SymbolLocation,
    fileUri: string,
    parentId: string | null = null,
    scopePath?: string[],
  ): BlockSymbol {
    // For block symbols, symbolRange and identifierRange should be the same
    const blockLocation: SymbolLocation = {
      symbolRange: location.symbolRange,
      identifierRange: location.symbolRange, // Same as symbolRange for blocks
    };

    const id = this.generateId(name, fileUri, scopePath, 'block');
    const key: SymbolKey = {
      prefix: 'block',
      name,
      path: [fileUri, name],
      unifiedId: id,
      fileUri,
      kind: SymbolKind.Block,
    };

    return {
      id,
      name,
      kind: SymbolKind.Block,
      location: blockLocation,
      fileUri,
      parentId,
      key,
      _isLoaded: true,
      modifiers: this.createDefaultModifiers(),
      scopeType,
    };
  }

  /**
   * Generate a unique ID for a symbol using URI-based format
   * @param name The symbol name
   * @param fileUri The file path
   * @param scopePath Optional scope path for uniqueness (e.g., ["TestClass", "method1", "block1"])
   * @returns URI-based symbol ID
   */
  private static generateId(
    name: string,
    fileUri: string,
    scopePath?: string[],
    prefix?: string,
  ): string {
    // Use the new unified URI-based ID generator
    // Include prefix to ensure uniqueness between semantic symbols and their block scopes
    return generateSymbolId(name, fileUri, scopePath, undefined, prefix);
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
  | 'scope' // Multi-step with TypeReference + fallback
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

  // Type-specific data (lazy loaded)
  _typeData?: {
    parameters?: string[]; // Array of parameter IDs
    values?: string[]; // Array of enum value IDs
  };

  // Lazy loading support
  _isLoaded: boolean;
  _loadPromise?: Promise<void>;

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
}

/**
 * Represents an enum type declaration
 */
export interface EnumSymbol extends TypeSymbol {
  kind: SymbolKind.Enum;
  values: VariableSymbol[];
}

/**
 * Represents a block symbol (file, class, method, block)
 */
export interface BlockSymbol extends ApexSymbol {
  kind: SymbolKind.Block;
  scopeType: 'file' | 'class' | 'method' | 'block';
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
 * @returns URI-based symbol ID string
 */
export const generateUnifiedId = (key: SymbolKey, fileUri?: string): string => {
  // Use the new unified URI-based ID generator
  // Include prefix/kind to ensure uniqueness between semantic symbols and their block scopes
  const validFileUri = fileUri || key.fileUri || 'unknown';
  return generateSymbolId(
    key.name,
    validFileUri,
    key.path.length > 0 ? key.path : undefined,
    undefined, // lineNumber
    key.prefix, // Include prefix to make IDs unique
  );
};

/**
 * Convert a SymbolKey to a string for use as a map key (legacy compatibility)
 * @param key The symbol key
 * @returns String representation
 */
export const keyToString = (key: SymbolKey): string => {
  // Use unifiedId if available (includes full scope path), otherwise fall back to path
  if (key.unifiedId) {
    return key.unifiedId;
  }
  return `${key.prefix}:${key.path.join('.')}`;
};

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
    name: symbol.key.name || symbol.name,
    path: symbol.key.path || [symbol.fileUri, symbol.name],
    kind: symbol.kind,
    fqn: symbol.fqn,
    fileUri: fileUri || symbol.fileUri,
  };

  // Generate unified ID
  key.unifiedId = generateUnifiedId(key, fileUri || symbol.fileUri);

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
 * Represents a scope in which symbols are defined within a source file.
 * Maintains a hierarchy of scopes and provides symbol lookup functionality.
 */
export class SymbolScope {
  private symbols: HashMap<string, ApexSymbol> = new HashMap();
  private nameToSymbol: HashMap<string, ApexSymbol[]> = new HashMap(); // For name-based lookups
  private children: SymbolScope[] = [];
  private readonly key: SymbolKey;
  private blockSymbol: BlockSymbol | null = null;

  /**
   * Creates a new symbol scope.
   * @param name The name of the scope
   * @param parent The parent scope, if any
   * @param scopeType The type of scope (file, class, method, block)
   * @param blockSymbol Optional block symbol associated with this scope
   */
  constructor(
    public readonly name: string,
    public readonly parent: SymbolScope | null = null,
    private readonly scopeType: string = 'file',
    blockSymbol?: BlockSymbol | null,
  ) {
    this.key = this.generateKey();
    if (blockSymbol !== undefined) {
      this.blockSymbol = blockSymbol || null;
    }
    if (parent) {
      parent.children.push(this);
    }
  }

  /**
   * Get the block symbol associated with this scope
   * @returns The block symbol if set, null otherwise
   */
  getBlockSymbol(): BlockSymbol | null {
    return this.blockSymbol;
  }

  /**
   * Set the block symbol associated with this scope
   * @param symbol The block symbol to associate
   */
  setBlockSymbol(symbol: BlockSymbol | null): void {
    this.blockSymbol = symbol;
  }

  /**
   * Get the unique key for this scope
   */
  getKey(): SymbolKey {
    return this.key;
  }

  /**
   * Generate a unique key for this scope
   */
  private generateKey(): SymbolKey {
    const path = this.getPath();
    return {
      prefix: this.scopeType,
      name: this.name,
      path: path,
    };
  }

  /**
   * Get the hierarchical path to this scope
   */
  getPath(): string[] {
    const path: string[] = [];
    let current: SymbolScope | null = this;
    while (current) {
      path.unshift(current.name);
      current = current.parent;
    }
    return path;
  }

  /**
   * Add a symbol to this scope.
   * @param symbol The symbol to add
   */
  addSymbol(symbol: ApexSymbol): void {
    // Use the symbol's unique key to prevent overwriting symbols with the same name
    // unifiedId now includes the prefix/kind, ensuring uniqueness between semantic symbols and their block scopes
    const key = symbol.key.unifiedId || keyToString(symbol.key);
    this.symbols.set(key, symbol);

    // Also maintain name-based mapping for backward compatibility
    const existingSymbols = this.nameToSymbol.get(symbol.name) || [];
    existingSymbols.push(symbol);
    this.nameToSymbol.set(symbol.name, existingSymbols);
  }

  /**
   * Get a symbol by name from this scope.
   * @param name The name of the symbol to find
   * @returns The symbol if found, undefined otherwise
   */
  getSymbol(name: string): ApexSymbol | undefined {
    const symbols = this.nameToSymbol.get(name);
    return symbols && symbols.length > 0 ? symbols[0] : undefined;
  }

  /**
   * Get all symbols with a given name from this scope.
   * @param name The name of the symbols to find
   * @returns Array of symbols with the given name, empty array if none found
   */
  getSymbolsByName(name: string): ApexSymbol[] {
    return this.nameToSymbol.get(name) || [];
  }

  /**
   * Get all symbols in this scope.
   * @returns Array of all symbols in this scope
   */
  getAllSymbols(): ApexSymbol[] {
    return Array.from(this.symbols.values());
  }

  /**
   * Get child scopes of this scope.
   * @returns Array of child scopes
   */
  getChildren(): SymbolScope[] {
    return [...this.children];
  }

  /**
   * Convert the scope to a JSON-serializable format
   */
  toJSON() {
    return {
      key: this.key,
      blockSymbol: this.blockSymbol ? this.blockSymbol.id : null,
      symbols: Array.from(this.symbols.entries()).map(([name, symbol]) => ({
        name,
        key: (symbol as any).key,
      })),
      children: this.children.map((child: SymbolScope) => child.key),
    };
  }
}

/**
 * Symbol table representing all symbols in a source file.
 * Maintains a hierarchy of scopes and provides symbol lookup functionality.
 */
export class SymbolTable {
  private root: SymbolScope;
  private current: SymbolScope;
  private symbolMap: HashMap<string, ApexSymbol> = new HashMap();
  private scopeMap: HashMap<string, SymbolScope> = new HashMap();
  private references: TypeReference[] = []; // Store type references
  private hierarchicalReferences: HierarchicalReference[] = []; // NEW: Store hierarchical references
  // Array maintained incrementally to avoid expensive HashMap iterator in getAllSymbols()
  private symbolArray: ApexSymbol[] = [];
  private fileUri: string = 'unknown';

  /**
   * Creates a new symbol table.
   * Initializes with a root scope named 'file'.
   */
  constructor() {
    // Create root scope for the file (scope symbol will be created when fileUri is set)
    this.root = new SymbolScope('file', null, 'file');
    this.current = this.root;
    this.scopeMap.set(this.keyToString(this.root.getKey()), this.root);
  }

  /**
   * Set the file URI for this symbol table
   * @param fileUri The file URI
   */
  setFileUri(fileUri: string): void {
    this.fileUri = fileUri;
    // Create block symbol for root file scope if it doesn't exist
    if (!this.root.getBlockSymbol()) {
      // Create a placeholder location for the file scope (will span entire file)
      const fileLocation: SymbolLocation = {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 0,
        },
      };
      const fileBlockSymbol = SymbolFactory.createBlockSymbol(
        'file',
        'file',
        fileLocation,
        fileUri,
        null,
      );
      this.root.setBlockSymbol(fileBlockSymbol);
      // Add the file block symbol to the symbol table to ensure it's tracked
      this.addSymbol(fileBlockSymbol);
      this.addSymbol(fileBlockSymbol);
    }
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
  private keyToString(key: SymbolKey): string {
    return keyToString(key);
  }

  /**
   * Add a symbol to the current scope.
   * @param symbol The symbol to add
   * Updated for Phase 6.5.2: Symbol Key System Unification
   */
  addSymbol(symbol: ApexSymbol): void {
    // Ensure symbol key has unified ID for graph operations
    if (!symbol.key.unifiedId) {
      symbol.key = createFromSymbol(symbol);
    }

    // Parent property removed - use parentId for parent resolution via getParent() helper

    // Ensure top-level symbols (those with no parent) are added to root scope
    // This maintains the file-to-symbol relationship for top-level declarations
    if (symbol.parentId === null) {
      // Top-level symbol - always add to root scope
      // Always add to root first to ensure it's in the file scope
      this.root.addSymbol(symbol);
      // Also add to current scope if it's different from root
      // (if current is root, this is redundant but harmless)
      if (this.current !== this.root) {
        this.current.addSymbol(symbol);
      }
    } else {
      // Non-top-level symbol - add to current scope only
      this.current.addSymbol(symbol);
    }
    const symbolKey = this.keyToString(symbol.key);
    const existingSymbol = this.symbolMap.get(symbolKey);
    this.symbolMap.set(symbolKey, symbol);

    // Maintain array incrementally to avoid expensive HashMap iterator
    if (existingSymbol) {
      // Replace existing symbol in array if key already exists (HashMap overwrites)
      // Find by comparing keys since the symbol object might be different
      const index = this.symbolArray.findIndex(
        (s) => this.keyToString(s.key) === symbolKey,
      );
      if (index !== -1) {
        this.symbolArray[index] = symbol;
      } else {
        // Fallback: symbol not found in array, just push (shouldn't happen)
        this.symbolArray.push(symbol);
      }
    } else {
      // New symbol, add to array
      this.symbolArray.push(symbol);
    }
  }

  /**
   * Enter a new scope.
   * Creates a new scope as a child of the current scope.
   * @param name The name of the new scope
   * @param scopeType The type of scope (file, class, method, block)
   * @param location Optional location for the scope (if provided, creates a block symbol)
   * @param fileUri Optional file URI (defaults to this.fileUri)
   * @returns The created block symbol if location was provided, null otherwise
   */
  enterScope(
    name: string,
    scopeType: string = 'block',
    location?: SymbolLocation,
    fileUri?: string,
  ): BlockSymbol | null {
    let blockSymbol: BlockSymbol | null = null;

    if (location) {
      const effectiveFileUri = fileUri || this.fileUri;
      const currentScopePath = this.getCurrentScopePath();

      // Determine parentId based on scopeType
      let parentId: string | null = null;
      if (scopeType === 'class') {
        // For class blocks, parent should be the class symbol (not a block symbol)
        // The class symbol was just added to the current scope before enterScope is called
        const classSymbols = this.current
          .getSymbolsByName(name)
          .filter(
            (s) =>
              s.kind === 'class' || s.kind === 'interface' || s.kind === 'enum',
          );
        if (classSymbols.length > 0) {
          parentId = classSymbols[0].id;
        }
      } else if (scopeType === 'method') {
        // For method blocks, parent should be the method symbol
        const methodSymbols = this.current
          .getSymbolsByName(name)
          .filter((s) => s.kind === 'method' || s.kind === 'constructor');
        if (methodSymbols.length > 0) {
          parentId = methodSymbols[0].id;
        }
      } else {
        // For regular blocks, parent is the current scope's block symbol
        const parentBlockSymbol = this.current.getBlockSymbol();
        parentId = parentBlockSymbol ? parentBlockSymbol.id : null;
      }

      // Create block symbol
      blockSymbol = SymbolFactory.createBlockSymbol(
        name,
        scopeType as 'file' | 'class' | 'method' | 'block',
        location,
        effectiveFileUri,
        parentId,
        currentScopePath,
      );

      // Add block symbol to symbol table
      this.addSymbol(blockSymbol);
    }

    const newScope = new SymbolScope(
      name,
      this.current,
      scopeType,
      blockSymbol,
    );
    this.current = newScope;
    this.scopeMap.set(this.keyToString(newScope.getKey()), newScope);

    return blockSymbol;
  }

  /**
   * Get the current scope's block symbol
   * @returns The current block symbol if it exists, null otherwise
   */
  getCurrentBlockSymbol(): BlockSymbol | null {
    return this.current.getBlockSymbol();
  }

  /**
   * Find a block symbol by scope name
   * @param scopeName The name of the scope to find
   * @returns The block symbol if found, undefined otherwise
   */
  findBlockSymbol(scopeName: string): BlockSymbol | undefined {
    const scope = this.findScopeByName(scopeName);
    return scope?.getBlockSymbol() || undefined;
  }

  /**
   * Find the block symbol containing a given position
   * @param position The position to search for (1-based line, 0-based column)
   * @returns The most specific block symbol containing the position, or null if not found
   */
  findContainingBlockSymbol(position: Position): BlockSymbol | null {
    const blockSymbols = this.symbolArray.filter(
      (s) => s.kind === SymbolKind.Block,
    ) as BlockSymbol[];

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
   * @returns Array of block symbols from root (file) to most specific containing scope
   */
  getScopeHierarchy(position: Position): BlockSymbol[] {
    const hierarchy: BlockSymbol[] = [];
    const containingBlock = this.findContainingBlockSymbol(position);

    if (!containingBlock) {
      return hierarchy;
    }

    // Build hierarchy by following parentId chain
    let current: BlockSymbol | null = containingBlock;
    while (current) {
      hierarchy.unshift(current);
      if (current.parentId) {
        const parent = this.symbolArray.find(
          (s) => s.id === current!.parentId && s.kind === SymbolKind.Block,
        ) as BlockSymbol | undefined;
        current = parent || null;
      } else {
        current = null;
      }
    }

    return hierarchy;
  }

  /**
   * Exit the current scope and return to the parent scope.
   * Does nothing if already at the root scope.
   */
  exitScope(): void {
    if (this.current.parent) {
      this.current = this.current.parent;
    }
  }

  /**
   * Get the current scope.
   * @returns The current scope
   */
  getCurrentScope(): SymbolScope {
    return this.current;
  }

  /**
   * Get the hierarchical path to the current scope.
   * @returns Array of scope names from root to current scope
   */
  getCurrentScopePath(): string[] {
    const path = this.current.getPath();

    // Filter out the 'file' scope when it's the only scope
    // The 'file' scope is just a placeholder and doesn't add meaningful uniqueness
    if (path.length === 1 && path[0] === 'file') {
      return [];
    }

    return path;
  }

  /**
   * Get the parent scope of the current scope.
   * @returns The parent scope, or null if at root
   */
  getParentScope(): SymbolScope | null {
    return this.current.parent;
  }

  /**
   * Find a symbol in the current scope only.
   * @param name The name of the symbol to find
   * @returns The symbol if found in current scope, undefined otherwise
   */
  findSymbolInCurrentScope(name: string): ApexSymbol | undefined {
    return this.current.getSymbol(name);
  }

  /**
   * Find a scope by name, searching through all scopes.
   * @param name The name of the scope to find
   * @returns The scope if found, undefined otherwise
   */
  findScopeByName(name: string): SymbolScope | undefined {
    const search = (scope: SymbolScope): SymbolScope | undefined => {
      if (scope.name === name) {
        return scope;
      }
      for (const child of scope.getChildren()) {
        const found = search(child);
        if (found) {
          return found;
        }
      }
      return undefined;
    };
    return search(this.root);
  }

  /**
   * Lookup a symbol by name, searching through nested scopes.
   * Searches from current scope up through parent scopes, and also down through child scopes.
   * @param name The name of the symbol to find
   * @returns The symbol if found, undefined otherwise
   */
  lookup(name: string): ApexSymbol | undefined {
    // First, search from current scope up through parent scopes
    let scope: SymbolScope | null = this.current;
    while (scope) {
      const symbol = scope.getSymbol(name);
      if (symbol) {
        return symbol;
      }
      scope = scope.parent;
    }

    // If not found in current scope or parents, search all child scopes
    const searchChildren = (
      currentScope: SymbolScope,
    ): ApexSymbol | undefined => {
      for (const child of currentScope.getChildren()) {
        const symbol = child.getSymbol(name);
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

    return searchChildren(this.current);
  }

  /**
   * Lookup a symbol by key
   * @param key The key of the symbol to find
   * @returns The symbol if found, undefined otherwise
   */
  lookupByKey(key: SymbolKey): ApexSymbol | undefined {
    return this.symbolMap.get(this.keyToString(key));
  }

  /**
   * Get all symbols in the symbol table
   * @returns Array of all symbols
   */
  getAllSymbols(): ApexSymbol[] {
    return this.symbolArray;
  }

  /**
   * Get all non-block symbols from the file scope
   * This provides a reliable way to get top-level symbols (classes, interfaces, enums, triggers)
   * without manually filtering block symbols
   * @returns Array of all semantic symbols in the file scope
   */
  getFileScopeSymbols(): ApexSymbol[] {
    const allSymbols = this.root.getAllSymbols();
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
  addTypeReference(ref: TypeReference): void {
    this.references.push(ref);
  }

  /**
   * Get all type references in the symbol table
   * @returns Array of all type references
   */
  getAllReferences(): TypeReference[] {
    return [...this.references]; // Return a copy to prevent external modification
  }

  /**
   * Get type references at a specific position
   * @param position The position to search for references (1-based line, 0-based column)
   * @returns Array of type references at the position
   */
  getReferencesAtPosition(position: {
    line: number;
    character: number;
  }): TypeReference[] {
    return this.references.filter((ref) => {
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
      return false;
    });
  }

  /**
   * Get type references by context
   * @param context The reference context to filter by
   * @returns Array of type references with the specified context
   */
  getReferencesByContext(context: ReferenceContext): TypeReference[] {
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
    const scopeEntries = Array.from(this.scopeMap.entries());

    // Create a new object with cleaned symbols
    const cleanedSymbols = symbolEntries.map(([key, symbol]) => ({
      key,
      symbol: symbol ? cleanSymbol(symbol) : undefined,
    }));

    // Create a new object with cleaned scopes
    const cleanedScopes = scopeEntries.map(([key, scope]) => ({
      key,
      scope: scope
        ? {
            key: scope.getKey(),
            symbols: Array.from(scope.getAllSymbols()).map((symbol) => ({
              name: symbol.name,
              key: symbol.key,
            })),
            children: scope.getChildren().map((child) => child.getKey()),
          }
        : undefined,
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
