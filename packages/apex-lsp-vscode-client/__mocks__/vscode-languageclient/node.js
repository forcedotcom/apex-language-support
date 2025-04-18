// Basic mock classes
class TextDocumentIdentifier {
  constructor(uri) {
    this.uri = uri;
  }
}

class MarkupContent {
  constructor(kind, value) {
    this.kind = kind;
    this.value = value;
  }
}

class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
}

class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
}

class Location {
  constructor(uri, range) {
    this.uri = uri;
    this.range = range;
  }
}

class LanguageClient {
  constructor(id, name, serverOptions, clientOptions) {
    this.id = id;
    this.name = name;
    this.serverOptions = serverOptions;
    this.clientOptions = clientOptions;
    this.start = jest.fn().mockReturnValue(Promise.resolve());
    this.stop = jest.fn().mockReturnValue(Promise.resolve());
    this.onNotification = jest.fn();
    this.onRequest = jest.fn();
    this.sendNotification = jest.fn();
  }
}

// Create mock for export
module.exports = {
  LanguageClient,
  TextDocumentIdentifier,
  MarkupContent,
  Position,
  Range,
  Location,
  TransportKind: {
    stdio: 0,
    ipc: 1,
    pipe: 2,
    socket: 3,
  },
  ErrorCodes: {
    ParseError: -32700,
    InvalidRequest: -32600,
    MethodNotFound: -32601,
    InvalidParams: -32602,
    InternalError: -32603,
    ServerErrorStart: -32099,
    ServerErrorEnd: -32000,
    ServerNotInitialized: -32002,
    UnknownErrorCode: -32001,
    RequestCancelled: -32800,
    ContentModified: -32801,
  },
}; 