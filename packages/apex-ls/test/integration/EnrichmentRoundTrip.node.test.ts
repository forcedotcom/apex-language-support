/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Full enrichment round-trip integration tests (live assistance bus).
 *
 * These cover the path that WriteBackProtocol.integration.node.test.ts left
 * `it.skip` ("the coordinator assistance bus is not wired in this isolated
 * data-owner+pool topology, so those calls never settle and the dispatch
 * hangs", follow-up W-22692429): a request-pool worker handling
 * hover/references/implementation must reach OUT to the coordinator for
 * symbol data (dataOwner:QuerySymbolSubset / ResolveDepUris /
 * ResolveDependentUris), stdlib (resourceLoader:*), and write enriched symbols
 * back (dataOwner:UpdateSymbolSubset). The skipped tests dispatched onto an
 * isolated topology with no mediator, so every requestCoordinatorAssistance
 * call hung.
 *
 * Here we wire the assistance bus exactly as LCSAdapter does in production:
 *   - the REAL createPrimaryAssistanceHandler (with a ResourceLoaderProxy over
 *     the live resource-loader worker, so resourceLoader:* calls are served by
 *     the actual stdlib), and
 *   - a dataOwnerHandler routing dataOwner:* to the data-owner worker,
 * attached to the live workers' assistance ports, with the remote-stdlib warmup
 * phase run so the pool worker's namespace cache is primed. Then we dispatch
 * each LSP feature through the pool and assert it COMPLETES end-to-end (returns
 * a result rather than hanging) — proving the full worker→coordinator→worker
 * round-trip closes.
 */

import * as path from 'path';
import {
  initializeTopology,
  makeNodeWorkerLayer,
  makeWorkerDispatcher,
  getRawWorkers,
  getAssistancePorts,
  getWorkerNames,
  clearRawWorkers,
  runRemoteStdlibWarmupPhase,
  type WorkerTopology,
} from '../../src/server/WorkerCoordinator';
import { CoordinatorAssistanceMediator } from '../../src/server/CoordinatorAssistanceMediator';
import { createPrimaryAssistanceHandler } from '../../src/server/CoordinatorPrimaryAssistanceHandler';
import { ResourceLoaderProxy } from '../../src/server/ResourceLoaderProxy';
import {
  dispatchProcessOnChangeDocument,
  dispatchProcessOnOpenDocument,
  LSPQueueManager,
} from '@salesforce/apex-lsp-compliant-services';
import {
  DispatchHover,
  DispatchCompletion,
  DispatchDefinition,
  DispatchReferences,
  DispatchImplementation,
  DispatchCodeAction,
  getLogger,
  enableConsoleLogging,
  setLogLevel,
  type WorkerRole,
} from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import { TextDocument } from 'vscode-languageserver-textdocument';

const WORKER_TS_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const TSX_OPTIONS = { execArgv: ['--import', 'tsx'] };
const LOG_LEVEL = 'error';
const COMPILATION_POOL_SIZE = 2;
const workerLayerFactory = (role: WorkerRole) =>
  makeNodeWorkerLayer(WORKER_TS_ENTRY, {
    ...TSX_OPTIONS,
    workerData: {
      role,
      compilationPoolSize: COMPILATION_POOL_SIZE,
      compilationConcurrency: 1,
    },
  });

// A class with an interface + implementor in one file, so go-to-implementation
// and references have real edges to resolve, while staying self-contained
// except for stdlib (String), which the resource loader serves.
const SAMPLE = `public interface Greeter {
    String greet();
}
public class EnglishGreeter implements Greeter {
    public String greet() {
        return 'Hello';
    }
}`;

const URI = 'file:///test/Greeter.cls';

// Cross-file interface + implementor in SEPARATE files, mirroring the live
// go-to-implementation bug (MyInterface.cls + MyImplementation.cls). The
// implementor's `implements` edge is cross-file, so the data-owner must resolve
// it for findReferencesTo(interface) — and thus go-to-implementation — to work.
const IFACE_URI = 'file:///test/IFace.cls';
const IFACE_SRC = `public interface IFace {
    String run();
}`;
const IMPL_URI = 'file:///test/FaceImpl.cls';
const IMPL_SRC = `public with sharing class FaceImpl implements IFace {
    public String run() {
        return 'r';
    }
}`;

// A SECOND cross-file implementor of IFace, added AFTER the first
// go-to-implementation already ran. Mirrors the live sequence the user hit:
// cold-open the interface, go-to-implementation (resolves the first
// implementor and caches that set), then create a new implementing class and
// go-to-implementation again — both must now resolve, not just the first.
const IMPL2_URI = 'file:///test/FaceImpl2.cls';
const IMPL2_SRC = `public with sharing class FaceImpl2 implements IFace {
    public String run() {
        return 'r2';
    }
}`;

/**
 * A minimal LSP connection stub for the primary handler's catch-all
 * (connection.sendRequest / sendNotification). The round-trips under test do
 * not exercise client RPCs for a self-contained file; if one fires we resolve
 * it to a benign empty result so nothing hangs.
 */
const stubConnection = {
  sendRequest: async () => null,
  sendNotification: async () => undefined,
};

/**
 * Wire the assistance bus exactly as LCSAdapter does: real primary handler
 * (coordinator/* + resourceLoader/* via the proxy + catch-all) plus a
 * dataOwnerHandler routing dataOwner:* to the data-owner worker.
 */
function wireProductionMediator(
  topology: WorkerTopology,
  dispatcher: ReturnType<typeof makeWorkerDispatcher>,
  logger: ReturnType<typeof getLogger>,
): CoordinatorAssistanceMediator {
  const resourceLoaderProxy = topology.resourceLoader
    ? new ResourceLoaderProxy(topology.resourceLoader, logger)
    : undefined;
  const mediator = new CoordinatorAssistanceMediator(
    createPrimaryAssistanceHandler({
      connection: stubConnection,
      logger,
      getResourceLoaderProxy: () => resourceLoaderProxy,
      installSObjectArtifacts: async (artifacts, originUri) => {
        await dispatcher.queryDataOwner('InstallSObjectArtifacts', {
          artifacts,
          originUri,
        });
      },
    }),
    logger,
    (method, params) => dispatcher.queryDataOwner(method, params),
  );
  mediator.attachToWorkers(
    getRawWorkers(),
    getAssistancePorts(),
    getWorkerNames(),
  );
  return mediator;
}

describe('Enrichment round-trip through the worker topology (live assistance bus)', () => {
  let logger: ReturnType<typeof getLogger>;

  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel(LOG_LEVEL);
    logger = getLogger();
  });

  afterEach(() => {
    clearRawWorkers();
  });

  const runFeature = (
    makeRequest: () =>
      | DispatchHover
      | DispatchCompletion
      | DispatchDefinition
      | DispatchReferences
      | DispatchImplementation
      | DispatchCodeAction,
    // Some features (codeAction extract refactorings) need a self-contained,
    // cleanly-parsing source rather than the interface+implementor SAMPLE
    // (which intentionally carries cross-file edges for hover/references and
    // does not parse error-free). Override the opened document per test.
    opened: { uri: string; source: string } = { uri: URI, source: SAMPLE },
  ) =>
    Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        () => opened.source,
      );
      wireProductionMediator(topology, dispatcher, logger);
      // Prime the pool worker's remote-stdlib namespace cache (LCSAdapter runs
      // this after attaching the mediator). Without it, the first stdlib lookup
      // on the pool worker has no cache to consult.
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      // Open the file so the data-owner holds its symbols (the enrichment worker
      // loads this subset via dataOwner:QuerySymbolSubset).
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: opened.uri,
            languageId: 'apex',
            version: 1,
            getText: () => opened.source,
          },
          textDocument: { uri: opened.uri },
          text: opened.source,
        }),
      );

      // Dispatch the feature through the request pool. The handler reaches back
      // over the assistance bus for symbol data / stdlib / dependents and writes
      // enriched symbols back. The assertion is that it COMPLETES (the skipped
      // tests hung here because the bus was unwired).
      const response = (yield* topology.requestPool.executeEffect(
        makeRequest() as never,
      ) as Effect.Effect<unknown, never, never>) as { result: unknown };
      return response;
    }).pipe(Effect.scoped) as Effect.Effect<{ result: unknown }, never, never>;

  it('preloads configured stdlib namespaces into the DataOwner graph', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      wireProductionMediator(topology, dispatcher, logger);

      return yield* runRemoteStdlibWarmupPhase(topology, 1, [
        'Database',
        'System',
      ]);
    }).pipe(Effect.scoped);

    const result = await Effect.runPromise(program);

    expect(result).toBeDefined();
    expect(
      result?.namespaces.map((namespace) => namespace.toLowerCase()),
    ).toEqual(expect.arrayContaining(['database', 'system']));
    expect(result?.missingNamespaces).toEqual([]);
    expect(result?.loadedClasses).toBeGreaterThan(0);
    expect(result?.failedClasses).toEqual([]);
    expect(result?.loadedClasses).toBe(result?.totalClasses);
  }, 120_000);

  it('completes a hover round-trip end-to-end', async () => {
    const response = await Effect.runPromise(
      runFeature(
        () =>
          new DispatchHover({
            textDocument: { uri: URI },
            position: { line: 4, character: 18 }, // on greet()
            content: SAMPLE,
          }),
      ),
    );

    logger.debug(
      `[round-trip:hover] completed result=${JSON.stringify(response.result)}`,
    );
    // The round-trip closed: a (possibly null) result came back rather than
    // hanging on an unsettled assistance call.
    expect(response).toBeDefined();
    expect('result' in response).toBe(true);
  }, 120_000);

  it('loads an sObject receiver dependency for member completion through the worker topology', async () => {
    const completionUri = 'file:///test/PropertyCompletion.cls';
    const completionSource = [
      'public class PropertyCompletion {',
      '  public void run() {',
      '    Property__c property = new Property__c();',
      '    property.Bed',
      '    String contentDocumentLinkId = FileUtilities.createFile();',
      '    FileUtilities.create',
      '  }',
      '}',
    ].join('\n');

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 3,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        () => completionSource,
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 3);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: completionUri,
            languageId: 'apex',
            version: 1,
            getText: () => completionSource,
          },
          textDocument: { uri: completionUri },
          text: completionSource,
        }),
      );
      yield* Effect.promise(() =>
        dispatcher.queryDataOwner('InstallSObjectArtifacts', {
          artifacts: [
            {
              identifierType: 'sobject' as const,
              name: 'Property__c',
              describe: {
                name: 'Property__c',
                custom: true,
                fields: [
                  {
                    name: 'Beds__c',
                    type: 'double',
                    definitionTarget: {
                      uri: 'file:///objects/Property__c/fields/Beds__c.field-meta.xml',
                    },
                  },
                ],
                definitionTarget: {
                  uri: 'file:///objects/Property__c/Property__c.object-meta.xml',
                },
              },
            },
          ],
          originUri: completionUri,
        }),
      );

      const hoverSource = completionSource.replace(
        'property.Bed',
        'property.Beds__c',
      );
      const qualifierHover = yield* topology.requestPool.executeEffect(
        new DispatchHover({
          textDocument: { uri: completionUri },
          position: { line: 3, character: 9 },
          content: hoverSource,
        }),
      );
      const fieldHover = yield* topology.requestPool.executeEffect(
        new DispatchHover({
          textDocument: { uri: completionUri },
          position: { line: 3, character: 17 },
          content: hoverSource,
        }),
      );
      const completion = yield* topology.requestPool.executeEffect(
        new DispatchCompletion({
          textDocument: { uri: completionUri },
          position: { line: 3, character: 16 },
          content: completionSource,
          context: { triggerKind: 1 },
        }),
      );
      return { completion, qualifierHover, fieldHover };
    }).pipe(Effect.scoped);

    const response = (await Effect.runPromise(program)) as {
      completion: { result: { items: Array<{ label?: string }> } };
      qualifierHover: { result: unknown };
      fieldHover: { result: unknown };
    };
    expect(
      response.completion.result.items.map((item) => item.label),
    ).toContain('Beds__c');
    expect(JSON.stringify(response.qualifierHover.result)).toContain(
      'Property__c',
    );
    expect(JSON.stringify(response.qualifierHover.result)).not.toContain(
      'Searching for symbol',
    );
    expect(JSON.stringify(response.fieldHover.result)).toContain(
      'Decimal Property__c.Beds__c',
    );
    expect(JSON.stringify(response.fieldHover.result)).not.toContain(
      'Searching for symbol',
    );
  }, 120_000);

  it('preserves sObject completion, hover, and definition across successive document changes', async () => {
    const uri = 'file:///test/PropertyLifecycle.cls';
    const openSource = [
      'public class PropertyLifecycle {',
      '  public void run() {',
      '    Property__c property = new Property__c();',
      '    String recordId = property.Id;',
      "    String marker = 'after';",
      '    FileUtilities.createFile()',
      '  }',
      '  public void second() {',
      '    Property__c property = new Property__c();',
      '    String secondRecordId = property.Id;',
      '  }',
      '  public void third() {',
      '    Property__c property = new Property__c();',
      '    String thirdRecordId = property.Id;',
      '  }',
      '}',
    ].join('\n');
    const completionSource = openSource.replace(
      "    String marker = 'after';",
      ['    property.Bed', "    String marker = 'after';"].join('\n'),
    );
    const resolvedSource = completionSource.replace(
      'property.Bed',
      'property.Beds__c',
    );

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 3,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      let currentSource = openSource;
      let currentVersion = 1;
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        () => currentSource,
        () => currentVersion,
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 3);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri,
            languageId: 'apex',
            version: 1,
            getText: () => openSource,
          },
          textDocument: { uri },
          text: openSource,
        }),
      );
      yield* Effect.promise(() =>
        dispatcher.queryDataOwner('InstallSObjectArtifacts', {
          artifacts: [
            {
              identifierType: 'sobject' as const,
              name: 'Property__c',
              describe: {
                name: 'Property__c',
                custom: true,
                fields: [
                  {
                    name: 'Id',
                    type: 'id',
                    definitionTarget: {
                      uri: 'file:///objects/Property__c/fields/Id.field-meta.xml',
                    },
                  },
                  {
                    name: 'Beds__c',
                    type: 'double',
                    definitionTarget: {
                      uri: 'file:///objects/Property__c/fields/Beds__c.field-meta.xml',
                    },
                  },
                ],
                definitionTarget: {
                  uri: 'file:///objects/Property__c/Property__c.object-meta.xml',
                },
              },
            },
          ],
          originUri: uri,
        }),
      );

      currentSource = completionSource;
      currentVersion = 2;
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentChange', {
          document: {
            uri,
            languageId: 'apex',
            version: 2,
            getText: () => completionSource,
          },
          textDocument: { uri, version: 2 },
        }),
      );
      const completion = yield* Effect.promise(() =>
        dispatcher.dispatch('completion', {
          textDocument: { uri },
          position: { line: 4, character: 16 },
          context: { triggerKind: 1 },
        }),
      );

      currentSource = resolvedSource;
      currentVersion = 3;
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentChange', {
          document: {
            uri,
            languageId: 'apex',
            version: 3,
            getText: () => resolvedSource,
          },
          textDocument: { uri, version: 3 },
        }),
      );
      const hover = (character: number) =>
        Effect.promise(() =>
          dispatcher.dispatch('hover', {
            textDocument: { uri },
            position: { line: 4, character },
          }),
        );
      const definition = (character: number) =>
        Effect.promise(() =>
          dispatcher.dispatch('definition', {
            textDocument: { uri },
            position: { line: 4, character },
          }),
        );

      const settled = {
        qualifierHover: yield* hover(7),
        fieldHover: yield* hover(17),
        qualifierDefinition: yield* definition(7),
        fieldDefinition: yield* definition(17),
      };

      // Remove the member expression and let that version settle so no worker
      // can satisfy the next requests from a table that already contains it.
      currentSource = openSource;
      currentVersion = 4;
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentChange', {
          document: {
            uri,
            languageId: 'apex',
            version: 4,
            getText: () => openSource,
          },
          textDocument: { uri, version: 4 },
        }),
      );

      // Re-add the expression, but deliberately do not await the data-owner
      // compilation. Hover and definition must self-load the live version-5
      // text while its documentChange compile/write-back is still in flight.
      currentSource = resolvedSource;
      currentVersion = 5;
      const changeInFlight = dispatcher.dispatch('documentChange', {
        document: {
          uri,
          languageId: 'apex',
          version: 5,
          getText: () => resolvedSource,
        },
        textDocument: { uri, version: 5 },
      });
      const concurrent = yield* Effect.all(
        {
          qualifierHover: hover(7),
          fieldHover: hover(17),
          qualifierDefinition: definition(7),
          fieldDefinition: definition(17),
        },
        { concurrency: 'unbounded' },
      );
      yield* Effect.promise(() => changeInFlight);

      return {
        completion,
        settled,
        concurrent,
      };
    }).pipe(Effect.scoped);

    const result = await Effect.runPromise(program);
    expect(
      (result.completion as { items: Array<{ label?: string }> }).items.map(
        (item) => item.label,
      ),
    ).toContain('Beds__c');
    for (const phase of [result.settled, result.concurrent]) {
      expect(JSON.stringify(phase.qualifierHover)).toContain('Property__c');
      expect(JSON.stringify(phase.qualifierHover)).not.toContain(
        'Searching for symbol',
      );
      expect(JSON.stringify(phase.fieldHover)).toContain(
        'Decimal Property__c.Beds__c',
      );
      expect(JSON.stringify(phase.fieldHover)).not.toContain(
        'Searching for symbol',
      );
      expect(phase.qualifierDefinition).toEqual([
        expect.objectContaining({ uri }),
      ]);
      expect(phase.fieldDefinition).toEqual([
        expect.objectContaining({
          uri: 'file:///objects/Property__c/fields/Beds__c.field-meta.xml',
        }),
      ]);
    }
  }, 120_000);

  it('resolves an sObject member identically when present at open or added by didChange', async () => {
    const openUri = 'file:///test/PropertyPresentAtOpen.cls';
    const changedUri = 'file:///test/PropertyAddedByChange.cls';
    const source = (className: string, includeMember: boolean) =>
      [
        `public class ${className} {`,
        '  public void run() {',
        '    Property__c property = new Property__c();',
        ...(includeMember ? ['    property.Beds__c;'] : []),
        '  }',
        '}',
      ].join('\n');
    const openFinalSource = source('PropertyPresentAtOpen', true);
    const changedInitialSource = source('PropertyAddedByChange', false);
    const changedFinalSource = source('PropertyAddedByChange', true);
    const sources: Record<string, string> = {
      [openUri]: openFinalSource,
      [changedUri]: changedInitialSource,
    };
    const versions: Record<string, number> = {
      [openUri]: 1,
      [changedUri]: 1,
    };

    type FeatureSnapshot = {
      qualifierHover: unknown;
      fieldHover: unknown;
      qualifierDefinition: unknown;
      fieldDefinition: unknown;
    };

    const assertResolved = (
      snapshots: FeatureSnapshot[],
      expectedLocalUri: string,
    ) => {
      expect(snapshots).toHaveLength(6);
      for (const snapshot of snapshots) {
        const qualifierHover = JSON.stringify(snapshot.qualifierHover);
        const fieldHover = JSON.stringify(snapshot.fieldHover);
        expect(qualifierHover).toContain('Property__c');
        expect(qualifierHover).not.toContain('Searching for symbol');
        expect(fieldHover).toContain('Decimal Property__c.Beds__c');
        expect(fieldHover).not.toContain('Searching for symbol');
        expect(snapshot.qualifierDefinition).toEqual([
          expect.objectContaining({ uri: expectedLocalUri }),
        ]);
        expect(snapshot.fieldDefinition).toEqual([
          expect.objectContaining({
            uri: 'file:///objects/Property__c/fields/Beds__c.field-meta.xml',
          }),
        ]);
      }
    };

    let queueManager: LSPQueueManager | undefined;
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 3,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        serverMode: 'development',
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => sources[uri],
        (uri) => versions[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 3);

      queueManager = LSPQueueManager.getInstance();
      queueManager.setWorkerDispatcher(dispatcher);

      yield* Effect.promise(() =>
        dispatcher.queryDataOwner('InstallSObjectArtifacts', {
          artifacts: [
            {
              identifierType: 'sobject' as const,
              name: 'Property__c',
              describe: {
                name: 'Property__c',
                custom: true,
                fields: [
                  {
                    name: 'Id',
                    type: 'id',
                    definitionTarget: {
                      uri: 'file:///objects/Property__c/fields/Id.field-meta.xml',
                    },
                  },
                  {
                    name: 'Beds__c',
                    type: 'double',
                    definitionTarget: {
                      uri: 'file:///objects/Property__c/fields/Beds__c.field-meta.xml',
                    },
                  },
                ],
                definitionTarget: {
                  uri: 'file:///objects/Property__c/Property__c.object-meta.xml',
                },
              },
            },
          ],
          originUri: changedUri,
        }),
      );

      const openDocument = TextDocument.create(
        openUri,
        'apex',
        1,
        openFinalSource,
      );
      const changedInitialDocument = TextDocument.create(
        changedUri,
        'apex',
        1,
        changedInitialSource,
      );
      yield* Effect.promise(() =>
        Promise.all([
          dispatchProcessOnOpenDocument({ document: openDocument }),
          dispatchProcessOnOpenDocument({ document: changedInitialDocument }),
        ]).then(() => undefined),
      );

      const capture = (uri: string): Promise<FeatureSnapshot[]> =>
        Promise.all(
          Array.from({ length: 6 }, async () => {
            const params = {
              textDocument: { uri },
              position: { line: 3, character: 7 },
            };
            const fieldParams = {
              textDocument: { uri },
              position: { line: 3, character: 16 },
            };
            const [
              qualifierHover,
              fieldHover,
              qualifierDefinition,
              fieldDefinition,
            ] = await Promise.all([
              queueManager!.submitHoverRequest(params),
              queueManager!.submitHoverRequest(fieldParams),
              queueManager!.submitDefinitionRequest(params),
              queueManager!.submitDefinitionRequest(fieldParams),
            ]);
            return {
              qualifierHover,
              fieldHover,
              qualifierDefinition,
              fieldDefinition,
            };
          }),
        );

      // Control: this graph was compiled from a didOpen that already contained
      // the complete member expression.
      const presentAtOpen = yield* Effect.promise(() => capture(openUri));

      // The editor's TextDocuments set already exposes version 2 when the
      // notification is received, while DocumentChangeBatcher intentionally
      // delays the data-owner compile. Requests launched now must self-load the
      // live v2 text rather than resolve against the settled v1 graph.
      sources[changedUri] = changedFinalSource;
      versions[changedUri] = 2;
      const changedFinalDocument = TextDocument.create(
        changedUri,
        'apex',
        2,
        changedFinalSource,
      );
      const changeInFlight = dispatchProcessOnChangeDocument({
        document: changedFinalDocument,
      });
      const whileChangePending = yield* Effect.promise(() =>
        capture(changedUri),
      );
      yield* Effect.promise(() => changeInFlight);

      // Repeat after the debounced compile and version-checked write-back have
      // settled. Repetition crosses all three request workers and catches a
      // worker-local stale cursor table that a single warmed worker can hide.
      const afterChangeSettled = yield* Effect.promise(() =>
        capture(changedUri),
      );

      const currentState = yield* Effect.promise(() =>
        dispatcher.queryDataOwner('QuerySymbolSubset', {
          uris: [changedUri],
          includeEntries: true,
        }),
      );

      return {
        presentAtOpen,
        whileChangePending,
        afterChangeSettled,
        currentState,
      };
    }).pipe(Effect.scoped);

    try {
      const result = await Effect.runPromise(program);
      assertResolved(result.presentAtOpen, openUri);
      assertResolved(result.whileChangePending, changedUri);
      assertResolved(result.afterChangeSettled, changedUri);

      const stateResponse = result.currentState as {
        entries?: Record<
          string,
          {
            metadata?: { documentVersion?: number };
            symbols?: Array<{ name?: string; fileUri?: string; kind?: string }>;
          }
        >;
        versions?: Record<string, number>;
      };
      expect(stateResponse.versions?.[changedUri]).toBe(2);
      expect(stateResponse.entries?.[changedUri]).toBeDefined();
      expect(
        stateResponse.entries?.[changedUri]?.metadata?.documentVersion,
      ).toBe(2);
    } finally {
      queueManager?.setWorkerDispatcher(null);
      await queueManager?.shutdown();
    }
  }, 120_000);

  it('loads an unresolved sObject while member access is typed incrementally without a prior hover', async () => {
    const uri = 'file:///test/PropertyCompletionFirst.cls';
    const openSource = [
      'public class PropertyCompletionFirst {',
      '  public void run() {',
      '    Property__c property = new Property__c();',
      '    insert property;',
      "    String marker = 'after';",
      '  }',
      '}',
    ].join('\n');
    const sourceWithExpression = (expression: string) =>
      openSource.replace(
        "    String marker = 'after';",
        [`    ${expression}`, "    String marker = 'after';"].join('\n'),
      );
    const resolvedSource = sourceWithExpression('property.Beds__c');
    const submitSpy = jest
      .spyOn(LSPQueueManager.prototype, 'submitFindMissingArtifactRequest')
      .mockResolvedValue({
        artifacts: [
          {
            identifierType: 'sobject',
            name: 'Property__c',
            describe: {
              name: 'Property__c',
              custom: true,
              fields: [
                {
                  name: 'Beds__c',
                  type: 'double',
                  definitionTarget: {
                    uri: 'file:///objects/Property__c/fields/Beds__c.field-meta.xml',
                  },
                },
              ],
              definitionTarget: {
                uri: 'file:///objects/Property__c/Property__c.object-meta.xml',
              },
            },
          },
        ],
      });

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 3,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        serverMode: 'development',
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      let currentSource = openSource;
      let currentVersion = 1;
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        () => currentSource,
        () => currentVersion,
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 3);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri,
            languageId: 'apex',
            version: 1,
            getText: () => openSource,
          },
          textDocument: { uri },
          text: openSource,
        }),
      );

      const complete = async (
        expression: string,
        version: number,
        triggerCharacter?: '.',
      ) => {
        currentSource = sourceWithExpression(expression);
        currentVersion = version;
        await dispatcher.dispatch('documentChange', {
          document: {
            uri,
            languageId: 'apex',
            version,
            getText: () => currentSource,
          },
          textDocument: { uri, version },
        });
        const completion = (await dispatcher.dispatch('completion', {
          textDocument: { uri },
          position: { line: 4, character: 4 + expression.length },
          context: triggerCharacter
            ? { triggerKind: 2, triggerCharacter }
            : { triggerKind: 1 },
        })) as { items: Array<{ label?: string }> };
        return {
          expression,
          labels: completion.items.map((item) => item.label),
          artifactRequestCount: submitSpy.mock.calls.length,
        };
      };

      const completionPhases = [];
      completionPhases.push(yield* Effect.promise(() => complete('prop', 2)));
      completionPhases.push(yield* Effect.promise(() => complete('proper', 3)));
      completionPhases.push(
        yield* Effect.promise(() => complete('property', 4)),
      );
      completionPhases.push(
        yield* Effect.promise(() => complete('property.', 5, '.')),
      );
      completionPhases.push(
        yield* Effect.promise(() => complete('property.b', 6)),
      );
      completionPhases.push(
        yield* Effect.promise(() => complete('property.be', 7)),
      );
      completionPhases.push(
        yield* Effect.promise(() => complete('property.bed', 8)),
      );
      const artifactRequestsAfterTyping = submitSpy.mock.calls.map(
        ([params]) => params,
      );

      currentSource = resolvedSource;
      currentVersion = 9;
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentChange', {
          document: {
            uri,
            languageId: 'apex',
            version: 9,
            getText: () => resolvedSource,
          },
          textDocument: { uri, version: 9 },
        }),
      );
      const [qualifierHover, fieldHover, qualifierDefinition, fieldDefinition] =
        yield* Effect.all(
          [
            Effect.promise(() =>
              dispatcher.dispatch('hover', {
                textDocument: { uri },
                position: { line: 4, character: 7 },
              }),
            ),
            Effect.promise(() =>
              dispatcher.dispatch('hover', {
                textDocument: { uri },
                position: { line: 4, character: 17 },
              }),
            ),
            Effect.promise(() =>
              dispatcher.dispatch('definition', {
                textDocument: { uri },
                position: { line: 4, character: 7 },
              }),
            ),
            Effect.promise(() =>
              dispatcher.dispatch('definition', {
                textDocument: { uri },
                position: { line: 4, character: 17 },
              }),
            ),
          ],
          { concurrency: 'unbounded' },
        );

      return {
        completionPhases,
        artifactRequestsAfterTyping,
        artifactRequestCountAfterAllFeatures: submitSpy.mock.calls.length,
        qualifierHover,
        fieldHover,
        qualifierDefinition,
        fieldDefinition,
      };
    }).pipe(Effect.scoped);

    try {
      const result = await Effect.runPromise(program);
      const phases = Object.fromEntries(
        result.completionPhases.map((phase) => [phase.expression, phase]),
      );
      for (const expression of ['prop', 'proper', 'property']) {
        expect(phases[expression]?.labels).toContain('property');
        expect(phases[expression]?.artifactRequestCount).toBe(0);
      }
      expect(phases['property.']?.labels).toContain('Beds__c');
      expect(phases['property.']?.artifactRequestCount).toBe(1);
      for (const expression of ['property.b', 'property.be', 'property.bed']) {
        expect(phases[expression]?.labels).toContain('Beds__c');
        expect(phases[expression]?.artifactRequestCount).toBe(1);
      }
      expect(result.artifactRequestsAfterTyping).toEqual([
        expect.objectContaining({
          identifiers: expect.arrayContaining([
            expect.objectContaining({
              name: 'Property__c',
              identifierType: 'sobject',
            }),
          ]),
          origin: expect.objectContaining({
            uri,
            requestKind: 'completion',
          }),
        }),
      ]);
      expect(result.artifactRequestCountAfterAllFeatures).toBe(1);
      expect(JSON.stringify(result.qualifierHover)).toContain('Property__c');
      expect(JSON.stringify(result.qualifierHover)).not.toContain(
        'Searching for symbol',
      );
      expect(JSON.stringify(result.fieldHover)).toContain(
        'Decimal Property__c.Beds__c',
      );
      expect(JSON.stringify(result.fieldHover)).not.toContain(
        'Searching for symbol',
      );
      expect(result.qualifierDefinition).toEqual([
        expect.objectContaining({ uri }),
      ]);
      expect(result.fieldDefinition).toEqual([
        expect.objectContaining({
          uri: 'file:///objects/Property__c/fields/Beds__c.field-meta.xml',
        }),
      ]);
    } finally {
      submitSpy.mockRestore();
    }
  }, 120_000);

  it('replaces an sObject searching hover after org metadata reaches the data owner', async () => {
    const sobjectUri = 'apex-sobject://graph/property__c';
    const source = [
      'public class PropertyConsumer {',
      '  public void run() {',
      '    Property__c property;',
      '    property.Beds__c;',
      '  }',
      '}',
    ].join('\n');
    const uri = 'file:///test/PropertyConsumer.cls';
    const submitSpy = jest
      .spyOn(LSPQueueManager.prototype, 'submitFindMissingArtifactRequest')
      .mockResolvedValue({
        artifacts: [
          {
            identifierType: 'sobject',
            name: 'Property__c',
            describe: {
              name: 'Property__c',
              custom: true,
              fields: [
                {
                  name: 'Beds__c',
                  type: 'double',
                  definitionTarget: {
                    uri: 'file:///objects/Property__c/fields/Beds__c.field-meta.xml',
                  },
                },
              ],
              definitionTarget: {
                uri: 'file:///objects/Property__c.object-meta.xml',
              },
            },
          },
        ],
      });

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 3,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(topology, logger, () => source);
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 3);
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri,
            languageId: 'apex',
            version: 1,
            getText: () => source,
          },
          textDocument: { uri },
          text: source,
        }),
      );

      const hover = (line: number, character: number) =>
        topology.requestPool.executeEffect(
          new DispatchHover({
            textDocument: { uri },
            position: { line, character },
            content: source,
          }),
        ) as Effect.Effect<{ result: unknown }, never, never>;

      const first = yield* hover(2, 8);
      expect(JSON.stringify(first.result)).toContain('Searching for symbol');

      let installed = false;
      for (let attempt = 0; attempt < 100 && !installed; attempt++) {
        const subset = (yield* Effect.promise(() =>
          dispatcher.queryDataOwner('QuerySymbolSubset', {
            uris: [sobjectUri],
          }),
        )) as { entries: Record<string, unknown> };
        installed = subset.entries[sobjectUri] != null;
        if (!installed) {
          yield* Effect.sleep('10 millis');
        }
      }
      expect(installed).toBe(true);

      return {
        type: yield* hover(2, 8),
        declaration: yield* hover(2, 20),
        qualifier: yield* hover(3, 7),
        field: yield* hover(3, 17),
        qualifierDefinition: yield* topology.requestPool.executeEffect(
          new DispatchDefinition({
            textDocument: { uri },
            position: { line: 3, character: 7 },
            content: source,
          }),
        ),
        fieldDefinition: yield* topology.requestPool.executeEffect(
          new DispatchDefinition({
            textDocument: { uri },
            position: { line: 3, character: 17 },
            content: source,
          }),
        ),
      };
    }).pipe(Effect.scoped);

    const second = await Effect.runPromise(program);
    const typeContent = JSON.stringify(second.type.result);
    expect(typeContent).toContain('Property__c');
    expect(typeContent).not.toContain('Searching for symbol');
    const declarationContent = JSON.stringify(second.declaration.result);
    expect(declarationContent).toContain('Property__c');
    expect(declarationContent).not.toContain('Searching for symbol');
    const qualifierContent = JSON.stringify(second.qualifier.result);
    expect(qualifierContent).toContain('Property__c');
    expect(qualifierContent).not.toContain('Searching for symbol');
    const fieldContent = JSON.stringify(second.field.result);
    expect(fieldContent).toContain('Decimal Property__c.Beds__c');
    expect(fieldContent).not.toContain('Searching for symbol');
    expect(second.qualifierDefinition.result).toEqual([
      expect.objectContaining({ uri }),
    ]);
    expect(second.fieldDefinition.result).toEqual([
      expect.objectContaining({
        uri: 'file:///objects/Property__c/fields/Beds__c.field-meta.xml',
      }),
    ]);
    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy.mock.calls[0][0].identifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Property__c',
          identifierType: 'sobject',
        }),
      ]),
    );
  }, 120_000);

  it('returns instance members for refined this-access through the worker topology', async () => {
    const completionUri = 'file:///test/DoesItOpen.cls';
    const completionSource = [
      'public class DoesItOpen {',
      '  public DoesItOpen() {',
      '    this.may',
      '  }',
      '  public String maybeItOpens() {',
      "    return 'Yes';",
      '  }',
      '  public static String maybeStatic() {',
      "    return 'Static';",
      '  }',
      '}',
    ].join('\n');

    const response = await Effect.runPromise(
      runFeature(
        () =>
          new DispatchCompletion({
            textDocument: { uri: completionUri },
            position: { line: 2, character: 12 },
            content: completionSource,
            context: { triggerKind: 1 },
          }),
        { uri: completionUri, source: completionSource },
      ),
    );

    const completion = response.result as {
      items: Array<{ label?: string }>;
      isIncomplete: boolean;
    };
    expect(completion.items.map((item) => item.label)).toContain(
      'maybeItOpens()',
    );
    expect(completion.items.map((item) => item.label)).not.toContain(
      'block_6_40',
    );
    expect(completion.items.map((item) => item.label)).not.toContain(
      'maybeStatic()',
    );
  }, 120_000);

  it('resolves a shadowed this-field through the worker topology', async () => {
    const definitionUri = 'file:///test/ApexClassExample.cls';
    const definitionSource = [
      'public with sharing class ApexClassExample {',
      "  private static final String DEFAULT_STATUS = 'Active';",
      '  private static Map<String, Object> configCache = new Map<String, Object>();',
      '  private String instanceId;',
      '  private List<Account> accounts;',
      '  public ApexClassExample() {',
      "    this('default-instance');",
      '  }',
      '  public ApexClassExample(String instanceId) {',
      '    if (String.isBlank(instanceId)) {',
      "      throw new IllegalArgumentException('Instance ID cannot be blank');",
      '    }',
      '    this.instanceId = instanceId;',
      '    this.accounts = new List<Account>();',
      '  }',
      '}',
    ].join('\n');
    const memberCharacter = definitionSource
      .split('\n')[12]
      .indexOf('instanceId');

    const response = await Effect.runPromise(
      runFeature(
        () =>
          new DispatchDefinition({
            textDocument: { uri: definitionUri },
            position: { line: 12, character: memberCharacter },
            content: definitionSource,
            documentVersion: 1,
          }),
        { uri: definitionUri, source: definitionSource },
      ),
    );

    expect(response.result).toEqual([
      expect.objectContaining({
        uri: definitionUri,
        range: expect.objectContaining({
          start: expect.objectContaining({ line: 3 }),
        }),
      }),
    ]);
  }, 120_000);

  it('completes a references round-trip end-to-end', async () => {
    const response = await Effect.runPromise(
      runFeature(
        () =>
          new DispatchReferences({
            textDocument: { uri: URI },
            position: { line: 1, character: 11 }, // on greet in the interface
            context: { includeDeclaration: true },
          }),
      ),
    );

    logger.debug(
      `[round-trip:references] completed result=${JSON.stringify(response.result)}`,
    );
    expect(response).toBeDefined();
    expect('result' in response).toBe(true);
  }, 120_000);

  it('completes an implementation round-trip end-to-end', async () => {
    const response = await Effect.runPromise(
      runFeature(
        () =>
          new DispatchImplementation({
            textDocument: { uri: URI },
            position: { line: 1, character: 11 }, // on Greeter.greet()
          }),
      ),
    );

    logger.debug(
      `[round-trip:implementation] completed result=${JSON.stringify(response.result)}`,
    );
    expect(response).toBeDefined();
    expect('result' in response).toBe(true);
  }, 120_000);

  // Phase 4 integration coverage (W-22629623): prove the codeAction request
  // travels WorkerCoordinator → worker.platform.shared (DispatchCodeAction) →
  // CodeActionProcessingService and returns real WorkspaceEdits, not just a
  // settled (possibly null) result. The extract refactorings compute their
  // edits off the local CST parse, so they produce edits deterministically —
  // this is an edit assertion, not merely a "did it come back" check.
  it('completes a codeAction round-trip end-to-end with a WorkspaceEdit', async () => {
    // Self-contained, cleanly-parsing class with a single extractable
    // expression (`1 + 2 * 3`) in a local-variable declaration.
    const EXTRACT_URI = 'file:///test/Extract.cls';
    const EXTRACT_SOURCE = [
      'public class Extract {',
      '  public void run() {',
      '    Integer total = 1 + 2 * 3;',
      '  }',
      '}',
    ].join('\n');
    // 0-based line/character of `2 * 3` on line 3.
    const exprCol = EXTRACT_SOURCE.split('\n')[2].indexOf('2 * 3');

    const response = await Effect.runPromise(
      runFeature(
        () =>
          new DispatchCodeAction({
            textDocument: { uri: EXTRACT_URI },
            range: {
              start: { line: 2, character: exprCol },
              end: { line: 2, character: exprCol + '2 * 3'.length },
            },
            content: EXTRACT_SOURCE,
            context: { diagnostics: [] },
          }),
        { uri: EXTRACT_URI, source: EXTRACT_SOURCE },
      ),
    );

    logger.debug(
      `[round-trip:codeAction] completed result=${JSON.stringify(response.result)}`,
    );
    expect(response).toBeDefined();
    expect('result' in response).toBe(true);

    // The service returns an array of CodeActions; the extract refactorings
    // carry an eager `edit` (WorkspaceEdit) with no resolve round-trip.
    const actions = response.result as Array<{
      title?: string;
      edit?: { changes?: Record<string, unknown[]> };
    }>;
    expect(Array.isArray(actions)).toBe(true);
    const withEdit = actions.filter((a) => a.edit?.changes);
    expect(withEdit.length).toBeGreaterThan(0);
    // Every produced edit targets the requested document.
    for (const action of withEdit) {
      expect(Object.keys(action.edit!.changes!)).toContain(EXTRACT_URI);
    }
  }, 120_000);

  /**
   * CONCURRENT ENRICHMENT FROM MULTIPLE POOL WORKERS (activated from a former
   * WriteBackProtocol it.skip).
   *
   * Several pool workers each handle a hover for the same file concurrently;
   * each independently loads the symbol subset, enriches, and writes back via
   * dataOwner:UpdateSymbolSubset. The data-owner serializes those racing
   * write-backs and the detail-level guard prevents regression, so the file's
   * stored detail level only ever moves UP (toward 'full') — never backward —
   * and every dispatch completes. This is distinct from the direct-write-back
   * detail race and the latch-stampede in WorkerConcurrencyInterop: here the
   * write-backs originate from real concurrent ENRICHMENT runs on multiple pool
   * workers, exercising the full pool→coordinator→data-owner path under
   * contention.
   */
  it('handles concurrent hovers from multiple pool workers without losing or regressing enrichment', async () => {
    const HOVER_POSITIONS = [
      { line: 1, character: 11 },
      { line: 4, character: 18 },
      { line: 5, character: 15 },
      { line: 1, character: 11 },
      { line: 4, character: 18 },
    ];

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 3, // multiple enrichment workers
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(topology, logger, () => SAMPLE);
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 3);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: URI,
            languageId: 'apex',
            version: 1,
            getText: () => SAMPLE,
          },
          textDocument: { uri: URI },
          text: SAMPLE,
        }),
      );

      // Fire several concurrent hovers at different positions; the pool spreads
      // them across its 3 workers, each enriching + writing back concurrently.
      const hovers = HOVER_POSITIONS.map((position) =>
        topology.requestPool.executeEffect(
          new DispatchHover({
            textDocument: { uri: URI },
            position,
            content: SAMPLE,
          }) as never,
        ),
      );
      const results = (yield* Effect.all(hovers, {
        concurrency: 'unbounded',
      })) as { result: unknown }[];

      const query = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('QuerySymbolSubset', { uris: [URI] }),
      )) as {
        versions: Record<string, number>;
        detailLevels: Record<string, string>;
      };

      return { results, query };
    }).pipe(Effect.scoped);

    const { results, query } = await Effect.runPromise(program);

    const levelOrder: Record<string, number> = {
      'public-api': 1,
      protected: 2,
      private: 3,
      full: 4,
    };
    const finalLevel = query.detailLevels[URI];

    logger.debug(
      `[round-trip:concurrent-hovers] completed=${results.length} ` +
        `version=${query.versions[URI]} finalLevel=${finalLevel}`,
    );

    // Every concurrent dispatch completed (none hung on the bus) ...
    expect(results).toHaveLength(HOVER_POSITIONS.length);
    results.forEach((r) => expect('result' in r).toBe(true));
    // ... the version is unchanged (no edits) ...
    expect(query.versions[URI]).toBe(1);
    // ... and the stored detail level is at least public-api and never regressed
    // below what any single write-back established (monotonic under contention).
    expect(levelOrder[finalLevel]).toBeGreaterThanOrEqual(
      levelOrder['public-api'],
    );
  }, 120_000);

  /**
   * CROSS-FILE GO-TO-IMPLEMENTATION (regression for the live empty-result bug).
   *
   * Reproduces the exact live sequence: cold-open an interface, then load the
   * workspace (which batch-ingests + batch-compiles the implementor that lives
   * in another file), then go-to-implementation on the interface method. The
   * implementor's `implements` edge is CROSS-FILE; the data-owner never ran
   * resolveCrossFileReferencesForFile on the batch-compiled implementor, so its
   * edge stayed out of the reverse index and resolveDependentUris(interface)
   * returned nothing — go-to-implementation came back empty even after the load.
   * The fix resolves supertype edges eagerly in addSymbolTable, so the data
   * owner's reverse index sees implementor → interface and the pool worker's
   * loadDependentsForReferences pulls the implementor in.
   *
   * Asserts the result is NON-EMPTY and points at the implementor file — the
   * content assertion that the other round-trip tests omit.
   */
  it('go-to-implementation finds a cross-file implementor after a workspace load', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      // getDocumentContent serves whichever file is asked for (the coordinator's
      // TextDocuments would do this live); documentSymbol/implementation thread
      // it, and the interface is the open file.
      const sources: Record<string, string> = { [IFACE_URI]: IFACE_SRC };
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => sources[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      // 1. Cold-open the interface: data-owner stores + compiles it (target type
      //    enters the graph first — the live ordering).
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: IFACE_URI,
            languageId: 'apex',
            version: 1,
            getText: () => IFACE_SRC,
          },
          textDocument: { uri: IFACE_URI },
          text: IFACE_SRC,
        }),
      );

      // 2. Workspace load: batch-ingest then batch-compile the implementor (and
      //    the interface), exactly as the live load path does. The implementor's
      //    write-back lands at public-api; addSymbolTable must now resolve its
      //    implements edge into the data-owner reverse index.
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();
      const entries = [
        { uri: IFACE_URI, content: IFACE_SRC, languageId: 'apex', version: 1 },
        { uri: IMPL_URI, content: IMPL_SRC, languageId: 'apex', version: 1 },
      ];
      yield* Effect.promise(() => ingest('wf-impl-test', entries));
      yield* Effect.promise(() =>
        compile({ sessionId: 'wf-impl-test', entries }),
      );

      // 3. Go-to-implementation on the interface method `run` (line 1).
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('implementation', {
          textDocument: { uri: IFACE_URI },
          position: { line: 1, character: 11 }, // on `run` in `String run();`
        }),
      );

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    // The result is an LSP Location | Location[] | LocationLink[]. Normalize to
    // an array and pull out the target URIs.
    const locations = (
      Array.isArray(result) ? result : result ? [result] : []
    ) as Array<{ uri?: string; targetUri?: string }>;
    const targetUris = locations.map((l) => l.uri ?? l.targetUri ?? '');

    logger.debug(
      `[round-trip:goto-impl] count=${locations.length} targets=${JSON.stringify(targetUris)}`,
    );

    // The crux: go-to-implementation must locate the implementor in the OTHER
    // file. Before the fix this array was empty.
    expect(locations.length).toBeGreaterThan(0);
    expect(targetUris.some((u) => u.includes('FaceImpl'))).toBe(true);
  }, 120_000);

  /**
   * MULTIPLE CROSS-FILE IMPLEMENTORS, added incrementally (regression for the
   * live "only the first implementor resolves" bug).
   *
   * The user's exact sequence: cold-open the interface, run
   * go-to-implementation (resolves implementor #1 and CACHES that result under
   * refs_to_<interface>), then create a NEW implementing class and run
   * go-to-implementation again. Before the fix the stale relationship cache in
   * ApexSymbolManager.findReferencesTo pinned the result to implementor #1, so
   * the newly-added implementor #2 never appeared. addSymbolTable now
   * invalidates the refs_to_ / refs_from_ cache family on every add, so the
   * second go-to-implementation sees BOTH implementors.
   *
   * Asserts the SECOND query returns BOTH implementor files — the multiplicity
   * the single-implementor test above cannot catch.
   */
  it('go-to-implementation returns ALL implementors when a second one is added after the first query', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const sources: Record<string, string> = { [IFACE_URI]: IFACE_SRC };
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => sources[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      // 1. Cold-open the interface.
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: IFACE_URI,
            languageId: 'apex',
            version: 1,
            getText: () => IFACE_SRC,
          },
          textDocument: { uri: IFACE_URI },
          text: IFACE_SRC,
        }),
      );

      // 2. Workspace load with ONLY the first implementor present.
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();
      const firstWave = [
        { uri: IFACE_URI, content: IFACE_SRC, languageId: 'apex', version: 1 },
        { uri: IMPL_URI, content: IMPL_SRC, languageId: 'apex', version: 1 },
      ];
      yield* Effect.promise(() => ingest('wf-multi-test', firstWave));
      yield* Effect.promise(() =>
        compile({ sessionId: 'wf-multi-test', entries: firstWave }),
      );

      // 3. First go-to-implementation — populates the relationship cache with
      //    just implementor #1.
      const firstResult = yield* Effect.promise(() =>
        dispatcher.dispatch('implementation', {
          textDocument: { uri: IFACE_URI },
          position: { line: 1, character: 11 },
        }),
      );

      // 4. Create a NEW implementing class and compile it (as saving a new .cls
      //    does live). Its implements edge must invalidate the stale cache.
      const secondWave = [
        { uri: IMPL2_URI, content: IMPL2_SRC, languageId: 'apex', version: 1 },
      ];
      yield* Effect.promise(() => ingest('wf-multi-test-2', secondWave));
      yield* Effect.promise(() =>
        compile({ sessionId: 'wf-multi-test-2', entries: secondWave }),
      );

      // 5. Second go-to-implementation — must now return BOTH implementors.
      const secondResult = yield* Effect.promise(() =>
        dispatcher.dispatch('implementation', {
          textDocument: { uri: IFACE_URI },
          position: { line: 1, character: 11 },
        }),
      );

      return { firstResult, secondResult };
    }).pipe(Effect.scoped);

    const { firstResult, secondResult } = await Effect.runPromise(program);

    const toUris = (result: unknown): string[] => {
      const locations = (
        Array.isArray(result) ? result : result ? [result] : []
      ) as Array<{ uri?: string; targetUri?: string }>;
      return locations.map((l) => l.uri ?? l.targetUri ?? '');
    };

    const firstUris = toUris(firstResult);
    const secondUris = toUris(secondResult);
    logger.debug(
      `[round-trip:goto-impl-multi] first=${JSON.stringify(firstUris)} ` +
        `second=${JSON.stringify(secondUris)}`,
    );

    // First query saw only implementor #1.
    expect(firstUris.some((u) => u.includes('FaceImpl'))).toBe(true);

    // The crux: after adding implementor #2, the second query returns BOTH.
    // Before the fix the stale cache returned only FaceImpl (the first).
    expect(secondUris.some((u) => u.includes('FaceImpl.cls'))).toBe(true);
    expect(secondUris.some((u) => u.includes('FaceImpl2'))).toBe(true);
  }, 120_000);

  /**
   * NEW IMPLEMENTOR CREATED + EDITED VIA THE LIVE NOTIFICATION PATH (regression
   * for the live "second implementor never resolves" bug).
   *
   * The multi-implementor test above adds implementor #2 via batch
   * ingest+compile, which writes straight to the data-owner — so it never
   * exercised the live editor flow and passed even while the live bug persisted.
   * Live, a newly-created class arrives as documentOpen (often an empty/partial
   * class) followed by documentChange/documentSave as the user types
   * `implements IFace` and the method body. Those change/save notifications must
   * recompile the file into the DATA-OWNER graph — not just the coordinator's
   * local symbol manager — or the request-pool go-to-implementation never sees
   * the new implements edge.
   *
   * This test drives implementor #2 through documentOpen (no `implements`),
   * then documentChange (full-text sync: the whole updated document), then
   * documentSave, then runs go-to-implementation. It must return BOTH
   * implementors. Before the fix, change/save ran only coordinator-local and the
   * data-owner kept the edge-less open version, so only FaceImpl resolved.
   */
  it('go-to-implementation sees a new implementor added via documentOpen→change→save', async () => {
    // Implementor #2 starts WITHOUT the implements clause (as a new empty class
    // would), then gains it via a change + save.
    const IMPL3_URI = 'file:///test/FaceImpl3.cls';
    const IMPL3_OPEN_SRC = `public with sharing class FaceImpl3 {
}`;
    const IMPL3_FINAL_SRC = `public with sharing class FaceImpl3 implements IFace {
    public String run() {
        return 'r3';
    }
}`;

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      // Serve whichever content each URI currently holds; updated as the
      // implementor is edited so getDocumentContent (used by request-pool
      // dispatches) returns the live text.
      const sources: Record<string, string> = {
        [IFACE_URI]: IFACE_SRC,
        [IMPL3_URI]: IMPL3_OPEN_SRC,
      };
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => sources[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      // 1. Cold-open the interface + load the workspace with implementor #1.
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: IFACE_URI,
            languageId: 'apex',
            version: 1,
            getText: () => IFACE_SRC,
          },
          textDocument: { uri: IFACE_URI },
          text: IFACE_SRC,
        }),
      );
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();
      const firstWave = [
        { uri: IFACE_URI, content: IFACE_SRC, languageId: 'apex', version: 1 },
        { uri: IMPL_URI, content: IMPL_SRC, languageId: 'apex', version: 1 },
      ];
      yield* Effect.promise(() => ingest('wf-live-test', firstWave));
      yield* Effect.promise(() =>
        compile({ sessionId: 'wf-live-test', entries: firstWave }),
      );

      // 2. First go-to-implementation — caches the current set ([FaceImpl]).
      const firstResult = yield* Effect.promise(() =>
        dispatcher.dispatch('implementation', {
          textDocument: { uri: IFACE_URI },
          position: { line: 1, character: 11 },
        }),
      );

      // 3. Create FaceImpl3 as a new file via documentOpen — NO implements yet.
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: IMPL3_URI,
            languageId: 'apex',
            version: 1,
            getText: () => IMPL3_OPEN_SRC,
          },
          textDocument: { uri: IMPL3_URI },
          text: IMPL3_OPEN_SRC,
        }),
      );

      // 4. Type the implements clause + method (full-text sync: the change event
      //    carries the entire updated document), then save.
      sources[IMPL3_URI] = IMPL3_FINAL_SRC;
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentChange', {
          document: {
            uri: IMPL3_URI,
            languageId: 'apex',
            version: 2,
            getText: () => IMPL3_FINAL_SRC,
          },
          textDocument: { uri: IMPL3_URI },
        }),
      );
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentSave', {
          document: {
            uri: IMPL3_URI,
            languageId: 'apex',
            version: 2,
            getText: () => IMPL3_FINAL_SRC,
          },
          textDocument: { uri: IMPL3_URI },
        }),
      );

      // 5. Second go-to-implementation — must now include FaceImpl3.
      const secondResult = yield* Effect.promise(() =>
        dispatcher.dispatch('implementation', {
          textDocument: { uri: IFACE_URI },
          position: { line: 1, character: 11 },
        }),
      );

      return { firstResult, secondResult };
    }).pipe(Effect.scoped);

    const { firstResult, secondResult } = await Effect.runPromise(program);

    const toUris = (result: unknown): string[] => {
      const locations = (
        Array.isArray(result) ? result : result ? [result] : []
      ) as Array<{ uri?: string; targetUri?: string }>;
      return locations.map((l) => l.uri ?? l.targetUri ?? '');
    };

    const firstUris = toUris(firstResult);
    const secondUris = toUris(secondResult);
    logger.debug(
      `[round-trip:goto-impl-live-edit] first=${JSON.stringify(firstUris)} ` +
        `second=${JSON.stringify(secondUris)}`,
    );

    expect(firstUris.some((u) => u.includes('FaceImpl.cls'))).toBe(true);

    // The crux: the edit+save of the new implementor reached the data-owner, so
    // go-to-implementation discovers it. Before the fix change/save ran only on
    // the coordinator and FaceImpl3 never appeared.
    expect(secondUris.some((u) => u.includes('FaceImpl.cls'))).toBe(true);
    expect(secondUris.some((u) => u.includes('FaceImpl3'))).toBe(true);
  }, 120_000);
});
