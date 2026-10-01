/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LCSAdapter } from '../../src/server/LCSAdapter';
import {
  APEX_DEBUGGER_COMMANDS,
  LSPConfigurationManager,
} from '@salesforce/apex-lsp-shared';

jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    LSPConfigurationManager: {
      getInstance: jest.fn(),
    },
  };
});

const makeMockConnection = (): any => {
  const cache = new Map<string, any>();
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (!cache.has(prop)) {
          if (
            prop === 'languages' ||
            prop === 'window' ||
            prop === 'workspace' ||
            prop === 'client' ||
            prop === 'telemetry'
          ) {
            cache.set(prop, makeMockConnection());
          } else if (prop === 'createWorkDoneProgress') {
            cache.set(
              prop,
              jest.fn().mockResolvedValue({
                begin: jest.fn(),
                report: jest.fn(),
                done: jest.fn(),
              }),
            );
          } else {
            cache.set(prop, jest.fn());
          }
        }
        return cache.get(prop);
      },
    },
  );
};

function configureExecuteCommandRegistration(): any {
  const connection = makeMockConnection();
  (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue({
    getCapabilities: jest.fn().mockReturnValue({
      executeCommandProvider: { commands: [] },
    }),
    getSettings: jest.fn().mockReturnValue({
      apex: { environment: { additionalDocumentSchemes: undefined } },
    }),
    getCapabilitiesManager: jest.fn().mockReturnValue({
      getMode: jest.fn().mockReturnValue('production'),
    }),
    getExtendedServerCapabilities: jest.fn().mockReturnValue({}),
  });
  return connection;
}

describe('LCSAdapter debugger command routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers and invokes debugger commands through workspace/executeCommand', async () => {
    const connection = configureExecuteCommandRegistration();
    // @ts-expect-error - private constructor, protocol handler registration only
    const adapter = new LCSAdapter({
      connection,
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        alwaysLog: jest.fn(),
      },
    });
    const processDebuggerCommand = jest.fn().mockResolvedValue([]);
    (adapter as any).processDebuggerCommand = processDebuggerCommand;
    (adapter as any).runWithSpanAndRecord = jest.fn(
      (_spanName: string, fn: () => Promise<unknown>) => fn(),
    );

    (adapter as any).setupProtocolHandlers();

    expect(connection.onExecuteCommand).toHaveBeenCalledWith(
      expect.any(Function),
    );
    const handler = connection.onExecuteCommand.mock.calls[0][0];
    const params = {
      command: APEX_DEBUGGER_COMMANDS.lineBreakpoints,
      arguments: ['file:///workspace/classes/Example.cls'],
    };

    await expect(handler(params)).resolves.toEqual([]);
    expect(processDebuggerCommand).toHaveBeenCalledWith(params);
  });

  it('rejects malformed debugger command arguments at the execute-command boundary', async () => {
    const connection = configureExecuteCommandRegistration();
    // @ts-expect-error - private constructor, protocol handler registration only
    const adapter = new LCSAdapter({
      connection,
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        alwaysLog: jest.fn(),
      },
    });
    (adapter as any).runWithSpanAndRecord = jest.fn(
      (_spanName: string, fn: () => Promise<unknown>) => fn(),
    );

    (adapter as any).setupProtocolHandlers();

    const handler = connection.onExecuteCommand.mock.calls[0][0];
    await expect(
      handler({
        command: APEX_DEBUGGER_COMMANDS.exceptionBreakpoints,
        arguments: [],
      }),
    ).rejects.toThrow('exactly one document URI string argument');
  });

  it('rejects unadvertised commands without entering the request queue', async () => {
    const connection = configureExecuteCommandRegistration();
    // @ts-expect-error - private constructor, protocol handler registration only
    const adapter = new LCSAdapter({
      connection,
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        alwaysLog: jest.fn(),
      },
    });
    (adapter as any).runWithSpanAndRecord = jest.fn(
      (_spanName: string, fn: () => Promise<unknown>) => fn(),
    );

    (adapter as any).setupProtocolHandlers();

    const handler = connection.onExecuteCommand.mock.calls[0][0];
    await expect(
      handler({ command: 'apex.removedCommand', arguments: [] }),
    ).rejects.toThrow('Unknown command: apex.removedCommand');
  });

  it('routes line breakpoint metadata to the data owner', async () => {
    const queryDebuggerMetadata = jest.fn().mockResolvedValue([]);
    const adapter = Object.create(LCSAdapter.prototype) as {
      workerDispatcher?: {
        isAvailable(): boolean;
        queryDebuggerMetadata(
          uri: string,
          kind: 'lineBreakpoints' | 'exceptionBreakpoints',
        ): Promise<unknown>;
      };
      processDebuggerCommand(params: {
        command: string;
        arguments?: unknown[];
      }): Promise<unknown>;
    };
    adapter.workerDispatcher = {
      isAvailable: () => true,
      queryDebuggerMetadata,
    };
    const uri = 'file:///workspace/force-app/main/default/classes/Example.cls';

    await expect(
      adapter.processDebuggerCommand({
        command: APEX_DEBUGGER_COMMANDS.lineBreakpoints,
        arguments: [uri],
      }),
    ).resolves.toEqual([]);
    expect(queryDebuggerMetadata).toHaveBeenCalledWith(uri, 'lineBreakpoints');
  });

  it('uses the coordinator-local document and symbol state without workers', async () => {
    const adapter = Object.create(LCSAdapter.prototype) as {
      documents: { get(uri: string): { getText(): string } | undefined };
      workerDispatcher?: undefined;
      processDebuggerCommand(params: {
        command: string;
        arguments?: unknown[];
      }): Promise<unknown>;
    };
    adapter.documents = {
      get: jest
        .fn()
        .mockReturnValue({ getText: () => 'public class Example {}' }),
    };
    const uri = 'file:///workspace/force-app/main/default/classes/Example.cls';

    await expect(
      adapter.processDebuggerCommand({
        command: APEX_DEBUGGER_COMMANDS.lineBreakpoints,
        arguments: [uri],
      }),
    ).resolves.toEqual([]);
  });
});
