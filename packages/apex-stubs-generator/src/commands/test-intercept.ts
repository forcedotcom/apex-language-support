import { Effect, Console, pipe } from 'effect';
import { chromium } from 'playwright';

const program = Effect.gen(function* () {
  yield* Console.log('=== Intercepting Network Requests ===\n');

  const browser = yield* Effect.tryPromise({
    try: () => chromium.launch({ headless: true }),
    catch: (error) => new Error(`Failed to launch: ${error}`),
  });

  const page = yield* Effect.tryPromise({
    try: () => browser.newPage(),
    catch: (error) => new Error(`Failed to create page: ${error}`),
  });

  yield* Effect.tryPromise({
    try: async () => {
      page.on('response', async (response) => {
        const url = response.url();
        if (
          url.includes('apexref') ||
          url.includes('.json') ||
          url.includes('.xml')
        ) {
          console.log(`\nResponse: ${url}`);
          console.log(`  Status: ${response.status()}`);
          console.log(`  Type: ${response.headers()['content-type']}`);

          if (url.includes('.json')) {
            try {
              const body = await response.text();
              console.log(`  Body length: ${body.length}`);
              if (body.length < 1000) {
                console.log(`  Sample: ${body.substring(0, 200)}`);
              }
            } catch {
              console.log(`  Could not read body`);
            }
          }
        }
      });
    },
    catch: (error) => new Error(`Failed to setup listener: ${error}`),
  });

  const url =
    'https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_string.htm';
  yield* Console.log(`Loading: ${url}\n`);

  yield* Effect.tryPromise({
    try: () => page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }),
    catch: (error) => new Error(`Failed to load: ${error}`),
  });

  yield* Console.log('\nWaiting 5 seconds for all requests...');
  yield* Effect.tryPromise({
    try: () => new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    catch: () => new Error('Wait failed'),
  });

  yield* Effect.tryPromise({
    try: () => browser.close(),
    catch: () => new Error('Failed to close browser'),
  });

  yield* Console.log('\nDone!');
});

pipe(
  program,
  Effect.catchAll((error) => Console.log(`Error: ${JSON.stringify(error)}`)),
  Effect.runPromise,
);
