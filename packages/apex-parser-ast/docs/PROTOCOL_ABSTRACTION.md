# Protocol Abstraction Layer

## Overview

This document describes the protocol abstraction layer implemented to reduce the exposure of URI scheme strings (`file://`, `apexlib://`, `builtin://`) throughout the Apex language server codebase.

## Problem

Previously, protocol strings were scattered throughout the codebase in 200+ locations, making it difficult to:

- Maintain consistency across protocol handling
- Add new protocols or modify existing ones
- Ensure proper URI validation and parsing
- Reduce code duplication

## Solution

### 1. ProtocolHandler Class

Created a centralized `ProtocolHandler` class in `src/types/ProtocolHandler.ts` that encapsulates all URI scheme handling:

```typescript
export enum UriProtocol {
  FILE = 'file',
  APEXLIB = 'apexlib',
  BUILTIN = 'builtin',
}

export class ProtocolHandler {
  // Protocol detection
  static getProtocolType(uri: string): UriProtocol | null;
  static hasProtocol(uri: string, protocol: UriProtocol): boolean;

  // URI creation
  static createFileUri(filePath: string): string;
  static createApexLibUri(resourcePath: string): string;
  static createBuiltinUri(typeName: string): string;

  // URI parsing
  static extractFilePath(uri: string): string;
  static extractApexLibPath(uri: string): string;
  static extractBuiltinType(uri: string): string;

  // Protocol checking
  static isStandardApexUri(uri: string): boolean;
  static isUserCodeUri(uri: string): boolean;
  static isBuiltinUri(uri: string): boolean;

  // Utility methods
  static convertToAppropriateUri(
    filePath: string,
    isStandardApexNamespace: (namespace: string) => boolean,
  ): string;
  static getFilePathFromUri(uri: string): string;
}
```

### 2. Refactored Components

#### UriBasedIdGenerator

- Replaced hardcoded protocol strings with `ProtocolHandler` methods
- Simplified URI conversion logic
- Updated utility functions to use protocol abstraction

#### ApexSymbolManager

- Replaced protocol string checks with `ProtocolHandler` methods
- Centralized URI format conversion
- Improved consistency across symbol management

#### LazyReferenceResolver

- Updated builtin type handling to use protocol constants
- Improved type safety

### 3. Updated Tests

- All test cases now use `ProtocolHandler` methods instead of hardcoded strings
- Improved maintainability and consistency
- Better error handling and validation

## Benefits

### 1. Reduced Protocol Exposure

- Protocol strings are now centralized in one location
- Easy to add new protocols or modify existing ones
- Consistent URI handling across the codebase

### 2. Improved Maintainability

- Single source of truth for protocol handling
- Easier to update protocol logic
- Reduced code duplication

### 3. Better Type Safety

- Enum-based protocol constants
- Compile-time validation
- Clear protocol boundaries

### 4. Enhanced Testability

- Centralized protocol logic is easier to test
- Consistent test patterns
- Better error handling

## Usage Examples

### Before (Scattered Protocol Strings)

```typescript
// Multiple locations with hardcoded strings
if (uri.startsWith('file://')) {
  return uri.replace('file://', '');
}
if (uri.startsWith('apexlib://')) {
  const match = uri.match(/apexlib:\/\/resources\/StandardApexLibrary\/(.+)/);
  return match ? match[1] : '';
}
```

### After (Centralized Protocol Handling)

```typescript
// Single location with protocol abstraction
if (ProtocolHandler.isUserCodeUri(uri)) {
  return ProtocolHandler.extractFilePath(uri);
}
if (ProtocolHandler.isStandardApexUri(uri)) {
  return ProtocolHandler.extractApexLibPath(uri);
}
```

## Migration Guide

### For New Code

- Always use `ProtocolHandler` methods instead of hardcoded protocol strings
- Use `UriProtocol` enum constants for protocol checking
- Leverage utility methods for URI creation and parsing

### For Existing Code

- Replace `uri.startsWith('file://')` with `ProtocolHandler.isUserCodeUri(uri)`
- Replace `uri.startsWith('apexlib://')` with `ProtocolHandler.isStandardApexUri(uri)`
- Use `ProtocolHandler.createFileUri()` instead of `'file://' + path`
- Use `ProtocolHandler.extractFilePath()` instead of manual string manipulation

## Future Enhancements

1. **Protocol Validation**: Add comprehensive URI validation
2. **Protocol Extensions**: Easy addition of new URI schemes
3. **Protocol Configuration**: Runtime protocol configuration
4. **Protocol Metrics**: Monitoring and analytics for protocol usage

## Conclusion

The protocol abstraction layer successfully reduces protocol exposure while improving code maintainability, type safety, and consistency. All protocol-related operations are now centralized, making the codebase more robust and easier to maintain.
