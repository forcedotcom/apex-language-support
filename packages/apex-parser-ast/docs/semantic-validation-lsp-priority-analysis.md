# Apex Semantic Validation LSP Priority Analysis

## Overview

This document analyzes the semantic validation gap analysis and implementation plan in the context of supporting a Language Server Protocol (LSP) implementation for Apex. Each validation capability is categorized based on its importance for providing essential LSP features like diagnostics, code completion, go-to-definition, and other language intelligence features.

## LSP Feature Requirements Analysis

### Core LSP Features and Their Validation Dependencies

#### 1. **Diagnostics (textDocument/publishDiagnostics)**

- **Purpose**: Report syntax and semantic errors to the client
- **Validation Requirements**: All semantic validation rules
- **Priority**: **MUST HAVE** - This is the primary use case for semantic validation

#### 2. **Code Completion (textDocument/completion)**

- **Purpose**: Provide intelligent code suggestions
- **Validation Requirements**: Symbol resolution, type information, context awareness
- **Priority**: **MUST HAVE** - Core LSP functionality

#### 3. **Go-to-Definition (textDocument/definition)**

- **Purpose**: Navigate to symbol definitions
- **Validation Requirements**: Symbol resolution, namespace handling
- **Priority**: **MUST HAVE** - Core LSP functionality

#### 4. **Hover (textDocument/hover)**

- **Purpose**: Show symbol information on hover
- **Validation Requirements**: Type information, documentation
- **Priority**: **MUST HAVE** - Core LSP functionality

#### 5. **References (textDocument/references)**

- **Purpose**: Find all references to a symbol
- **Validation Requirements**: Symbol resolution, scope analysis
- **Priority**: **MUST HAVE** - Core LSP functionality

#### 6. **Symbol Information (textDocument/documentSymbol)**

- **Purpose**: Provide outline view of document structure
- **Validation Requirements**: Symbol collection, hierarchy
- **Priority**: **MUST HAVE** - Core LSP functionality

#### 7. **Code Actions (textDocument/codeAction)**

- **Purpose**: Provide quick fixes and refactoring
- **Validation Requirements**: Error understanding, fix suggestions
- **Priority**: **NICE TO HAVE** - Enhances developer experience

#### 8. **Folding Ranges (textDocument/foldingRange)**

- **Purpose**: Provide code folding information
- **Validation Requirements**: Block structure analysis
- **Priority**: **NICE TO HAVE** - UI enhancement

## Priority Categorization

### 🚨 **MUST HAVE** - Essential for LSP Functionality

#### 1. **Error Handling Infrastructure** ✅

- **Rationale**: Required for all LSP diagnostic features
- **LSP Impact**: Critical - enables error reporting to clients
- **Implementation Priority**: Already implemented

#### 2. **Basic Symbol Collection** ✅

- **Rationale**: Required for go-to-definition, references, completion
- **LSP Impact**: Critical - enables symbol navigation and completion
- **Implementation Priority**: Already implemented

#### 3. **Identifier Validation** ✅

- **Rationale**: Required for accurate symbol resolution and error reporting
- **LSP Impact**: High - affects symbol table accuracy
- **Implementation Priority**: ✅ Phase 1 (High Priority) - **COMPLETED**

#### 4. **Type System Validation** ⚠️

- **Rationale**: Required for hover information, completion, and type checking
- **LSP Impact**: High - affects type-aware features
- **Implementation Priority**: Phase 3 (Medium Priority) - **UPGRADE TO HIGH**

#### 5. **Variable Expression Validation** ❌

- **Rationale**: Required for accurate symbol resolution and error reporting
- **LSP Impact**: High - affects symbol lookup accuracy
- **Implementation Priority**: Phase 2 (High Priority) - **NEW PRIORITY**

#### 6. **Visibility and Access Validation** ❌

- **Rationale**: Required for accurate symbol resolution and access control
- **LSP Impact**: High - affects symbol visibility in completion and navigation
- **Implementation Priority**: Phase 3 (High Priority) - **UPGRADE TO HIGH**

#### 7. **Interface and Class Validation** ❌

- **Rationale**: Required for inheritance navigation and interface implementation
- **LSP Impact**: High - affects go-to-definition and references
- **Implementation Priority**: Phase 4 (Medium Priority) - **UPGRADE TO HIGH**

