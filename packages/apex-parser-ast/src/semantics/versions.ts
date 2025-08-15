/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// HashMap replaced with native Map

import { hash } from '../utils/utils';

/**
 * Represents a major.minor version
 *
 * @author jspagnola
 */
export class StructuredVersion implements Comparable<StructuredVersion> {
  public static readonly DEFAULT_MIN_VERSION: StructuredVersion =
    new StructuredVersion(0, 0);
  public static readonly DEFAULT_MAX_VERSION: StructuredVersion =
    new StructuredVersion(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

  private constructor(
    private readonly majorVersion: number,
    private readonly minorVersion: number,
  ) {}

  public static create(
    majorVersion: number,
    minorVersion: number,
  ): StructuredVersion {
    return new StructuredVersion(majorVersion, minorVersion);
  }

  public getMinorVersion(): number {
    return this.minorVersion;
  }

  public getMajorVersion(): number {
    return this.majorVersion;
  }

  public hashCode(): number {
    return hash(this.majorVersion, this.minorVersion);
  }

  public equals(obj: any): boolean {
    if (this === obj) {
      return true;
    }
    if (obj == null || !(obj instanceof StructuredVersion)) {
      return false;
    }
    const other = obj as StructuredVersion;
    return (
      this.majorVersion === other.majorVersion &&
      this.minorVersion === other.minorVersion
    );
  }

  public toString(): string {
    return `${this.majorVersion}.${this.minorVersion}`;
  }

  /**
   * Natural ordering of versions (x.compareTo(y) < 0 if x < y)
   */
  public compareTo(other: StructuredVersion): number {
    return this.majorVersion === other.majorVersion
      ? this.minorVersion - other.minorVersion
      : this.majorVersion - other.majorVersion;
  }
}

// TypeScript doesn't have a built-in Comparable interface, so we'll define it
interface Comparable<T> {
  compareTo(other: T): number;
}

export class StructuredVersionRange {
  private static readonly INTERNER: Map<string, StructuredVersionRange> =
    new Map();
  private readonly minVersion: StructuredVersion;
  private readonly maxVersion: StructuredVersion;

  private constructor(
    minVersion: StructuredVersion,
    maxVersion: StructuredVersion,
  ) {
    this.minVersion = minVersion;
    this.maxVersion = maxVersion;
  }

  public static create(
    minVersion: StructuredVersion,
    maxVersion: StructuredVersion,
  ): StructuredVersionRange {
    const key = `${minVersion},${maxVersion}`;
    if (!StructuredVersionRange.INTERNER.has(key)) {
      const newRange = new StructuredVersionRange(minVersion, maxVersion);
      StructuredVersionRange.INTERNER.set(key, newRange);
    }
    return StructuredVersionRange.INTERNER.get(key)!;
  }

  public hashCode(): number {
    // Assuming ObjectHash.hash is implemented elsewhere
    return hash(this.minVersion, this.maxVersion);
  }

  public equals(obj: any): boolean {
    if (this === obj) {
      return true;
    }

    if (!(obj instanceof StructuredVersionRange)) {
      return false;
    }

    const other = obj as StructuredVersionRange;
    return (
      this.minVersion.equals(other.minVersion) &&
      this.maxVersion.equals(other.maxVersion)
    );
  }

  public toString(): string {
    return `(${this.minVersion}, ${this.maxVersion})`;
  }

  /**
   * @returns true if version within [min, max] inclusive otherwise false
   */
  public within(version: StructuredVersion): boolean {
    return (
      version.compareTo(this.minVersion) >= 0 &&
      version.compareTo(this.maxVersion) <= 0
    );
  }

  /**
   * @returns true if version is below or equal to max, otherwise false
   */
  public belowOrEqualToMax(version: StructuredVersion): boolean {
    return version.compareTo(this.maxVersion) <= 0;
  }
}

export enum Version {
  V140 = 140,
  V142 = 142,
  V144 = 144,
  V146 = 146,
  V148 = 148,
  V150 = 150,
  V150_1 = 150.1,
  V152 = 152,
  V154 = 154,
  V156 = 156,
  V158 = 158,
  V160 = 160,
  V162 = 162,
  V164 = 164,
  V166 = 166,
  V168 = 168,
  V170 = 170,
  V172 = 172,
  V174 = 174,
  V176 = 176,
  V178 = 178,
  V180 = 180,
  V182 = 182,
  V184 = 184,
  V186 = 186,
  V188 = 188,
  V190 = 190,
  V192 = 192,
  V194 = 194,
  V196 = 196,
  V198 = 198,
  V200 = 200,
  V202 = 202,
  V204 = 204,
  V206 = 206,
  V208 = 208,
  V210 = 210,
  V212 = 212,
  V214 = 214,
  V216 = 216,
  V218 = 218,
  V220 = 220,
  V222 = 222,
  V224 = 224,
  V226 = 226,
  V228 = 228,
  V230 = 230,
  V232 = 232,
  V234 = 234,
  V236 = 236,
  V238 = 238,
  V240 = 240,
  V242 = 242,
  V244 = 244,
  V246 = 246,
  V248 = 248,
  V250 = 250,
  V252 = 252,
  V254 = 254,
  V256 = 256,
}

export class VersionUtils {
  /**
   * We believe this is the minimum version for apex...
   */
  static readonly MIN: Version = Version.V140;

