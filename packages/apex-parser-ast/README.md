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
- Namespace handling and FQN (Fully Qualified Name) resolution
- Error handling and reporting

## Dependencies

- `@apexdevtools/apex-parser`: For parsing Apex code
- `antlr4ts`: ANTLR runtime for TypeScript

## Usage

```typescript
import {
  ApexSymbolCollectorListener,
  AnnotationValidator,
  AnnotationUtils,
  CompilerService,
} from '@salesforce/apex-lsp-parser-ast';

// Use the compiler service to parse and analyze code
const compiler = new CompilerService();
const listener = new ApexSymbolCollectorListener();
const result = compiler.compile(fileContent, fileName, listener);

// Access the symbol table and any errors/warnings
const symbolTable = result.result;
const errors = result.errors;
const warnings = result.warnings;

// Use annotation utilities to work with annotations
const isTestClass = AnnotationUtils.isTestClass(classSymbol);
const resourceUrl = AnnotationUtils.getRestResourceUrlMapping(classSymbol);

// Validate annotations for correctness
AnnotationValidator.validateAnnotations(symbol, context, errorReporter);
```

## Features

### Enhanced Error Handling

The package now provides comprehensive error handling:

- **Syntax Errors**: Captures and reports syntax errors during parsing
- **Semantic Errors**: Detects and reports semantic issues in the code
- **Warning System**: Supports both errors and warnings with different severity levels
- **Structured Error Reporting**: Errors include file path, line number, column, and detailed messages

### Improved Symbol Collection

Enhanced symbol collection and scope management:

- **Hierarchical Scopes**: Maintains a tree of symbol scopes for accurate symbol resolution
- **Symbol Lookup**: Efficient symbol lookup through nested scopes
- **Scope Navigation**: Easy navigation between parent and child scopes
- **Symbol Table Management**: Comprehensive API for managing symbols and their relationships

### Namespace Support

Robust namespace handling:

- **Global Namespaces**: Support for global namespace resolution
- **Module Namespaces**: Handling of module-specific namespaces
- **FQN Resolution**: Tools for resolving fully qualified names
- **Namespace Validation**: Validation of namespace usage and relationships

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
- **Ancestor Chain**: Utilities to get the complete chain of ancestors for any type

## Development

```bash
# Build the package
npm run build

# Watch for changes during development
npm run dev

# Run tests
npm test
```
