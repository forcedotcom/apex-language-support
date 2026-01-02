/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  SymbolTable,
  ApexSymbol,
  SymbolKind,
  ScopeSymbol,
  SymbolVisibility,
  VariableSymbol,
} from '../../types/symbol';
import {
  SymbolReference,
  ReferenceContext,
  ChainedSymbolReference,
} from '../../types/symbolReference';
import { isChainedSymbolReference } from '../../utils/symbolNarrowing';
import { isBlockSymbol } from '../../utils/symbolNarrowing';

/**
 * Service that resolves symbol references to their definitions.
 * Works with any SymbolTable, regardless of how symbols were collected.
 * Can be used by layered listeners or the full symbol collector.
 */
export class ApexReferenceResolver {
  private readonly logger = getLogger();

  /**
   * Resolve all same-file references in a SymbolTable
   * @param symbolTable The symbol table containing references to resolve
   * @param fileUri Optional file URI for filtering (if not provided, uses symbolTable's fileUri)
   * @returns Resolution result with counts
   */
  resolveSameFileReferences(
    symbolTable: SymbolTable,
    fileUri?: string,
  ): {
    resolvedCount: number;
    correctedCount: number;
  } {
    const typeReferences = symbolTable.getAllReferences();
    let correctedCount = 0;
    let resolvedCount = 0;

    // Step 1: Correct reference contexts (VARIABLE_USAGE -> CLASS_REFERENCE, etc.)
    for (const ref of typeReferences) {
      if (ref.context !== ReferenceContext.VARIABLE_USAGE) {
        continue;
      }

      const shouldBeClassRef = this.shouldBeClassReference(ref, symbolTable);
      if (shouldBeClassRef) {
        this.logger.debug(
          () =>
            `[ApexReferenceResolver] Upgrading VARIABLE_USAGE "${ref.name}" ` +
            'to CLASS_REFERENCE',
        );
        ref.context = ReferenceContext.CLASS_REFERENCE;
        correctedCount++;
      }
    }

    // Step 2: Resolve all same-file references to their symbol definitions
    for (const ref of typeReferences) {
      // Skip if already resolved
      if (ref.resolvedSymbolId) {
        continue;
      }

      // Get scope hierarchy for this reference's position
      const position = {
        line: ref.location.identifierRange.startLine,
        character: ref.location.identifierRange.startColumn,
      };
      const scopeHierarchy = symbolTable.getScopeHierarchy(position);
      const containingScope =
        scopeHierarchy.length > 0
          ? scopeHierarchy[scopeHierarchy.length - 1]
          : null;

      // Resolve based on context
      const resolvedSymbol = this.resolveSameFileReference(
        ref,
        containingScope,
        scopeHierarchy,
        symbolTable,
      );

      // For chained references with variable method calls (e.g., "base64Data.toString()"),
      // only set resolvedSymbolId on the chained reference if we resolved the full chain
      if (resolvedSymbol) {
        const isVariableMethodCall =
          isChainedSymbolReference(ref) &&
          ref.chainNodes &&
          ref.chainNodes.length >= 2 &&
          resolvedSymbol.kind === SymbolKind.Variable;

        if (!isVariableMethodCall) {
          ref.resolvedSymbolId = resolvedSymbol.id;
          resolvedCount++;
        }
      }

      // If this is a TYPE_DECLARATION reference that was resolved, update variable/field/property/parameter
      // symbols that use this type to set their type.resolvedSymbol
      if (
        ref.context === ReferenceContext.TYPE_DECLARATION &&
        resolvedSymbol &&
        (resolvedSymbol.kind === SymbolKind.Class ||
          resolvedSymbol.kind === SymbolKind.Interface ||
          resolvedSymbol.kind === SymbolKind.Enum)
      ) {
        this.updateTypeResolvedSymbolForDeclarations(
          ref,
          resolvedSymbol,
          scopeHierarchy,
          symbolTable,
          fileUri || symbolTable.getFileUri(),
        );
      }

      // For chained references, ensure chain nodes are also resolved
      if (isChainedSymbolReference(ref) && ref.chainNodes) {
        for (const chainNode of ref.chainNodes) {
          if (!chainNode.resolvedSymbolId) {
            const nodePosition = {
              line: chainNode.location.identifierRange.startLine,
              character: chainNode.location.identifierRange.startColumn,
            };
            const nodeScopeHierarchy =
              symbolTable.getScopeHierarchy(nodePosition);
            const nodeContainingScope =
              nodeScopeHierarchy.length > 0
                ? nodeScopeHierarchy[nodeScopeHierarchy.length - 1]
                : null;

            const nodeResolvedSymbol = this.resolveSameFileReference(
              chainNode,
              nodeContainingScope,
              nodeScopeHierarchy,
              symbolTable,
            );

            if (nodeResolvedSymbol) {
              chainNode.resolvedSymbolId = nodeResolvedSymbol.id;
            }
          }
        }
      }
    }

    if (correctedCount > 0) {
      this.logger.debug(
        () =>
          `[ApexReferenceResolver] Corrected ${correctedCount} reference ` +
          'context(s)',
      );
    }

    if (resolvedCount > 0) {
      this.logger.debug(
        () =>
          `[ApexReferenceResolver] Resolved ${resolvedCount} same-file ` +
          'reference(s) to their symbol definitions',
      );
    }

    return { resolvedCount, correctedCount };
  }

