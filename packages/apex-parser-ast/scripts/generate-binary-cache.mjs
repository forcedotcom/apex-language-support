#!/usr/bin/env node
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Script to generate the Standard Apex Library binary cache.
 * This produces apex-stdlib.bin.gz which provides much faster loading than protobuf.
 *
 * Usage:
 *   npm run generate:binary-cache
 *   node scripts/generate-binary-cache.mjs [--force]
 *
 * Options:
 *   --force  Force regeneration even if cache is up-to-date
 */

import { createHash } from 'crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'fflate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Configuration
const SOURCE_DIR = join(projectRoot, 'src', 'resources', 'StandardApexLibrary');
const BUILTINS_DIR = join(projectRoot, 'src', 'resources', 'builtins');
const OUTPUT_DIR = join(projectRoot, 'resources');

// Output file names
const BINARY_CACHE_FILE = join(OUTPUT_DIR, 'apex-stdlib.bin.gz');
const BINARY_CHECKSUM_FILE = join(OUTPUT_DIR, 'apex-stdlib.bin.sha256');

// List of builtin classes that should be loaded from builtins/ folder
const BUILTIN_CLASSES = new Set([
  'Blob.cls',
  'Boolean.cls',
  'Date.cls',
  'DateTime.cls',
  'Decimal.cls',
  'Double.cls',
  'Id.cls',
  'Integer.cls',
  'List.cls',
  'Long.cls',
  'Map.cls',
  'Object.cls',
  'Set.cls',
  'String.cls',
  'Time.cls',
]);

/**
 * Calculate SHA256 checksum of all source files
 */
function calculateSourceChecksum(sourceDir, builtinsDir) {
  const hash = createHash('sha256');
  const files = [];

  // Collect all .cls files from source directory
  function collectFiles(dir, prefix = '') {
    if (!existsSync(dir)) return;

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        collectFiles(fullPath, relativePath);
      } else if (entry.name.endsWith('.cls')) {
        // Skip builtin classes in System/ folder
        const isBuiltinInSystem =
          relativePath.includes('System/') && BUILTIN_CLASSES.has(entry.name);
        if (!isBuiltinInSystem) {
          files.push({ path: relativePath, fullPath });
        }
      }
    }
  }

  collectFiles(sourceDir);

  // Also collect builtins
  if (existsSync(builtinsDir)) {
    const builtinEntries = readdirSync(builtinsDir, { withFileTypes: true });
    for (const entry of builtinEntries) {
      if (entry.isFile() && entry.name.endsWith('.cls')) {
        files.push({
          path: `builtins/${entry.name}`,
          fullPath: join(builtinsDir, entry.name),
        });
      }
    }
  }

  // Sort for consistent hashing
  files.sort((a, b) => a.path.localeCompare(b.path));

  // Hash file contents
  for (const file of files) {
    const content = readFileSync(file.fullPath, 'utf8');
    hash.update(file.path);
    hash.update(content);
  }

  return hash.digest('hex');
}

/**
 * Find all .cls files organized by namespace
 */
function findAllClasses(sourceDir, builtinsDir) {
  const namespaces = new Map(); // Map<string, { path: string, namespace: string }[]>

  function processDir(dir, namespace = '') {
    if (!existsSync(dir)) return;

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Directory name is the namespace
        processDir(fullPath, entry.name);
      } else if (entry.name.endsWith('.cls')) {
        // Skip builtin classes in System/ folder
        const isBuiltinInSystem =
          namespace === 'System' && BUILTIN_CLASSES.has(entry.name);
        if (!isBuiltinInSystem) {
          const ns = namespace || 'System';
          if (!namespaces.has(ns)) {
            namespaces.set(ns, []);
          }
          namespaces.get(ns).push({
            path: fullPath,
            namespace: ns,
            className: entry.name.replace('.cls', ''),
          });
        }
      }
    }
  }

  processDir(sourceDir);

  // Add builtins to System namespace
  if (existsSync(builtinsDir)) {
    if (!namespaces.has('System')) {
      namespaces.set('System', []);
    }
    const builtinEntries = readdirSync(builtinsDir, { withFileTypes: true });
    for (const entry of builtinEntries) {
      if (entry.isFile() && entry.name.endsWith('.cls')) {
        namespaces.get('System').push({
          path: join(builtinsDir, entry.name),
          namespace: 'System',
          className: entry.name.replace('.cls', ''),
        });
      }
    }
  }

  return namespaces;
}

/**
 * Parse a single Apex file and return the SymbolTable
 */
