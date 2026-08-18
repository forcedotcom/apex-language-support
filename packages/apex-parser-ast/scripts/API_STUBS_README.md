# API-Based Apex Stub Generation

This directory contains scripts for generating Apex standard library stubs from the Salesforce Symbol Table API.

## Overview

This is the sole supported stub-generation process. It uses direct API calls to fetch type definitions:

1. **fetch-api-stubs.mjs** - Fetches stub JSON from `/services/data/latest/tooling/symbols` by default
2. **generate-api-stubs.mjs** - Converts JSON to `.cls` files using apexStubGenerator.js
3. **apexStubGenerator.js** - Pure vanilla JS library for JSON → Apex conversion
4. **generate-stdlib-cache.mjs** - (Existing) Parses `.cls` files → Protobuf cache

## Quick Start

### Prerequisites

1. Authenticated Salesforce org with alias (e.g., `gus`)
2. Org must have the Symbol Table API available (264 org farm or later)

```bash
# Login to org if needed
sf org login web -a gus
```

### Fetch Stubs from API

```bash
# Fetch all namespaces from default org (gus)
npm run fetch:api-stubs

# Fetch from specific org
npm run fetch:api-stubs -- --org myorg

# Fetch specific namespace only
npm run fetch:api-stubs -- --namespace System

# Use specific API version
npm run fetch:api-stubs -- --api-version v68.0
```

**Output:** `build/api-stubs/*.json` - One JSON file per namespace

### Generate .cls Files

```bash
# Generate Apex source files from fetched JSON
npm run generate:api-stubs

# Fetch and generate in one command
npm run update:stubs
```

**Output:** `src/resources/StandardApexLibrary/<namespace>/*.cls`

**Note:** Hand-crafted builtins in `src/resources/builtins/` are automatically preserved (not overwritten).

### Generate Protobuf Cache

```bash
# Standard build process (existing workflow)
npm run compile
```

This runs the full pipeline:
1. Parses all `.cls` files
2. Generates symbol tables
3. Serializes to protobuf
4. Compresses with gzip
5. Generates type registry and FQN index

**Output:**
- `resources/apex-stdlib.pb.gz`
- `resources/apex-type-registry.pb.gz`
- `resources/apex-fqn-index.pb.gz`
- Checksums (SHA256, MD5)

## Complete Workflow

```bash
# Full regeneration from API
npm run update:stubs
npm run compile

# Run tests to verify
npm test
```

## File Structure

```
packages/apex-parser-ast/
├── scripts/
│   ├── fetch-api-stubs.mjs          # API client
│   ├── generate-api-stubs.mjs       # Stub generator orchestrator
│   ├── apexStubGenerator.js         # JSON → Apex converter
│   ├── generate-stdlib-cache.mjs    # (Existing) .cls → Protobuf
├── build/api-stubs/                 # Fetched JSON (gitignored)
│   ├── System.json
│   ├── Database.json
│   └── fetch-metadata.json
├── src/resources/
│   ├── StandardApexLibrary/         # Generated .cls files
│   │   ├── System/
│   │   └── Database/
│   └── builtins/                    # Hand-crafted overrides
│       ├── Blob.cls
│       ├── Integer.cls
│       └── RestContext.cls
└── resources/                       # Build artifacts
    ├── apex-stdlib.pb.gz
    ├── apex-type-registry.pb.gz
    └── apex-fqn-index.pb.gz
```

## API Details

### Endpoint

```
/services/data/v<version>/tooling/symbols
```

### Query Parameters

- `category` (required) - Type category: `CLASS`, `INTERFACE`, `ENUM`, `TRIGGER`
- `namespace` (optional) - Namespace filter (empty string = default namespace, omitted = all)
- `name` (optional) - Specific type name

### Response Format

```json
{
  "typeStubs": [
    {
      "name": "String",
      "kind": "CLASS",
      "modifiers": ["global"],
      "namespace": "System",
      "fields": [...],
      "properties": [...],
      "methods": [...]
    }
  ]
}
```

See [Type Stub Format](https://falcon.devhub.internal.salesforce.com/aihub/code-search/gitcore.soma.salesforce.com/core-2206/core-264-public@p4/264-main-56da6465926a1216cf050bdcdb2cf9ac610cb56d/-/blob/core/apex-metadata-catalog-api/java/resources/TypeStubFormat.md) for full schema.

## Builtin Classes

Certain classes are hand-crafted in `src/resources/builtins/` and **should not be overwritten**:

### System Namespace
- `Blob.cls` - Methods not fully covered in docs
- `Integer.cls` - Conversion methods not in docs
- `Long.cls` - Conversion methods not in docs
- `Object.cls` - equals(), hashCode(), toString()
- `Continuation.cls` - PascalCase fields
- `RestContext.cls` - Static request/response fields
- `RestResponse.cls` - statusCode casing

### Other Namespaces
- `Database/DMLOptions.cls` - PascalCase fields, inner class structure
- `Schema/DescribeSObjectResult.cls` - Correct Map/List return types

The generation script automatically skips these files.

## Name Demangling

The API returns generic type information in mangled form. The stub generator automatically handles:

| Encoded | Decoded |
|---------|---------|
| `$$l` | `<` |
| `$$r` | `>` |
| `$$c` | `, ` |

**Example:**
```
Mangled:  translateToSObjects_rList$$lSObject$$r_0String
Demangled: List<SObject> translateToSObjects(String sObjectType)
```

## Coverage

**Current (Web Scraping):** ~2,600 types from 53 namespaces

**API-Based:** ~8,345 types from 136 namespaces (4x increase)

## Troubleshooting

### "sf api request rest command not found"

Ensure Salesforce CLI is installed and up-to-date:
```bash
sf version
sf update
```

### "Authentication failed"

Login to the org:
```bash
sf org login web -a gus
sf org display -o gus
```

### "Protobuf cache validation failed"

The generated `.cls` files may have syntax errors. Check:
```bash
# Test compilation of a specific file
node scripts/test-compile-stubs.js System/String.cls

# Check generation logs
cat build/api-stubs/generation-metadata.json
```

### "Bundle size too large"

The API returns 4x more types than the scraper. Bundle size optimization is deferred to Phase 5. For now:
- The cache compresses well (gzip level 9)
- Runtime performance is not affected
- Selective namespace loading can be added later

## Performance

**Fetch:** ~5-10 minutes for all namespaces (depends on API response time)

**Generate:** ~1-2 minutes to convert JSON → .cls files

**Build:** ~3-5 minutes to compile and generate protobuf cache

**Total:** ~10-15 minutes for full regeneration

## Testing

```bash
# Test stub generator unit
npm test -- apexStubGenerator.test.ts

# Test full stdlib cache generation
npm run compile
npm test

# Performance benchmarks
npm run test:perf
```

## References

- **StubFromJson Library:** https://git.soma.salesforce.com/a-subramanian/StubFromJson
- **Type Stub Format:** [Falcon CodeSearch](https://falcon.devhub.internal.salesforce.com/aihub/code-search/...)
- **Work Item:** W-23631682
- **Upstream Fix:** W-23491682 (List/Set/Map handling)
- **Slack Discussion:** https://salesforce-internal.slack.com/archives/C0ABYE180M6/p1784660116039269

## Future Enhancements

- Incremental updates (only fetch changed types)
- Namespace filtering (generate only needed namespaces)
- Bundle optimization (reduce cache size)
- Automated CI refresh (detect API updates)
- Diff reporting (show changes between generations)
