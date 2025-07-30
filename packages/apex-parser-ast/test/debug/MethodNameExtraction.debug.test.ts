/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { NamespaceDebugHelper } from '../utils/NamespaceDebugHelper';

describe('Method Name Extraction Debug', () => {
  let debugHelper: NamespaceDebugHelper;

  beforeEach(() => {
    debugHelper = new NamespaceDebugHelper();
  });

  afterEach(() => {
    debugHelper.reset();
  });

  it('should debug method name extraction in class', () => {
    const sourceCode = `
      public class TestClass {
        public void myMethod() {
          // method body
        }
      }
    `;

    const analysis = debugHelper.analyzeMethodNameExtraction(sourceCode);

    // Log the analysis results
    console.log('\n=== Analysis Summary ===');
    console.log('Method symbols found:', analysis.methodSymbols.length);
    analysis.methodSymbols.forEach((symbol, index) => {
      console.log(`  Method ${index + 1}: "${symbol.name}"`);
      console.log(`    Namespace: ${symbol.namespace?.toString() || 'null'}`);
      console.log(`    FQN: ${symbol.fqn || 'undefined'}`);
      console.log(`    ID: ${symbol.id}`);
      console.log(`    Location: ${JSON.stringify(symbol.location)}`);
    });

    // Check for empty method names
    const emptyNameMethods = analysis.methodSymbols.filter(
      (s) => s.name === '',
    );
    if (emptyNameMethods.length > 0) {
      console.log('\n⚠️  Found methods with empty names:');
      emptyNameMethods.forEach((symbol) => {
        console.log(
          `    ID: ${symbol.id}, Location: ${JSON.stringify(symbol.location)}`,
        );
      });
    }

    // Look for specific debug messages about method entry
    const enterMethodMessages = analysis.methodMessages.filter((msg) =>
      msg.message.includes('Entering method declaration'),
    );
    console.log('\n=== Method Entry Messages ===');
    enterMethodMessages.forEach((msg) => {
      console.log(`  ${msg.message}`);
    });

    // Look for ID-related messages
    const idMessages = analysis.methodMessages.filter(
      (msg) => msg.message.includes('id') || msg.message.includes('ID'),
    );
    console.log('\n=== ID-Related Messages ===');
    idMessages.forEach((msg) => {
      console.log(`  ${msg.message}`);
    });
  });

  it('should debug method name extraction in interface', () => {
    const sourceCode = `
      public interface TestInterface {
        void myMethod();
      }
    `;

    const analysis = debugHelper.analyzeMethodNameExtraction(sourceCode);

    console.log('\n=== Interface Method Analysis ===');
    console.log('Method symbols found:', analysis.methodSymbols.length);
    analysis.methodSymbols.forEach((symbol, index) => {
      console.log(`  Method ${index + 1}: "${symbol.name}"`);
      console.log(`    Namespace: ${symbol.namespace?.toString() || 'null'}`);
      console.log(`    FQN: ${symbol.fqn || 'undefined'}`);
    });
  });

  it('should debug ANTLR context structure', () => {
    const sourceCode = `
      public class TestClass {
        public void myMethod() {
          // method body
        }
      }
    `;

    console.log('\n=== ANTLR Context Structure Analysis ===');

    // This test will help us understand what the ANTLR context looks like
    // We'll add more detailed logging to the listener to see the context structure
    const { debugMessages } = debugHelper.compileWithDebug(sourceCode);

    // Look for any context-related messages
    const contextMessages = debugMessages.filter(
      (msg) =>
        msg.message.includes('ctx') ||
        msg.message.includes('context') ||
        msg.message.includes('text'),
    );

    console.log('\n=== Context-Related Messages ===');
    contextMessages.forEach((msg) => {
      console.log(`  ${msg.message}`);
    });

    // Also check if the listener methods are being called at all
    const listenerMessages = debugMessages.filter(
      (msg) =>
        msg.message.includes('Entering') ||
        msg.message.includes('Method Declaration') ||
        msg.message.includes('Interface Method'),
    );

    console.log('\n=== Listener Method Calls ===');
    if (listenerMessages.length === 0) {
      console.log(
        '  ⚠️  No listener method calls detected! This suggests the parser is not calling the listener methods.',
      );
    } else {
      listenerMessages.forEach((msg) => {
        console.log(`  ${msg.message}`);
      });
    }
  });

  it('should test with simpler method syntax', () => {
    const sourceCode = `
      public class TestClass {
        void myMethod() {
        }
      }
    `;

    console.log('\n=== Testing Simpler Method Syntax ===');
    const analysis = debugHelper.analyzeMethodNameExtraction(sourceCode);

    console.log('Method symbols found:', analysis.methodSymbols.length);
    analysis.methodSymbols.forEach((symbol, index) => {
      console.log(`  Method ${index + 1}: "${symbol.name}"`);
    });
  });
});
