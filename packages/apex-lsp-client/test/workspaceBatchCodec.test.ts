/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { unzipSync } from 'fflate';
import {
  compressWorkspaceFileBatch,
  createWorkspaceFileBatches,
  encodeWorkspaceBatchForTransport,
} from '../src/workspaceBatchCodec';

describe('workspace batch codec', () => {
  const files = [
    {
      uri: 'file:///workspace/classes/Example.cls',
      version: 1,
      content: 'public class Example {}',
      namespace: 'example',
    },
    {
      uri: 'file:///workspace/classes/Other.cls',
      version: 2,
      content: 'public class Other {}',
    },
  ];

  it('creates indexed batches with string URI metadata', () => {
    const batches = createWorkspaceFileBatches(files, 1);

    expect(batches).toEqual([
      {
        batchIndex: 0,
        totalBatches: 2,
        isLastBatch: false,
        fileMetadata: [
          {
            uri: files[0].uri,
            version: files[0].version,
            namespace: files[0].namespace,
          },
        ],
        files: [files[0]],
      },
      {
        batchIndex: 1,
        totalBatches: 2,
        isLastBatch: true,
        fileMetadata: [{ uri: files[1].uri, version: files[1].version }],
        files: [files[1]],
      },
    ]);
  });

  it('writes URI-named files and metadata into the ZIP archive', () => {
    const [batch] = createWorkspaceFileBatches(files, files.length);
    const compressed = compressWorkspaceFileBatch(batch);
    const archive = unzipSync(compressed);
    const decoder = new TextDecoder();

    expect(decoder.decode(archive[files[0].uri])).toBe(files[0].content);
    expect(decoder.decode(archive[files[1].uri])).toBe(files[1].content);
    expect(JSON.parse(decoder.decode(archive['__metadata.json']))).toEqual({
      batchIndex: 0,
      totalBatches: 1,
      isLastBatch: true,
      fileMetadata: batch.fileMetadata,
    });
  });

  it('encodes compressed batches as reversible base64 transport data', () => {
    const [batch] = createWorkspaceFileBatches(files, files.length);
    const compressed = compressWorkspaceFileBatch(batch);
    const encoded = encodeWorkspaceBatchForTransport(compressed);

    expect(new Uint8Array(Buffer.from(encoded, 'base64'))).toEqual(compressed);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid batch size %s',
    (batchSize: number) => {
      expect(() => createWorkspaceFileBatches(files, batchSize)).toThrow(
        'Workspace batch size must be a positive integer.',
      );
    },
  );
});
