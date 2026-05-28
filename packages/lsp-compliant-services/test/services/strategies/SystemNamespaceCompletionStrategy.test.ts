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
      expect(strategy.canHandle(context)).toBe(false);
    });

    it('should not handle when line ends with dot', () => {
      const doc = makeTextDocument('    obj.', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 8);
      expect(strategy.canHandle(context)).toBe(false);
    });
  });

  describe('getCompletions', () => {
    it('should return all system namespaces with empty prefix', async () => {
      const doc = makeTextDocument('    ', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 4);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((c) => c.symbol.name);
      expect(names).toContain('System');
      expect(names).toContain('Database');
      expect(names).toContain('Schema');
      expect(names).toContain('Messaging');
      expect(names).toContain('ApexPages');
      expect(candidates.length).toBeGreaterThanOrEqual(40);
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
