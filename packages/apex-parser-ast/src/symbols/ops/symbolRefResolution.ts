/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { HashMap } from 'data-structure-typed';
import type { ApexSymbol, SymbolTable } from '../../types/symbol';
import { SymbolKind } from '../../types/symbol';
import type { SymbolReference } from '../../types/symbolReference';
import { ReferenceContext } from '../../types/symbolReference';
import {
  isChainedSymbolReference,
  isBlockSymbol,
  inTypeSymbolGroup,
} from '../../utils/symbolNarrowing';
import { createFileUri, isStandardApexUri } from '../../types/ProtocolHandler';
import { extractFilePathFromUri } from '../../types/UriBasedIdGenerator';
import { STANDARD_APEX_LIBRARY_URI } from '../../utils/ResourceUtils';
import {
  GlobalTypeRegistry,
  GlobalTypeRegistryLive,
} from '../../services/GlobalTypeRegistryService';
import type { SymbolManagerOps } from '../services/symbolResolver';

/**
 * Extract qualifier and member information from a SymbolReference.
 * Handles both chained references (using chainNodes) and simple dot-notation references.
 */
export function extractQualifierFromChain(typeRef: SymbolReference): {
  qualifier: string;
  member: string;
  isQualified: boolean;
} | null {
  if (isChainedSymbolReference(typeRef)) {
    const chainNodes = typeRef.chainNodes;

    if (chainNodes && chainNodes.length >= 2) {
      const qualifier = chainNodes[0].name;
      const member = chainNodes[1].name;

      return {
        qualifier,
        member,
        isQualified: true,
      };
    }
  }

  if (typeRef.name.includes('.')) {
    const parts = typeRef.name.split('.');
    if (parts.length >= 2) {
      const qualifier = parts.slice(0, -1).join('.');
      const member = parts[parts.length - 1];

      return {
        qualifier,
        member,
        isQualified: true,
      };
    }
  }

  return null;
}

export function normalizeTypeNameForLookup(typeName: string): string {
  return typeName.trim().replace(/<.*>/g, '').replace(/\[\]$/, '');
}

export function buildTypeLookupCandidates(typeName: string): string[] {
  const normalized = normalizeTypeNameForLookup(typeName);
  const candidates: string[] = [];
  const seenLowercase = new Set<string>();
  const push = (value: string): void => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    const normalizedCandidate = trimmed.toLowerCase();
    if (!seenLowercase.has(normalizedCandidate)) {
      seenLowercase.add(normalizedCandidate);
      candidates.push(trimmed);
    }
  };

  push(normalized);
  const parts = normalized.split('.').filter((p) => p.length > 0);
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      push(parts.slice(i).join('.'));
    }
    push(parts[parts.length - 1]);
  }

  return candidates;
}

export async function resolvePreferredTypeSymbolForLookup(
  self: SymbolManagerOps,
  rawTypeName: string,
  fileUri?: string,
  symbolTable?: SymbolTable,
): Promise<ApexSymbol | null> {
  const candidates = buildTypeLookupCandidates(rawTypeName);
  const normalizedUri = fileUri
    ? extractFilePathFromUri(createFileUri(fileUri))
    : null;
  const localTypeSymbols = symbolTable
    ? symbolTable.getAllSymbols().filter(inTypeSymbolGroup)
    : [];
  const localById = new HashMap<string, ApexSymbol>();
  for (const symbol of localTypeSymbols) {
    localById.set(symbol.id, symbol);
  }

  const matchesCandidate = (symbol: ApexSymbol, candidate: string): boolean => {
    if (symbol.name?.toLowerCase() === candidate.toLowerCase()) {
      return true;
    }
    const fqn = (symbol as any)?.fqn as string | undefined;
    if (fqn && fqn.toLowerCase() === candidate.toLowerCase()) {
      return true;
    }

    const parts = candidate.split('.').filter((p) => p.length > 0);
    if (
      parts.length >= 2 &&
      symbol.name?.toLowerCase() === parts[parts.length - 1].toLowerCase()
    ) {
      const parent = symbol.parentId
        ? localById.get(symbol.parentId)
        : undefined;
      if (
        parent?.name?.toLowerCase() === parts[parts.length - 2].toLowerCase()
      ) {
        return true;
      }
    }
    return false;
  };

  for (const candidate of candidates) {
    const localMatch = localTypeSymbols.find((s) =>
      matchesCandidate(s, candidate),
    );
    if (localMatch) {
      return localMatch;
    }
  }

  for (const candidate of candidates) {
    const typeCandidates = (await self.findSymbolByName(candidate)).filter(
      inTypeSymbolGroup,
    );
    if (normalizedUri) {
      const sameFile = typeCandidates.find((s) => s.fileUri === normalizedUri);
      if (sameFile) {
        return sameFile;
      }
    }
    if (typeCandidates.length > 0) {
      return typeCandidates[0];
    }
  }

  return null;
}

