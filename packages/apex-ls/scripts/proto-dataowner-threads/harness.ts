/**
 * Measurement harness for Option 1 prototype
 *
 * Compiles a corpus of Apex files in two modes:
 * 1. Baseline: sequential compile + addSymbolTable (no threads, no serialize)
 * 2. Threaded: parallel compile across N worker_threads, serialize/deserialize, serial merge
 *
 * Reports wall-clock, serial fraction, and Amdahl ceiling.
 */
import { Worker } from 'node:worker_threads';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { cpus } from 'node:os';
import {
  CompilerService,
  VisibilitySymbolListener,
  SymbolTable,
  ResourceLoaderService,
} from '@salesforce/apex-lsp-parser-ast';
import { bootstrapDataOwnerServices } from '@salesforce/apex-lsp-compliant-services';
import { Layer } from 'effect';

// Minimal no-op ResourceLoaderService for offline harness
const NoOpResourceLoaderLive = Layer.succeed(
  ResourceLoaderService,
  ResourceLoaderService.of({
    isStdApexNamespace: () => false,
    hasClass: () => false,
    findNamespaceForClass: () => new Set<string>(),
    getStandardNamespaces: () => new Map<string, string[]>(),
    resolveClassFqn: () => Promise.resolve(null),
    getSymbolTable: () => Promise.resolve(null),
    getFile: () => Promise.resolve(undefined),
  }),
);

// clampPoolSize pattern from WorkerCoordinator.ts:315-325
function clampPoolSize(requested: number): number {
  const cpuCount = cpus().length;
  const maxPoolSize = Math.max(1, cpuCount - 2);
  return Math.min(requested, maxPoolSize);
}

interface FileEntry {
  uri: string;
  content: string;
}

interface CompileResult {
  uri: string;
  t_compile: number;
  t_serialize?: number;
  t_deserialize?: number;
  t_merge?: number;
  symbolCount: number;
  referenceCount: number;
  error?: string;
}

// Thread pool with round-robin dispatch
class WorkerPool {
  private workers: Worker[] = [];
  private nextId = 0;
  private nextWorker = 0;
  private pending = new Map<
    number,
    { resolve: (result: any) => void; reject: (err: Error) => void }
  >();

  constructor(
    private size: number,
    private workerScript: string,
  ) {}

  async init(): Promise<void> {
    const readyPromises: Promise<void>[] = [];

    for (let i = 0; i < this.size; i++) {
      const worker = new Worker(this.workerScript);
      this.workers.push(worker);

      const readyPromise = new Promise<void>((resolve, reject) => {
        const onMessage = (msg: any) => {
          if (msg.type === 'ready') {
            worker.off('message', onMessage);
            resolve();
          }
        };
        worker.on('message', onMessage);
        worker.on('error', reject);
      });
      readyPromises.push(readyPromise);

      worker.on('message', (msg: any) => {
        if (msg.type === 'ready') return;
        const pending = this.pending.get(msg.id);
        if (pending) {
          this.pending.delete(msg.id);
          if (msg.error) {
            pending.reject(new Error(msg.error));
          } else {
            pending.resolve(msg);
          }
        }
      });

      worker.on('error', (err) => {
        console.error(`Worker ${i} error:`, err);
      });
    }

    await Promise.all(readyPromises);
  }

  compile(uri: string, content: string): Promise<any> {
    const id = this.nextId++;
    const worker = this.workers[this.nextWorker];
    this.nextWorker = (this.nextWorker + 1) % this.workers.length;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage({ id, uri, content });
    });
  }

  async terminate(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.terminate()));
  }
}

