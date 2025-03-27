/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
export class Result<V> {
  private static readonly NONE: Result<any> = new Result<any>(null, null);
  private readonly value: V | null;
  private readonly error: string | null;

  private constructor(value: V | null, error: string | null) {
    this.value = value;
    this.error = error;
  }

  public static of<V>(value: V): Result<V> {
    return new Result<V>(Objects.requireNonNull(value), null);
  }

  public static none<V>(): Result<V> {
    return Result.NONE as Result<V>;
  }

  public static error<V>(error: string): Result<V> {
    return new Result<V>(
      null,
      Objects.requireNonNull(Strings.emptyToNull(error)),
    );
  }

  public isPresent(): boolean {
    Preconditions.checkState(!this.hasError());
    return this.value !== null;
  }

  public absent(): boolean {
    Preconditions.checkState(!this.hasError());
    return this.value === null;
  }

  public hasError(): boolean {
    return !Strings.isNullOrEmpty(this.error);
  }

  public hasResult(): boolean {
    return this.value !== null || !Strings.isNullOrEmpty(this.error);
  }

  public get(): V {
    Preconditions.checkArgument(this.isPresent());
    return this.value!;
  }

  public getError(): string {
    Preconditions.checkArgument(this.hasError());
    return this.error!;
  }

  public throwIfError(): void {
    if (this.error !== null) {
      throw new Error(this.error);
    }
  }

  public toString(): string {
    return this.hasError()
      ? `an error: ${String(this.error)}`
      : `a value: ${String(this.value)}`;
  }
}

// Helper classes/functions (you might want to implement these or use a library)
class Objects {
  public static requireNonNull<T>(obj: T | null | undefined): T {
    if (obj == null) {
      throw new Error('Object must not be null');
    }
    return obj;
  }
}

class Strings {
  public static isNullOrEmpty(str: string | null | undefined): boolean {
    return str == null || str.length === 0;
  }

  public static emptyToNull(str: string | null | undefined): string | null {
    return Strings.isNullOrEmpty(str) ? null : str!;
  }
}

class Preconditions {
  public static checkState(expression: boolean): void {
    if (!expression) {
      throw new Error('Illegal state');
    }
  }

  public static checkArgument(expression: boolean): void {
    if (!expression) {
      throw new Error('Illegal argument');
    }
  }
}
