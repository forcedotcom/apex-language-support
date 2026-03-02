import { Effect, Console, pipe } from "effect";
import { resolve } from "node:path";
import { scrapeAllDocumentation } from "../scraper/main-scraper";
import { generateStubs } from "../generator/stub-generator";

/**
 * Default output: StandardApexLibrary in apex-parser-ast.
 * Override with STUBS_OUTPUT_DIR env var.
 */
const DEFAULT_OUTPUT = resolve(process.cwd(), "../apex-parser-ast/src/resources/StandardApexLibrary");

const program = Effect.gen(function* () {
  yield* Console.log("=== Apex Stub Generator ===");
  yield* Console.log("Using web scraping from Salesforce documentation");
  yield* Console.log("");

  const outputDir = process.env["STUBS_OUTPUT_DIR"] ?? DEFAULT_OUTPUT;
  yield* Console.log(`Output directory: ${outputDir}`);
  yield* Console.log("");

  yield* Console.log("Step 1: Scraping Apex documentation...");
  const namespaces = yield* scrapeAllDocumentation();
  yield* Console.log("");

  yield* Console.log("Step 2: Generating stub files...");
  yield* generateStubs(namespaces, outputDir);
  yield* Console.log("");

  yield* Console.log("=== Generation Complete ===");
  yield* Console.log(`Output directory: ${outputDir}`);
});

pipe(
  program,
  Effect.catchAll((error) => Console.log(`Error: ${JSON.stringify(error, null, 2)}`)),
  Effect.runPromise
);
