import { Readable, Writable } from 'stream';
import { MessageReader, MessageWriter } from 'vscode-jsonrpc';

// Extend MessageReader to allow Node streams
declare module 'vscode-jsonrpc' {
  interface MessageReader {
  }

  interface MessageWriter {
  }

  function createMessageConnection(reader: MessageReader | Readable, writer: MessageWriter | Writable): MessageConnection;
}
