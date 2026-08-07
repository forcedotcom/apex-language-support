/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  DetailLevel,
  SObjectRegistry,
  SymbolTable,
  ReferenceContext,
  type SymbolReference,
} from '@salesforce/apex-lsp-parser-ast';
import type {
  IdentifierSpec,
  MissingArtifactIdentifierType,
} from '@salesforce/apex-lsp-shared';

type ArtifactEvidence = Pick<SymbolReference, 'name'> &
  Partial<
    Pick<SymbolReference, 'context' | 'isSObject'> &
      Pick<IdentifierSpec, 'identifierType' | 'searchHints'>
  >;

/**
 * Classify a missing identifier using only deterministic parser evidence.
 * Ambiguous names remain Apex classes.
 */
export function classifyMissingArtifactIdentifier(
  evidence: ArtifactEvidence,
): MissingArtifactIdentifierType {
  const hasTriggerEvidence =
    evidence.identifierType === 'trigger' ||
    evidence.searchHints?.some(
      (hint) => hint.expectedFileType === 'trigger',
    ) === true;
  if (hasTriggerEvidence) {
    return 'trigger';
  }
  if (
    evidence.isSObject === true ||
    evidence.context === ReferenceContext.SOQL_FROM_TYPE ||
    SObjectRegistry.isCustomSObjectName(evidence.name)
  ) {
    return 'sobject';
  }
  return 'apex-class';
}

/**
 * Get the numeric order of a detail level for comparison
 * Higher numbers indicate more detail
 */
export function getLayerOrderIndex(level: DetailLevel): number {
  const order: Record<DetailLevel, number> = {
    'public-api': 1,
    protected: 2,
    private: 3,
    full: 4,
  };
  return order[level] ?? 0;
}

/**
 * Check if a SymbolTable has references
 */
export function hasReferences(
  symbolTable: SymbolTable | null | undefined,
): boolean {
  if (!symbolTable) {
    return false;
  }
  // SymbolTable has a references array - check if it has any
  const refs = symbolTable.getAllReferences();
  return refs.length > 0;
}

/**
 * Check if cross-file references have been resolved for a file
 * Returns true if there are no unresolved type references that could be cross-file.
 *
 * The original implementation incorrectly returned true if ANY references were resolved,
 * but same-file references get resolved during enrichment, causing cross-file resolution
 * to be skipped even when unresolved types (like "Foo") still need to be loaded.
 *
 * @param symbolTable The symbol table to check
 */
export function hasCrossFileResolution(
  symbolTable: SymbolTable | null | undefined,
): boolean {
  if (!symbolTable) {
    return false;
  }
  const refs = symbolTable.getAllReferences();
  if (refs.length === 0) {
    return false;
  }

  // Check for unresolved type references that could potentially be cross-file types.
  // Includes RETURN_TYPE and PARAMETER_TYPE in addition to TYPE_DECLARATION and
  // CONSTRUCTOR_CALL because ApexReferenceResolver resolves all of these via
  // resolveTypeReference (which loads stdlib classes via resolveStandardApexClass).
  const unresolvedTypeRefs = refs.filter(
    (ref) =>
      !ref.resolvedSymbolId &&
      (ref.context === ReferenceContext.TYPE_DECLARATION ||
        ref.context === ReferenceContext.CONSTRUCTOR_CALL ||
        ref.context === ReferenceContext.RETURN_TYPE ||
        ref.context === ReferenceContext.PARAMETER_TYPE ||
        ref.context === ReferenceContext.SOQL_FROM_TYPE),
  );

  // No policy-based bypass: all unresolved type refs need cross-file resolution.
  // Standard Apex classes (System, List, etc.) go through the same resolution path as user types.
  const unresolvedCrossFileTypes = unresolvedTypeRefs;

  // If there are unresolved cross-file type references, cross-file resolution is still needed
  if (unresolvedCrossFileTypes.length > 0) {
    return false;
  }

  // All type references are resolved, so cross-file resolution has been completed
  return true;
}