// Baseline: sequential compile + merge (no threads, no serialize)
async function runBaseline(
  files: FileEntry[],
): Promise<{ results: CompileResult[]; wallClock: number }> {
  console.log('\n=== BASELINE (sequential, no threads) ===');
  const compilerService = new CompilerService();

  // Bootstrap data-owner services with no-op resource loader
  const svc = await bootstrapDataOwnerServices(NoOpResourceLoaderLive);
  const sessionId = 'baseline-session';
  svc.symbolManager.beginWorkspaceLoadSession(sessionId);

  const results: CompileResult[] = [];
  const t0 = performance.now();

  for (const file of files) {
    const tCompile0 = performance.now();

    // Compile
    const table = new SymbolTable();
    const listener = new VisibilitySymbolListener('public-api', table);
    const compileResult = compilerService.compile(
      file.content,
      file.uri,
      listener,
      {
        collectReferences: true,
        resolveReferences: true,
      },
    );

    const tCompile1 = performance.now();

    if (!compileResult) {
      results.push({
        uri: file.uri,
        t_compile: tCompile1 - tCompile0,
        symbolCount: 0,
        referenceCount: 0,
        error: 'compile returned null',
      });
      continue;
    }

    const symbolTable =
      compileResult.result instanceof SymbolTable
        ? compileResult.result
        : table;

    // Merge (addSymbolTable) — no serialize/deserialize
    const tMerge0 = performance.now();
    svc.symbolManager.addSymbolTable(symbolTable, file.uri, 1, false);
    const tMerge1 = performance.now();

    results.push({
      uri: file.uri,
      t_compile: tCompile1 - tCompile0,
      t_merge: tMerge1 - tMerge0,
      symbolCount: symbolTable.getAllSymbols().length,
      referenceCount: symbolTable.getAllReferences().length,
    });
  }

  // Drain
  const tDrain0 = performance.now();
  svc.symbolManager.endWorkspaceLoadSession(sessionId);
  const tDrain1 = performance.now();

  const wallClock = performance.now() - t0;

  // Summary
  const totalCompile = results.reduce((sum, r) => sum + r.t_compile, 0);
  const totalMerge = results.reduce((sum, r) => sum + (r.t_merge ?? 0), 0);
  const tDrain = tDrain1 - tDrain0;

  console.log(`  Files:        ${results.length}`);
  console.log(`  Wall clock:   ${wallClock.toFixed(1)}ms`);
  console.log(
    `  Total compile: ${totalCompile.toFixed(1)}ms (avg ${(totalCompile / results.length).toFixed(1)}ms/file)`,
  );
  console.log(
    `  Total merge:   ${totalMerge.toFixed(1)}ms (avg ${(totalMerge / results.length).toFixed(1)}ms/file)`,
  );
  console.log(`  Drain:         ${tDrain.toFixed(1)}ms`);

  return { results, wallClock };
}

// Threaded: parallel compile, serialize, deserialize, serial merge
async function runThreaded(
  files: FileEntry[],
  poolSize: number,
): Promise<{ results: CompileResult[]; wallClock: number }> {
  console.log(`\n=== THREADED (N=${poolSize} workers) ===`);

  const workerScript = path.join(__dirname, 'compile.worker.js'); // compiled .js
  const pool = new WorkerPool(poolSize, workerScript);
  await pool.init();

  // Bootstrap data-owner services with no-op resource loader
  const svc = await bootstrapDataOwnerServices(NoOpResourceLoaderLive);
  const sessionId = `threaded-session-${poolSize}`;
  svc.symbolManager.beginWorkspaceLoadSession(sessionId);

  const t0 = performance.now();

  // Parallel compile + serialize (in threads)
  const compilePromises = files.map((file) =>
    pool.compile(file.uri, file.content),
  );
  const threadResults = await Promise.all(compilePromises);

  const tCompileDone = performance.now();

  // Serial deserialize + merge on main thread
  const results: CompileResult[] = [];

  for (let i = 0; i < threadResults.length; i++) {
    const threadResult = threadResults[i];
    const file = files[i];

    if (threadResult.error) {
      results.push({
        uri: file.uri,
        t_compile: threadResult.t_compile,
        symbolCount: 0,
        referenceCount: 0,
        error: threadResult.error,
      });
      continue;
    }

    // Deserialize
    const tDeser0 = performance.now();
    const symbolTable = SymbolTable.fromSerializedData(threadResult.serialized);
    const tDeser1 = performance.now();

    // Merge
    const tMerge0 = performance.now();
    svc.symbolManager.addSymbolTable(symbolTable, file.uri, 1, false);
    const tMerge1 = performance.now();

    results.push({
      uri: file.uri,
      t_compile: threadResult.t_compile,
      t_serialize: threadResult.t_serialize,
      t_deserialize: tDeser1 - tDeser0,
      t_merge: tMerge1 - tMerge0,
      symbolCount: threadResult.symbolCount,
      referenceCount: threadResult.referenceCount,
    });
  }

  // Drain
  const tDrain0 = performance.now();
  svc.symbolManager.endWorkspaceLoadSession(sessionId);
  const tDrain1 = performance.now();

  await pool.terminate();

  const wallClock = performance.now() - t0;

  // Summary
  const totalCompile = results.reduce((sum, r) => sum + r.t_compile, 0);
  const totalSerialize = results.reduce(
    (sum, r) => sum + (r.t_serialize ?? 0),
    0,
  );
  const totalDeserialize = results.reduce(
    (sum, r) => sum + (r.t_deserialize ?? 0),
    0,
  );
  const totalMerge = results.reduce((sum, r) => sum + (r.t_merge ?? 0), 0);
  const tDrain = tDrain1 - tDrain0;
  const parallelTime = tCompileDone - t0;

  console.log(`  Files:        ${results.length}`);
  console.log(`  Wall clock:   ${wallClock.toFixed(1)}ms`);
  console.log(
    `  Parallel phase (compile+serialize): ${parallelTime.toFixed(1)}ms`,
  );
  console.log(
    `  Total compile:     ${totalCompile.toFixed(1)}ms (avg ${(totalCompile / results.length).toFixed(1)}ms/file)`,
  );
  console.log(
    `  Total serialize:   ${totalSerialize.toFixed(1)}ms (avg ${(totalSerialize / results.length).toFixed(1)}ms/file)`,
  );
  console.log(
    `  Total deserialize: ${totalDeserialize.toFixed(1)}ms (avg ${(totalDeserialize / results.length).toFixed(1)}ms/file)`,
  );
  console.log(
    `  Total merge:       ${totalMerge.toFixed(1)}ms (avg ${(totalMerge / results.length).toFixed(1)}ms/file)`,
  );
  console.log(`  Drain:             ${tDrain.toFixed(1)}ms`);

  const serialTime = totalDeserialize + totalMerge + tDrain;
  const totalWork = totalCompile + totalSerialize + serialTime;
  const serialFraction = serialTime / totalWork;

  console.log(
    `\n  Serial fraction: ${(serialFraction * 100).toFixed(1)}% (${serialTime.toFixed(1)}ms / ${totalWork.toFixed(1)}ms)`,
  );

  // Amdahl's law ceiling
  const amdahlCeiling = 1 / (serialFraction + (1 - serialFraction) / poolSize);
  console.log(
    `  Amdahl ceiling (N=${poolSize}): ${amdahlCeiling.toFixed(2)}x speedup`,
  );

  return { results, wallClock };
}

