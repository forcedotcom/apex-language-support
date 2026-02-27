/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Tests that the chain provides objectName from the parser for expression types
 * that wrap an inner expression (CastExpressionContext, SubExpressionContext).
 * Without proper handling, baseNode.name would be "unknown" and VariableResolutionValidator
 * would fall back to source-text parsing.
 */

import { Effect } from 'effect';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { ReferenceContext } from '../../../../src/types/symbolReference';
import {
  loadFixture,
  compileSourceLayeredWithOptions,
} from './helpers/validation-test-helpers';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { isChainedSymbolReference } from '../../../../src/utils/symbolNarrowing';

describe('VariableResolutionValidator listener gap', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  it('chain base for ((Wrapper) obj).value provides objectName from parser', async () => {
    const source = loadFixture(
      'variable-resolution',
      'CastExpressionFieldAccess.cls',
    );
    const { symbolTable } = await compileSourceLayeredWithOptions(
      source,
      'file:///test/CastExpressionFieldAccess.cls',
      symbolManager,
      compilerService,
      { tier: ValidationTier.THOROUGH, allowArtifactLoading: true },
      { layers: ['public-api', 'full'] },
    );
    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(
        symbolTable.getFileUri() || '',
      ),
    );

    const refs = symbolTable.getAllReferences();
    const chainedRefs = refs.filter((r) => isChainedSymbolReference(r));
    const fieldAccessChain = chainedRefs.find((r) =>
      r.chainNodes?.some(
        (n) =>
          n.name === 'value' && n.context === ReferenceContext.FIELD_ACCESS,
      ),
    );

    if (!fieldAccessChain) {
      const chainSummary = chainedRefs.map((r) =>
        r.chainNodes
          ?.map((n) => `${n.name}:${ReferenceContext[n.context]}`)
          .join(' -> '),
      );
      throw new Error(
        `No chained ref found for ((Wrapper) obj).value. Chained refs: ${JSON.stringify(chainSummary)}`,
      );
    }
    expect(fieldAccessChain!.chainNodes).toBeDefined();
    const baseNode = fieldAccessChain!.chainNodes![0];
    expect(baseNode).toBeDefined();

    expect(baseNode.name).toBe('obj');
  });

  it('chain base for (obj).value provides objectName from parser', async () => {
    const source = loadFixture(
      'variable-resolution',
      'SubExpressionFieldAccess.cls',
    );
    const { symbolTable } = await compileSourceLayeredWithOptions(
      source,
      'file:///test/SubExpressionFieldAccess.cls',
      symbolManager,
      compilerService,
      { tier: ValidationTier.THOROUGH, allowArtifactLoading: true },
      { layers: ['public-api', 'full'] },
    );
    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(
        symbolTable.getFileUri() || '',
      ),
    );

    const refs = symbolTable.getAllReferences();
    const chainedRefs = refs.filter((r) => isChainedSymbolReference(r));
    const fieldAccessChain = chainedRefs.find((r) =>
      r.chainNodes?.some(
        (n) =>
          n.name === 'value' && n.context === ReferenceContext.FIELD_ACCESS,
      ),
    );

    if (!fieldAccessChain) {
      const chainSummary = chainedRefs.map((r) =>
        r.chainNodes
          ?.map((n) => `${n.name}:${ReferenceContext[n.context]}`)
          .join(' -> '),
      );
      throw new Error(
        `No chained ref found for (obj).value. Chained refs: ${JSON.stringify(chainSummary)}`,
      );
    }
    expect(fieldAccessChain!.chainNodes).toBeDefined();
    const baseNode = fieldAccessChain!.chainNodes![0];
    expect(baseNode).toBeDefined();

    expect(baseNode.name).toBe('obj');
  });
});
