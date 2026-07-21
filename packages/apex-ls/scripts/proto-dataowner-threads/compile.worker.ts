/**
 * Compile worker thread — mirrors the production compile closure at worker.platform.shared.ts:1413-1424
 */
import { parentPort } from 'node:worker_threads';
import {
  CompilerService,
  VisibilitySymbolListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';

// cloneForWire — same shape as worker.platform.shared.ts:1460-1467
function cloneForWire(st: SymbolTable, fileUri: string) {
  return {
    symbols: st.getAllSymbols(),
    references: st.getAllReferences(),
    hierarchicalReferences: st.getAllHierarchicalReferences(),
    metadata: st.getMetadata(),
    fileUri,
  };
}

const compilerService = new CompilerService();

parentPort?.on(
  'message',
  (msg: { id: number; uri: string; content: string }) => {
    const t0 = performance.now();

    try {
      // Compile
      const table = new SymbolTable();
      const listener = new VisibilitySymbolListener('public-api', table);
      const result = compilerService.compile(msg.content, msg.uri, listener, {
        collectReferences: true,
        resolveReferences: true,
      });

      const t1 = performance.now();

      if (!result) {
        parentPort?.postMessage({
          id: msg.id,
          error: 'compile returned null',
          t_compile: t1 - t0,
        });
        return;
      }

      const symbolTable =
        result.result instanceof SymbolTable ? result.result : table;

      // Serialize (cloneForWire) — force JSON round-trip to strip non-serializable data
      const wireData = cloneForWire(symbolTable, msg.uri);
      const serialized = JSON.parse(JSON.stringify(wireData));
      const t2 = performance.now();

      // Count symbols/references
      const symbolCount = serialized.symbols.length;
      const referenceCount = serialized.references.length;

      // postMessage structured-clone happens here; we measure at boundary on main thread
      parentPort?.postMessage({
        id: msg.id,
        serialized,
        symbolCount,
        referenceCount,
        t_compile: t1 - t0,
        t_serialize: t2 - t1,
      });
    } catch (error) {
      const t1 = performance.now();
      parentPort?.postMessage({
        id: msg.id,
        error: error instanceof Error ? error.message : String(error),
        t_compile: t1 - t0,
      });
    }
  },
);

// Signal ready
parentPort?.postMessage({ type: 'ready' });
