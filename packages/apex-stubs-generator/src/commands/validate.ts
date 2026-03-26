import { Effect, Console, pipe } from 'effect';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fetchDocumentStructure } from '../scraper/json-api-scraper';
import { parseTocStructure } from '../parser/toc-parser';
import {
  extractNamespaceCounts,
  type NamespaceCounts,
} from '../parser/content-parser';

const DEFAULT_OUTPUT = resolve(
  process.cwd(),
  '../apex-parser-ast/src/resources/StandardApexLibrary',
);
const DOC_STRUCTURE_CACHE = 'doc-structure.json';

interface Manifest {
  generatedAt: string;
  namespaces: Record<string, NamespaceCounts>;
}

interface ValidationResult {
  namespace: string;
  namespacePageId: string;
  namespaceUrl: string;
  expectedTotal: number;
  expectedClasses: number;
  expectedInterfaces: number;
  expectedEnums: number;
  expectedExceptionPages: number;
  actualFiles: number;
  status: 'ok' | 'missing' | 'extra' | 'absent';
  delta: number;
  note?: string;
}

const DOC_URL_BASE =
  'https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref';

const buildNamespaceUrl = (pageId: string): string =>
  `${DOC_URL_BASE}/${pageId}`;

const formatCell = (value: string | number, width: number): string =>
  String(value).padEnd(width, ' ');

const buildMatrixRow = (
  r: ValidationResult,
  widths: {
    ns: number;
    pid: number;
    toc: number;
    cls: number;
    ifc: number;
    enm: number;
    exc: number;
    gen: number;
    dlt: number;
    sts: number;
    note: number;
    url: number;
  },
): string =>
  [
    formatCell(r.namespace, widths.ns),
    formatCell(r.namespacePageId, widths.pid),
    formatCell(r.expectedTotal, widths.toc),
    formatCell(r.expectedClasses, widths.cls),
    formatCell(r.expectedInterfaces, widths.ifc),
    formatCell(r.expectedEnums, widths.enm),
    formatCell(r.expectedExceptionPages, widths.exc),
    formatCell(r.actualFiles, widths.gen),
    formatCell(r.delta > 0 ? `+${r.delta}` : r.delta, widths.dlt),
    formatCell(r.status, widths.sts),
    formatCell(r.note ?? '', widths.note),
    formatCell(r.namespaceUrl, widths.url),
  ].join(' | ');

const loadDocStructure = () =>
  Effect.gen(function* () {
    const cached = yield* Effect.tryPromise({
      try: () => readFile(DOC_STRUCTURE_CACHE, 'utf-8'),
      catch: () => null,
    }).pipe(Effect.catchAll(() => Effect.succeed(null)));

    if (cached) {
      yield* Console.log(`Using cached ${DOC_STRUCTURE_CACHE}`);
      return JSON.parse(cached);
    }

    yield* Console.log('Fetching fresh document structure...');
    const structure = yield* fetchDocumentStructure();
    yield* Effect.tryPromise({
      try: () =>
        writeFile(DOC_STRUCTURE_CACHE, JSON.stringify(structure, null, 2)),
      catch: (e) => new Error(`Failed to cache structure: ${e}`),
    });
    return structure;
  });

const countGeneratedFiles = (outputDir: string, namespaceName: string) =>
  Effect.gen(function* () {
    const nsDir = join(outputDir, namespaceName);
    const files = yield* Effect.tryPromise({
      try: () => readdir(nsDir),
      catch: () => [] as string[],
    }).pipe(Effect.catchAll(() => Effect.succeed([] as string[])));

    return files.filter((f) => f.endsWith('.cls')).length;
  });

