/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TypeInfo } from './typeInfo.js';

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
  parent?: ApexSymbol;
}

/**
 * Represents a class, interface, or trigger
 */
export interface TypeSymbol extends ApexSymbol {
  kind: SymbolKind.Class | SymbolKind.Interface | SymbolKind.Trigger;
  superClass?: string;
  interfaces: string[];
}

/**
 * Represents a method or constructor
 */
export interface MethodSymbol extends ApexSymbol {
  kind: SymbolKind.Method;
  returnType: TypeInfo;
  parameters: VariableSymbol[];
  isConstructor?: boolean;
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
 * Represents a scope in which symbols are defined
 */
export class SymbolScope {
  private symbols: Map<string, ApexSymbol> = new Map();
  private childScopes: SymbolScope[] = [];

  constructor(
    public readonly name: string,
    public readonly parent?: SymbolScope,
  ) {}

  /**
   * Add a symbol to this scope
   */
  addSymbol(symbol: ApexSymbol): void {
    this.symbols.set(symbol.name, symbol);
  }

  /**
   * Create a child scope
   */
  createChildScope(name: string): SymbolScope {
    const childScope = new SymbolScope(name, this);
    this.childScopes.push(childScope);
    return childScope;
  }

  /**
   * Get a symbol by name from this scope
   */
  getSymbol(name: string): ApexSymbol | undefined {
    return this.symbols.get(name);
  }

  /**
   * Get all symbols in this scope
   */
  getAllSymbols(): ApexSymbol[] {
    return Array.from(this.symbols.values());
  }

  /**
   * Get child scopes
   */
  getChildScopes(): SymbolScope[] {
    return this.childScopes;
  }
}

/**
 * Symbol table for all symbols in a compilation unit
 */
export class SymbolTable {
  private globalScope: SymbolScope = new SymbolScope('global');
  private currentScope: SymbolScope = this.globalScope;

  /**
   * Add a symbol to the current scope
   */
  addSymbol(symbol: ApexSymbol): void {
    this.currentScope.addSymbol(symbol);
  }

  /**
   * Enter a new scope
   */
  enterScope(name: string): void {
    this.currentScope = this.currentScope.createChildScope(name);
  }

  /**
   * Exit the current scope and return to the parent scope
   */
  exitScope(): void {
    if (this.currentScope.parent) {
      this.currentScope = this.currentScope.parent;
    }
  }

  /**
   * Get the current scope
   */
  getCurrentScope(): SymbolScope {
    return this.currentScope;
  }

  /**
   * Get the global scope
   */
  getGlobalScope(): SymbolScope {
    return this.globalScope;
  }

  /**
   * Find a symbol in the current scope only (doesn't check parent scopes)
   */
  findSymbolInCurrentScope(name: string): ApexSymbol | undefined {
    return this.currentScope.getSymbol(name);
  }

  /**
   * Lookup a symbol by name, searching through nested scopes
   */
  lookup(name: string): ApexSymbol | undefined {
    let scope: SymbolScope | undefined = this.currentScope;

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
