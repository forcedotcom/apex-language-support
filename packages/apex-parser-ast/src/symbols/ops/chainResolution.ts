/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap, Stack } from 'data-structure-typed';
import { Effect } from 'effect';
import type {
  ApexSymbol,
  SymbolLocation,
  SymbolTable,
  TypeSymbol,
  VariableSymbol,
} from '../../types/symbol';
import { SymbolKind } from '../../types/symbol';
import {
  type SymbolReference,
  ReferenceContext,
  EnhancedSymbolReference,
} from '../../types/symbolReference';
import {
  isChainedSymbolReference,
  isBlockSymbol,
  isMethodSymbol as isMethodSymbolNarrowing,
} from '../../utils/symbolNarrowing';
import {
  createFileUri,
  isStandardApexUri,
  extractApexLibPath,
} from '../../types/ProtocolHandler';
import { extractFilePathFromUri } from '../../types/UriBasedIdGenerator';
import { STANDARD_APEX_LIBRARY_URI } from '../../utils/ResourceUtils';
import { getImplicitQualifiedCandidates } from '../../namespace/NamespaceResolutionPolicy';
import { BUILTIN_TYPE_NAMES } from '../../utils/ApexKeywords';
import {
  applyMethodTypeSubstitutions,
  createGenericTypeSubstitutionMap,
  type GenericTypeSubstitutionMap,
} from '../../utils/genericTypeSubstitution';
import {
  GlobalTypeRegistry,
  GlobalTypeRegistryLive,
} from '../../services/GlobalTypeRegistryService';
import {
  findChainMemberAtPosition as findChainMember,
  isPositionOnFirstNode as posOnFirstNode,
} from './positionUtils';
import {
  extractQualifierFromChain as extractQualFromChainOp,
  isValidNamespace as isValidNsOp,
  findSymbolsInNamespace as findSymsInNsOp,
  resolveUnqualifiedReferenceByScope as resolveUnqualRefByScopeOp,
  resolvePreferredTypeSymbolForLookup as resolvePreferredTypeOp,
  isSymbolAccessibleFromFile as isSymAccessibleOp,
  selectMostSpecificSymbol as selectMostSpecificOp,
} from './symbolRefResolution';
import type {
  ChainResolutionContext,
  SymbolManagerOps,
} from '../services/symbolResolver';

// ---------------------------------------------------------------------------
// resolveChainedSymbolReference
// ---------------------------------------------------------------------------

export async function resolveChainedSymbolReference(
  self: SymbolManagerOps,
  typeReference: SymbolReference,
  position?: { line: number; character: number },
  fileUri?: string,
): Promise<ApexSymbol | null> {
  // Fast path: if already resolved by listener second-pass, use the ID directly
  // BUT: Skip fast path when position is on any chain member
  // This ensures we resolve the correct chain member (e.g., "numbers" or "size" in "numbers.size()")
  if (typeReference.resolvedSymbolId) {
    // Check if this is a chained reference and position is on a chain member
    let shouldSkipFastPath = false;
    if (position && isChainedSymbolReference(typeReference)) {
      const chainMember = findChainMember(typeReference, position);
      // Skip fast path if position is on any chain member (first node = variable, later = method)
      if (chainMember) {
        shouldSkipFastPath = true;
      }
    }

    if (!shouldSkipFastPath) {
      const resolvedSymbol = await self.getSymbol(
        typeReference.resolvedSymbolId,
      );
      if (resolvedSymbol) {
        self.logger.debug(
          () =>
            `Using pre-resolved symbol ID "${typeReference.resolvedSymbolId}" ` +
            `for chained reference "${typeReference.name}"`,
        );
        return resolvedSymbol;
      }
      // If symbol not found, fall through to normal resolution
    }
  }

  if (isChainedSymbolReference(typeReference)) {
    let resolvedContext: ChainResolutionContext | null = null;
    try {
      const chainNodes = typeReference.chainNodes;

      if (!chainNodes?.length) {
        self.logger.warn(
          () => 'Chained expression reference missing chainNodes property',
        );
        return null;
      }

      // If position is provided, try to resolve the specific chain member first
      // This handles cases where resolveEntireChain might fail (e.g., 'this.method()' chains)
      if (position) {
        const firstNode = chainNodes[0];

        // Check if position is on the first node (at start, within, or at chained ref start)
        if (posOnFirstNode(typeReference, firstNode, position)) {
          // Fast path: if first node already has resolvedSymbolId, use it directly
          if (firstNode.resolvedSymbolId) {
            const resolvedSymbol = await self.getSymbol(
              firstNode.resolvedSymbolId,
            );
            if (resolvedSymbol) {
              self.logger.debug(
                () =>
                  'Using pre-resolved symbol ID ' +
                  `"${firstNode.resolvedSymbolId}" for first node "${firstNode.name}"`,
              );
              return resolvedSymbol;
            }
          }

          // Special handling for method calls in 'this' chains
          // For 'this.method().anotherMethod()', the first node is a method call,
          // not a class, so we should resolve it as a method in the current class
          if (firstNode.context === ReferenceContext.METHOD_CALL && fileUri) {
            // Try to resolve as a method in the current class
            const symbolTable =
              self.symbolRefManager.getSymbolTableForFile(fileUri);
            if (symbolTable) {
              const allSymbols = symbolTable.getAllSymbols();
              const methodSymbols = allSymbols.filter(
                (s) =>
                  s.kind === SymbolKind.Method && s.name === firstNode.name,
              );
              if (methodSymbols.length > 0) {
                // Prefer non-static methods for 'this.method()' chains
                const instanceMethod = methodSymbols.find(
                  (s) => !s.modifiers?.isStatic,
                );
                if (instanceMethod) {
                  return instanceMethod;
                }
                // Fall back to any method if no instance method found
                return methodSymbols[0];
              }
            }
          }

          const firstNodeSymbol = await resolveFirstNodeAsClass(
            self,
            firstNode.name,
            true,
          );
          if (firstNodeSymbol) {
            return firstNodeSymbol;
          }
          // If first node resolution failed, fall through to chain member resolution
        }

        // Find the chain member at the position
        const chainMember = findChainMember(typeReference, position);

        // If position matches a specific chain member (not the first node), resolve that member
        if (chainMember && chainMember.index > 0) {
          // Position is on a method/field call in the chain (e.g., "size" in "numbers.size()")
          // Resolve the specific chain member, not the whole chain
          if (chainMember.member.resolvedSymbolId) {
            const resolvedSymbol = await self.getSymbol(
              chainMember.member.resolvedSymbolId,
            );
            if (resolvedSymbol) {
              self.logger.debug(
                () =>
                  `Resolved chain member "${chainMember.member.name}" at index ${chainMember.index}`,
              );
              return resolvedSymbol;
            }
          }
          // If chain member not pre-resolved, it will be handled by the code below
          // that resolves the entire chain and then finds the chain member at the position
        }

        if (chainMember && chainMember.index === 0) {
          // We already tried resolving the first node above, but if it failed,
          // try one more time here with the chain member context
          const firstNode = chainNodes[0];
          if (firstNode.context === ReferenceContext.METHOD_CALL && fileUri) {
            const symbolTable =
              self.symbolRefManager.getSymbolTableForFile(fileUri);
            if (symbolTable) {
              const allSymbols = symbolTable.getAllSymbols();
              const methodSymbols = allSymbols.filter(
                (s) =>
                  s.kind === SymbolKind.Method && s.name === firstNode.name,
              );
              if (methodSymbols.length > 0) {
                const instanceMethod = methodSymbols.find(
                  (s) => !s.modifiers?.isStatic,
                );
                if (instanceMethod) {
                  return instanceMethod;
                }
                return methodSymbols[0];
              }
            }
          }
        }
      }

      // Resolve the entire chain
      // Note: For 'this.method()' chains, resolveEntireChain might return null
      // if the first method call can't be resolved through normal chain resolution.
      // We handle this case above by resolving the first node directly.
      const resolvedChain = await resolveEntireChain(self, chainNodes, fileUri);

      self.logger.debug(
        () =>
          `resolveEntireChain for "${typeReference.name}" returned: ${
            resolvedChain
              ? `chain with ${resolvedChain.length} members`
              : 'null'
          }`,
      );
      if (resolvedChain) {
        resolvedChain.forEach((ctx, idx) => {
          if (ctx) {
            const name =
              ctx.type === 'symbol'
                ? ctx.symbol?.name || 'N/A'
                : ctx.type === 'namespace'
                  ? ctx.name
                  : 'N/A';
            self.logger.debug(
              () => `  Chain member ${idx}: type=${ctx.type}, name=${name}`,
            );
          }
        });
      }

      // If position is provided, find the specific chain member and return its resolved symbol
      if (position) {
        // Find the chain member at the position (if not already found above)
        const chainMember = findChainMember(typeReference, position);

        self.logger.debug(
          () =>
            `Chain member at position ${position.line}:${position.character}: ${
              chainMember
                ? `index=${chainMember.index}, name=${chainMember.member.name}`
                : 'null'
            }`,
        );

        if (chainMember) {
          // If position is on the first node, we already tried resolving it above
          // Skip to resolving other chain members
          if (chainMember.index === 0) {
            // We already handled the first node above, but if it failed,
            // try one more time here
            const firstNode = chainNodes[0];
            if (firstNode.context === ReferenceContext.METHOD_CALL && fileUri) {
              const symbolTable =
                self.symbolRefManager.getSymbolTableForFile(fileUri);
              if (symbolTable) {
                const allSymbols = symbolTable.getAllSymbols();
                const methodSymbols = allSymbols.filter(
                  (s) =>
                    s.kind === SymbolKind.Method && s.name === firstNode.name,
                );
                if (methodSymbols.length > 0) {
                  const instanceMethod = methodSymbols.find(
                    (s) => !s.modifiers?.isStatic,
                  );
                  if (instanceMethod) {
                    return instanceMethod;
                  }
                  return methodSymbols[0];
                }
              }
            }
            // If we get here, first node resolution failed - try class resolution
            const firstNodeSymbol = await resolveFirstNodeAsClass(
              self,
              chainNodes[0].name,
              false,
            );
            if (firstNodeSymbol) {
              return firstNodeSymbol;
            }
          }

          // Resolve the chain member from the resolved chain context
          // Only use resolvedChain if it exists and has the member at this index
          if (resolvedChain && resolvedChain.length > chainMember.index) {
            resolvedContext = resolvedChain[chainMember.index];
            if (resolvedContext?.type === 'symbol') {
              return resolvedContext.symbol || null;
            }
          }

          // If the resolved context is not a symbol (e.g., namespace or global), and we're on the first node,
          // try to resolve the qualifier as a class symbol
          if (
            chainMember.index === 0 &&
            resolvedContext &&
            (resolvedContext.type === 'namespace' ||
              resolvedContext.type === 'global')
          ) {
            const qualifierName = chainNodes[0].name;
            const qualifierSymbols = await self.findSymbolByName(qualifierName);

            // Filter for class symbols
            const classSymbols = qualifierSymbols.filter(
              (s) =>
                s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
            );

            if (classSymbols.length > 0) {
              // Prefer standard Apex classes for qualified references
              const standardClass = classSymbols.find(
                (s) =>
                  s.fileUri?.includes('apexlib://') ||
                  s.fileUri?.includes('StandardApexLibrary'),
              );
              return standardClass || classSymbols[0];
            }

            // If no class found, try standard Apex class resolution
            const standardClass =
              await self.resolveStandardApexClass(qualifierName);
            if (standardClass) {
              return standardClass;
            }
          }
        }
      }

      // Return the final resolved symbol (last in the chain)
      // Only if resolvedChain exists
      if (resolvedChain && resolvedChain.length > 0) {
        resolvedContext = resolvedChain[resolvedChain.length - 1];
        return resolvedContext?.type === 'symbol'
          ? resolvedContext.symbol
          : null;
      }

      // If resolvedChain is null and we have a position, we might have already
      // resolved the first node above, so return null here
      return null;
    } catch (error) {
      self.logger.error(
        () => `Error resolving chained expression reference: ${error}`,
      );
      return null;
    }
  } else {
    return null;
  }
}

// ---------------------------------------------------------------------------
// resolveEntireChain
// ---------------------------------------------------------------------------

export async function resolveEntireChain(
  self: SymbolManagerOps,
  chainNodes: SymbolReference[],
  fileUri?: string,
): Promise<ChainResolutionContext[] | null> {
  if (!chainNodes?.length) {
    return null;
  }

  // Find all possible resolution paths
  const resolutionPaths = await findAllPossibleResolutionPaths(
    self,
    chainNodes,
    fileUri,
  );

  if (resolutionPaths.length === 0) {
    self.logger.debug(
      () =>
        `No resolution paths found for chain: ${chainNodes.map((n) => n.name).join('.')} ` +
        `(fileUri: ${fileUri})`,
    );
    return null;
  }

  if (resolutionPaths.length === 1) {
    return resolutionPaths[0];
  }

  // Multiple valid paths - need to disambiguate
  const bestPath = disambiguateResolutionPaths(
    self,
    resolutionPaths,
    chainNodes,
  );

  return bestPath;
}

// ---------------------------------------------------------------------------
// findAllPossibleResolutionPaths
// ---------------------------------------------------------------------------

