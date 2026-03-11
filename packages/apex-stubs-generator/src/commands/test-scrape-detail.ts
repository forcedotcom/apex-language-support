import { Effect, Console, pipe } from "effect";
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const program = Effect.gen(function* () {
  yield* Console.log("=== Detailed Scraping Analysis ===\n");

  const browser = yield* Effect.tryPromise({
    try: () => chromium.launch({ headless: false }),
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

  yield* Console.log("Waiting for 'abbreviate' method to appear...");

  yield* Effect.tryPromise({
    try: async () => {
      await page.waitForFunction(
        "document.body.textContent && document.body.textContent.includes('abbreviate')",
        { timeout: 30000 }
      );
    },
    catch: (error) => new Error(`Timeout waiting for content: ${error}`),
  });

  yield* Console.log("Content appeared! Extracting...");

  const bodyText = yield* Effect.tryPromise({
    try: () => page.$eval('body', (el) => el.textContent || ""),
    catch: (error) => new Error(`Failed to get body text: ${error}`),
  });

  yield* Console.log(`Body text length: ${bodyText.length}`);
  yield* Console.log(`Found 'abbreviate': ${bodyText.includes('abbreviate')}`);
  yield* Console.log(`Found 'capitalize': ${bodyText.includes('capitalize')}`);

  const headings = yield* Effect.tryPromise({
    try: () => page.$$eval('h1, h2, h3, h4', els => els.map(el => el.textContent)),
    catch: (error) => new Error(`Failed to get headings: ${error}`),
  });

  yield* Console.log(`\nHeadings found: ${headings.length}`);
  for (let i = 0; i < Math.min(headings.length, 10); i++) {
    yield* Console.log(`  ${i + 1}. ${headings[i]}`);
  }

  const html = yield* Effect.tryPromise({
    try: () => page.content(),
    catch: (error) => new Error(`Failed to get HTML: ${error}`),
  });

  yield* Effect.tryPromise({
    try: () => writeFile('scraped-detailed.html', html),
    catch: (error) => new Error(`Failed to write HTML: ${error}`),
  });

  yield* Console.log(`\nSaved HTML to scraped-detailed.html`);

  yield* Console.log("\nWaiting 5 seconds before closing...");
  yield* Effect.tryPromise({
    try: () => new Promise<void>(resolve => setTimeout(resolve, 5000)),
    catch: () => new Error("Wait failed"),
  });

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
