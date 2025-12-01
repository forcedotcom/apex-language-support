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
  BlockSymbol,
  SymbolKind,
} from '../types/symbol';
import type {
  CompilationResultWithComments,
  CompilationResultWithAssociations,
} from '../parser/compilerService';
import { ChainedTypeReference, TypeReference } from '../types/typeReference';

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
export const isEnumSymbol = (
  symbol: ApexSymbol | undefined | null,
): symbol is EnumSymbol => !!symbol && symbol.kind === SymbolKind.Enum;

/**
 * Type predicate to check if a symbol is a MethodSymbol
 */
export const isMethodSymbol = (
  symbol: ApexSymbol | undefined | null,
): symbol is MethodSymbol => !!symbol && symbol.kind === SymbolKind.Method;

/**
 * Type predicate to check if a symbol is a ConstructorSymbol (MethodSymbol with Constructor kind)
 */
export const isConstructorSymbol = (
  symbol: ApexSymbol | undefined | null,
): symbol is MethodSymbol & {
  kind: SymbolKind.Constructor;
  isConstructor: true;
} => !!symbol && symbol.kind === SymbolKind.Constructor;

/**
 * Type predicate to check if a symbol is a ClassSymbol
 */
export const isClassSymbol = (
  symbol: ApexSymbol | undefined | null,
): symbol is TypeSymbol => !!symbol && symbol.kind === SymbolKind.Class;

/**
 * Type predicate to check if a symbol is an InterfaceSymbol
 */
export const isInterfaceSymbol = (
  symbol: ApexSymbol | undefined | null,
): symbol is TypeSymbol => !!symbol && symbol.kind === SymbolKind.Interface;

/**
 * Type predicate to check if a symbol is a TriggerSymbol
 */
export const isTriggerSymbol = (
  symbol: ApexSymbol | undefined | null,
): symbol is TypeSymbol => !!symbol && symbol.kind === SymbolKind.Trigger;

export const isFieldSymbol = (
  symbol: ApexSymbol | undefined | null,
): symbol is VariableSymbol => !!symbol && symbol.kind === SymbolKind.Field;

export const isPropertySymbol = (
  symbol: ApexSymbol | undefined | null,
): symbol is VariableSymbol => !!symbol && symbol.kind === SymbolKind.Property;

/**
 * Type predicate to check if a symbol is in the TypeSymbol family (Class, Interface, Enum, or Trigger)
 */
export const inTypeSymbolGroup = (
  symbol: ApexSymbol | undefined | null,
): symbol is TypeSymbol =>
  !!symbol &&
  (symbol.kind === SymbolKind.Class ||
    symbol.kind === SymbolKind.Enum ||
    symbol.kind === SymbolKind.Interface ||
    symbol.kind === SymbolKind.Trigger);

/**
 * Type predicate to check if a symbol is a VariableSymbol
 */
export const isVariableSymbol = (
  symbol: ApexSymbol | undefined | null,
): symbol is VariableSymbol =>
  !!symbol &&
  (symbol.kind === SymbolKind.Property ||
    symbol.kind === SymbolKind.Field ||
    symbol.kind === SymbolKind.Variable ||
    symbol.kind === SymbolKind.Parameter ||
    symbol.kind === SymbolKind.EnumValue);

/**
 * Type predicate to check if a symbol is a BlockSymbol
 */
export const isBlockSymbol = (
  symbol: ApexSymbol | undefined | null,
): symbol is BlockSymbol => !!symbol && symbol.kind === SymbolKind.Block;

/**
 * Type predicate to check if a compilation result includes comments
 */
export const hasComments = (
  result: any,
): result is CompilationResultWithComments<any> =>
  !!result && typeof result === 'object' && 'comments' in (result as any);

/**
 * Type predicate to check if a compilation result includes comment associations
 */
export const hasCommentAssociations = (
  result: any,
): result is CompilationResultWithAssociations<any> =>
  !!result &&
  typeof result === 'object' &&
  'comments' in (result as any) &&
  'commentAssociations' in (result as any);

export const isChainedTypeReference = (
  typeReference: TypeReference,
): typeReference is ChainedTypeReference =>
  !!typeReference &&
  typeof typeReference === 'object' &&
  'chainNodes' in typeReference &&
  Array.isArray(typeReference.chainNodes);
