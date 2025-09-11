/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Core interfaces and types
export type {
  TextDocumentContentProvider,
  LanguageServerClient,
  EditorContext,
  UriLike,
  ApexLibConfig,
  ApexLibManager,
} from './types';

// Protocol handler for content resolution
export { ApexLibProtocolHandler } from './protocol-handler';

// Document support for file management
export { ApexLibDocumentSupport } from './document-support';

// Manager for orchestrating all components
export {
  ApexLibManagerImpl,
  createApexLibManager,
  createApexLibManagerWithConfig,
} from './manager';