/**
 * Validate that a type reference name is valid for resolution.
 *
 * The parser/listener extracts identifiers from parser nodes (id()?.text, typeName(), etc.),
 * which are already validated by the ANTLR lexer/parser. This check only ensures we have a
 * non-empty name before attempting resolution.
 */
export function isValidSymbolReferenceName(name: string): boolean {
  return !!(name && name.length > 0);
}

/** Check if a name represents a valid namespace */
export async function isValidNamespace(
  self: SymbolManagerOps,
  name: string,
): Promise<boolean> {
  if (self.isStandardApexClass(name)) {
    return true;
  }

  const namespaceSymbols = await findSymbolsInNamespace(self, name);
  return namespaceSymbols.length > 0;
}

/** Find all symbols in a given namespace */
export async function findSymbolsInNamespace(
  self: SymbolManagerOps,
  namespaceName: string,
): Promise<ApexSymbol[]> {
  const allSymbols = await self.getAllSymbols();
  return allSymbols.filter((symbol: ApexSymbol) => {
    if (symbol.fileUri && isStandardApexUri(symbol.fileUri)) {
      const pathParts = symbol.fileUri.split('/');
      if (pathParts.length >= 2) {
        const namespace = pathParts[1];
        return namespace.toLowerCase() === namespaceName.toLowerCase();
      }
    }
    return false;
  });
}

/**
 * Resolve an unqualified type reference using scope-based resolution.
 * Walks the scope hierarchy from innermost to outermost looking for matching symbols.
 */
