/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';
import {
  createHeadlessClient,
  type HeadlessClientResult,
} from '@salesforce/apex-lsp-client';
import {
  DEFAULT_APEX_SETTINGS,
  type ApexLanguageServerSettings,
} from '@salesforce/apex-lsp-shared';

const serverPath = join(__dirname, '../../../apex-ls/dist/server.node.js');

const settingsFor = (
  serverMode: 'development' | 'production',
): ApexLanguageServerSettings => ({
  ...DEFAULT_APEX_SETTINGS,
  apex: {
    ...DEFAULT_APEX_SETTINGS.apex,
    environment: {
      ...DEFAULT_APEX_SETTINGS.apex.environment,
      serverMode,
    },
  },
});

async function withServer(
  settings: ApexLanguageServerSettings,
  verify: (client: HeadlessClientResult['core']) => void,
): Promise<void> {
  const result = await createHeadlessClient(serverPath, {
    serverArgs: ['--stdio'],
  });
  try {
    await result.core.initialize(settings);
    verify(result.core);
  } finally {
    try {
      await result.core.shutdown();
    } finally {
      await result.core.dispose();
    }
  }
}

describe('server feature state runtime API', () => {
  it('reports development features through the headless public client', async () => {
    await withServer(settingsFor('development'), (client) => {
      expect(client.getFeatureState('hover')).toEqual({
        supported: true,
        enabled: true,
      });
      expect(client.getFeatureState('completion')).toEqual({
        supported: true,
        enabled: true,
      });
      expect(client.getFeatureState('not-a-server-feature')).toEqual({
        supported: false,
        enabled: false,
      });
    });
  }, 60_000);

  it('reports production-disabled features without an extension host', async () => {
    await withServer(settingsFor('production'), (client) => {
      expect(client.getFeatureState('hover')).toEqual({
        supported: true,
        enabled: false,
      });
      expect(client.getFeatureState('documentSymbol')).toEqual({
        supported: true,
        enabled: true,
      });
    });
  }, 60_000);
});