async function main() {
  const corpusDir =
    process.argv[2] ||
    path.join(
      __dirname,
      '../../../apex-parser-ast/src/resources/StandardApexLibrary',
    );

  console.log(`Corpus directory: ${corpusDir}`);

  // Find all .cls files
  const apexFiles: FileEntry[] = [];

  async function scanDir(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.name.endsWith('.cls')) {
        const content = await fs.readFile(fullPath, 'utf-8');
        apexFiles.push({
          uri: `file://${fullPath}`,
          content,
        });
      }
    }
  }

  await scanDir(corpusDir);

  console.log(`Found ${apexFiles.length} .cls files\n`);

  if (apexFiles.length === 0) {
    console.error('No .cls files found in corpus directory');
    process.exit(1);
  }

  // Run baseline
  const baseline = await runBaseline(apexFiles);

  // Run threaded at various pool sizes
  const poolSizes = [1, 2, 4, clampPoolSize(7)];

  const threadedRuns: {
    poolSize: number;
    wallClock: number;
    speedup: number;
  }[] = [];

  for (const poolSize of poolSizes) {
    const threaded = await runThreaded(apexFiles, poolSize);
    const speedup = baseline.wallClock / threaded.wallClock;
    threadedRuns.push({ poolSize, wallClock: threaded.wallClock, speedup });
  }

  // Final report
  console.log('\n=== SUMMARY ===');
  console.log(`Baseline:         ${baseline.wallClock.toFixed(1)}ms`);
  for (const run of threadedRuns) {
    console.log(
      `Threaded (N=${run.poolSize}):  ${run.wallClock.toFixed(1)}ms (${run.speedup.toFixed(2)}x speedup)`,
    );
  }

  // Decision gate guidance
  console.log('\n=== DECISION GATE ===');
  const lastRun = threadedRuns[threadedRuns.length - 1];
  if (lastRun.speedup >= 2.5) {
    console.log(
      '✅ Serial fraction ≲ 30% — Option 1 wins. Proceed to Phase 1.',
    );
  } else if (lastRun.speedup <= 1.5) {
    console.log(
      '❌ Serial fraction ≳ 60% — Option 1 ceiling is poor. Pivot to making merge cheaper.',
    );
  } else {
    console.log(
      '⚠️  In between — decide based on absolute wall-clock win and complexity trade-off.',
    );
  }
}

main().catch((err) => {
  console.error('Harness failed:', err);
  process.exit(1);
});