export async function findAllPossibleResolutionPaths(
  self: SymbolManagerOps,
  chainNodes: SymbolReference[],
  fileUri?: string,
): Promise<ChainResolutionContext[][]> {
  const paths: ChainResolutionContext[][] = [];
  const pathStack = new Stack<ChainResolutionContext>();

  await exploreResolutionPaths(
    self,
    chainNodes,
    0,
    undefined,
    pathStack,
    paths,
    fileUri,
  );

  paths.forEach((_path, _index) => {
    // Debug logging removed for performance
  });

  return paths;
}

// ---------------------------------------------------------------------------
// exploreResolutionPaths
// ---------------------------------------------------------------------------

export async function exploreResolutionPaths(
  self: SymbolManagerOps,
  chainNodes: SymbolReference[],
  stepIndex: number,
  currentContext: ChainResolutionContext,
  pathStack: Stack<ChainResolutionContext>,
  allPaths: ChainResolutionContext[][],
  fileUri?: string,
): Promise<void> {
  if (stepIndex >= chainNodes.length) {
    // Complete path found - add to results
    const completePath = pathStack.toArray();
    allPaths.push(completePath);
    return;
  }

  const step = chainNodes[stepIndex];
  const nextStep =
    stepIndex + 1 < chainNodes.length ? chainNodes[stepIndex + 1] : undefined;

  // Get ALL possible resolutions for this step
  const possibleResolutions = await getAllPossibleResolutions(
    self,
    step,
    currentContext,
    nextStep,
    fileUri,
  );

  if (possibleResolutions.length === 0 && stepIndex === 0) {
    self.logger.debug(
      () =>
        `No resolutions found for first step "${step.name}" ` +
        `(context: ${ReferenceContext[step.context] || step.context}, ` +
        `fileUri: ${fileUri})`,
    );
  }

  for (const resolution of possibleResolutions) {
    pathStack.push(resolution);
    await exploreResolutionPaths(
      self,
      chainNodes,
      stepIndex + 1,
      resolution,
      pathStack,
      allPaths,
      fileUri,
    );
    pathStack.pop(); // Backtrack
  }
}

// ---------------------------------------------------------------------------
// getAllPossibleResolutions
// ---------------------------------------------------------------------------

export async function getAllPossibleResolutions(
  self: SymbolManagerOps,
  step: SymbolReference,
  currentContext: ChainResolutionContext,
  nextStep?: SymbolReference,
  fileUri?: string,
): Promise<ChainResolutionContext[]> {
  const resolutions: ChainResolutionContext[] = [];
  const stepName = step.name;

  // Strategy 1: Try namespace resolution
  if (canResolveAsNamespace(step, currentContext)) {
    if (await isValidNsOp(self, stepName)) {
      const namespaceContext: ChainResolutionContext = {
        type: 'namespace',
        name: stepName,
      };
      resolutions.push(namespaceContext);
    }
  }

  // Strategy 1.5: Try variable resolution FIRST when there's no current context
  // This is important for chained calls like "base64Data.toString()"
  // We prioritize variables over classes when resolving the first step of a chain
  if (
    !currentContext &&
    (step.context === ReferenceContext.VARIABLE_USAGE ||
      step.context === ReferenceContext.CHAIN_STEP ||
      step.context === ReferenceContext.CLASS_REFERENCE)
  ) {
    let variableSymbol: ApexSymbol | undefined;

    // Fast path: if the step has a resolvedSymbolId, use it directly
    if (step.resolvedSymbolId) {
      const resolvedSymbol = await self.getSymbol(step.resolvedSymbolId);
      if (
        resolvedSymbol &&
        (resolvedSymbol.kind === 'variable' ||
          resolvedSymbol.kind === 'field' ||
          resolvedSymbol.kind === 'parameter' ||
          resolvedSymbol.kind === 'property')
      ) {
        variableSymbol = resolvedSymbol;
      }
    }

    // If still not found and we have fileUri, try scope-based lookup for local variables FIRST
    // (before global lookup, as local variables take precedence)
    if (!variableSymbol && fileUri && step.location) {
      const position = {
        line:
          step.location.identifierRange?.startLine ??
          step.location.symbolRange.startLine,
        character:
          step.location.identifierRange?.startColumn ??
          step.location.symbolRange.startColumn,
      };
      const scopeBasedSymbol = resolveUnqualRefByScopeOp(
        self,
        step,
        fileUri,
        position,
      );
      if (
        scopeBasedSymbol &&
        (scopeBasedSymbol.kind === 'variable' ||
          scopeBasedSymbol.kind === 'parameter' ||
          scopeBasedSymbol.kind === 'field' ||
          scopeBasedSymbol.kind === 'property')
      ) {
        variableSymbol = scopeBasedSymbol;
      }
    }

    // If not found via resolvedSymbolId or scope, try global lookup (works for fields and global variables)
    if (!variableSymbol) {
      const variableSymbols = await self.findSymbolByName(stepName);
      variableSymbol = variableSymbols.find(
        (s) =>
          s.kind === 'variable' ||
          s.kind === 'field' ||
          s.kind === 'parameter' ||
          s.kind === 'property',
      );
    }

    if (variableSymbol) {
      resolutions.push({ type: 'symbol', symbol: variableSymbol });
    }
  }

  // Strategy 1.6: Try method resolution in current class when there's no current context
  // This handles 'this.method()' chains where the first node is a method call
  // and should resolve to a method in the current class
  if (
    !currentContext &&
    step.context === ReferenceContext.METHOD_CALL &&
    fileUri &&
    step.location
  ) {
    // Try to find the method in the current class using scope-based resolution
    const position = {
      line:
        step.location.identifierRange?.startLine ??
        step.location.symbolRange.startLine,
      character:
        step.location.identifierRange?.startColumn ??
        step.location.symbolRange.startColumn,
    };
    const scopeBasedSymbol = resolveUnqualRefByScopeOp(
      self,
      step,
      fileUri,
      position,
    );
    if (
      scopeBasedSymbol &&
      scopeBasedSymbol.kind === SymbolKind.Method &&
      scopeBasedSymbol.name === stepName
    ) {
      resolutions.push({ type: 'symbol', symbol: scopeBasedSymbol });
    } else {
      // Fallback: Try to find the method in the current class via symbol table
      const symbolTable = self.symbolRefManager.getSymbolTableForFile(fileUri);
      if (symbolTable) {
        const allSymbols = symbolTable.getAllSymbols();
        // Find methods in the current class that match the step name
        const methodSymbols = allSymbols.filter(
          (s) => s.kind === SymbolKind.Method && s.name === stepName,
        );
        if (methodSymbols.length > 0) {
          // Prefer non-static methods for 'this.method()' chains
          const instanceMethod = methodSymbols.find(
            (s) => !s.modifiers?.isStatic,
          );
          if (instanceMethod) {
            resolutions.push({ type: 'symbol', symbol: instanceMethod });
          } else {
            // Fall back to any method if no instance method found
            resolutions.push({ type: 'symbol', symbol: methodSymbols[0] });
          }
        }
      }
    }
  }

  // Strategy 2: Try class resolution
  const classSymbol = await tryResolveAsClass(
    self,
    stepName,
    currentContext,
    step.context,
  );
  if (classSymbol) {
    resolutions.push({ type: 'symbol', symbol: classSymbol });
  }

  // Strategy 2.5: Try instance resolution (for variables that are treated as class references)
  // This works both when currentContext is defined (for nested chains) and undefined (for first step)
  // Skip this strategy if the step context indicates a method call - methods should be resolved
  // via tryResolveAsMember, not as instance properties
  if (step.context !== ReferenceContext.METHOD_CALL) {
    const instanceSymbol = await tryResolveAsInstance(
      self,
      stepName,
      currentContext,
    );
    if (instanceSymbol) {
      resolutions.push({ type: 'symbol', symbol: instanceSymbol });
    }
  }

  // Strategy 3: Try property/method resolution
  const memberSymbol = await tryResolveAsMember(
    self,
    step,
    currentContext,
    nextStep,
  );
  if (memberSymbol) {
    resolutions.push({ type: 'symbol', symbol: memberSymbol });
  }

  // Strategy 4: Try built-in type resolution
  const builtInSymbol = await self.resolveStandardLibraryType(step);
  if (builtInSymbol) {
    resolutions.push({ type: 'symbol', symbol: builtInSymbol });
  }

  // Strategy 5: Try VARIABLE_USAGE/CHAIN_STEP/CLASS_REFERENCE resolution (for variables, fields, parameters)
  // This is important for chained calls like "base64Data.toString()"
  // When there's no current context and the step could be a variable, try to resolve it
  // Note: CLASS_REFERENCE context is sometimes used for variables in chain nodes
  if (
    !currentContext &&
    (step.context === ReferenceContext.VARIABLE_USAGE ||
      step.context === ReferenceContext.CHAIN_STEP ||
      step.context === ReferenceContext.CLASS_REFERENCE)
  ) {
    // First try global lookup (works for fields and global variables)
    const variableSymbols = await self.findSymbolByName(stepName);
    let variableSymbol = variableSymbols.find(
      (s) =>
        s.kind === 'variable' ||
        s.kind === 'field' ||
        s.kind === 'parameter' ||
        s.kind === 'property',
    );

    // If not found and we have fileUri, try scope-based lookup for local variables
    if (!variableSymbol && fileUri && step.location) {
      const position = {
        line: step.location.symbolRange.startLine,
        character: step.location.symbolRange.startColumn,
      };
      const scopeBasedSymbol = resolveUnqualRefByScopeOp(
        self,
        step,
        fileUri,
        position,
      );
      if (
        scopeBasedSymbol &&
        (scopeBasedSymbol.kind === 'variable' ||
          scopeBasedSymbol.kind === 'parameter' ||
          scopeBasedSymbol.kind === 'field' ||
          scopeBasedSymbol.kind === 'property')
      ) {
        variableSymbol = scopeBasedSymbol;
      }
    }

    if (variableSymbol) {
      resolutions.push({ type: 'symbol', symbol: variableSymbol });
    }
  }

  // Strategy 6: Try global symbol resolution
  const globalSymbols = await self.findSymbolByName(stepName);
  const matchingGlobalSymbol = globalSymbols.find(
    (s) => s.kind === 'class' || s.kind === 'property' || s.kind === 'method',
  );
  if (matchingGlobalSymbol) {
    resolutions.push({ type: 'symbol', symbol: matchingGlobalSymbol });
  }

  // Strategy 6.5: Final fallback for method calls in current class when no context
  // This handles 'this.method()' chains where other strategies failed
  if (
    !currentContext &&
    step.context === ReferenceContext.METHOD_CALL &&
    fileUri &&
    resolutions.length === 0
  ) {
    // Try to find the method in the current class via symbol table
    const symbolTable = self.symbolRefManager.getSymbolTableForFile(fileUri);
    if (symbolTable) {
      const allSymbols = symbolTable.getAllSymbols();
      // Find methods in the current class that match the step name
      const methodSymbols = allSymbols.filter(
        (s) => s.kind === SymbolKind.Method && s.name === stepName,
      );
      if (methodSymbols.length > 0) {
        // Prefer non-static methods for 'this.method()' chains
        const instanceMethod = methodSymbols.find(
          (s) => !s.modifiers?.isStatic,
        );
        if (instanceMethod) {
          resolutions.push({ type: 'symbol', symbol: instanceMethod });
        } else {
          // Fall back to any method if no instance method found
          resolutions.push({ type: 'symbol', symbol: methodSymbols[0] });
        }
      }
    }
  }

  // Strategy 7: Try standard Apex class resolution (for cases like URL without namespace)
  if (
    currentContext?.type === 'namespace' &&
    step.context !== ReferenceContext.METHOD_CALL &&
    step.context !== ReferenceContext.FIELD_ACCESS &&
    step.context !== ReferenceContext.VARIABLE_USAGE
  ) {
    const fqn = `${currentContext.name}.${stepName}`;
    const standardClass = await self.resolveStandardApexClass(fqn);
    if (standardClass) {
      resolutions.push({ type: 'symbol', symbol: standardClass });
    }
  }

  return resolutions;
}

// ---------------------------------------------------------------------------
// disambiguateResolutionPaths
// ---------------------------------------------------------------------------

export function disambiguateResolutionPaths(
  self: SymbolManagerOps,
  paths: ChainResolutionContext[][],
  chainNodes: SymbolReference[],
): ChainResolutionContext[] {
  // Strategy 1: Prefer namespace paths over class paths when both exist
  const namespacePaths = paths.filter((path) =>
    path.some((ctx) => ctx && ctx.type === 'namespace'),
  );

  if (namespacePaths.length > 0) {
    return selectBestNamespacePath(namespacePaths, chainNodes);
  }

  // Strategy 2: Prefer most specific resolution (fewer global lookups)
  const mostSpecificPath = paths.reduce((best, current) => {
    const bestSpecificity = getPathSpecificity(best);
    const currentSpecificity = getPathSpecificity(current);

    if (currentSpecificity > bestSpecificity) {
      return current;
    }
    return best;
  });

  // Strategy 3: Use static analysis of the next step if available
  if (chainNodes.length > 1) {
    const nextStep = chainNodes[1];
    const contextAwarePath = choosePathBasedOnNextStep(paths, nextStep);
    if (contextAwarePath) {
      return contextAwarePath;
    }
  }

  // Strategy 4: Prefer paths with method calls over property access
  const methodPaths = paths.filter((path) =>
    path.some(
      (ctx) =>
        ctx &&
        ctx.type === 'symbol' &&
        (ctx.symbol.kind === 'method' || isMethodSymbol(ctx.symbol)),
    ),
  );

  if (methodPaths.length > 0) {
    return methodPaths[0];
  }

  return mostSpecificPath;
}

