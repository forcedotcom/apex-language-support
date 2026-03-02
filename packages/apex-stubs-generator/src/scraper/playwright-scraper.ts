import { Effect, Console } from "effect";
import { chromium } from "playwright";

export class ScrapingError {
  readonly _tag = "ScrapingError";
  constructor(readonly message: string, readonly cause?: unknown) {}
}

/**
 * Fetch and render a page using Playwright
 */
export const fetchPage = (url: string) =>
  Effect.gen(function* () {
    yield* Console.log(`Fetching: ${url}`);

    const browser = yield* Effect.tryPromise({
      try: () => chromium.launch({ headless: true }),
      catch: (error) => new ScrapingError("Failed to launch browser", error),
    });

    try {
      const page = yield* Effect.tryPromise({
        try: () => browser.newPage(),
        catch: (error) => new ScrapingError("Failed to create page", error),
      });

      yield* Effect.tryPromise({
        try: () => page.goto(url, { waitUntil: "networkidle", timeout: 60000 }),
        catch: (error) => new ScrapingError(`Failed to load ${url}`, error),
      });

      yield* Console.log("Waiting for content to render...");

      yield* Effect.tryPromise({
        try: async () => {
          try {
            await page.waitForSelector('main, article, .content, [role="main"]', { timeout: 10000 });
          } catch {
            await page.waitForTimeout(5000);
          }
        },
        catch: (error) => new ScrapingError("Wait for content failed", error),
      });

      const content = yield* Effect.tryPromise({
        try: () => page.content(),
        catch: (error) => new ScrapingError("Failed to get page content", error),
      });

      yield* Effect.tryPromise({
        try: () => browser.close(),
        catch: (error) => new ScrapingError("Failed to close browser", error),
      });

      return content;
    } catch (error) {
      yield* Effect.tryPromise({
        try: () => browser.close(),
        catch: () => new ScrapingError("Failed to close browser after error", error),
      });
      throw error;
    }
  });

/**
 * Extract class documentation from a rendered page
 */
export const extractClassDoc = (_html: string, className: string) =>
  Effect.gen(function* () {
    yield* Console.log(`Extracting methods from ${className} documentation`);

    return {
      className,
      methods: [],
    };
  });
