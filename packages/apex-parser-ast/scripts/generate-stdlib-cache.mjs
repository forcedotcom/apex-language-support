#!/usr/bin/env node
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Script to generate the Standard Apex Library protobuf cache.
 * This runs at build time to pre-process all ~5,500 standard library classes.
 *
 * Usage:
 *   npm run generate:stdlib-cache
 *   node scripts/generate-stdlib-cache.mjs [--force]
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
  statSync,
  writeFileSync,
} from 'fs';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'fflate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Configuration
const SOURCE_DIR = join(projectRoot, 'src', 'resources', 'StandardApexLibrary');
const BUILTINS_DIR = join(projectRoot, 'src', 'resources', 'builtins');
const OUTPUT_DIR = join(projectRoot, 'resources');

// Output file names (no version - library is updated manually by external processes)
const CACHE_FILE = join(OUTPUT_DIR, 'apex-stdlib.pb.gz');
const CHECKSUM_FILE = join(OUTPUT_DIR, 'apex-stdlib.sha256');

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
 * @param {string} filePath - Path to the .cls file
 * @param {string} namespace - Namespace for the class
 * @param {string} className - Name of the class (without .cls)
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
  // Use official URI format: apexlib://resources/StandardApexLibrary/{namespace}/{className}.cls
  const fileUri = createApexLibUri(`${namespace}/${className}.cls`);

  const result = compiler.compile(content, fileUri, listener, {
    projectNamespace: namespace,
    includeComments: false,
  });

  return result;
}

/**
 * Generate type registry cache from compiled symbol tables
 */
async function generateTypeRegistry(namespaceData, sourceChecksum) {
  const { TypeRegistry, TypeRegistryEntry, TypeKind } = await import(
    '../out/generated/apex-stdlib.js'
  );

  const entries = [];
  let debuggedFirst = false;

  // Extract type metadata from each symbol table
  for (const ns of namespaceData) {
    for (const [fileUri, symbolTable] of ns.symbolTables) {
      // Extract namespace and class name from file URI
      // Format: apexlib://resources/StandardApexLibrary/{namespace}/{className}.cls
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
          // Workaround: If symbol name is empty or "unknownClass" (parser bug with generic stubs),
          // use the className from the URI
          const symbolName = (symbol.name && symbol.name !== 'unknownClass') ? symbol.name : className;
          
          if (!symbolName) {
            console.warn(`[WARN] Skipping symbol with empty name in ${fileUri}`);
            continue;
          }
          
          const fqn = `${namespace}.${symbolName}`.toLowerCase();

          // Map SymbolKind string to TypeKind enum (case-insensitive)
          let kind = TypeKind.CLASS;
          if (kindLower === 'interface') {
            kind = TypeKind.INTERFACE;
          } else if (kindLower === 'enum') {
            kind = TypeKind.ENUM;
          }

          entries.push(
            TypeRegistryEntry.create({
              fqn,
              name: symbolName,
              namespace,
              kind,
              symbolId: symbol.id,
              fileUri,
              isStdlib: true,
            }),
          );
        }
      }
    }
  }

  const registry = TypeRegistry.create({
    generatedAt: new Date().toISOString(),
    sourceChecksum,
    entries,
  });

  return TypeRegistry.toBinary(registry);
}

/**
 * Main function
 */
