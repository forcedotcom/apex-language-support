// Worker exports for web extension
// This file is separate from index.ts to avoid Jest parsing issues with import.meta

export { createSimpleWebWorkerLanguageServer } from './worker';
export type { WebWorkerLanguageServerOptions, EnvironmentType } from './types';
