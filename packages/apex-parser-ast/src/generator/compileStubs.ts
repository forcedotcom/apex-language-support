/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import * as path from 'path';

import { getLogger } from '@salesforce/apex-lsp-shared';

import {
  CompilerService,
  ApexSymbolCollectorListener,
  SymbolTable,
  SymbolKind,
  VariableSymbol,
  EnumSymbol,
  MethodSymbol,
  ApexSymbol,
} from '../index';

interface CompilationResult {
  result: SymbolTable | null;
  errors: any[];
  warnings: any[];
}

interface SymbolMap {
  [key: string]: ApexSymbol;
}

interface CleanSymbol {
  key: string;
  symbol: any; // Changed to match TypeScript generation needs
}

interface CleanSymbolTable {
  symbols: CleanSymbol[];
  scopes: any[];
}

interface CompilationOutput {
  symbolTable: CleanSymbolTable;
  namespace: string;
  errors: any[];
  warnings: any[];
}

interface CompilationResults {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    file: string;
    error: string;
  }>;
}

/**
 * Find all Apex files in a directory recursively
 * @param dir Directory to search in
 * @param specificFiles Optional list of specific files to process
 * @returns Array of file paths
 */
function findApexFiles(
  dir: string,
  specificFiles: string[] | null = null,
): string[] {
  if (specificFiles) {
    return specificFiles.map((file) => path.join(dir, file));
  }

  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findApexFiles(fullPath));
    } else if (entry.name.endsWith('.cls')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Parse an Apex file and collect symbols
 * @param filePath Path to the Apex file
 * @param namespace Namespace for the file
 * @returns Compilation result
 */
function parseApexFile(filePath: string, namespace: string): CompilationResult {
  const content = fs.readFileSync(filePath, 'utf8');
  const listener = new ApexSymbolCollectorListener();
  const compiler = new CompilerService(namespace);

  return compiler.compile(content, filePath, listener, {
    projectNamespace: namespace,
    includeComments: false, // Don't need comments for stub generation
  });
}

/**
 * Main function to compile all stub files
 * @param specificFiles Optional list of specific files to process
 * @param sourceDir Optional source directory path
 * @param outputDir Optional output directory path
 */
export async function compileStubs(
  specificFiles: string[] | null = null,
  sourceDir?: string,
  outputDir?: string,
): Promise<void> {
  const logger = getLogger();
  const resourcesPath = path.join(
    __dirname,
    '..',
    '..',
    'out',
    'resources',
    'StandardApexLibrary',
  );
  const defaultSourceDir = path.join(resourcesPath);
  const defaultOutputDir = path.join(resourcesPath);

  const finalSourceDir = sourceDir || defaultSourceDir;
  const finalOutputDir = outputDir || defaultOutputDir;

  logger.info('Starting compilation of stub files...');
  if (specificFiles) {
    logger.info(() => 'Processing specific files:');
    specificFiles.forEach((file) => logger.info(() => `- ${file}`));
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(finalOutputDir)) {
    fs.mkdirSync(finalOutputDir, { recursive: true });
  }

  // Find all Apex files
  const files = findApexFiles(finalSourceDir, specificFiles);
  logger.info(() => `Found ${files.length} Apex files to compile`);

  const results: CompilationResults = {
    total: files.length,
    successful: 0,
    failed: 0,
    errors: [],
  };

  // Process each file
  for (const file of files) {
    try {
      // Get namespace from parent directory name
      const namespace = path.basename(path.dirname(file));
      logger.info(() => `\nProcessing ${file} (namespace: ${namespace})`);

      // Parse the file
      const result = parseApexFile(file, namespace);

      // Create output path
      const relativePath = path.relative(finalSourceDir, file);
      const outputPath = path.join(
        finalOutputDir,
        relativePath.replace('.cls', '.ast.json'),
      );

      // Create output directory if it doesn't exist
      const outputDirPath = path.dirname(outputPath);
      if (!fs.existsSync(outputDirPath)) {
        fs.mkdirSync(outputDirPath, { recursive: true });
      }

      if (!result.result) {
        throw new Error('Compilation failed: No symbol table generated');
      }

      // Store symbols directly without RuntimeSymbol wrapper
      const symbolTable = result.result;
      const symbols = Array.from(symbolTable.getCurrentScope().getAllSymbols());
      const symbolMap: SymbolMap = {};
      const classMethods: { [key: string]: MethodSymbol[] } = {};

      // First pass: collect all class symbols and their scopes
      const classScopes = new Map<string, any>();
      for (const symbol of symbols) {
        if (symbol.kind === SymbolKind.Class) {
          // Find the scope for this class
          const scope = symbolTable.findScopeByName(symbol.name);
          if (scope) {
            classScopes.set(symbol.key.name, scope);
          }
        }
      }

      // Second pass: collect methods from class scopes
      for (const [className, scope] of classScopes) {
        const methods = (Array.from(scope.getAllSymbols()) as ApexSymbol[])
          .filter((s) => s.kind === SymbolKind.Method)
          .map((s) => s as MethodSymbol);
        if (methods.length > 0) {
          classMethods[className] = methods;
        }
      }

      // Third pass: create runtime symbols
      for (const symbol of symbols) {
        // For enum symbols, we need to wrap their values too
        if (symbol.kind === SymbolKind.Enum) {
          const enumSymbol = symbol as EnumSymbol;
          if (enumSymbol.values) {
            // Create a clean copy of values without parent references
            const cleanValues = enumSymbol.values.map(
              (value: VariableSymbol) => {
                const { parent, ...rest } = value;
                return rest;
              },
            );
            // Store the clean values
            enumSymbol.values = cleanValues;
          }
        }

        symbolMap[symbol.key.name] = symbol;
      }

      // Create a clean version of the symbol table for serialization
      const cleanSymbolTable: CleanSymbolTable = {
        symbols: Object.entries(symbolMap).map(([key, symbol]) => {
          // Create a clean copy of the symbol without circular references
          const cleanSymbol = {
            key,
            symbol: {
              kind:
                symbol.kind === SymbolKind.Enum
                  ? 'Enum'
                  : symbol.kind === SymbolKind.Class
                    ? 'Class'
                    : symbol.kind === SymbolKind.Method
                      ? 'Method'
                      : symbol.kind,
              name: symbol.key.name,
              location: symbol.location,
              modifiers: symbol.modifiers,
              annotations: symbol.annotations,
              ...(symbol.kind === SymbolKind.Class && {
                methods:
                  classMethods[symbol.key.name]?.map((method) => ({
                    name: method.name,
                    kind: 'Method',
                    location: method.location,
                    modifiers: method.modifiers,
                    parameters: method.parameters?.map((param) => ({
                      name: param.name,
                      type: param.type,
                      modifiers: param.modifiers,
                    })),
                    returnType: method.returnType,
                  })) || [],
              }),
              ...(symbol.kind === SymbolKind.Method && {
                parameters: (symbol as MethodSymbol).parameters?.map(
                  (param) => ({
                    name: param.name,
                    type: param.type,
                    modifiers: param.modifiers,
                  }),
                ),
                returnType: (symbol as MethodSymbol).returnType,
              }),
              ...(symbol.kind === SymbolKind.Enum && {
                values: (symbol as EnumSymbol).values?.map((value) => ({
                  name: value.name,
                  type: value.type,
                  location: value.location,
                })),
              }),
            },
          };

          return cleanSymbol;
        }),
        scopes: symbolTable.toJSON().scopes.map((scope) => ({
          name: scope.key,
          symbols:
            scope.scope?.symbols.map((symbol) => ({
              name: symbol.name,
              key: symbol.key.name,
            })) || [],
        })),
      };

      // Save the result
      const output: CompilationOutput = {
        symbolTable: cleanSymbolTable,
        namespace,
        errors: result.errors,
        warnings: result.warnings,
      };

      // Check if there are any compilation errors
      if (result.errors && result.errors.length > 0) {
        throw new Error(
          `Compilation failed: ${result.errors.map((e) => e.message || e).join(', ')}`,
        );
      }

      // Ensure the output directory exists
      if (!fs.existsSync(outputDirPath)) {
        fs.mkdirSync(outputDirPath, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      logger.info(() => `✓ Compiled ${relativePath}`);

      results.successful++;
    } catch (error) {
      logger.error(() => `✗ Failed to compile ${file}:`);
      results.failed++;
      results.errors.push({
        file,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Save compilation summary
  const summaryPath = path.join(finalOutputDir, 'compilation-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));

  logger.info(() => '\nCompilation Summary:');
  logger.info(() => `Total files: ${results.total}`);
  logger.info(() => `Successful: ${results.successful}`);
  logger.info(() => `Failed: ${results.failed}`);

  if (results.failed > 0) {
    logger.error(() => '\nErrors:');
    results.errors.forEach((e) => {
      logger.error(() => `- ${e.file}: ${e.error}`);
    });
  }
}

// Only run if this file is being executed directly
if (require.main === module) {
  const specificFiles =
    process.argv.slice(2).length > 0 ? process.argv.slice(2) : null;
  compileStubs(specificFiles).catch(console.error);
}
