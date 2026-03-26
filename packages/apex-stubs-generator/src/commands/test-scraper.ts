import { Effect, Console, pipe } from 'effect';
import { scrapeAllDocumentation } from '../scraper/main-scraper';
import { generateStubs } from '../generator/stub-generator';

const program = Effect.gen(function* () {
  yield* Console.log('=== Testing Main Scraper ===\n');

  const namespaces = yield* scrapeAllDocumentation(3, 3);

  yield* Console.log('\n=== Generating Stub Files ===\n');

  yield* generateStubs(namespaces, 'output-test');

  yield* Console.log('\n=== Test Complete ===');
});

pipe(
  program,
  Effect.catchAll((error) =>
    Console.log(`Error: ${JSON.stringify(error, null, 2)}`),
  ),
  Effect.runPromise,
);
