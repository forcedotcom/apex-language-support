/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Context, Effect } from 'effect';
import type { ApexSymbol, SymbolTable } from '../../types/symbol';
import type { SymbolReference } from '../../types/symbolReference';
import type { GenericTypeSubstitutionMap } from '../../utils/genericTypeSubstitution';
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';
import type { ResourceLoader } from '../../utils/resourceLoader';
import type { BuiltInTypeTablesImpl } from '../../utils/BuiltInTypeTables';
import type { UnifiedCache } from '../../utils/UnifiedCache';

/**
 * Context for chain resolution - discriminated union for type safety.
 * Shared between ApexSymbolManager and extracted ops modules.
 */
export type ChainResolutionContext =
  | { type: 'symbol'; symbol: ApexSymbol }
  | { type: 'namespace'; name: string }
  | { type: 'global' }
  | undefined;

/**
 * Effect service tag that breaks the mutual recursion between:
 *   resolveMemberInContext <-> addSymbolTable <-> resolveStandardApexClass
 *
 * Extracted ops modules depend on this service abstractly instead of
 * calling `this` on ApexSymbolManager. The concrete implementation is
 * wired in Phase 6 as a Layer that composes the ops.
 */
export interface SymbolResolverShape {
  /** Resolve a standard Apex class by loading its SymbolTable from stdlib */
  readonly resolveStandardApexClass: (
    name: string,
  ) => Effect.Effect<ApexSymbol | null>;

  /** Resolve a member (property, method, inner class) within a context */
  readonly resolveMemberInContext: (
    context: ChainResolutionContext,
    memberName: string,
    memberType: 'property' | 'method' | 'class',
    typeSubstitutions?: GenericTypeSubstitutionMap | null,
  ) => Effect.Effect<ApexSymbol | null>;

  /** Register a SymbolTable (lazy-loads stdlib when resolving) */
  readonly addSymbolTable: (
    symbolTable: SymbolTable,
    fileUri: string,
    documentVersion?: number,
    hasErrors?: boolean,
  ) => Effect.Effect<void>;

  /** Resolve a standard library type from a symbol reference */
  readonly resolveStandardLibraryType: (
    typeRef: SymbolReference,
  ) => Effect.Effect<ApexSymbol | null>;

  /** Check if a name represents a standard Apex class */
  readonly isStandardApexClass: (name: string) => Effect.Effect<boolean>;
}

export class SymbolResolver extends Context.Tag('SymbolResolver')<
  SymbolResolver,
  SymbolResolverShape
>() {}

/**
 * Structural interface satisfied by ApexSymbolManager.
 * Extracted ops functions take `self: SymbolManagerOps` as their first
 * parameter instead of using `this`. This breaks the tight coupling to
 * the class while keeping the refactoring mechanical (`this.` → `self.`).
 */
export interface SymbolManagerOps {
  // Lookup methods (already extracted to ops, but still available on the class)
  findSymbolByName(name: string): Promise<ApexSymbol[]>;
  findSymbolByFQN(fqn: string): Promise<ApexSymbol | null>;
  findSymbolsInFile(fileUri: string): Promise<ApexSymbol[]>;
  findFQNForStandardClass(name: string): Promise<string | null>;
  findScalarKeywordType(name: string): Promise<ApexSymbol | null>;
  getSymbol(symbolId: string): Promise<ApexSymbol | null>;
  getReferencesAtPosition(
    fileUri: string,
    position: { line: number; character: number },
  ): Promise<SymbolReference[]>;
  getAllReferencesInFile(fileUri: string): Promise<SymbolReference[]>;
  getAllSymbols(): Promise<ApexSymbol[]>;
  getContainingType(symbol: ApexSymbol): Promise<ApexSymbol | null>;
  getSymbolTableForFile(fileUri: string): Promise<SymbolTable | undefined>;

  // Recursive cluster methods
  resolveStandardApexClass(name: string): Promise<ApexSymbol | null>;
  resolveMemberInContext(
    context: ChainResolutionContext,
    memberName: string,
    memberType: 'property' | 'method' | 'class',
    typeSubstitutions?: GenericTypeSubstitutionMap | null,
  ): Promise<ApexSymbol | null>;
  resolveStandardLibraryType(
    typeRef: SymbolReference,
  ): Promise<ApexSymbol | null>;
  addSymbolTable(
    symbolTable: SymbolTable,
    fileUri: string,
    documentVersion?: number,
    hasErrors?: boolean,
  ): Promise<void>;
  addSymbolTableAsync(
    symbolTable: SymbolTable,
    fileUri: string,
    documentVersion?: number,
    hasErrors?: boolean,
  ): Promise<void>;
  isStandardApexClass(name: string): boolean;

  // Direct state access
  readonly symbolRefManager: {
    getSymbol(id: string): ApexSymbol | null;
    getSymbolTableForFile(uri: string): SymbolTable | undefined;
    getSymbolsInFile(uri: string): ApexSymbol[];
    getParent(symbol: ApexSymbol): ApexSymbol | null;
    addReference(
      sourceId: string,
      targetId: string,
      type: string,
      fileUri: string,
    ): void;
    enqueueDeferredReference(
      sourceId: string,
      targetName: string,
      type: string,
      fileUri: string,
      context?: string,
    ): void;
    findSymbolByName(name: string): ApexSymbol[];
    getStats(): { totalReferences: number };
  };
  readonly resourceLoader: ResourceLoader | null;
  readonly logger: LoggerInterface;
  readonly builtInTypeTables: BuiltInTypeTablesImpl;
  readonly unifiedCache: UnifiedCache;
  readonly loadingSymbolTables: Set<string>;
  readonly inFlightStdlibHydration: Map<string, Promise<SymbolTable | null>>;
  readonly isStaticCache: WeakMap<SymbolReference, boolean>;
}
