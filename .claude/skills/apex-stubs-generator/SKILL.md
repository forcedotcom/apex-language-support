---
name: apex-stubs-generator
description: Everything about generating, maintaining, and troubleshooting the Apex standard library stubs in StandardApexLibrary. Use when regenerating stubs, debugging casing failures on Linux CI, working on the API generator pipeline, or syncing stubs to jorje.
---

# Apex Stubs Generator

## What stubs are and where they live

`.cls` stub files represent the Apex standard library (namespaces, classes, methods, enums).
They live in two places:

- **This repo**: `packages/apex-parser-ast/src/resources/StandardApexLibrary/`
- **jorje**: `apex-jorje/apex-jorje-lsp/src/main/resources/StandardApexLibrary/`

Both copies must be kept in sync. The authoritative source is this repo's generator pipeline.

## API generation pipeline

The generator lives in `packages/apex-parser-ast/scripts/` and is the sole supported
stub-generation process. It fetches Apex type definitions from the Salesforce Symbol
Table API, then converts the resulting JSON into `.cls` files.

### Running the generator

Prerequisites:

- Authenticate the Salesforce CLI to an org that exposes the Symbol Table API.
- The API is available on a 264 org farm or later.

```bash
cd packages/apex-parser-ast

# Fetch all available type definitions from the default org (gus), then generate stubs.
npm run update:stubs

# Rebuild the protobuf cache after generation.
npm run compile
```

To use another authenticated org, API version, or one namespace:

```bash
npm run fetch:api-stubs -- --org myorg
npm run fetch:api-stubs -- --api-version v68.0
npm run fetch:api-stubs -- --namespace System
npm run generate:api-stubs
```

The pipeline:

1. `fetch-api-stubs.mjs` discovers API namespaces and writes JSON to `build/api-stubs/`.
2. `generate-api-stubs.mjs` validates the captured input, replaces generated output for configured namespaces, and preserves hand-crafted builtins.
3. `generate-stdlib-cache.mjs`, run by `npm run compile`, parses the `.cls` files and writes the protobuf cache.

### Key source files

| File | Purpose |
|------|---------|
| `packages/apex-parser-ast/scripts/fetch-api-stubs.mjs` | Fetches Symbol Table API data |
| `packages/apex-parser-ast/scripts/generate-api-stubs.mjs` | Validates captures and emits `.cls` files |
| `packages/apex-parser-ast/scripts/apexStubGenerator.js` | Converts API JSON to Apex source |
| `packages/apex-parser-ast/scripts/api-stub-config.mjs` | Defines bundled namespaces |
| `packages/apex-parser-ast/scripts/generate-stdlib-cache.mjs` | Builds the protobuf cache |

## Namespace name rules

Namespace names come from the API capture. `TARGET_NAMESPACES` in
`api-stub-config.mjs` defines which namespaces are emitted to
`StandardApexLibrary/`; remaining fetched namespaces remain available to the type registry
without producing bundled `.cls` files.

These names become the output folder names under `StandardApexLibrary/`.

## Visibility rule

Hand-crafted builtins are preserved during generation. The authoritative skip lists are
`BUILTIN_CLASSES` and `BUILTIN_NAMESPACED_CLASSES` in `generate-api-stubs.mjs`.

## macOS case-insensitive filesystem — critical pitfall

macOS has a case-insensitive filesystem. Git's index stores the real committed name, but
`ls` and file reads on macOS silently fold case. This means:

- A committed file `SoapType.cls` and a file on disk named `SOAPType.cls` appear identical locally.
- On Linux CI (case-sensitive), they are different files — causing test failures that **do not
  reproduce on macOS**.

### Rules for working with filenames

1. **Always use `git ls-tree -r HEAD`** to get the true committed names — never trust `ls`.
2. **Renaming for case**: always use a two-step `git mv` through a temp name:
   ```bash
   git mv OldName.cls OldName_tmp.cls
   git mv OldName_tmp.cls NewName.cls
   ```
3. **Auditing mismatches** — find all `.cls` files where committed name ≠ declared class name:
   ```bash
   git ls-tree -r HEAD --name-only "packages/apex-parser-ast/src/resources/StandardApexLibrary/" \
   | while read f; do
     base=$(basename "$f" .cls)
     declared=$(grep -m1 -oP '(?<=global (class|interface|enum) )\S+' "$f" 2>/dev/null)
     [ -n "$declared" ] && [ "$declared" != "$base" ] && echo "MISMATCH: $f -> $declared"
   done
   ```
4. **Auditing directory name mismatches** — compare committed dirs against TOC + overrides:
   use `git ls-tree HEAD --name-only <path>` then compare against `NAMESPACE_NAME_OVERRIDES`
   and the scraped TOC output.

### Source of truth for casing

| Thing | Source of truth |
|-------|----------------|
| `.cls` filename | The `global class/interface/enum NAME` declaration inside the file |
| Namespace folder name | `TARGET_NAMESPACES` and API namespace name |

## Snapshot test

`packages/apex-parser-ast/test/generator/emptyStubDetection.snapshot.test.ts`

Tracks which stubs have no members (empty bodies). Fails when:
- New stubs are added that happen to be empty
- A rename changes the class name captured in the snapshot

Update after intentional changes:
```bash
cd packages/apex-parser-ast
npx jest emptyStubDetection --updateSnapshot
```

**macOS caveat**: `--updateSnapshot` may report "1 passed" instead of "1 updated" when the
local file read returns the wrong casing. Trust what CI sees — edit the snapshot directly if
needed to match the correct committed name.

## Syncing stubs to jorje

After regenerating stubs in this repo, the same files must be copied to:
`apex-jorje/apex-jorje-lsp/src/main/resources/StandardApexLibrary/`

jorje's branch conventions and build process are separate — sync is a manual copy
of the `StandardApexLibrary/` tree, then build/test in jorje.
