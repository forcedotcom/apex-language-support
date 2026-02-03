# Test Failure Categorization - Dynamic GlobalTypeRegistry

## Post-Implementation Analysis

**Date**: February 3, 2026
**Status**: 41 / 2,282 tests failing (98.2% passing)

---

## Summary

After implementing dynamic GlobalTypeRegistry and generating .md5 files:

- ✅ **Checksum tests now passing** (3 test suites fixed)
- ❌ **Stdlib type resolution tests failing** (7 test suites, 41 tests)
- **Root cause**: GlobalTypeRegistry not populated with stdlib types in test environment

---

## Failure Category: Standard Library Type Resolution

**Failing Test Suites** (7):

1. `ApexSymbolManager.resolution.test.ts` (~15 tests)
2. `ApexSymbolManager.receiverTypeResolution.test.ts` (~8 tests)
3. `ApexSymbolManager.systemUrlReal.test.ts` (~4 tests)
4. `ApexSymbolManager.chainedMethodParams.test.ts` (~8 tests)
5. `ApexSymbolManager.crossFileResolution.test.ts` (~2 tests)
6. `ApexSymbolManager.getSymbolAtPosition.test.ts` (~2 tests)
7. `ResourceLoaderIntegration.test.ts` (~2 tests)

---

## Test Pattern Analysis

### Pattern 1: Direct Stdlib Type Resolution (6 tests)

**Test Examples:**

- "should resolve hover on standard Apex class qualified name (System)"
- "should resolve hover on standard Apex class qualified name (EncodingUtil)"
- "should resolve hover on builtin type qualified name (String)"
- "should resolve hover on builtin type qualified name (Integer)"

**Test Setup:**

```typescript
beforeAll(async () => {
  await initializeResourceLoaderForTests(); // Loads ZIP + protobuf cache
});

it('should resolve hover on standard Apex class qualified name (System)', async () => {
  const testCode = loadFixtureFile('TestClass.cls'); // User code with System.debug()
  await compileAndAddToManager(testCode, 'file:///test/TestClass.cls');

  const result = await symbolManager.getSymbolAtPosition(
    'file:///test/TestClass.cls',
    { line: 18, character: 8 }, // Position on "System"
    'precise',
  );

  expect(result?.name).toBe('System'); // FAILS - returns undefined
});
```

**What Happens:**

1. ✅ ResourceLoader initialized with ZIP
2. ✅ Protobuf cache loaded (with .md5 validation)
3. ❌ GlobalTypeRegistry NOT populated with stdlib types
4. ✅ User code compiled and added to symbol manager
5. ✅ User types registered to GlobalTypeRegistry dynamically
6. ❌ Stdlib type lookup returns undefined (not in registry)
7. ❌ Test fails

**Why GlobalTypeRegistry Not Populated:**

- `initializeResourceLoaderForTests()` calls `resourceLoader.initialize()`
- `initialize()` calls `tryLoadFromProtobufCache()` which loads symbol tables
- `initialize()` calls `initializeTypeRegistry()` which loads the registry cache
- **But**: The registry cache is loaded separately and needs to be explicitly populated
- The stdlib types from protobuf cache are NOT automatically added to GlobalTypeRegistry
- GlobalTypeRegistry is loaded from `apex-type-registry.pb.gz` (separate file)

---

### Pattern 2: Method Resolution on Stdlib Types (8 tests)

**Test Examples:**

- "should resolve method name in standard Apex class qualified call (System.debug)"
- "should resolve method name in standard Apex class qualified call (EncodingUtil.urlEncode)"
- "should resolve method name on String variable (base64Data.toString())"

**Failure Chain:**

1. Test tries to resolve method call on stdlib type
2. Requires resolving the receiver type first (e.g., System, String)
3. Receiver type lookup in GlobalTypeRegistry returns undefined
4. Cannot resolve method without receiver type
5. Test fails

---

### Pattern 3: Chained Method Calls (12 tests)

**Test Examples:**

- "should resolve URL.getOrgDomainUrl().toExternalForm() chained expression"
- "should resolve first node (URL) in URL.getOrgDomainUrl().toExternalForm()"
- "should resolve middle node (getOrgDomainUrl)"

**Failure Chain:**

1. Test tries to resolve chained call: `URL.getOrgDomainUrl().toExternalForm()`
2. First node: URL (stdlib class) - lookup in GlobalTypeRegistry returns undefined
3. Cannot proceed with chain resolution
4. All nodes in chain fail to resolve
5. Test fails

---

### Pattern 4: Type Declarations (4 tests)

**Test Examples:**

- "should resolve String type declaration when position is on type"
- "should resolve String property type declaration when position is on type"
- "should resolve String field type declaration when position is on type"

**Failure:**

- Type reference (String) not in GlobalTypeRegistry
- Returns undefined
- Test fails

