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

// Export full symbol collector listener (wrapper using layered listeners)
export * from './parser/listeners/FullSymbolCollectorListener';

// Export reference collection and resolution components
export * from './parser/listeners/ApexReferenceCollectorListener';
export * from './parser/references/ApexReferenceResolver';

// Export layered symbol listeners
export * from './parser/listeners/LayeredSymbolListenerBase';
export * from './parser/listeners/PublicAPISymbolListener';
export * from './parser/listeners/ProtectedSymbolListener';
export * from './parser/listeners/PrivateSymbolListener';
// Export ListenerApplicationManager but exclude ParseTreeResult (already exported from compilerService)
export {
  ListenerApplicationManager,
  type ListenerApplicationOptions,
} from './parser/listeners/ListenerApplicationManager';
// Export ListenerFactory for creating service-appropriate listeners
export * from './parser/listeners/ListenerFactory';

// Export error listener
export * from './parser/listeners/ApexErrorListener';

// Export folding range listener
export * from './parser/listeners/ApexFoldingRangeListener';

// Export comment collection and association
export * from './parser/listeners/ApexCommentCollectorListener';
export * from './utils/CommentAssociator';

// Export type definitions
export * from './types/typeInfo';
export * from './types/symbol';
export * from './types/symbolReference';
export * from './types/referenceVertex';
export * from './types/qname';
export * from './types/source';
export * from './types/unitType';
export * from './types/classInfo';
export * from './types/ISymbolManager';
export * from './types/graph';

// Export namespace resolution types and components
export * from './namespace/NamespaceUtils';
export * from './utils/BuiltInTypeTables';
export * from './namespace/ResolutionRules';

// Export compiler service
export * from './parser/compilerService';
// Export resource utilities
export * from './utils/ResourceUtils';
export * from './utils/resourceLoader';
export * from './utils/embeddedStandardLibrary';

// Export platform-specific utilities
export * from './utils/PlatformUtils';

// Export utils
export * from './utils/AnnotationUtils';
export * from './utils/symbolNarrowing';
export * from './utils/FQNUtils';
export * from './utils/ApexKeywords';

// Export cross-file symbol management
export * from './symbols/ApexSymbolManager';
export * from './symbols/ApexSymbolProcessingManager';
export * from './symbols/ProgressiveEnhancementService';

// Export resolution framework types
export * from './symbols/resolution/types';

// Export reference graph and types
export * from './symbols/ApexSymbolGraph';

// Export background processing components
export * from './symbols/ApexSymbolIndexingService';
export * from './symbols/ApexSymbolProcessingManager';

// Export semantic validators
export * from './semantics/modifiers/index';
export * from './semantics/annotations/index';

// Export protocol handler utilities
export * from './types/ProtocolHandler';

// Export queue components
export * from './queue/priority-scheduler-utils';
// Export queue types (includes Priority and AllPriorities re-exported from shared)
export * from './types/queue';

// Export registry components
export * from './registry';

// Export scheduler initialization service
export * from './scheduler/SchedulerInitializationService';

// Export protobuf cache components
export * from './cache';
