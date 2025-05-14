# Apex Parser AST

Apex language parser and abstract syntax tree (AST) functionality for the Apex Language Server packages.

## Overview

This package provides parser utilities, AST generation, and analysis tools for Apex code that are used by other packages in the Apex Language Server ecosystem. It includes:

- Parser utilities for Apex code
- Semantic analysis tools
- Type definitions
- Abstract syntax tree (AST) generation and manipulation
- Annotation parsing and validation
- Symbol collection and scope management

## Dependencies

- `@apexdevtools/apex-parser`: For parsing Apex code
- `antlr4ts`: ANTLR runtime for TypeScript

## Usage

```typescript
import {
  ApexSymbolCollectorListener,
  AnnotationValidator,
  AnnotationUtils,
} from '@salesforce/apex-lsp-parser-ast';

// Use the symbol collector to parse and analyze code
const listener = new ApexSymbolCollectorListener();
// ...parsing code...
const symbolTable = listener.getResult();

// Use annotation utilities to work with annotations
const isTestClass = AnnotationUtils.isTestClass(classSymbol);
const resourceUrl = AnnotationUtils.getRestResourceUrlMapping(classSymbol);

// Validate annotations for correctness
AnnotationValidator.validateAnnotations(symbol, context, errorReporter);
```

## Features

### Annotation Support

The package provides comprehensive support for Apex annotations:

- **Parsing**: Automatically extracts annotations and their parameters from Apex code
- **Validation**: Validates annotations for correct usage and reports errors for:
  - Invalid targets (e.g., using method-only annotations on classes)
  - Missing required parameters
  - Unrecognized parameters
  - Conflicting annotations
- **Utilities**: Helper functions for working with annotations, such as:
  - Checking if a symbol has specific annotations
  - Extracting parameter values from annotations
  - Specialized functions for common annotations like `@isTest` and `@RestResource`

### Inheritance Relationship Handling

The parser captures inheritance relationships between types:

- **Class Inheritance**: Correctly captures parent classes through the `extends` keyword
- **Interface Implementation**: Records interfaces implemented by classes through the `implements` keyword
- **Interface Extension**: Tracks interfaces extended by other interfaces
- **Symbol Information**: Provides easy access to inheritance information through the `TypeSymbol` interface:
  - `superClass`: The parent class that a class extends (if any)
  - `interfaces`: Interfaces implemented by a class or extended by an interface

### Symbol Collection

Collects and organizes symbols from Apex code into a hierarchical symbol table:

- Classes, interfaces, methods, properties
- Variables across different scopes
- Enums and enum values
- Annotations and their parameters

## Recent Changes

- **Removed Babel References:**  
  All references to Babel have been removed from the project. The project now uses `ts-jest` exclusively for testing.

- **TypeScript Improvements:**  
  Explicit types have been added to test files to resolve TypeScript errors. For example, in `apex-lsp-testbed/test/performance/lsp-benchmarks.web.test.ts`, variables and parameters now have explicit `any` types.

- **Jest Configuration:**  
  Jest configurations have been streamlined. Each package now uses a single Jest configuration file (`jest.config.cjs`), and the `"jest"` key has been removed from `package.json` files to avoid conflicts.

## Development

```bash
# Build the package
npm run build

# Watch for changes during development
npm run dev

# Run tests
npm test
```