export function resolveUnqualifiedReferenceByScope(
  self: SymbolManagerOps,
  typeReference: SymbolReference,
  sourceFile: string,
  position: { line: number; character: number },
): ApexSymbol | null {
  try {
    const symbolTable = self.symbolRefManager.getSymbolTableForFile(sourceFile);
    if (!symbolTable) {
      return null;
    }

    const scopeHierarchy = symbolTable.getScopeHierarchy(position);
    const allFileSymbols = symbolTable.getAllSymbols();

    const innermostToOutermost = [...scopeHierarchy].reverse();
    for (const blockSymbol of innermostToOutermost) {
      const isClassOrFileLevel =
        isBlockSymbol(blockSymbol) &&
        (blockSymbol.scopeType === 'class' || blockSymbol.scopeType === 'file');
      const directChildren = allFileSymbols.filter(
        (symbol) =>
          symbol.name?.toLowerCase() === typeReference.name.toLowerCase() &&
          symbol.parentId === blockSymbol.id &&
          (((symbol.kind === SymbolKind.Variable ||
            symbol.kind === SymbolKind.Parameter) &&
            !isClassOrFileLevel) ||
            symbol.kind === SymbolKind.Method),
      );

      const nestedBlocks = allFileSymbols.filter((s) => {
        if (s.kind !== SymbolKind.Block || s.parentId !== blockSymbol.id) {
          return false;
        }
        return scopeHierarchy.some(
          (hierarchyBlock) => hierarchyBlock.id === s.id,
        );
      });
      const symbolsInNestedBlocks: ApexSymbol[] = [];
      for (const nestedBlock of nestedBlocks) {
        const isInHierarchy = scopeHierarchy.some(
          (hierarchyBlock) => hierarchyBlock.id === nestedBlock.id,
        );
        if (!isInHierarchy) {
          continue;
        }
        const nestedSymbols = allFileSymbols.filter(
          (symbol) =>
            symbol.name === typeReference.name &&
            symbol.parentId === nestedBlock.id &&
            (symbol.kind === SymbolKind.Variable ||
              symbol.kind === SymbolKind.Parameter ||
              symbol.kind === SymbolKind.Method),
        );
        symbolsInNestedBlocks.push(...nestedSymbols);
      }

      const symbolsInScope = [...directChildren, ...symbolsInNestedBlocks];

      if (symbolsInScope.length > 0) {
        const validSymbols = symbolsInScope.filter((symbol) => {
          if (
            symbol.kind === SymbolKind.Variable ||
            symbol.kind === SymbolKind.Parameter
          ) {
            const symbolBlock = allFileSymbols.find(
              (s) => s.kind === SymbolKind.Block && s.id === symbol.parentId,
            );
            if (symbolBlock && isBlockSymbol(symbolBlock)) {
              return scopeHierarchy.some(
                (hierarchyBlock) => hierarchyBlock.id === symbolBlock.id,
              );
            }
            return false;
          }
          return true;
        });

        if (validSymbols.length > 0) {
          const prioritized = validSymbols.sort((a, b) => {
            const aIsVar =
              a.kind === SymbolKind.Variable || a.kind === SymbolKind.Parameter;
            const bIsVar =
              b.kind === SymbolKind.Variable || b.kind === SymbolKind.Parameter;
            if (aIsVar && !bIsVar) return -1;
            if (!aIsVar && bIsVar) return 1;
            return 0;
          });
          return prioritized[0];
        }
      }
    }

    const parentScopeSearchOrder = [...scopeHierarchy].reverse();
    for (const blockSymbol of parentScopeSearchOrder) {
      if (!isBlockSymbol(blockSymbol)) {
        continue;
      }

      const isClassOrFileLevel =
        blockSymbol.scopeType === 'class' || blockSymbol.scopeType === 'file';
      const isMethodLevel = blockSymbol.scopeType === 'method';

      if (isClassOrFileLevel) {
        const classFields = allFileSymbols.filter(
          (s) =>
            s.name === typeReference.name &&
            s.parentId === blockSymbol.id &&
            s.kind === SymbolKind.Field,
        );
        if (classFields.length > 0) {
          return classFields[0];
        }
        const classMethods = allFileSymbols.filter(
          (s) =>
            s.name === typeReference.name &&
            s.parentId === blockSymbol.id &&
            s.kind === SymbolKind.Method,
        );
        if (classMethods.length > 0) {
          return classMethods[0];
        }
      }

      if (isMethodLevel) {
        const parameters = allFileSymbols.filter(
          (s) =>
            s.name === typeReference.name &&
            s.parentId === blockSymbol.id &&
            s.kind === SymbolKind.Parameter,
        );
        if (parameters.length > 0) {
          return parameters[0];
        }
      }
    }

    for (const blockSymbol of parentScopeSearchOrder) {
      if (!isBlockSymbol(blockSymbol)) {
        continue;
      }
      if (blockSymbol.scopeType === 'method' && blockSymbol.parentId) {
        const directClassBlock = allFileSymbols.find(
          (s) =>
            isBlockSymbol(s) &&
            s.scopeType === 'class' &&
            s.id === blockSymbol.parentId,
        );
        if (directClassBlock) {
          const classFields = allFileSymbols.filter(
            (s) =>
              s.name === typeReference.name &&
              s.parentId === directClassBlock.id &&
              s.kind === SymbolKind.Field,
          );
          if (classFields.length > 0) {
            return classFields[0];
          }
          const classMethods = allFileSymbols.filter(
            (s) =>
              s.name === typeReference.name &&
              s.parentId === directClassBlock.id &&
              s.kind === SymbolKind.Method,
          );
          if (classMethods.length > 0) {
            return classMethods[0];
          }
        }

        const methodSymbol = allFileSymbols.find(
          (s) => s.id === blockSymbol.parentId && s.kind === SymbolKind.Method,
        );
        if (methodSymbol && methodSymbol.parentId) {
          const classBlock = allFileSymbols.find(
            (s) =>
              isBlockSymbol(s) &&
              s.scopeType === 'class' &&
              s.id === methodSymbol.parentId,
          );
          if (classBlock) {
            const classFields = allFileSymbols.filter(
              (s) =>
                s.name === typeReference.name &&
                s.parentId === classBlock.id &&
                s.kind === SymbolKind.Field,
            );
            if (classFields.length > 0) {
              return classFields[0];
            }
            const classMethods = allFileSymbols.filter(
              (s) =>
                s.name === typeReference.name &&
                s.parentId === classBlock.id &&
                s.kind === SymbolKind.Method,
            );
            if (classMethods.length > 0) {
              return classMethods[0];
            }
          }
        }
      }
    }
    return null;
  } catch (_error) {
    return null;
  }
}