// ---------------------------------------------------------------------------
// selectBestNamespacePath
// ---------------------------------------------------------------------------

export function selectBestNamespacePath(
  namespacePaths: ChainResolutionContext[][],
  _chainNodes: SymbolReference[],
): ChainResolutionContext[] {
  // Prefer paths where the namespace is used earlier in the chain
  return namespacePaths.reduce((best, current) => {
    const bestNamespaceIndex = getFirstNamespaceIndex(best);
    const currentNamespaceIndex = getFirstNamespaceIndex(current);

    // Prefer earlier namespace usage
    if (currentNamespaceIndex < bestNamespaceIndex) {
      return current;
    }

    // If same position, prefer shorter paths (more direct)
    if (
      currentNamespaceIndex === bestNamespaceIndex &&
      current.length < best.length
    ) {
      return current;
    }

    return best;
  });
}

// ---------------------------------------------------------------------------
// getFirstNamespaceIndex
// ---------------------------------------------------------------------------

export function getFirstNamespaceIndex(path: ChainResolutionContext[]): number {
  return path.findIndex((ctx) => ctx && ctx.type === 'namespace');
}

// ---------------------------------------------------------------------------
// getPathSpecificity
// ---------------------------------------------------------------------------

export function getPathSpecificity(path: ChainResolutionContext[]): number {
  let score = 0;

  for (const ctx of path) {
    if (ctx && ctx.type === 'namespace') {
      score += 10; // Namespace resolution is very specific
    } else if (ctx && ctx.type === 'symbol') {
      const symbol = ctx.symbol;

      // Prefer more specific symbol types
      switch (symbol.kind) {
        case 'method':
          score += 8;
          break;
        case 'property':
          score += 6;
          break;
        case 'class':
          score += 4;
          break;
        default:
          score += 2;
      }

      // Bonus for static symbols
      if ((symbol as any).isStatic) {
        score += 1;
      }
    }
  }

  return score;
}

// ---------------------------------------------------------------------------
// choosePathBasedOnNextStep
// ---------------------------------------------------------------------------

