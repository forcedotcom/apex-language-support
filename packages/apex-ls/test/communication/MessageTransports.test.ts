/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  WorkerMessageTransport,
  SelfMessageTransport,
} from '../../src/communication/MessageTransports';

// Mock Worker
class MockWorker {
  postMessage = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  terminate = jest.fn();
}

// Mock WorkerGlobalScope (self)
class MockWorkerScope {
  postMessage = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
}


describe('MessageTransports', () => {
  describe('WorkerMessageTransport', () => {
    let mockWorker: MockWorker;
    let transport: WorkerMessageTransport;

    beforeEach(() => {
      mockWorker = new MockWorker();
      transport = new WorkerMessageTransport(mockWorker as any);
    });

    describe('Message Sending', () => {
      it('should send messages to worker', async () => {
        const testMessage = { jsonrpc: '2.0', method: 'test' };
        await transport.send(testMessage);
        
        expect(mockWorker.postMessage).toHaveBeenCalledWith(testMessage);
      });

      it('should handle send errors gracefully', async () => {
        mockWorker.postMessage.mockImplementationOnce(() => {
          throw new Error('PostMessage failed');
        });

        const testMessage = { jsonrpc: '2.0', method: 'test' };
        await expect(transport.send(testMessage)).rejects.toThrow('PostMessage failed');
      });
    });

    describe('Message Listening', () => {
      it('should set up message listeners', () => {
        const mockCallback = jest.fn();
        const disposable = transport.listen(mockCallback);
        
        expect(mockWorker.addEventListener).toHaveBeenCalledWith(
          'message',
          expect.any(Function)
        );
        expect(disposable.dispose).toBeDefined();
      });

      it('should handle incoming messages', () => {
        const mockCallback = jest.fn();
        transport.listen(mockCallback);
        
        // Get the message handler
        const messageHandler = mockWorker.addEventListener.mock.calls
          .find(([event]) => event === 'message')?.[1];
        
        if (messageHandler) {
          const testMessage = { data: { jsonrpc: '2.0', method: 'test' } };
          messageHandler(testMessage);
          expect(mockCallback).toHaveBeenCalledWith(testMessage.data);
        }
      });

      it('should clean up listeners when disposed', () => {
        const mockCallback = jest.fn();
        const disposable = transport.listen(mockCallback);
        
        disposable.dispose();
        
        expect(mockWorker.removeEventListener).toHaveBeenCalledWith(
          'message',
          expect.any(Function)
        );
      });
    });

    describe('Error Handling', () => {
      it('should set up error listeners', () => {
        const mockCallback = jest.fn();
        const disposable = transport.onError(mockCallback);
        
        expect(mockWorker.addEventListener).toHaveBeenCalledWith(
          'error',
          expect.any(Function)
        );
        expect(disposable.dispose).toBeDefined();
      });

      it('should handle worker errors', () => {
        const mockCallback = jest.fn();
        transport.onError(mockCallback);
        
        const errorHandler = mockWorker.addEventListener.mock.calls
          .find(([event]) => event === 'error')?.[1];
        
        if (errorHandler) {
          const errorEvent = { message: 'Worker error' };
          errorHandler(errorEvent);
          expect(mockCallback).toHaveBeenCalledWith(expect.any(Error));
        }
      });
    });
  });

  describe('SelfMessageTransport', () => {
    let mockSelf: MockWorkerScope;
    let transport: SelfMessageTransport;

    beforeEach(() => {
      mockSelf = new MockWorkerScope();
      transport = new SelfMessageTransport(mockSelf as any);
    });

    describe('Message Sending', () => {
      it('should send messages to self', async () => {
        const testMessage = { jsonrpc: '2.0', method: 'test' };
        await transport.send(testMessage);
        
        expect(mockSelf.postMessage).toHaveBeenCalledWith(testMessage);
      });

      it('should work with global self when no scope provided', async () => {
        // Mock global self
        const globalSelf = new MockWorkerScope();
        (global as any).self = globalSelf;
        
        const globalTransport = new SelfMessageTransport();
        const testMessage = { jsonrpc: '2.0', method: 'test' };
        await globalTransport.send(testMessage);
        
        expect(globalSelf.postMessage).toHaveBeenCalledWith(testMessage);
        
        // Cleanup
        delete (global as any).self;
      });
    });

    describe('Message Listening', () => {
      it('should set up message listeners on self', () => {
        const mockCallback = jest.fn();
        const disposable = transport.listen(mockCallback);
        
        expect(mockSelf.addEventListener).toHaveBeenCalledWith(
          'message',
          expect.any(Function)
        );
        expect(disposable.dispose).toBeDefined();
      });

      it('should handle messages from main thread', () => {
        const mockCallback = jest.fn();
        transport.listen(mockCallback);
        
        const messageHandler = mockSelf.addEventListener.mock.calls
          .find(([event]) => event === 'message')?.[1];
        
        if (messageHandler) {
          const testMessage = { data: { jsonrpc: '2.0', method: 'test' } };
          messageHandler(testMessage);
          expect(mockCallback).toHaveBeenCalledWith(testMessage.data);
        }
      });
    });
  });

});