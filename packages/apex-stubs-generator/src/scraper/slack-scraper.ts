import { Effect, Console } from 'effect';
import { chromium } from 'playwright';
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { ApexMethod, ApexParameter, ApexClass } from '../types/apex';

export class SlackScrapingError {
  readonly _tag = 'SlackScrapingError';
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

interface SlackClassRef {
  name: string;
  url: string;
}

const runPlaywrightInstall = () =>
  Effect.tryPromise({
    try: () =>
      new Promise<void>((resolve, reject) => {
        const child = spawn('npx', ['playwright', 'install', 'chromium'], {
          stdio: 'inherit',
          shell: process.platform === 'win32',
        });
        child.on('error', reject);
        child.on('exit', (code) => {
          if (code === 0) {
            resolve();
            return;
          }
          reject(
            new Error(`playwright install exited with code ${String(code)}`),
          );
        });
      }),
    catch: (error) =>
      new SlackScrapingError(
        `Failed to install Playwright Chromium: ${String(error)}`,
      ),
  });

/**
 * Ensure Playwright Chromium executable exists before scraping Slack docs.
 */
export const ensureSlackScraperReady = () =>
  Effect.gen(function* () {
    const executablePath = chromium.executablePath();
    const hasChromium = yield* Effect.tryPromise({
      try: async () => {
        await access(executablePath);
        return true;
      },
      catch: (error) =>
        new SlackScrapingError(
          `Playwright Chromium missing or inaccessible at ${executablePath}: ${String(error)}`,
        ),
    }).pipe(Effect.catchAll(() => Effect.succeed(false)));

    if (hasChromium) {
      return;
    }

    yield* Console.log(
      `Slack scraper browser not found at ${executablePath}; installing Playwright Chromium...`,
    );
    yield* runPlaywrightInstall();
    yield* Console.log('Playwright Chromium installed for Slack scraping.');
  });

/**
 * Extract Slack class references from the Slack namespace page HTML
 */
export const extractSlackClassReferences = (html: string): SlackClassRef[] => {
  const classes: SlackClassRef[] = [];

  const pattern =
    /<a class="xref" href="(https:\/\/developer\.salesforce\.com\/docs\/platform\/salesforce-slack-sdk\/guide\/[^"]+)"[^>]*>([^<]+)<\/a>/g;

  let match;
  while ((match = pattern.exec(html)) !== null) {
    const url = match[1];
    let name = match[2].trim();
    name = name.replace(/\s+(Class|Classes|Interface)$/i, '');

    if (!name || name.length < 2) continue;
    classes.push({ name, url });
  }

  return classes;
};

const stripHtmlTags = (html: string): string => {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

const extractSlackMethods = (
  html: string,
  _className: string,
): ApexMethod[] => {
  const methods: ApexMethod[] = [];
  const pattern = /<dx-code-block[^>]+code-block="([^"]+)"[^>]*>/g;

  let match;
  while ((match = pattern.exec(html)) !== null) {
    const signature = stripHtmlTags(match[1]);

    if (!signature.includes('(') || !signature.includes(')')) continue;

    const methodPattern =
      /^(public|global|private)\s+(static\s+)?([A-Za-z0-9_.<>,\[\]\s]+?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)$/;
    const methodMatch = signature.match(methodPattern);

    if (methodMatch) {
      const isStatic = !!methodMatch[2];
      const returnType = methodMatch[3].trim();
      const methodName = methodMatch[4];
      const paramsStr = methodMatch[5].trim();

      const parameters: ApexParameter[] = [];
      if (paramsStr) {
        for (const paramPart of paramsStr.split(',')) {
          const trimmed = paramPart.trim();
          if (!trimmed) continue;

          const paramMatch = trimmed.match(
            /^([A-Za-z0-9_.<>,\[\]\s]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/,
          );
          if (paramMatch) {
            parameters.push(
              new ApexParameter({
                type: paramMatch[1].trim(),
                name: paramMatch[2].trim(),
              }),
            );
          }
        }
      }

      methods.push(
        new ApexMethod({
          name: methodName,
          returnType,
          parameters,
          isStatic,
          signature,
        }),
      );
    }
  }

  return methods;
};

/**
 * Scrape a single Slack class page using Playwright
 */
export const scrapeSlackClass = (className: string, url: string) =>
  Effect.gen(function* () {
    yield* Console.log(`  Scraping Slack class: ${className}`);
    yield* Console.log(`    URL: ${url}`);

    const browser = yield* Effect.tryPromise({
      try: () => chromium.launch({ headless: true }),
      catch: (error) =>
        new SlackScrapingError(`Failed to launch browser: ${error}`),
    });

    try {
      const page = yield* Effect.tryPromise({
        try: () => browser.newPage(),
        catch: (error) =>
          new SlackScrapingError(`Failed to create page: ${error}`),
      });

      yield* Effect.tryPromise({
        try: () => page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }),
        catch: (error) =>
          new SlackScrapingError(`Failed to load page: ${error}`),
      });

      const html = yield* Effect.tryPromise({
        try: () => page.content(),
        catch: (error) =>
          new SlackScrapingError(`Failed to get HTML: ${error}`),
      });

      const methods = extractSlackMethods(html, className);
      yield* Console.log(`    Found ${methods.length} methods`);

      return new ApexClass({
        name: className,
        namespace: 'Slack',
        methods,
        properties: [],
      });
    } finally {
      yield* Effect.tryPromise({
        try: () => browser.close(),
        catch: () => new SlackScrapingError('Failed to close browser'),
      });
    }
  });
