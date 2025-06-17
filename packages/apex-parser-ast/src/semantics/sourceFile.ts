/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { IntPair, OldVersionProvider, SourceInfo } from '../types/source';
import { Namespace, Namespaces } from './namespaces';
import {
  StructuredVersion,
  StructuredVersionRange,
  Version,
  VersionUtils,
} from './versions';

export class SourceFile implements SourceInfo {
  private readonly body: string;
  private readonly version: Version;
  private readonly namespace: Namespace;
  private readonly allPackageId: string | null;
  private readonly lengthWithComments: number;
  private readonly knownName: string;
  private readonly oldVersionProvider: OldVersionProvider;
  private readonly referencedPackageVersions: Map<string, StructuredVersion> =
    new Map();
  private readonly exportedPackageVersions: Map<
    string,
    StructuredVersionRange
  > = new Map();
  private readonly interfacePackageVersions: Map<
    string,
    Map<string, StructuredVersion>
  > = new Map();

  constructor(builder: SourceFileBuilder) {
    this.body = builder.body;
    this.version = builder.version;
    this.namespace = builder.namespace;
    this.isTrusted = builder.isTrusted;
    this.isFileBased = builder.isFileBased;
    this.isMocked = builder.isMocked;
    this.supportsLongTopLevelIdentifier =
      builder.supportsLongTopLevelIdentifier;
    this.allPackageId = builder.allPackageId;
    this.lengthWithComments = builder.lengthWithComments ?? this.body.length;
    this.knownName = builder.knownName;
    this.oldVersionProvider = builder.oldVersionProvider!;

    if (builder._referencedPackageVersions) {
      builder._referencedPackageVersions.forEach((value, key) => {
        this.referencedPackageVersions.set(key, value);
      });
    }
    if (builder._exportedPackageVersions) {
      builder._exportedPackageVersions.forEach((value, key) => {
        const [major, minor] = key;
        this.exportedPackageVersions.set(`${major},${minor}`, value);
      });
    }
    if (builder._interfacePackageVersions) {
      builder._interfacePackageVersions.forEach((value, key) => {
        const [major, minor] = key;
        this.interfacePackageVersions.set(`${major},${minor}`, value);
      });
    }
  }

  static builder(): SourceFileBuilder {
    return new SourceFileBuilder();
  }

  getLengthWithComments(): number {
    return this.lengthWithComments;
  }

  getBody(): string {
    return this.body;
  }

  getVersion(): Version {
    return this.version;
  }

  getNamespace(): Namespace {
    return this.namespace;
  }

  get isTrusted(): boolean {
    return this.isTrusted;
  }

  set isTrusted(value: boolean) {
    this.isTrusted = value;
  }

  get isFileBased(): boolean {
    return this.isFileBased;
  }

  set isFileBased(value: boolean) {
    this.isFileBased = value;
  }

  get isMocked(): boolean {
    return this.isMocked;
  }

  set isMocked(value: boolean) {
    this.isMocked = value;
  }

  get supportsLongTopLevelIdentifier(): boolean {
    return this.supportsLongTopLevelIdentifier || this.isFileBased;
  }

  set supportsLongTopLevelIdentifier(value: boolean) {
    this.supportsLongTopLevelIdentifier = value;
  }

  getVersionProvider(): OldVersionProvider {
    return this.oldVersionProvider;
  }

  getReferencedPackageVersions(): Map<string, StructuredVersion> {
    return new Map(this.referencedPackageVersions);
  }

  getExportedPackageVersions(): Map<IntPair, StructuredVersionRange> {
    const result = new Map<IntPair, StructuredVersionRange>();
    this.exportedPackageVersions.forEach((value, key) => {
      const [major, minor] = key.split(',').map(Number);
      result.set([major, minor], value);
    });
    return result;
  }

  getInterfacePackageVersions(): Map<IntPair, Map<string, StructuredVersion>> {
    const result = new Map<IntPair, Map<string, StructuredVersion>>();
    this.interfacePackageVersions.forEach((value, key) => {
      const [major, minor] = key.split(',').map(Number);
      result.set([major, minor], new Map(value));
    });
    return result;
  }

  getAllPackageId(): string | null {
    return this.allPackageId;
  }

  toString(): string {
    return this.body;
  }

  getKnownName(): string {
    return this.knownName;
  }