  /**
   * Determine if a VARIABLE_USAGE reference should be CLASS_REFERENCE
   * Uses the symbol table's own symbols to check if the name is a class
   */
  private shouldBeClassReference(
    ref: SymbolReference,
    symbolTable: SymbolTable,
  ): boolean {
    // Check if this is a qualifier in a qualified call or base expression in a chain
    const isQualifierOrBase =
      this.isQualifierInQualifiedCall(ref, symbolTable) ||
      this.isBaseExpressionInChain(ref, symbolTable);

    if (isQualifierOrBase) {
      return true;
    }

    // Check if this name resolves to a class in the current symbol table
    const allSymbols = symbolTable.getAllSymbols();
    const classCandidates = allSymbols.filter(
      (s) =>
        (s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface) &&
        s.name === ref.name,
    );

    return classCandidates.length > 0;
  }

  /**
   * Check if a reference is a qualifier in a qualified method call
   */
  private isQualifierInQualifiedCall(
    ref: SymbolReference,
    symbolTable: SymbolTable,
  ): boolean {
    const allRefs = symbolTable.getAllReferences();
    const sameLineRefs = allRefs.filter(
      (r) =>
        r.location.identifierRange.startLine ===
        ref.location.identifierRange.startLine,
    );

    for (const otherRef of sameLineRefs) {
      if (
        otherRef.context === ReferenceContext.METHOD_CALL &&
        otherRef.location.identifierRange.startColumn >
          ref.location.identifierRange.endColumn
      ) {
        if (isChainedSymbolReference(otherRef)) {
          const chainNodes = otherRef.chainNodes;
          if (
            chainNodes &&
            chainNodes.length >= 2 &&
            chainNodes[0].name === ref.name
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if a reference is the base expression in a chained expression
   */
  private isBaseExpressionInChain(
    ref: SymbolReference,
    symbolTable: SymbolTable,
  ): boolean {
    const allRefs = symbolTable.getAllReferences();
    const sameLineRefs = allRefs.filter(
      (r) =>
        r.location.identifierRange.startLine ===
        ref.location.identifierRange.startLine,
    );

    for (const otherRef of sameLineRefs) {
      if (isChainedSymbolReference(otherRef)) {
        const chainNodes = otherRef.chainNodes;
        if (chainNodes && chainNodes.length > 0) {
          const firstNode = chainNodes[0];
          const refRange = ref.location.identifierRange;
          const nodeRange = firstNode.location.identifierRange;
          if (
            firstNode.name === ref.name &&
            nodeRange.startLine === refRange.startLine &&
            nodeRange.startColumn === refRange.startColumn &&
            nodeRange.endColumn === refRange.endColumn
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Resolve a same-file symbol reference to its definition
   */
  private resolveSameFileReference(
    ref: SymbolReference,
    containingScope: ScopeSymbol | null,
    scopeHierarchy: ScopeSymbol[],
    symbolTable: SymbolTable,
  ): ApexSymbol | null {
    const allSymbols = symbolTable.getAllSymbols();

    switch (ref.context) {
      case ReferenceContext.VARIABLE_USAGE:
        return this.resolveVariableUsage(
          ref,
          containingScope,
          scopeHierarchy,
          allSymbols,
          symbolTable,
        );

      case ReferenceContext.METHOD_CALL:
        return this.resolveMethodCall(ref, containingScope, allSymbols);

      case ReferenceContext.FIELD_ACCESS:
        return this.resolveFieldAccess(ref, containingScope, allSymbols);

      case ReferenceContext.CONSTRUCTOR_CALL:
        return this.resolveConstructorCall(ref, allSymbols);

      case ReferenceContext.CLASS_REFERENCE:
      case ReferenceContext.TYPE_DECLARATION:
      case ReferenceContext.PARAMETER_TYPE:
      case ReferenceContext.RETURN_TYPE:
        return this.resolveTypeReference(ref, allSymbols);

      case ReferenceContext.VARIABLE_DECLARATION:
      case ReferenceContext.PROPERTY_REFERENCE:
        return this.resolveDeclarationReference(
          ref,
          containingScope,
          scopeHierarchy,
          allSymbols,
        );

      case ReferenceContext.CHAINED_TYPE:
        return this.resolveChainedReference(
          ref,
          containingScope,
          scopeHierarchy,
          allSymbols,
          symbolTable,
        );

      default:
        return symbolTable.lookup(ref.name, containingScope) || null;
    }
  }

  /**
   * Resolve a VARIABLE_USAGE reference using scope-based lookup
   */
  private resolveVariableUsage(
    ref: SymbolReference,
    containingScope: ScopeSymbol | null,
    scopeHierarchy: ScopeSymbol[],
    allSymbols: ApexSymbol[],
    symbolTable: SymbolTable,
  ): ApexSymbol | null {
    const innermostToOutermost = [...scopeHierarchy].reverse();

    for (const scope of innermostToOutermost) {
      const symbolsInScope = allSymbols.filter(
        (s) =>
          s.name?.toLowerCase() === ref.name.toLowerCase() &&
          s.parentId === scope.id &&
          (s.kind === SymbolKind.Variable ||
            s.kind === SymbolKind.Parameter ||
            s.kind === SymbolKind.Field),
      );

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
        return prioritized[0];
      }
    }

    return symbolTable.lookup(ref.name, null) || null;
  }

  /**
   * Resolve a METHOD_CALL reference
   */
  private resolveMethodCall(
    ref: SymbolReference,
    containingScope: ScopeSymbol | null,
    allSymbols: ApexSymbol[],
  ): ApexSymbol | null {
    let currentScope = containingScope;
    while (currentScope) {
      if (currentScope.scopeType === 'class') {
        const methods = allSymbols.filter(
          (s) =>
            s.name === ref.name &&
            s.parentId === currentScope!.id &&
            (s.kind === SymbolKind.Method ||
              s.kind === SymbolKind.Constructor),
        );
        if (methods.length > 0) {
          return (
            methods.find((m) => m.kind === SymbolKind.Method) || methods[0]
          );
        }
      }

      if (currentScope.parentId) {
        const parent = allSymbols.find(
          (s) => s.id === currentScope!.parentId && s.kind === SymbolKind.Block,
        ) as ScopeSymbol | undefined;
        currentScope = parent || null;
      } else {
        currentScope = null;
      }
    }

    const allMethods = allSymbols.filter(
      (s) =>
        s.name === ref.name &&
        (s.kind === SymbolKind.Method || s.kind === SymbolKind.Constructor),
    );
    return allMethods.length > 0 ? allMethods[0] : null;
  }

  /**
   * Resolve a FIELD_ACCESS reference
   */
  private resolveFieldAccess(
    ref: SymbolReference,
    containingScope: ScopeSymbol | null,
    allSymbols: ApexSymbol[],
  ): ApexSymbol | null {
    let currentScope = containingScope;
    while (currentScope) {
      if (currentScope.scopeType === 'class') {
        const fields = allSymbols.filter(
          (s) =>
            s.name === ref.name &&
            s.parentId === currentScope!.id &&
            (s.kind === SymbolKind.Field || s.kind === SymbolKind.Property),
        );
        if (fields.length > 0) {
          return fields[0];
        }
      }

      if (currentScope.parentId) {
        const parent = allSymbols.find(
          (s) => s.id === currentScope!.parentId && s.kind === SymbolKind.Block,
        ) as ScopeSymbol | undefined;
        currentScope = parent || null;
      } else {
        currentScope = null;
      }
    }

    return null;
  }

  /**
   * Resolve a CONSTRUCTOR_CALL reference
   */
  private resolveConstructorCall(
    ref: SymbolReference,
    allSymbols: ApexSymbol[],
  ): ApexSymbol | null {
    const classSymbol = allSymbols.find(
      (s) =>
        s.name === ref.name &&
        (s.kind === SymbolKind.Class ||
          s.kind === SymbolKind.Interface ||
          s.kind === SymbolKind.Enum),
    );

    if (!classSymbol) {
      return null;
    }

    const constructor = allSymbols.find(
      (s) =>
        s.name === ref.name &&
        s.kind === SymbolKind.Constructor &&
        s.parentId === classSymbol.id,
    );

    return constructor || null;
  }

  /**
   * Resolve a type reference (CLASS_REFERENCE, TYPE_DECLARATION, etc.)
   */
  private resolveTypeReference(
    ref: SymbolReference,
    allSymbols: ApexSymbol[],
  ): ApexSymbol | null {
    return (
      allSymbols.find(
        (s) =>
          s.name === ref.name &&
          (s.kind === SymbolKind.Class ||
            s.kind === SymbolKind.Interface ||
            s.kind === SymbolKind.Enum),
      ) || null
    );
  }

  /**
   * Resolve a declaration reference (VARIABLE_DECLARATION, PROPERTY_REFERENCE)
   */
  private resolveDeclarationReference(
    ref: SymbolReference,
    containingScope: ScopeSymbol | null,
    scopeHierarchy: ScopeSymbol[],
    allSymbols: ApexSymbol[],
  ): ApexSymbol | null {
    if (ref.context === ReferenceContext.VARIABLE_DECLARATION) {
      const variables = allSymbols.filter(
        (s) =>
          s.name?.toLowerCase() === ref.name.toLowerCase() &&
          s.parentId === containingScope?.id &&
          (s.kind === SymbolKind.Variable ||
            s.kind === SymbolKind.Parameter ||
            s.kind === SymbolKind.Field),
      );
      return variables.length > 0 ? variables[0] : null;
    }

    if (ref.context === ReferenceContext.PROPERTY_REFERENCE) {
      const properties = allSymbols.filter(
        (s) =>
          s.name === ref.name &&
          s.parentId === containingScope?.id &&
          s.kind === SymbolKind.Property,
      );
      return properties.length > 0 ? properties[0] : null;
    }

    return null;
  }

  /**
   * Resolve a CHAINED_TYPE reference
   */
  private resolveChainedReference(
    ref: SymbolReference,
    containingScope: ScopeSymbol | null,
    scopeHierarchy: ScopeSymbol[],
    allSymbols: ApexSymbol[],
    symbolTable: SymbolTable,
  ): ApexSymbol | null {
    if (!isChainedSymbolReference(ref) || !ref.chainNodes) {
      return null;
    }

    if (ref.chainNodes.length >= 2) {
      const firstNode = ref.chainNodes[0];
      const lastNode = ref.chainNodes[ref.chainNodes.length - 1];

      // Try to resolve the first node as a variable
      const nodePosition = {
        line: firstNode.location.identifierRange.startLine,
        character: firstNode.location.identifierRange.startColumn,
      };
      const nodeScopeHierarchy = symbolTable.getScopeHierarchy(nodePosition);
      const nodeContainingScope =
        nodeScopeHierarchy.length > 0
          ? nodeScopeHierarchy[nodeScopeHierarchy.length - 1]
          : null;

      let firstNodeSymbol = symbolTable.lookup(
        firstNode.name,
        nodeContainingScope,
      );
      if (
        firstNodeSymbol &&
        (firstNodeSymbol.kind === SymbolKind.Variable ||
          firstNodeSymbol.kind === SymbolKind.Parameter ||
          firstNodeSymbol.kind === SymbolKind.Field ||
          firstNodeSymbol.kind === SymbolKind.Property)
      ) {
        firstNode.resolvedSymbolId = firstNodeSymbol.id;

        const variableType =
          firstNodeSymbol.kind === SymbolKind.Variable ||
          firstNodeSymbol.kind === SymbolKind.Parameter
            ? (firstNodeSymbol as VariableSymbol).type
            : (firstNodeSymbol as any).type;

        if (
          variableType &&
          lastNode.context === ReferenceContext.METHOD_CALL &&
          !variableType.isBuiltIn
        ) {
          const typeName = variableType.name;
          const typeSymbol = allSymbols.find(
            (s) =>
              s.name === typeName &&
              (s.kind === SymbolKind.Class ||
                s.kind === SymbolKind.Interface),
          );

          if (typeSymbol) {
            const typeClassBlock = allSymbols.find(
              (s) =>
                isBlockSymbol(s) &&
                s.scopeType === 'class' &&
                s.parentId === typeSymbol.id,
            ) as ScopeSymbol | undefined;

            if (typeClassBlock) {
              const methodSymbol = allSymbols.find(
                (s) =>
                  s.kind === SymbolKind.Method &&
                  s.name === lastNode.name &&
                  s.parentId === typeClassBlock.id,
              );
              if (methodSymbol) {
                lastNode.resolvedSymbolId = methodSymbol.id;
                return methodSymbol;
              }
            }
          }
        }

        return firstNodeSymbol;
      }

      // If not a variable, try to resolve as a class/type
      const qualifierSymbol = this.resolveTypeReference(firstNode, allSymbols);
      if (!qualifierSymbol) {
        return null;
      }

      firstNode.resolvedSymbolId = qualifierSymbol.id;

      const classBlock = allSymbols.find(
        (s) =>
          isBlockSymbol(s) &&
          s.scopeType === 'class' &&
          s.parentId === qualifierSymbol.id,
      ) as ScopeSymbol | undefined;

      if (!classBlock) {
        return null;
      }

      if (lastNode.context === ReferenceContext.METHOD_CALL) {
        const methodSymbol = allSymbols.find(
          (s) =>
            s.kind === SymbolKind.Method &&
            s.name === lastNode.name &&
            s.parentId === classBlock.id,
        );
        if (methodSymbol) {
          lastNode.resolvedSymbolId = methodSymbol.id;
          return methodSymbol;
        }
      } else if (lastNode.context === ReferenceContext.FIELD_ACCESS) {
        const fieldSymbol = allSymbols.find(
          (s) =>
            (s.kind === SymbolKind.Field ||
              s.kind === SymbolKind.Property) &&
            s.name === lastNode.name &&
            s.parentId === classBlock.id,
        );
        if (fieldSymbol) {
          lastNode.resolvedSymbolId = fieldSymbol.id;
          return fieldSymbol;
        }
      }

      return qualifierSymbol;
    } else if (ref.chainNodes.length === 1) {
      const nodePosition = {
        line: ref.chainNodes[0].location.identifierRange.startLine,
        character: ref.chainNodes[0].location.identifierRange.startColumn,
      };
      const nodeScopeHierarchy = symbolTable.getScopeHierarchy(nodePosition);
      const nodeContainingScope =
        nodeScopeHierarchy.length > 0
          ? nodeScopeHierarchy[nodeScopeHierarchy.length - 1]
          : null;

      const variableSymbol = symbolTable.lookup(
        ref.chainNodes[0].name,
        nodeContainingScope,
      );
      if (
        variableSymbol &&
        (variableSymbol.kind === SymbolKind.Variable ||
          variableSymbol.kind === SymbolKind.Parameter ||
          variableSymbol.kind === SymbolKind.Field ||
          variableSymbol.kind === SymbolKind.Property)
      ) {
        ref.chainNodes[0].resolvedSymbolId = variableSymbol.id;
        return variableSymbol;
      }

      const resolved = this.resolveTypeReference(
        ref.chainNodes[0],
        allSymbols,
      );
      if (resolved) {
        ref.chainNodes[0].resolvedSymbolId = resolved.id;
      }
      return resolved;
    }

    return null;
  }

  /**
   * Update type.resolvedSymbol for variable/field/property/parameter declarations
   */
  private updateTypeResolvedSymbolForDeclarations(
    ref: SymbolReference,
    resolvedTypeSymbol: ApexSymbol,
    scopeHierarchy: ScopeSymbol[],
    symbolTable: SymbolTable,
    fileUri: string,
  ): void {
    const allSymbols = symbolTable.getAllSymbols();
    const typeName = ref.name;
    const refLine = ref.location.identifierRange.startLine;

    const candidateSymbols = allSymbols.filter((s) => {
      if (
        s.kind !== SymbolKind.Variable &&
        s.kind !== SymbolKind.Parameter &&
        s.kind !== SymbolKind.Field &&
        s.kind !== SymbolKind.Property
      ) {
        return false;
      }

      if (s.fileUri !== fileUri) {
        return false;
      }

      const symbolLine = s.location.identifierRange.startLine;
      if (Math.abs(symbolLine - refLine) > 2) {
        return false;
      }

      const isInScopeHierarchy = scopeHierarchy.some(
        (scope) => s.parentId === scope.id,
      );
      if (!isInScopeHierarchy) {
        return false;
      }

      return true;
    });

    for (const symbol of candidateSymbols) {
      let typeInfo: any;
      if (
        symbol.kind === SymbolKind.Variable ||
        symbol.kind === SymbolKind.Parameter
      ) {
        typeInfo = (symbol as VariableSymbol).type;
      } else if (
        symbol.kind === SymbolKind.Field ||
        symbol.kind === SymbolKind.Property
      ) {
        typeInfo = (symbol as any).type;
      }

      if (typeInfo && typeInfo.name === typeName && !typeInfo.resolvedSymbol) {
        typeInfo.resolvedSymbol = resolvedTypeSymbol;
        this.logger.debug(
          () =>
            '[ApexReferenceResolver] Set type.resolvedSymbol ' +
            `for ${symbol.kind} "${symbol.name}" to ${resolvedTypeSymbol.kind} "${resolvedTypeSymbol.name}"`,
        );
      }
    }
  }
}

