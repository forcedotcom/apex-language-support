import { Effect, Console } from "effect";
import { fetchDocumentStructure, fetchPageContent, ApiScrapingError } from "./json-api-scraper";
import { parseTocStructure, type NamespaceInfo, type ClassReference } from "../parser/toc-parser";
import {
  extractMethodsFromHtml,
  extractConstructorsFromHtml,
  extractClassDescriptionFromHtml,
  extractEnumValuesFromHtml,
  extractExceptionClassNamesFromHtml,
  extractMultipleEnumsFromHtml,
} from "../parser/html-parser";
import { extractSlackClassReferences, scrapeSlackClass } from "./slack-scraper";
import { ApexClass, ApexEnum, ApexEnumValue, ApexInnerException, ApexNamespace } from "../types/apex";
import { readFile, writeFile } from "node:fs/promises";

export class ScrapingError {
  readonly _tag = "ScrapingError";
  constructor(readonly message: string, readonly cause?: unknown) {}
}

const getDocumentStructure = (cacheFile: string) =>
  Effect.gen(function* () {
    const cached = yield* Effect.tryPromise({
      try: () => readFile(cacheFile, "utf-8"),
      catch: () => null,
    }).pipe(Effect.catchAll(() => Effect.succeed(null)));

    if (cached) {
      yield* Console.log("Using cached document structure");
      return JSON.parse(cached);
    }

    yield* Console.log("Fetching fresh document structure...");
    const structure = yield* fetchDocumentStructure();

    yield* Effect.tryPromise({
      try: () => writeFile(cacheFile, JSON.stringify(structure, null, 2)),
      catch: (error) => new ScrapingError(`Failed to cache structure: ${error}`),
    });

    return structure;
  });

const scrapeClass = (ref: ClassReference) =>
  Effect.gen(function* () {
    yield* Console.log(`  Scraping class: ${ref.namespace}.${ref.name} (${ref.pageId})`);

    const content = yield* fetchPageContent(ref.pageId);

    if (!content.content) {
      yield* Console.log(`    Warning: No content found for ${ref.name}`);
      return [new ApexClass({ name: ref.name, namespace: ref.namespace, methods: [], properties: [], isInterface: false })];
    }

    const classDescription = yield* extractClassDescriptionFromHtml(content.content);
    const methods = yield* extractMethodsFromHtml(content.content, ref.name);
    const constructors = yield* extractConstructorsFromHtml(content.content, ref.name);

    return [new ApexClass({ name: ref.name, namespace: ref.namespace, description: classDescription, methods, constructors, properties: [], isInterface: false })];
  });

const scrapeInterface = (ref: ClassReference) =>
  Effect.gen(function* () {
    yield* Console.log(`  Scraping interface: ${ref.namespace}.${ref.name} (${ref.pageId})`);

    const content = yield* fetchPageContent(ref.pageId);

    if (!content.content) {
      return [new ApexClass({ name: ref.name, namespace: ref.namespace, methods: [], properties: [], isInterface: true })];
    }

    const classDescription = yield* extractClassDescriptionFromHtml(content.content);
    const methods = yield* extractMethodsFromHtml(content.content, ref.name);
    const constructors = yield* extractConstructorsFromHtml(content.content, ref.name);

    return [new ApexClass({ name: ref.name, namespace: ref.namespace, description: classDescription, methods, constructors, properties: [], isInterface: true })];
  });

type ExceptionScrapeResult =
  | { kind: "topLevel"; cls: ApexClass }
  | { kind: "inner"; name: string; parentClass: string };

const scrapeExceptions = (ref: ClassReference) =>
  Effect.gen(function* () {
    yield* Console.log(`  Scraping exceptions page: ${ref.namespace} (${ref.pageId})`);

    const content = yield* fetchPageContent(ref.pageId);

    if (!content.content) {
      return [] as ExceptionScrapeResult[];
    }

    const extracted = yield* extractExceptionClassNamesFromHtml(content.content, ref.namespace);
    const description = yield* extractClassDescriptionFromHtml(content.content);

    if (extracted.length === 0) {
      yield* Console.log(`    Fallback: treating as single exception class ${ref.name}`);
      return [{ kind: "topLevel" as const, cls: new ApexClass({ name: ref.name, namespace: ref.namespace, description, methods: [], properties: [] }) }];
    }

    return extracted.map(({ name, parentClass }): ExceptionScrapeResult =>
      parentClass
        ? { kind: "inner", name, parentClass }
        : { kind: "topLevel", cls: new ApexClass({ name, namespace: ref.namespace, methods: [], properties: [] }) }
    );
  });

