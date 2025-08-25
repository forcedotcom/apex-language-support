// Mock for worker files to avoid import.meta issues in Jest Node.js environment
export function createSimpleWebWorkerLanguageServer() {
  // Mock implementation for testing
  return Promise.resolve();
}

// Mock any other exports that might be needed
export const mockWorker = {
  createSimpleWebWorkerLanguageServer,
};
