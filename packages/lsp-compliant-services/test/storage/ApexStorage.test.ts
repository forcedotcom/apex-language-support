/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { ApexStorage } from '../../src/storage/ApexStorage';

const doc = (uri: string, content: string): TextDocument =>
  TextDocument.create(uri, 'apex', 1, content);

describe('ApexStorage.getAllDocumentContents', () => {
  let storage: ApexStorage;

  beforeEach(async () => {
    // Singleton — clear any documents a prior test left behind.
    storage = ApexStorage.getInstance();
    for (const { uri } of await storage.getAllDocumentContents()) {
      await storage.deleteDocument(uri);
    }
  });

  it('returns every stored document as a { uri, content } pair', async () => {
    await storage.setDocument(
      'file:///A.cls',
      doc('file:///A.cls', 'class A {}'),
    );
    await storage.setDocument(
      'file:///B.cls',
      doc('file:///B.cls', 'class B {}'),
    );

    const all = await storage.getAllDocumentContents();

    expect(all.sort((a, b) => a.uri.localeCompare(b.uri))).toEqual([
      { uri: 'file:///A.cls', content: 'class A {}' },
      { uri: 'file:///B.cls', content: 'class B {}' },
    ]);
  });

  it('reflects the latest content after a document is overwritten', async () => {
    await storage.setDocument('file:///A.cls', doc('file:///A.cls', 'v1'));
    await storage.setDocument('file:///A.cls', doc('file:///A.cls', 'v2'));

    const all = await storage.getAllDocumentContents();

    expect(all).toEqual([{ uri: 'file:///A.cls', content: 'v2' }]);
  });

  it('omits deleted documents', async () => {
    await storage.setDocument(
      'file:///A.cls',
      doc('file:///A.cls', 'class A {}'),
    );
    await storage.deleteDocument('file:///A.cls');

    expect(await storage.getAllDocumentContents()).toEqual([]);
  });
});
