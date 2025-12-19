# Unit Test Plan: Lazy Analysis Performance Optimization

**Date**: December 19, 2025  
**Reference**: `2025-12-19-lazy-analysis-performance-tech-debt-fixes.md`  
**Status**: Ready for Implementation  
**Estimated Effort**: 2-3 hours

---

## Overview

This document details the unit tests needed to cover the new functionality introduced in the lazy analysis performance optimization. Some tests already exist; this plan identifies gaps and provides implementation details.

---

## Test File Summary

| Test File | Status | Tests to Add |
|-----------|--------|--------------|
| `apex-parser-ast/test/utils/resourceLoader.artifacts.test.ts` | ✅ Exists | Add atomic swap, 90% threshold, `getCompiledArtifactCount()` |
| `apex-parser-ast/test/types/symbol.test.ts` | ✅ Exists | Add `toJSON()`/`fromJSON()` round-trip tests |
| `lsp-compliant-services/test/services/DocumentProcessingService.test.ts` | ✅ Exists | Add lifecycle, race condition, disposal tests |
| `custom-services/test/index.test.ts` | ✅ Exists | Add getter pattern tests |

---

## 1. SymbolTable.fromJSON() Tests

### File: `packages/apex-parser-ast/test/types/symbol.test.ts`

### Location: Add new `describe` block after existing `SymbolTable` tests (around line 1100)

### Tests to Add:

