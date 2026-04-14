/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { type ApexSymbol, SymbolKind } from '../../types/symbol';
import { SymbolIndexStore } from '../services/symbolIndexStore';
import { CacheStore } from '../services/cacheStore';
import { ResourceLoader } from '../../utils/resourceLoader';
import { BuiltInTypeTablesImpl } from '../../utils/BuiltInTypeTables';
import { findByName, findByFQN } from './symbolLookup';

type ProviderDeps = SymbolIndexStore | CacheStore;

function tryGetResourceLoader(): ResourceLoader | undefined {
  try {
    return ResourceLoader.getInstance();
  } catch {
    return undefined;
  }
}

function tryGetBuiltInTypes(): BuiltInTypeTablesImpl | undefined {
  try {
    return BuiltInTypeTablesImpl.getInstance();
  } catch {
    return undefined;
  }
}

/** Resolve a symbol by full name with namespace-aware fallback */
export const find = (
  referencingType: ApexSymbol,
  fullName: string,
): Effect.Effect<ApexSymbol | null, never, ProviderDeps> =>
  Effect.gen(function* () {
    const byFqn = yield* findByFQN(fullName);
    if (byFqn) return byFqn;

    if (fullName.includes('.')) {
      const [namespace, typeName] = fullName.split('.', 2);
      const byName = yield* findByName(typeName);
      const namespaceCandidates = byName.filter((candidate) => {
        const ns =
          typeof candidate.namespace === 'string'
            ? candidate.namespace
            : (candidate.namespace?.toString?.() ?? '');
        return ns.toLowerCase() === namespace.toLowerCase();
      });
      const typeMatch = namespaceCandidates.find(
        (c) =>
          c.kind === SymbolKind.Class ||
          c.kind === SymbolKind.Interface ||
          c.kind === SymbolKind.Enum ||
          c.kind === SymbolKind.Trigger,
      );
      if (typeMatch) return typeMatch;
      if (namespaceCandidates.length > 0) return namespaceCandidates[0];

      const loader = tryGetResourceLoader();
      if (loader?.isStdApexNamespace(namespace)) {
        const stdlibTable = loader.getSymbolTableSync(
          `${namespace}/${typeName}.cls`,
        );
        const classSymbol = stdlibTable
          ?.getAllSymbols()
          .find(
            (c) =>
              c.kind === SymbolKind.Class &&
              c.name.toLowerCase() === typeName.toLowerCase(),
          );
        if (classSymbol) return classSymbol;
      }
    }

    const symbols = yield* findByName(fullName);
    return symbols.length > 0 ? symbols[0] : null;
  });

/** Find a scalar keyword type (void, null) — not wrapper types like String */
export const findScalarKeywordType = (
  name: string,
): Effect.Effect<ApexSymbol | null> =>
  Effect.sync(() => {
    const builtIn = tryGetBuiltInTypes();
    return builtIn?.findType(name.toLowerCase()) ?? null;
  });

/** Find an SObject type by name */
export const findSObjectType = (
  name: string,
): Effect.Effect<ApexSymbol | null, never, ProviderDeps> =>
  Effect.gen(function* () {
    const symbols = yield* findByName(name);
    return (
      symbols.find((s) => s.kind === 'class' && s.namespace === 'SObject') ??
      null
    );
  });

/** Find a type from an external package */
export const findExternalType = (
  name: string,
  packageName: string,
): Effect.Effect<ApexSymbol | null, never, ProviderDeps> =>
  Effect.gen(function* () {
    const symbols = yield* findByName(name);
    return symbols.find((s) => s.namespace === packageName) ?? null;
  });

/** Resolve an unqualified name using default namespace order (System, Schema) */
export const findInDefaultNamespaceOrder = (
  name: string,
  referencingType: ApexSymbol,
): Effect.Effect<ApexSymbol | null, never, ProviderDeps> =>
  Effect.gen(function* () {
    const namespaces = ['System', 'Schema'];
    for (const ns of namespaces) {
      const result = yield* findInExplicitNamespace(ns, name, referencingType);
      if (result) return result;
    }
    return null;
  });

/** Resolve an unqualified name in implicit file namespaces by slot */
export const findInImplicitFileNamespaceSlot = (
  name: string,
  slot: number,
  referencingType: ApexSymbol,
): Effect.Effect<ApexSymbol | null, never, ProviderDeps> =>
  Effect.gen(function* () {
    const namespaces = ['System', 'Schema'];
    const ns = namespaces[slot];
    if (!ns) return null;
    return yield* findInExplicitNamespace(ns, name, referencingType);
  });

/** Resolve a type by explicit namespace and unqualified type name */
export const findInExplicitNamespace = (
  namespaceName: string,
  typeName: string,
  referencingType: ApexSymbol,
): Effect.Effect<ApexSymbol | null, never, ProviderDeps> =>
  Effect.gen(function* () {
    const fqn = `${namespaceName.toLowerCase()}.${typeName}`;
    const byFind = yield* find(referencingType, fqn);
    if (byFind) return byFind;
    return yield* findScalarKeywordType(fqn);
  });

/** Whether the namespace token is a known built-in namespace alias */
export const isBuiltInNamespace = (
  namespaceName: string,
): Effect.Effect<boolean> =>
  Effect.sync(() => {
    if (!namespaceName) return false;
    const loader = tryGetResourceLoader();
    if (loader?.isStdApexNamespace(namespaceName)) return true;
    const n = namespaceName.toLowerCase();
    return n === 'system' || n === 'schema';
  });

/** Whether the namespace should be treated as an SObject container */
export const isSObjectContainerNamespace = (
  namespaceName: string,
): Effect.Effect<boolean> =>
  Effect.succeed(namespaceName.toLowerCase() === 'schema');