  /**
   * This should always be the max version supported.
   */
  static readonly MAX: Version = Version.V254;
  static readonly CURRENT: Version = Version.V254;

  /**
   * We deprecate some behavior but we can't enforce it until the new compiler is everywhere.
   * We are using this value to demarcate that cutoff.
   */
  static readonly COMPILER_RELEASE: Version = Version.V210;
  static readonly POST_RELEASE: Version = Version.V212;

  private static readonly FROM_INTERNAL: Map<string | Version, Version> =
    new Map(
      Object.entries(Version).map(([key, value]) => [
        value,
        Version[key as keyof typeof Version],
      ]),
    );

  private static readonly EXTERNAL_VERSIONS: Map<Version, number> = new Map<
    Version,
    number
  >([
    [Version.V140, 6],
    [Version.V142, 7],
    [Version.V144, 8],
    [Version.V146, 9],
    [Version.V148, 10],
    [Version.V150, 11],
    [Version.V150_1, 11.1],
    [Version.V152, 12],
    [Version.V154, 13],
    [Version.V156, 14],
    [Version.V158, 15],
    [Version.V160, 16],
    [Version.V162, 17],
    [Version.V164, 18],
    [Version.V166, 19],
    [Version.V168, 20],
    [Version.V170, 21],
    [Version.V172, 22],
    [Version.V174, 23],
    [Version.V176, 24],
    [Version.V178, 25],
    [Version.V180, 26],
    [Version.V182, 27],
    [Version.V184, 28],
    [Version.V186, 29],
    [Version.V188, 30],
    [Version.V190, 31],
    [Version.V192, 32],
    [Version.V194, 33],
    [Version.V196, 34],
    [Version.V198, 35],
    [Version.V200, 36],
    [Version.V202, 37],
    [Version.V204, 38],
    [Version.V206, 39],
    [Version.V208, 40],
    [Version.V210, 41],
    [Version.V212, 42],
    [Version.V214, 43],
    [Version.V216, 44],
    [Version.V218, 45],
    [Version.V220, 46],
    [Version.V222, 47],
    [Version.V224, 48],
    [Version.V226, 49],
    [Version.V228, 50],
    [Version.V230, 51],
    [Version.V232, 52],
    [Version.V234, 53],
    [Version.V236, 54],
    [Version.V238, 55],
    [Version.V240, 56],
    [Version.V242, 57],
    [Version.V244, 58],
    [Version.V246, 59],
    [Version.V248, 60],
    [Version.V250, 61],
    [Version.V252, 62],
    [Version.V254, 63],
    [Version.V256, 64],
  ] as [Version, number][]);

  static fromInternal(version: number): Version | undefined {
    return this.FROM_INTERNAL.get(version);
  }

  /**
   * The version names on this case correspond to the 'internal' way that SFDC refers to
   * releases. This is used here since it is what our developers are more familiar with.
   * When we report versions externally we use a different version number, the 'external'
   * version.
   *
   * @param version The internal version
   * @return the external version number for this version
   */
  static getExternal(version: Version): number | undefined {
    return this.EXTERNAL_VERSIONS.get(version);
  }

  static getInternal(version: Version): number {
    return version;
  }

  static isGreaterThanOrEqual(version: Version, other: Version): boolean {
    return version >= other;
  }

  static isGreaterThan(version: Version, other: Version): boolean {
    return version > other;
  }

  static isLessThanOrEqual(version: Version, other: Version): boolean {
    return version <= other;
  }

  static isLessThan(version: Version, other: Version): boolean {
    return version < other;
  }

  /**
   * If the type is between the lower and upper, inclusive.
   * So, 162 to 166 is true for 162, 164, and 166, otherwise its false.
   */
  static isBetween(version: Version, lower: Version, upper: Version): boolean {
    console.assert(
      this.assertBounds(lower, upper),
      `non sense bounds: ${lower} - ${upper}`,
    );
    return (
      this.isGreaterThanOrEqual(version, lower) &&
      this.isLessThanOrEqual(version, upper)
    );
  }

  private static assertBounds(
    lower: Version | null,
    upper: Version | null,
  ): boolean {
    if (lower === null && upper === null) {
      return false;
    } else if (lower === null) {
      return (
        upper !== null &&
        this.isGreaterThanOrEqual(upper, lower as unknown as Version)
      );
    } else {
      return upper !== null && this.isLessThanOrEqual(lower, upper);
    }
  }
}
