#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test Apex class content
const testApexContent = `
public class TestClass {
    private String name;
    private Integer count;
    
    public TestClass() {
        this.name = 'Test';
        this.count = 0;
    }
    
    public void incrementCount() {
        this.count++;
    }
    
    public Integer getCount() {
        return this.count;
    }
    
    public String getName() {
        return this.name;
    }
}
`.trim();

// Create a temporary test file
const testFilePath = path.join(__dirname, 'TestClass.cls');
fs.writeFileSync(testFilePath, testApexContent);

console.log('Created test file:', testFilePath);
console.log('Test file content:');
console.log(testApexContent);

// Path to the language server
const serverPath = path.join(__dirname, '..', 'apex-ls', 'out', 'index.js');

console.log('\nStarting language server at:', serverPath);

// Start the language server
const server = spawn('node', [serverPath, '--stdio'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: __dirname,
});

let messageId = 1;

// Helper function to send JSON-RPC message
function sendMessage(method, params) {
  const message = {
    jsonrpc: '2.0',
    id: messageId++,
    method: method,
    params: params,
  };

  const content = JSON.stringify(message);
  const header = `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n`;

  console.log('\n>>> Sending:', method);
  console.log(JSON.stringify(message, null, 2));

  server.stdin.write(header + content);
}

// Helper function to send notification
function sendNotification(method, params) {
  const message = {
    jsonrpc: '2.0',
    method: method,
    params: params,
  };

  const content = JSON.stringify(message);
  const header = `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n`;

  console.log('\n>>> Sending notification:', method);
  console.log(JSON.stringify(message, null, 2));

  server.stdin.write(header + content);
}

let buffer = '';

// Handle server output
server.stdout.on('data', (data) => {
  buffer += data.toString();

  // Process complete messages
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;

    const header = buffer.substring(0, headerEnd);
    const contentLengthMatch = header.match(/Content-Length: (\d+)/);

    if (!contentLengthMatch) {
      console.error('Invalid header:', header);
      break;
    }

    const contentLength = parseInt(contentLengthMatch[1]);
    const messageStart = headerEnd + 4;

    if (buffer.length < messageStart + contentLength) break;

    const messageContent = buffer.substring(
      messageStart,
      messageStart + contentLength,
    );
    buffer = buffer.substring(messageStart + contentLength);

    try {
      const message = JSON.parse(messageContent);
      console.log('\n<<< Received:');
      console.log(JSON.stringify(message, null, 2));

      // Handle specific responses
      if (message.id === 1) {
        // Initialize response
        console.log('\n=== Server initialized successfully ===');

        // Send initialized notification
        sendNotification('initialized', {});

        // Open the test document
        setTimeout(() => {
          const fileUri = `file://${testFilePath}`;
          sendNotification('textDocument/didOpen', {
            textDocument: {
              uri: fileUri,
              languageId: 'apex',
              version: 1,
              text: testApexContent,
            },
          });

          // Request document symbols after a short delay
          setTimeout(() => {
            sendMessage('textDocument/documentSymbol', {
              textDocument: {
                uri: fileUri,
              },
            });
          }, 1000);
        }, 500);
      } else if (message.method === 'textDocument/documentSymbol') {
        // Document symbol response
        console.log('\n=== DOCUMENT SYMBOLS RESULT ===');
        if (message.result && message.result.length > 0) {
          console.log('SUCCESS: Found', message.result.length, 'symbols');
          message.result.forEach((symbol, index) => {
            console.log(`Symbol ${index + 1}:`, {
              name: symbol.name,
              kind: symbol.kind,
              range: symbol.range,
              children: symbol.children ? symbol.children.length : 0,
            });
          });
        } else {
          console.log('FAILURE: No symbols found or null result');
        }

        // Shutdown the server
        setTimeout(() => {
          sendMessage('shutdown', {});
        }, 1000);
      } else if (message.id && message.method === 'shutdown') {
        // Shutdown response
        sendNotification('exit', {});
        setTimeout(() => {
          server.kill();
          // Clean up test file
          fs.unlinkSync(testFilePath);
          console.log('\nTest completed. Cleaned up test file.');
        }, 500);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      console.error('Message content:', messageContent);
    }
  }
});

// Handle server errors
server.stderr.on('data', (data) => {
  console.error('Server stderr:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Initialize the server
setTimeout(() => {
  sendMessage('initialize', {
    processId: process.pid,
    clientInfo: {
      name: 'Document Symbol Test Client',
      version: '1.0.0',
    },
    capabilities: {
      textDocument: {
        documentSymbol: {
          dynamicRegistration: true,
          hierarchicalDocumentSymbolSupport: true,
        },
      },
    },
    rootUri: `file://${__dirname}`,
  });
}, 100);
