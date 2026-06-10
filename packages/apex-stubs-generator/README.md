# Apex Stubs Generator

Generates `.cls` stub files for the Apex standard library from two sources:

1. **Salesforce Apex Reference Guide** (public docs) — scraped on demand
2. **Class/Method Reference XML** (internal, not committed) — augments gaps in the public docs

## Developer Workflow

### Prerequisites

- Node.js 20+
- The Class/Method Reference XML (internal, not committed to this repo)

### Setup

1. Place the bytecode XML at `packages/apex-stubs-generator/bytecode.xml`.
   This file is gitignored and must never be committed.

2. Install dependencies from the repo root:
   ```
   npm install
   ```

### Generate stubs

Run from the `packages/apex-stubs-generator` directory:

```
npm run generate
```

The generator will:
- **Step 1** — Scrape the public Salesforce Apex Reference docs
- **Step 1b** — Augment scraped data with method signatures from `bytecode.xml` (skipped with a notice if the file is absent)
- **Step 2** — Write `.cls` stubs to `packages/apex-parser-ast/src/resources/StandardApexLibrary/`

Running without `bytecode.xml` produces docs-only stubs (reduced coverage).

### Validate

After generation, validate stub counts against the expected namespace totals:

```
npm run validate
```

### Why the weekly CI schedule is disabled

The automated weekly scrape-and-PR workflow (`.github/workflows/generate-stubs.yml`) requires
the bytecode XML to produce complete stubs. Since that file cannot be stored in the repository,
generation is a manual developer activity. The workflow is retained with `workflow_dispatch`
so it can still be triggered manually from the GitHub Actions UI if needed.