async function main() {
  const startTime = Date.now();
  const forceRegenerate = process.argv.includes('--force');

  console.log('=== Standard Library Protobuf Cache Generator ===');
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
  if (!forceRegenerate && existsSync(CHECKSUM_FILE) && existsSync(CACHE_FILE)) {
    const existingChecksum = readFileSync(CHECKSUM_FILE, 'utf8').trim();
    if (existingChecksum === sourceChecksum) {
      console.log('\n✅ Cache is up-to-date, skipping regeneration');
      console.log(`   Use --force to regenerate anyway`);
      return;
    }
    console.log('   Checksum changed, regenerating cache...');
  }

  // Import compiled modules
  console.log('\n2. Loading compiler modules...');
  let CompilerService, ApexSymbolCollectorListener, StandardLibrarySerializer;

  try {
    const parserModule = await import('../out/parser/compilerService.js');
    CompilerService = parserModule.CompilerService;

    const listenerModule = await import(
      '../out/parser/listeners/ApexSymbolCollectorListener.js'
    );
    ApexSymbolCollectorListener = listenerModule.ApexSymbolCollectorListener;

    const serializerModule = await import('../out/cache/stdlib-serializer.js');
    StandardLibrarySerializer = serializerModule.StandardLibrarySerializer;
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
          // Import createApexLibUri to use official URI format
          const { createApexLibUri } = await import('../out/types/ProtocolHandler.js');
          const fileUri = createApexLibUri(`${file.namespace}/${file.className}.cls`);
          
          // Workaround: Fix class symbol name if it's "unknownClass" for List/Map/Set
          // This handles the parser bug where LIST/MAP are lexer keywords
          const symbolTable = result.result;
          const allSymbols = symbolTable.getAllSymbols();
          for (const symbol of allSymbols) {
            if (symbol.kind === 'class' && symbol.name === 'unknownClass' && 
                (file.className === 'List' || file.className === 'Map' || file.className === 'Set')) {
              symbol.name = file.className;
              // Also update the FQN if it exists
              if (symbol.fqn) {
                symbol.fqn = symbol.fqn.replace(/\.unknownclass$/i, `.${file.className}`);
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
          // result.result is null - should never happen as parser always returns SymbolTable
          // This indicates a critical parser failure
          console.error(
            `❌ FATAL: Parser returned null result for ${file.path}`,
          );
          throw new Error(
            `Build failed: Parser returned null result for ${file.path}. ` +
              `This indicates a critical parser bug that must be fixed before release.`,
          );
        }
      } catch (error) {
        // Exception during parsing - fail the build
        console.error(`❌ FATAL: Exception parsing ${file.path}`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        throw new Error(
          `Build failed: Cannot generate cache due to parser exception in ${file.path}. ` +
            `Parser bugs must be fixed before release.`,
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

  // Serialize to protobuf
  console.log('\n5. Serializing to protobuf...');
  const serializer = new StandardLibrarySerializer();
  const binaryData = serializer.serialize(namespaceData, sourceChecksum);
  console.log(
    `   Serialized size: ${(binaryData.length / 1024 / 1024).toFixed(2)} MB`,
  );

  // Gzip the protobuf data
  console.log('\n6. Compressing with gzip...');
  const compressedData = gzipSync(binaryData, { level: 9 });
  const compressionRatio = (
    (1 - compressedData.length / binaryData.length) *
    100
  ).toFixed(1);
  console.log(
    `   Compressed size: ${(compressedData.length / 1024 / 1024).toFixed(2)} MB (${compressionRatio}% reduction)`,
  );

  // Generate type registry
  console.log('\n7. Generating type registry...');
  const registryBinary = await generateTypeRegistry(
    namespaceData,
    sourceChecksum,
  );
  const compressedRegistry = gzipSync(registryBinary, { level: 9 });
  console.log(
    `   Registry size: ${(compressedRegistry.length / 1024).toFixed(2)} KB`,
  );

  // Write output files
  console.log('\n8. Writing output files...');
  const REGISTRY_FILE = join(OUTPUT_DIR, 'apex-type-registry.pb.gz');
  writeFileSync(CACHE_FILE, compressedData);
  writeFileSync(REGISTRY_FILE, compressedRegistry);
  writeFileSync(CHECKSUM_FILE, sourceChecksum);
  console.log(`   ✅ ${CACHE_FILE}`);
  console.log(`   ✅ ${REGISTRY_FILE}`);
  console.log(`   ✅ ${CHECKSUM_FILE}`);

  // Generate MD5 checksums for output files
  console.log('\n9. Generating MD5 checksums...');
  const cacheFileMD5 = createHash('md5').update(compressedData).digest('hex');
  const registryFileMD5 = createHash('md5')
    .update(compressedRegistry)
    .digest('hex');

  // Write MD5 checksum files in standard format: <hash>  <filename>
  const CACHE_MD5_FILE = join(OUTPUT_DIR, 'apex-stdlib.pb.gz.md5');
  const REGISTRY_MD5_FILE = join(OUTPUT_DIR, 'apex-type-registry.pb.gz.md5');
  writeFileSync(CACHE_MD5_FILE, `${cacheFileMD5}  apex-stdlib.pb.gz\n`);
  writeFileSync(
    REGISTRY_MD5_FILE,
    `${registryFileMD5}  apex-type-registry.pb.gz\n`,
  );
  console.log(`   ✅ ${CACHE_MD5_FILE}`);
  console.log(`   ✅ ${REGISTRY_MD5_FILE}`);

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Generation Complete ===');
  console.log(`   Total time: ${elapsed}s`);
  console.log(`   Classes processed: ${parsedCount}`);
  console.log(
    `   Stdlib size: ${(compressedData.length / 1024 / 1024).toFixed(2)} MB`,
  );
  console.log(
    `   Registry size: ${(compressedRegistry.length / 1024).toFixed(2)} KB`,
  );
  console.log(`   Source checksum (SHA256): ${sourceChecksum}`);
  console.log(`   Stdlib MD5: ${cacheFileMD5}`);
  console.log(`   Registry MD5: ${registryFileMD5}`);
}

main().catch((error) => {
  console.error('❌ Generation failed:', error);
  process.exit(1);
});