async function parseApexFile(
  filePath,
  namespace,
  className,
  CompilerService,
  ApexSymbolCollectorListener,
) {
  const content = readFileSync(filePath, 'utf8');
  const listener = new ApexSymbolCollectorListener();
  const compiler = new CompilerService(namespace);

  // Import createApexLibUri to use official URI format
  const { createApexLibUri } = await import('../out/types/ProtocolHandler.js');
  const fileUri = createApexLibUri(`${namespace}/${className}.cls`);

  const result = compiler.compile(content, fileUri, listener, {
    projectNamespace: namespace,
    includeComments: false,
  });

  return result;
}

/**
 * Generate type registry entries from compiled symbol tables
 */
function generateTypeRegistryEntries(namespaceData) {
  const entries = [];

  for (const ns of namespaceData) {
    for (const [fileUri, symbolTable] of ns.symbolTables) {
      // Extract namespace and class name from file URI
      const match = fileUri.match(
        /apexlib:\/\/resources\/StandardApexLibrary\/([^/]+)\/([^/]+)\.cls$/,
      );
      if (!match) {
        console.warn(`[WARN] Skipping file with unmatched URI: ${fileUri}`);
        continue;
      }

      const [, namespace, className] = match;
      const allSymbols = symbolTable.getAllSymbols();

      // Find top-level types only (parentId === 'null' or null)
      for (const symbol of allSymbols) {
        const isTopLevel =
          symbol.parentId === null || symbol.parentId === 'null';
        const kindLower =
          typeof symbol.kind === 'string'
            ? symbol.kind.toLowerCase()
            : String(symbol.kind).toLowerCase();
        const isTypeSymbol =
          kindLower === 'class' ||
          kindLower === 'interface' ||
          kindLower === 'enum';

        if (isTopLevel && isTypeSymbol) {
          const symbolName =
            symbol.name && symbol.name !== 'unknownClass'
              ? symbol.name
              : className;

          if (!symbolName) {
            console.warn(
              `[WARN] Skipping symbol with empty name in ${fileUri}`,
            );
            continue;
          }

          const fqn = `${namespace}.${symbolName}`.toLowerCase();

          entries.push({
            fqn,
            name: symbolName,
            namespace,
            kind: kindLower,
            symbolId: symbol.id,
            fileUri,
            isStdlib: true,
          });
        }
      }
    }
  }

  return entries;
}

/**
 * Main function
 */
