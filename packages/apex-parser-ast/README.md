# Apex Parser & AST (`@salesforce/apex-parser-ast`)

This package is the foundational component of the Apex Language Server responsible for parsing Apex source code and constructing an Abstract Syntax Tree (AST). This AST is a specialized `SymbolTable` that provides a structured, hierarchical representation of the code, enabling advanced language features like code completion, navigation, and semantic analysis.

## Core Concepts

The package is built around a few core concepts that work together to turn raw source code into a meaningful data model.

-   **`CompilerService`**: The main entry point and orchestrator for the parsing process. It manages the entire pipeline, from receiving the source code to returning a final compilation result.
-   **`SymbolTable`**: The primary data structure produced by this package. It's a hierarchical tree of `SymbolScope` objects that mirrors the lexical scoping of the source code (file > class > method > block). It contains every `ApexSymbol` found in the file and allows for efficient lookup.
-   **`ApexSymbol`**: A generic data structure representing a single named entity in the code, such as a class, interface, method, property, or variable. Specialized versions (`TypeSymbol`, `MethodSymbol`, `VariableSymbol`) extend this base structure to hold relevant metadata.
-   **Parser Listeners**: Classes that subscribe to events emitted by the ANTLR parser as it traverses the parse tree. The key listener is the `ApexSymbolCollectorListener`, which is responsible for building the `SymbolTable`.

## Architecture and Workflow

The package uses a classic compiler front-end architecture based on the ANTLR parser-generator tool.

1.  **Orchestration**: A consumer (like a language server) invokes the `CompilerService.compile()` method, passing in the Apex source code and a listener instance.
2.  **ANTLR Pipeline**: The `CompilerService` sets up the ANTLR pipeline:
    -   The source code is fed into an `ApexLexer`, which performs lexical analysis, breaking the string into a sequence of tokens.
    -   The tokens are passed to an `ApexParser`, which builds a concrete Parse Tree based on the Apex grammar.
3.  **Tree Traversal**: A `ParseTreeWalker` traverses the generated parse tree node by node.
4.  **Event-Driven Analysis**: As the walker visits each node (e.g., a class declaration), it triggers the corresponding method on the provided listener (e.g., `enterClassDeclaration`).
5.  **Symbol Table Construction**: The `ApexSymbolCollectorListener` responds to these events. When it enters a new scope (like a class), it tells the `SymbolTable` to `enterScope()`. When it finds a symbol (like a method), it creates an `ApexSymbol` and adds it to the current scope. When it leaves a scope, it calls `exitScope()`.
6.  **Result**: Once the traversal is complete, the listener's `getResult()` method returns the fully constructed `SymbolTable`, which is then packaged into a `CompilationResult` object and returned to the consumer.

## Directory Structure

-   `src/parser/`: Contains the ANTLR-driven parsing infrastructure.
    -   `compilerService.ts`: The high-level `CompilerService` that orchestrates the process.
    -   `listeners/`: Home to the various parser listeners, including `ApexSymbolCollectorListener`, which builds the symbol table, and `ApexErrorListener`, which collects syntax errors.
-   `src/types/`: Defines the core data model for the AST.
    -   `symbol.ts`: Defines the `ApexSymbol` hierarchy and the `SymbolTable` / `SymbolScope` classes.
    -   `typeInfo.ts`: Defines structures for representing type information.
-   `src/semantics/`: Contains modules for performing semantic analysis and validation on the AST after it's built.
-   `src/generated/`: Contains the lexer and parser code automatically generated by ANTLR from a grammar file (not present in this repo, but a standard part of the build process).
-   `src/index.ts`: The public API entry point for the package, exporting all consumable classes and types.

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

## Comment Collection

Comments are collected by default for language server functionality like hover documentation, code completion, and symbol information.

### Usage Examples

```typescript
import {
  CompilerService,
  ApexSymbolCollectorListener,
} from '@salesforce/apex-lsp-parser-ast';

const compilerService = new CompilerService();
const symbolCollector = new ApexSymbolCollectorListener();

// Comments collected by default (recommended for language servers)
const result = compilerService.compile(
  apexCode,
  'MyClass.cls',
  symbolCollector,
);
console.log('Comments found:', result.comments.length);

// Explicitly include comments (same as default)
const resultWithComments = compilerService.compile(
  apexCode,
  'MyClass.cls',
  symbolCollector,
  { includeComments: true },
);

// Opt out of comment collection (for performance-critical scenarios)
const resultWithoutComments = compilerService.compile(
  apexCode,
  'MyClass.cls',
  symbolCollector,
  { includeComments: false },
);
// resultWithoutComments.comments is undefined

// Include single-line comments (default: false)
const resultWithLineComments = compilerService.compile(
  apexCode,
  'MyClass.cls',
  symbolCollector,
  { includeSingleLineComments: true },
);

// Include comment association (requires includeComments: true)
const resultWithAssociations = compilerService.compile(
  apexCode,
  'MyClass.cls',
  symbolCollector,
  {
    includeComments: true,
    associateComments: true,
  },
);

// All options combined
const resultWithAllOptions = compilerService.compile(
  apexCode,
  'MyClass.cls',
  symbolCollector,
  {
    includeComments: true,
    includeSingleLineComments: true,
    associateComments: true,
    projectNamespace: 'MyProject',
  },
);
```

### Comment Types

The parser identifies different types of comments:

- **Line comments**: `// Single line comment` (excluded by default)
- **Block comments**: `/* Multi-line comment */` (included by default)
- **Documentation comments**: `/** JavaDoc style */`, `/// Triple slash` (included when line comments are enabled)

### Comment Collection Behavior

By default, the parser collects block comments but excludes single-line comments. This behavior is optimized for language server use cases where:

- Block comments are more likely to contain meaningful documentation
- Single-line comments are often temporary or implementation-specific
- Reducing noise improves hover documentation and IntelliSense quality

To include single-line comments, set `includeSingleLineComments: true` in the compilation options.

### Comment Association

When `associateComments: true` is enabled, comments are automatically associated with nearby symbols using spatial analysis:

```typescript
import { CommentAssociationType } from '@salesforce/apex-lsp-parser-ast';

const result = compilerService.compile(
  apexCode,
  'MyClass.cls',
  symbolCollector,
  {
    includeComments: true,
    associateComments: true,
  },
);

// Access comment associations
const associations = result.commentAssociations;

// Get associations for a specific symbol
const classAssociations = associations.filter((a) => a.symbolKey === 'MyClass');

// Get associations by type
const precedingComments = associations.filter(
  (a) => a.associationType === CommentAssociationType.Preceding,
);
const inlineComments = associations.filter(
  (a) => a.associationType === CommentAssociationType.Inline,
);

// Get documentation for a symbol (high-confidence preceding comments)
const associator = new CommentAssociator();
const documentation = associator.getDocumentationForSymbol(
  'MyClass',
  associations,
);
```

#### Association Types

- **Preceding**: Comments that appear before a symbol (typical documentation)
- **Inline**: Comments on the same line as the symbol declaration
- **Internal**: Comments inside a symbol's body (for classes/methods)
- **Trailing**: Comments that appear after a symbol

### Filtering Comments

```typescript
// Get all comments
const allComments = result.comments;

// Get only documentation comments
const docComments = result.comments.filter((c) => c.isDocumentation);

// Get comments by type
const lineComments = result.comments.filter((c) => c.type === 'line');
const blockComments = result.comments.filter((c) => c.type === 'block');

// Get comments in a specific range
const rangeComments = result.comments.filter(
  (c) => c.startLine >= 10 && c.endLine <= 20,
);
```
