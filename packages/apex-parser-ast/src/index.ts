/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// This file exports the public API for the @salesforce/apex-lsp-parser-ast package

// Export base listener
export * from './parser/listeners/BaseApexParserListener.js';

// Export symbol collector listener
export * from './parser/listeners/ApexSymbolCollectorListener.js';

// Export type definitions
export * from './types/typeInfo.js';
export * from './types/symbol.js';
export * from './types/qname.js';
export * from './types/source.js';
export * from './types/unitType.js';

// Export compiler service
export * from './parser/compilerService.js';

// Export resource utilities
export * from './utils/ResourceUtils.js';

// Export platform-specific utilities
export * from './utils/PlatformUtils.js';

// Export utils
export * from './utils/AnnotationUtils.js';

// Export semantic validators
export * from './sematics/modifiers/index.js';
export * from './sematics/annotations/index.js';