async function main() {
  const startTime = Date.now();
  const forceRegenerate = process.argv.includes('--force');

  console.log('=== Standard Library Binary Cache Generator ===');
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Calculate source checksum
  console.log('\n1. Calculating source checksum...');
  const sourceChecksum = calculateSourceChecksum(SOURCE_DIR, BUILTINS_DIR);
  console.log(`   Checksum: ${sourceChecksum.substring(0, 16)}...`);

  // Check if regeneration is needed
  if (
    !forceRegenerate &&
    existsSync(BINARY_CHECKSUM_FILE) &&
    existsSync(BINARY_CACHE_FILE)
  ) {
    const existingChecksum = readFileSync(BINARY_CHECKSUM_FILE, 'utf8').trim();
    if (existingChecksum === sourceChecksum) {
      console.log('\n✅ Binary cache is up-to-date, skipping regeneration');
      console.log(`   Use --force to regenerate anyway`);
      return;
    }
    console.log('   Checksum changed, regenerating binary cache...');
  }

  // Import compiled modules
  console.log('\n2. Loading compiler modules...');
  let CompilerService, ApexSymbolCollectorListener, BinarySerializer;

  try {
    const parserModule = await import('../out/parser/compilerService.js');
    CompilerService = parserModule.CompilerService;

    const listenerModule = await import(
      '../out/parser/listeners/ApexSymbolCollectorListener.js'
    );
    ApexSymbolCollectorListener = listenerModule.ApexSymbolCollectorListener;

    const serializerModule = await import('../out/cache/binary-serializer.js');
    BinarySerializer = serializerModule.BinarySerializer;
  } catch (error) {
    console.error('❌ Failed to load modules. Run "npm run compile" first.');
    console.error('   Error:', error.message);
    process.exit(1);
  }

  // Find all classes
  console.log('\n3. Finding Apex classes...');
  const namespaceMap = findAllClasses(SOURCE_DIR, BUILTINS_DIR);
  let totalClasses = 0;
  for (const files of namespaceMap.values()) {
    totalClasses += files.length;
  }
  console.log(
    `   Found ${totalClasses} classes across ${namespaceMap.size} namespaces`,
  );

  // Parse all classes
  console.log('\n4. Parsing classes...');
  const namespaceData = [];
  let parsedCount = 0;

  for (const [namespace, files] of namespaceMap) {
    const symbolTables = new Map();

    for (const file of files) {
      try {
        const result = await parseApexFile(
          file.path,
          file.namespace,
          file.className,
          CompilerService,
          ApexSymbolCollectorListener,
        );

        if (result.result) {
          const { createApexLibUri } = await import(
            '../out/types/ProtocolHandler.js'
          );
          const fileUri = createApexLibUri(
            `${file.namespace}/${file.className}.cls`,
          );

          // Workaround: Fix class symbol name if it's "unknownClass"
          const symbolTable = result.result;
          const allSymbols = symbolTable.getAllSymbols();
          for (const symbol of allSymbols) {
            if (
              symbol.kind === 'class' &&
              symbol.name === 'unknownClass' &&
              (file.className === 'List' ||
                file.className === 'Map' ||
                file.className === 'Set')
            ) {
              symbol.name = file.className;
              if (symbol.fqn) {
                symbol.fqn = symbol.fqn.replace(
                  /\.unknownclass$/i,
                  `.${file.className}`,
                );
              }
            }
          }

          symbolTables.set(fileUri, result.result);
          parsedCount++;

          // Progress indicator
          if (parsedCount % 500 === 0) {
            console.log(`   Parsed ${parsedCount}/${totalClasses} classes...`);
          }
        } else {
          console.error(`❌ FATAL: Parser returned null result for ${file.path}`);
          throw new Error(
            `Build failed: Parser returned null result for ${file.path}.`,
          );
        }
      } catch (error) {
        console.error(`❌ FATAL: Exception parsing ${file.path}`);
        console.error(`   Error: ${error.message}`);
        throw new Error(
          `Build failed: Cannot generate binary cache due to parser exception in ${file.path}.`,
        );
      }
    }

    if (symbolTables.size > 0) {
      namespaceData.push({
        name: namespace,
        symbolTables,
      });
    }
  }

  console.log(`   Parsed ${parsedCount} classes successfully`);

  // Collect all symbol tables into a single map
  console.log('\n5. Collecting symbol tables...');
  const allSymbolTables = new Map();
  for (const ns of namespaceData) {
    for (const [fileUri, symbolTable] of ns.symbolTables) {
      allSymbolTables.set(fileUri, symbolTable);
    }
  }
  console.log(`   Collected ${allSymbolTables.size} symbol tables`);

  // Generate type registry entries
  console.log('\n6. Generating type registry entries...');
  const typeRegistryEntries = generateTypeRegistryEntries(namespaceData);
  console.log(`   Generated ${typeRegistryEntries.length} type registry entries`);

  // Serialize to binary format
  console.log('\n7. Serializing to binary format...');
  const serializer = new BinarySerializer();
  const result = serializer.serialize({
    symbolTables: allSymbolTables,
    typeRegistryEntries,
    sourceChecksum,
  });

  console.log(`   Uncompressed size: ${(result.buffer.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Symbol count: ${result.stats.symbolCount}`);
  console.log(`   Type entry count: ${result.stats.typeEntryCount}`);
  console.log(`   String table size: ${(result.stats.stringTableSize / 1024).toFixed(2)} KB`);

  // Gzip the binary data
  console.log('\n8. Compressing with gzip...');
  const compressedData = gzipSync(result.buffer, { level: 9 });
  const compressionRatio = (
    (1 - compressedData.length / result.buffer.length) *
    100
  ).toFixed(1);
  console.log(
    `   Compressed size: ${(compressedData.length / 1024 / 1024).toFixed(2)} MB (${compressionRatio}% reduction)`,
  );

  // Write output files
  console.log('\n9. Writing output files...');
  writeFileSync(BINARY_CACHE_FILE, compressedData);
  writeFileSync(BINARY_CHECKSUM_FILE, sourceChecksum);
  console.log(`   ✅ ${BINARY_CACHE_FILE}`);
  console.log(`   ✅ ${BINARY_CHECKSUM_FILE}`);

  // Generate MD5 checksums
  console.log('\n10. Generating MD5 checksums...');
  const binaryFileMD5 = createHash('md5').update(compressedData).digest('hex');
  const BINARY_MD5_FILE = join(OUTPUT_DIR, 'apex-stdlib.bin.gz.md5');
  writeFileSync(BINARY_MD5_FILE, `${binaryFileMD5}  apex-stdlib.bin.gz\n`);
  console.log(`   ✅ ${BINARY_MD5_FILE}`);

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Binary Cache Generation Complete ===');
  console.log(`   Total time: ${elapsed}s`);
  console.log(`   Classes processed: ${parsedCount}`);
  console.log(`   Symbols: ${result.stats.symbolCount}`);
  console.log(`   Types: ${result.stats.typeEntryCount}`);
  console.log(`   Files: ${result.stats.fileCount}`);
  console.log(`   Compressed size: ${(compressedData.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Source checksum (SHA256): ${sourceChecksum}`);
  console.log(`   Binary MD5: ${binaryFileMD5}`);
}

main().catch((error) => {
  console.error('❌ Binary cache generation failed:', error);
  process.exit(1);
});