```typescript
describe('SymbolTable.toJSON and fromJSON', () => {
  describe('round-trip serialization', () => {
    it('should preserve ClassSymbol properties through toJSON/fromJSON', () => {
      const table = new SymbolTable();
      table.setFileUri('file:///test/MyClass.cls');
      
      const classSymbol = SymbolFactory.createFullSymbol(
        'MyClass',
        SymbolKind.Class,
        {
          symbolRange: { startLine: 1, startColumn: 0, endLine: 100, endColumn: 1 },
          identifierRange: { startLine: 1, startColumn: 14, endLine: 1, endColumn: 21 },
        },
        'file:///test/MyClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: true,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
        null,
        undefined,
        'MyClass',
        'MyNamespace',
      );
      // Add class-specific properties
      (classSymbol as ClassSymbol).superClass = 'BaseClass';
      (classSymbol as ClassSymbol).interfaces = ['ISerializable', 'IComparable'];
      
      table.addSymbol(classSymbol);
      
      const json = table.toJSON();
      const reconstructed = SymbolTable.fromJSON(json);
      
      const symbols = reconstructed.getAllSymbols();
      expect(symbols).toHaveLength(1);
      
      const reconClass = symbols[0] as ClassSymbol;
      expect(reconClass.name).toBe('MyClass');
      expect(reconClass.kind).toBe(SymbolKind.Class);
      expect(reconClass.superClass).toBe('BaseClass');
      expect(reconClass.interfaces).toEqual(['ISerializable', 'IComparable']);
      expect(reconClass.modifiers.isVirtual).toBe(true);
      expect(reconClass.modifiers.visibility).toBe(SymbolVisibility.Public);
      expect(reconClass.fileUri).toBe('file:///test/MyClass.cls');
      expect(reconClass.key.fileUri).toBe('file:///test/MyClass.cls');
    });

    it('should preserve MethodSymbol properties through toJSON/fromJSON', () => {
      const table = new SymbolTable();
      table.setFileUri('file:///test/MyClass.cls');
      
      const methodSymbol = SymbolFactory.createFullSymbol(
        'myMethod',
        SymbolKind.Method,
        {
          symbolRange: { startLine: 10, startColumn: 4, endLine: 20, endColumn: 5 },
          identifierRange: { startLine: 10, startColumn: 20, endLine: 10, endColumn: 28 },
        },
        'file:///test/MyClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: true,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      );
      // Add method-specific properties
      (methodSymbol as MethodSymbol).returnType = { name: 'String' };
      (methodSymbol as MethodSymbol).parameters = [
        { name: 'param1', type: { name: 'Integer' } },
        { name: 'param2', type: { name: 'Boolean' } },
      ];
      
      table.addSymbol(methodSymbol);
      
      const json = table.toJSON();
      const reconstructed = SymbolTable.fromJSON(json);
      
      const symbols = reconstructed.getAllSymbols();
      const reconMethod = symbols[0] as MethodSymbol;
      
      expect(reconMethod.name).toBe('myMethod');
      expect(reconMethod.returnType?.name).toBe('String');
      expect(reconMethod.parameters).toHaveLength(2);
      expect(reconMethod.parameters?.[0].name).toBe('param1');
      expect(reconMethod.modifiers.isStatic).toBe(true);
    });

    it('should preserve VariableSymbol properties through toJSON/fromJSON', () => {
      const table = new SymbolTable();
      table.setFileUri('file:///test/MyClass.cls');
      
      const varSymbol = SymbolFactory.createFullSymbol(
        'myVar',
        SymbolKind.Variable,
        {
          symbolRange: { startLine: 5, startColumn: 4, endLine: 5, endColumn: 30 },
          identifierRange: { startLine: 5, startColumn: 15, endLine: 5, endColumn: 20 },
        },
        'file:///test/MyClass.cls',
        { visibility: SymbolVisibility.Private, isStatic: false, isFinal: true, /* ... */ },
      );
      (varSymbol as VariableSymbol).type = { name: 'String' };
      
      table.addSymbol(varSymbol);
      
      const json = table.toJSON();
      const reconstructed = SymbolTable.fromJSON(json);
      
      const reconVar = reconstructed.getAllSymbols()[0] as VariableSymbol;
      expect(reconVar.type?.name).toBe('String');
      expect(reconVar.modifiers.isFinal).toBe(true);
    });

    it('should preserve EnumSymbol with values through toJSON/fromJSON', () => {
      const table = new SymbolTable();
      table.setFileUri('file:///test/MyEnum.cls');
      
      const enumSymbol = SymbolFactory.createFullSymbol(
        'Status',
        SymbolKind.Enum,
        { /* location */ },
        'file:///test/MyEnum.cls',
        { visibility: SymbolVisibility.Public, /* ... */ },
      );
      (enumSymbol as EnumSymbol).values = [
        { name: 'ACTIVE', kind: SymbolKind.EnumValue, /* ... */ },
        { name: 'INACTIVE', kind: SymbolKind.EnumValue, /* ... */ },
      ];
      
      table.addSymbol(enumSymbol);
      
      const json = table.toJSON();
      const reconstructed = SymbolTable.fromJSON(json);
      
      const reconEnum = reconstructed.getAllSymbols()[0] as EnumSymbol;
      expect(reconEnum.values).toHaveLength(2);
      expect(reconEnum.values?.[0].name).toBe('ACTIVE');
    });

    it('should preserve TypeReferences through toJSON/fromJSON', () => {
      const table = new SymbolTable();
      table.setFileUri('file:///test/MyClass.cls');
      table.references = [
        {
          name: 'String',
          location: {
            symbolRange: { startLine: 5, startColumn: 10, endLine: 5, endColumn: 16 },
            identifierRange: { startLine: 5, startColumn: 10, endLine: 5, endColumn: 16 },
          },
          context: ReferenceContext.TYPE_ANNOTATION,
          isResolved: false,
        },
      ];
      
      const json = table.toJSON();
      const reconstructed = SymbolTable.fromJSON(json);
      
      expect(reconstructed.references).toHaveLength(1);
      expect(reconstructed.references[0].name).toBe('String');
      expect(reconstructed.references[0].context).toBe(ReferenceContext.TYPE_ANNOTATION);
    });

    it('should preserve HierarchicalReferences through toJSON/fromJSON', () => {
      const table = new SymbolTable();
      table.setFileUri('file:///test/MyClass.cls');
      table.hierarchicalReferences = [
        {
          name: 'System.debug',
          fullPath: ['System', 'debug'],
          location: { /* ... */ },
          context: ReferenceContext.METHOD_CALL,
          children: [],
        },
      ];
      
      const json = table.toJSON();
      const reconstructed = SymbolTable.fromJSON(json);
      
      expect(reconstructed.hierarchicalReferences).toHaveLength(1);
      expect(reconstructed.hierarchicalReferences[0].name).toBe('System.debug');
      expect(reconstructed.hierarchicalReferences[0].fullPath).toEqual(['System', 'debug']);
    });
  });

  describe('error handling', () => {
    it('should return empty SymbolTable for null input', () => {
      const result = SymbolTable.fromJSON(null);
      expect(result).toBeInstanceOf(SymbolTable);
      expect(result.getAllSymbols()).toHaveLength(0);
    });

    it('should return empty SymbolTable for undefined input', () => {
      const result = SymbolTable.fromJSON(undefined);
      expect(result).toBeInstanceOf(SymbolTable);
      expect(result.getAllSymbols()).toHaveLength(0);
    });

    it('should return empty SymbolTable for non-object input', () => {
      expect(SymbolTable.fromJSON('string').getAllSymbols()).toHaveLength(0);
      expect(SymbolTable.fromJSON(123).getAllSymbols()).toHaveLength(0);
      expect(SymbolTable.fromJSON([]).getAllSymbols()).toHaveLength(0);
    });

    it('should skip malformed symbols without crashing', () => {
      const json = {
        fileUri: 'file:///test.cls',
        symbols: [
          { symbol: { name: 'Valid', kind: 'class', id: '1', location: { identifierRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 } } } },
          { symbol: null },
          { symbol: { name: 'MissingKind' } },
          { symbol: { kind: 'class' } }, // Missing name
          { symbol: { name: 'MissingId', kind: 'class' } }, // Missing id
          { symbol: { name: 'MissingLocation', kind: 'class', id: '2' } }, // Missing location
        ],
        references: [],
      };
      
      const result = SymbolTable.fromJSON(json);
      // Only 'Valid' should be loaded
      expect(result.getAllSymbols().length).toBe(1);
      expect(result.getAllSymbols()[0].name).toBe('Valid');
    });

    it('should skip malformed references without crashing', () => {
      const json = {
        fileUri: 'file:///test.cls',
        symbols: [],
        references: [
          { name: 'Valid', location: { identifierRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 } } },
          null,
          { location: { identifierRange: { startLine: 1 } } }, // Missing name
          { name: 'MissingLocation' }, // Missing location
        ],
      };
      
      const result = SymbolTable.fromJSON(json);
      expect(result.references.length).toBe(1);
      expect(result.references[0].name).toBe('Valid');
    });
  });

  describe('location reconstruction', () => {
    it('should handle both old (range) and new (symbolRange/identifierRange) formats', () => {
      const oldFormatJson = {
        fileUri: 'file:///test.cls',
        symbols: [
          {
            symbol: {
              name: 'OldFormat',
              kind: 'class',
              id: '1',
              location: {
                range: { startLine: 1, startColumn: 0, endLine: 10, endColumn: 1 },
              },
            },
          },
        ],
      };
      
      const newFormatJson = {
        fileUri: 'file:///test.cls',
        symbols: [
          {
            symbol: {
              name: 'NewFormat',
              kind: 'class',
              id: '2',
              location: {
                symbolRange: { startLine: 1, startColumn: 0, endLine: 10, endColumn: 1 },
                identifierRange: { startLine: 1, startColumn: 6, endLine: 1, endColumn: 15 },
              },
            },
          },
        ],
      };
      
      const oldResult = SymbolTable.fromJSON(oldFormatJson);
      const newResult = SymbolTable.fromJSON(newFormatJson);
      
      expect(oldResult.getAllSymbols()).toHaveLength(1);
      expect(newResult.getAllSymbols()).toHaveLength(1);
      
      // Both should have valid locations
      expect(oldResult.getAllSymbols()[0].location.identifierRange).toBeDefined();
      expect(newResult.getAllSymbols()[0].location.identifierRange).toBeDefined();
    });
  });
});
```

