/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { enableConsoleLogging, getLogger } from '../src/index';
import { CompilerService, ApexSymbolCollectorListener } from '@salesforce/apex-parser-ast';

/**
 * Example demonstrating how to use the Apex parser with console logging
 * when running outside of a Language Server context
 */
async function main() {
  // Enable console logging for standalone usage
  enableConsoleLogging();

  const logger = getLogger();
  logger.info('Starting standalone Apex parser example');

  // Sample Apex code to parse
  const apexCode = `
    public class ExampleClass {
        private String name;
        
        public ExampleClass(String name) {
            this.name = name;
        }
        
        public String getName() {
            return this.name;
        }
    }
  `;

  try {
    logger.info('Creating compiler service');
    const compiler = new CompilerService();

    logger.info('Creating symbol collector listener');
    const listener = new ApexSymbolCollectorListener();

    logger.info('Compiling Apex code');
    const result = compiler.compile(apexCode, 'ExampleClass.cls', listener);

    if (result.result) {
      logger.info('Compilation successful');
      logger.info(`Found ${result.result.getCurrentScope().getAllSymbols().size} symbols`);

      // Log some details about what was found
      const symbols = Array.from(result.result.getCurrentScope().getAllSymbols());
      symbols.forEach((symbol) => {
        logger.debug(`Found symbol: ${symbol.name} (${symbol.kind})`);
      });
    } else {
      logger.error('Compilation failed');
    }

    if (result.errors.length > 0) {
      logger.warn(`Found ${result.errors.length} errors:`);
      result.errors.forEach((error) => {
        logger.error(`Error at line ${error.line}: ${error.message}`);
      });
    }

    if (result.warnings.length > 0) {
      logger.warn(`Found ${result.warnings.length} warnings:`);
      result.warnings.forEach((warning) => {
        logger.warn(warning);
      });
    }
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }

  logger.info('Standalone example completed');
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
