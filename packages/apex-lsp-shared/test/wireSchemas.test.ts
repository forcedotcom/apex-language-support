/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Schema } from 'effect';
import {
  FindMissingArtifactResultSchema,
  WireIdentifierSpecSchema,
} from '../src/wireSchemas';

describe('missing artifact wire schemas', () => {
  it('preserves identifierType while sanitizing a request identifier', () => {
    const decoded = Schema.decodeUnknownSync(WireIdentifierSpecSchema)({
      name: 'Account',
      identifierType: 'sobject',
      nonSerializableExtra: () => undefined,
    });

    expect(decoded).toEqual({
      name: 'Account',
      identifierType: 'sobject',
    });
  });

  it('decodes a complete sObject artifact result', () => {
    const decoded = Schema.decodeUnknownSync(FindMissingArtifactResultSchema)({
      artifacts: [
        {
          identifierType: 'sobject',
          name: 'Account',
          describe: {
            name: 'Account',
            custom: false,
            fields: [
              {
                name: 'Name',
                type: 'string',
                definitionTarget: {
                  uri: 'sf-org-data:/Account/fields/Name',
                  range: {
                    start: { line: 2, character: 0 },
                    end: { line: 2, character: 4 },
                  },
                },
              },
            ],
            definitionTarget: { uri: 'sf-org-data:/Account' },
          },
        },
      ],
      opened: ['file:///SupportingClass.cls'],
    });

    expect('artifacts' in decoded && decoded.artifacts[0].name).toBe('Account');
    expect('artifacts' in decoded && decoded.opened).toEqual([
      'file:///SupportingClass.cls',
    ]);
  });

  it('fails closed for malformed describe payloads', () => {
    expect(() =>
      Schema.decodeUnknownSync(FindMissingArtifactResultSchema)({
        artifacts: [
          {
            identifierType: 'sobject',
            name: 'Account',
            describe: {
              name: 'Account',
              custom: 'false',
              fields: [{ name: 'Name', type: 'string' }],
              definitionTarget: { uri: 'sf-org-data:/Account' },
            },
          },
        ],
      }),
    ).toThrow();
  });
});
