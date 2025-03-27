/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Namespace } from '../namespaces';
import { BasicType } from './basicType';
import { Member } from './member';
import { ModifierGroup } from './modifiers';
import { FieldTable, MethodTable } from './typeTables';
import { UnitType } from './unitType';

export interface TypeInfo extends TypeNameProvider {
  readonly TO_APEX_NAME: (provider: TypeNameProvider) => string;
  readonly TO_BYTECODE_NAME: (provider: TypeNameProvider) => string;

  getBasicType(): BasicType;
  getBytecodeMethodName(): string;
  getNamespace(): Namespace;
  getUnitType(): UnitType;
  methods(): MethodTable;
  virtualMethods(): MethodTable;
  fields(): FieldTable;
  parents(): ParentTable;
  accept<T>(visitor: TypeInfoVisitor<T>): T;
  getModifiers(): ModifierGroup;
  getTypeArguments(): TypeInfo[];
  getEnclosingType(): TypeInfo;
  getEquivalenceWrapper(): Equivalence.Wrapper<TypeInfo>;
  isResolved(): boolean;
  getCodeUnitDetails(): CodeUnitDetails;
}

/**
 * Provides a common interface for type builders and types to create type names for nested types,
 * e.g., generic types, unresolved types
 */
interface TypeNameProvider {
  /**
   * Returns the name of this type as exposed to Apex developers
   */
  getApexName(): string;

  /**
   * Returns the bytecode name for an instance
   */
  getBytecodeName(): string;

  /**
   * Returns the type signature for an instance
   */
  getTypeSignature(): string;
}

export abstract class AbstractTypeInfo implements TypeInfo {
  private readonly apexName: string;
  private readonly bytecodeMethodName: string;
  private readonly bytecodeName: string;
  private readonly typeSignature: string;
  private readonly enclosingType: TypeInfo | null;
  private readonly namespace: Namespace;
  private readonly modifiers: ModifierGroup;
  private readonly basicType: BasicType;
  private readonly unitType: UnitType;
  private readonly resolved: boolean;
  private readonly parents: () => ParentTable;
  private readonly fields: () => FieldTable;
  private readonly methods: () => MethodTable;
  private readonly virtualMethods: () => MethodTable;
  private readonly codeUnit: () => CodeUnitDetails;

  constructor(builder: AbstractTypeInfoBuilder) {
    this.apexName = builder.apexName;
    this.bytecodeName = builder.bytecodeName;
    this.bytecodeMethodName = builder.bytecodeMethodName || this.bytecodeName;
    this.typeSignature = builder.getTypeSignature();
    this.resolved = builder.resolved;
    this.enclosingType = builder.enclosingType;
    this.namespace = builder.namespace;
    this.modifiers = builder.modifiers;
    this.parents = builder.parents;
    this.methods = builder.methods;
    this.virtualMethods = builder.virtualMethods || this.methods;
    this.fields = builder.fields;
    this.unitType = builder.unitType;
    this.basicType = builder.basicType;
    this.codeUnit = builder.codeUnit;

    // Assertions
    if (!this.apexName) throw new Error('no apex name defined');
    if (!this.bytecodeName) throw new Error('no bytecode name defined');
    if (!this.unitType) throw new Error('no unit type defined');
    if (!this.basicType) throw new Error('no basic type defined');
    if (!this.namespace) throw new Error('no namespace defined');
    if (!this.parents) throw new Error('no parents defined');
    if (!this.methods) throw new Error('no methods defined');
    if (!this.fields) throw new Error('no fields defined');
  }

  getBasicType(): BasicType {
    return this.basicType;
  }

  getBytecodeMethodName(): string {
    return this.bytecodeMethodName;
  }

  getNamespace(): Namespace {
    return this.namespace;
  }

  getUnitType(): UnitType {
    return this.unitType;
  }

  methods(): MethodTable {
    return this.methods();
  }

  virtualMethods(): MethodTable {
    return this.virtualMethods();
  }

  fields(): FieldTable {
    return this.fields();
  }

  parents(): ParentTable {
    return this.parents();
  }

  getModifiers(): ModifierGroup {
    return this.modifiers;
  }

  getTypeArguments(): TypeInfo[] {
    return [];
  }

  getEnclosingType(): TypeInfo | null {
    return this.enclosingType;
  }

  isResolved(): boolean {
    return this.resolved;
  }

  getCodeUnitDetails(): CodeUnitDetails {
    return this.codeUnit();
  }

  getApexName(): string {
    return this.apexName;
  }

  getBytecodeName(): string {
    return this.bytecodeName;
  }

  getTypeSignature(): string {
    return this.typeSignature;
  }

  toString(): string {
    return this.getApexName();
  }
}

export abstract class AbstractTypeInfoBuilder {
  public apexName: string;
  public bytecodeName: string;
  public bytecodeMethodName?: string;
  public basicType: BasicType;
  public fields: () => FieldTable;
  public methods: () => MethodTable;
  public virtualMethods?: () => MethodTable;
  public parents: () => ParentTable;
  public codeUnit: () => CodeUnitDetails;
  public namespace: Namespace;
  public unitType: UnitType;
  public modifiers: ModifierGroup;
  public resolved: boolean = true;
  public enclosingType: TypeInfo | null;
  public typeSignature: string;

  constructor() {
    this.resolved = true;
    this.setCodeUnitDetails(() => ({
      /* Implement NonSourceCodeUnitDetails */
    }));
  }

  abstract build(): AbstractTypeInfo;

  setResolved(resolved: boolean): this {
    this.resolved = resolved;
    return this;
  }

  setCodeUnitDetails(codeUnit: () => CodeUnitDetails): this {
    this.codeUnit = codeUnit;
    return this;
  }

  // Implement other setter methods as needed...

  getTypeSignature(): string {
    if (!this.typeSignature) {
      this.typeSignature = createTypeSignature(this.getBytecodeName());
    }
    return this.typeSignature;
  }

  setApexName(apexName: string): this {
    this.apexName = apexName;
    return this;
  }

  setBytecodeName(bytecodeName: string): this {
    this.bytecodeName = bytecodeName;
    return this;
  }
}

export interface FieldInfo extends Variable {
  getEmitType(): TypeInfo;
  getBytecodeName(): string;
  getValue(): any;
}

export interface Variable extends Member {
  /**
   * The type of the variable.
   */
  getType(): TypeInfo;

  accept<T, C>(visitor: VariableVisitor<T, C>, context: C): T;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface VariableVisitor<T, C> {
  // This interface is left empty as its implementation details are not provided in the original Java code
  // You may want to define methods here based on your specific use case
}

// Helper function (implement as needed)
function createTypeSignature(bytecodeName: string): string {
  // Implement type signature creation logic
  return `TypeSignature(${bytecodeName})`;
}
