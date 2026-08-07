# Migrating API Stub Generation to apex-jorje-lsp

## Overview

The new API-based stub generator in `apex-ls-others` can replace the bytecode.xml-based generator for `apex-jorje-lsp`. This document outlines the changes needed to adopt the new approach.

## Key Differences Between Repos

### apex-ls-others (this repo)
- **TypeScript/Node.js** ecosystem
- **Tests** verify stub compilation and symbol resolution
- **Protobuf cache** (apex-stdlib.pb.gz) for language server performance
- **Hand-crafted builtins**: 14 classes skipped during generation

### apex-jorje-lsp
- **Java/Maven** ecosystem
- **Post-generation scripts** (Python) handle jorje-specific requirements
- **Runtime patching** for DML keywords and built-in types
- **Manual overrides** in System.cls for assert methods

## Changes Needed in apex-jorje-lsp

### 1. Update README.md

Replace the "Updating Latest versions" section with:

```markdown
### Prerequisites

- The **Apex API Stub Generator** lives at `packages/apex-parser-ast/scripts/` in the [apex-language-support](https://github.com/forcedotcom/apex-language-support) repo.
- Node.js 20+ is required to run it.
- Access to a Salesforce org (org alias required for `sf api request rest`)

### Steps

1. **Fetch stubs from Salesforce API** (in apex-language-support repo):
   ```bash
   cd packages/apex-parser-ast
   npm install
   npm run fetch:api-stubs -- --org <your-org-alias> --category BUILTIN
   npm run generate:api-stubs
   ```
   The generator writes `.cls` stubs to `src/resources/StandardApexLibrary/System/`.

2. **Copy the generated stubs** into this repo:
   ```bash
   # From apex-language-support root
   cp -r packages/apex-parser-ast/src/resources/StandardApexLibrary/* \
         ~/git/apex-jorje/apex-jorje-lsp/src/main/resources/StandardApexLibrary/
   ```

3. **Run the post-generation preparation script**:
   ```bash
   bash apex-jorje-lsp/scripts/post_generate_stubs.sh
   ```
   This script handles (in order):
   - Syncing `Configuration.VERSION` from the root POM
   - Removing stub files that collide with Apex built-in types (e.g. `System/String.cls`)
   - Stripping reserved-keyword DML method names from `System/Database.cls`
   - Syncing `Namespaces.java` with the directories on disk
   - Verifying all of the above

4. **Restore manual overloads** in `System/System.cls` that the generator does not produce:
   ```apex
   global static void assert(Boolean condition) {}
   global static void assertEquals(Object expected, Object actual) {}
   global static void assertNotEquals(Object expected, Object actual) {}
   ```

5. **Build and test**:
   ```bash
   mvn clean compile
   mvn test
   ```
```

### 2. Update remove_builtin_collision_stubs.py

The script currently removes 14 types. With the W-23491682 workaround, the API generator already skips most of these. Update the BUILTIN_NAMES set to match what jorje actually needs to remove:

```python
# Matches BuiltInTypes.BUILT_IN_TYPES in:
# apex-jorje-lsp/src/main/java/apex/jorje/lsp/impl/completions/BuiltInTypes.java
#
# NOTE: Most of these are already skipped by the apex-ls-others generator
# (see generate-api-stubs.mjs BUILTIN_CLASSES), but we keep the full list here
# for safety in case stubs are copied from other sources.
BUILTIN_NAMES = {
    "Blob", "Boolean", "Datetime", "Decimal", "Double",
    "Id", "Integer", "List", "Long", "Map", "Object", "SObject", "Set", "String",
    # Additional types that may need removal:
    "Currency", "Void",
}
```

### 3. Add Exception Handling to remove_builtin_collision_stubs.py

The API can return types with issues (e.g., `Exception extends Exception`). Add Exception to the removal list:

```python
BUILTIN_NAMES = {
    "Blob", "Boolean", "Datetime", "Decimal", "Double",
    "Id", "Integer", "List", "Long", "Map", "Object", "SObject", "Set", "String",
    "Currency", "Void",
    "Exception",  # W-23491682: API returns circular inheritance
}
```

**OR** better yet, adopt the hand-crafted Exception.cls from apex-ls-others:

```bash
# After copying stubs, also copy the hand-crafted Exception:
cp ~/git/apex-ls-others/packages/apex-parser-ast/src/resources/StandardApexLibrary/System/Exception.cls \
   ~/git/apex-jorje/apex-jorje-lsp/src/main/resources/StandardApexLibrary/System/
```

### 4. Update verify_stubs.py

Add Exception to the builtin check:

```python
BUILTIN_NAMES = {
    "Blob", "Boolean", "Datetime", "Decimal", "Double",
    "Id", "Integer", "List", "Long", "Map", "Object", "SObject", "Set", "String",
    "Currency", "Void", "Exception",
}
```

### 5. Consider: Generic Type Parameter Handling

The W-23491682 workaround in apex-ls-others strips generic parameters from filenames:
- API returns: `List<T>`, `Map<K,V>`, `Set<T>`
- Generator creates: `List.cls`, `Map.cls`, `Set.cls`
- Class declarations: `global class List<T>` (Apex doesn't support this syntax)

**For jorje:** Since `remove_builtin_collision_stubs.py` deletes these anyway, this is not an issue. The hand-crafted versions in apex-ls-others (without generics) should be copied over if needed.

### 6. Handle URL vs Url Casing

The API returns "Url" but hand-crafted stubs use "URL". Options:

**Option A (Recommended):** Copy the hand-crafted URL.cls from apex-ls-others:
```bash
cp ~/git/apex-ls-others/packages/apex-parser-ast/src/resources/StandardApexLibrary/System/URL.cls \
   ~/git/apex-jorje/apex-jorje-lsp/src/main/resources/StandardApexLibrary/System/
```

**Option B:** Add URL to BUILTIN_NAMES and provide your own hand-crafted version in jorje.

### 7. Handle String.cls toString() Method

The API-generated String.cls includes a `toString()` method which may interfere with inheritance resolution. Options:

**Option A (Recommended):** Copy the hand-crafted String.cls from apex-ls-others (already skipped in generator).

**Option B:** Add post-processing to remove the toString() method from String.cls:
```python
# In remove_dml_reserved_methods.py or a new script
STRING_TOSTRING = re.compile(r'^\s+global\s+String\s+toString\s*\(\s*\)')
```

## Migration Checklist

- [ ] Update apex-jorje-lsp/README.md with new instructions
- [ ] Test fetch and generate scripts work with your Salesforce org
- [ ] Copy generated stubs from apex-ls-others to apex-jorje-lsp
- [ ] Run `post_generate_stubs.sh` and verify all checks pass
- [ ] Manually restore System.cls assert methods
- [ ] Copy hand-crafted builtins (Exception, URL, String) if needed
- [ ] Build and test jorje: `mvn clean compile && mvn test`
- [ ] Verify in VS Code that new classes/methods appear
- [ ] Document any jorje-specific customizations in README

## Benefits of API-Based Generation

1. **No bytecode.xml dependency** - Use any Salesforce org
2. **Faster updates** - No need to wait for internal XML exports
3. **Namespace discovery** - Automatically detects all namespaces
4. **Version control** - API version parameter for reproducibility
5. **W-23491682 workaround** - Handles generic type names correctly
6. **Extensible** - Easy to add custom post-processing

## Known Issues and Workarounds

### W-23491682: Generic Type Names
- **Issue:** API returns `List<T>`, `Map<K,V>`, `Set<T>` with generic parameters
- **Workaround:** Generator strips generics from filenames, produces `List.cls`
- **Jorje Impact:** These are deleted by `remove_builtin_collision_stubs.py` anyway

### Circular Inheritance
- **Issue:** API returns `Exception extends Exception`
- **Workaround:** Add Exception to BUILTIN_NAMES or use hand-crafted version

### toString() in String.cls
- **Issue:** API-generated String.cls has toString() which may break inheritance
- **Workaround:** Use hand-crafted String.cls from apex-ls-others

### URL vs Url Casing
- **Issue:** API returns "Url" but existing stubs use "URL"
- **Workaround:** Copy hand-crafted URL.cls (macOS case-insensitive FS issue)

## Testing Recommendations

After migrating, verify:

1. **Jorje tests pass:** `mvn test`
2. **Symbol resolution works:** Test in VS Code with apex-ls
3. **Namespace sync:** Run `verify_stubs.py` to ensure Namespaces.java is correct
4. **Built-in types:** Verify completions for System.*, ConnectApi.*, etc.
5. **DML methods:** Ensure delete/insert/update work (runtime patching)
6. **Assert methods:** Verify System.assert* methods have correct signatures

## Future Improvements

1. **Automate copy step:** Script to sync stubs from apex-ls-others to jorje
2. **CI integration:** Run stub verification in jorje CI
3. **Version tracking:** Document which API version stubs came from
4. **Delta updates:** Only copy changed files instead of full directory
