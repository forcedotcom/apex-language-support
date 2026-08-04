/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import {
  ApexSymbolManager,
  CompilerService,
  FullSymbolCollectorListener,
  SymbolKind,
  SymbolTable,
} from '../../src';

function compile(
  source: string,
  uri: string,
  projectNamespace?: string,
): SymbolTable {
  const table = new SymbolTable();
  const listener = new FullSymbolCollectorListener(table);
  const result = new CompilerService().compile(source, uri, listener, {
    projectNamespace,
  });
  expect(result.errors).toEqual([]);
  return table;
}

describe('managed-package VFS source', () => {
  it('keeps managed and unmanaged duplicate names independently addressable', async () => {
    const symbolManager = new ApexSymbolManager();
    const source = [
      'global class RemoteService {',
      "  global String greet() { return 'hello'; }",
      '}',
    ].join('\n');
    const managedUri =
      'apex-org-artifact:/apex-class/billing.remoteservice.cls';
    const unmanagedUri = 'apex-org-artifact:/apex-class/remoteservice.cls';
    const managed = compile(source, managedUri, 'billing');
    const unmanaged = compile(source, unmanagedUri);

    await Effect.runPromise(symbolManager.addSymbolTable(managed, managedUri));
    await Effect.runPromise(
      symbolManager.addSymbolTable(unmanaged, unmanagedUri),
    );

    const managedClass = await symbolManager.findSymbolByFQN(
      'billing.remoteservice',
    );
    const unmanagedClasses =
      await symbolManager.findSymbolByName('RemoteService');

    expect(managedClass).toMatchObject({
      name: 'RemoteService',
      kind: SymbolKind.Class,
      fileUri: managedUri,
    });
    expect(unmanagedClasses.map((symbol) => symbol.fileUri)).toEqual(
      expect.arrayContaining([managedUri, unmanagedUri]),
    );
    expect(
      managed.getAllSymbols().find((symbol) => symbol.name === 'greet')
        ?.fileUri,
    ).toBe(managedUri);
  });
});
