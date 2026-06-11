import { Effect, Console } from 'effect';

export class ApiScrapingError {
  readonly _tag = 'ApiScrapingError';
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

/** Active doc version, resolved from the document structure at scrape start. */
let activeDocVersion = '262.0';

export const setActiveDocVersion = (version: string): void => {
  activeDocVersion = version;
};

const TOC_URL =
  'https://developer.salesforce.com/docs/get_document/atlas.en-us.apexref.meta';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Salesforce docs CDN (Akamai) blocks requests without a browser-like User-Agent
// from automated environments such as GitHub Actions runners.
const FETCH_HEADERS = { 'User-Agent': BROWSER_UA };

const fetchDocumentStructureOnce = () =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => fetch(TOC_URL, { headers: FETCH_HEADERS }),
      catch: (error) => new ApiScrapingError(`Failed to fetch TOC: ${error}`),
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const body = yield* Effect.tryPromise({
        try: () => response.text(),
        catch: () =>
          new ApiScrapingError('Failed to read non-JSON TOC response'),
      });
      return yield* Effect.fail(
        new ApiScrapingError(
          `TOC response was not JSON (content-type: ${contentType}). ` +
            `Status: ${response.status}. Body prefix: ${body.slice(0, 200)}`,
        ),
      );
    }

    const json = yield* Effect.tryPromise({
      try: () => response.json() as Promise<any>,
      catch: (error) => new ApiScrapingError(`Failed to parse JSON: ${error}`),
    });

    return json;
  });

/**
 * Fetch the Apex Reference document structure (TOC), retrying up to 3 times
 * on transient failures (e.g. the API returns an XML error page).
 */
export const fetchDocumentStructure = () =>
  Effect.gen(function* () {
    yield* Console.log('Fetching document structure...');

    const json = yield* fetchDocumentStructureOnce().pipe(
      Effect.retry({ times: 2 }),
    );

    yield* Console.log(
      `Fetched document structure: ${JSON.stringify(json).length} chars`,
    );

    return json;
  });

/**
 * Fetch content for a specific page using the currently active doc version.
 */
export const fetchPageContent = (
  pageId: string,
  version: string = activeDocVersion,
) =>
  Effect.gen(function* () {
    yield* Console.log(`Fetching content for: ${pageId}`);

    const url = `https://developer.salesforce.com/docs/get_document_content/apexref/${pageId}/en-us/${version}`;

    const response = yield* Effect.tryPromise({
      try: () => fetch(url, { headers: FETCH_HEADERS }),
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
