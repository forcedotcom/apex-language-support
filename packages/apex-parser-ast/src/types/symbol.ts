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
    filePath: string,
    parentId: string | null = null,
    modifierFlags: number = 0,
    scopePath?: string[],
  ): ApexSymbol {
    const id = this.generateId(name, filePath, scopePath);
    const key: SymbolKey = {
      prefix: kind,
      name,
      path: [filePath, name],
      unifiedId: id,
      filePath,
      kind,
    };

    return {
      id,
      name,
      kind,
      location,
      filePath,
      parentId,
      key,
      parentKey: parentId
        ? {
            prefix: kind,
            name: parentId,
            path: [filePath, parentId],
            unifiedId: parentId,
            filePath,
            kind,
          }
        : null,
      _modifierFlags: modifierFlags,
      _isLoaded: false,
      modifiers: this.flagsToModifiers(modifierFlags),
      parent: null,
    };
  }

  /**
   * Create a full symbol with all data loaded
   */
  static createFullSymbol(
    name: string,
    kind: SymbolKind,
    location: SymbolLocation,
    filePath: string,
    modifiers: SymbolModifiers,
    parentId: string | null = null,
    typeData?: any,
    fqn?: string,
    namespace?: string,
    annotations?: Annotation[],
    identifierLocation?: SymbolLocation,
    parentSymbol?: ApexSymbol, // NEW: Optional parent symbol for proper parentKey construction
    scopePath?: string[],
  ): ApexSymbol {
    const id = this.generateId(name, filePath, scopePath);
    const modifierFlags = this.modifiersToFlags(modifiers);
    const key: SymbolKey = {
      prefix: kind,
      name,
      path: [filePath, name],
      unifiedId: id,
      filePath,
      fqn,
      kind,
    };

    // Construct parentKey properly if parent symbol is provided
    let parentKey: SymbolKey | null = null;
    if (parentSymbol) {
      parentKey = {
        prefix: parentSymbol.kind,
        name: parentSymbol.name,
        path: [filePath, parentSymbol.name],
        unifiedId: parentSymbol.id,
        filePath: parentSymbol.filePath,
        kind: parentSymbol.kind,
      };
    } else if (parentId) {
      // Fallback to the old behavior for backward compatibility
      parentKey = {
        prefix: kind,
        name: parentId,
        path: [filePath, parentId],
        unifiedId: parentId,
        filePath,
        kind,
      };
    }

    return {
      id,
      name,
      kind,
      location,
      filePath,
      parentId,
      key,
      parentKey,
      fqn,
      namespace: namespace || null, // Ensure null instead of undefined
      annotations,
      identifierLocation,
      _typeData: typeData,
      _modifierFlags: modifierFlags,
      _isLoaded: true,
      modifiers,
      parent: null,
    };
  }

  /**
   * Create a full symbol with explicit namespace support
   */
  static createFullSymbolWithNamespace(
    name: string,
    kind: SymbolKind,
    location: SymbolLocation,
    filePath: string,
    modifiers: SymbolModifiers,
    parentId: string | null = null,
    typeData?: any,
    namespace?: string | Namespace | null,
    annotations?: Annotation[],
    identifierLocation?: SymbolLocation,
    scopePath?: string[],
  ): ApexSymbol {
    const id = this.generateId(name, filePath, scopePath);
    const modifierFlags = this.modifiersToFlags(modifiers);

    // Calculate FQN if namespace is provided (case-insensitive for Apex)
    const fqn =
      namespace && typeof namespace === 'object' && 'toString' in namespace
        ? createTypeWithNamespace(namespace as Namespace, name, {
            includeNamespace: true,
            normalizeCase: true,
            separator: '/',
          })
        : undefined;

    const key: SymbolKey = {
      prefix: kind,
      name,
      path: [filePath, name],
      unifiedId: id,
      filePath,
      fqn,
      kind,
    };

    return {
      id,
      name,
      kind,
      location,
      filePath,
      parentId,
      key,
      parentKey: parentId
        ? {
            prefix: kind,
            name: parentId,
            path: [filePath, parentId],
            unifiedId: parentId,
            filePath,
            kind,
          }
        : null,
      fqn,
      namespace, // Store the Namespace object directly
      annotations,
      identifierLocation,
      _typeData: typeData,
      _modifierFlags: modifierFlags,
      _isLoaded: true,
      modifiers,
      parent: null,
    };
  }

  /**
   * Convert modifiers object to bit flags
   */
  private static modifiersToFlags(modifiers: SymbolModifiers): number {
    let flags = 0;
    if (modifiers.visibility === SymbolVisibility.Public)
      flags |= ModifierFlags.PUBLIC;
    if (modifiers.visibility === SymbolVisibility.Private)
      flags |= ModifierFlags.PRIVATE;
    if (modifiers.visibility === SymbolVisibility.Protected)
      flags |= ModifierFlags.PROTECTED;
    if (modifiers.visibility === SymbolVisibility.Global)
      flags |= ModifierFlags.GLOBAL;
    if (modifiers.isStatic) flags |= ModifierFlags.STATIC;
    if (modifiers.isFinal) flags |= ModifierFlags.FINAL;
    if (modifiers.isAbstract) flags |= ModifierFlags.ABSTRACT;
    if (modifiers.isVirtual) flags |= ModifierFlags.VIRTUAL;
    if (modifiers.isOverride) flags |= ModifierFlags.OVERRIDE;
    if (modifiers.isTransient) flags |= ModifierFlags.TRANSIENT;
    if (modifiers.isTestMethod) flags |= ModifierFlags.TEST_METHOD;
    if (modifiers.isWebService) flags |= ModifierFlags.WEB_SERVICE;
    return flags;
  }

  /**
   * Convert bit flags to modifiers object
   */
  private static flagsToModifiers(flags: number): SymbolModifiers {
    return {
      visibility:
        flags & ModifierFlags.PUBLIC
          ? SymbolVisibility.Public
          : flags & ModifierFlags.PRIVATE
            ? SymbolVisibility.Private
            : flags & ModifierFlags.PROTECTED
              ? SymbolVisibility.Protected
              : flags & ModifierFlags.GLOBAL
                ? SymbolVisibility.Global
                : SymbolVisibility.Default,
      isStatic: !!(flags & ModifierFlags.STATIC),
      isFinal: !!(flags & ModifierFlags.FINAL),
      isAbstract: !!(flags & ModifierFlags.ABSTRACT),
      isVirtual: !!(flags & ModifierFlags.VIRTUAL),
      isOverride: !!(flags & ModifierFlags.OVERRIDE),
      isTransient: !!(flags & ModifierFlags.TRANSIENT),
      isTestMethod: !!(flags & ModifierFlags.TEST_METHOD),
      isWebService: !!(flags & ModifierFlags.WEB_SERVICE),
      isBuiltIn: !!(flags & ModifierFlags.BUILT_IN),
    };
  }

  /**
   * Generate a unique ID for a symbol
   * @param name The symbol name
   * @param filePath The file path
   * @param scopePath Optional scope path for uniqueness (e.g., ["TestClass", "method1", "block1"])
   */
  private static generateId(
    name: string,
    filePath: string,
    scopePath?: string[],
  ): string {
    if (scopePath && scopePath.length > 0) {
      // Include scope path in ID to prevent overwrites: "file.cls:Class.method.block:symbolName"
      const scopeStr = scopePath.join('.');
      return `${filePath}:${scopeStr}:${name}`;
    }
    // Fallback to original format for backward compatibility
    return `${filePath}:${name}`;
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
  | 'standard' // Multi-step with TypeReference + fallback
  | 'precise' // No fallback to containing symbols
  | 'hover' // Alias for 'precise' (LSP hover requests)
  | 'definition' // Alias for 'precise' (LSP definition requests)
  | 'references' // Alias for 'precise' (LSP references requests)
  | 'scope'; // Broader scope resolution (future)



export type Range = {
  startLine: number;
  /** Start column (1-based) */
  startColumn: number;
  /** End line (1-based) */
  endLine: number;
  /** End column (1-based) */
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
  filePath: string;
  parentId: string | null;

  // Legacy compatibility - will be removed in Phase 5
  key: SymbolKey;
  parentKey: SymbolKey | null;

  // Optional properties (lazy loaded)
  fqn?: string;
  namespace?: string | Namespace | null;
  annotations?: Annotation[];
  identifierLocation?: SymbolLocation;

  // Type-specific data (lazy loaded)
  _typeData?: {
    superClass?: string;
    interfaces?: string[];
    returnType?: TypeInfo;
    parameters?: string[]; // Array of parameter IDs
    type?: TypeInfo;
    initialValue?: string;
    values?: string[]; // Array of enum value IDs
  };

  // Modifiers (stored as bit flags internally, exposed as object)
  _modifierFlags: number;

  // Lazy loading support
  _isLoaded: boolean;
  _loadPromise?: Promise<void>;

  // Legacy compatibility - will be removed in Phase 5
  modifiers: SymbolModifiers;
  parent?: ApexSymbol | null;
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
  filePath?: string;
  /** The fully qualified name if available */
  fqn?: string;
  /** The symbol kind for enhanced identification */
  kind?: SymbolKind;
}

/**
 * Generate a unified symbol ID from a SymbolKey
 * @param key The symbol key
 * @param filePath Optional file path for uniqueness
 * @returns Unified symbol ID string
 */
export const generateUnifiedId = (
  key: SymbolKey,
  filePath?: string,
): string => {
  // Use FQN if available, otherwise construct from key components
  const baseId =
    key.fqn || `${key.kind || 'unknown'}:${key.name}:${key.path.join('.')}`;
  return filePath ? `${baseId}:${filePath}` : baseId;
};

/**
 * Convert a SymbolKey to a string for use as a map key (legacy compatibility)
 * @param key The symbol key
 * @returns String representation
 */
export const keyToString = (key: SymbolKey): string =>
  `${key.prefix}:${key.path.join('.')}`;

/**
 * Create a SymbolKey from an ApexSymbol with unified ID
 * @param symbol The Apex symbol
 * @param filePath Optional file path
 * @returns Enhanced SymbolKey with unified ID
 */
export const createFromSymbol = (
  symbol: ApexSymbol,
  filePath?: string,
): SymbolKey => {
  const key: SymbolKey = {
    prefix: symbol.key.prefix || symbol.kind,
    name: symbol.key.name || symbol.name,
    path: symbol.key.path || [symbol.filePath, symbol.name],
    kind: symbol.kind,
    fqn: symbol.fqn,
    filePath: filePath || symbol.filePath,
  };

  // Generate unified ID
  key.unifiedId = generateUnifiedId(key, filePath || symbol.filePath);

  return key;
};

/**
 * Create a SymbolKey from a parent symbol (for parentKey relationships)
 * @param parentSymbol The parent Apex symbol
 * @param filePath Optional file path
 * @returns Enhanced SymbolKey for parent relationship
 */
export const createParentKey = (
  parentSymbol: ApexSymbol,
  filePath?: string,
): SymbolKey => createFromSymbol(parentSymbol, filePath);

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
 * @param filePath Optional file path for generation
 * @returns Unified symbol ID
 */
export const getUnifiedId = (key: SymbolKey, filePath?: string): string => {
  if (key.unifiedId) {
    return key.unifiedId;
  }

  // Generate and cache the unified ID
  key.unifiedId = generateUnifiedId(key, filePath);
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

  /**
   * Creates a new symbol scope.
   * @param name The name of the scope
   * @param parent The parent scope, if any
   * @param scopeType The type of scope (file, class, method, block)
   */
  constructor(
    public readonly name: string,
    public readonly parent: SymbolScope | null = null,
    private readonly scopeType: string = 'file',
  ) {
    this.key = this.generateKey();
    if (parent) {
      parent.children.push(this);
    }
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
  private references: TypeReference[] = []; // NEW: Store type references

  /**
   * Creates a new symbol table.
   * Initializes with a root scope named 'file'.
   */
  constructor() {
    // Create root scope for the file
    this.root = new SymbolScope('file', null, 'file');
    this.current = this.root;
    this.scopeMap.set(this.keyToString(this.root.getKey()), this.root);
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

    // Set parent reference if parentKey exists (before adding to symbol map)
    if (symbol.parentKey) {
      const parent = this.lookupByKey(symbol.parentKey);
      if (parent) {
        symbol.parent = parent;
      }
    }

    this.current.addSymbol(symbol);
    this.symbolMap.set(this.keyToString(symbol.key), symbol);
  }

  /**
   * Enter a new scope.
   * Creates a new scope as a child of the current scope.
   * @param name The name of the new scope
   * @param scopeType The type of scope (file, class, method, block)
   */
  enterScope(name: string, scopeType: string = 'block'): void {
    const newScope = new SymbolScope(name, this.current, scopeType);
    this.current = newScope;
    this.scopeMap.set(this.keyToString(newScope.getKey()), newScope);
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
    return this.current.getPath();
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
    return Array.from(this.symbolMap.values());
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
   * @param position The position to search for references (0-based)
   * @returns Array of type references at the position
   */
  getReferencesAtPosition(position: {
    line: number;
    character: number;
  }): TypeReference[] {
    return this.references.filter((ref) =>
      this.positionInRange(position, ref.location),
    );
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
   * Check if a position is within a location range
   * @param position The position to check
   * @param location The location range
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
      position.character < location.identifierRange.endColumn
    );
  }

  /**
   * Convert the symbol table to a JSON-serializable format
   */
  toJSON() {
    type CleanedSymbol = Omit<ApexSymbol, 'parent'> & {
      values?: Array<Omit<VariableSymbol, 'parent'>>;
    };

    const cleanSymbol = (symbol: ApexSymbol): CleanedSymbol => {
      // Create a new object without the parent reference
      const { parent, ...rest } = symbol;
      const cleaned = { ...rest } as CleanedSymbol;

      // Handle enum values
      if (symbol.kind === SymbolKind.Enum) {
        const enumSymbol = symbol as EnumSymbol;
        if (enumSymbol.values) {
          // Create a new array of cleaned values
          cleaned.values = enumSymbol.values.map((value) => {
            // Create a new object without the parent reference
            const { parent: valueParent, ...valueRest } = value;
            return valueRest;
          });
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