const scrapeEnum = (ref: ClassReference) =>
  Effect.gen(function* () {
    yield* Console.log(`  Scraping enum: ${ref.namespace}.${ref.name} (${ref.pageId})`);

    const content = yield* fetchPageContent(ref.pageId);

    if (!content.content) {
      return [new ApexEnum({ name: ref.name, namespace: ref.namespace, values: [] })];
    }

    // Detect aggregate enum pages (e.g. connectAPI_enums.htm) by trying the
    // multi-enum extractor first. If it finds multiple enums we treat this as an
    // aggregate page and return all of them. If the placeholder name has spaces
    // (e.g. "ConnectApi Enums") and extraction yields nothing, return empty rather
    // than writing a file with a space in the name.
    const multiEnums = yield* extractMultipleEnumsFromHtml(content.content, ref.namespace);
    if (multiEnums.length > 1) {
      return multiEnums.map(e =>
        new ApexEnum({ name: e.name, namespace: ref.namespace, values: e.values.map(v => new ApexEnumValue({ name: v })) })
      );
    }
    if (/\s/.test(ref.name)) {
      yield* Console.log(`    Skipping aggregate enum page with no extracted enums: ${ref.name}`);
      return [];
    }

    const description = yield* extractClassDescriptionFromHtml(content.content);
    const values = yield* extractEnumValuesFromHtml(content.content, ref.name);

    return [new ApexEnum({ name: ref.name, namespace: ref.namespace, description, values })];
  });

const SCRAPE_CONCURRENCY = 5;

type ScrapeEntryResult =
  | { kind: "enum"; value: ApexEnum[] }
  | { kind: "classes"; value: ApexClass[] }
  | { kind: "exceptions"; value: ExceptionScrapeResult[] };

const scrapeEntry = (ref: ClassReference): Effect.Effect<ScrapeEntryResult, ApiScrapingError> => {
  switch (ref.pageType) {
    case "enum":
      return scrapeEnum(ref).pipe(Effect.map((es) => ({ kind: "enum" as const, value: es })));
    case "interface":
      return scrapeInterface(ref).pipe(Effect.map((cs) => ({ kind: "classes" as const, value: cs })));
    case "exceptions":
      return scrapeExceptions(ref).pipe(Effect.map((es) => ({ kind: "exceptions" as const, value: es })));
    default:
      return scrapeClass(ref).pipe(Effect.map((cs) => ({ kind: "classes" as const, value: cs })));
  }
};

const scrapeNamespace = (namespaceInfo: NamespaceInfo, limit?: number) =>
  Effect.gen(function* () {
    yield* Console.log(`\nScraping namespace: ${namespaceInfo.name} (${namespaceInfo.classes.length} entries)`);

    const entriesToScrape = limit ? namespaceInfo.classes.slice(0, limit) : namespaceInfo.classes;

    const results = yield* Effect.forEach(
      entriesToScrape,
      (ref) =>
        scrapeEntry(ref).pipe(
          Effect.catchAll((error) =>
            Console.log(`    Warning: skipping ${ref.name} due to error: ${error.message}`).pipe(
              Effect.as({ kind: "classes" as const, value: [] as ApexClass[] })
            )
          )
        ),
      { concurrency: SCRAPE_CONCURRENCY }
    );

    const classes: ApexClass[] = [];
    const enums: ApexEnum[] = [];
    const pendingInnerExceptions: Array<{ name: string; parentClass: string }> = [];

    for (const result of results) {
      if (result.kind === "enum") {
        enums.push(...result.value);
      } else if (result.kind === "exceptions") {
        for (const exc of result.value) {
          if (exc.kind === "topLevel") {
            classes.push(exc.cls);
          } else {
            pendingInnerExceptions.push({ name: exc.name, parentClass: exc.parentClass });
          }
        }
      } else {
        classes.push(...result.value);
      }
    }

    // Merge inner exceptions into their parent class stubs.
    // parentClass may include the namespace prefix (e.g. "Cache.Session") — strip it.
    for (const { name, parentClass } of pendingInnerExceptions) {
      const parentSimple = parentClass.includes(".")
        ? parentClass.slice(parentClass.lastIndexOf(".") + 1)
        : parentClass;
      // If parentSimple is the namespace itself, this is a top-level exception
      if (parentSimple === namespaceInfo.name || parentSimple === parentClass) {
        classes.push(new ApexClass({ name, namespace: namespaceInfo.name, methods: [], properties: [] }));
        continue;
      }
      const parent = classes.find(c => c.name === parentSimple);
      if (parent) {
        const existing = parent.innerExceptions ?? [];
        const idx = classes.indexOf(parent);
        classes[idx] = new ApexClass({
          ...parent,
          innerExceptions: [...existing, new ApexInnerException({ name })],
        });
        yield* Console.log(`    Nested ${name} inside ${parentSimple}`);
      } else {
        yield* Console.log(`    Warning: parent class ${parentSimple} not found for ${name}, emitting top-level`);
        classes.push(new ApexClass({ name, namespace: namespaceInfo.name, methods: [], properties: [] }));
      }
    }

    return new ApexNamespace({ name: namespaceInfo.name, classes, enums });
  });

