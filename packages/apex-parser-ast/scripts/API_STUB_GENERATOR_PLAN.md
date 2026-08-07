# API-Based Apex Stub Generator - Implementation Plan

## Context

**Work Item:** W-23631682 - Migrate Apex stub generator to use new API stub generator

The new Apex Symbol Table API is available to replace the current web scraper-based documentation generator. This is a net-new implementation with a timeline of a few months.

### Current System Overview

The current system generates Apex stubs from scraped `.cls` files in `src/resources/StandardApexLibrary/`:
- **~5,500 classes** across 54+ namespaces (System, ConnectApi, Database, etc.)
- **Hand-crafted overrides** in `src/resources/builtins/` for special cases (Blob, Integer, RestContext, etc.)
- **Build pipeline** parses all `.cls` files → Symbol Tables → Protobuf cache
- **Outputs:**
  - `apex-stdlib.pb.gz` - Main symbol table cache (~3MB compressed)
  - `apex-type-registry.pb.gz` - Type index for lookups
  - `apex-fqn-index.pb.gz` - FQN resolution index
  - SHA256 and MD5 checksums for all files

### New API Overview

**Endpoint:** `/services/data/v<version>/tooling/symbols`

**Query Parameters:**
- `category` (required) - type category filter
- `namespace` (optional) - namespace filter (empty string = default namespace, omitted = all)
- `name` (optional) - specific type name

**Authentication:** via `sf api request rest` command

**Output Format:** JSON with `typeStubs` array (Type Stub Format)

**Target Coverage:** ~54 namespaces (fixed list, excluding ConnectApi)
- Fixed set based on existing StandardApexLibrary namespaces
- Avoids unbounded bundle growth
- ConnectApi excluded due to large size and frequent changes

**Upstream Blocker Status:** W-23491682 (List/Set/Map handling) is in "Ready for Review" - effectively unblocking

## Architecture Design

### Module Location

**Location:** `packages/apex-parser-ast/scripts/`

New files to create:
- `fetch-api-stubs.mjs` - API client to fetch stub JSON from Salesforce
- `generate-api-stubs.mjs` - Convert API JSON to Apex source using adapted StubFromJson library
- `apexStubGenerator.js` - Port of StubFromJson library (pure vanilla JS)

### Data Flow

```
1. Fetch Phase (fetch-api-stubs.mjs)
   └─> sf api request rest /services/data/v<version>/tooling/symbols
   └─> Save raw JSON responses by namespace
   └─> Output: src/resources/ApiStubs/*.json

2. Generation Phase (generate-api-stubs.mjs)
   └─> Load JSON files from ApiStubs/
   └─> Use apexStubGenerator.js to convert JSON → Apex source
   └─> Output: src/resources/StandardApexLibrary/<namespace>/*.cls

3. Build Phase (generate-stdlib-cache.mjs) [EXISTING]
   └─> Parse all .cls files
   └─> Generate protobuf cache files
   └─> Output: resources/*.pb.gz
```

### Key Components

#### 1. API Client (`fetch-api-stubs.mjs`)

**Responsibilities:**
- Call `sf api request rest` with proper authentication
- Fetch fixed set of TARGET_NAMESPACES (~54 namespaces)
- Save raw JSON responses organized by namespace
- Generate checksums for fetched data

**Key Functions:**
```javascript
async function fetchSymbols(category, namespace, name) {
  // Execute: sf api request rest /services/data/v<version>/tooling/symbols?category=X&namespace=Y
  // Parse response JSON
  // Return typeStubs array
}

async function fetchAllStubs(orgAlias) {
  // Iterate over TARGET_NAMESPACES list
  // Fetch each namespace from API
  // Save to src/resources/ApiStubs/
}
```

**TARGET_NAMESPACES:** Fixed list of ~54 namespaces based on existing StandardApexLibrary directories (excluding ConnectApi)

#### 2. Stub Generator (`generate-api-stubs.mjs`)

