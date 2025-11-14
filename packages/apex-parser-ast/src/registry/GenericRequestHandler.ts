/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ISymbolManager } from '../types/ISymbolManager';
import { LSPRequestType, RequestPriority } from '../queue/LSPRequestQueue';
import { LSPRequestHandler } from './ServiceRegistry';

/**
 * Generic request handler that wraps any service
 */
export class GenericRequestHandler<T = any, R = any>
  implements LSPRequestHandler<T, R>
{
  constructor(
    public readonly requestType: LSPRequestType,
    private readonly service: any,
    public readonly priority: RequestPriority,
    public readonly timeout: number,
    public readonly maxRetries: number,
  ) {}

  /**
   * Process the request using the wrapped service
   */
  async process(params: T, symbolManager: ISymbolManager): Promise<R> {
    // Determine the method to call based on the request type
    const methodName = this.getMethodName(this.requestType);

    if (typeof this.service[methodName] !== 'function') {
      throw new Error(`Service does not have method: ${methodName}`);
    }

    // Call the service method with the parameters
    return this.service[methodName](params);
  }

  /**
   * Get the method name to call on the service based on request type
   */
  private getMethodName(requestType: LSPRequestType): string {
    const methodMap: Record<LSPRequestType, string> = {
      hover: 'processHover',
      completion: 'processCompletion',
      definition: 'processDefinition',
      references: 'processReferences',
      documentSymbol: 'processDocumentSymbol',
      workspaceSymbol: 'processWorkspaceSymbol',
      diagnostics: 'processDiagnostic',
      codeAction: 'processCodeAction',
      signatureHelp: 'processSignatureHelp',
      rename: 'processRename',
      documentOpen: 'processDocumentOpen',
      documentSave: 'processDocumentSave',
      documentChange: 'processDocumentChange',
      documentClose: 'processDocumentClose',
      findMissingArtifact: 'processFindMissingArtifact',
    };

    return methodMap[requestType] || 'process';
  }
}
