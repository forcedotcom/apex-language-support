/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompilerService,
  FullSymbolCollectorListener,
} from '@salesforce/apex-lsp-parser-ast';
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';
import type { SemanticTokens } from 'vscode-languageserver';
import type { ApexStorageInterface } from '../storage/ApexStorageInterface';
import {
  collectDeclarationSemanticTokenSpans,
  collectReferenceSemanticTokenSpans,
} from '../utils/semanticTokenMapper';
import { encodeSemanticTokenSpans } from '../utils/semanticTokenEncoder';

/** Produces parser-only Tier 1 semantic tokens from request-pool document text. */
export class SemanticTokensProcessingService {
  private readonly compiler: CompilerService;

  constructor(
    private readonly logger: LoggerInterface,
    private readonly storage: Pick<ApexStorageInterface, 'getDocument'>,
    compiler?: CompilerService,
  ) {
    this.compiler = compiler ?? new CompilerService();
  }

  async processSemanticTokens(uri: string): Promise<SemanticTokens> {
    try {
      const document = await this.storage.getDocument(uri);
      if (!document) return { data: [] };

      const result = this.compiler.compile(
        document.getText(),
        uri,
        new FullSymbolCollectorListener(),
        {
          includeComments: false,
          enableReferenceCorrection: false,
          collectReferences: false,
          resolveReferences: false,
        },
      );
      if (!result.result) return { data: [] };

      return encodeSemanticTokenSpans([
        ...collectDeclarationSemanticTokenSpans(result.result, document),
        ...collectReferenceSemanticTokenSpans(result.result, document),
      ]);
    } catch (error) {
      this.logger.error(
        () => `Error processing semantic tokens for ${uri}: ${error}`,
      );
      return { data: [] };
    }
  }
}