const program = Effect.gen(function* () {
  const args = process.argv.slice(2);
  const writeManifest = args.includes('--manifest');

  yield* Console.log('=== Apex Stub Validator ===\n');

  const outputDir = process.env['STUBS_OUTPUT_DIR'] ?? DEFAULT_OUTPUT;
  yield* Console.log(`Validating against: ${outputDir}\n`);

  const docStructure = yield* loadDocStructure();
  const namespaces = yield* parseTocStructure(docStructure);
  const expectedCounts = extractNamespaceCounts(namespaces);
  const namespaceInfoByName = new Map(
    namespaces.map((ns) => [ns.name, ns] as const),
  );

  yield* Console.log(`TOC has ${namespaces.length} namespaces\n`);

  const results: ValidationResult[] = [];

  for (const [nsName, counts] of expectedCounts) {
    const nsInfo = namespaceInfoByName.get(nsName);
    const namespacePageId = nsInfo?.pageId ?? '';
    const namespaceUrl = namespacePageId
      ? buildNamespaceUrl(namespacePageId)
      : '';
    const actualFiles = yield* countGeneratedFiles(outputDir, nsName);
    const delta = actualFiles - counts.total;

    let status: ValidationResult['status'];
    if (actualFiles === 0 && counts.total > 0) {
      status = 'absent';
    } else if (delta < 0) {
      status = 'missing';
    } else if (delta > 0) {
      status = 'extra';
    } else {
      status = 'ok';
    }

    results.push({
      namespace: nsName,
      namespacePageId,
      namespaceUrl,
      expectedTotal: counts.total,
      expectedClasses: counts.classes,
      expectedInterfaces: counts.interfaces,
      expectedEnums: counts.enums,
      expectedExceptionPages: counts.exceptionPages,
      actualFiles,
      status,
      delta,
    });
  }

  const ok = results.filter((r) => r.status === 'ok');
  const issues = results.filter((r) => r.status !== 'ok');

  yield* Console.log(
    `Results: ${ok.length} namespaces match, ${issues.length} have issues\n`,
  );

  if (issues.length > 0) {
    yield* Console.log('Issues:');
    for (const r of issues) {
      const sign = r.delta > 0 ? '+' : '';
      yield* Console.log(
        `  [${r.status.toUpperCase()}] ${r.namespace}: expected ${r.expectedTotal}, got ${r.actualFiles} (${sign}${r.delta})`,
      );
    }
    yield* Console.log('');
  }

  const widths = {
    ns: 22,
    pid: 40,
    toc: 5,
    cls: 5,
    ifc: 5,
    enm: 5,
    exc: 5,
    gen: 5,
    dlt: 5,
    sts: 8,
    note: 58,
    url: 96,
  } as const;
  const header = [
    formatCell('namespace', widths.ns),
    formatCell('pageId', widths.pid),
    formatCell('toc', widths.toc),
    formatCell('cls', widths.cls),
    formatCell('ifc', widths.ifc),
    formatCell('enm', widths.enm),
    formatCell('exc', widths.exc),
    formatCell('gen', widths.gen),
    formatCell('delta', widths.dlt),
    formatCell('status', widths.sts),
    formatCell('note', widths.note),
    formatCell('docUrl', widths.url),
  ].join(' | ');
  const divider = '-'.repeat(header.length);

  yield* Console.log('Namespace audit matrix:');
  yield* Console.log(header);
  yield* Console.log(divider);
  for (const row of results.sort((a, b) =>
    a.namespace.localeCompare(b.namespace),
  )) {
    yield* Console.log(buildMatrixRow(row, widths));
  }
  yield* Console.log('');

  if (writeManifest) {
    const manifestFile = join(outputDir, 'manifest.json');
    const manifest: Manifest = {
      generatedAt: new Date().toISOString(),
      namespaces: Object.fromEntries(expectedCounts),
    };

    yield* Effect.tryPromise({
      try: async () => {
        await mkdir(outputDir, { recursive: true });
        await writeFile(
          manifestFile,
          JSON.stringify(manifest, null, 2),
          'utf-8',
        );
      },
      catch: (e) => new Error(`Failed to write manifest: ${e}`),
    });

    yield* Console.log(`Manifest written to ${manifestFile}`);
  }

  yield* Console.log('=== Validation Complete ===');

  if (issues.length > 0) {
    yield* Console.log(
      `\nWARNING: ${issues.length} namespace(s) have mismatched counts.`,
    );
  } else {
    yield* Console.log('\nAll namespaces match expected counts.');
  }
});

pipe(
  program,
  Effect.catchAll((error) =>
    Console.log(`Error: ${JSON.stringify(error, null, 2)}`),
  ),
  Effect.runPromise,
);
