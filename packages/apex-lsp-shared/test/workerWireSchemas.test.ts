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
  WorkerRemoteStdlibWarmup,
  WIRE_PROTOCOL_VERSION,
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

    it('should encode and decode optional serverMode', () => {
      const init = new WorkerInit({
        role: 'enrichmentSearch',
        protocolVersion: WIRE_PROTOCOL_VERSION,
        serverMode: 'development',
      });
      const encoded = Schema.encodeSync(WorkerInit)(init);
      const decoded = Schema.decodeSync(WorkerInit)(encoded);
      expect(decoded.serverMode).toBe('development');
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

  describe('WorkerRemoteStdlibWarmup', () => {
    it('should encode and decode round-trip', () => {
      const req = new WorkerRemoteStdlibWarmup({});
      expect(req._tag).toBe('WorkerRemoteStdlibWarmup');

      const encoded = Schema.encodeSync(WorkerRemoteStdlibWarmup)(req);
      const decoded = Schema.decodeSync(WorkerRemoteStdlibWarmup)(encoded);
      expect(decoded._tag).toBe('WorkerRemoteStdlibWarmup');
    });
  });
});
