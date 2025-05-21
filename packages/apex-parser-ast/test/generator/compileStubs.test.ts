/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import * as path from 'path';

import { compileStubs } from '../../src/generator/compileStubs';

describe('compileStubs', () => {
  const testDir = path.join(__dirname, 'test-files');
  const outputDir = path.join(testDir, 'output');

  beforeEach(() => {
    // Create test directory structure
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should find and compile Apex files', async () => {
    // Create test Apex files
    const namespace = 'TestNamespace';
    const className = 'TestClass';
    const namespaceDir = path.join(testDir, namespace);
    fs.mkdirSync(namespaceDir, { recursive: true });

    const apexContent = `
      public class ${className} {
        public String testField;
        public void testMethod() {}
      }
    `;
    fs.writeFileSync(path.join(namespaceDir, `${className}.cls`), apexContent);

    // Run compilation
    await compileStubs([`${namespace}/${className}.cls`], testDir, outputDir);

    // Verify output
    const outputPath = path.join(
      outputDir,
      `${namespace}/${className}.ast.json`,
    );
    expect(fs.existsSync(outputPath)).toBe(true);

    const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    expect(output.namespace).toBe(namespace);
    expect(Array.isArray(output.symbolTable.symbols)).toBe(true);
    expect(output.symbolTable.symbols.length).toBeGreaterThan(0);
  });

  it('should handle invalid Apex files', async () => {
    // Create invalid Apex file
    const namespace = 'TestNamespace';
    const className = 'InvalidClass';
    const namespaceDir = path.join(testDir, namespace);
    fs.mkdirSync(namespaceDir, { recursive: true });

    const invalidContent = `
      public class ${className} {
        // Missing closing brace
    `;
    fs.writeFileSync(
      path.join(namespaceDir, `${className}.cls`),
      invalidContent,
    );

    // Run compilation
    await compileStubs([`${namespace}/${className}.cls`], testDir, outputDir);

    // Verify error handling
    const summaryPath = path.join(outputDir, 'compilation-summary.json');
    expect(fs.existsSync(summaryPath)).toBe(true);

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    expect(summary.failed).toBe(1);
    expect(Array.isArray(summary.errors)).toBe(true);
    expect(summary.errors.length).toBe(1);
  });

  it('should handle enum types correctly', async () => {
    // Create test enum file
    const namespace = 'TestNamespace';
    const enumName = 'TestEnum';
    const namespaceDir = path.join(testDir, namespace);
    fs.mkdirSync(namespaceDir, { recursive: true });

    const enumContent = `
      public enum ${enumName} {
        VALUE1,
        VALUE2,
        VALUE3
      }
    `;
    fs.writeFileSync(path.join(namespaceDir, `${enumName}.cls`), enumContent);

    // Run compilation
    await compileStubs([`${namespace}/${enumName}.cls`], testDir, outputDir);

    // Verify output
    const outputPath = path.join(
      outputDir,
      `${namespace}/${enumName}.ast.json`,
    );
    expect(fs.existsSync(outputPath)).toBe(true);

    const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const enumSymbol = output.symbolTable.symbols.find(
      (s: any) => s.key === enumName,
    );
    expect(enumSymbol).toBeDefined();
    expect(enumSymbol.symbol.kind).toBe('Enum');
    expect(Array.isArray(enumSymbol.symbol.values)).toBe(true);
    expect(enumSymbol.symbol.values.length).toBe(3);
  });

  it('should handle multiple files in different namespaces', async () => {
    // Create test files in different namespaces
    const namespaces = ['Namespace1', 'Namespace2'];
    const classNames = ['Class1', 'Class2'];

    namespaces.forEach((namespace, index) => {
      const namespaceDir = path.join(testDir, namespace);
      fs.mkdirSync(namespaceDir, { recursive: true });

      const apexContent = `
        public class ${classNames[index]} {
          public String testField;
          public void testMethod() {}
        }
      `;
      fs.writeFileSync(
        path.join(namespaceDir, `${classNames[index]}.cls`),
        apexContent,
      );
    });

    // Run compilation
    await compileStubs(
      [
        `${namespaces[0]}/${classNames[0]}.cls`,
        `${namespaces[1]}/${classNames[1]}.cls`,
      ],
      testDir,
      outputDir,
    );

    // Verify outputs
    namespaces.forEach((namespace, index) => {
      const outputPath = path.join(
        outputDir,
        `${namespace}/${classNames[index]}.ast.json`,
      );
      expect(fs.existsSync(outputPath)).toBe(true);

      const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      expect(output.namespace).toBe(namespace);
      expect(Array.isArray(output.symbolTable.symbols)).toBe(true);
      expect(output.symbolTable.symbols.length).toBeGreaterThan(0);
    });
  });

  it('should create compilation summary', async () => {
    // Create test files
    const namespace = 'TestNamespace';
    const classNames = ['Class1', 'Class2', 'InvalidClass'];
    const namespaceDir = path.join(testDir, namespace);
    fs.mkdirSync(namespaceDir, { recursive: true });

    // Create valid classes
    classNames.slice(0, 2).forEach((className) => {
      const apexContent = `
        public class ${className} {
          public String testField;
          public void testMethod() {}
        }
      `;
      fs.writeFileSync(
        path.join(namespaceDir, `${className}.cls`),
        apexContent,
      );
    });

    // Create invalid class
    const invalidContent = `
      public class ${classNames[2]} {
        // Missing closing brace
    `;
    fs.writeFileSync(
      path.join(namespaceDir, `${classNames[2]}.cls`),
      invalidContent,
    );

    // Run compilation
    await compileStubs(
      classNames.map((className) => `${namespace}/${className}.cls`),
      testDir,
      outputDir,
    );

    // Verify summary
    const summaryPath = path.join(outputDir, 'compilation-summary.json');
    expect(fs.existsSync(summaryPath)).toBe(true);

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    expect(summary.total).toBe(3);
    expect(summary.successful).toBe(2);
    expect(summary.failed).toBe(1);
    expect(Array.isArray(summary.errors)).toBe(true);
    expect(summary.errors.length).toBe(1);
  });

  it('should compile standard library ConnectedAppPlugin class', async () => {
    const sourcePath = path.join(
      __dirname,
      '../../src/resources/StandardApexLibrary/Auth/ConnectedAppPlugin.cls',
    );
    const outputPath = path.join(outputDir, 'Auth/ConnectedAppPlugin.ast.json');

    // Run compilation
    await compileStubs(
      ['Auth/ConnectedAppPlugin.cls'],
      path.join(__dirname, '../../src/resources/StandardApexLibrary'),
      outputDir,
    );

    // Verify output
    expect(fs.existsSync(outputPath)).toBe(true);

    const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    expect(output.namespace).toBe('Auth');
    expect(Array.isArray(output.symbolTable.symbols)).toBe(true);

    // Verify the class symbol exists
    const classSymbol = output.symbolTable.symbols.find(
      (s: any) => s.key === 'ConnectedAppPlugin',
    );
    expect(classSymbol).toBeDefined();
    expect(classSymbol.symbol.kind).toBe('Class');
    expect(classSymbol.symbol.modifiers.visibility).toBe('global');

    // Verify methods exist
    const methods = classSymbol.symbol.methods;
    expect(methods).toBeDefined();
    expect(methods.length).toBeGreaterThan(0);

    // Verify specific methods
    const methodNames = methods.map((m: any) => m.name);
    expect(methodNames).toContain('authorize');
    expect(methodNames).toContain('customAttributes');
    expect(methodNames).toContain('modifySAMLResponse');
    expect(methodNames).toContain('refresh');
  });
});
