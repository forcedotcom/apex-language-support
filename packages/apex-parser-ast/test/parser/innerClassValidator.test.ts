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
import { ErrorType } from '../../src/parser/listeners/ApexErrorListener';

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

  it('should parse ClassWithVirtualInnerClass with complex inner class hierarchy', () => {
    const fileContent = `
      public class ClassWithVirtualInnerClass{

        public virtual class VirtualInnerClass extends Metadata {

          public String color;

          public Boolean default_x;

          public String description;

          public Boolean isActive;

        }

        public class InnerClassExtendsVirtualClass extends VirtualInnerClass {

          public String type = 'InnerClassExtendsVirtualClass';

          public String fullName;

          private String[] fullName_type_info = new String[]{
            'fullName','SOAP_M_URI',null,'0','1','false'
          };

          public String color;

          public Boolean default_x;

          public String description;

          public Boolean isActive;

          private String[] color_type_info = new String[]{
            'color','SOAP_M_URI',null,'0','1','false'
          };

          private String[] default_x_type_info = new String[]{
            'default','SOAP_M_URI',null,'1','1','false'
          };

          private String[] description_type_info = new String[]{
            'description','SOAP_M_URI',null,'0','1','false'
          };

          private String[] isActive_type_info = new String[]{
            'isActive','SOAP_M_URI',null,'0','1','false'
          };

          public Boolean allowEmail;

          public Boolean closed;

          public String[] controllingFieldValues;

          public Boolean converted;

          public Boolean cssExposed;

          public String forecastCategory;

          public Boolean highPriority;

          public Integer probability;

          public String reverseRole;

          public Boolean reviewed;

          public Boolean won;

          private String[] allowEmail_type_info = new String[]{
            'allowEmail','SOAP_M_URI',null,'0','1','false'
          };

          private String[] closed_type_info = new String[]{
            'closed','SOAP_M_URI',null,'0','1','false'
          };

          private String[] controllingFieldValues_type_info = new String[]{
            'controllingFieldValues','SOAP_M_URI',null,'0','-1','false'
          };

          private String[] converted_type_info = new String[]{
            'converted','SOAP_M_URI',null,'0','1','false'
          };

          private String[] cssExposed_type_info = new String[]{
            'cssExposed','SOAP_M_URI',null,'0','1','false'
          };

          private String[] forecastCategory_type_info = new String[]{
            'forecastCategory','SOAP_M_URI',null,'0','1','false'
          };

          private String[] highPriority_type_info = new String[]{
            'highPriority','SOAP_M_URI',null,'0','1','false'
          };

          private String[] probability_type_info = new String[]{
            'probability','SOAP_M_URI',null,'0','1','false'
          };

          private String[] reverseRole_type_info = new String[]{
            'reverseRole','SOAP_M_URI',null,'0','1','false'
          };

          private String[] reviewed_type_info = new String[]{
            'reviewed','SOAP_M_URI',null,'0','1','false'
          };

          private String[] won_type_info = new String[]{
            'won','SOAP_M_URI',null,'0','1','false'
          };

          private String[] apex_schema_type_info = new String[]{
            'SOAP_M_URI','true','false'
          };

          private String[] type_att_info = new String[]{'xsi:type'};

          private String[] field_order_type_info = new String[]{
            'fullName','color','default_x','description','isActive',
            'allowEmail','closed','controllingFieldValues','converted',
            'cssExposed','forecastCategory','highPriority','probability',
            'reverseRole','reviewed','won'
          };

        }

        public virtual class Metadata {

          public String fullName;

        }

      }
    `;

    const result: CompilationResult<SymbolTable> = compilerService.compile(
      fileContent,
      'ClassWithVirtualInnerClass.cls',
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

    // Verify that the parser successfully created the symbol table
    expect(result.result).toBeDefined();
    const symbolTable = result.result;
    expect(symbolTable).toBeDefined();
    expect(symbolTable?.getAllSymbols().length).toBeGreaterThan(0);
  });
  it('should parse ClassWithVirtualInnerClass with complex inner class hierarchy w/errors', () => {
    const fileContent = `
      public class ClassWithVirtualInnerClass{

        public virtial String badBunny;

        public virtual class VirtualInnerClass extends Metadata {

          public String color;

          public Boolean default_x;

          public String description;

          public Boolean isActive;

        }

        public class InnerClassExtendsVirtualClass extends VirtualInnerClass {

          public String type = 'InnerClassExtendsVirtualClass';

          public String fullName;

          private String[] fullName_type_info = new String[]{
            'fullName','SOAP_M_URI',null,'0','1','false'
          };

          public String color;

          public Boolean default_x;

          public String description;

          public Boolean isActive;

          private String[] color_type_info = new String[]{
            'color','SOAP_M_URI',null,'0','1','false'
          };

          private String[] default_x_type_info = new String[]{
            'default','SOAP_M_URI',null,'1','1','false'
          };

          private String[] description_type_info = new String[]{
            'description','SOAP_M_URI',null,'0','1','false'
          };

          private String[] isActive_type_info = new String[]{
            'isActive','SOAP_M_URI',null,'0','1','false'
          };

          public Boolean allowEmail;

          public Boolean closed;

          public String[] controllingFieldValues;

          public Boolean converted;

          public Boolean cssExposed;

          public String forecastCategory;

          public Boolean highPriority;

          public Integer probability;

          public String reverseRole;

          public Boolean reviewed;

          public Boolean won;

          private String[] allowEmail_type_info = new String[]{
            'allowEmail','SOAP_M_URI',null,'0','1','false'
          };

          private String[] closed_type_info = new String[]{
            'closed','SOAP_M_URI',null,'0','1','false'
          };

          private String[] controllingFieldValues_type_info = new String[]{
            'controllingFieldValues','SOAP_M_URI',null,'0','-1','false'
          };

          private String[] converted_type_info = new String[]{
            'converted','SOAP_M_URI',null,'0','1','false'
          };

          private String[] cssExposed_type_info = new String[]{
            'cssExposed','SOAP_M_URI',null,'0','1','false'
          };

          private String[] forecastCategory_type_info = new String[]{
            'forecastCategory','SOAP_M_URI',null,'0','1','false'
          };

          private String[] highPriority_type_info = new String[]{
            'highPriority','SOAP_M_URI',null,'0','1','false'
          };

          private String[] probability_type_info = new String[]{
            'probability','SOAP_M_URI',null,'0','1','false'
          };

          private String[] reverseRole_type_info = new String[]{
            'reverseRole','SOAP_M_URI',null,'0','1','false'
          };

          private String[] reviewed_type_info = new String[]{
            'reviewed','SOAP_M_URI',null,'0','1','false'
          };

          private String[] won_type_info = new String[]{
            'won','SOAP_M_URI',null,'0','1','false'
          };

          private String[] apex_schema_type_info = new String[]{
            'SOAP_M_URI','true','false'
          };

          private String[] type_att_info = new String[]{'xsi:type'};

          private String[] field_order_type_info = new String[]{
            'fullName','color','default_x','description','isActive',
            'allowEmail','closed','controllingFieldValues','converted',
            'cssExposed','forecastCategory','highPriority','probability',
            'reverseRole','reviewed','won'
          };

        }

        public virtual class Metadata {

          public String fullName;

        }

      }
    `;

    const result: CompilationResult<SymbolTable> = compilerService.compile(
      fileContent,
      'ClassWithVirtualInnerClass.cls',
      listener,
    );

    // Check for expected errors
    // Note: "Invalid syntax: virtial" semantic error is no longer reported
    // because error nodes are already captured as syntax errors and shouldn't
    // be reported again as semantic errors (prevents duplicate error reporting)

    const virtualFieldErrors = result.errors.filter(
      (e) =>
        e.type === ErrorType.Semantic &&
        e.message.includes("Field cannot be declared as 'virtual'"),
    );

    const syntaxErrors = result.errors.filter(
      (e) =>
        e.type === ErrorType.Syntax &&
        e.message.includes(
          "no viable alternative at input 'virtial String badBunny'",
        ),
    );

    // Verify that the expected errors are present
    // Syntax error for "virtual" is reported (not as semantic error anymore)
    // Note: There are no virtual fields in the test code, so virtualFieldErrors should be 0
    // The test code only has a typo "virtial" which is caught as a syntax error
    expect(virtualFieldErrors.length).toBe(0);
    expect(syntaxErrors.length).toBe(1);
    expect(result.errors.length).toBe(1);

    // Verify inner class structure is not affected by these errors
    const innerClassErrors = result.errors.filter(
      (e) =>
        e.type === ErrorType.Semantic &&
        (e.message.includes('inner class') ||
          e.message.includes('Inner class')),
    );

    expect(innerClassErrors.length).toBe(0);
  });
});
