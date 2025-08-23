/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Node.js exports - includes full CompilerService with antlr4ts dependencies

// Export everything from the main index
export * from './index';

// Additionally export the full CompilerService for Node.js environments
export { CompilerService } from './parser/compilerService';