### 🎯 **NICE TO HAVE** - Enhances LSP Experience

#### 1. **Annotation Validation** ✅

- **Rationale**: Provides better error reporting and documentation
- **LSP Impact**: Medium - improves diagnostic quality
- **Implementation Priority**: Already implemented

#### 2. **Modifier Validation** ✅

- **Rationale**: Provides better error reporting and symbol information
- **LSP Impact**: Medium - improves diagnostic quality
- **Implementation Priority**: Already implemented

#### 3. **Expression Validation** ❌

- **Rationale**: Provides comprehensive error reporting for expressions
- **LSP Impact**: Medium - improves diagnostic quality but not essential for core LSP features
- **Implementation Priority**: Phase 2 (High Priority) - **DOWNGRADE TO MEDIUM**

#### 4. **Statement Validation** ❌

- **Rationale**: Provides comprehensive error reporting for statements
- **LSP Impact**: Medium - improves diagnostic quality
- **Implementation Priority**: Phase 5 (Low Priority) - **MAINTAIN LOW**

#### 5. **Built-in Method Validation** ❌

- **Rationale**: Provides specific error reporting for built-in methods
- **LSP Impact**: Medium - improves diagnostic quality for specific cases
- **Implementation Priority**: Phase 4 (Medium Priority) - **MAINTAIN MEDIUM**

#### 6. **Compilation Unit Validation** ❌

- **Rationale**: Provides file-level error reporting
- **LSP Impact**: Low - affects file-level diagnostics only
- **Implementation Priority**: Phase 5 (Low Priority) - **MAINTAIN LOW**

### ❌ **OUT OF SCOPE** - Not Required for LSP

#### 1. **Parser-Level Semantic Validation** ❌

- **Rationale**: These are handled by the parser itself, not the semantic analyzer
- **LSP Impact**: None - parser errors are already captured
- **Implementation Priority**: **REMOVE FROM PLAN**

## Revised Implementation Plan for LSP

### Phase 1: Core LSP Foundation (Weeks 1-3) - **HIGH PRIORITY** ✅ COMPLETED

#### 1.1 Create Validation Infrastructure ✅

- **Status**: Must Have
- **LSP Impact**: Critical for all diagnostic features
- **Effort**: ✅ 1 week - **COMPLETED**

#### 1.2 Implement Identifier Validation ✅

- **Status**: Must Have
- **LSP Impact**: Critical for symbol resolution accuracy
- **Effort**: ✅ 2 weeks - **COMPLETED**
- **Remaining**: Integration with ApexSymbolCollectorListener

### Phase 2: Symbol Resolution Enhancement (Weeks 4-7) - **HIGH PRIORITY**

#### 2.1 Implement Variable Expression Validation

- **Status**: Must Have
- **LSP Impact**: Critical for symbol lookup and completion
- **Effort**: 2 weeks

#### 2.2 Implement Basic Expression Validation

- **Status**: Nice to Have
- **LSP Impact**: Improves diagnostic quality
- **Effort**: 2 weeks

### Phase 3: Type System and Visibility (Weeks 8-11) - **HIGH PRIORITY**

#### 3.1 Implement Type System Validation

- **Status**: Must Have
- **LSP Impact**: Critical for hover, completion, and type checking
- **Effort**: 3 weeks

#### 3.2 Implement Visibility and Access Validation

- **Status**: Must Have
- **LSP Impact**: Critical for symbol visibility in LSP features
- **Effort**: 1 week

### Phase 4: Advanced Symbol Features (Weeks 12-15) - **HIGH PRIORITY**

#### 4.1 Implement Interface and Class Validation

- **Status**: Must Have
- **LSP Impact**: Critical for inheritance navigation and references
- **Effort**: 3 weeks

#### 4.2 Implement Built-in Method Validation

- **Status**: Nice to Have
- **LSP Impact**: Improves diagnostic quality for specific cases
- **Effort**: 1 week

### Phase 5: Enhanced Diagnostics (Weeks 16-18) - **MEDIUM PRIORITY**

#### 5.1 Implement Statement Validation

- **Status**: Nice to Have
- **LSP Impact**: Improves diagnostic quality
- **Effort**: 2 weeks