  copy(): SourceFileBuilder {
    return new SourceFileBuilder().setSeed(this);
  }

  setReferencedPackageVersions(
    referencedPackageVersions: Map<string, StructuredVersion>,
  ): this {
    this.referencedPackageVersions.clear();
    referencedPackageVersions.forEach((value, key) => {
      this.referencedPackageVersions.set(key, value);
    });
    return this;
  }

  setExportedPackageVersions(
    exportedPackageVersions: Map<IntPair, StructuredVersionRange>,
  ): this {
    this.exportedPackageVersions.clear();
    exportedPackageVersions.forEach((value, key) => {
      const [major, minor] = key;
      this.exportedPackageVersions.set(`${major},${minor}`, value);
    });
    return this;
  }

  setInterfacePackageVersions(
    interfacePackageVersions: Map<IntPair, Map<string, StructuredVersion>>,
  ): this {
    this.interfacePackageVersions.clear();
    interfacePackageVersions.forEach((value, key) => {
      const [major, minor] = key;
      this.interfacePackageVersions.set(`${major},${minor}`, new Map(value));
    });
    return this;
  }
}

export class SourceFileBuilder {
  body: string = '';
  version: Version = VersionUtils.CURRENT;
  namespace: Namespace = Namespaces.EMPTY;
  isTrusted: boolean = false;
  isFileBased: boolean = false;
  isMocked: boolean = false;
  supportsLongTopLevelIdentifier: boolean = false;
  allPackageId: string | null = null;
  lengthWithComments?: number;
  knownName: string = '';
  oldVersionProvider?: OldVersionProvider;
  _referencedPackageVersions?: Map<string, StructuredVersion>;
  _exportedPackageVersions?: Map<IntPair, StructuredVersionRange>;
  _interfacePackageVersions?: Map<IntPair, Map<string, StructuredVersion>>;

  build(): SourceFile {
    console.assert(
      this.isFileBased === this.isTrusted || !this.isFileBased,
      'source cannot be file based and not trusted',
    );
    return new SourceFile(this);
  }

  setSeed(sourceFile: SourceFile): this {
    this.allPackageId = sourceFile.getAllPackageId();
    this.isTrusted = sourceFile.isTrusted;
    this.isFileBased = sourceFile.isFileBased;
    this.namespace = sourceFile.getNamespace();
    this.body = sourceFile.getBody();
    this.version = sourceFile.getVersion();
    this.knownName = sourceFile.getKnownName();
    return this;
  }

  setBody(body: string): this {
    this.body = body;
    return this;
  }

  setVersion(version: Version): this {
    this.version = version;
    return this;
  }

  setReferencedPackageVersions(
    referencedPackageVersions: Map<string, StructuredVersion>,
  ): this {
    this._referencedPackageVersions = new Map(referencedPackageVersions);
    return this;
  }

  setExportedPackageVersions(
    exportedPackageVersions: Map<IntPair, StructuredVersionRange>,
  ): this {
    this._exportedPackageVersions = new Map(exportedPackageVersions);
    return this;
  }

  setInterfacePackageVersions(
    interfacePackageVersions: Map<IntPair, Map<string, StructuredVersion>>,
  ): this {
    this._interfacePackageVersions = new Map(interfacePackageVersions);
    return this;
  }

  setNamespace(namespace: Namespace): this {
    this.namespace = namespace;
    return this;
  }

  setTrusted(isTrusted: boolean): this {
    this.isTrusted = isTrusted;
    return this;
  }

  setFileBased(isFileBased: boolean): this {
    this.isFileBased = isFileBased;
    return this;
  }

  setMocked(isMocked: boolean): this {
    this.isMocked = isMocked;
    return this;
  }

  setSupportsLongTopLevelIdentifier(
    supportsLongTopLevelIdentifier: boolean,
  ): this {
    this.supportsLongTopLevelIdentifier = supportsLongTopLevelIdentifier;
    return this;
  }

  setAllPackageId(allPackageId: string): this {
    this.allPackageId = allPackageId;
    return this;
  }

  setLengthWithComments(lengthWithComments: number): this {
    this.lengthWithComments = lengthWithComments;
    return this;
  }

  setKnownName(knownName: string): this {
    this.knownName = knownName;
    return this;
  }

  setOldVersionProvider(oldVersionProvider: OldVersionProvider): this {
    this.oldVersionProvider = oldVersionProvider;
    return this;
  }
}
