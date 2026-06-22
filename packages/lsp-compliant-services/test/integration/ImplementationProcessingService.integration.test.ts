/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ImplementationParams } from 'vscode-languageserver-protocol';
import { readFileSync } from 'fs';
import { join } from 'path';

import { ImplementationProcessingService } from '../../src/services/ImplementationProcessingService';
import {
  ApexSymbolManager,
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
  ResourceLoader,
  STANDARD_APEX_LIBRARY_URI,
} from '@salesforce/apex-lsp-parser-ast';
import {
  enableConsoleLogging,
  setLogLevel,
  getLogger,
} from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import { cleanupTestResources } from '../helpers/test-cleanup';

const FIXTURES_DIR = join(__dirname, '../fixtures/classes');

async function compileAndAdd(
  symbolManager: ApexSymbolManager,
  filename: string,
  uri: string,
): Promise<void> {
  const content = readFileSync(join(FIXTURES_DIR, filename), 'utf8');
  const compilerService = new CompilerService();
  const symbolTable = new SymbolTable();
  const listener = new FullSymbolCollectorListener(symbolTable);
  compilerService.compile(content, uri, listener, {});
  await Effect.runPromise(symbolManager.addSymbolTable(symbolTable, uri));
}

describe('ImplementationProcessingService Integration Tests', () => {
  let service: ImplementationProcessingService;
  let symbolManager: ApexSymbolManager;
  let resourceLoader: ResourceLoader;

  beforeAll(async () => {
    enableConsoleLogging();
    setLogLevel('error');

    (ResourceLoader as any).instance = null;
    resourceLoader = ResourceLoader.getInstance();
    await resourceLoader.initialize();
  });

  afterAll(async () => {
    await cleanupTestResources();
  });

  describe('Interface implementation', () => {
    beforeEach(async () => {
      symbolManager = new ApexSymbolManager();

      try {
        const stdlibTable =
          await resourceLoader.getSymbolTable('System/System.cls');
        if (stdlibTable) {
          await Effect.runPromise(
            symbolManager.addSymbolTable(
              stdlibTable,
              `${STANDARD_APEX_LIBRARY_URI}/System/System.cls`,
            ),
          );
        }
      } catch (_e) {
        // lazy loading handles stdlib
      }

      await compileAndAdd(
        symbolManager,
        'ImplementationInterface.cls',
        'file:///IAnimal.cls',
      );
      await compileAndAdd(
        symbolManager,
        'ImplementationClass.cls',
        'file:///Dog.cls',
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      service = new ImplementationProcessingService(getLogger(), symbolManager);
    });

    it('should find implementing class when querying an interface', async () => {
      // Query from the implementing class file at the "implements IAnimal" use site —
      // that is where TypeReferences exist for the interface name.
      const content = readFileSync(
        join(FIXTURES_DIR, 'ImplementationClass.cls'),
        'utf8',
      );
      const lines = content.split('\n');
      const lineIndex = lines.findIndex(
        (l) => l.includes('implements') && l.includes('IAnimal'),
      );
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('IAnimal');

      const params: ImplementationParams = {
        textDocument: { uri: 'file:///Dog.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await service.processImplementation(params);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      const uris = result.map((r) => r.uri);
      expect(uris).toContain('file:///Dog.cls');
    });

    it('should return empty array when cursor is not on a symbol', async () => {
      const params: ImplementationParams = {
        textDocument: { uri: 'file:///IAnimal.cls' },
        position: { line: 0, character: 0 },
      };

      const result = await service.processImplementation(params);
      expect(result).toEqual([]);
    });
  });

  describe('Abstract and virtual method implementation', () => {
    beforeEach(async () => {
      symbolManager = new ApexSymbolManager();

      try {
        const stdlibTable =
          await resourceLoader.getSymbolTable('System/System.cls');
        if (stdlibTable) {
          await Effect.runPromise(
            symbolManager.addSymbolTable(
              stdlibTable,
              `${STANDARD_APEX_LIBRARY_URI}/System/System.cls`,
            ),
          );
        }
      } catch (_e) {
        // lazy loading handles stdlib
      }

      await compileAndAdd(
        symbolManager,
        'AbstractImplementation.cls',
        'file:///AbstractBase.cls',
      );
      await compileAndAdd(
        symbolManager,
        'ConcreteImplementation.cls',
        'file:///ConcreteChild.cls',
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      service = new ImplementationProcessingService(getLogger(), symbolManager);
    });

    it('should find implementing method when querying an abstract method', async () => {
      const content = readFileSync(
        join(FIXTURES_DIR, 'AbstractImplementation.cls'),
        'utf8',
      );
      const lines = content.split('\n');
      const lineIndex = lines.findIndex((l) => l.includes('doWork'));
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('doWork');

      const params: ImplementationParams = {
        textDocument: { uri: 'file:///AbstractBase.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await service.processImplementation(params);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      const uris = result.map((r) => r.uri);
      expect(uris).toContain('file:///ConcreteChild.cls');
    });

    it('should find overriding method when querying a virtual method', async () => {
      const content = readFileSync(
        join(FIXTURES_DIR, 'AbstractImplementation.cls'),
        'utf8',
      );
      const lines = content.split('\n');
      const lineIndex = lines.findIndex((l) => l.includes('doVirtualWork'));
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('doVirtualWork');

      const params: ImplementationParams = {
        textDocument: { uri: 'file:///AbstractBase.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await service.processImplementation(params);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      const uris = result.map((r) => r.uri);
      expect(uris).toContain('file:///ConcreteChild.cls');
    });

    it('should return empty array for a regular (non-abstract, non-virtual) method', async () => {
      // ConcreteChild.doWork is an override, not abstract or virtual — querying it returns []
      const content = readFileSync(
        join(FIXTURES_DIR, 'ConcreteImplementation.cls'),
        'utf8',
      );
      const lines = content.split('\n');
      // Find override line — it has 'override' keyword, not abstract/virtual
      const lineIndex = lines.findIndex(
        (l) => l.includes('override') && l.includes('doWork'),
      );
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('doWork');

      const params: ImplementationParams = {
        textDocument: { uri: 'file:///ConcreteChild.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await service.processImplementation(params);
      expect(result).toEqual([]);
    });
  });

  describe('Multi-level inheritance', () => {
    beforeEach(async () => {
      symbolManager = new ApexSymbolManager();

      try {
        const stdlibTable =
          await resourceLoader.getSymbolTable('System/System.cls');
        if (stdlibTable) {
          await Effect.runPromise(
            symbolManager.addSymbolTable(
              stdlibTable,
              `${STANDARD_APEX_LIBRARY_URI}/System/System.cls`,
            ),
          );
        }
      } catch (_e) {
        // lazy loading handles stdlib
      }

      await compileAndAdd(
        symbolManager,
        'AbstractImplementation.cls',
        'file:///AbstractBase.cls',
      );
      await compileAndAdd(
        symbolManager,
        'ConcreteImplementation.cls',
        'file:///ConcreteChild.cls',
      );
      await compileAndAdd(
        symbolManager,
        'DeepInheritance.cls',
        'file:///GrandChild.cls',
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      service = new ImplementationProcessingService(getLogger(), symbolManager);
    });

    it('should find grandchild override when querying abstract method on grandparent', async () => {
      const content = readFileSync(
        join(FIXTURES_DIR, 'AbstractImplementation.cls'),
        'utf8',
      );
      const lines = content.split('\n');
      const lineIndex = lines.findIndex((l) => l.includes('doWork'));
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('doWork');

      const params: ImplementationParams = {
        textDocument: { uri: 'file:///AbstractBase.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await service.processImplementation(params);

      expect(result).toBeDefined();
      const uris = result.map((r) => r.uri);
      expect(uris).toContain('file:///GrandChild.cls');
    });
  });

  describe('Interface extending interface', () => {
    beforeEach(async () => {
      symbolManager = new ApexSymbolManager();

      try {
        const stdlibTable =
          await resourceLoader.getSymbolTable('System/System.cls');
        if (stdlibTable) {
          await Effect.runPromise(
            symbolManager.addSymbolTable(
              stdlibTable,
              `${STANDARD_APEX_LIBRARY_URI}/System/System.cls`,
            ),
          );
        }
      } catch (_e) {
        // lazy loading handles stdlib
      }

      await compileAndAdd(
        symbolManager,
        'ImplementationInterface.cls',
        'file:///IAnimal.cls',
      );
      await compileAndAdd(
        symbolManager,
        'SubInterface.cls',
        'file:///ISpecialAnimal.cls',
      );
      await compileAndAdd(
        symbolManager,
        'SubInterfaceImpl.cls',
        'file:///Cat.cls',
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      service = new ImplementationProcessingService(getLogger(), symbolManager);
    });

    it('should find Cat (implements ISpecialAnimal) when querying IAnimal', async () => {
      // Query from ISpecialAnimal.cls at the "extends IAnimal" use site.
      const content = readFileSync(
        join(FIXTURES_DIR, 'SubInterface.cls'),
        'utf8',
      );
      const lines = content.split('\n');
      const lineIndex = lines.findIndex(
        (l) => l.includes('extends') && l.includes('IAnimal'),
      );
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('IAnimal');

      const params: ImplementationParams = {
        textDocument: { uri: 'file:///ISpecialAnimal.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await service.processImplementation(params);

      expect(result).toBeDefined();
      const uris = result.map((r) => r.uri);
      expect(uris).toContain('file:///Cat.cls');
    });
  });
});
