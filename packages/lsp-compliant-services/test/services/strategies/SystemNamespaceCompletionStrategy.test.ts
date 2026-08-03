/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { ApexSymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { SystemNamespaceCompletionStrategy } from '../../../src/services/strategies/SystemNamespaceCompletionStrategy';
import { makeTextDocument, makeCompletionContext } from './testHelpers';

describe('SystemNamespaceCompletionStrategy', () => {
  let strategy: SystemNamespaceCompletionStrategy;
  let symbolManager: ApexSymbolManager;
  const logger = getLogger();

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    strategy = new SystemNamespaceCompletionStrategy(logger, symbolManager);
  });

  describe('canHandle', () => {
    it('should handle when no trigger character', () => {
      const doc = makeTextDocument('    Sys', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 7);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should handle when line does not end with dot', () => {
      const doc = makeTextDocument('    Database', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 12);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should not handle when triggerCharacter is dot', () => {
      const doc = makeTextDocument('    obj.', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 8, {
        triggerCharacter: '.',
      });
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should not handle when line ends with dot', () => {
      const doc = makeTextDocument('    obj.', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 8);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should not handle a partially typed member name', () => {
      const doc = makeTextDocument('    this.may', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 12);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should not handle when no identifier prefix has been typed', () => {
      const doc = makeTextDocument('    ', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 4);
      expect(strategy.canHandle(context)).toBe(false);
    });

    it.each([
      ["'Sys'", 3],
      ["'unterminated Sys", 17],
      ['// Sys', 6],
      ['/* Sys */', 6],
    ])(
      'does not handle a prefix inside a string or comment: %s',
      (content, character) => {
        const doc = makeTextDocument(content, 'file:///test/Test.cls');
        const context = makeCompletionContext(doc, 0, character);

        expect(strategy.canHandle(context)).toBe(false);
      },
    );
  });

  describe('getCompletions', () => {
    it('contributes no namespace candidates at a lexer-recorded member-access dot', async () => {
      const doc = makeTextDocument('    obj.', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 8, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      expect(candidates).toEqual([]);
    });

    it('should return matching namespaces filtered by prefix', async () => {
      const doc = makeTextDocument('    S', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 5);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((c) => c.symbol.name);
      expect(names).toContain('System');
      expect(names).toContain('Schema');
      expect(names).toContain('Search');
      expect(names).not.toContain('Database');
    });

    it('should filter namespaces by prefix (case-insensitive)', async () => {
      const doc = makeTextDocument('    sys', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 7);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((c) => c.symbol.name);
      expect(names).toContain('System');
      expect(names).not.toContain('Database');
      expect(names).not.toContain('Schema');
    });

    it('uses the partial lexer token before a cursor inside an identifier', async () => {
      const doc = makeTextDocument('    SysSuffix', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 7);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((candidate) => candidate.symbol.name);
      expect(names).toContain('System');
    });

    it('preserves an incomplete namespace prefix in malformed source', async () => {
      const content = 'public class Broken { void run() { Dat';
      const doc = makeTextDocument(content, 'file:///test/Broken.cls');
      const context = makeCompletionContext(doc, 0, content.length);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((candidate) => candidate.symbol.name);
      expect(names).toContain('Database');
      expect(names).toContain('Datacloud');
    });

    it('uses lexer-owned namespace and partial type tokens for qualified prefixes', async () => {
      jest.spyOn(symbolManager, 'findSymbolsByPrefix').mockResolvedValue([
        {
          id: 'system:Assert',
          name: 'Assert',
          kind: 'class',
          namespace: 'System',
        },
        {
          id: 'schema:Assignment',
          name: 'Assignment',
          kind: 'class',
          namespace: 'Schema',
        },
      ] as any);
      // `System` and `As` are keyword tokens in the Apex lexer. They still
      // form a valid namespace-qualified completion query.
      const doc = makeTextDocument('System.As', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 9);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      expect(symbolManager.findSymbolsByPrefix).toHaveBeenCalledWith('as', 50);
      expect(candidates.map((candidate) => candidate.symbol.name)).toEqual([
        'Assert',
      ]);
    });

    it('should filter by prefix "da" to include Database and DataSource', async () => {
      const doc = makeTextDocument('    da', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 6);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((c) => c.symbol.name);
      expect(names).toContain('Database');
      expect(names).toContain('Datacloud');
      expect(names).toContain('DataSource');
      expect(names).toContain('DataWeave');
      expect(names).not.toContain('System');
    });

    it('should set relevance to 0.6 for namespace candidates', async () => {
      const doc = makeTextDocument('    Sys', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 7);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const namespaceCandidates = candidates.filter(
        (c) => c.context === 'system namespace',
      );
      for (const candidate of namespaceCandidates) {
        expect(candidate.relevance).toBe(0.6);
      }
    });

    it('should return empty when prefix does not match any namespace', async () => {
      const doc = makeTextDocument('    xyz', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 7);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const namespaceCandidates = candidates.filter(
        (c) => c.context === 'system namespace',
      );
      expect(namespaceCandidates.length).toBe(0);
    });

    it('should include synthetic namespace symbols with correct shape', async () => {
      const doc = makeTextDocument('    Schema', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 10);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const schemaCandidate = candidates.find(
        (c) => c.symbol.name === 'Schema',
      );
      expect(schemaCandidate).toBeDefined();
      expect(schemaCandidate!.symbol.id).toBe('system-namespace:Schema');
      expect(schemaCandidate!.symbol.kind).toBe('class');
      expect(schemaCandidate!.symbol.modifiers.isBuiltIn).toBe(true);
    });
  });
});
