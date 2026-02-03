/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DetailLevel } from '../parser/listeners/LayeredSymbolListenerBase';

/**
 * Base interface for operation prerequisites
 * Defines common prerequisites needed by various parser-ast operations
 */
export interface OperationPrerequisites {
  /** Required detail level */
  requiredDetailLevel: DetailLevel | null;

  /** Whether symbol references are needed */
  requiresReferences: boolean;

  /** Whether cross-file resolution is needed */
  requiresCrossFileResolution: boolean;
}

/**
 * Prerequisites for semantic validation operations
 */
export interface ValidatorPrerequisites extends OperationPrerequisites {}

/**
 * Prerequisites for single-file symbol lookup operations
 * Used for operations that work on a single file/symbol (hover, definition)
 */
export interface SingleFileSymbolLookupPrerequisites
  extends OperationPrerequisites {}

/**
 * Prerequisites for workspace-wide operations
 * Used for operations that require the entire workspace to be loaded
 * (references, completion, workspace symbol)
 */
export interface WorkspaceWideOperationPrerequisites
  extends OperationPrerequisites {
  /** Whether the entire workspace must be loaded */
  requiresWorkspaceLoad: boolean;

  /** Whether to include private symbols */
  includePrivate: boolean;

  /** Whether to include protected symbols */
  includeProtected: boolean;
}
