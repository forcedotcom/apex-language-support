import { Effect, Console, pipe } from "effect";
import { chromium } from "playwright";

const program = Effect.gen(function* () {
  yield* Console.log("=== Scraping String Class with Playwright ===\n");

  const browser = yield* Effect.tryPromise({
    try: () => chromium.launch({ headless: true }),
    catch: (error) => new Error(`Failed to launch: ${error}`),
  });

  const page = yield* Effect.tryPromise({
    try: () => browser.newPage(),
    catch: (error) => new Error(`Failed to create page: ${error}`),
  });

  const url = "https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_string.htm";
  yield* Console.log(`Loading: ${url}`);

  yield* Effect.tryPromise({
    try: () => page.goto(url, { waitUntil: "networkidle", timeout: 60000 }),
    catch: (error) => new Error(`Failed to load: ${error}`),
  });

  yield* Console.log("Waiting for main content...");
  yield* Effect.tryPromise({
    try: () => page.waitForSelector('main#maincontent', { timeout: 30000 }),
    catch: (error) => new Error(`Main content timeout: ${error}`),
  });

  const mainText = yield* Effect.tryPromise({
    try: () => page.$eval('main#maincontent', (el) => el.textContent || ""),
    catch: (error) => new Error(`Failed to get text: ${error}`),
  });

  yield* Console.log(`\nExtracted ${mainText.length} characters from main content`);

  const methodCount = (mainText.match(/abbreviate|capitalize|charAt|contains/gi) || []).length;
  yield* Console.log(`Found ~${methodCount} method references`);

  yield* Console.log(`\nSample of content:\n${mainText.substring(0, 500)}`);

  yield* Effect.tryPromise({
    try: () => browser.close(),
    catch: () => new Error("Failed to close browser"),
  });
});

pipe(
  program,
  Effect.catchAll((error) => Console.log(`Error: ${JSON.stringify(error)}`)),
  Effect.runPromise
);
