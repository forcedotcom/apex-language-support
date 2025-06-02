/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TypeInfo } from './typeInfo';

/**
 * Types of symbols that can be defined in Apex code
 */
export enum SymbolKind {
  Class = 'class',
  Interface = 'interface',
  Trigger = 'trigger',
  Method = 'method',
  Property = 'property',
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
}

/**
 * Location information for a symbol in the source code
 */
export interface SymbolLocation {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

/**
 * Base interface for all Apex symbols
 */
export interface ApexSymbol {
  name: string;
  kind: SymbolKind;
  location: SymbolLocation;
  modifiers: SymbolModifiers;
  parent: ApexSymbol | null;
  /** The fully qualified name of the symbol */
  fqn?: string;
  /** Namespace of the symbol, if applicable */
  namespace?: string;
  /** Annotations for this symbol */
  annotations?: Annotation[];
}

/**
 * Represents a class, interface, or trigger
 */
export interface TypeSymbol extends ApexSymbol {
  kind: SymbolKind.Class | SymbolKind.Interface | SymbolKind.Trigger;
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
   */
  interfaces: string[];
  /** Annotations for this type */
  annotations?: Annotation[];
}

/**
 * Represents a method or constructor
 */
export interface MethodSymbol extends ApexSymbol {
  kind: SymbolKind.Method;
  returnType: TypeInfo;
  parameters: VariableSymbol[];
  isConstructor?: boolean;
  /** Annotations for this method */
  annotations?: Annotation[];
}

/**
 * Represents a property, variable, parameter, or enum value
 */
export interface VariableSymbol extends ApexSymbol {
  kind:
    | SymbolKind.Property
    | SymbolKind.Variable
    | SymbolKind.Parameter
    | SymbolKind.EnumValue;
  type: TypeInfo;
  initialValue?: string;
}

/**
 * Represents an enum type declaration
 */
export interface EnumSymbol extends ApexSymbol {
  kind: SymbolKind.Enum;
  values: VariableSymbol[];
}

/**
 * Represents a scope in which symbols are defined within a source file.
 * Maintains a hierarchy of scopes and provides symbol lookup functionality.
 */
export class SymbolScope {
  private symbols: Map<string, ApexSymbol> = new Map();
  private children: SymbolScope[] = [];

  /**
   * Creates a new symbol scope.
   * @param name The name of the scope
   * @param parent The parent scope, if any
   */
  constructor(
    public readonly name: string,
    public readonly parent: SymbolScope | null = null,
  ) {
    if (parent) {
      parent.children.push(this);
    }
  }

  /**
   * Add a symbol to this scope.
   * @param symbol The symbol to add
   */
  addSymbol(symbol: ApexSymbol): void {
    this.symbols.set(symbol.name, symbol);
  }

  /**
   * Get a symbol by name from this scope.
   * @param name The name of the symbol to find
   * @returns The symbol if found, undefined otherwise
   */
  getSymbol(name: string): ApexSymbol | undefined {
    return this.symbols.get(name);
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
    return this.children;
  }
}

/**
 * Symbol table representing all symbols in a source file.
 * Maintains a hierarchy of scopes and provides symbol lookup functionality.
 */
export class SymbolTable {
  private root: SymbolScope;
  private current: SymbolScope;

  /**
   * Creates a new symbol table.
   * Initializes with a root scope named 'file'.
   */
  constructor() {
    // Create root scope for the file
    this.root = new SymbolScope('file');
    this.current = this.root;
  }

  /**
   * Add a symbol to the current scope.
   * @param symbol The symbol to add
   */
  addSymbol(symbol: ApexSymbol): void {
    this.current.addSymbol(symbol);
  }

  /**
   * Enter a new scope.
   * Creates a new scope as a child of the current scope.
   * @param name The name of the new scope
   */
  enterScope(name: string): void {
    this.current = new SymbolScope(name, this.current);
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
   * Searches from current scope up through parent scopes.
   * @param name The name of the symbol to find
   * @returns The symbol if found, undefined otherwise
   */
  lookup(name: string): ApexSymbol | undefined {
    let scope: SymbolScope | null = this.current;

    while (scope) {
      const symbol = scope.getSymbol(name);
      if (symbol) {
        return symbol;
      }
      scope = scope.parent;
    }

    return undefined;
  }
}
