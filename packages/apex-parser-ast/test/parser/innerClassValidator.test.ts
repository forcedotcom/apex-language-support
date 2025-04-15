/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompilerService,
  CompilationResult,
  ApexSymbolCollectorListener,
  SymbolTable,
} from '../../src';
import { ErrorType } from '../../src/parser/listeners/ApexErrorListener.js';

describe('Inner Class Validation', () => {
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;

  beforeEach(() => {
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
  });

  it('should detect inner class with the same name as the outer class', () => {
    const fileContent = `
      public class OuterClass {
        // Inner class with the same name as the outer class (not allowed)
        public class OuterClass {
          public void method() {
            System.debug('Inner method');
          }
        }
      }
    `;

    const result: CompilationResult<SymbolTable> = compilerService.compile(
      fileContent,
      'OuterClass.cls',
      listener,
    );

    // Filter for semantic errors related to inner class naming
    const innerClassNameErrors = result.errors.filter(
      (e) =>
        e.type === ErrorType.Semantic &&
        e.message.includes('cannot have the same name as its outer class'),
    );

    expect(innerClassNameErrors.length).toBeGreaterThan(0);
  });

  it('should detect nested inner classes (inner class within another inner class)', () => {
    const fileContent = `
      public class OuterClass {
        // First level inner class
        public class FirstInnerClass {
          // Second level inner class (not allowed)
          public class SecondInnerClass {
            public void method() {
              System.debug('Nested inner method');
            }
          }
        }
      }
    `;

    const result: CompilationResult<SymbolTable> = compilerService.compile(
      fileContent,
      'OuterClass.cls',
      listener,
    );

    // Filter for semantic errors related to inner class nesting
    const nestedInnerClassErrors = result.errors.filter(
      (e) =>
        e.type === ErrorType.Semantic &&
        e.message.includes('cannot be defined within another inner class'),
    );

    expect(nestedInnerClassErrors.length).toBeGreaterThan(0);
  });

  it('should allow valid inner classes', () => {
    const fileContent = `
      public class OuterClass {
        // Valid inner class
        public class InnerClass1 {
          public void method1() {
            System.debug('Inner method 1');
          }
        }

        // Another valid inner class
        public class InnerClass2 {
          public void method2() {
            System.debug('Inner method 2');
          }
        }
      }
    `;

    const result: CompilationResult<SymbolTable> = compilerService.compile(
      fileContent,
      'OuterClass.cls',
      listener,
    );

    // Check for any semantic errors related to inner classes
    const innerClassErrors = result.errors.filter(
      (e) =>
        e.type === ErrorType.Semantic &&
        (e.message.includes('inner class') ||
          e.message.includes('Inner class')),
    );

    expect(innerClassErrors.length).toBe(0);
  });
});
