/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// This file exports the public API for the @salesforce/apex-lsp-parser-ast package

// Export base listener
export * from './parser/listeners/BaseApexParserListener';

// Export symbol collector listener
export * from './parser/listeners/ApexSymbolCollectorListener';

// Export error listener
export * from './parser/listeners/ApexErrorListener';

// Export type definitions
export * from './types/typeInfo';
export * from './types/symbol';
export * from './types/qname';
export * from './types/source';
export * from './types/unitType';
export * from './types/classInfo';

// Export compiler service
export * from './parser/compilerService';

// Export resource utilities
export * from './utils/ResourceUtils';

// Export platform-specific utilities
export * from './utils/PlatformUtils';

// Export utils
export * from './utils/AnnotationUtils';

// Export semantic validators
export * from './sematics/modifiers/index';
export * from './sematics/annotations/index';
