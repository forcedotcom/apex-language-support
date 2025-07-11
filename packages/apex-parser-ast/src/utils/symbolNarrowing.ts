/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';

import {
  ApexSymbol,
  EnumSymbol,
  MethodSymbol,
  TypeSymbol,
  VariableSymbol,
  SymbolKind,
} from '../types/symbol';

/**
 * Type predicate to check if a context has an id() method
 */
export const hasIdMethod = (
  ctx: ParserRuleContext,
): ctx is ParserRuleContext & { id(): any } =>
  typeof (ctx as any).id === 'function';

/**
 * Type predicate to check if a symbol is an EnumSymbol
 */
export const isEnumSymbol = (symbol: ApexSymbol): symbol is EnumSymbol =>
  symbol.kind === SymbolKind.Enum;

/**
 * Type predicate to check if a symbol is a MethodSymbol
 */
export const isMethodSymbol = (symbol: ApexSymbol): symbol is MethodSymbol =>
  symbol.kind === SymbolKind.Method || symbol.kind === SymbolKind.Constructor;

/**
 * Type predicate to check if a symbol is a ClassSymbol
 */
export const isClassSymbol = (symbol: ApexSymbol): symbol is TypeSymbol =>
  symbol.kind === SymbolKind.Class;

/**
 * Type predicate to check if a symbol is an InterfaceSymbol
 */
export const isInterfaceSymbol = (symbol: ApexSymbol): symbol is TypeSymbol =>
  symbol.kind === SymbolKind.Interface;

/**
 * Type predicate to check if a symbol is a TriggerSymbol
 */
export const isTriggerSymbol = (symbol: ApexSymbol): symbol is TypeSymbol =>
  symbol.kind === SymbolKind.Trigger;

/**
 * Type predicate to check if a symbol is in the TypeSymbol family (Class, Interface, Enum, or Trigger)
 */
export const inTypeSymbolGroup = (symbol: ApexSymbol): symbol is TypeSymbol =>
  symbol.kind === SymbolKind.Class ||
  symbol.kind === SymbolKind.Interface ||
  symbol.kind === SymbolKind.Enum ||
  symbol.kind === SymbolKind.Trigger;

/**
 * Type predicate to check if a symbol is a VariableSymbol
 */
export const isVariableSymbol = (
  symbol: ApexSymbol,
): symbol is VariableSymbol =>
  symbol.kind === SymbolKind.Property ||
  symbol.kind === SymbolKind.Field ||
  symbol.kind === SymbolKind.Variable ||
  symbol.kind === SymbolKind.Parameter ||
  symbol.kind === SymbolKind.EnumValue;