/** Determine if a reference is static based on its context (with caching) */
export async function isStaticReference(
  self: SymbolManagerOps,
  typeRef: SymbolReference,
): Promise<boolean> {
  const cached = self.isStaticCache.get(typeRef);
  if (cached !== undefined) {
    return cached;
  }

  const result = await computeIsStaticReference(self, typeRef);

  self.isStaticCache.set(typeRef, result);
  return result;
}

/** Compute whether a reference is static (internal implementation) */
export async function computeIsStaticReference(
  self: SymbolManagerOps,
  typeRef: SymbolReference,
): Promise<boolean> {
  const qualifierInfo = extractQualifierFromChain(typeRef);
  if (qualifierInfo && qualifierInfo.isQualified) {
    const qualifierSymbols = await self.findSymbolByName(
      qualifierInfo.qualifier,
    );
    if (qualifierSymbols.length > 0) {
      const qualifierSymbol = qualifierSymbols[0];
      return qualifierSymbol.kind === SymbolKind.Class;
    }

    let qualifierRef: SymbolReference;
    if (isChainedSymbolReference(typeRef) && typeRef.chainNodes.length >= 2) {
      qualifierRef = typeRef.chainNodes[0];
    } else {
      qualifierRef = {
        name: qualifierInfo.qualifier,
        context: ReferenceContext.NAMESPACE,
        location: typeRef.location,
        resolvedSymbolId: undefined,
      };
    }
    const builtInQualifier =
      await self.resolveStandardLibraryType(qualifierRef);
    if (builtInQualifier) {
      return true;
    }
  }

  return false;
}

/** Check if a symbol is accessible from a given file */
export function isSymbolAccessibleFromFile(
  symbol: ApexSymbol,
  sourceFile: string,
): boolean {
  if (symbol.modifiers?.isBuiltIn) return true;
  if (symbol.key.path[0] === sourceFile) return true;
  if (symbol.modifiers?.visibility === 'global') return true;
  if (symbol.modifiers?.visibility === 'public') return true;
  return false;
}

function calculateSymbolSize(symbol: ApexSymbol): number {
  if (!symbol.location) {
    return Number.MAX_SAFE_INTEGER;
  }

  const { startLine, startColumn, endLine, endColumn } =
    symbol.location.identifierRange;

  const lineCount = endLine - startLine + 1;
  const columnCount = endColumn - startColumn + 1;

  return lineCount * 100 + columnCount;
}

/** Select the most specific symbol from a list of candidates */
export function selectMostSpecificSymbol(
  candidates: ApexSymbol[],
  sourceFile: string,
): ApexSymbol {
  if (candidates.length === 1) {
    return candidates[0];
  }

  const sameFileCandidates = candidates.filter(
    (s) => s.key.path[0] === sourceFile,
  );
  if (sameFileCandidates.length > 0) {
    candidates = sameFileCandidates;
  }

  candidates.sort((a, b) => {
    const aSize = calculateSymbolSize(a);
    const bSize = calculateSymbolSize(b);

    if (Math.abs(aSize - bSize) > 10) {
      const result = aSize - bSize;
      return result;
    }

    const priorityOrder = [
      'parameter',
      'variable',
      'field',
      'method',
      'constructor',
      'class',
      'interface',
      'enum',
    ];
    const aPriority = priorityOrder.indexOf(a.kind) ?? 999;
    const bPriority = priorityOrder.indexOf(b.kind) ?? 999;
    const result = aPriority - bPriority;
    return result;
  });

  return candidates[0];
}

export function isStandardApexClass(
  self: SymbolManagerOps,
  name: string,
): boolean {
  const parts = name.split('.');
  const namespace = parts[0];
  const className = parts[1];

  if (parts.length === 2) {
    if (!self.resourceLoader?.isStdApexNamespace(namespace)) {
      return false;
    }
    return (
      self.resourceLoader?.hasClass(`${namespace}.${className}.cls`) || false
    );
  }

  if (parts.length === 1) {
    const className = parts[0];

    if (self.resourceLoader) {
      const classNamespaces =
        self.resourceLoader.findNamespaceForClass(className);
      return classNamespaces.size > 0;
    }

    return false;
  }

  return false;
}

