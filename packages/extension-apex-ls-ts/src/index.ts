import {
  createConnection,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
} from "vscode-languageserver/node";

// Create a connection for the server. The connection uses Node's IPC as a transport.
const connection = createConnection(ProposedFeatures.all);

// Initialize server capabilities and properties
connection.onInitialize((params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: 1, // Full synchronization
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ["."],
      },
      hoverProvider: true,
    },
  };
});

// Handle client connection
connection.onInitialized(() => {
  console.log("Language server initialized and connected to client.");
});

// Listen on the connection
connection.listen();
