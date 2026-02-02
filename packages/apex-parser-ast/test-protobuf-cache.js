// Simple test to diagnose protobuf cache behavior
const { ResourceLoader } = require('./dist/utils/resourceLoader');
const {
  enableConsoleLogging,
  setLogLevel,
} = require('../apex-lsp-shared/dist/logger');

async function testProtobufCache() {
  // Enable logging
  enableConsoleLogging();
  setLogLevel('info');

  console.log('=== Starting Protobuf Cache Test ===\n');

  // Get ResourceLoader instance
  const resourceLoader = ResourceLoader.getInstance({
    preloadStdClasses: true,
  });

  // Initialize to load protobuf cache
  console.log('1. Initializing ResourceLoader...');
  await resourceLoader.initialize();

  console.log('\n2. Checking protobuf cache status...');
  const isProtobufLoaded = resourceLoader.isProtobufCacheLoaded();
  const protobufData = resourceLoader.getProtobufCacheData();
  console.log(`   - Protobuf cache loaded: ${isProtobufLoaded}`);
  console.log(
    `   - Protobuf cache data: ${protobufData ? `${protobufData.symbolTables.size} symbol tables` : 'null'}`,
  );

  if (protobufData) {
    // Show first few URIs
    const uris = Array.from(protobufData.symbolTables.keys()).slice(0, 5);
    console.log(`   - Sample URIs: ${JSON.stringify(uris, null, 2)}`);
  }

  // Test loading a standard library class
  console.log('\n3. Testing loadAndCompileClass("System/String.cls")...');
  const result = await resourceLoader.loadAndCompileClass('System/String.cls');
  console.log(`   - Result: ${result ? 'SUCCESS' : 'NULL'}`);
  if (result) {
    console.log(`   - Path: ${result.path}`);
    console.log(
      `   - Symbol table: ${result.compilationResult.result ? 'present' : 'missing'}`,
    );
  }

  console.log('\n=== Test Complete ===');
}

testProtobufCache().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