export async function resolveStandardLibraryType(
  self: SymbolManagerOps,
  typeRef: SymbolReference,
): Promise<ApexSymbol | null> {
  const name = typeRef.name;

  if (!isValidSymbolReferenceName(name)) {
    return null;
  }

  try {
    if (isChainedSymbolReference(typeRef)) {
      const chainNodes = typeRef.chainNodes;

      if (chainNodes.length === 2) {
        const qualifierNode = chainNodes[0];
        const memberNode = chainNodes[1];

        const qualifierSymbol = await resolveStandardLibraryType(
          self,
          qualifierNode,
        );
        if (qualifierSymbol) {
          if (
            memberNode.context === ReferenceContext.METHOD_CALL ||
            memberNode.context === ReferenceContext.FIELD_ACCESS
          ) {
            const memberType =
              memberNode.context === ReferenceContext.METHOD_CALL
                ? 'method'
                : 'property';
            const resolvedMember = await self.resolveMemberInContext(
              { type: 'symbol', symbol: qualifierSymbol },
              memberNode.name,
              memberType,
            );
            if (resolvedMember) {
              self.logger.debug(
                () =>
                  `Resolved "${name}" via chain member lookup: ${resolvedMember.name}`,
              );
              return resolvedMember;
            }
          } else {
            const fqn = `${qualifierNode.name}.${memberNode.name}`;
            const memberSymbol = await resolveStandardApexClass(self, fqn);
            if (memberSymbol) {
              self.logger.debug(
                () =>
                  `Resolved "${name}" via chain nodes as ${fqn}: ${memberSymbol.name}`,
              );
              return memberSymbol;
            }
          }
        }
      }
    }

    const isStandard = self.isStandardApexClass(name);
    const isStandardNamespace =
      self.resourceLoader?.isStdApexNamespace(name) || false;

    if (isStandard || isStandardNamespace) {
      if (!self.resourceLoader) {
        return null;
      }
      let standardClass: ApexSymbol | null = null;

      if (name.includes('.')) {
        standardClass = await resolveStandardApexClass(self, name);
      } else {
        const fqn = await self.findFQNForStandardClass(name);
        if (fqn) {
          standardClass = await resolveStandardApexClass(self, fqn);
        }
        if (!standardClass && isStandardNamespace) {
          const namespaceClassFqn = `${name}.${name}`;
          standardClass = await resolveStandardApexClass(
            self,
            namespaceClassFqn,
          );
        }
      }

      if (standardClass) {
        return standardClass;
      }
    }

    if (!name.includes('.')) {
      const scalarKeyword = await self.findScalarKeywordType(name);
      if (scalarKeyword) {
        return {
          ...scalarKeyword,
          modifiers: {
            ...scalarKeyword.modifiers,
            isBuiltIn: true,
          },
        };
      }

      const fqn = await self.findFQNForStandardClass(name);
      if (fqn) {
        const standardClass = await resolveStandardApexClass(self, fqn);
        if (standardClass) {
          return standardClass;
        }
      }
    }

    const scalarKeywordFallback = await self.findScalarKeywordType(name);
    if (scalarKeywordFallback) {
      return {
        ...scalarKeywordFallback,
        modifiers: {
          ...scalarKeywordFallback.modifiers,
          isBuiltIn: true,
        },
      };
    }

    return null;
  } catch (_error) {
    return null;
  }
}