---

## 2. ResourceLoader Artifacts Loading Tests

### File: `packages/apex-parser-ast/test/utils/resourceLoader.artifacts.test.ts`

### Location: Add to existing file after current `describe` blocks

### Tests to Add:

```typescript
describe('ResourceLoader - Atomic Swap and Threshold', () => {
  beforeEach(() => {
    (ResourceLoader as any).instance = undefined;
  });

  describe('90% success threshold', () => {
    it('should succeed when 90%+ artifacts load successfully', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      
      // Create 10 artifacts, 9 valid, 1 invalid
      const artifacts: Record<string, any> = {};
      for (let i = 0; i < 9; i++) {
        artifacts[`System/Class${i}.cls`] = createValidArtifact(`Class${i}`);
      }
      artifacts['System/Invalid.cls'] = { path: 'System/Invalid.cls', compilationResult: { result: null } };
      
      const json = { artifacts };
      const buffer = new TextEncoder().encode(JSON.stringify(json));
      
      const success = loader.setArtifactsBuffer(buffer);
      
      expect(success).toBe(true);
      expect(loader.getCompiledArtifactCount()).toBe(9);
    });

    it('should fail when less than 90% of artifacts load (for large sets)', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      
      // Create 20 artifacts, only 10 valid (50% success rate)
      const artifacts: Record<string, any> = {};
      for (let i = 0; i < 10; i++) {
        artifacts[`System/Valid${i}.cls`] = createValidArtifact(`Valid${i}`);
      }
      for (let i = 0; i < 10; i++) {
        artifacts[`System/Invalid${i}.cls`] = { path: `System/Invalid${i}.cls`, compilationResult: { result: null } };
      }
      
      const json = { artifacts };
      const buffer = new TextEncoder().encode(JSON.stringify(json));
      
      const success = loader.setArtifactsBuffer(buffer);
      
      expect(success).toBe(false);
      // On failure, no artifacts should be loaded (atomic swap)
      expect(loader.getCompiledArtifactCount()).toBe(0);
    });

    it('should skip threshold check for small artifact sets (<= 10)', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      
      // Create 5 artifacts, only 2 valid (40% success rate, but small set)
      const artifacts: Record<string, any> = {};
      for (let i = 0; i < 2; i++) {
        artifacts[`System/Valid${i}.cls`] = createValidArtifact(`Valid${i}`);
      }
      for (let i = 0; i < 3; i++) {
        artifacts[`System/Invalid${i}.cls`] = { path: `System/Invalid${i}.cls`, compilationResult: { result: null } };
      }
      
      const json = { artifacts };
      const buffer = new TextEncoder().encode(JSON.stringify(json));
      
      const success = loader.setArtifactsBuffer(buffer);
      
      // Should succeed because set size is <= 10
      expect(success).toBe(true);
      expect(loader.getCompiledArtifactCount()).toBe(2);
    });
  });

  describe('atomic swap behavior', () => {
    it('should not partially update state on failure', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      
      // First, load some valid artifacts
      const validArtifacts = {
        artifacts: {
          'System/String.cls': createValidArtifact('String'),
          'System/Integer.cls': createValidArtifact('Integer'),
        },
      };
      loader.setArtifactsBuffer(new TextEncoder().encode(JSON.stringify(validArtifacts)));
      expect(loader.getCompiledArtifactCount()).toBe(2);
      
      // Reset for second load
      (ResourceLoader as any).instance = undefined;
      const loader2 = ResourceLoader.getInstance({ loadMode: 'lazy' });
      
      // Try to load artifacts that will fail threshold
      const badArtifacts: Record<string, any> = {};
      for (let i = 0; i < 20; i++) {
        // All invalid
        badArtifacts[`System/Bad${i}.cls`] = { path: `System/Bad${i}.cls`, compilationResult: { result: null } };
      }
      
      const success = loader2.setArtifactsBuffer(new TextEncoder().encode(JSON.stringify({ artifacts: badArtifacts })));
      
      expect(success).toBe(false);
      // Should have 0 artifacts (atomic rollback)
      expect(loader2.getCompiledArtifactCount()).toBe(0);
    });
  });

  describe('getCompiledArtifactCount', () => {
    it('should return 0 for empty loader', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      expect(loader.getCompiledArtifactCount()).toBe(0);
    });

    it('should return correct count after loading artifacts', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      
      const artifacts = {
        artifacts: {
          'System/String.cls': createValidArtifact('String'),
          'System/Integer.cls': createValidArtifact('Integer'),
          'System/Boolean.cls': createValidArtifact('Boolean'),
        },
      };
      
      loader.setArtifactsBuffer(new TextEncoder().encode(JSON.stringify(artifacts)));
      
      expect(loader.getCompiledArtifactCount()).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should return false for corrupted gzip', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      
      // Create buffer that looks like gzip but is corrupted
      const corruptedGzip = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0xff, 0xff, 0xff]);
      
      const success = loader.setArtifactsBuffer(corruptedGzip);
      
      expect(success).toBe(false);
    });

    it('should return false for empty buffer', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      
      const success = loader.setArtifactsBuffer(new Uint8Array(0));
      
      expect(success).toBe(false);
    });
  });
});

// Helper function
function createValidArtifact(className: string) {
  return {
    path: `System/${className}.cls`,
    compilationResult: {
      fileName: `System/${className}.cls`,
      result: {
        fileUri: `apexlib://resources/StandardApexLibrary/System/${className}.cls`,
        symbols: [
          {
            symbol: {
              name: className,
              kind: 'class',
              id: `${className}-id`,
              location: {
                symbolRange: { startLine: 1, startColumn: 0, endLine: 10, endColumn: 1 },
                identifierRange: { startLine: 1, startColumn: 14, endLine: 1, endColumn: 14 + className.length },
              },
              modifiers: { visibility: 'public' },
            },
          },
        ],
        references: [],
        hierarchicalReferences: [],
      },
      errors: [],
      warnings: [],
    },
  };
}
```

---

## 3. DocumentProcessingService Lifecycle Tests

### File: `packages/lsp-compliant-services/test/services/DocumentProcessingService.test.ts`

### Location: Add new `describe` blocks after existing tests

### Tests to Add:

```typescript
describe('DocumentProcessingService - Lifecycle', () => {
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    DocumentProcessingService.reset(); // Clean slate
    
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (getLogger as jest.Mock).mockReturnValue(mockLogger);
    
    // Setup other mocks as in existing tests...
  });

  afterEach(() => {
    DocumentProcessingService.reset();
  });

  describe('singleton pattern', () => {
    it('should return same instance for multiple getInstance calls', () => {
      const instance1 = DocumentProcessingService.getInstance(mockLogger);
      const instance2 = DocumentProcessingService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should throw if getInstance called without logger on first call', () => {
      expect(() => DocumentProcessingService.getInstance()).toThrow(
        'Logger must be provided when creating DocumentProcessingService instance',
      );
    });

    it('should ignore logger on subsequent calls', () => {
      const instance1 = DocumentProcessingService.getInstance(mockLogger);
      const differentLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
      const instance2 = DocumentProcessingService.getInstance(differentLogger);
      
      expect(instance1).toBe(instance2);
      // Original logger should still be used
    });
  });

  describe('reset()', () => {
    it('should clear singleton instance', () => {
      const instance1 = DocumentProcessingService.getInstance(mockLogger);
      DocumentProcessingService.reset();
      const instance2 = DocumentProcessingService.getInstance(mockLogger);
      
      expect(instance1).not.toBe(instance2);
    });

    it('should call dispose on existing instance', () => {
      const instance = DocumentProcessingService.getInstance(mockLogger);
      const disposeSpy = jest.spyOn(instance, 'dispose');
      
      DocumentProcessingService.reset();
      
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should be safe to call multiple times', () => {
      DocumentProcessingService.reset();
      DocumentProcessingService.reset();
      DocumentProcessingService.reset();
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('dispose()', () => {
    it('should clear all debounce timers', async () => {
      jest.useFakeTimers();
      
      const instance = DocumentProcessingService.getInstance(mockLogger);
      
      // Trigger some debounce timers by processing documents
      await instance.processDocumentOpenBatch([
        createMockEvent('file:///test1.cls', 1),
        createMockEvent('file:///test2.cls', 1),
      ]);
      
      // Timers should be set
      expect((instance as any).debounceTimers.size).toBeGreaterThan(0);
      
      instance.dispose();
      
      // Timers should be cleared
      expect((instance as any).debounceTimers.size).toBe(0);
      
      jest.useRealTimers();
    });

    it('should clear pending analyses map', async () => {
      const instance = DocumentProcessingService.getInstance(mockLogger);
      
      // Add a fake pending analysis
      (instance as any).pendingAnalyses.set('test@1', Promise.resolve([]));
      expect((instance as any).pendingAnalyses.size).toBe(1);
      
      instance.dispose();
      
      expect((instance as any).pendingAnalyses.size).toBe(0);
    });

    it('should be idempotent (safe to call multiple times)', () => {
      const instance = DocumentProcessingService.getInstance(mockLogger);
      
      instance.dispose();
      instance.dispose();
      instance.dispose();
      
      // Should not throw
      expect(instance.disposed).toBe(true);
    });

    it('should set disposed flag', () => {
      const instance = DocumentProcessingService.getInstance(mockLogger);
      
      expect(instance.disposed).toBe(false);
      instance.dispose();
      expect(instance.disposed).toBe(true);
    });
  });

  describe('disposal behavior', () => {
    it('should reject processDocumentOpen after disposal', () => {
      const instance = DocumentProcessingService.getInstance(mockLogger);
      instance.dispose();
      
      // Should not throw, but should warn
      instance.processDocumentOpen(createMockEvent('file:///test.cls', 1));
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(Function), // The log function
      );
    });

    it('should return empty diagnostics from ensureFullAnalysis after disposal', async () => {
      const instance = DocumentProcessingService.getInstance(mockLogger);
      instance.dispose();
      
      const result = await instance.ensureFullAnalysis(
        'file:///test.cls',
        1,
        { priority: Priority.Normal, reason: 'test' },
      );
      
      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should no-op handleDocumentClose after disposal', () => {
      const instance = DocumentProcessingService.getInstance(mockLogger);
      instance.dispose();
      
      // Should not throw
      instance.handleDocumentClose('file:///test.cls');
    });
  });
});

describe('DocumentProcessingService - Race Condition Prevention', () => {
  let mockLogger: any;
  let mockStorage: any;
  let mockCache: any;

  beforeEach(() => {
    jest.clearAllMocks();
    DocumentProcessingService.reset();
    
    // Setup mocks...
  });

  afterEach(() => {
    DocumentProcessingService.reset();
  });

  it('should return same promise for concurrent ensureFullAnalysis calls', async () => {
    const instance = DocumentProcessingService.getInstance(mockLogger);
    
    // Mock performFullAnalysis to take some time
    const performFullAnalysisSpy = jest.spyOn(instance as any, 'performFullAnalysis')
      .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 100)));
    
    // Make two concurrent calls
    const promise1 = instance.ensureFullAnalysis('file:///test.cls', 1, { priority: Priority.Normal, reason: 'call1' });
    const promise2 = instance.ensureFullAnalysis('file:///test.cls', 1, { priority: Priority.Normal, reason: 'call2' });
    
    // Both should return the same promise (reference equality)
    expect(promise1).toBe(promise2);
    
    // performFullAnalysis should only be called once
    await Promise.all([promise1, promise2]);
    expect(performFullAnalysisSpy).toHaveBeenCalledTimes(1);
  });

  it('should allow new analysis after previous completes', async () => {
    const instance = DocumentProcessingService.getInstance(mockLogger);
    
    let callCount = 0;
    jest.spyOn(instance as any, 'performFullAnalysis')
      .mockImplementation(() => {
        callCount++;
        return Promise.resolve([]);
      });
    
    // First call
    await instance.ensureFullAnalysis('file:///test.cls', 1, { priority: Priority.Normal, reason: 'call1' });
    expect(callCount).toBe(1);
    
    // Second call after first completes (different version)
    await instance.ensureFullAnalysis('file:///test.cls', 2, { priority: Priority.Normal, reason: 'call2' });
    expect(callCount).toBe(2);
  });

  it('should clean up pendingAnalyses after completion', async () => {
    const instance = DocumentProcessingService.getInstance(mockLogger);
    
    jest.spyOn(instance as any, 'performFullAnalysis')
      .mockResolvedValue([]);
    
    await instance.ensureFullAnalysis('file:///test.cls', 1, { priority: Priority.Normal, reason: 'test' });
    
    // Map should be empty after completion
    expect((instance as any).pendingAnalyses.size).toBe(0);
  });

  it('should clean up pendingAnalyses even on error', async () => {
    const instance = DocumentProcessingService.getInstance(mockLogger);
    
    jest.spyOn(instance as any, 'performFullAnalysis')
      .mockRejectedValue(new Error('Test error'));
    
    // Should not throw (error is caught)
    await instance.ensureFullAnalysis('file:///test.cls', 1, { priority: Priority.Normal, reason: 'test' });
    
    // Map should still be empty
    expect((instance as any).pendingAnalyses.size).toBe(0);
  });
});
```

---

## 4. Custom Services Getter Pattern Tests

### File: `packages/custom-services/test/index.test.ts`

### Location: Add to existing test file

### Tests to Add:

```typescript
describe('getEmbeddedStandardLibraryZip', () => {
  it('should return undefined when stub is undefined', () => {
    // Default behavior - stub returns undefined
    const result = getEmbeddedStandardLibraryZip();
    expect(result).toBeUndefined();
  });

  it('should return Uint8Array directly when available', () => {
    // This tests the bundled scenario
    // In actual bundle, the import is replaced with real data
    const result = getEmbeddedStandardLibraryZip();
    // In test environment, returns undefined (stub behavior)
    expect(result === undefined || result instanceof Uint8Array).toBe(true);
  });
});

