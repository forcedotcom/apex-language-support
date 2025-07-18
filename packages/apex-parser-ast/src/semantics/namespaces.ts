/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TypeInfo } from '../types/typeInfo';

/**
 * A namespace descriptor.
 */
export class Namespace {
  readonly global: string;
  readonly module: string;
  private readonly name: string;
  private nameLowerCase: string | null = null;
  private bytecodeNameLower: string | null = null;

  constructor(global: string, module: string) {
    this.global = global ?? '';
    this.module = module ?? '';
    this.name = !module ? this.global : `${this.global}__${this.module}`;
  }

  static isEmptyOrNull(namespace: Namespace | null): boolean {
    return (
      namespace == null || (namespace.global === '' && namespace.module === '')
    );
  }

  static equals(left: TypeInfo, right: TypeInfo): boolean {
    if (
      left == null ||
      right == null ||
      left.getNamespace() == null ||
      right.getNamespace() == null
    ) {
      throw new Error('TypeInfo and its namespace must not be null');
    }
    return Object.is(left.getNamespace(), right.getNamespace());
  }

  static equalsNamespaces(
    left: Namespace | null,
    right: Namespace | null,
  ): boolean {
    return Object.is(left ?? Namespaces.EMPTY, right ?? Namespaces.EMPTY);
  }

  getGlobal(): string {
    return this.global;
  }

  hasModule(): boolean {
    return !!this.module;
  }

  getModule(): string {
    return this.module;
  }

  getNameLower(): string {
    if (this.nameLowerCase === null) {
      this.nameLowerCase = this.name.toLowerCase();
    }
    return this.nameLowerCase;
  }

  getBytecodeNameLower(): string {
    if (this.bytecodeNameLower === null) {
      this.bytecodeNameLower = !this.module
        ? this.global.toLowerCase()
        : `${this.global}/${this.module}`.toLowerCase();
    }
    return this.bytecodeNameLower;
  }

  hashCode(): number {
    return this.getNameLower().length;
  }

  equals(o: unknown): boolean {
    if (this === o) {
      return true;
    }
    if (!(o instanceof Namespace)) {
      return false;
    }
    const namespace = o as Namespace;
    return this.getNameLower() === namespace.getNameLower();
  }

  toString(): string {
    return this.name;
  }

  equalsGlobal(other: Namespace): boolean {
    return this.global.toLowerCase() === other.global.toLowerCase();
  }
}

export class Namespaces {
  public static readonly EMPTY: Namespace = Namespaces.create('', '');
  public static readonly SYSTEM: Namespace = Namespaces.create('System', '');
  public static readonly SCHEMA: Namespace = Namespaces.create('Schema', '');
  public static readonly VF_COMPONENT: Namespace = Namespaces.create(
    'Component',
    '',
  );
  public static readonly VF: Namespace = Namespaces.create('c', '');
  public static readonly APEX_PAGES: Namespace = Namespaces.create(
    'ApexPages',
    '',
  );
  public static readonly APEX: Namespace = Namespaces.create('Apex', '');
  public static readonly DATABASE: Namespace = Namespaces.create(
    'Database',
    '',
  );
  public static readonly FLOW: Namespace = Namespaces.create('Flow', '');
  public static readonly CONNECT_API: Namespace = Namespaces.create(
    'ConnectApi',
    '',
  );
  public static readonly CUSTOM_METADATA: Namespace = Namespaces.create(
    'CustomMetadata',
    '',
  );
  public static readonly MESSAGING: Namespace = Namespaces.create(
    'Messaging',
    '',
  );

  private static readonly NAMESPACES: Set<Namespace> = new Set<Namespace>();

  /**
   * Need a way to parse a while namespace name, such as bmc__foo__c or localModule__bmc__foo__c
   * Then lets intern the namespaces so we don't parse so many damn times.
   */
  public static parse(fullNamespace: string): Namespace {
    const index = fullNamespace.indexOf('__');
    const namespace =
      index > -1
        ? Namespaces.create(
            fullNamespace.substring(0, index),
            fullNamespace.substring(index + 2),
          )
        : Namespaces.create(fullNamespace);

    return Namespaces.intern(namespace);
  }

  /**
   * If this is a raw namespace, then you need to parse it otherwise you can create just a global namespace here.
   */
  public static create(global: string): Namespace;
  public static create(global: string, module: string): Namespace;
  public static create(global: string, module: string = ''): Namespace {
    const namespace = new Namespace(global, module);
    if (Namespace.isEmptyOrNull(namespace)) {
      return Namespaces.EMPTY;
    }
    return namespace;
  }

  private static intern(namespace: Namespace): Namespace {
    for (const existingNamespace of Namespaces.NAMESPACES) {
      if (
        existingNamespace.global === namespace.global &&
        existingNamespace.module === namespace.module
      ) {
        return existingNamespace;
      }
    }
    Namespaces.NAMESPACES.add(namespace);
    return namespace;
  }
}
