/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Effect } from 'effect';
import {
  ApexSymbolManager,
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import {
  getLineBreakpointInfo,
  getExceptionBreakpointInfo,
} from '../../src/services/DebuggerMetadataService';

const fixturesDir = join(__dirname, '../fixtures/debugger');

type CompiledFixture = {
  readonly symbolManager: ApexSymbolManager;
  readonly source: string;
  readonly uri: string;
};

async function compileFixture(
  fileName: string,
  uri: string,
): Promise<CompiledFixture> {
  const source = readFileSync(join(fixturesDir, fileName), 'utf8');
  const symbolManager = new ApexSymbolManager();
  const symbolTable = new SymbolTable();
  new CompilerService().compile(
    source,
    uri,
    new FullSymbolCollectorListener(symbolTable),
    { includeComments: false },
  );
  await Effect.runPromise(symbolManager.addSymbolTable(symbolTable, uri));
  return {
    symbolManager,
    source,
    uri,
  };
}

describe('debugger metadata functions', () => {
  it('returns parser-derived statement lines for a compiled class fixture', async () => {
    const fixture = await compileFixture(
      'Example.cls',
      'file:///workspace/force-app/main/default/classes/Example.cls',
    );

    await expect(
      getLineBreakpointInfo(fixture.symbolManager, fixture.uri, fixture.source),
    ).resolves.toEqual([
      {
        uri: fixture.uri,
        typeref: 'Example',
        lines: [3, 4, 6],
      },
    ]);
  });

  it('derives nested exception ownership and inheritance from a compiled fixture', async () => {
    const fixture = await compileFixture(
      'ExceptionContainer.cls',
      'file:///workspace/force-app/main/default/classes/ExceptionContainer.cls',
    );

    await expect(
      getExceptionBreakpointInfo(fixture.symbolManager, fixture.uri, new Map()),
    ).resolves.toEqual([
      {
        uri: fixture.uri,
        typeref: 'ExceptionContainer$BaseException',
        label: 'BaseException',
      },
      {
        uri: fixture.uri,
        typeref: 'ExceptionContainer$NestedException',
        label: 'NestedException',
      },
    ]);
  });

  it('qualifies a compiled class fixture with persisted namespace provenance', async () => {
    const fixture = await compileFixture(
      'Example.cls',
      'file:///workspace/force-app/main/default/classes/Example.cls',
    );

    await expect(
      getLineBreakpointInfo(
        fixture.symbolManager,
        fixture.uri,
        fixture.source,
        'managed',
      ),
    ).resolves.toEqual([
      {
        uri: fixture.uri,
        typeref: 'managed/Example',
        lines: [3, 4, 6],
      },
    ]);
  });

  it('assigns executable lines to their deepest containing class', async () => {
    const fixture = await compileFixture(
      'NestedClassBreakpoints.cls',
      'file:///workspace/force-app/main/default/classes/NestedClassBreakpoints.cls',
    );

    await expect(
      getLineBreakpointInfo(fixture.symbolManager, fixture.uri, fixture.source),
    ).resolves.toEqual([
      {
        uri: fixture.uri,
        typeref: 'NestedClassBreakpoints',
        lines: [3, 4],
      },
      {
        uri: fixture.uri,
        typeref: 'NestedClassBreakpoints$InnerClass',
        lines: [9, 10],
      },
    ]);
  });

  it('uses slash-qualified legacy bytecode names for namespaced nested classes', async () => {
    const fixture = await compileFixture(
      'NestedClassBreakpoints.cls',
      'file:///workspace/force-app/main/default/classes/NestedClassBreakpoints.cls',
    );

    await expect(
      getLineBreakpointInfo(
        fixture.symbolManager,
        fixture.uri,
        fixture.source,
        'managed',
      ),
    ).resolves.toEqual([
      {
        uri: fixture.uri,
        typeref: 'managed/NestedClassBreakpoints',
        lines: [3, 4],
      },
      {
        uri: fixture.uri,
        typeref: 'managed/NestedClassBreakpoints$InnerClass',
        lines: [9, 10],
      },
    ]);
  });

  it('uses the debugger trigger typeref for a compiled trigger fixture', async () => {
    const fixture = await compileFixture(
      'AccountTrigger.trigger',
      'file:///workspace/force-app/main/default/triggers/AccountTrigger.trigger',
    );

    await expect(
      getLineBreakpointInfo(
        fixture.symbolManager,
        fixture.uri,
        fixture.source,
        'managed',
      ),
    ).resolves.toEqual([
      {
        uri: fixture.uri,
        typeref: '__sfdc_trigger/managed/AccountTrigger',
        lines: [2, 3],
      },
    ]);
  });

  it('assigns nested trigger class lines independently of the trigger body', async () => {
    const fixture = await compileFixture(
      'LegacyTrigger.trigger',
      'file:///workspace/force-app/main/default/triggers/LegacyTrigger.trigger',
    );

    await expect(
      getLineBreakpointInfo(fixture.symbolManager, fixture.uri, fixture.source),
    ).resolves.toEqual([
      {
        uri: fixture.uri,
        typeref: '__sfdc_trigger/LegacyTrigger',
        lines: [10, 11],
      },
      {
        uri: fixture.uri,
        typeref: '__sfdc_trigger/LegacyTrigger$InnerClass',
        lines: [6],
      },
    ]);
  });

  it('finds direct and indirect class exceptions with their exact casing', async () => {
    const fixture = await compileFixture(
      'ExceptionVariants.cls',
      'file:///workspace/force-app/main/default/classes/ExceptionVariants.cls',
    );

    await expect(
      getExceptionBreakpointInfo(fixture.symbolManager, fixture.uri, new Map()),
    ).resolves.toEqual([
      {
        uri: fixture.uri,
        typeref: 'ExceptionVariants$BaseException',
        label: 'BaseException',
      },
      {
        uri: fixture.uri,
        typeref: 'ExceptionVariants$IndirectException',
        label: 'IndirectException',
      },
    ]);
  });

  it('uses slash-qualified legacy bytecode names for namespaced exceptions', async () => {
    const fixture = await compileFixture(
      'ExceptionContainer.cls',
      'file:///workspace/force-app/main/default/classes/ExceptionContainer.cls',
    );

    await expect(
      getExceptionBreakpointInfo(
        fixture.symbolManager,
        fixture.uri,
        new Map(),
        'managed',
      ),
    ).resolves.toEqual([
      {
        uri: fixture.uri,
        typeref: 'managed/ExceptionContainer$BaseException',
        label: 'BaseException',
      },
      {
        uri: fixture.uri,
        typeref: 'managed/ExceptionContainer$NestedException',
        label: 'NestedException',
      },
    ]);
  });

  it('preserves the declared casing of exception type references and labels', async () => {
    const fixture = await compileFixture(
      'LowercaseException.cls',
      'file:///workspace/force-app/main/default/classes/LowercaseException.cls',
    );

    await expect(
      getExceptionBreakpointInfo(fixture.symbolManager, fixture.uri, new Map()),
    ).resolves.toEqual([
      {
        uri: fixture.uri,
        typeref: 'myexception',
        label: 'myexception',
      },
    ]);
  });

  it('finds exception classes declared inside a trigger', async () => {
    const fixture = await compileFixture(
      'TriggerException.trigger',
      'file:///workspace/force-app/main/default/triggers/TriggerException.trigger',
    );

    await expect(
      getExceptionBreakpointInfo(fixture.symbolManager, fixture.uri, new Map()),
    ).resolves.toEqual([
      {
        uri: fixture.uri,
        typeref: '__sfdc_trigger/TriggerException$InnerException',
        label: 'InnerException',
      },
    ]);
  });

  it('includes System exception entries from the standard-library catalog', async () => {
    const fixture = await compileFixture(
      'Example.cls',
      'file:///workspace/force-app/main/default/classes/Example.cls',
    );
    await expect(
      getExceptionBreakpointInfo(
        fixture.symbolManager,
        fixture.uri,
        new Map([['System', ['DmlException.cls', 'String.cls']]]),
      ),
    ).resolves.toEqual([
      {
        uri: null,
        typeref: 'com/salesforce/api/exception/DmlException',
        label: 'System.DmlException',
      },
    ]);
  });
});
