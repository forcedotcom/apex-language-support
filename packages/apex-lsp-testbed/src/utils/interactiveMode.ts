/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as readline from 'readline';

import { ApexJsonRpcClient } from '../client/ApexJsonRpcClient';

/**
 * Start interactive mode with a running client
 */
export async function startInteractiveMode(
  client: ApexJsonRpcClient,
): Promise<void> {
  console.log(
    '\nInteractive mode. Type commands or "help" for assistance. Press Ctrl+C to exit.',
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  // Example document URI for testing
  const testUri = 'file:///test.cls';
  let documentVersion = 1;
  let documentOpened = false;

  // Process user commands
  rl.prompt();
  rl.on('line', async (line) => {
    const cmd = line.trim();

    try {
      if (cmd === 'help') {
        console.log('Available commands:');
        console.log('  open          - Open a test document');
        console.log('  update        - Update the test document');
        console.log('  close         - Close the test document');
        console.log('  completion    - Request completion at a position');
        console.log('  hover         - Request hover information');
        console.log('  symbols       - Request document symbols');
        console.log('  format        - Request document formatting');
        console.log('  capabilities  - Show server capabilities');
        console.log('  exit/quit     - Exit the program');
        console.log('  help          - Show this help');
      } else if (cmd === 'open') {
        const sampleCode = `
public class TestClass {
    private String name;
    
    public TestClass(String name) {
        this.name = name;
    }
    
    public String getName() {
        return this.name;
    }
}`;
        client.openTextDocument(testUri, sampleCode);
        documentOpened = true;
        console.log(`Opened document ${testUri}`);
      } else if (cmd === 'update') {
        if (!documentOpened) {
          console.log('Please open the document first');
        } else {
          documentVersion++;
          const updatedCode = `
public class TestClass {
    private String name;
    private Integer count;
    
    public TestClass(String name, Integer count) {
        this.name = name;
        this.count = count;
    }
    
    public String getName() {
        return this.name;
    }
    
    public Integer getCount() {
        return this.count;
    }
}`;
          client.updateTextDocument(testUri, updatedCode, documentVersion);
          console.log(
            `Updated document ${testUri} (version ${documentVersion})`,
          );
        }
      } else if (cmd === 'close') {
        if (!documentOpened) {
          console.log('No document is currently open');
        } else {
          client.closeTextDocument(testUri);
          documentOpened = false;
          console.log(`Closed document ${testUri}`);
        }
      } else if (cmd === 'completion') {
        if (!documentOpened) {
          console.log('Please open the document first');
        } else {
          const result = await client.completion(testUri, 5, 16);
          console.log('Completion results:', JSON.stringify(result, null, 2));
        }
      } else if (cmd === 'hover') {
        if (!documentOpened) {
          console.log('Please open the document first');
        } else {
          const result = await client.hover(testUri, 5, 16);
          console.log('Hover results:', JSON.stringify(result, null, 2));
        }
      } else if (cmd === 'symbols') {
        if (!documentOpened) {
          console.log('Please open the document first');
        } else {
          const result = await client.documentSymbol(testUri);
          console.log('Document symbols:', JSON.stringify(result, null, 2));
        }
      } else if (cmd === 'format') {
        if (!documentOpened) {
          console.log('Please open the document first');
        } else {
          const result = await client.formatting(testUri);
          console.log('Formatting results:', JSON.stringify(result, null, 2));
        }
      } else if (cmd === 'capabilities') {
        const capabilities = client.getServerCapabilities();
        console.log(
          'Server capabilities:',
          JSON.stringify(capabilities, null, 2),
        );
      } else if (cmd === 'exit' || cmd === 'quit') {
        rl.close();
        return;
      } else {
        console.log(
          `Unknown command: ${cmd}. Type 'help' for available commands.`,
        );
      }
    } catch (error) {
      console.error('Error executing command:', error);
    }

    rl.prompt();
  });

  rl.on('close', async () => {
    console.log('Exiting interactive mode...');
    try {
      await client.stop();
    } catch (_error) {
      // Ignore shutdown errors - they're expected during exit
      console.log('Server stopped');
    }
    process.exit(0);
  });
}
