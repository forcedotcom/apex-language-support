/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { hash } from '../utils/utils';

/**
 * This class is a TypeScript implementation of the Java class javax.xml.namespace.QName.
 * It was extracted and adapted from the original Java source code.
 *
 * The QName class represents a qualified name as defined in XML specifications.
 * It includes a namespace URI, a local part, and an optional prefix.
 */
export class QName {
  private static readonly serialVersionUID = -9120448754896609940;
  private readonly namespaceURI: string;
  private readonly localPart: string;
  private readonly prefix: string;

  constructor(namespaceURI: string, localPart: string, prefix: string = '') {
    this.namespaceURI = namespaceURI ?? '';

    if (localPart == null) {
      throw new Error('local part cannot be "null" when creating a QName');
    }
    this.localPart = localPart;

    if (prefix == null) {
      throw new Error('prefix cannot be "null" when creating a QName');
    }
    this.prefix = prefix;
  }

  static valueOf(qNameAsString: string): QName {
    if (qNameAsString == null || qNameAsString.length === 0) {
      throw new Error('cannot create QName from "null" or "" String');
    }

    if (qNameAsString.charAt(0) !== '{') {
      return new QName('', qNameAsString, '');
    }

    if (qNameAsString.startsWith('{}')) {
      const prolog = '`Namespace URI .equals(XMLConstants.NULL_NS_URI), .equals(\"\"), only the local part, \"';
      throw new Error(`${prolog}${qNameAsString.substring(2 + ''.length)}\", should be provided.`);
    }

    const endOfNamespaceURI = qNameAsString.indexOf('}');
    if (endOfNamespaceURI === -1) {
      throw new Error(`cannot create QName from \"${qNameAsString}\", missing closing \"}\"`);
    }

    return new QName(qNameAsString.substring(1, endOfNamespaceURI), qNameAsString.substring(endOfNamespaceURI + 1), '');
  }

  getNamespaceURI(): string {
    return this.namespaceURI;
  }

  getLocalPart(): string {
    return this.localPart;
  }

  getPrefix(): string {
    return this.prefix;
  }

  equals(objectToTest: unknown): boolean {
    if (objectToTest === this) {
      return true;
    }

    if (objectToTest instanceof QName) {
      const qName = objectToTest as QName;
      return this.localPart === qName.localPart && this.namespaceURI === qName.namespaceURI;
    }

    return false;
  }

  hashCode(): number {
    return hash(this.namespaceURI, this.localPart);
  }

  toString(): string {
    return this.namespaceURI === '' ? this.localPart : `{${this.namespaceURI}}${this.localPart}`;
  }
}
