/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';

const scriptsDir = join(__dirname, '../../scripts');
const scriptUrl = (filename: string): string =>
  pathToFileURL(join(scriptsDir, filename)).href;

const runModule = (source: string, args: string[] = []): string =>
  execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', source, ...args],
    { encoding: 'utf8' },
  ).trim();

describe('API stub scripts', () => {
  test('uses the latest API version alias by default for symbol table requests', () => {
    const output = runModule(`
      import { buildSymbolsUrl, parseArgs } from ${JSON.stringify(
        scriptUrl('fetch-api-stubs.mjs'),
      )};
      const config = parseArgs([]);
      console.log(buildSymbolsUrl(config.apiVersion, 'category=BUILTIN'));
    `);

    expect(output).toBe(
      '/services/data/latest/tooling/symbols?category=BUILTIN',
    );
  });

  test('generator scripts use the canonical target namespace set', () => {
    const output = runModule(`
       import { TARGET_NAMESPACES } from ${JSON.stringify(
         scriptUrl('api-stub-config.mjs'),
       )};
       import { targetNamespaces as generationTargets } from ${JSON.stringify(
         scriptUrl('generate-api-stubs.mjs'),
       )};
       import { targetNamespaces as indexTargets } from ${JSON.stringify(
         scriptUrl('generate-non-bundled-index.mjs'),
       )};
      console.log(JSON.stringify({
        sameGenerationSet: TARGET_NAMESPACES === generationTargets,
        sameIndexSet: TARGET_NAMESPACES === indexTargets,
      }));
    `);

    expect(JSON.parse(output)).toEqual({
      sameGenerationSet: true,
      sameIndexSet: true,
    });
  });

  test('capture validation rejects failed and missing target inputs', () => {
    const root = mkdtempSync(join(tmpdir(), 'apex-api-capture-'));
    writeFileSync(join(root, 'System.json'), '{"typeStubs":[]}');

    const output = runModule(
      `
         import { validateCapture } from ${JSON.stringify(
           scriptUrl('generate-api-stubs.mjs'),
         )};
        const metadata = JSON.parse(process.argv[1]);
        try {
          validateCapture(metadata, process.argv[2], new Set(['System', 'Database']));
          console.log('valid');
        } catch (error) {
          console.log(error.message);
        }
      `,
      [
        JSON.stringify({
          namespaces: {
            System: { filename: 'System.json' },
            Database: { filename: 'Database.json', error: 'capture failed' },
          },
        }),
        root,
      ],
    );

    expect(output).toContain('Database');
    expect(output).toContain('capture failed');
  });

  test('cleanup preserves skipped builtin files', () => {
    const root = mkdtempSync(join(tmpdir(), 'apex-api-cleanup-'));
    const systemDir = join(root, 'System');
    mkdirSync(systemDir);
    writeFileSync(join(systemDir, 'String.cls'), 'protected builtin');
    writeFileSync(join(systemDir, 'Generated.cls'), 'stale generated file');
    const connectApiDir = join(root, 'ConnectApi');
    mkdirSync(connectApiDir);
    writeFileSync(
      join(connectApiDir, 'Community.cls'),
      'preserved non-target file',
    );

    runModule(
      `
         import { cleanNamespaceDirectory } from ${JSON.stringify(
           scriptUrl('generate-api-stubs.mjs'),
         )};
        cleanNamespaceDirectory(process.argv[1], 'System');
      `,
      [root],
    );

    expect(readFileSync(join(systemDir, 'String.cls'), 'utf8')).toBe(
      'protected builtin',
    );
    expect(() => readFileSync(join(systemDir, 'Generated.cls'))).toThrow();
    expect(readFileSync(join(connectApiDir, 'Community.cls'), 'utf8')).toBe(
      'preserved non-target file',
    );
  });

  test('cache checksum changes when the non-bundled index changes', () => {
    const root = mkdtempSync(join(tmpdir(), 'apex-cache-checksum-'));
    const sourceDir = join(root, 'stdlib');
    const builtinsDir = join(root, 'builtins');
    const nonBundledIndex = join(root, 'non-bundled-types.json');
    mkdirSync(sourceDir);
    mkdirSync(builtinsDir);
    writeFileSync(join(sourceDir, 'Example.cls'), 'global class Example {}');
    writeFileSync(nonBundledIndex, '{"namespaces":{}}');

    const checksum = (): string =>
      runModule(
        `
           import { calculateSourceChecksum } from ${JSON.stringify(
             scriptUrl('generate-stdlib-cache.mjs'),
           )};
          console.log(calculateSourceChecksum(
            process.argv[1],
            process.argv[2],
            process.argv[3],
          ));
        `,
        [sourceDir, builtinsDir, nonBundledIndex],
      );

    const before = checksum();
    writeFileSync(nonBundledIndex, '{"namespaces":{"ConnectApi":[]}}');

    expect(checksum()).not.toBe(before);
  });

  test('capture checksum changes with content and is independent of namespace order', () => {
    const root = mkdtempSync(join(tmpdir(), 'apex-capture-checksum-'));
    writeFileSync(join(root, 'System.json'), '{"typeStubs":["one"]}');
    writeFileSync(join(root, 'Database.json'), '{"typeStubs":["two"]}');
    const metadata = {
      namespaces: {
        System: { filename: 'System.json' },
        Database: { filename: 'Database.json' },
      },
    };
    const checksum = (namespaces: string[]): string =>
      runModule(
        `
          import { calculateCaptureChecksum } from ${JSON.stringify(
            scriptUrl('generate-api-stubs.mjs'),
          )};
          const metadata = JSON.parse(process.argv[1]);
          const namespaces = new Set(JSON.parse(process.argv[3]));
          console.log(calculateCaptureChecksum(metadata, process.argv[2], namespaces));
        `,
        [JSON.stringify(metadata), root, JSON.stringify(namespaces)],
      );

    const before = checksum(['System', 'Database']);
    expect(checksum(['Database', 'System'])).toBe(before);
    writeFileSync(join(root, 'System.json'), '{"typeStubs":["changed"]}');
    expect(checksum(['System', 'Database'])).not.toBe(before);
  });

  test('counts skipped builtins while loading a namespace capture', () => {
    const root = mkdtempSync(join(tmpdir(), 'apex-api-stubs-'));
    const capture = join(root, 'System.json');
    writeFileSync(
      capture,
      JSON.stringify({
        typeStubs: [
          { name: 'String', kind: 'CLASS', modifiers: ['global'] },
          { name: 'Generated', kind: 'CLASS', modifiers: ['global'] },
        ],
      }),
    );

    const output = runModule(
      `
        import { loadNamespaceStubs } from ${JSON.stringify(
          scriptUrl('generate-api-stubs.mjs'),
        )};
        console.log(JSON.stringify(loadNamespaceStubs('System', process.argv[1])));
      `,
      [capture],
    );

    expect(JSON.parse(output)).toMatchObject({
      skipped: 1,
      stubs: [{ filename: 'Generated.cls' }],
    });
  });

  test('FQN index generation does not read api-only types', () => {
    const source = readFileSync(
      join(scriptsDir, 'generate-stdlib-cache.mjs'),
      'utf8',
    );
    const fqnIndexBody = source.slice(
      source.indexOf('async function generateFqnIndex'),
      source.indexOf('/**\n * Main function'),
    );

    expect(fqnIndexBody).not.toContain('non-bundled-types.json');
    expect(fqnIndexBody).not.toContain('api-only');
  });
});
