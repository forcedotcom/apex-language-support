/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Result } from './result';
import { FieldInfo, TypeInfo } from './typeInfo';

export interface MethodTable {
  getApproximate(
    referencingType: TypeInfo,
    methodName: string,
    parameterTypes: TypeInfo[],
    mode: MethodLookupMode,
  ): Result<MethodInfo>;

  get(signature: Signature): MethodInfo;

  remove(signature: Signature): MethodInfo;

  addNoDuplicatesAllowed(method: MethodInfo): Result<void>;

  addDuplicatesAllowed(method: MethodInfo): Result<void>;

  resolve(): MethodTable;

  isResolved(): boolean;

  all(): MethodInfo[];

  getConstructors(): MethodInfo[];

  getUserConstructors(): MethodInfo[];

  getSystemConstructors(): MethodInfo[];

  hasConstructors(): boolean;

  getStatics(): MethodInfo[];

  getInstance(): MethodInfo[];

  getStaticsAndInstance(): MethodInfo[];
}

export interface FieldTable {
  add(field: FieldInfo): Result<void>;

  get(
    symbols: SymbolResolver,
    referencingType: TypeInfo,
    name: string,
    mode: LookupMode,
  ): FieldInfo;

  resolve(): FieldTable;

  isResolved(): boolean;

  all(): FieldInfo[];
}

export enum LookupMode {
  STATIC_REFERENCE = 'STATIC_REFERENCE',
  STATIC_REFERENCE_LOCALS_OKAY = 'STATIC_REFERENCE_LOCALS_OKAY',
  INSTANCE_REFERENCE = 'INSTANCE_REFERENCE',
  INSTANCE_REFERENCE_LOCALS_OKAY = 'INSTANCE_REFERENCE_LOCALS_OKAY',
  STATIC_VARIABLE = 'STATIC_VARIABLE',
  STATIC_VARIABLE_LOCALS_OKAY = 'STATIC_VARIABLE_LOCALS_OKAY',
  INSTANCE_VARIABLE = 'INSTANCE_VARIABLE',
  INSTANCE_VARIABLE_LOCALS_OKAY = 'INSTANCE_VARIABLE_LOCALS_OKAY',
}

export class LookupModeUtils {
  private constructor() {}

  static switchToStatic(mode: LookupMode): LookupMode {
    switch (mode) {
      case LookupMode.STATIC_REFERENCE:
      case LookupMode.INSTANCE_REFERENCE:
        return LookupMode.STATIC_REFERENCE;
      case LookupMode.STATIC_REFERENCE_LOCALS_OKAY:
      case LookupMode.INSTANCE_REFERENCE_LOCALS_OKAY:
        return LookupMode.STATIC_REFERENCE_LOCALS_OKAY;
      case LookupMode.STATIC_VARIABLE:
      case LookupMode.INSTANCE_VARIABLE:
        return LookupMode.STATIC_VARIABLE;
      case LookupMode.STATIC_VARIABLE_LOCALS_OKAY:
      case LookupMode.INSTANCE_VARIABLE_LOCALS_OKAY:
        return LookupMode.STATIC_VARIABLE_LOCALS_OKAY;
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }
  }

  static areStaticsFirst(mode: LookupMode): boolean {
    return [
      LookupMode.STATIC_REFERENCE,
      LookupMode.STATIC_REFERENCE_LOCALS_OKAY,
      LookupMode.STATIC_VARIABLE,
      LookupMode.STATIC_VARIABLE_LOCALS_OKAY,
    ].includes(mode);
  }

  static isLast(mode: LookupMode): boolean {
    return [
      LookupMode.STATIC_VARIABLE,
      LookupMode.STATIC_VARIABLE_LOCALS_OKAY,
      LookupMode.INSTANCE_VARIABLE,
      LookupMode.INSTANCE_VARIABLE_LOCALS_OKAY,
    ].includes(mode);
  }

  static areLocalsAllowed(mode: LookupMode): boolean {
    return [
      LookupMode.STATIC_REFERENCE_LOCALS_OKAY,
      LookupMode.INSTANCE_REFERENCE_LOCALS_OKAY,
      LookupMode.STATIC_VARIABLE_LOCALS_OKAY,
      LookupMode.INSTANCE_VARIABLE_LOCALS_OKAY,
    ].includes(mode);
  }
}

export interface ParentTable {
  superType(): TypeInfo;

  /**
   * This returns direct parent interfaces respecting the order of definition.
   * So if a user wrote `implements Foo, Bar` it would return Foo and Bar.
   *
   * @returns interfaces that are immediate parents
   */
  immediateInterfaces(): TypeInfo[];

  /**
   * @returns all interfaces, not just immediate parents ("grandparents" etc.)
   */
  allInterfaces(): TypeInfo[];

  /**
   * Equality must use TypeInfoEquivalence. If you only want to iterate over the interfaces
   * use `allInterfaces()`. Otherwise for containment use this call.
   */
  allEquivalentInterfaces(): Set<TypeInfo>;

  resolveSuperTypes(superType: TypeInfo): void;

  resolveInterfaces(interfaces: TypeInfo[]): void;

  areSuperTypesResolved(): boolean;

  areInterfacesResolved(): boolean;

  isResolved(): boolean;
}
