/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Worker bindings for the cross-file resolution substrate, which lives in
 * `@salesforce/apex-lsp-compliant-services`. The package takes the data-owner
 * assistance transport as a parameter; these wrappers default it to the worker
 * transport installed by the platform shell, so worker callers keep their
 * existing signatures.
 *
 * Imported with an explicit .ts extension for tsx-in-worker resolution (see
 * runtimeContext.ts for the rationale).
 */

import {
  hasCompleteLocalSObjectTable,
  hasCompleteLocalSymbolTable,
  loadReferencedTypesViaAssistance,
  recompileCursorFileAtFullDetail,
  resolveMissingNamesViaAssistance,
  type SymbolManagerHost,
} from '@salesforce/apex-lsp-compliant-services';
import { requestCoordinatorAssistancePromiseShared } from './runtimeContext.ts';

export {
  hasCompleteLocalSObjectTable,
  hasCompleteLocalSymbolTable,
  recompileCursorFileAtFullDetail,
};

/**
 * Cross-worker symbol resolution fallback: query the data owner for names the
 * local index misses and ingest the owning tables. `queryByName` is injectable
 * so the ingestion contract can be unit-tested without a live assistance bus;
 * it defaults to the worker's coordinator-assistance transport.
 */
export const resolveMissingNamesViaDataOwner = (
  svc: SymbolManagerHost,
  names: readonly string[],
  queryByName: (
    method: string,
    params: unknown,
    blocking: boolean,
  ) => Promise<unknown> = requestCoordinatorAssistancePromiseShared,
  namespace?: string,
  excludedFileUris?: Set<string>,
): Promise<number> =>
  resolveMissingNamesViaAssistance(
    svc,
    names,
    queryByName,
    namespace,
    excludedFileUris,
  );

/** Load the data-owner tables for a file's referenced types. */
export const loadReferencedTypesForFile = (
  svc: SymbolManagerHost,
  uri: string,
): Promise<number> =>
  loadReferencedTypesViaAssistance(
    svc,
    uri,
    requestCoordinatorAssistancePromiseShared,
  );