**Responsibilities:**
- Load JSON files from ApiStubs/
- Convert using apexStubGenerator.js
- Write .cls files to StandardApexLibrary/
- Preserve hand-crafted builtins (skip overwriting those in BUILTIN_CLASSES set)
- Generate metadata about what was generated

**Key Functions:**
```javascript
import { generateApexStubs } from './apexStubGenerator.js';

async function generateFromApiStubs() {
  // Load all JSON files from ApiStubs/
  // For each namespace:
  //   - Call generateApexStubs(jsonData)
  //   - Write .cls files to StandardApexLibrary/<namespace>/
  //   - Skip files in BUILTIN_CLASSES set
  // Generate summary metadata
}
```

#### 3. Stub Converter (`apexStubGenerator.js`)

**Source:** Port from https://git.soma.salesforce.com/a-subramanian/StubFromJson

**Features to preserve:**
- Name demangling (`$$l` → `<`, `$$r` → `>`, `$$c` → `,`)
- Constructor handling (`<init>` → class name)
- Proper return values (void, primitives, null)
- Annotation support (string and object formats)
- Trigger generation with handler classes
- Inner types/nested classes
- Abstract class handling
- Property getter/setter generation

**No modifications needed** - this is pure vanilla JavaScript that works in Node.js

### Post-Generation Processing

The existing `generate-stdlib-cache.mjs` script handles all post-generation:

1. **Parse all .cls files** (StandardApexLibrary/ + builtins/)
2. **Generate Symbol Tables** using CompilerService + ApexSymbolCollectorListener
3. **Serialize to Protobuf** with StandardLibrarySerializer
4. **Generate indices:**
   - Type Registry (TypeRegistry) - all types by FQN
   - FQN Index (FqnIndex) - unqualified → qualified resolution
5. **Compress with gzip** (level 9)
6. **Generate checksums** (SHA256 for source, MD5 for outputs)
7. **Output files:**
   - `resources/apex-stdlib.pb.gz`
   - `resources/apex-type-registry.pb.gz`
   - `resources/apex-fqn-index.pb.gz`
   - `resources/apex-stdlib.sha256`
   - `resources/*.md5` files

**No changes needed** to post-generation - it automatically picks up any .cls files in StandardApexLibrary/

## Integration with Build Pipeline

### Current wireit dependencies:

```
precompile → compile:tsc → generate:stdlib-cache → compile
```

### New wireit tasks to add:

```json
{
  "fetch:api-stubs": {
    "command": "node scripts/fetch-api-stubs.mjs",
    "output": ["src/resources/ApiStubs/**/*.json"],
    "files": ["scripts/fetch-api-stubs.mjs"]
  },
  "generate:api-stubs": {
    "command": "node scripts/generate-api-stubs.mjs",
    "dependencies": ["fetch:api-stubs"],
    "output": ["src/resources/StandardApexLibrary/**/*.cls"],
    "files": [
      "scripts/generate-api-stubs.mjs",
      "scripts/apexStubGenerator.js",
      "src/resources/ApiStubs/**/*.json"
    ]
  }
}
```

### Updated pipeline:

```
fetch:api-stubs → generate:api-stubs → precompile → compile:tsc → generate:stdlib-cache → compile
```

**Note:** These new tasks are optional - can be run manually when updating stubs, not on every build.

## Bundle Size Considerations

**Current:** ~3MB compressed stdlib cache  
**Expected:** ~12MB with 4x coverage increase (needs optimization later)

### Deferred optimizations:
1. Selective loading by namespace
2. Incremental cache updates
3. Tree-shaking unused namespaces
4. Alternative compression (Brotli, LZMA)

**Decision:** Implement basic generation first; optimize bundle size after working implementation

## Handling Special Cases

### Builtin Classes

The existing system has hand-crafted overrides in `src/resources/builtins/`:
- `Blob.cls`, `Integer.cls`, `Long.cls`, `Object.cls`
- `Continuation.cls`, `RestContext.cls`, `RestResponse.cls`
- `DMLOptions.cls` (Database namespace)
- `DescribeSObjectResult.cls` (Schema namespace)

