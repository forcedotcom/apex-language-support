/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * TypeScript declaration for ZIP file imports.
 * esbuild handles .zip files with the dataurl loader, returning a base64-encoded data URL.
 */
declare module '*.zip' {
  const content: string;
  export default content;
}

