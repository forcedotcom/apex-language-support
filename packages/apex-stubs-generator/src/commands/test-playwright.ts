import { Effect, Console, pipe } from 'effect';
import { fetchPage } from '../scraper/playwright-scraper';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const program = Effect.gen(function* () {
  yield* Console.log('=== Testing Playwright Web Scraping ===\n');

  const url =
    'https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_string.htm';
  const html = yield* fetchPage(url);

  yield* Console.log(`Fetched ${html.length} characters of HTML`);

  const outputPath = resolve(process.cwd(), 'scraped-string-page.html');
  yield* Effect.tryPromise({
    try: () => writeFile(outputPath, html),
    catch: (error) => new Error(`Failed to write HTML: ${error}`),
  });

  yield* Console.log(`Saved HTML to: ${outputPath}`);

  const methodCount = (html.match(/class="apiname"/gi) || []).length;
  yield* Console.log(`Found approximately ${methodCount} API names in HTML`);
});

pipe(
  program,
  Effect.catchAll((error) => Console.log(`Error: ${JSON.stringify(error)}`)),
  Effect.runPromise,
);
