import { Effect, Console } from 'effect';

export class ApiScrapingError {
  readonly _tag = 'ApiScrapingError';
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

/**
 * Fetch the Apex Reference document structure (TOC)
 */
export const fetchDocumentStructure = () =>
  Effect.gen(function* () {
    yield* Console.log('Fetching document structure...');

    const url =
      'https://developer.salesforce.com/docs/get_document/atlas.en-us.apexref.meta';

    const response = yield* Effect.tryPromise({
      try: () => fetch(url),
      catch: (error) => new ApiScrapingError(`Failed to fetch TOC: ${error}`),
    });

    const json = yield* Effect.tryPromise({
      try: () => response.json() as Promise<any>,
      catch: (error) => new ApiScrapingError(`Failed to parse JSON: ${error}`),
    });

    yield* Console.log(
      `Fetched document structure: ${JSON.stringify(json).length} chars`,
    );

    return json;
  });

/**
 * Fetch content for a specific page
 */
export const fetchPageContent = (pageId: string, version: string = '260.0') =>
  Effect.gen(function* () {
    yield* Console.log(`Fetching content for: ${pageId}`);

    const url = `https://developer.salesforce.com/docs/get_document_content/apexref/${pageId}/en-us/${version}`;

    const response = yield* Effect.tryPromise({
      try: () => fetch(url),
      catch: (error) =>
        new ApiScrapingError(`Failed to fetch content: ${error}`),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = yield* Effect.tryPromise({
        try: () => response.text(),
        catch: (error) =>
          new ApiScrapingError(`Failed to read response: ${error}`),
      });
      return { content: text };
    }

    const json = yield* Effect.tryPromise({
      try: () => response.json() as Promise<any>,
      catch: (error) => new ApiScrapingError(`Failed to parse JSON: ${error}`),
    });

    return json;
  });
