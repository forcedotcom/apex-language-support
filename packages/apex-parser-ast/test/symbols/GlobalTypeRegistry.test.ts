/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  GlobalTypeRegistry,
  TypeRegistryEntry,
} from '../../src/symbols/GlobalTypeRegistry';
import { SymbolKind } from '../../src/types/symbol';

describe('GlobalTypeRegistry', () => {
  let registry: GlobalTypeRegistry;

  beforeEach(() => {
    // Reset singleton for each test
    GlobalTypeRegistry.resetInstance();
    registry = GlobalTypeRegistry.getInstance();
  });

  afterEach(() => {
    registry.clear();
  });

  describe('registerType', () => {
    it('should register a single type', () => {
      const entry: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      registry.registerType(entry);

      expect(registry.size()).toBe(1);
      expect(registry.hasType('system.exception')).toBe(true);
      expect(registry.hasType('System.Exception')).toBe(true); // Case-insensitive
    });

    it('should handle multiple types in same namespace', () => {
      const exception: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      const string: TypeRegistryEntry = {
        fqn: 'system.string',
        name: 'String',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-string-id',
        fileUri: 'apex://stdlib/System/String',
        isStdlib: true,
      };

      registry.registerType(exception);
      registry.registerType(string);

      expect(registry.size()).toBe(2);
      const systemTypes = registry.getTypesInNamespace('System');
      expect(systemTypes).toHaveLength(2);
    });

    it('should handle interfaces', () => {
      const comparable: TypeRegistryEntry = {
        fqn: 'system.comparable',
        name: 'Comparable',
        namespace: 'System',
        kind: SymbolKind.Interface,
        symbolId: 'system-comparable-id',
        fileUri: 'apex://stdlib/System/Comparable',
        isStdlib: true,
      };

      registry.registerType(comparable);

      const retrieved = registry.getType('system.comparable');
      expect(retrieved).toBeDefined();
      expect(retrieved?.kind).toBe(SymbolKind.Interface);
    });
  });

  describe('resolveType', () => {
    beforeEach(() => {
      // Register some standard types
      const types: TypeRegistryEntry[] = [
        {
          fqn: 'system.exception',
          name: 'Exception',
          namespace: 'System',
          kind: SymbolKind.Class,
          symbolId: 'system-exception-id',
          fileUri: 'apex://stdlib/System/Exception',
          isStdlib: true,
        },
        {
          fqn: 'system.string',
          name: 'String',
          namespace: 'System',
          kind: SymbolKind.Class,
          symbolId: 'system-string-id',
          fileUri: 'apex://stdlib/System/String',
          isStdlib: true,
        },
        {
          fqn: 'database.querylocator',
          name: 'QueryLocator',
          namespace: 'Database',
          kind: SymbolKind.Class,
          symbolId: 'database-querylocator-id',
          fileUri: 'apex://stdlib/Database/QueryLocator',
          isStdlib: true,
        },
        {
          fqn: 'myapp.exception',
          name: 'Exception',
          namespace: 'MyApp',
          kind: SymbolKind.Class,
          symbolId: 'myapp-exception-id',
          fileUri: 'file:///MyApp/Exception.cls',
          isStdlib: false,
        },
      ];

      types.forEach((type) => registry.registerType(type));
    });

    it('should resolve fully qualified names', () => {
      const result = registry.resolveType('System.Exception');
      expect(result).toBeDefined();
      expect(result?.fqn).toBe('system.exception');
      expect(result?.name).toBe('Exception');
    });

    it('should resolve unqualified names with System priority', () => {
      // Should find System.Exception, not MyApp.Exception
      const result = registry.resolveType('Exception');
      expect(result).toBeDefined();
      expect(result?.namespace).toBe('System');
    });

    it('should resolve with current namespace context', () => {
      // When in MyApp namespace, should prefer MyApp.Exception
      const result = registry.resolveType('Exception', {
        currentNamespace: 'MyApp',
      });
      expect(result).toBeDefined();
      expect(result?.namespace).toBe('MyApp');
    });

    it('should use namespace preference order', () => {
      // Prefer Database over System
      const result = registry.resolveType('QueryLocator', {
        namespacePreference: ['Database', 'System'],
      });
      expect(result).toBeDefined();
      expect(result?.namespace).toBe('Database');
    });

    it('should handle case-insensitive lookups', () => {
      const result1 = registry.resolveType('exception');
      const result2 = registry.resolveType('EXCEPTION');
      const result3 = registry.resolveType('Exception');

      expect(result1?.fqn).toBe(result2?.fqn);
      expect(result2?.fqn).toBe(result3?.fqn);
    });

    it('should return undefined for non-existent types', () => {
      const result = registry.resolveType('NonExistentClass');
      expect(result).toBeUndefined();
    });

    it('should handle single candidate efficiently', () => {
      const result = registry.resolveType('String');
      expect(result).toBeDefined();
      expect(result?.name).toBe('String');
    });
  });

  describe('getType', () => {
    it('should retrieve type by FQN', () => {
      const entry: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      registry.registerType(entry);

      const result = registry.getType('system.exception');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Exception');
    });

    it('should be case-insensitive', () => {
      const entry: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      registry.registerType(entry);

      expect(registry.getType('System.Exception')).toBeDefined();
      expect(registry.getType('SYSTEM.EXCEPTION')).toBeDefined();
    });
  });

  describe('getTypesInNamespace', () => {
    it('should return all types in a namespace', () => {
      const types: TypeRegistryEntry[] = [
        {
          fqn: 'system.exception',
          name: 'Exception',
          namespace: 'System',
          kind: SymbolKind.Class,
          symbolId: 'system-exception-id',
          fileUri: 'apex://stdlib/System/Exception',
          isStdlib: true,
        },
        {
          fqn: 'system.string',
          name: 'String',
          namespace: 'System',
          kind: SymbolKind.Class,
          symbolId: 'system-string-id',
          fileUri: 'apex://stdlib/System/String',
          isStdlib: true,
        },
        {
          fqn: 'database.querylocator',
          name: 'QueryLocator',
          namespace: 'Database',
          kind: SymbolKind.Class,
          symbolId: 'database-querylocator-id',
          fileUri: 'apex://stdlib/Database/QueryLocator',
          isStdlib: true,
        },
      ];

      types.forEach((type) => registry.registerType(type));

      const systemTypes = registry.getTypesInNamespace('System');
      expect(systemTypes).toHaveLength(2);
      expect(systemTypes.map((t) => t.name).sort()).toEqual([
        'Exception',
        'String',
      ]);

      const databaseTypes = registry.getTypesInNamespace('Database');
      expect(databaseTypes).toHaveLength(1);
    });

    it('should be case-insensitive for namespace', () => {
      const entry: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      registry.registerType(entry);

      expect(registry.getTypesInNamespace('system')).toHaveLength(1);
      expect(registry.getTypesInNamespace('SYSTEM')).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should track registration statistics', () => {
      const stdlibType: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      const userType: TypeRegistryEntry = {
        fqn: 'myapp.customexception',
        name: 'CustomException',
        namespace: 'MyApp',
        kind: SymbolKind.Class,
        symbolId: 'myapp-customexception-id',
        fileUri: 'file:///MyApp/CustomException.cls',
        isStdlib: false,
      };

      registry.registerType(stdlibType);
      registry.registerType(userType);

      const stats = registry.getStats();
      expect(stats.totalTypes).toBe(2);
      expect(stats.stdlibTypes).toBe(1);
      expect(stats.userTypes).toBe(1);
    });

    it('should track lookup statistics', () => {
      const entry: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
        isInterface: false,
      };

      registry.registerType(entry);

      // Perform lookups
      registry.resolveType('Exception'); // Hit
      registry.resolveType('NonExistent'); // Miss
      registry.resolveType('Exception'); // Hit

      const stats = registry.getStats();
      expect(stats.lookupCount).toBe(3);
      expect(stats.hitCount).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('clear', () => {
    it('should clear all entries and reset statistics', () => {
      const entry: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      registry.registerType(entry);
      registry.resolveType('Exception');

      expect(registry.size()).toBe(1);

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.hasType('system.exception')).toBe(false);

      const stats = registry.getStats();
      expect(stats.totalTypes).toBe(0);
      expect(stats.lookupCount).toBe(0);
    });
  });
});
