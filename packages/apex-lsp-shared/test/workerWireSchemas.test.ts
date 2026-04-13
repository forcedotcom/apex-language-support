/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Schema } from 'effect';
import {
  WorkerInit,
  PingWorker,
  QuerySymbolSubset,
  WorkerAssistanceRequest,
  WorkspaceBatchIngest,
  ResourceLoaderGetSymbolTable,
  DispatchDocumentOpen,
  DispatchDocumentChange,
  DispatchDocumentSave,
  DispatchDocumentClose,
  DispatchHover,
  DispatchDefinition,
  DispatchReferences,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchGenericLspRequest,
  WIRE_PROTOCOL_VERSION,
  isAllowedTag,
} from '../src/workerWireSchemas';

describe('workerWireSchemas', () => {
  describe('WorkerInit', () => {
    it('should encode and decode round-trip', () => {
      const init = new WorkerInit({
        role: 'dataOwner',
        protocolVersion: WIRE_PROTOCOL_VERSION,
      });
      expect(init._tag).toBe('WorkerInit');
      expect(init.role).toBe('dataOwner');
      expect(init.protocolVersion).toBe(WIRE_PROTOCOL_VERSION);

      const encoded = Schema.encodeSync(WorkerInit)(init);
      const decoded = Schema.decodeSync(WorkerInit)(encoded);
      expect(decoded._tag).toBe('WorkerInit');
      expect(decoded.role).toBe('dataOwner');
      expect(decoded.protocolVersion).toBe(WIRE_PROTOCOL_VERSION);
    });

    it('should reject invalid role', () => {
      expect(() =>
        Schema.decodeSync(WorkerInit)({
          _tag: 'WorkerInit',
          role: 'invalidRole' as any,
          protocolVersion: 1,
        }),
      ).toThrow();
    });
  });

  describe('PingWorker', () => {
    it('should encode and decode round-trip', () => {
      const ping = new PingWorker({ echo: 'hello' });
      expect(ping._tag).toBe('PingWorker');
      expect(ping.echo).toBe('hello');

      const encoded = Schema.encodeSync(PingWorker)(ping);
      const decoded = Schema.decodeSync(PingWorker)(encoded);
      expect(decoded._tag).toBe('PingWorker');
      expect(decoded.echo).toBe('hello');
    });
  });

  describe('QuerySymbolSubset', () => {
    it('should encode and decode round-trip', () => {
      const query = new QuerySymbolSubset({
        uris: ['file:///a.cls', 'file:///b.cls'],
      });
      expect(query._tag).toBe('QuerySymbolSubset');
      expect(query.uris).toEqual(['file:///a.cls', 'file:///b.cls']);

      const encoded = Schema.encodeSync(QuerySymbolSubset)(query);
      const decoded = Schema.decodeSync(QuerySymbolSubset)(encoded);
      expect(decoded.uris).toEqual(['file:///a.cls', 'file:///b.cls']);
    });
  });

  describe('WorkerAssistanceRequest', () => {
    it('should encode and decode round-trip', () => {
      const req = new WorkerAssistanceRequest({
        correlationId: 'abc-123',
        method: 'apex/findMissingArtifact',
        params: { name: 'MyClass' },
        blocking: true,
      });
      expect(req._tag).toBe('WorkerAssistanceRequest');
      expect(req.correlationId).toBe('abc-123');
      expect(req.blocking).toBe(true);

      const encoded = Schema.encodeSync(WorkerAssistanceRequest)(req);
      const decoded = Schema.decodeSync(WorkerAssistanceRequest)(encoded);
      expect(decoded.correlationId).toBe('abc-123');
      expect(decoded.method).toBe('apex/findMissingArtifact');
    });
  });

  describe('WorkspaceBatchIngest', () => {
    it('should encode and decode round-trip', () => {
      const batch = new WorkspaceBatchIngest({
        sessionId: 'sess-1',
        entries: [
          {
            uri: 'file:///MyClass.cls',
            content: 'public class MyClass {}',
            languageId: 'apex',
            version: 1,
          },
        ],
      });
      expect(batch._tag).toBe('WorkspaceBatchIngest');
      expect(batch.entries).toHaveLength(1);

      const encoded = Schema.encodeSync(WorkspaceBatchIngest)(batch);
      const decoded = Schema.decodeSync(WorkspaceBatchIngest)(encoded);
      expect(decoded.sessionId).toBe('sess-1');
      expect(decoded.entries[0].uri).toBe('file:///MyClass.cls');
    });
  });

  describe('ResourceLoaderGetSymbolTable', () => {
    it('should encode and decode round-trip', () => {
      const req = new ResourceLoaderGetSymbolTable({
        classPath: 'System/String.cls',
      });
      expect(req._tag).toBe('ResourceLoaderGetSymbolTable');

      const encoded = Schema.encodeSync(ResourceLoaderGetSymbolTable)(req);
      const decoded = Schema.decodeSync(ResourceLoaderGetSymbolTable)(encoded);
      expect(decoded.classPath).toBe('System/String.cls');
    });
  });

  describe('DispatchDocumentOpen', () => {
    it('should encode and decode round-trip', () => {
      const req = new DispatchDocumentOpen({
        uri: 'file:///MyClass.cls',
        languageId: 'apex',
        version: 1,
        content: 'public class MyClass {}',
      });
      expect(req._tag).toBe('DispatchDocumentOpen');

      const encoded = Schema.encodeSync(DispatchDocumentOpen)(req);
      const decoded = Schema.decodeSync(DispatchDocumentOpen)(encoded);
      expect(decoded.uri).toBe('file:///MyClass.cls');
      expect(decoded.content).toBe('public class MyClass {}');
    });
  });

  describe('DispatchDocumentChange', () => {
    it('should encode and decode round-trip', () => {
      const req = new DispatchDocumentChange({
        uri: 'file:///MyClass.cls',
        version: 2,
        contentChanges: [{ text: 'updated' }],
      });
      expect(req._tag).toBe('DispatchDocumentChange');

      const encoded = Schema.encodeSync(DispatchDocumentChange)(req);
      const decoded = Schema.decodeSync(DispatchDocumentChange)(encoded);
      expect(decoded.version).toBe(2);
    });
  });

  describe('DispatchDocumentSave', () => {
    it('should encode and decode round-trip', () => {
      const req = new DispatchDocumentSave({
        uri: 'file:///MyClass.cls',
        version: 3,
      });
      const encoded = Schema.encodeSync(DispatchDocumentSave)(req);
      const decoded = Schema.decodeSync(DispatchDocumentSave)(encoded);
      expect(decoded.uri).toBe('file:///MyClass.cls');
    });
  });

  describe('DispatchDocumentClose', () => {
    it('should encode and decode round-trip', () => {
      const req = new DispatchDocumentClose({ uri: 'file:///MyClass.cls' });
      const encoded = Schema.encodeSync(DispatchDocumentClose)(req);
      const decoded = Schema.decodeSync(DispatchDocumentClose)(encoded);
      expect(decoded.uri).toBe('file:///MyClass.cls');
    });
  });

  describe('DispatchHover', () => {
    it('should encode and decode round-trip', () => {
      const req = new DispatchHover({
        textDocument: { uri: 'file:///MyClass.cls' },
        position: { line: 5, character: 10 },
      });
      expect(req._tag).toBe('DispatchHover');

      const encoded = Schema.encodeSync(DispatchHover)(req);
      const decoded = Schema.decodeSync(DispatchHover)(encoded);
      expect(decoded.textDocument.uri).toBe('file:///MyClass.cls');
      expect(decoded.position.line).toBe(5);
    });
  });

  describe('DispatchDefinition', () => {
    it('should encode and decode round-trip', () => {
      const req = new DispatchDefinition({
        textDocument: { uri: 'file:///MyClass.cls' },
        position: { line: 10, character: 4 },
      });
      const encoded = Schema.encodeSync(DispatchDefinition)(req);
      const decoded = Schema.decodeSync(DispatchDefinition)(encoded);
      expect(decoded.position.line).toBe(10);
    });
  });

  describe('DispatchReferences', () => {
    it('should encode and decode round-trip', () => {
      const req = new DispatchReferences({
        textDocument: { uri: 'file:///MyClass.cls' },
        position: { line: 3, character: 7 },
        context: { includeDeclaration: true },
      });
      const encoded = Schema.encodeSync(DispatchReferences)(req);
      const decoded = Schema.decodeSync(DispatchReferences)(encoded);
      expect(decoded.context.includeDeclaration).toBe(true);
    });
  });

  describe('DispatchDocumentSymbol', () => {
    it('should encode and decode round-trip', () => {
      const req = new DispatchDocumentSymbol({
        textDocument: { uri: 'file:///MyClass.cls' },
      });
      const encoded = Schema.encodeSync(DispatchDocumentSymbol)(req);
      const decoded = Schema.decodeSync(DispatchDocumentSymbol)(encoded);
      expect(decoded.textDocument.uri).toBe('file:///MyClass.cls');
    });
  });

  describe('DispatchCodeLens', () => {
    it('should encode and decode round-trip', () => {
      const req = new DispatchCodeLens({
        textDocument: { uri: 'file:///MyClass.cls' },
      });
      const encoded = Schema.encodeSync(DispatchCodeLens)(req);
      const decoded = Schema.decodeSync(DispatchCodeLens)(encoded);
      expect(decoded.textDocument.uri).toBe('file:///MyClass.cls');
    });
  });

  describe('DispatchGenericLspRequest', () => {
    it('should encode and decode round-trip', () => {
      const req = new DispatchGenericLspRequest({
        requestType: 'rename',
        params: { textDocument: { uri: 'file:///a.cls' }, newName: 'Foo' },
      });
      expect(req._tag).toBe('DispatchGenericLspRequest');

      const encoded = Schema.encodeSync(DispatchGenericLspRequest)(req);
      const decoded = Schema.decodeSync(DispatchGenericLspRequest)(encoded);
      expect(decoded.requestType).toBe('rename');
    });

    it('should reject invalid request type', () => {
      expect(() =>
        Schema.decodeSync(DispatchGenericLspRequest)({
          _tag: 'DispatchGenericLspRequest',
          requestType: 'bogus' as any,
          params: {},
        }),
      ).toThrow();
    });
  });

  describe('isAllowedTag', () => {
    it('should allow WorkerInit for all roles', () => {
      expect(isAllowedTag('dataOwner', 'WorkerInit')).toBe(true);
      expect(isAllowedTag('enrichmentSearch', 'WorkerInit')).toBe(true);
      expect(isAllowedTag('resourceLoader', 'WorkerInit')).toBe(true);
    });

    it('should allow PingWorker for all roles', () => {
      expect(isAllowedTag('dataOwner', 'PingWorker')).toBe(true);
      expect(isAllowedTag('enrichmentSearch', 'PingWorker')).toBe(true);
      expect(isAllowedTag('resourceLoader', 'PingWorker')).toBe(true);
    });

    it('should restrict QuerySymbolSubset to dataOwner', () => {
      expect(isAllowedTag('dataOwner', 'QuerySymbolSubset')).toBe(true);
      expect(isAllowedTag('enrichmentSearch', 'QuerySymbolSubset')).toBe(false);
      expect(isAllowedTag('resourceLoader', 'QuerySymbolSubset')).toBe(false);
    });

    it('should restrict WorkspaceBatchIngest to dataOwner', () => {
      expect(isAllowedTag('dataOwner', 'WorkspaceBatchIngest')).toBe(true);
      expect(isAllowedTag('enrichmentSearch', 'WorkspaceBatchIngest')).toBe(
        false,
      );
      expect(isAllowedTag('resourceLoader', 'WorkspaceBatchIngest')).toBe(
        false,
      );
    });

    it('should restrict ResourceLoaderGetSymbolTable to resourceLoader', () => {
      expect(isAllowedTag('dataOwner', 'ResourceLoaderGetSymbolTable')).toBe(
        false,
      );
      expect(
        isAllowedTag('enrichmentSearch', 'ResourceLoaderGetSymbolTable'),
      ).toBe(false);
      expect(
        isAllowedTag('resourceLoader', 'ResourceLoaderGetSymbolTable'),
      ).toBe(true);
    });

    it('should route document mutations to dataOwner only', () => {
      for (const tag of [
        'DispatchDocumentOpen',
        'DispatchDocumentChange',
        'DispatchDocumentSave',
        'DispatchDocumentClose',
      ]) {
        expect(isAllowedTag('dataOwner', tag)).toBe(true);
        expect(isAllowedTag('enrichmentSearch', tag)).toBe(false);
        expect(isAllowedTag('resourceLoader', tag)).toBe(false);
      }
    });

    it('should route query dispatches to enrichmentSearch only', () => {
      for (const tag of [
        'DispatchHover',
        'DispatchDefinition',
        'DispatchReferences',
        'DispatchDocumentSymbol',
        'DispatchCodeLens',
        'DispatchDiagnostic',
        'DispatchGenericLspRequest',
      ]) {
        expect(isAllowedTag('enrichmentSearch', tag)).toBe(true);
        expect(isAllowedTag('dataOwner', tag)).toBe(false);
        expect(isAllowedTag('resourceLoader', tag)).toBe(false);
      }
    });

    it('should reject unknown tags', () => {
      expect(isAllowedTag('dataOwner', 'UnknownTag')).toBe(false);
      expect(isAllowedTag('enrichmentSearch', 'UnknownTag')).toBe(false);
      expect(isAllowedTag('resourceLoader', 'UnknownTag')).toBe(false);
    });
  });
});
