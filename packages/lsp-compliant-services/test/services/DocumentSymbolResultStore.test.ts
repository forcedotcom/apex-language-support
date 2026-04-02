/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DocumentSymbolResultStore } from '../../src/services/DocumentSymbolResultStore';

describe('DocumentSymbolResultStore', () => {
  let store: DocumentSymbolResultStore;

  beforeEach(() => {
    store = new DocumentSymbolResultStore(50, 60000);
  });

  it('returns hit for same uri and version', () => {
    const uri = 'file:///same.cls';
    const version = 7;
    const symbols = [{ name: 'MyClass' }] as any;

    store.set(uri, version, symbols);

    expect(store.get(uri, version)).toEqual(symbols);
  });

  it('returns miss for same uri with different version', () => {
    const uri = 'file:///stale.cls';
    store.set(uri, 3, [{ name: 'Old' }] as any);

    expect(store.get(uri, 4)).toBeUndefined();
  });

  it('invalidates by uri', () => {
    const uri = 'file:///invalidate.cls';
    store.set(uri, 2, [{ name: 'X' }] as any);

    store.invalidate(uri);

    expect(store.get(uri, 2)).toBeUndefined();
  });
});
