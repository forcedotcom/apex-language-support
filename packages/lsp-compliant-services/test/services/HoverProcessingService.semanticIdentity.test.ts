/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { HoverParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  type ApexSymbol,
  type ISymbolManager,
  ReferenceContext,
  SymbolKind,
  type SymbolReference,
} from '@salesforce/apex-lsp-parser-ast';
import { ApexSettingsManager, getLogger } from '@salesforce/apex-lsp-shared';
import {
  HoverProcessingService,
  isSearchingHover,
} from '../../src/services/HoverProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';

jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(),
  },
}));

const uri = 'file:///SemanticIdentity.cls';
const params: HoverParams = {
  textDocument: { uri },
  position: { line: 1, character: 8 },
};
const parserRange = {
  startLine: 2,
  startColumn: 4,
  endLine: 2,
  endColumn: 14,
};

const reference = (
  name: string,
  context: ReferenceContext,
): SymbolReference => ({
  name,
  context,
  location: {
    identifierRange: parserRange,
    symbolRange: parserRange,
  },
});

const symbol = (
  id: string,
  name: string,
  kind: SymbolKind,
  parentId?: string,
): ApexSymbol =>
  ({
    id,
    name,
    kind,
    parentId,
    fileUri: uri,
    location: {
      identifierRange: {
        startLine: 20,
        startColumn: 2,
        endLine: 20,
        endColumn: 2 + name.length,
      },
      symbolRange: {
        startLine: 20,
        startColumn: 2,
        endLine: 20,
        endColumn: 2 + name.length,
      },
    },
  }) as unknown as ApexSymbol;

describe('HoverProcessingService semantic identity after enrichment', () => {
  let getSettingsSpy: jest.SpyInstance;

  beforeEach(() => {
    const settingsManager = ApexSettingsManager.getInstance();
    const settings = settingsManager.getSettings();
    getSettingsSpy = jest
      .spyOn(settingsManager, 'getSettings')
      .mockReturnValue({
        ...settings,
        apex: {
          ...settings.apex,
          findMissingArtifact: {
            ...settings.apex.findMissingArtifact,
            enabled: false,
          },
        },
      });

    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: () => ({
        getDocument: jest
          .fn()
          .mockResolvedValue(
            TextDocument.create(uri, 'apex', 1, 'class SemanticIdentity {}'),
          ),
      }),
    });
  });

  afterEach(() => {
    getSettingsSpy.mockRestore();
    jest.clearAllMocks();
  });

  const managerFor = (
    refs: SymbolReference[],
    fileSymbols: ApexSymbol[],
    globalNameCandidates: ApexSymbol[],
  ): ISymbolManager => {
    const manager = {
      getReferencesAtPosition: jest.fn().mockResolvedValue(refs),
      getSymbolAtPosition: jest.fn().mockResolvedValue(null),
      findSymbolsInFile: jest.fn().mockResolvedValue(fileSymbols),
      getSymbol: jest.fn().mockResolvedValue(null),
      findSymbolByName: jest.fn().mockResolvedValue(globalNameCandidates),
      resolveWithEnrichment: jest.fn(
        (_fileUri: string, _text: string, resolver: () => Promise<unknown>) =>
          Effect.promise(resolver),
      ),
    };
    return manager as unknown as ISymbolManager;
  };

  it('does not select a same-named method from a different owner after a precise miss', async () => {
    const unrelatedMethod = symbol(
      'method:other.run',
      'run',
      SymbolKind.Method,
      'class:OtherOwner',
    );
    const manager = managerFor(
      [reference('run', ReferenceContext.METHOD_CALL)],
      [unrelatedMethod],
      [unrelatedMethod],
    );

    const result = await new HoverProcessingService(
      getLogger(),
      manager,
    ).processHover(params);

    expect(result).toBeNull();
    expect(manager.resolveWithEnrichment).toHaveBeenCalledTimes(1);
    expect(manager.findSymbolByName).not.toHaveBeenCalled();
  });

  it('does not select the first file-wide same-named local when lexical resolution misses', async () => {
    const outerLocal = symbol(
      'variable:outer.value',
      'value',
      SymbolKind.Variable,
      'method:outer',
    );
    const shadowedLocal = symbol(
      'variable:inner.value',
      'value',
      SymbolKind.Variable,
      'method:inner',
    );
    const manager = managerFor(
      [reference('value', ReferenceContext.VARIABLE_USAGE)],
      [outerLocal, shadowedLocal],
      [],
    );

    const result = await new HoverProcessingService(
      getLogger(),
      manager,
    ).processHover(params);

    expect(result).toBeNull();
    expect(manager.resolveWithEnrichment).toHaveBeenCalledTimes(1);
    expect(manager.getSymbolAtPosition).toHaveBeenCalledWith(
      uri,
      { line: 2, character: 8 },
      'precise',
    );
  });

  it('labels the searching placeholder with the narrowest parser reference', async () => {
    const settings = ApexSettingsManager.getInstance().getSettings();
    getSettingsSpy.mockReturnValue({
      ...settings,
      apex: {
        ...settings.apex,
        findMissingArtifact: {
          ...settings.apex.findMissingArtifact,
          enabled: true,
        },
      },
    });

    const broadRange = {
      startLine: 2,
      startColumn: 0,
      endLine: 2,
      endColumn: 20,
    };
    const exactRange = {
      startLine: 2,
      startColumn: 5,
      endLine: 2,
      endColumn: 14,
    };
    const broadReference: SymbolReference = {
      name: 'BroadParserReference',
      context: ReferenceContext.CLASS_REFERENCE,
      location: {
        identifierRange: broadRange,
        symbolRange: broadRange,
      },
      chainNodes: [
        {
          name: 'ExactParserReference',
          context: ReferenceContext.CLASS_REFERENCE,
          location: {
            identifierRange: exactRange,
            symbolRange: exactRange,
          },
        },
      ],
    };
    const manager = managerFor([broadReference], [], []);
    const service = new HoverProcessingService(getLogger(), manager);
    const backgroundLookup = jest.fn();
    (
      service as unknown as {
        missingArtifactUtils: {
          tryResolveMissingArtifactBackground: typeof backgroundLookup;
        };
      }
    ).missingArtifactUtils = {
      tryResolveMissingArtifactBackground: backgroundLookup,
    };

    const result = await service.processHover(params);
    const content =
      result?.contents &&
      typeof result.contents === 'object' &&
      'value' in result.contents
        ? result.contents.value
        : '';

    expect(content).toContain('Looking for: `ExactParserReference`');
    expect(content).not.toContain('BroadParserReference');
    expect(isSearchingHover(result)).toBe(true);
    expect(backgroundLookup).toHaveBeenCalledTimes(1);
  });

  it('uses a neutral searching label when no parser reference is available', () => {
    const manager = managerFor([], [], []);
    const service = new HoverProcessingService(getLogger(), manager);

    const result = (
      service as unknown as {
        createSearchingHover: (name?: string) => {
          contents: { value: string };
        };
      }
    ).createSearchingHover(undefined);

    expect(result.contents.value).toContain('Looking for: `Unknown Symbol`');
    expect(isSearchingHover(result)).toBe(true);
  });
});