**Strategy:** 
- API stubs generator **skips** files in `BUILTIN_CLASSES` set
- Hand-crafted versions in `builtins/` take precedence
- If API returns better data later, can remove from builtins and regenerate

### List/Set/Map Types

**Issue:** Currently returned as `List<T>`, `Set<T>`, `Map<T>` (W-23491682)

**Status:** Fix is in "Ready for Review"

**Handling:** 
- The StubFromJson library already handles generic type demangling
- Will automatically work once API fix is deployed
- Can proceed with implementation now

## Verification Strategy

### Unit Tests
1. Test `apexStubGenerator.js` with sample API JSON
2. Test name demangling edge cases
3. Test constructor conversion
4. Test annotation handling

### Integration Tests
1. Fetch small subset from API (e.g., System.String)
2. Generate .cls file
3. Verify it compiles successfully
4. Compare symbol table with expected

### End-to-End Test
1. Generate full stdlib from API
2. Run `generate:stdlib-cache`
3. Verify protobuf cache loads
4. Spot-check known classes (System.String, Database.QueryLocator, etc.)
5. Run existing test suite

### Performance Benchmarks
1. Time to fetch all stubs from API
2. Time to generate all .cls files
3. Compare cache generation time vs. current
4. Measure bundle size increase

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Port `apexStubGenerator.js` from StubFromJson repo
- [ ] Write unit tests for stub generator
- [ ] Create `fetch-api-stubs.mjs` skeleton
- [ ] Test `sf api request rest` authentication

### Phase 2: API Client (Week 3-4)
- [ ] Implement category/namespace discovery
- [ ] Implement batch fetching with retries
- [ ] Save JSON to ApiStubs/ directory
- [ ] Generate fetch metadata (timestamp, counts, checksums)

### Phase 3: Generation (Week 5-6)
- [ ] Implement `generate-api-stubs.mjs`
- [ ] Load JSON and call apexStubGenerator
- [ ] Write .cls files to StandardApexLibrary/
- [ ] Integrate with builtin override logic
- [ ] Test with small subset

### Phase 4: Integration & Testing (Week 7-8)
- [ ] Add wireit tasks to package.json
- [ ] Generate full stdlib from API
- [ ] Run existing test suite
- [ ] Compare coverage vs. current system
- [ ] Document any discrepancies

### Phase 5: Documentation & Handoff (Week 9-10)
- [ ] Write README for new scripts
- [ ] Document API authentication setup
- [ ] Create runbook for updating stubs
- [ ] Bundle size analysis report
- [ ] Knowledge transfer

## Future Enhancements (Deferred)

1. **Incremental updates** - Only fetch changed types
2. **Namespace filtering** - Generate only needed namespaces
3. **Bundle optimization** - Reduce 12MB cache size
4. **Automated refresh** - CI job to detect API updates
5. **Diff reporting** - Show what changed between generations
6. **Custom type merging** - Blend API stubs + custom docs

## Open Questions

1. **API versioning** - Which API version to use? Latest? Specific version?
2. **Org selection** - Which org to fetch from? (264 farm mentioned in WI)
3. **Update frequency** - How often to regenerate? On every build? Weekly?
4. **Backward compatibility** - Support both scraped and API stubs during transition?
5. **Error handling** - What if API is unavailable? Fall back to cached JSON?

## Success Criteria

- [ ] Can fetch all ~8,345 types from API
- [ ] Generated .cls files compile successfully
- [ ] Protobuf cache generates without errors
- [ ] Existing test suite passes
- [ ] Documentation covers setup and usage
- [ ] Performance is acceptable (<10 min for full generation)
- [ ] Bundle size increase is documented and acceptable

## References

- **StubFromJson repo:** https://git.soma.salesforce.com/a-subramanian/StubFromJson
- **Type Stub Format docs:** https://falcon.devhub.internal.salesforce.com/aihub/code-search/...
- **Slack discussion:** https://salesforce-internal.slack.com/archives/C0ABYE180M6/p1784660116039269
- **Current generator:** `packages/apex-parser-ast/scripts/generate-stdlib-cache.mjs`
- **Upstream blocker:** W-23491682 (Ready for Review)
