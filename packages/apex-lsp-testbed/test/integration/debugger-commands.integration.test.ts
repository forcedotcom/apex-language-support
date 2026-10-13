/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { vi } from 'vitest';
import {
  createHeadlessClient,
  type ApexClientCore,
} from '@salesforce/apex-lsp-client';
import {
  DEFAULT_APEX_SETTINGS,
  type ExceptionBreakpointInfo,
  type LineBreakpointInfo,
} from '@salesforce/apex-lsp-shared';
import { ApexLspTestClient } from '../../src/test-utils/ApexLspTestClient';

const SERVER_PATH = join(__dirname, '../../../apex-ls/dist/server.node.js');
const FIXTURE_PATH = join(__dirname, '../fixtures/DebuggerCommandTest.cls');
const FIXTURE_URI = pathToFileURL(FIXTURE_PATH).href;
const FIXTURE_CONTENT = readFileSync(FIXTURE_PATH, 'utf-8');
const WORKSPACE_URI = pathToFileURL(join(__dirname, '../fixtures')).href;

async function waitForResult<T>(
  query: () => Promise<T[]>,
  hasExpectedResult: (result: T[]) => boolean,
): Promise<T[]> {
  let result: T[] = [];
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      result = await query();
      if (hasExpectedResult(result)) {
        return result;
      }
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes('No document state is available')
      ) {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return result;
}

describe('Debugger Commands Integration', () => {
  let core: ApexClientCore;
  let client: ApexLspTestClient;

  vi.setConfig({ testTimeout: 60_000 });

  beforeAll(async () => {
    const result = await createHeadlessClient(SERVER_PATH, {
      serverArgs: ['--stdio'],
    });
    core = result.core;
    const initializeResult = await core.initialize(
      {
        ...DEFAULT_APEX_SETTINGS,
        apex: {
          ...DEFAULT_APEX_SETTINGS.apex,
          environment: {
            ...DEFAULT_APEX_SETTINGS.apex.environment,
            serverMode: 'development',
          },
        },
      },
      { rootUri: WORKSPACE_URI },
    );
    client = new ApexLspTestClient(core, initializeResult);
    client.openTextDocument(FIXTURE_URI, FIXTURE_CONTENT);
  });

  afterAll(async () => {
    await core.shutdown();
    await core.dispose();
  });

  it('serves typed line and exception breakpoint metadata', async () => {
    const lines = await waitForResult<LineBreakpointInfo>(
      () => client.getLineBreakpointInfo(FIXTURE_URI),
      (result) =>
        result.some((entry) => entry.typeref === 'DebuggerCommandTest'),
    );
    expect(lines).toContainEqual({
      uri: FIXTURE_URI,
      typeref: 'DebuggerCommandTest',
      lines: [5],
    });

    const exceptions = await waitForResult<ExceptionBreakpointInfo>(
      () => client.getExceptionBreakpointInfo(FIXTURE_URI),
      (result) =>
        result.some(
          (entry) => entry.typeref === 'DebuggerCommandTest$CustomException',
        ),
    );
    expect(exceptions).toEqual(
      expect.arrayContaining([
        {
          uri: FIXTURE_URI,
          typeref: 'DebuggerCommandTest$CustomException',
          label: 'CustomException',
        },
        expect.objectContaining({
          uri: null,
          typeref: 'com/salesforce/api/exception/DmlException',
          label: 'System.DmlException',
        }),
      ]),
    );
  });
});
