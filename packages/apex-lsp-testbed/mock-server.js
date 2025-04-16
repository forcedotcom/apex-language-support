
      import { createConnection, ProposedFeatures, IPCMessageReader, IPCMessageWriter } from 'vscode-languageserver/node.js';
      
      // Create a connection for the server using Node IPC
      const connection = createConnection(
        ProposedFeatures.all,
        new IPCMessageReader(process),
        new IPCMessageWriter(process)
      );
      
      console.log('Mock Apex LSP server started');
      
      // Initialize the server capabilities
      connection.onInitialize((params) => {
        console.log('Initializing server with params:', JSON.stringify(params));
        return {
          capabilities: {
            textDocumentSync: 1, // Full
            hoverProvider: true,
            completionProvider: {
              resolveProvider: true,
              triggerCharacters: ['.']
            },
            documentSymbolProvider: true,
            documentFormattingProvider: true
          }
        };
      });
      
      // Handle hover requests with mock data
      connection.onHover((params) => {
        console.log('Hover request at:', JSON.stringify(params.position));
        return {
          contents: {
            kind: 'markdown',
            value: '**Mock Hover Information**\n\nThis is mock hover data from the test server.'
          }
        };
      });
      
      // Handle completion requests with mock data
      connection.onCompletion((params) => {
        console.log('Completion request at:', JSON.stringify(params.position));
        return {
          isIncomplete: false,
          items: [
            {
              label: 'mockMethod',
              kind: 2, // Method
              detail: 'Mock completion item',
              documentation: 'This is a mock method completion provided by the test server'
            },
            {
              label: 'mockProperty',
              kind: 7, // Property
              detail: 'Mock property',
              documentation: 'This is a mock property completion provided by the test server'
            }
          ]
        };
      });
      
      // Handle document symbol requests with mock data
      connection.onDocumentSymbol((params) => {
        console.log('Document symbol request for:', params.textDocument.uri);
        return [
          {
            name: 'MockClass',
            kind: 5, // Class
            range: { start: { line: 0, character: 0 }, end: { line: 10, character: 1 } },
            selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 16 } },
            children: [
              {
                name: 'mockMethod',
                kind: 6, // Method
                range: { start: { line: 2, character: 4 }, end: { line: 4, character: 5 } },
                selectionRange: { start: { line: 2, character: 4 }, end: { line: 2, character: 20 } }
              }
            ]
          }
        ];
      });
      
      connection.onInitialized(() => {
        console.log('Server initialized');
      });
      
      process.on('unhandledRejection', (error) => {
        console.error('Unhandled promise rejection:', error);
      });
      
      // Start listening
      connection.listen();
      console.log('Server listening...');
    