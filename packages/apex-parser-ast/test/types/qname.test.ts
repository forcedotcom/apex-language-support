/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { QName } from '../../src/types/qname';

describe('QName', () => {
  test('should create QName with empty namespace', () => {
    const qname = new QName('', 'TestClass');
    expect(qname.getLocalPart()).toBe('TestClass');
    expect(qname.getNamespaceURI()).toBe('');
    expect(qname.toString()).toBe('TestClass');
  });

  test('should create QName with namespace', () => {
    const qname = new QName('com.example', 'TestClass');
    expect(qname.getLocalPart()).toBe('TestClass');
    expect(qname.getNamespaceURI()).toBe('com.example');
    expect(qname.toString()).toBe('{com.example}TestClass');
  });

  test('should create QName with namespace and prefix', () => {
    const qname = new QName('com.example', 'TestClass', 'ex');
    expect(qname.getLocalPart()).toBe('TestClass');
    expect(qname.getNamespaceURI()).toBe('com.example');
    expect(qname.getPrefix()).toBe('ex');
  });

  test('should compare QNames correctly', () => {
    const qname1 = new QName('com.example', 'TestClass');
    const qname2 = new QName('com.example', 'TestClass');
    const qname3 = new QName('com.example', 'OtherClass');

    expect(qname1.equals(qname2)).toBeTruthy();
    expect(qname1.equals(qname3)).toBeFalsy();
  });

  test('should handle toString representation', () => {
    const qname = new QName('com.example', 'TestClass');
    expect(qname.toString()).toBe('{com.example}TestClass');
  });

  test('should parse from string using valueOf', () => {
    const qname = QName.valueOf('TestClass');
    expect(qname.getLocalPart()).toBe('TestClass');
    expect(qname.getNamespaceURI()).toBe('');
  });

  test('should parse namespace and name using valueOf', () => {
    const qname = QName.valueOf('{com.example}TestClass');
    expect(qname.getLocalPart()).toBe('TestClass');
    expect(qname.getNamespaceURI()).toBe('com.example');
  });

  test('should throw error for null local part', () => {
    expect(() => {
      new QName('namespace', null as unknown as string);
    }).toThrow('local part cannot be "null" when creating a QName');
  });

  test('should throw error for null prefix', () => {
    expect(() => {
      new QName('namespace', 'localPart', null as unknown as string);
    }).toThrow('prefix cannot be "null" when creating a QName');
  });

  test('should throw error for invalid valueOf string', () => {
    expect(() => {
      QName.valueOf('{incomplete');
    }).toThrow('missing closing "}"');
  });
});