export async function resolveStandardApexClass(
  self: SymbolManagerOps,
  name: string,
): Promise<ApexSymbol | null> {
  if (!self.resourceLoader) {
    return null;
  }

  try {
    try {
      const registryLookup = Effect.gen(function* () {
        const registry = yield* GlobalTypeRegistry;
        return yield* registry.resolveType(name);
      });

      const registryEntry = await Effect.runPromise(
        registryLookup.pipe(Effect.provide(GlobalTypeRegistryLive)),
      );

      if (registryEntry) {
        self.logger.debug(
          () =>
            `[resolveStandardApexClass] Found "${name}" in GlobalTypeRegistry: ${registryEntry.fqn}`,
        );

        let symbol = self.symbolRefManager.getSymbol(registryEntry.symbolId);
        if (symbol) {
          return symbol;
        }

        const match = registryEntry.fileUri.match(
          /apexlib:\/\/resources\/StandardApexLibrary\/(.+\.cls)$/,
        );
        if (match) {
          const classPath = match[1];
          const symbolTable = await loadAndRegisterStdlibSymbolTable(
            self,
            registryEntry.fileUri,
            classPath,
          );
          if (symbolTable) {
            const symbols = symbolTable.getAllSymbols();
            const foundSymbol = symbols.find(
              (s) =>
                s.name?.toLowerCase() === registryEntry.name.toLowerCase() &&
                s.kind === SymbolKind.Class,
            );
            if (foundSymbol) {
              self.logger.debug(
                () =>
                  `[resolveStandardApexClass] Loaded "${name}" from cache and found in graph`,
              );
              return foundSymbol;
            } else {
              self.logger.debug(
                () =>
                  `[resolveStandardApexClass] Found registry entry for "${name}" ` +
                  'but symbol not found after loading from cache',
              );
            }
          } else {
            self.logger.debug(
              () =>
                `[resolveStandardApexClass] Found registry entry for "${name}" but getSymbolTable returned null`,
            );
          }
        } else {
          self.logger.debug(
            () =>
              `[resolveStandardApexClass] Found registry entry for "${name}" but ` +
              `fileUri doesn't match apexlib://resources/StandardApexLibrary/ pattern: ${registryEntry.fileUri}`,
          );
        }
      } else {
        self.logger.debug(
          () =>
            `[resolveStandardApexClass] "${name}" not found in GlobalTypeRegistry, falling through to cache loading`,
        );
      }
    } catch (error) {
      self.logger.debug(
        () =>
          `[resolveStandardApexClass] GlobalTypeRegistry lookup failed for "${name}": ${error}`,
      );
    }

    const parts = name.split('.');

    let namespace: string;
    let className: string;

    if (parts.length < 2) {
      const classNamespaces = self.resourceLoader.findNamespaceForClass(
        parts[0],
      );

      if (classNamespaces.size === 0) {
        self.logger.debug(
          () => `Class "${parts[0]}" not found in any standard namespace`,
        );
        return null;
      }

      if (classNamespaces.size > 1) {
        const namespaceList = Array.from(classNamespaces).join(', ');
        self.logger.debug(
          () =>
            `Ambiguous class name "${parts[0]}" found in ${classNamespaces.size} namespaces: ${namespaceList}`,
        );
        return null;
      }

      namespace = Array.from(classNamespaces)[0];
      className = parts[0];
    } else {
      namespace = parts[0];
      className = parts[1];
    }

    self.logger.debug(
      () =>
        `[resolveStandardApexClass] Resolving "${name}" -> namespace="${namespace}", className="${className}"`,
    );

    let classPath = `${namespace}/${className}.cls`;

    const namespaceStructure = self.resourceLoader.getStandardNamespaces();
    let classes = namespaceStructure.get(namespace);
    if (!classes) {
      for (const [nsKey, nsClasses] of namespaceStructure.entries()) {
        if (nsKey.toLowerCase() === namespace.toLowerCase()) {
          classes = nsClasses;
          namespace = nsKey;
          break;
        }
      }
    }

    if (classes) {
      const target = className.toLowerCase();

      for (const classFile of classes) {
        const cleanClassName = classFile.replace(/\.cls$/, '');

        if (cleanClassName.toLowerCase() === target) {
          classPath = `${namespace}/${cleanClassName}.cls`;
          self.logger.debug(
            () =>
              `Found class in namespace structure: ${classPath} (searched for ${name})`,
          );
          break;
        }
      }
    } else {
      self.logger.debug(
        () =>
          `Namespace "${namespace}" not found in ResourceLoader namespace structure`,
      );
    }

    const isStandardNamespace =
      self.resourceLoader.isStdApexNamespace(namespace);
    const hasClass = self.resourceLoader.hasClass(classPath);

    if (!hasClass && !isStandardNamespace) {
      self.logger.debug(
        () =>
          `Class not found in ResourceLoader: ${classPath} (searched for ${name})`,
      );
      return null;
    }

    if (!hasClass && isStandardNamespace) {
      self.logger.debug(
        () =>
          `Standard namespace "${namespace}" - trying to load ${classPath} even though hasClass returned false`,
      );
    }

    const fileUri = `${STANDARD_APEX_LIBRARY_URI}/${classPath}`;
    if (self.loadingSymbolTables.has(fileUri)) {
      const graphSymbols = await self.findSymbolByName(className);
      const graphClassSymbols = graphSymbols.filter(
        (s) =>
          s.kind === SymbolKind.Class &&
          (s.fileUri === fileUri ||
            s.fileUri?.includes('StandardApexLibrary') ||
            s.fileUri?.includes('apexlib://')),
      );
      if (graphClassSymbols.length > 0) {
        const fileSymbol = graphClassSymbols.find((s) => s.fileUri === fileUri);
        if (fileSymbol) {
          return fileSymbol;
        }
        const standardSymbol = graphClassSymbols.find(
          (s) =>
            s.fileUri?.includes('apexlib://') ||
            s.fileUri?.includes('StandardApexLibrary'),
        );
        if (standardSymbol) {
          return standardSymbol;
        }
        return graphClassSymbols[0];
      }
      return null;
    }

    try {
      self.loadingSymbolTables.add(fileUri);

      self.logger.debug(
        () =>
          '[resolveStandardApexClass] Loading class from ResourceLoader: ' +
          `classPath="${classPath}", fileUri="${fileUri}"`,
      );

      const symbolTable = await loadAndRegisterStdlibSymbolTable(
        self,
        fileUri,
        classPath,
      );
      if (!symbolTable) {
        self.logger.debug(
          () =>
            `[resolveStandardApexClass] ResourceLoader returned null for "${classPath}"`,
        );
        return null;
      }
      const symbols = symbolTable.getAllSymbols();
      let classSymbol = symbols.find(
        (s) =>
          s.name?.toLowerCase() === className.toLowerCase() &&
          s.kind === SymbolKind.Class,
      );

      if (!classSymbol) {
        classSymbol = symbols.find((s) => s.kind === SymbolKind.Class);
        if (classSymbol && !classSymbol.name) {
          classSymbol.name = className;
        }
      }

      if (classSymbol) {
        classSymbol.fileUri = fileUri;
        if (!classSymbol.name || classSymbol.name === '') {
          classSymbol.name = className;
        }
        return classSymbol;
      }

      const graphSymbols = await self.findSymbolByName(className);
      const graphClassSymbols = graphSymbols.filter(
        (s) =>
          s.kind === SymbolKind.Class &&
          (s.fileUri === fileUri ||
            s.fileUri?.includes('StandardApexLibrary') ||
            s.fileUri?.includes('apexlib://')),
      );
      if (graphClassSymbols.length > 0) {
        const fileSymbol = graphClassSymbols.find((s) => s.fileUri === fileUri);
        if (fileSymbol) {
          self.logger.debug(
            () =>
              `Found class "${className}" from symbol graph after loading: ${fileSymbol.name}`,
          );
          return fileSymbol;
        }
        const standardSymbol = graphClassSymbols.find(
          (s) =>
            s.fileUri?.includes('apexlib://') ||
            s.fileUri?.includes('StandardApexLibrary'),
        );
        if (standardSymbol) {
          self.logger.debug(
            () =>
              `Found class "${className}" from symbol graph (standard): ${standardSymbol.name}`,
          );
          return standardSymbol;
        }
        return graphClassSymbols[0];
      }
      return null;
    } catch (_error) {
      return null;
    } finally {
      self.loadingSymbolTables.delete(fileUri);
    }
  } catch (error) {
    self.logger.warn(
      () => `❌ Failed to resolve standard Apex class ${name}: ${error}`,
    );
    return null;
  }
}

export async function loadAndRegisterStdlibSymbolTable(
  self: SymbolManagerOps,
  fileUri: string,
  classPath: string,
): Promise<SymbolTable | null> {
  if (!self.resourceLoader) {
    return null;
  }

  const inFlight = self.inFlightStdlibHydration.get(fileUri);
  if (inFlight) {
    return inFlight;
  }

  const hydrationPromise = (async () => {
    const symbolTable = await self.resourceLoader!.getSymbolTable(classPath);
    if (!symbolTable) {
      return null;
    }

    await self.addSymbolTableAsync(symbolTable, fileUri);
    return symbolTable;
  })().finally(() => {
    self.inFlightStdlibHydration.delete(fileUri);
  });

  self.inFlightStdlibHydration.set(fileUri, hydrationPromise);
  return hydrationPromise;
}
