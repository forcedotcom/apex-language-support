---
name: apex-stubs-generator
description: Everything about generating, maintaining, and troubleshooting the Apex standard library stubs in StandardApexLibrary. Use when regenerating stubs, debugging casing failures on Linux CI, working on the generator/augmenter pipeline, or syncing stubs to jorje.
---

# Apex Stubs Generator

## What stubs are and where they live

`.cls` stub files represent the Apex standard library (namespaces, classes, methods, enums).
They live in two places:

- **This repo**: `packages/apex-parser-ast/src/resources/StandardApexLibrary/`
- **jorje**: `apex-jorje/apex-jorje-lsp/src/main/resources/StandardApexLibrary/`

Both copies must be kept in sync. The authoritative source is this repo's generator pipeline.

## Generation pipeline

### Two data sources

1. **Public Salesforce Apex Reference docs** — scraped on demand via web scraping
2. **Class/Method Reference XML** (internal, not committed) — fills gaps in public docs

### Running the generator

```bash
cd packages/apex-stubs-generator
# Optional: place the Class/Method Reference XML at:
#   packages/apex-stubs-generator/bytecode.xml
# (gitignored; generation works without it but with reduced coverage)
npm run generate
```

Steps the generator performs:
- **Step 0** — Wipes `StandardApexLibrary` entirely and recreates it
- **Step 1** — Scrapes public Salesforce Apex Reference docs
- **Step 1b** — Augments with method signatures from `bytecode.xml` (skipped with notice if absent)
- **Step 2** — Emits `.cls` stub files

### Key source files

| File | Purpose |
|------|---------|
| `packages/apex-stubs-generator/src/commands/generate.ts` | Entry point, orchestrates steps |
| `packages/apex-stubs-generator/src/scraper/main-scraper.ts` | Scrapes public docs |
| `packages/apex-stubs-generator/src/parser/toc-parser.ts` | Parses the TOC, extracts namespace names |
| `packages/apex-stubs-generator/src/generator/stub-generator.ts` | Emits `.cls` files |
| `packages/apex-stubs-generator/src/augmenter/xml-augmenter.ts` | Merges Class/Method Reference XML methods |

## Namespace name rules

Namespace names come from the public docs TOC text (strip "Namespace" suffix). The
`NAMESPACE_NAME_OVERRIDES` map in `toc-parser.ts` pins authoritative casing for namespaces
whose docs are inconsistently capitalised:

```typescript
const NAMESPACE_NAME_OVERRIDES = new Map([
  ['sfdc_enablement', 'Sfdc_Enablement'],
  ['sfdc_checkout',   'Sfdc_Checkout'],
  ['sfdc_surveys',    'Sfdc_Surveys'],
]);
```

These names become the output folder names under `StandardApexLibrary/`.

## Visibility rule

Members of a `global` class cannot be less visible than `global`. The docs sometimes
declare methods as `public` on a `global` class — the generator corrects this at emit time
via `resolveVisibility()` in `stub-generator.ts`:

```typescript
const resolveVisibility = (vis: string | undefined): string =>
  vis === 'public' ? 'global' : (vis ?? 'global');
```

## Class/Method Reference XML workflow

The XML file is **internal and must never be committed to git**.

1. Obtain the Class/Method Reference XML from the Apex LS team.
2. Place it at `packages/apex-stubs-generator/bytecode.xml` (gitignored).
3. Run `npm run generate`.
4. The augmenter logs: `Augmented N methods across M classes from bytecode XML.`

**Why the weekly CI schedule is disabled**: generation requires `bytecode.xml`, which cannot
be stored in the repository. The `workflow_dispatch` trigger is kept so it can still be
triggered from GitHub Actions UI if needed.

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
| Namespace folder name | `NAMESPACE_NAME_OVERRIDES` map in `toc-parser.ts`, else the TOC text |

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

## Automated weekly CI (disabled)

The `.github/workflows/generate-stubs.yml` workflow had a `schedule:` block (Mondays 06:00 UTC)
that was intentionally removed because generation now requires the Class/Method Reference XML.
The `workflow_dispatch` trigger is retained for manual runs from GitHub Actions UI.
