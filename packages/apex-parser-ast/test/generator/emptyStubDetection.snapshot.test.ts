/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Snapshot test for stubs with no semantic members across the entire StandardApexLibrary.
 *
 * PURPOSE
 * -------
 * This test compiles every generated .cls stub and records which ones are "empty"
 * (no methods, properties, fields, constructors, inner types, or enum values).
 * Empty stubs often indicate a scraper gap or an unexpected documentation page structure.
 *
 * WORKFLOW
 * --------
 * - On first run: the snapshot is created from whatever stubs are currently empty.
 * - When new empty stubs appear: the test fails, prompting investigation.
 * - To accept a newly empty stub as "expected" (e.g. a by-design marker class):
 *     npx jest --testPathPattern=emptyStubDetection.snapshot --updateSnapshot
 * - When an existing empty stub gains members (scraper fixed): the test fails
 *   with a diff showing the removal; run --updateSnapshot to update.
 *
 * TIMEOUT
 * -------
 * Compiling all ~5,500 stdlib stubs takes ~30-60s. The per-test timeout below
 * is set to 5 minutes to accommodate slower CI runners.
 */

import * as fs from 'fs';
import * as path from 'path';

import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolKind, SymbolTable } from '../../src/types/symbol';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

const STDLIB_DIR = path.join(
  __dirname,
  '../../src/resources/StandardApexLibrary',
);

/** Mirror of the detection logic in generate-stdlib-cache.mjs */
const hasSemanticMember = (symbolTable: SymbolTable): boolean =>
  symbolTable
    .getAllSymbols()
    .some(
      (s) =>
        s.parentId !== null &&
        s.parentId !== 'null' &&
        s.kind !== SymbolKind.Block,
    );

const compileStub = (
  filePath: string,
  namespace: string,
): SymbolTable | null => {
  const content = fs.readFileSync(filePath, 'utf8');
  const compiler = new CompilerService(namespace);
  const listener = new ApexSymbolCollectorListener(undefined, 'full');
  const result = compiler.compile(
    content,
    `file:///stdlib/${namespace}/${path.basename(filePath)}`,
    listener,
    { projectNamespace: namespace, includeComments: false },
  );
  return result.result;
};

describe('Empty stub snapshot — known stubs with no members', () => {
  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel('error');
  });

  it(
    'matches the accepted list of empty stubs across all namespaces',
    () => {
      if (!fs.existsSync(STDLIB_DIR)) {
        console.warn(
          'StandardApexLibrary not found — skipping snapshot test.\n' +
            'Run "npm run generate" in packages/apex-stubs-generator first.',
        );
        return;
      }

      const emptyStubs: { namespace: string; className: string }[] = [];

      const namespaceDirs = fs
        .readdirSync(STDLIB_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();

      for (const namespace of namespaceDirs) {
        const nsDir = path.join(STDLIB_DIR, namespace);
        const files = fs
          .readdirSync(nsDir)
          .filter((f) => f.endsWith('.cls'))
          .sort();

        for (const file of files) {
          const className = file.replace('.cls', '');
          const symbolTable = compileStub(path.join(nsDir, file), namespace);
          if (symbolTable && !hasSemanticMember(symbolTable)) {
            emptyStubs.push({ namespace, className });
          }
        }
      }

      expect(emptyStubs).toMatchSnapshot();
    },
    300_000, // 5 minutes — compiling ~5,500 stubs
  );
});