#### 5.2 Implement Compilation Unit Validation

- **Status**: Nice to Have
- **LSP Impact**: Provides file-level diagnostics
- **Effort**: 1 week

## LSP-Specific Implementation Considerations

### 1. **Performance Requirements for LSP**

#### Real-time Validation

- **Requirement**: Validation must complete within 100-500ms for responsive LSP experience
- **Impact**: May need to limit validation scope for large files
- **Strategy**: Implement progressive validation with early termination

#### Incremental Validation

- **Requirement**: Only revalidate changed portions of code
- **Impact**: Requires tracking of validation dependencies
- **Strategy**: Implement dependency tracking and incremental revalidation

### 2. **Error Reporting for LSP**

#### Diagnostic Severity Mapping

- **Requirement**: Map validation errors to LSP diagnostic severities
- **Mapping**:
  - Syntax errors → Error
  - Semantic errors → Error
  - Warnings → Warning
  - Info → Information

#### Error Range Precision

- **Requirement**: Provide precise error ranges for highlighting
- **Impact**: Requires detailed location tracking in validation
- **Strategy**: Enhance error reporting with precise line/column ranges

### 3. **Symbol Information for LSP**

#### Symbol Kind Mapping

- **Requirement**: Map Apex symbols to LSP symbol kinds
- **Mapping**:
  - Class → Class
  - Interface → Interface
  - Method → Method
  - Variable → Variable
  - Property → Property
  - Enum → Enum
  - EnumValue → EnumMember

#### Symbol Hierarchy

- **Requirement**: Provide accurate symbol hierarchy for outline view
- **Impact**: Requires proper scope and nesting information
- **Strategy**: Enhance symbol collection with hierarchy tracking

### 4. **Type Information for LSP**

#### Hover Information

- **Requirement**: Provide detailed type information on hover
- **Content**: Type name, modifiers, documentation, signature
- **Strategy**: Enhance type system with detailed type information

#### Completion Context

- **Requirement**: Provide context-aware completion suggestions
- **Impact**: Requires understanding of current context and available symbols
- **Strategy**: Implement context analysis for completion

## Revised Timeline Summary

### **Must Have Features (18 weeks)**

- Error handling infrastructure ✅ (Already done)
- Basic symbol collection ✅ (Already done)
- Identifier validation ✅ (3 weeks) - **COMPLETED**
- Variable expression validation (2 weeks)
- Type system validation (3 weeks)
- Visibility and access validation (1 week)
- Interface and class validation (3 weeks)
- **Total Must Have Effort**: 9 weeks remaining (3 weeks completed)

### **Nice to Have Features (6 weeks)**

- Expression validation (2 weeks)
- Built-in method validation (1 week)
- Statement validation (2 weeks)
- Compilation unit validation (1 week)
- **Total Nice to Have Effort**: 6 weeks

### **Out of Scope**

- Parser-level semantic validation (removed from plan)

## Success Criteria for LSP

### 1. **Core LSP Feature Support**

- ✅ Diagnostics working for all validation rules
- ✅ Go-to-definition working for all symbol types
- ✅ Code completion working with context awareness
- ✅ Hover information providing detailed type information
- ✅ References finding all symbol usages
- ✅ Document symbols providing accurate outline

### 2. **Performance Requirements**

- Validation completes within 500ms for files up to 10,000 lines
- Symbol resolution completes within 100ms
- Memory usage remains under 2x current symbol table usage

### 3. **Quality Requirements**

- Zero false positives in symbol resolution
- Accurate error locations for all diagnostics
- Complete symbol information for all Apex constructs

## Conclusion

For LSP support, the focus should be on **symbol resolution accuracy** and **type information completeness** rather than comprehensive semantic validation. The must-have features are those that directly impact core LSP functionality like go-to-definition, completion, and hover.

**Revised Priority Order:**

1. **Symbol Resolution** ✅ (Identifier validation completed, Variable expression validation next)
2. **Type System** (Type validation, Visibility validation)
3. **Inheritance** (Interface and class validation)
4. **Enhanced Diagnostics** (Expression validation, Statement validation)

This revised plan ensures that the most critical LSP features are supported first, while still providing comprehensive semantic validation for enhanced developer experience.
