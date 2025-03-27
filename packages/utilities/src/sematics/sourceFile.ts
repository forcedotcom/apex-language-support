/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  IntPair,
  OldVersionProvider,
  SourceInfo,
  StructuredVersion,
} from '../types/source';
import { StructuredVersionRange } from './versions';

export class SourceFile implements SourceInfo {
  private readonly body: string;
  private readonly version: Version;
  private readonly namespace: Namespace;
  private readonly allPackageId: string | null;
  private readonly lengthWithComments: number;
  private readonly knownName: string;
  private readonly oldVersionProvider: OldVersionProvider;
  private readonly referencedPackageVersions: Map<string, StructuredVersion>;
  private readonly exportedPackageVersions: Map<
    IntPair,
    StructuredVersionRange
  >;
  private readonly interfacePackageVersions: Map<
    IntPair,
    Map<string, StructuredVersion>
  >;

  private constructor(builder: SourceFile.Builder) {
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
    this.referencedPackageVersions = builder.referencedPackageVersions;
    this.exportedPackageVersions = builder.exportedPackageVersions;
    this.interfacePackageVersions = builder.interfacePackageVersions;
    this.oldVersionProvider = builder.oldVersionProvider!;
  }

  static builder(): SourceFile.Builder {
    return new SourceFile.Builder();
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

  isTrusted(): boolean {
    return this.isTrusted;
  }

  isFileBased(): boolean {
    return this.isFileBased;
  }

  isMocked(): boolean {
    return this.isMocked;
  }

  supportsLongTopLevelIdentifier(): boolean {
    return this.supportsLongTopLevelIdentifier || this.isFileBased;
  }

  getVersionProvider(): OldVersionProvider {
    return this.oldVersionProvider;
  }

  getReferencedPackageVersions(): Map<string, StructuredVersion> {
    return this.referencedPackageVersions;
  }

  getExportedPackageVersions(): Map<IntPair, StructuredVersionRange> {
    return this.exportedPackageVersions;
  }

  getInterfacePackageVersions(): Map<IntPair, Map<string, StructuredVersion>> {
    return this.interfacePackageVersions;
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

  copy(): Builder {
    return new SourceFile.Builder().setSeed(this);
  }

  static Builder = class Builder {
    body: string = '';
    version: Version = Version.CURRENT;
    namespace: Namespace = Namespaces.EMPTY;
    isTrusted: boolean = false;
    isFileBased: boolean = false;
    isMocked: boolean = false;
    supportsLongTopLevelIdentifier: boolean = false;
    allPackageId: string | null = null;
    lengthWithComments?: number;
    knownName: string = '';
    referencedPackageVersions: Map<string, StructuredVersion> = new Map();
    exportedPackageVersions: Map<IntPair, StructuredVersionRange> = new Map();
    interfacePackageVersions: Map<IntPair, Map<string, StructuredVersion>> =
      new Map();
    oldVersionProvider?: OldVersionProvider;

    build(): SourceFile {
      console.assert(
        this.isFileBased === this.isTrusted || !this.isFileBased,
        'source cannot be file based and not trusted',
      );
      return new SourceFile(this);
    }

    setSeed(sourceFile: SourceFile): this {
      this.allPackageId = sourceFile.getAllPackageId();
      this.isTrusted = sourceFile.isTrusted();
      this.isFileBased = sourceFile.isFileBased();
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
      this.referencedPackageVersions = new Map(referencedPackageVersions);
      return this;
    }

    setExportedPackageVersions(
      exportedPackageVersions: Map<IntPair, StructuredVersionRange>,
    ): this {
      this.exportedPackageVersions = new Map(exportedPackageVersions);
      return this;
    }

    setInterfacePackageVersions(
      interfacePackageVersions: Map<IntPair, Map<string, StructuredVersion>>,
    ): this {
      this.interfacePackageVersions = new Map(interfacePackageVersions);
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
  };
}
