/*
 * Copyright (c) 2024, Salesforce, Inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Shared type definitions for LSP-compliant services
 */

/**
 * Generic interface for document change events
 * Compatible with both Node.js and browser versions of VSCode Language Server
 */
export interface TextDocumentChangeEvent<T> {
  document: T;
}