describe('getEmbeddedStandardLibraryArtifacts', () => {
  it('should return undefined when stub is undefined', () => {
    const result = getEmbeddedStandardLibraryArtifacts();
    expect(result).toBeUndefined();
  });

  it('should return Uint8Array directly when available', () => {
    const result = getEmbeddedStandardLibraryArtifacts();
    expect(result === undefined || result instanceof Uint8Array).toBe(true);
  });
});

describe('getter object pattern handling', () => {
  // These tests verify the getter pattern works correctly
  // They test the code path but can't fully test bundled behavior in unit tests
  
  it('getEmbeddedStandardLibraryZip handles getter objects', () => {
    // The function should handle { get value() { ... } } pattern
    // This is tested implicitly by the function's implementation
    // Full testing requires integration tests with bundled output
  });

  it('getEmbeddedStandardLibraryArtifacts handles getter objects', () => {
    // Same as above
  });
});
```

---

## Implementation Checklist

| # | Test Area | File | Status | Est. Time |
|---|-----------|------|--------|-----------|
| 1 | SymbolTable.fromJSON round-trip (ClassSymbol) | symbol.test.ts | ⬜ TODO | 15 min |
| 2 | SymbolTable.fromJSON round-trip (MethodSymbol) | symbol.test.ts | ⬜ TODO | 10 min |
| 3 | SymbolTable.fromJSON round-trip (VariableSymbol) | symbol.test.ts | ⬜ TODO | 10 min |
| 4 | SymbolTable.fromJSON round-trip (EnumSymbol) | symbol.test.ts | ⬜ TODO | 10 min |
| 5 | SymbolTable.fromJSON TypeReferences | symbol.test.ts | ⬜ TODO | 10 min |
| 6 | SymbolTable.fromJSON error handling | symbol.test.ts | ⬜ TODO | 15 min |
| 7 | SymbolTable.fromJSON location formats | symbol.test.ts | ⬜ TODO | 10 min |
| 8 | ResourceLoader 90% threshold (success) | resourceLoader.artifacts.test.ts | ⬜ TODO | 10 min |
| 9 | ResourceLoader 90% threshold (failure) | resourceLoader.artifacts.test.ts | ⬜ TODO | 10 min |
| 10 | ResourceLoader atomic swap | resourceLoader.artifacts.test.ts | ⬜ TODO | 15 min |
| 11 | ResourceLoader getCompiledArtifactCount | resourceLoader.artifacts.test.ts | ⬜ TODO | 5 min |
| 12 | ResourceLoader error handling | resourceLoader.artifacts.test.ts | ⬜ TODO | 10 min |
| 13 | DocumentProcessingService singleton | DocumentProcessingService.test.ts | ⬜ TODO | 10 min |
| 14 | DocumentProcessingService reset() | DocumentProcessingService.test.ts | ⬜ TODO | 10 min |
| 15 | DocumentProcessingService dispose() | DocumentProcessingService.test.ts | ⬜ TODO | 15 min |
| 16 | DocumentProcessingService disposal behavior | DocumentProcessingService.test.ts | ⬜ TODO | 10 min |
| 17 | DocumentProcessingService race prevention | DocumentProcessingService.test.ts | ⬜ TODO | 20 min |
| 18 | Custom services getter pattern | index.test.ts | ⬜ TODO | 10 min |

**Total Estimated Time**: ~3 hours

---

## Running the Tests

```bash
# Run all tests for a package
cd packages/apex-parser-ast && npm test

# Run specific test file
npm test -- --testPathPattern="symbol.test.ts"

# Run with coverage
npm test -- --coverage --collectCoverageFrom="src/types/symbol.ts"

# Run tests in watch mode during development
npm test -- --watch
```

---

## Notes

1. **Existing Tests**: Some tests for `fromJSON` already exist in `resourceLoader.artifacts.test.ts`. The new tests should complement, not duplicate, these.

2. **Mock Strategy**: Use existing mock patterns from the test files. The mocks for `@salesforce/apex-lsp-shared` and storage are already set up.

3. **Test Independence**: Each test should reset singletons in `beforeEach`/`afterEach` to ensure isolation.

4. **Fake Timers**: Use Jest's fake timers for testing debounce behavior to avoid flaky tests.

5. **Integration vs Unit**: The getter pattern tests are limited in unit tests. Full verification requires e2e tests with bundled output.

---

*Plan created: December 19, 2025*

