/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Interface for Apex storage implementations
 */
export interface ApexStorage {
  /**
   * Initializes the storage
   */
  initialize(): Promise<void>;

  /**
   * Gets a document from storage
   */
  getDocument(uri: string): Promise<TextDocument | undefined>;

  /**
   * Sets a document in storage
   */
  setDocument(uri: string, document: TextDocument): Promise<void>;

  /**
   * Clears a file from storage
   */
  clearFile(uri: string): Promise<void>;

  /**
   * Clears all files from storage
   */
  clearAll(): Promise<void>;
}