export function choosePathBasedOnNextStep(
  paths: ChainResolutionContext[][],
  nextStep: SymbolReference,
): ChainResolutionContext[] | null {
  const nextStepContext = nextStep.context;

  // If next step is a method call, prefer paths that can resolve to a class
  if (nextStepContext === ReferenceContext.METHOD_CALL) {
    const classPaths = paths.filter((path) => {
      const lastContext = path[path.length - 1];
      return (
        lastContext?.type === 'symbol' &&
        (lastContext.symbol.kind === 'class' ||
          isClassSymbol(lastContext.symbol))
      );
    });

    if (classPaths.length > 0) {
      return classPaths[0];
    }
  }

  // If next step is field access, prefer paths that can resolve to an instance
  if (nextStepContext === ReferenceContext.FIELD_ACCESS) {
    const instancePaths = paths.filter((path) => {
      const lastContext = path[path.length - 1];
      return (
        lastContext?.type === 'symbol' &&
        (lastContext.symbol.kind === 'property' ||
          lastContext.symbol.kind === 'class' ||
          isInstanceSymbol(lastContext.symbol))
      );
    });

    if (instancePaths.length > 0) {
      return instancePaths[0];
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// isMethodSymbol / isClassSymbol / isInstanceSymbol
// ---------------------------------------------------------------------------

export function isMethodSymbol(symbol: ApexSymbol): boolean {
  return (
    symbol.kind === 'method' ||
    (symbol.kind === 'property' && symbol.name?.includes('()'))
  );
}

export function isClassSymbol(symbol: ApexSymbol): boolean {
  return (
    symbol.kind === 'class' ||
    symbol.kind === 'interface' ||
    symbol.kind === 'enum'
  );
}

export function isInstanceSymbol(symbol: ApexSymbol): boolean {
  return (
    !(symbol as any).isStatic &&
    (symbol.kind === 'property' || symbol.kind === 'method')
  );
}

// ---------------------------------------------------------------------------
// resolveFirstNodeAsClass
// ---------------------------------------------------------------------------

export async function resolveFirstNodeAsClass(
  self: SymbolManagerOps,
  firstNodeName: string,
  includeRetry: boolean = true,
): Promise<ApexSymbol | null> {
  // Try standard Apex class resolution first (for System, Database, etc.)
  // If it's a standard namespace, try both "Namespace" and "Namespace.Namespace"
  let standardClass = await self.resolveStandardApexClass(firstNodeName);
  if (!standardClass && self.stdlibProvider.isStdApexNamespace(firstNodeName)) {
    // Try resolving as "Namespace.Namespace" (e.g., "System.System")
    standardClass = await self.resolveStandardApexClass(
      `${firstNodeName}.${firstNodeName}`,
    );
  }
  if (standardClass) {
    self.logger.debug(
      () =>
        `Resolved first node "${firstNodeName}" as standard class: ${standardClass?.name}`,
    );
    return standardClass;
  }

  // Try built-in type resolution
  // Create a minimal SymbolReference from the string name
  // Since resolveStandardLibraryType only uses typeRef.name, we can use dummy ranges
  const dummyLocation: SymbolLocation = {
    symbolRange: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
    identifierRange: {
      startLine: 0,
      startColumn: 0,
      endLine: 0,
      endColumn: 0,
    },
  };
  const typeRef: SymbolReference = new EnhancedSymbolReference(
    firstNodeName,
    dummyLocation,
    ReferenceContext.CLASS_REFERENCE,
    undefined, // resolvedSymbolId - will be set during second-pass resolution
  );
  const builtInSymbol = await self.resolveStandardLibraryType(typeRef);
  if (builtInSymbol) {
    self.logger.debug(
      () =>
        `Resolved first node "${firstNodeName}" as built-in type: ${builtInSymbol.name}`,
    );
    return builtInSymbol;
  }

  // Try finding by name (prefer class symbols)
  const qualifierSymbols = await self.findSymbolByName(firstNodeName);
  const classSymbols = qualifierSymbols.filter(
    (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
  );
  if (classSymbols.length > 0) {
    // Prefer standard Apex classes
    const stdClass = classSymbols.find(
      (s) =>
        s.fileUri?.includes('apexlib://') ||
        s.fileUri?.includes('StandardApexLibrary'),
    );
    if (stdClass) {
      self.logger.debug(
        () =>
          `Resolved first node "${firstNodeName}" from name lookup as standard class: ${stdClass.name}`,
      );
      return stdClass;
    }
    return classSymbols[0];
  }

  // If no class found but it's a standard namespace, try to resolve the namespace class
  // Some namespaces have a class with the same name (e.g., System.System)
  if (self.stdlibProvider.isStdApexNamespace(firstNodeName)) {
    // Try resolving as "Namespace.Namespace" (e.g., "System.System")
    const namespaceClass = await self.resolveStandardApexClass(
      `${firstNodeName}.${firstNodeName}`,
    );
    if (namespaceClass) {
      self.logger.debug(
        () =>
          `Resolved first node "${firstNodeName}" as namespace class: ${namespaceClass.name}`,
      );
      return namespaceClass;
    }

    // If namespace class resolution failed, try finding by name with namespace prefix
    const namespaceQualifierSymbols = await self.findSymbolByName(
      `${firstNodeName}.${firstNodeName}`,
    );
    const namespaceClassSymbols = namespaceQualifierSymbols.filter(
      (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
    );
    if (namespaceClassSymbols.length > 0) {
      const nsStdClass = namespaceClassSymbols.find(
        (s) =>
          s.fileUri?.includes('apexlib://') ||
          s.fileUri?.includes('StandardApexLibrary'),
      );
      if (nsStdClass) {
        self.logger.debug(
          () =>
            `Resolved first node "${firstNodeName}" as namespace class from name lookup: ${nsStdClass.name}`,
        );
        return nsStdClass;
      }
      return namespaceClassSymbols[0];
    }
  }

  // If we couldn't resolve the first node, try one more time with findSymbolByName
  // after potential async loading. This handles cases where resolveStandardApexClass
  // triggered async loading but the symbol wasn't immediately available
  if (includeRetry) {
    const retrySymbols = await self.findSymbolByName(firstNodeName);
    const retryClassSymbols = retrySymbols.filter(
      (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
    );
    if (retryClassSymbols.length > 0) {
      const retryStdClass = retryClassSymbols.find(
        (s) =>
          s.fileUri?.includes('apexlib://') ||
          s.fileUri?.includes('StandardApexLibrary'),
      );
      if (retryStdClass) {
        self.logger.debug(
          () =>
            `Resolved first node "${firstNodeName}" from retry name lookup as standard class: ${retryStdClass.name}`,
        );
        return retryStdClass;
      }
      return retryClassSymbols[0];
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// tryResolveAsInstance
// ---------------------------------------------------------------------------

export async function tryResolveAsInstance(
  self: SymbolManagerOps,
  stepName: string,
  currentContext: ChainResolutionContext | undefined,
): Promise<ApexSymbol | null> {
  // If we have a current context, try to find as a property in that context
  // BUT: Don't try property resolution if the context is a Class/Interface/Enum
  // (those should use tryResolveAsMember instead, which handles methods properly)
  if (
    currentContext &&
    currentContext.type === 'symbol' &&
    currentContext.symbol.kind !== SymbolKind.Class &&
    currentContext.symbol.kind !== SymbolKind.Interface &&
    currentContext.symbol.kind !== SymbolKind.Enum
  ) {
    const propertySymbol = await self.resolveMemberInContext(
      currentContext,
      stepName,
      'property',
    );
    if (propertySymbol) {
      return propertySymbol;
    }
  }

  // Try to find as a global variable (works when currentContext is undefined or property lookup failed)
  const globalSymbols = await self.findSymbolByName(stepName);
  const globalVariableSymbol = globalSymbols.find(
    (s) => s.kind === 'variable' || s.kind === 'field' || s.kind === 'property',
  );
  if (globalVariableSymbol) {
    return globalVariableSymbol;
  }

  return null;
}

// ---------------------------------------------------------------------------
// tryResolveAsClass
// ---------------------------------------------------------------------------

export async function tryResolveAsClass(
  self: SymbolManagerOps,
  stepName: string,
  currentContext: ChainResolutionContext,
  stepContext?: ReferenceContext,
): Promise<ApexSymbol | null> {
  if (
    stepContext === ReferenceContext.METHOD_CALL ||
    stepContext === ReferenceContext.FIELD_ACCESS ||
    stepContext === ReferenceContext.VARIABLE_USAGE
  ) {
    return null;
  }

  if (currentContext?.type === 'namespace') {
    // Look for class in the namespace
    const namespaceSymbols = await findSymsInNsOp(self, currentContext.name);

    let classSymbol = namespaceSymbols.find(
      (s) => s.name === stepName && s.kind === 'class',
    );

    // If not found in loaded symbols, try to resolve as standard Apex class
    if (!classSymbol) {
      const fqn = `${currentContext.name}.${stepName}`;

      classSymbol = (await self.resolveStandardApexClass(fqn)) || undefined;
    }

    return classSymbol || null;
  }

  if (currentContext?.type === 'symbol') {
    // Look for nested class in the current symbol
    const nestedClasses = await findSymsInNsOp(
      self,
      currentContext.symbol.name,
    );
    return (
      nestedClasses.find((s) => s.name === stepName && s.kind === 'class') ||
      null
    );
  }

  // Look in global scope
  const globalSymbols = await self.findSymbolByName(stepName);
  let classSymbol = globalSymbols.find((s) => s.kind === 'class');

  // If not found in global symbols, try to resolve as standard Apex class
  if (!classSymbol) {
    classSymbol = (await self.resolveStandardApexClass(stepName)) || undefined;
  }

  return classSymbol || null;
}

// ---------------------------------------------------------------------------
// tryResolveAsMember
// ---------------------------------------------------------------------------

export async function tryResolveAsMember(
  self: SymbolManagerOps,
  step: SymbolReference,
  currentContext: ChainResolutionContext,
  _nextStep?: SymbolReference,
): Promise<ApexSymbol | null> {
  if (!currentContext || currentContext.type !== 'symbol') {
    return null;
  }

  const stepName = step.name;
  const stepContext = step.context;

  // Try as method if context suggests it
  if (stepContext === ReferenceContext.METHOD_CALL) {
    const methodSymbol = await self.resolveMemberInContext(
      currentContext,
      stepName,
      'method',
    );
    if (methodSymbol) {
      return methodSymbol;
    }
  }

  // Try as property if context suggests it
  if (stepContext === ReferenceContext.FIELD_ACCESS) {
    const propertySymbol = await self.resolveMemberInContext(
      currentContext,
      stepName,
      'property',
    );
    if (propertySymbol) {
      return propertySymbol;
    }
  }

  // Try both if context is ambiguous
  if (stepContext === ReferenceContext.CHAIN_STEP) {
    const methodSymbol = await self.resolveMemberInContext(
      currentContext,
      stepName,
      'method',
    );
    if (methodSymbol) {
      return methodSymbol;
    }

    const propertySymbol = await self.resolveMemberInContext(
      currentContext,
      stepName,
      'property',
    );
    if (propertySymbol) {
      return propertySymbol;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// canResolveAsNamespace
// ---------------------------------------------------------------------------

export function canResolveAsNamespace(
  step: SymbolReference,
  currentContext: ChainResolutionContext,
): boolean {
  // Can resolve as namespace if:
  // 1. It's explicitly marked as NAMESPACE context
  // 2. It's a CHAIN_STEP that could be a namespace
  // 3. It's in a global context (no current context)
  return (
    step.context === ReferenceContext.NAMESPACE ||
    step.context === ReferenceContext.CHAIN_STEP ||
    !currentContext
  );
}

// ---------------------------------------------------------------------------
// ResolverStats (local to this module, mirrors the ASM-internal interface)
// ---------------------------------------------------------------------------

interface ResolverStats {
  resolverCalls: number;
  resolverQualifiedCalls: number;
  resolverQualifiedMs: number;
  resolverScopeHierarchyMs: number;
  resolverScopeSearchMs: number;
  resolverDirectLookupMs: number;
  resolverBuiltInMs: number;
  resolverPreResolvedHits: number;
  resolverQualifiedThisCalls: number;
  resolverQualifiedThisLookupMs: number;
  resolverQualifiedGlobalLookupMs: number;
  resolverQualifiedResolveMemberMs: number;
  resolverQualifiedStandardClassMs: number;
  resolverQualifiedCacheHits: number;
  resolverQualifiedCacheMisses: number;
  resolverQualifiedTypeContextPromotions: number;
  resolverMemberContextCacheHits: number;
  resolverMemberContextCacheMisses: number;
}

// ---------------------------------------------------------------------------
// convertToStandardLibraryUri (private helper)
// ---------------------------------------------------------------------------

function convertToStandardLibraryUri(
  self: SymbolManagerOps,
  classPath: string,
): string {
  if (
    !classPath.includes('://') &&
    classPath.includes('/') &&
    classPath.endsWith('.cls')
  ) {
    const namespace = classPath.split('/')[0];
    if (self.stdlibProvider.isStdApexNamespace(namespace)) {
      return `${STANDARD_APEX_LIBRARY_URI}/${classPath}`;
    }
  }
  return classPath;
}

// ---------------------------------------------------------------------------
// evolveContextAfterResolution
// ---------------------------------------------------------------------------

export function evolveContextAfterResolution(
  _self: SymbolManagerOps,
  step: any,
  newContext: string,
  _resolutionStrategy: string,
): void {
  try {
    let newReferenceContext: ReferenceContext;
    switch (newContext) {
      case 'NAMESPACE':
        newReferenceContext = ReferenceContext.NAMESPACE;
        break;
      case 'CLASS_REFERENCE':
        newReferenceContext = ReferenceContext.CLASS_REFERENCE;
        break;
      case 'METHOD_CALL':
        newReferenceContext = ReferenceContext.METHOD_CALL;
        break;
      case 'FIELD_ACCESS':
        newReferenceContext = ReferenceContext.FIELD_ACCESS;
        break;
      default:
        return;
    }

    step.context = newReferenceContext;
  } catch (_error) {
    // Error evolving context, continue
  }
}

// ---------------------------------------------------------------------------
// selectBestMemberCandidate
// ---------------------------------------------------------------------------

export function selectBestMemberCandidate(
  _self: SymbolManagerOps,
  candidates: ApexSymbol[],
  context: ReferenceContext,
): ApexSymbol | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  if (context === ReferenceContext.METHOD_CALL) {
    const methods = candidates.filter((s) => s.kind === SymbolKind.Method);
    if (methods.length > 0) {
      const nonStatic = methods.find((s) => s.modifiers?.isStatic === false);
      return nonStatic || methods[0];
    }
  }

  if (context === ReferenceContext.FIELD_ACCESS) {
    const fields = candidates.filter(
      (s) => s.kind === SymbolKind.Field || s.kind === SymbolKind.Property,
    );
    if (fields.length > 0) {
      const nonStatic = fields.find((s) => s.modifiers?.isStatic === false);
      return nonStatic || fields[0];
    }
  }

  return candidates[0];
}

// ---------------------------------------------------------------------------
// ensureClassSymbolsLoaded
// ---------------------------------------------------------------------------

export async function ensureClassSymbolsLoaded(
  self: SymbolManagerOps,
  classSymbol: ApexSymbol,
): Promise<void> {
  if (!classSymbol.fileUri?.endsWith('.cls')) {
    return;
  }

  try {
    let classPath = classSymbol.fileUri;
    if (isStandardApexUri(classPath)) {
      classPath = extractApexLibPath(classPath);
    }

    const symbolTable = await self.stdlibProvider.getSymbolTable(classPath);
    if (symbolTable) {
      const fileUri = convertToStandardLibraryUri(self, classPath);
      await self.addSymbolTableAsync(symbolTable, fileUri);
      classSymbol.fileUri = fileUri;
    }
  } catch (_error) {
    // Error loading class symbols, continue
  }
}

// ---------------------------------------------------------------------------
// selectBestQualifier
// ---------------------------------------------------------------------------

export function selectBestQualifier(
  self: SymbolManagerOps,
  candidates: ApexSymbol[],
  sourceFile: string,
): ApexSymbol | null {
  const classLikeCandidates = candidates.filter(
    (symbol) =>
      symbol.kind === SymbolKind.Class &&
      typeof symbol.fileUri === 'string' &&
      symbol.fileUri.endsWith(`/${symbol.name}.cls`),
  );
  if (classLikeCandidates.length > 0) {
    candidates = classLikeCandidates;
  }

  const sameFile = candidates.find((symbol) => symbol.fileUri === sourceFile);
  if (sameFile) return sameFile;

  const accessible = candidates.filter((symbol) =>
    isSymAccessibleOp(symbol, sourceFile),
  );
  if (accessible.length === 1) return accessible[0];
  if (accessible.length > 1) return accessible[0];

  return candidates[0] || null;
}

// ---------------------------------------------------------------------------
// getSymbolById
// ---------------------------------------------------------------------------

export function getSymbolById(
  self: SymbolManagerOps,
  symbolId: string,
): ApexSymbol | null {
  try {
    const allFiles: string[] = Array.from(
      (self.symbolRefManager as any)['fileToSymbolTable']?.keys() || [],
    );

    for (const fileUri of allFiles) {
      const symbolTable = self.symbolRefManager.getSymbolTableForFile(fileUri);
      if (symbolTable) {
        const symbols = symbolTable.getAllSymbols();
        const found = symbols.find((s: ApexSymbol) => s.id === symbolId);
        if (found) {
          return found;
        }
      }
    }

    return null;
  } catch (_error) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// resolveSuperclassSymbol
// ---------------------------------------------------------------------------

export async function resolveSuperclassSymbol(
  self: SymbolManagerOps,
  typeSymbol: TypeSymbol,
): Promise<TypeSymbol | null> {
  if (!typeSymbol.superClass) {
    return null;
  }

  const superclassName = typeSymbol.superClass;

  const superclassSymbols = await self.findSymbolByName(superclassName);
  const superclassTypeSymbol = superclassSymbols.find(
    (s) => s.kind === SymbolKind.Class,
  ) as TypeSymbol | undefined;

  if (superclassTypeSymbol) {
    if (superclassTypeSymbol.fileUri) {
      let symbolTable = self.symbolRefManager.getSymbolTableForFile(
        superclassTypeSymbol.fileUri,
      );

      if (
        !symbolTable &&
        superclassTypeSymbol.fileUri &&
        isStandardApexUri(superclassTypeSymbol.fileUri)
      ) {
        const classPath = extractApexLibPath(superclassTypeSymbol.fileUri);
        if (classPath) {
          try {
            const normalizedUri = extractFilePathFromUri(
              superclassTypeSymbol.fileUri,
            );
            if (!self.loadingSymbolTables.has(normalizedUri)) {
              self.loadingSymbolTables.add(normalizedUri);
              try {
                const loadedSymbolTable =
                  await self.stdlibProvider.getSymbolTable(classPath);
                if (loadedSymbolTable) {
                  await self.addSymbolTableAsync(
                    loadedSymbolTable,
                    superclassTypeSymbol.fileUri,
                  );
                  symbolTable = self.symbolRefManager.getSymbolTableForFile(
                    superclassTypeSymbol.fileUri,
                  );
                }
              } finally {
                self.loadingSymbolTables.delete(normalizedUri);
              }
            }
          } catch (_error) {
            // Error loading, continue
          }
        }
      }
    }

    return superclassTypeSymbol;
  }

  {
    const standardClass = await self.resolveStandardApexClass(superclassName);
    if (standardClass && standardClass.kind === SymbolKind.Class) {
      return standardClass as TypeSymbol;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// resolveObjectClass
// ---------------------------------------------------------------------------

export async function resolveObjectClass(
  self: SymbolManagerOps,
): Promise<TypeSymbol | null> {
  const objectSymbols = await self.findSymbolByName('Object');
  const objectTypeSymbol = objectSymbols.find(
    (s) =>
      s.kind === SymbolKind.Class &&
      (s.fileUri?.includes('StandardApexLibrary') ||
        s.fileUri?.includes('apexlib://') ||
        s.fileUri?.includes('builtins')),
  ) as TypeSymbol | undefined;

  if (objectTypeSymbol) {
    if (objectTypeSymbol.fileUri) {
      let symbolTable = self.symbolRefManager.getSymbolTableForFile(
        objectTypeSymbol.fileUri,
      );

      if (!symbolTable) {
        const classPath = extractApexLibPath(objectTypeSymbol.fileUri);
        if (classPath) {
          try {
            const normalizedUri = extractFilePathFromUri(
              objectTypeSymbol.fileUri,
            );
            if (!self.loadingSymbolTables.has(normalizedUri)) {
              self.loadingSymbolTables.add(normalizedUri);
              try {
                const loadedSymbolTable =
                  await self.stdlibProvider.getSymbolTable(classPath);
                if (loadedSymbolTable) {
                  await self.addSymbolTableAsync(
                    loadedSymbolTable,
                    objectTypeSymbol.fileUri,
                  );
                  symbolTable = self.symbolRefManager.getSymbolTableForFile(
                    objectTypeSymbol.fileUri,
                  );
                }
              } finally {
                self.loadingSymbolTables.delete(normalizedUri);
              }
            }
          } catch (_error) {
            // Error loading, continue
          }
        }
      }
    }

    return objectTypeSymbol;
  }

  {
    let standardClass: ApexSymbol | null =
      await self.resolveStandardApexClass('Object');
    for (const candidate of getImplicitQualifiedCandidates('Object')) {
      if (standardClass) break;
      standardClass = await self.resolveStandardApexClass(candidate);
      if (standardClass) {
        break;
      }
    }

    if (standardClass && standardClass.kind === SymbolKind.Class) {
      return standardClass as TypeSymbol;
    }
  }

  self.logger.warn(
    () => 'Object class not found - inheritance chain traversal may fail',
  );
  return null;
}

// ---------------------------------------------------------------------------
// resolveMemberInContext
// ---------------------------------------------------------------------------

export async function resolveMemberInContext(
  self: SymbolManagerOps,
  context: ChainResolutionContext,
  memberName: string,
  memberType: 'property' | 'method' | 'class',
  typeSubstitutions: GenericTypeSubstitutionMap | null = null,
): Promise<ApexSymbol | null> {
  if (context?.type === 'symbol') {
    const contextSymbol = context.symbol;
    const contextFile = contextSymbol.fileUri;
    if (contextFile) {
      let symbolTable =
        self.symbolRefManager.getSymbolTableForFile(contextFile);
      self.logger.debug(
        () =>
          `resolveMemberInContext: Symbol table for "${contextSymbol.name}": ${symbolTable ? 'found' : 'not found'}`,
      );

      if (!symbolTable) {
        const properUri = createFileUri(contextFile);
        if (properUri !== contextFile) {
          symbolTable = self.symbolRefManager.getSymbolTableForFile(properUri);
        }
      }

      if (!symbolTable && isStandardApexUri(contextFile)) {
        const normalizedUri = extractFilePathFromUri(
          createFileUri(contextFile),
        );

        if (self.loadingSymbolTables.has(normalizedUri)) {
          self.logger.debug(
            () =>
              `Skipping recursive load attempt for ${contextFile} (normalized: ${normalizedUri}) - already loading`,
          );
          symbolTable =
            self.symbolRefManager.getSymbolTableForFile(contextFile);
          if (!symbolTable) {
            return null;
          }
        } else {
          const normalizedUri2 = extractFilePathFromUri(
            createFileUri(contextFile),
          );
          if (self.loadingSymbolTables.has(normalizedUri2)) {
            self.logger.debug(
              () =>
                `Skipping recursive load attempt for ${contextFile} (normalized: ${normalizedUri2}) - already loading`,
            );
            symbolTable =
              self.symbolRefManager.getSymbolTableForFile(contextFile);
            if (!symbolTable) {
              return null;
            }
          } else {
            try {
              self.loadingSymbolTables.add(normalizedUri2);

              const classPath = extractApexLibPath(contextFile);

              const loadedSymbolTable =
                await self.stdlibProvider.getSymbolTable(classPath);
              if (loadedSymbolTable) {
                symbolTable = loadedSymbolTable;

                await self.addSymbolTableAsync(symbolTable, contextFile);

                symbolTable =
                  self.symbolRefManager.getSymbolTableForFile(contextFile);
              }
            } catch (_error) {
            } finally {
              self.loadingSymbolTables.delete(normalizedUri2);
            }
          }
        }
      }

      if (symbolTable) {
        if (
          contextSymbol.kind === SymbolKind.Variable ||
          contextSymbol.kind === SymbolKind.Field ||
          contextSymbol.kind === SymbolKind.Parameter ||
          contextSymbol.kind === SymbolKind.Property
        ) {
          const variableSymbol = contextSymbol as VariableSymbol;
          const typeInfo = variableSymbol.type;

          if (typeInfo) {
            if (typeInfo.resolvedSymbol) {
              const typeSymbol = typeInfo.resolvedSymbol;
              const resolvedMember = await resolveMemberInContext(
                self,
                { type: 'symbol', symbol: typeSymbol },
                memberName,
                memberType,
              );
              if (resolvedMember) {
                return resolvedMember;
              }
              if (
                typeInfo.isBuiltIn ||
                (typeSymbol.fileUri && isStandardApexUri(typeSymbol.fileUri))
              ) {
                const classPath = extractApexLibPath(typeSymbol.fileUri);
                if (classPath) {
                  try {
                    const st =
                      await self.stdlibProvider.getSymbolTable(classPath);
                    if (st) {
                      await self.addSymbolTableAsync(st, typeSymbol.fileUri);
                      const retryResult = await resolveMemberInContext(
                        self,
                        { type: 'symbol', symbol: typeSymbol },
                        memberName,
                        memberType,
                      );
                      if (retryResult) {
                        return retryResult;
                      }
                    }
                  } catch (_error) {
                    // Error loading, continue to other strategies
                  }
                }
              }
            }

            const typeName = typeInfo.name;
            if (typeName) {
              const baseTypeName = typeName.replace(/\[\]$/, '');

              if (typeInfo.isBuiltIn) {
                self.logger.debug(
                  () =>
                    `Attempting to resolve built-in type "${baseTypeName}" as standard Apex class`,
                );
                const standardClassSymbol =
                  await self.resolveStandardApexClass(baseTypeName);
                if (standardClassSymbol) {
                  self.logger.debug(
                    () =>
                      `Resolved built-in type "${baseTypeName}" to class symbol: ` +
                      `${standardClassSymbol.name} (fileUri: ${standardClassSymbol.fileUri})`,
                  );
                  const resolvedMember = await resolveMemberInContext(
                    self,
                    { type: 'symbol', symbol: standardClassSymbol },
                    memberName,
                    memberType,
                  );
                  if (resolvedMember) {
                    self.logger.debug(
                      () =>
                        `Resolved member "${memberName}" on built-in type "${baseTypeName}": ${resolvedMember.name}`,
                    );
                    return resolvedMember;
                  }
                  self.logger.debug(
                    () =>
                      `Member "${memberName}" not found on "${baseTypeName}" ` +
                      'class symbol, trying to load class and retry',
                  );
                  if (
                    standardClassSymbol.fileUri &&
                    isStandardApexUri(standardClassSymbol.fileUri)
                  ) {
                    const classPath = extractApexLibPath(
                      standardClassSymbol.fileUri,
                    );
                    if (classPath) {
                      try {
                        self.logger.debug(
                          () =>
                            `Loading class from path: ${classPath} for member resolution`,
                        );
                        const st =
                          await self.stdlibProvider.getSymbolTable(classPath);
                        if (st) {
                          await self.addSymbolTableAsync(
                            st,
                            standardClassSymbol.fileUri,
                          );
                          self.logger.debug(
                            () =>
                              `Class loaded, retrying member resolution for "${memberName}"`,
                          );
                          const retryResult = await resolveMemberInContext(
                            self,
                            { type: 'symbol', symbol: standardClassSymbol },
                            memberName,
                            memberType,
                          );
                          if (retryResult) {
                            self.logger.debug(
                              () =>
                                `Successfully resolved member "${memberName}" after loading class`,
                            );
                            return retryResult;
                          } else {
                            self.logger.debug(
                              () =>
                                `Member "${memberName}" still not found after loading class`,
                            );
                          }
                        } else {
                          self.logger.debug(
                            () =>
                              `Failed to load class from path: ${classPath}`,
                          );
                        }
                      } catch (error) {
                        self.logger.debug(
                          () => `Error loading class ${classPath}: ${error}`,
                        );
                      }
                    } else {
                      self.logger.debug(
                        () =>
                          `Could not extract class path from fileUri: ${standardClassSymbol.fileUri}`,
                      );
                    }
                  } else {
                    self.logger.debug(
                      () =>
                        `Cannot load class: fileUri=${standardClassSymbol.fileUri}, ` +
                        `isStandardApexUri=${
                          standardClassSymbol.fileUri
                            ? isStandardApexUri(standardClassSymbol.fileUri)
                            : false
                        }`,
                    );
                  }
                } else {
                  self.logger.debug(
                    () =>
                      `Could not resolve built-in type "${baseTypeName}" ` +
                      'as standard Apex class - resolveStandardApexClass returned null',
                  );
                }
              }

              const typeSymbols = await self.findSymbolByName(baseTypeName);
              const typeClassSymbol = typeSymbols.find(
                (s) =>
                  s.kind === SymbolKind.Class ||
                  s.kind === SymbolKind.Interface ||
                  s.kind === SymbolKind.Enum,
              );

              if (typeClassSymbol) {
                const resolvedMember = await resolveMemberInContext(
                  self,
                  { type: 'symbol', symbol: typeClassSymbol },
                  memberName,
                  memberType,
                );
                if (resolvedMember) {
                  return resolvedMember;
                }
                if (
                  typeClassSymbol.fileUri &&
                  isStandardApexUri(typeClassSymbol.fileUri)
                ) {
                  const classPath = extractApexLibPath(typeClassSymbol.fileUri);
                  if (classPath) {
                    try {
                      const st =
                        await self.stdlibProvider.getSymbolTable(classPath);
                      if (st) {
                        await self.addSymbolTableAsync(
                          st,
                          typeClassSymbol.fileUri,
                        );
                        const retryResult = await resolveMemberInContext(
                          self,
                          { type: 'symbol', symbol: typeClassSymbol },
                          memberName,
                          memberType,
                        );
                        if (retryResult) {
                          return retryResult;
                        }
                      }
                    } catch (_error) {
                      // Error loading, continue to other strategies
                    }
                  }
                }
              }

              const typeRef: SymbolReference = {
                name: baseTypeName,
                context: ReferenceContext.CLASS_REFERENCE,
                location: {
                  symbolRange: {
                    startLine: 0,
                    startColumn: 0,
                    endLine: 0,
                    endColumn: 0,
                  },
                  identifierRange: {
                    startLine: 0,
                    startColumn: 0,
                    endLine: 0,
                    endColumn: 0,
                  },
                },
                resolvedSymbolId: undefined,
              };

              const builtInTypeSymbol =
                await self.resolveStandardLibraryType(typeRef);
              if (builtInTypeSymbol) {
                const resolvedMember = await resolveMemberInContext(
                  self,
                  { type: 'symbol', symbol: builtInTypeSymbol },
                  memberName,
                  memberType,
                );
                if (resolvedMember) {
                  return resolvedMember;
                }
              }

              const standardClassSymbol2 =
                await self.resolveStandardApexClass(baseTypeName);
              if (standardClassSymbol2) {
                const resolvedMember = await resolveMemberInContext(
                  self,
                  { type: 'symbol', symbol: standardClassSymbol2 },
                  memberName,
                  memberType,
                );
                if (resolvedMember) {
                  return resolvedMember;
                }
                if (
                  standardClassSymbol2.fileUri &&
                  isStandardApexUri(standardClassSymbol2.fileUri)
                ) {
                  const classPath = extractApexLibPath(
                    standardClassSymbol2.fileUri,
                  );
                  if (classPath) {
                    try {
                      const st =
                        await self.stdlibProvider.getSymbolTable(classPath);
                      if (st) {
                        await self.addSymbolTableAsync(
                          st,
                          standardClassSymbol2.fileUri,
                        );
                        const retryResult = await resolveMemberInContext(
                          self,
                          { type: 'symbol', symbol: standardClassSymbol2 },
                          memberName,
                          memberType,
                        );
                        if (retryResult) {
                          return retryResult;
                        }
                      }
                    } catch (_error) {
                      // Error loading, continue to other strategies
                    }
                  }
                }
              }
            }
          }

          return null;
        }

        if (isMethodSymbolNarrowing(contextSymbol)) {
          const returnType = contextSymbol.returnType;

          if (returnType) {
            if (returnType.resolvedSymbol) {
              const returnTypeSymbol = returnType.resolvedSymbol;
              const resolvedMember = await resolveMemberInContext(
                self,
                { type: 'symbol', symbol: returnTypeSymbol },
                memberName,
                memberType,
              );
              if (resolvedMember) {
                return resolvedMember;
              }
            }

            const returnTypeName = returnType.name;
            if (returnTypeName) {
              const baseTypeName = returnTypeName.replace(/\[\]$/, '');

              const typeRef: SymbolReference = {
                name: baseTypeName,
                context: ReferenceContext.CLASS_REFERENCE,
                location: {
                  symbolRange: {
                    startLine: 0,
                    startColumn: 0,
                    endLine: 0,
                    endColumn: 0,
                  },
                  identifierRange: {
                    startLine: 0,
                    startColumn: 0,
                    endLine: 0,
                    endColumn: 0,
                  },
                },
                resolvedSymbolId: undefined,
              };

              const builtInTypeSymbol =
                await self.resolveStandardLibraryType(typeRef);
              if (builtInTypeSymbol) {
                const resolvedMember = await resolveMemberInContext(
                  self,
                  { type: 'symbol', symbol: builtInTypeSymbol },
                  memberName,
                  memberType,
                );
                if (resolvedMember) {
                  return resolvedMember;
                }
              }

              const standardClassSymbol =
                await self.resolveStandardApexClass(baseTypeName);
              if (standardClassSymbol) {
                const resolvedMember = await resolveMemberInContext(
                  self,
                  { type: 'symbol', symbol: standardClassSymbol },
                  memberName,
                  memberType,
                );
                if (resolvedMember) {
                  return resolvedMember;
                }
              }

              const typeClassSymbols =
                await self.findSymbolByName(baseTypeName);
              const typeClassSymbol = typeClassSymbols.find(
                (s) =>
                  s.kind === SymbolKind.Class ||
                  s.kind === SymbolKind.Interface ||
                  s.kind === SymbolKind.Enum,
              );

              if (typeClassSymbol) {
                const resolvedMember = await resolveMemberInContext(
                  self,
                  { type: 'symbol', symbol: typeClassSymbol },
                  memberName,
                  memberType,
                );
                if (resolvedMember) {
                  return resolvedMember;
                }
              }
            }
          }

          return null;
        }

        if (
          contextSymbol.kind === SymbolKind.Class ||
          contextSymbol.kind === SymbolKind.Interface ||
          contextSymbol.kind === SymbolKind.Enum
        ) {
          const allSymbols = symbolTable.getAllSymbols();
          const classSymbolInTable = allSymbols.find(
            (s) =>
              s.kind === SymbolKind.Class &&
              s.name === contextSymbol.name &&
              s.fileUri === contextSymbol.fileUri,
          );
          const classSymbolId = classSymbolInTable?.id || contextSymbol.id;
          let classBlock = allSymbols.find(
            (s) =>
              isBlockSymbol(s) &&
              s.scopeType === 'class' &&
              (s.parentId === classSymbolId || s.parentId === contextSymbol.id),
          );
          if (!classBlock && classSymbolInTable) {
            classBlock = allSymbols.find(
              (s) =>
                isBlockSymbol(s) &&
                s.scopeType === 'class' &&
                s.fileUri === contextSymbol.fileUri &&
                (!s.parentId ||
                  s.parentId === '' ||
                  s.parentId === classSymbolId),
            );
          }
          if (!classBlock) {
            const allClassBlocks = allSymbols.filter(
              (s) => isBlockSymbol(s) && s.scopeType === 'class',
            );
            const classSymbols = allSymbols.filter(
              (s) =>
                s.kind === SymbolKind.Class && s.name === contextSymbol.name,
            );
            self.logger.debug(
              () =>
                `Class block lookup for "${contextSymbol.name}": not found. ` +
                `contextSymbol.id: "${contextSymbol.id}", ` +
                `Found ${allClassBlocks.length} class blocks, ` +
                `Found ${classSymbols.length} class symbols with name "${contextSymbol.name}". ` +
                `Class block parentIds: ${allClassBlocks.map((b) => b.parentId).join(', ')}. ` +
                `Class symbol IDs: ${classSymbols.map((s) => s.id).join(', ')}`,
            );

            const fallbackMembers = allSymbols.filter((s) => {
              if (
                isBlockSymbol(s) ||
                s.fileUri !== contextSymbol.fileUri ||
                s.name !== memberName ||
                s.kind !== memberType
              ) {
                return false;
              }
              const directParent = allSymbols.find(
                (sym) => sym.id === s.parentId && isBlockSymbol(sym),
              );
              if (
                directParent &&
                (directParent as any).scopeType === 'class' &&
                directParent.fileUri === contextSymbol.fileUri
              ) {
                return true;
              }
              let currentParentId = s.parentId;
              const visited = new Set<string>();
              while (currentParentId && !visited.has(currentParentId)) {
                if (
                  currentParentId === classSymbolId ||
                  currentParentId === contextSymbol.id
                ) {
                  return true;
                }
                visited.add(currentParentId);
                const parent = allSymbols.find(
                  (sym) => sym.id === currentParentId,
                );
                if (!parent) {
                  break;
                }
                currentParentId = parent.parentId;
              }
              return false;
            });
            if (fallbackMembers.length > 0) {
              const fallbackMember = fallbackMembers[0];
              if (fallbackMember.kind === SymbolKind.Method) {
                return applyMethodTypeSubstitutions(
                  fallbackMember as any,
                  typeSubstitutions,
                );
              }
              return fallbackMember;
            }
          } else {
            const resolvedClassBlock = classBlock;
            self.logger.debug(
              () =>
                `Class block lookup for "${contextSymbol.name}": found (id: ${resolvedClassBlock.id})`,
            );
          }

          if (classBlock) {
            const resolvedClassBlock = classBlock;

            const directScopeMembers = symbolTable.getSymbolsInScope(
              resolvedClassBlock.id,
            );
            const allSyms = symbolTable.getAllSymbols();
            const classMembers = allSyms.filter(
              (s) =>
                !isBlockSymbol(s) &&
                s.fileUri === contextSymbol.fileUri &&
                (s.parentId === resolvedClassBlock.id ||
                  directScopeMembers.some((ds) => ds.id === s.parentId) ||
                  (() => {
                    let currentParentId = s.parentId;
                    const visited = new Set<string>();
                    while (currentParentId && !visited.has(currentParentId)) {
                      visited.add(currentParentId);
                      if (currentParentId === resolvedClassBlock.id) {
                        return true;
                      }
                      const parent = allSyms.find(
                        (sym) => sym.id === currentParentId,
                      );
                      if (!parent) break;
                      currentParentId = parent.parentId;
                    }
                    return false;
                  })()),
            );
            self.logger.debug(
              () =>
                `Looking for member "${memberName}" (${memberType}) in class ` +
                `"${contextSymbol.name}" (fileUri: ${contextSymbol.fileUri}), ` +
                `classBlock.id: ${resolvedClassBlock.id}, found ${classMembers.length} ` +
                `class members (direct scope: ${directScopeMembers.length}). ` +
                `Sample members: ${classMembers
                  .slice(0, 5)
                  .map((s) => `${s.name || 'unnamed'} (${s.kind})`)
                  .join(', ')}`,
            );
            const matchingMembers = classMembers.filter(
              (s) =>
                !isBlockSymbol(s) &&
                s.name === memberName &&
                s.kind === memberType &&
                s.fileUri === contextSymbol.fileUri,
            );
            self.logger.debug(
              () =>
                `After filtering: found ${matchingMembers.length} matching members. ` +
                `Filter criteria: name=${memberName}, kind=${memberType}, ` +
                `fileUri=${contextSymbol.fileUri}, parentId=${resolvedClassBlock.id}`,
            );
            if (matchingMembers.length === 0) {
              const methodsWithName = classMembers.filter(
                (s) => !isBlockSymbol(s) && s.name === memberName,
              );
              const methodsWithKind = classMembers.filter(
                (s) => !isBlockSymbol(s) && s.kind === memberType,
              );
              const allMethods = classMembers.filter(
                (s) => !isBlockSymbol(s) && s.kind === 'method',
              );
              const membersWithSizeName = classMembers.filter(
                (s) => !isBlockSymbol(s) && s.name === 'size',
              );
              self.logger.debug(
                () =>
                  `No matching members found. Methods with name "${memberName}": ` +
                  `${methodsWithName.length}, Methods with kind "${memberType}": ` +
                  `${methodsWithKind.length}, All methods: ${allMethods
                    .map((m) => m.name)
                    .join(', ')}, Members named "size": ${membersWithSizeName
                    .map((m) => `${m.name} (${m.kind})`)
                    .join(', ')}`,
              );
              if (methodsWithName.length > 0) {
                methodsWithName.forEach((m, idx) => {
                  self.logger.debug(
                    () =>
                      `  Method ${idx}: name=${m.name}, kind=${m.kind}, ` +
                      `fileUri=${m.fileUri}, parentId=${m.parentId}, ` +
                      `contextSymbol.fileUri=${contextSymbol.fileUri}, ` +
                      `classBlock.id=${resolvedClassBlock.id}`,
                  );
                });
              }
            }

            if (matchingMembers.length > 0) {
              const method = matchingMembers[0];
              if (method.kind === SymbolKind.Method) {
                const methodParentBlock = symbolTable
                  .getAllSymbols()
                  .find((s) => s.id === method.parentId && isBlockSymbol(s));
                const parentChainMatches =
                  methodParentBlock &&
                  (methodParentBlock.parentId === contextSymbol.id ||
                    methodParentBlock.parentId === classSymbolId);
                if (parentChainMatches) {
                  return applyMethodTypeSubstitutions(
                    method as any,
                    typeSubstitutions,
                  );
                }
                self.logger.debug(
                  () =>
                    `Method ${memberName} found but parent chain doesn't match context class ${contextSymbol.name}`,
                );
              } else {
                return method;
              }
            }
          }
          if (
            contextSymbol.fileUri &&
            isStandardApexUri(contextSymbol.fileUri)
          ) {
            const classPath = extractApexLibPath(contextSymbol.fileUri);
            if (classPath) {
              try {
                const normalizedUri = extractFilePathFromUri(
                  contextSymbol.fileUri,
                );
                if (!self.loadingSymbolTables.has(normalizedUri)) {
                  self.loadingSymbolTables.add(normalizedUri);
                  try {
                    const st =
                      await self.stdlibProvider.getSymbolTable(classPath);
                    if (st) {
                      await self.addSymbolTableAsync(st, contextSymbol.fileUri);
                      const reloadedSymbolTable =
                        self.symbolRefManager.getSymbolTableForFile(
                          contextSymbol.fileUri,
                        );
                      if (reloadedSymbolTable) {
                        const allSymbols2 = reloadedSymbolTable.getAllSymbols();
                        const classBlock2 = allSymbols2.find(
                          (s) =>
                            isBlockSymbol(s) &&
                            s.scopeType === 'class' &&
                            s.parentId === contextSymbol.id,
                        );

                        if (classBlock2) {
                          const classMembers2 =
                            reloadedSymbolTable.getSymbolsInScope(
                              classBlock2.id,
                            );
                          const matchingMembers2 = classMembers2.filter(
                            (s) =>
                              !isBlockSymbol(s) &&
                              s.name === memberName &&
                              s.kind === memberType &&
                              s.fileUri === contextSymbol.fileUri &&
                              s.parentId === classBlock2.id,
                          );

                          if (matchingMembers2.length > 0) {
                            const method = matchingMembers2[0];
                            if (method.kind === SymbolKind.Method) {
                              const methodParentBlock = allSymbols2.find(
                                (s) =>
                                  s.id === method.parentId && isBlockSymbol(s),
                              );
                              if (
                                methodParentBlock &&
                                methodParentBlock.parentId === contextSymbol.id
                              ) {
                                return applyMethodTypeSubstitutions(
                                  method as any,
                                  typeSubstitutions,
                                );
                              }
                            } else {
                              return method;
                            }
                          }
                        }
                      }
                    }
                  } finally {
                    self.loadingSymbolTables.delete(normalizedUri);
                  }
                }
              } catch (_error) {
                // Error loading, continue to return null
              }
            }
          }

          if (contextSymbol.kind === SymbolKind.Class) {
            const classTypeSymbol = contextSymbol as TypeSymbol;

            if (classTypeSymbol.superClass) {
              const superclassSymbolResult = await resolveSuperclassSymbol(
                self,
                classTypeSymbol,
              );
              if (superclassSymbolResult) {
                const superclassMember = await resolveMemberInContext(
                  self,
                  { type: 'symbol', symbol: superclassSymbolResult },
                  memberName,
                  memberType,
                );
                if (superclassMember) {
                  return superclassMember;
                }
              }
            }

            if (classTypeSymbol.name?.toLowerCase() !== 'object') {
              const objectClassResult = await resolveObjectClass(self);
              if (objectClassResult) {
                const objectMember = await resolveMemberInContext(
                  self,
                  { type: 'symbol', symbol: objectClassResult },
                  memberName,
                  memberType,
                );
                if (objectMember) {
                  return objectMember;
                }
              }
            }
          }

          return null;
        }

        const allSymbols = symbolTable.getAllSymbols();

        const contextMembers = allSymbols.filter(
          (s) => s.name === memberName && s.kind === memberType,
        );

        if (contextMembers.length > 0) {
          const contextMember = contextMembers[0];
          if (contextMember.kind === SymbolKind.Method) {
            return applyMethodTypeSubstitutions(
              contextMember as any,
              typeSubstitutions,
            );
          }
          return contextMember;
        } else {
          const _sameNameSymbols = allSymbols.filter(
            (s) => s.name === memberName,
          );
        }
      }
    }
  } else if (context?.type === 'namespace') {
    const namespaceSymbols = await findSymsInNsOp(self, context.name);
    const matchingSymbol = namespaceSymbols.find(
      (s) => s.kind === memberType && s.name === memberName,
    );

    if (matchingSymbol) {
      return matchingSymbol;
    }
  }

  const isResolvingMethodOnClass =
    context?.type === 'symbol' &&
    (context.symbol.kind === SymbolKind.Class ||
      context.symbol.kind === SymbolKind.Interface ||
      context.symbol.kind === SymbolKind.Enum) &&
    memberType === 'method';

  const isResolvingMethodOnVariableType =
    memberType === 'method' &&
    context?.type === 'symbol' &&
    (context.symbol.kind === SymbolKind.Variable ||
      context.symbol.kind === SymbolKind.Field ||
      context.symbol.kind === SymbolKind.Parameter ||
      context.symbol.kind === SymbolKind.Property);

  const isBuiltInOrStandardClass =
    context?.type === 'symbol' &&
    context.symbol.kind === SymbolKind.Class &&
    memberType === 'method' &&
    context.symbol.fileUri &&
    (isStandardApexUri(context.symbol.fileUri) ||
      BUILTIN_TYPE_NAMES.has(context.symbol.name.toLowerCase()));

  if (
    !isResolvingMethodOnClass &&
    !isResolvingMethodOnVariableType &&
    !isBuiltInOrStandardClass
  ) {
    const globalSymbols = await self.findSymbolByName(memberName);
    const matchingSymbol = globalSymbols.find((s) => s.kind === memberType);

    if (matchingSymbol) {
      return matchingSymbol;
    }
  }

  if (memberType === 'class') {
    const memberRef: SymbolReference = {
      name: memberName,
      context: ReferenceContext.CLASS_REFERENCE,
      location: {
        symbolRange: {
          startLine: 0,
          startColumn: 0,
          endLine: 0,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 0,
          startColumn: 0,
          endLine: 0,
          endColumn: 0,
        },
      },
      resolvedSymbolId: undefined,
    };
    const builtInSymbol = await self.resolveStandardLibraryType(memberRef);
    if (builtInSymbol) {
      return builtInSymbol;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// resolveQualifiedReferenceFromChain
// ---------------------------------------------------------------------------

export async function resolveQualifiedReferenceFromChain(
  self: SymbolManagerOps,
  qualifier: string,
  member: string,
  context: ReferenceContext,
  fileUri?: string,
  sourceSymbol?: ApexSymbol | null,
  originalTypeRef?: SymbolReference,
  symbolTable?: SymbolTable,
  qualifiedResolutionCache?: HashMap<string, ApexSymbol | null>,
  memberResolutionCache?: HashMap<string, ApexSymbol | null>,
  resolverStats?: ResolverStats,
): Promise<ApexSymbol | null> {
  try {
    if (qualifier.toLowerCase() === 'this') {
      if (resolverStats) {
        resolverStats.resolverQualifiedThisCalls += 1;
      }
      let containingClass: ApexSymbol | null = null;
      if (sourceSymbol) {
        containingClass = await self.getContainingType(sourceSymbol);
      }

      if (containingClass && fileUri) {
        const thisLookupStart = Date.now();
        const normalizedUri = extractFilePathFromUri(createFileUri(fileUri));
        const localSymbols = symbolTable?.getAllSymbols();

        const allSymbolsWithName = localSymbols
          ? localSymbols.filter((s) => s.name === member)
          : await self.findSymbolByName(member);

        const classMembers = allSymbolsWithName.filter((s) => {
          if (s.parentId === containingClass?.id) {
            return true;
          }
          if (
            s.fileUri === normalizedUri &&
            containingClass?.location &&
            s.location
          ) {
            const classStart = containingClass?.location.symbolRange.startLine;
            const classEnd = containingClass?.location.symbolRange.endLine;
            const symbolStart = s.location.symbolRange.startLine;
            const symbolEnd = s.location.symbolRange.endLine;
            return symbolStart >= classStart && symbolEnd <= classEnd;
          }
          return false;
        });

        if (classMembers.length > 0) {
          if (resolverStats) {
            resolverStats.resolverQualifiedThisLookupMs +=
              Date.now() - thisLookupStart;
          }
          return classMembers[0];
        }
        if (resolverStats) {
          resolverStats.resolverQualifiedThisLookupMs +=
            Date.now() - thisLookupStart;
        }
      }

      const thisGlobalLookupStart = Date.now();
      const symbols = symbolTable
        ? symbolTable
            .getAllSymbols()
            .filter((s) => s.name?.toLowerCase() === member.toLowerCase())
        : await self.findSymbolByName(member);
      if (resolverStats) {
        resolverStats.resolverQualifiedGlobalLookupMs +=
          Date.now() - thisGlobalLookupStart;
      }
      if (symbols.length > 0) {
        if (fileUri) {
          const normalizedUri = extractFilePathFromUri(createFileUri(fileUri));
          const sameFileSymbol = symbols.find(
            (s) => s.fileUri === normalizedUri,
          );
          if (sameFileSymbol) {
            return sameFileSymbol;
          }
        }
        return symbols[0];
      }
      return null;
    }

    const qualifiedCacheKey = `${qualifier}|${member}|${context}|${fileUri ?? ''}`;
    if (qualifiedResolutionCache?.has(qualifiedCacheKey)) {
      if (resolverStats) {
        resolverStats.resolverQualifiedCacheHits += 1;
      }
      return qualifiedResolutionCache.get(qualifiedCacheKey) ?? null;
    }
    if (resolverStats) {
      resolverStats.resolverQualifiedCacheMisses += 1;
    }

    let qualifierSymbols = await self.findSymbolByName(qualifier);

    if (qualifierSymbols.length === 0) {
      let qualifierRef: SymbolReference;
      if (
        originalTypeRef &&
        isChainedSymbolReference(originalTypeRef) &&
        originalTypeRef.chainNodes.length >= 2
      ) {
        qualifierRef = originalTypeRef.chainNodes[0];
      } else {
        qualifierRef = {
          name: qualifier,
          context: ReferenceContext.NAMESPACE,
          location: originalTypeRef?.location || {
            symbolRange: {
              startLine: 0,
              startColumn: 0,
              endLine: 0,
              endColumn: 0,
            },
            identifierRange: {
              startLine: 0,
              startColumn: 0,
              endLine: 0,
              endColumn: 0,
            },
          },
          resolvedSymbolId: undefined,
        };
      }
      const builtInQualifier =
        await self.resolveStandardLibraryType(qualifierRef);
      if (builtInQualifier) {
        qualifierSymbols = [builtInQualifier];
      }
    }

    if (qualifierSymbols.length === 0) {
      const stdClassStart = Date.now();
      const standardClass = await self.resolveStandardApexClass(qualifier);
      if (resolverStats) {
        resolverStats.resolverQualifiedStandardClassMs +=
          Date.now() - stdClassStart;
      }
      if (standardClass) {
        qualifierSymbols = [standardClass];
      }
    }

    if (qualifierSymbols.length === 0) {
      qualifiedResolutionCache?.set(qualifiedCacheKey, null);
      return null;
    }

    if (qualifierSymbols.length > 1) {
      const preferredFileUri =
        sourceSymbol?.fileUri ??
        (fileUri ? extractFilePathFromUri(createFileUri(fileUri)) : null);
      const sourceLine = sourceSymbol?.location?.identifierRange?.startLine;
      const kindRank = (kind: string): number => {
        if (
          kind === SymbolKind.Variable ||
          kind === SymbolKind.Parameter ||
          kind === SymbolKind.Field ||
          kind === SymbolKind.Property
        ) {
          return 0;
        }
        return 1;
      };

      qualifierSymbols = [...qualifierSymbols].sort((a, b) => {
        const aSameFile =
          preferredFileUri && a.fileUri === preferredFileUri ? 0 : 1;
        const bSameFile =
          preferredFileUri && b.fileUri === preferredFileUri ? 0 : 1;
        if (aSameFile !== bSameFile) {
          return aSameFile - bSameFile;
        }

        const aKind = kindRank(a.kind);
        const bKind = kindRank(b.kind);
        if (aKind !== bKind) {
          return aKind - bKind;
        }

        if (sourceLine !== undefined) {
          const aLine = a.location?.identifierRange?.startLine;
          const bLine = b.location?.identifierRange?.startLine;
          const aDist =
            aLine !== undefined
              ? Math.abs(aLine - sourceLine)
              : Number.MAX_SAFE_INTEGER;
          const bDist =
            bLine !== undefined
              ? Math.abs(bLine - sourceLine)
              : Number.MAX_SAFE_INTEGER;
          if (aDist !== bDist) {
            return aDist - bDist;
          }
        }

        return 0;
      });
    }

    const qualifierSymbol = qualifierSymbols[0];

    let memberResolutionContext: { type: 'symbol'; symbol: ApexSymbol } = {
      type: 'symbol',
      symbol: qualifierSymbol,
    };
    let memberTypeSubstitutions: GenericTypeSubstitutionMap | null = null;
    let qualifierRawTypeName: string | null = null;
    let collectionElementType: string | null = null;
    let promotedFromCollectionType = false;
    if (
      (qualifierSymbol.kind === SymbolKind.Variable ||
        qualifierSymbol.kind === SymbolKind.Parameter ||
        qualifierSymbol.kind === SymbolKind.Field ||
        qualifierSymbol.kind === SymbolKind.Property) &&
      (qualifierSymbol as any)?.type?.name
    ) {
      const qualifierTypeObj = (qualifierSymbol as any)?.type;
      memberTypeSubstitutions =
        createGenericTypeSubstitutionMap(qualifierTypeObj);
      const rawTypeName = ((qualifierSymbol as any).type.name as string).trim();
      qualifierRawTypeName = rawTypeName;
      collectionElementType =
        rawTypeName === 'List' || rawTypeName === 'Set'
          ? ((qualifierTypeObj?.typeParameters?.[0]?.originalTypeString as
              | string
              | undefined) ??
            (qualifierTypeObj?.typeParameters?.[0]?.name as
              | string
              | undefined) ??
            null)
          : null;
      let collectionTypeSymbol = await resolvePreferredTypeOp(
        self,
        rawTypeName,
        fileUri,
        symbolTable,
      );
      if (
        !collectionTypeSymbol &&
        (rawTypeName === 'List' ||
          rawTypeName === 'Set' ||
          rawTypeName === 'Map')
      ) {
        collectionTypeSymbol = await self.resolveStandardApexClass(rawTypeName);
      }
      const elementTypeSymbol = collectionElementType
        ? await resolvePreferredTypeOp(
            self,
            collectionElementType,
            fileUri,
            symbolTable,
          )
        : null;
      const typeSymbol = collectionTypeSymbol ?? elementTypeSymbol;
      promotedFromCollectionType = !!collectionTypeSymbol;
      if (typeSymbol) {
        memberResolutionContext = { type: 'symbol', symbol: typeSymbol };
        if (resolverStats) {
          resolverStats.resolverQualifiedTypeContextPromotions += 1;
        }
      }
    }
    const chainIndicatesMethod =
      !!originalTypeRef &&
      isChainedSymbolReference(originalTypeRef) &&
      originalTypeRef.chainNodes?.some(
        (node) =>
          node.name === member && node.context === ReferenceContext.METHOD_CALL,
      );
    const memberTypeForLookup =
      context === ReferenceContext.METHOD_CALL || chainIndicatesMethod
        ? 'method'
        : 'property';
    const memberCacheKey = `${memberResolutionContext.symbol.id}|${memberTypeForLookup}|${member.toLowerCase()}`;
    const cachedMember = memberResolutionCache?.get(memberCacheKey);
    if (cachedMember !== undefined) {
      if (resolverStats) {
        resolverStats.resolverMemberContextCacheHits += 1;
      }
      qualifiedResolutionCache?.set(qualifiedCacheKey, cachedMember);
      return cachedMember;
    }
    if (resolverStats) {
      resolverStats.resolverMemberContextCacheMisses += 1;
    }
    const resolveMemberStart = Date.now();
    const memberSymbol = await resolveMemberInContext(
      self,
      memberResolutionContext,
      member,
      memberTypeForLookup,
      memberTypeSubstitutions,
    );
    let finalMemberSymbol = memberSymbol;
    if (
      !finalMemberSymbol &&
      collectionElementType &&
      promotedFromCollectionType &&
      qualifierRawTypeName &&
      memberResolutionContext.symbol.name.toLowerCase() ===
        qualifierRawTypeName.toLowerCase()
    ) {
      const elementTypeSymbol = await resolvePreferredTypeOp(
        self,
        collectionElementType,
        fileUri,
        symbolTable,
      );
      if (elementTypeSymbol) {
        finalMemberSymbol = await resolveMemberInContext(
          self,
          { type: 'symbol', symbol: elementTypeSymbol },
          member,
          memberTypeForLookup,
          null,
        );
      }
    }
    const resolveMemberMs = Date.now() - resolveMemberStart;
    if (resolverStats) {
      resolverStats.resolverQualifiedResolveMemberMs += resolveMemberMs;
    }
    if (finalMemberSymbol) {
      memberResolutionCache?.set(memberCacheKey, finalMemberSymbol);
      qualifiedResolutionCache?.set(qualifiedCacheKey, finalMemberSymbol);
      return finalMemberSymbol;
    }

    if (context === ReferenceContext.METHOD_CALL) {
      memberResolutionCache?.set(memberCacheKey, qualifierSymbol);
      qualifiedResolutionCache?.set(qualifiedCacheKey, qualifierSymbol);
      return qualifierSymbol;
    }

    memberResolutionCache?.set(memberCacheKey, null);
    qualifiedResolutionCache?.set(qualifiedCacheKey, null);
    return null;
  } catch (_error) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// findTargetSymbolForReference
// ---------------------------------------------------------------------------

export async function findTargetSymbolForReference(
  self: SymbolManagerOps,
  typeRef: SymbolReference,
  fileUri?: string,
  sourceSymbol?: ApexSymbol | null,
  symbolTable?: SymbolTable,
  qualifiedResolutionCache?: HashMap<string, ApexSymbol | null>,
  memberResolutionCache?: HashMap<string, ApexSymbol | null>,
  resolverStats?: ResolverStats,
): Promise<ApexSymbol | null> {
  if (resolverStats) {
    resolverStats.resolverCalls += 1;
  }
  if (typeRef.resolvedSymbolId) {
    const resolvedSymbol = await self.getSymbol(typeRef.resolvedSymbolId);
    if (resolvedSymbol) {
      if (resolverStats) {
        resolverStats.resolverPreResolvedHits += 1;
      }
      self.logger.debug(
        () =>
          `Using pre-resolved symbol ID "${typeRef.resolvedSymbolId}" in findTargetSymbolForReference`,
      );
      return resolvedSymbol;
    }
    self.logger.debug(
      () =>
        'Pre-resolved symbol ID "' +
        typeRef.resolvedSymbolId +
        '" not found ' +
        'in findTargetSymbolForReference, falling back to normal resolution',
    );
  }

  const qualifierInfo = extractQualFromChainOp(typeRef);

  if (qualifierInfo && qualifierInfo.isQualified) {
    const qualifiedStart = Date.now();
    const qualifiedSymbol = await resolveQualifiedReferenceFromChain(
      self,
      qualifierInfo.qualifier,
      qualifierInfo.member,
      typeRef.context,
      fileUri,
      sourceSymbol,
      typeRef,
      symbolTable,
      qualifiedResolutionCache,
      memberResolutionCache,
      resolverStats,
    );
    if (resolverStats) {
      resolverStats.resolverQualifiedCalls += 1;
      resolverStats.resolverQualifiedMs += Date.now() - qualifiedStart;
    }

    if (qualifiedSymbol) {
      return qualifiedSymbol;
    }
  }

  if (symbolTable && fileUri) {
    const scopeHierarchyStart = Date.now();
    const position = {
      line: typeRef.location.identifierRange.startLine,
      character: typeRef.location.identifierRange.startColumn,
    };
    const scopeHierarchy = symbolTable.getScopeHierarchy(position);
    if (resolverStats) {
      resolverStats.resolverScopeHierarchyMs +=
        Date.now() - scopeHierarchyStart;
    }

    const allFileSymbols = symbolTable.getAllSymbols();
    const scopeSearchStart = Date.now();

    const innermostToOutermost = [...scopeHierarchy].reverse();
    for (const blockSymbol of innermostToOutermost) {
      const directChildren = allFileSymbols.filter(
        (symbol) =>
          symbol.name === typeRef.name && symbol.parentId === blockSymbol.id,
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
            symbol.name?.toLowerCase() === typeRef.name.toLowerCase() &&
            symbol.parentId === nestedBlock.id,
        );
        symbolsInNestedBlocks.push(...nestedSymbols);
      }

      const symbolsInScope = [...directChildren, ...symbolsInNestedBlocks];

      if (symbolsInScope.length > 0) {
        const prioritized = symbolsInScope.sort((a, b) => {
          const aIsVar =
            a.kind === SymbolKind.Variable || a.kind === SymbolKind.Parameter;
          const bIsVar =
            b.kind === SymbolKind.Variable || b.kind === SymbolKind.Parameter;
          if (aIsVar && !bIsVar) return -1;
          if (!aIsVar && bIsVar) return 1;
          return 0;
        });
        if (resolverStats) {
          resolverStats.resolverScopeSearchMs += Date.now() - scopeSearchStart;
        }
        return prioritized[0];
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
            s.name === typeRef.name &&
            s.parentId === blockSymbol.id &&
            s.kind === SymbolKind.Field,
        );
        if (classFields.length > 0) {
          if (resolverStats) {
            resolverStats.resolverScopeSearchMs +=
              Date.now() - scopeSearchStart;
          }
          return classFields[0];
        }
        const classMethods = allFileSymbols.filter(
          (s) =>
            s.name === typeRef.name &&
            s.parentId === blockSymbol.id &&
            s.kind === SymbolKind.Method,
        );
        if (classMethods.length > 0) {
          if (resolverStats) {
            resolverStats.resolverScopeSearchMs +=
              Date.now() - scopeSearchStart;
          }
          return classMethods[0];
        }
      }

      if (isMethodLevel) {
        const parameters = allFileSymbols.filter(
          (s) =>
            s.name === typeRef.name &&
            s.parentId === blockSymbol.id &&
            s.kind === SymbolKind.Parameter,
        );
        if (parameters.length > 0) {
          if (resolverStats) {
            resolverStats.resolverScopeSearchMs +=
              Date.now() - scopeSearchStart;
          }
          return parameters[0];
        }
      }
    }
    if (resolverStats) {
      resolverStats.resolverScopeSearchMs += Date.now() - scopeSearchStart;
    }
  }

  if (symbolTable) {
    const directLookupStart = Date.now();
    const allFileSymbols = symbolTable.getAllSymbols();
    const directMatch = allFileSymbols.find(
      (s) => s.name?.toLowerCase() === typeRef.name.toLowerCase(),
    );
    if (resolverStats) {
      resolverStats.resolverDirectLookupMs += Date.now() - directLookupStart;
    }
    if (directMatch) {
      return directMatch;
    }
  }

  const builtInStart = Date.now();
  const builtInSymbol = await self.resolveStandardLibraryType(typeRef);
  if (resolverStats) {
    resolverStats.resolverBuiltInMs += Date.now() - builtInStart;
  }
  if (builtInSymbol) {
    return builtInSymbol;
  }

  return null;
}

// ---------------------------------------------------------------------------
// resolveSymbolReferenceToSymbol
// ---------------------------------------------------------------------------

export async function resolveSymbolReferenceToSymbol(
  self: SymbolManagerOps,
  typeReference: SymbolReference,
  sourceFile: string,
  position?: { line: number; character: number },
): Promise<ApexSymbol | null> {
  self.logger.debug(
    () =>
      '[Resolution] resolveSymbolReferenceToSymbol called for ' +
      `"${typeReference.name}" (context: ${typeReference.context})`,
  );

  try {
    if (typeReference.context === ReferenceContext.LITERAL) {
      if (!typeReference.literalType || typeReference.literalType === 'Null') {
        return null;
      }

      const builtInTypeRef: SymbolReference = {
        name: typeReference.literalType,
        location: typeReference.location,
        context: ReferenceContext.CLASS_REFERENCE,
      };

      const builtInSymbol =
        await self.resolveStandardLibraryType(builtInTypeRef);
      if (builtInSymbol) {
        typeReference.resolvedSymbolId = builtInSymbol.id;
        self.logger.debug(
          () =>
            `Resolved LITERAL reference "${typeReference.name}" ` +
            `(type: ${typeReference.literalType}) to built-in type: ${builtInSymbol.name}`,
        );
        return builtInSymbol;
      }

      return null;
    }

    if (typeReference.resolvedSymbolId) {
      let shouldSkipFastPath = false;
      if (position && isChainedSymbolReference(typeReference)) {
        const chainMember = findChainMember(typeReference, position);
        if (chainMember) {
          shouldSkipFastPath = true;
        }
      }

      if (!shouldSkipFastPath) {
        const resolvedSymbol = await self.getSymbol(
          typeReference.resolvedSymbolId,
        );
        if (resolvedSymbol) {
          self.logger.debug(
            () =>
              `Using pre-resolved symbol ID "${typeReference.resolvedSymbolId}" ` +
              `for reference "${typeReference.name}"`,
          );
          return resolvedSymbol;
        }
        self.logger.debug(
          () =>
            `Pre-resolved symbol ID "${typeReference.resolvedSymbolId}" not found, falling back to normal resolution`,
        );
      }
    }

    const syntheticRef = typeReference as any;
    if (syntheticRef._originalChainedRef && syntheticRef._chainNode) {
      if (syntheticRef._chainNode.resolvedSymbolId) {
        const resolvedSymbol = await self.getSymbol(
          syntheticRef._chainNode.resolvedSymbolId,
        );
        if (resolvedSymbol) {
          self.logger.debug(
            () =>
              `Resolved synthetic reference "${typeReference.name}" through chain node`,
          );
          return resolvedSymbol;
        }
      }
      const chainedRef = syntheticRef._originalChainedRef;
      if (position) {
        const chainMember = findChainMember(chainedRef, position);
        if (chainMember && chainMember.member.resolvedSymbolId) {
          const resolvedSymbol = await self.getSymbol(
            chainMember.member.resolvedSymbolId,
          );
          if (resolvedSymbol) {
            self.logger.debug(
              () =>
                `Resolved synthetic reference "${typeReference.name}" through chain member at position`,
            );
            return resolvedSymbol;
          }
        }
      }
      return resolveChainedSymbolReference(
        self,
        chainedRef,
        position,
        sourceFile,
      );
    }

    if (isChainedSymbolReference(typeReference)) {
      return resolveChainedSymbolReference(
        self,
        typeReference,
        position,
        sourceFile,
      );
    }

    const qualifierInfo = extractQualFromChainOp(typeReference);
    if (qualifierInfo && qualifierInfo.isQualified) {
      const qualifiedSymbol = await resolveQualifiedReferenceFromChain(
        self,
        qualifierInfo.qualifier,
        qualifierInfo.member,
        typeReference.context,
        sourceFile,
        undefined,
        typeReference,
      );

      if (qualifiedSymbol) {
        return qualifiedSymbol;
      }
    }

    if (typeReference.context !== ReferenceContext.VARIABLE_DECLARATION) {
      const builtInSymbol =
        await self.resolveStandardLibraryType(typeReference);
      if (builtInSymbol) {
        self.logger.debug(
          () =>
            `Resolved built-in type "${typeReference.name}" to symbol: ${builtInSymbol.name}`,
        );
        return builtInSymbol;
      } else {
        self.logger.debug(
          () =>
            `Built-in type resolution failed for "${typeReference.name}" in ${sourceFile}`,
        );
      }

      const standardClass = await self.resolveStandardApexClass(
        typeReference.name,
      );
      if (standardClass) {
        self.logger.debug(
          () =>
            `Resolved standard Apex class "${typeReference.name}" to symbol: ${standardClass.name}`,
        );
        return standardClass;
      } else {
        self.logger.debug(
          () =>
            `Standard Apex class resolution failed for "${typeReference.name}" in ${sourceFile}`,
        );
      }
    }

    const isStandardNamespace = self.stdlibProvider.isStdApexNamespace(
      typeReference.name,
    );
    if (isStandardNamespace) {
      // Let it continue to scope resolution
    }

    let variableUsageLooksLikeClass = false;
    if (typeReference.context === ReferenceContext.VARIABLE_USAGE) {
      const candidates = await self.findSymbolByName(typeReference.name);
      const hasClassMatch = candidates.some(
        (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
      );
      variableUsageLooksLikeClass = hasClassMatch || candidates.length === 0;
    }
    const isClassReferenceContext =
      typeReference.context === ReferenceContext.CLASS_REFERENCE ||
      typeReference.context === ReferenceContext.CONSTRUCTOR_CALL ||
      typeReference.context === ReferenceContext.GENERIC_PARAMETER_TYPE ||
      (typeReference.context === ReferenceContext.VARIABLE_USAGE &&
        variableUsageLooksLikeClass);
    if (isClassReferenceContext) {
      const candidates = await self.findSymbolByName(typeReference.name);

      let classCandidates = candidates.filter(
        (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
      );

      if (classCandidates.length === 0) {
        const sourceSymbolTable =
          self.symbolRefManager.getSymbolTableForFile(sourceFile);
        if (sourceSymbolTable) {
          const allSymbols = sourceSymbolTable.getAllSymbols();
          classCandidates = allSymbols.filter(
            (s) =>
              s.name === typeReference.name &&
              (s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface),
          );
        }

        if (classCandidates.length === 0) {
          self.logger.debug(
            () =>
              `[Resolution] Type "${typeReference.name}" not in source file, checking GlobalTypeRegistry`,
          );

          const sourceSymbolTable2 =
            self.symbolRefManager.getSymbolTableForFile(sourceFile);

          const registryLookup = Effect.gen(function* () {
            const registry = yield* GlobalTypeRegistry;

            const sourceSymbolForNs = sourceSymbolTable2
              ?.getAllSymbols()
              .find((s) => s.parentId === null);
            const currentNs = sourceSymbolForNs?.namespace
              ? String(sourceSymbolForNs.namespace)
              : undefined;

            return yield* registry.resolveType(typeReference.name, {
              currentNamespace: currentNs,
            });
          });

          try {
            const registryEntry = await Effect.runPromise(
              registryLookup.pipe(Effect.provide(GlobalTypeRegistryLive)),
            );

            if (registryEntry) {
              let symbol = self.symbolRefManager.getSymbol(
                registryEntry.symbolId,
              );

              self.logger.debug(
                () =>
                  `[Resolution] Registry entry found for "${typeReference.name}" ` +
                  `(symbolId="${registryEntry.symbolId}"), symbol in graph: ${symbol ? 'YES' : 'NO'}`,
              );

              if (!symbol && registryEntry.isStdlib) {
                self.logger.debug(
                  () =>
                    `[Resolution] Loading stdlib class on-demand: ${registryEntry.fileUri}`,
                );

                const match = registryEntry.fileUri.match(
                  /apexlib:\/\/resources\/StandardApexLibrary\/(.+\.cls)$/,
                );
                if (match) {
                  const classPath = match[1];
                  const st =
                    await self.stdlibProvider.getSymbolTable(classPath);
                  if (st) {
                    await self.addSymbolTableAsync(st, registryEntry.fileUri);
                    symbol = self.symbolRefManager.getSymbol(
                      registryEntry.symbolId,
                    );
                    self.logger.debug(
                      () =>
                        `[Resolution] After loading, symbol in graph: ${symbol ? 'YES' : 'NO'}`,
                    );
                  }
                }
              }

              if (symbol) {
                classCandidates = [symbol];
                self.logger.debug(
                  () =>
                    `[GlobalTypeRegistry] Resolved "${typeReference.name}" to ` +
                    `"${registryEntry.fqn}" via Effect service (O(1))`,
                );
              } else {
                self.logger.debug(
                  () =>
                    `[Resolution] Registry entry found but symbol not available for "${typeReference.name}"`,
                );
              }
            } else {
              self.logger.debug(
                () =>
                  `[GlobalTypeRegistry] Type "${typeReference.name}" not found in registry. ` +
                  'Type may not exist or file not yet loaded.',
              );
            }
          } catch (error) {
            self.logger.error(
              () =>
                `[GlobalTypeRegistry] Effect service error: ${error}. ` +
                'Type resolution failed.',
            );
          }
        }
      }

      if (classCandidates.length > 0) {
        const sameFileClass = classCandidates.find(
          (s) => s.fileUri === sourceFile || s.key.path[0] === sourceFile,
        );
        if (sameFileClass) {
          return sameFileClass;
        }
        const accessibleClass = classCandidates.find((s) =>
          isSymAccessibleOp(s, sourceFile),
        );
        if (accessibleClass) {
          return accessibleClass;
        }
        return classCandidates[0];
      }

      const builtInSymbol2 =
        await self.resolveStandardLibraryType(typeReference);
      if (builtInSymbol2) {
        self.logger.debug(
          () =>
            `Resolved GENERIC_PARAMETER_TYPE "${typeReference.name}" to built-in type: ${builtInSymbol2.name}`,
        );
        return builtInSymbol2;
      }

      const standardClass2 = await self.resolveStandardApexClass(
        typeReference.name,
      );
      if (standardClass2) {
        self.logger.debug(
          () =>
            `Resolved GENERIC_PARAMETER_TYPE "${typeReference.name}" to standard Apex class: ${standardClass2.name}`,
        );
        return standardClass2;
      }

      return null;
    }

    if (position) {
      const scopeResolvedSymbol = resolveUnqualRefByScopeOp(
        self,
        typeReference,
        sourceFile,
        position,
      );
      if (scopeResolvedSymbol !== null) {
        return scopeResolvedSymbol;
      }
    }

    const candidates2 = await self.findSymbolByName(typeReference.name);

    if (candidates2.length === 0) {
      return null;
    }

    const sameFileCandidates = candidates2.filter(
      (symbol) =>
        symbol.fileUri === sourceFile || symbol.key.path[0] === sourceFile,
    );

    if (sameFileCandidates.length > 0) {
      return selectMostSpecificOp(sameFileCandidates, sourceFile);
    }

    const accessibleCandidates = candidates2.filter((symbol) =>
      isSymAccessibleOp(symbol, sourceFile),
    );

    if (accessibleCandidates.length > 0) {
      return selectMostSpecificOp(accessibleCandidates, sourceFile);
    }

    return candidates2[0];
  } catch (_error) {
    return null;
  }
}