const scrapeSlackNamespace = (limitClasses?: number) =>
  Effect.gen(function* () {
    yield* Console.log(`\nScraping Slack namespace from external docs...`);

    const slackPageContent = yield* fetchPageContent("apex_namespace_Slack.htm");

    if (!slackPageContent.content) {
      yield* Console.log("  Warning: Could not fetch Slack namespace page");
      return new ApexNamespace({ name: "Slack", classes: [], enums: [] });
    }

    const classRefs = extractSlackClassReferences(slackPageContent.content);
    yield* Console.log(`  Found ${classRefs.length} Slack classes`);

    const classesToScrape = limitClasses ? classRefs.slice(0, limitClasses) : classRefs;

    const classes = yield* Effect.forEach(
      classesToScrape,
      (classRef) =>
        scrapeSlackClass(classRef.name, classRef.url).pipe(
          Effect.catchAll((error) =>
            Console.log(`  Warning: Failed to scrape ${classRef.name}: ${error}`).pipe(
              Effect.as(null)
            )
          )
        ),
      { concurrency: SCRAPE_CONCURRENCY }
    ).pipe(Effect.map((results) => results.filter((c): c is ApexClass => c !== null)));

    yield* Console.log(`  Successfully scraped ${classes.length} Slack classes`);
    return new ApexNamespace({ name: "Slack", classes, enums: [] });
  });

/**
 * Main scraping orchestrator
 * @param limitNamespaces - Limit number of namespaces to scrape (for testing)
 * @param limitClassesPerNamespace - Limit entries per namespace (for testing)
 * @param cacheFile - Path for the doc-structure.json cache
 */
export const scrapeAllDocumentation = (
  limitNamespaces?: number,
  limitClassesPerNamespace?: number,
  cacheFile: string = "doc-structure.json"
) =>
  Effect.gen(function* () {
    yield* Console.log("=== Starting Documentation Scraping ===\n");

    const docStructure = yield* getDocumentStructure(cacheFile);
    const namespaces = yield* parseTocStructure(docStructure);

    yield* Console.log(`\nWill scrape ${limitNamespaces || namespaces.length} namespaces`);

    const namespacesToScrape = limitNamespaces ? namespaces.slice(0, limitNamespaces) : namespaces;

    const scrapedNamespaces = yield* Effect.forEach(
      namespacesToScrape,
      (nsInfo) => scrapeNamespace(nsInfo, limitClassesPerNamespace),
      { concurrency: SCRAPE_CONCURRENCY }
    );

    yield* Console.log(`\n=== Scraping Slack Namespace (External Docs) ===`);
    const slackNamespace = yield* scrapeSlackNamespace(limitClassesPerNamespace);

    const apexNamespaces: ApexNamespace[] = [
      ...scrapedNamespaces,
      ...(slackNamespace.classes.length > 0 ? [slackNamespace] : []),
    ];

    yield* Console.log(`\n=== Scraping Complete ===`);
    yield* Console.log(`Total namespaces: ${apexNamespaces.length}`);

    let totalClasses = 0;
    let totalEnums = 0;
    let totalMethods = 0;
    for (const ns of apexNamespaces) {
      totalClasses += ns.classes.length;
      totalEnums += (ns.enums ?? []).length;
      for (const cls of ns.classes) {
        totalMethods += cls.methods.length;
      }
    }

    yield* Console.log(`Total classes/interfaces: ${totalClasses}`);
    yield* Console.log(`Total enums: ${totalEnums}`);
    yield* Console.log(`Total methods: ${totalMethods}`);

    return apexNamespaces;
  });