---

### Pattern 5: Inheritance Resolution (3 tests)

**Test Examples:**

- "should resolve method through implicit Object inheritance"
- "should not traverse further when resolving methods on Object class"

**Failure:**

- Requires Object class to be in GlobalTypeRegistry
- Object not in registry
- Inheritance chain breaks
- Test fails

---

## Root Cause Analysis

### The Missing Link: GlobalTypeRegistry Population

**Expected Flow (Production):**

1. Server starts
2. ResourceLoader.initialize() called
3. Protobuf cache loaded from `apex-stdlib.pb.gz`
4. GlobalTypeRegistry loaded from `apex-type-registry.pb.gz`
5. Registry populated with ~3,000 stdlib types
6. Stdlib type resolution works (O(1) via registry)

**Actual Flow (Tests):**

1. Test starts
2. `initializeResourceLoaderForTests()` called
3. ResourceLoader.initialize() called
4. Protobuf cache loaded ✅
5. `initializeTypeRegistry()` called ✅
6. Loads `apex-type-registry.pb.gz` ✅
7. **BUT**: Registry types not accessible to symbol resolution ❌
8. Stdlib type resolution fails ❌

### Why Registry Not Working in Tests

Let me check the `initializeTypeRegistry()` implementation to see if it's actually populating the GlobalTypeRegistry:

**Hypothesis**: The registry is loaded but not provided to the Effect context that symbol resolution uses.

---

## Test Preconditions Summary

### All Failing Tests Share These Preconditions:

1. **Test Setup:**
   - `beforeAll()` calls `initializeResourceLoaderForTests()`
   - Initializes ResourceLoader with StandardApexLibrary.zip
   - Loads protobuf cache (now succeeds with .md5 files)
   - Attempts to load GlobalTypeRegistry

2. **Test Execution:**
   - Compiles user code that references stdlib types
   - Adds user code to ApexSymbolManager
   - User types registered dynamically ✅
   - Attempts to resolve stdlib type references
   - GlobalTypeRegistry lookup returns undefined ❌

3. **Expected Behavior:**
   - Stdlib types should be in GlobalTypeRegistry
   - Stdlib type resolution should work (O(1))
   - Tests should pass

4. **Actual Behavior:**
   - GlobalTypeRegistry empty or not accessible
   - Stdlib type resolution fails
   - Tests fail (correct fail-fast behavior)

---

## Critical Questions to Answer

### Q1: Is GlobalTypeRegistry actually being loaded in tests?

- Does `initializeTypeRegistry()` succeed?
- Is the registry file found and loaded?
- Are types being registered to the Effect service?

### Q2: Is the GlobalTypeRegistry Effect context available during symbol resolution?

- Does `resolveSymbolReferenceToSymbol()` have access to GlobalTypeRegistry?
- Is GlobalTypeRegistryLive provided in the Effect context?
- Are we running the Effect with the correct Layer?

### Q3: Is there a difference between how stdlib types and user types access the registry?

- User types: Registered via `registerUserTypesToGlobalRegistry()` ✅
- Stdlib types: Should be pre-loaded from cache file
- Are both using the same GlobalTypeRegistry instance?

---

## Next Steps

### Investigation Required:

1. **Add debug logging** to `initializeTypeRegistry()` to verify:
   - Registry file is found
   - Registry is loaded successfully
   - Types are being registered
   - Count of types registered

2. **Check Effect context** in symbol resolution:
   - Verify GlobalTypeRegistryLive is provided
   - Verify Effect.runSync uses correct Layer
   - Check if test environment has different Effect context

3. **Compare test vs production** registry loading:
   - How is registry provided in production?
   - How is registry provided in tests?
   - Are they using the same mechanism?

### Potential Issues:

**Issue A: Registry loaded but not accessible**

- Registry loaded in ResourceLoader initialization
- But symbol resolution runs in different Effect context
- GlobalTypeRegistry not provided to that context

**Issue B: Registry types not registered**

- Registry file loaded successfully
- But types not actually registered to the service
- Empty registry

**Issue C: Test-specific registry instance**

- Tests create new ApexSymbolManager instance
- New instance doesn't have access to loaded registry
- Separate registry instances

---

## Recommendation

**Before fixing tests, we need to understand WHY the registry isn't working.**

**Action**: Add debug logging and run a single failing test to trace execution:

1. Log in `initializeTypeRegistry()` - verify loading
2. Log in `GlobalTypeRegistryImpl.registerType()` - verify registration
3. Log in `resolveSymbolReferenceToSymbol()` - verify lookup
4. Run single test with debug logs to trace flow

**Then**: Based on findings, implement appropriate fix:

- If registry not loaded → fix loading
- If registry not accessible → fix Effect context
- If registry instance mismatch → fix singleton/context sharing
