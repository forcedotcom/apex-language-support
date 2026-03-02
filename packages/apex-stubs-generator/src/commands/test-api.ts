import { Effect, Console, pipe } from "effect";
import { fetchDocumentStructure, fetchPageContent } from "../scraper/json-api-scraper";
import { writeFile } from "node:fs/promises";

const program = Effect.gen(function* () {
  yield* Console.log("=== Testing JSON API Scraping ===\n");

  const structure = yield* fetchDocumentStructure();

  yield* Effect.tryPromise({
    try: () => writeFile('doc-structure.json', JSON.stringify(structure, null, 2)),
    catch: (error) => new Error(`Failed to write structure: ${error}`),
  });

  yield* Console.log("Saved structure to doc-structure.json\n");

  const stringContent = yield* fetchPageContent("apex_methods_system_string.htm");

  yield* Effect.tryPromise({
    try: () => writeFile('string-content.json', JSON.stringify(stringContent, null, 2)),
    catch: (error) => new Error(`Failed to write content: ${error}`),
  });

  yield* Console.log("Saved String class content to string-content.json");

  if (structure.toc && structure.toc.length > 0) {
    yield* Console.log(`\nTOC has ${structure.toc.length} top-level entries`);
    yield* Console.log(`First entry: ${structure.toc[0].text || structure.toc[0].title || 'unknown'}`);
  }

  if (stringContent.content) {
    yield* Console.log(`\nString content length: ${stringContent.content.length} chars`);
    yield* Console.log(`First 200 chars: ${stringContent.content.substring(0, 200)}`);
  }
});

pipe(
  program,
  Effect.catchAll((error) => Console.log(`Error: ${JSON.stringify(error)}`)),
  Effect.runPromise
);
