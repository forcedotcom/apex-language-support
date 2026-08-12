/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Unit tests for apexStubGenerator.js
 * Tests the conversion of Type Stub JSON format to Apex source code
 */

import { generateApexStubs } from '../scripts/apexStubGenerator.js';

describe('apexStubGenerator', () => {
  describe('Basic Generation', () => {
    test('generates simple class with fields and methods', () => {
      const input = {
        typeStubs: [
          {
            name: 'SimpleClass',
            kind: 'CLASS',
            modifiers: ['public'],
            fields: [
              {
                name: 'myField',
                type: { name: 'String' },
                modifiers: ['public'],
              },
            ],
            methods: [
              {
                name: 'myMethod',
                returnType: { name: 'String' },
                modifiers: ['public'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('SimpleClass.cls');
      expect(result[0].source).toContain('public class SimpleClass');
      expect(result[0].source).toContain('public String myField;');
      expect(result[0].source).toContain('public String myMethod()');
      expect(result[0].source).toContain('return null;');
    });

    test('generates empty class', () => {
      const input = {
        typeStubs: [
          {
            name: 'EmptyClass',
            kind: 'CLASS',
            modifiers: ['global'],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('EmptyClass.cls');
      expect(result[0].source).toContain('global class EmptyClass');
    });
  });

  describe('Name Demangling', () => {
    test('demangles List<T> return type', () => {
      const input = {
        typeStubs: [
          {
            name: 'GenericClass',
            kind: 'CLASS',
            modifiers: ['public'],
            methods: [
              {
                name: 'getList_rList$$lString$$r',
                returnType: { name: 'List' },
                modifiers: ['public'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain('public List<String> getList()');
    });

    test('demangles Map<K,V> return type', () => {
      const input = {
        typeStubs: [
          {
            name: 'MapClass',
            kind: 'CLASS',
            modifiers: ['public'],
            methods: [
              {
                name: 'getMap_rMap$$lString$$cInteger$$r',
                returnType: { name: 'Map' },
                modifiers: ['public'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain(
        'public Map<String, Integer> getMap()',
      );
    });

    test('demangles method with parameter position markers', () => {
      const input = {
        typeStubs: [
          {
            name: 'ComplexClass',
            kind: 'CLASS',
            modifiers: ['public'],
            methods: [
              {
                name: 'translate_rList$$lSObject$$r_0String',
                returnType: { name: 'List' },
                modifiers: ['public'],
                parameters: [
                  {
                    name: 'sObjectType',
                    type: { name: 'String' },
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain(
        'public List<SObject> translate(String sObjectType)',
      );
    });
  });

  describe('Constructor Handling', () => {
    test('converts <init> to class constructor', () => {
      const input = {
        typeStubs: [
          {
            name: 'ConstructorClass',
            kind: 'CLASS',
            modifiers: ['public'],
            methods: [
              {
                name: '<init>',
                returnType: { name: 'void' },
                modifiers: ['public'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain('public ConstructorClass() { }');
      expect(result[0].source).not.toContain('<init>');
    });

    test('converts <init> with parameters', () => {
      const input = {
        typeStubs: [
          {
            name: 'ParamConstructorClass',
            kind: 'CLASS',
            modifiers: ['public'],
            methods: [
              {
                name: '<init>',
                returnType: { name: 'void' },
                modifiers: ['public'],
                parameters: [
                  {
                    name: 'input',
                    type: { name: 'String' },
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain(
        'public ParamConstructorClass(String input) { }',
      );
    });
  });

  describe('Return Values', () => {
    test('generates correct default return values', () => {
      const input = {
        typeStubs: [
          {
            name: 'ReturnClass',
            kind: 'CLASS',
            modifiers: ['public'],
            methods: [
              {
                name: 'getVoid',
                returnType: { name: 'void' },
                modifiers: ['public'],
                parameters: [],
              },
              {
                name: 'getBoolean',
                returnType: { name: 'Boolean' },
                modifiers: ['public'],
                parameters: [],
              },
              {
                name: 'getInteger',
                returnType: { name: 'Integer' },
                modifiers: ['public'],
                parameters: [],
              },
              {
                name: 'getLong',
                returnType: { name: 'Long' },
                modifiers: ['public'],
                parameters: [],
              },
              {
                name: 'getDouble',
                returnType: { name: 'Double' },
                modifiers: ['public'],
                parameters: [],
              },
              {
                name: 'getString',
                returnType: { name: 'String' },
                modifiers: ['public'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain('public void getVoid() { }');
      expect(result[0].source).toContain(
        'public Boolean getBoolean() { return false; }',
      );
      expect(result[0].source).toContain(
        'public Integer getInteger() { return 0; }',
      );
      expect(result[0].source).toContain(
        'public Long getLong() { return 0L; }',
      );
      expect(result[0].source).toContain(
        'public Double getDouble() { return 0.0; }',
      );
      expect(result[0].source).toContain(
        'public String getString() { return null; }',
      );
    });
  });

  describe('Annotations', () => {
    test('handles string annotations', () => {
      const input = {
        typeStubs: [
          {
            name: 'AnnotatedClass',
            kind: 'CLASS',
            modifiers: ['global'],
            annotations: ['IsTest'],
            methods: [
              {
                name: 'testMethod',
                returnType: { name: 'void' },
                modifiers: ['public', 'static'],
                annotations: ['IsTest'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain('@IsTest');
    });

    test('handles object annotations with parameters', () => {
      const input = {
        typeStubs: [
          {
            name: 'AuraClass',
            kind: 'CLASS',
            modifiers: ['public'],
            methods: [
              {
                name: 'auraMethod',
                returnType: { name: 'String' },
                modifiers: ['public', 'static'],
                annotations: [
                  {
                    name: 'AuraEnabled',
                    parameters: {
                      cacheable: 'true',
                    },
                  },
                ],
                parameters: [],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain('@AuraEnabled(cacheable=true)');
    });

    test('rejects unsafe object annotation syntax', () => {
      expect(() =>
        generateApexStubs({
          typeStubs: [
            {
              name: 'UnsafeAnnotation',
              kind: 'CLASS',
              annotations: [{ name: 'RestResource\npublic class Injected' }],
            },
          ],
        }),
      ).toThrow('Invalid annotation name');
    });

    test('formats type annotations with Apex string literals', () => {
      const input = {
        typeStubs: [
          {
            name: 'RestClass',
            kind: 'CLASS',
            modifiers: ['global'],
            annotations: [
              {
                name: 'RestResource',
                parameters: {
                  urlMapping: "/cases/'active'",
                  enabled: false,
                  version: 1,
                },
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain(
        "@RestResource(urlMapping='/cases/\\'active\\'', enabled=false, version=1)",
      );
      expect(result[0].source).not.toContain('[object Object]');
    });
  });

  describe('Properties', () => {
    test('generates automatic properties', () => {
      const input = {
        typeStubs: [
          {
            name: 'PropertyClass',
            kind: 'CLASS',
            modifiers: ['public'],
            properties: [
              {
                name: 'AutoProp',
                type: { name: 'String' },
                modifiers: ['public'],
                getter: { modifiers: [], hasBody: false },
                setter: { modifiers: [], hasBody: false },
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain(
        'public String AutoProp { get; set; }',
      );
    });

    test('generates properties with custom accessors', () => {
      const input = {
        typeStubs: [
          {
            name: 'CustomPropertyClass',
            kind: 'CLASS',
            modifiers: ['public'],
            properties: [
              {
                name: 'CustomProp',
                type: { name: 'Integer' },
                modifiers: ['public'],
                getter: { modifiers: [], hasBody: true },
                setter: { modifiers: ['private'], hasBody: true },
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain(
        'public Integer CustomProp { get { return 0; } private set { } }',
      );
    });
  });

  describe('Triggers', () => {
    test('generates trigger with handler class', () => {
      const input = {
        typeStubs: [
          {
            name: '__sfdc_trigger.AccountTrigger',
            kind: 'TRIGGER',
            triggerObjectType: { name: 'Account' },
            methods: [
              {
                name: 'handleBeforeInsert',
                returnType: { name: 'void' },
                modifiers: ['public', 'static'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].filename).toBe('AccountTrigger.trigger');
      expect(result[0].source).toContain('trigger AccountTrigger on Account');
      expect(result[0].source).toContain('before insert');
      expect(result[0].source).toContain('after undelete');
      expect(result[0].source).toContain('public class AccountTriggerHandler');
      expect(result[0].source).toContain(
        'public static void handleBeforeInsert() { }',
      );
    });
  });

  describe('Inner Types', () => {
    test('generates inner classes', () => {
      const input = {
        typeStubs: [
          {
            name: 'OuterClass',
            kind: 'CLASS',
            modifiers: ['public'],
            innerTypes: [
              {
                name: 'InnerClass',
                kind: 'CLASS',
                modifiers: ['public'],
                methods: [
                  {
                    name: 'innerMethod',
                    returnType: { name: 'String' },
                    modifiers: ['public'],
                    parameters: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain('public class OuterClass');
      expect(result[0].source).toContain('public class InnerClass');
      expect(result[0].source).toContain('public String innerMethod()');
    });
  });

  describe('Abstract Classes', () => {
    test('generates abstract class with abstract methods', () => {
      const input = {
        typeStubs: [
          {
            name: 'AbstractClass',
            kind: 'CLASS',
            modifiers: ['public', 'abstract'],
            methods: [
              {
                name: 'abstractMethod',
                returnType: { name: 'String' },
                modifiers: ['public', 'abstract'],
                parameters: [],
              },
              {
                name: 'concreteMethod',
                returnType: { name: 'Integer' },
                modifiers: ['public'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain('public abstract class AbstractClass');
      expect(result[0].source).toContain(
        'public abstract String abstractMethod();',
      );
      expect(result[0].source).not.toContain('abstractMethod() {');
      expect(result[0].source).toContain(
        'public Integer concreteMethod() { return 0; }',
      );
    });
  });

  describe('Interfaces', () => {
    test('generates interface', () => {
      const input = {
        typeStubs: [
          {
            name: 'MyInterface',
            kind: 'INTERFACE',
            modifiers: ['public'],
            methods: [
              {
                name: 'interfaceMethod',
                returnType: { name: 'void' },
                modifiers: ['public'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain('public interface MyInterface');
      expect(result[0].source).toContain('public void interfaceMethod();');
    });
  });

  describe('Enums', () => {
    test('generates enum', () => {
      const input = {
        typeStubs: [
          {
            name: 'MyEnum',
            kind: 'ENUM',
            modifiers: ['public'],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain('public enum MyEnum');
    });
  });

  describe('Extends and Implements', () => {
    test('generates class with extends', () => {
      const input = {
        typeStubs: [
          {
            name: 'ChildClass',
            kind: 'CLASS',
            modifiers: ['public'],
            superClass: { name: 'ParentClass' },
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain(
        'public class ChildClass extends ParentClass',
      );
    });

    test('generates class with implements', () => {
      const input = {
        typeStubs: [
          {
            name: 'ImplClass',
            kind: 'CLASS',
            modifiers: ['public'],
            interfaces: [{ name: 'Interface1' }, { name: 'Interface2' }],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain(
        'public class ImplClass implements Interface1, Interface2',
      );
    });

    test('skips extends when superClass name is empty', () => {
      const input = {
        typeStubs: [
          {
            name: 'NoSuperClass',
            kind: 'CLASS',
            modifiers: ['public'],
            superClass: { name: '' },
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).not.toContain('extends');
      expect(result[0].source).toContain('public class NoSuperClass {');
    });
  });

  describe('Namespace Handling', () => {
    test('handles dotted class names', () => {
      const input = {
        typeStubs: [
          {
            name: 'ExternalService.MyClass',
            kind: 'CLASS',
            modifiers: ['public'],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].filename).toBe('MyClass.cls');
      expect(result[0].source).toContain('public class MyClass');
    });

    test('writes a bare filename within a namespace directory', () => {
      const input = {
        typeStubs: [
          {
            name: 'MyClass',
            namespacePrefix: 'myns',
            kind: 'CLASS',
            modifiers: ['public'],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].filename).toBe('MyClass.cls');
    });

    test('handles namespace prefix in type references', () => {
      const input = {
        typeStubs: [
          {
            name: 'MyClass',
            kind: 'CLASS',
            modifiers: ['public'],
            fields: [
              {
                name: 'myField',
                type: { name: 'OtherClass', namespacePrefix: 'myns' },
                modifiers: ['public'],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).toContain('public myns.OtherClass myField;');
    });

    test('does not prefix filename for System namespace', () => {
      const input = {
        typeStubs: [
          {
            name: 'String',
            namespacePrefix: 'System',
            kind: 'CLASS',
            modifiers: ['global'],
          },
        ],
      };

      const result = generateApexStubs(input);

      // System namespace should NOT be prefixed in filename
      expect(result[0].filename).toBe('String.cls');
      expect(result[0].filename).not.toBe('System_String.cls');
    });
  });

  describe('Generic Type Workarounds', () => {
    test('strips generic parameters from filename (W-23491682)', () => {
      const input = {
        typeStubs: [
          {
            name: 'List<T>',
            namespacePrefix: 'System',
            kind: 'CLASS',
            modifiers: ['global'],
          },
          {
            name: 'Map<K,V>',
            namespacePrefix: 'System',
            kind: 'CLASS',
            modifiers: ['global'],
          },
          {
            name: 'Set<T>',
            namespacePrefix: 'System',
            kind: 'CLASS',
            modifiers: ['global'],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result).toHaveLength(3);
      // Filenames should have generic parameters stripped
      expect(result[0].filename).toBe('List.cls');
      expect(result[1].filename).toBe('Map.cls');
      expect(result[2].filename).toBe('Set.cls');
      // Apex does not support generic type declarations.
      expect(result[0].source).toContain('global class List {');
      expect(result[1].source).toContain('global class Map {');
      expect(result[2].source).toContain('global class Set {');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty typeStubs array', () => {
      const input = {
        typeStubs: [],
      };

      const result = generateApexStubs(input);

      expect(result).toHaveLength(0);
    });

    test('handles missing optional fields', () => {
      const input = {
        typeStubs: [
          {
            name: 'MinimalClass',
            kind: 'CLASS',
            modifiers: ['public'],
            // No fields, properties, methods, etc.
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result).toHaveLength(1);
      expect(result[0].source).toContain('public class MinimalClass {');
    });

    test('filters out clone methods', () => {
      const input = {
        typeStubs: [
          {
            name: 'ClonableClass',
            kind: 'CLASS',
            modifiers: ['public'],
            methods: [
              {
                name: 'clone',
                returnType: { name: 'ClonableClass' },
                modifiers: ['public'],
                parameters: [],
              },
              {
                name: 'otherMethod',
                returnType: { name: 'void' },
                modifiers: ['public'],
                parameters: [],
              },
            ],
          },
        ],
      };

      const result = generateApexStubs(input);

      expect(result[0].source).not.toContain('clone()');
      expect(result[0].source).toContain('otherMethod()');
    });
  });
});
