/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export functionality from both language server harnesses
export {
  ExtensionApexLanguageServerHarness,
  createExtensionLanguageServerHarness,
} from './extensionServer/extensionLanguageServerHarness';

export {
  WebLanguageServerHarness,
  createWebLanguageServerHarness,
} from './webServer/webLanguageServerHarness';
