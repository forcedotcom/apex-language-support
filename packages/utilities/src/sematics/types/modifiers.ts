/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Location } from './other';
import { TypeInfo } from './typeInfo';

export class ModifierGroup implements ModifierGroup {
  private static readonly MODIFIERS_INTERNER = new Map<string, Modifier[]>();
  private static readonly MODIFIER_TYPES_INTERNER = new Map<
    string,
    ModifierOrAnnotationTypeInfo[]
  >();

  private readonly loc: Location;
  private readonly javaModifiers: number;
  private readonly annotations: Annotation[];
  private readonly modifiers: Modifier[];
  private readonly all: Map<TypeInfo, ModifierOrAnnotation>;
  private readonly allTypes: () => ModifierOrAnnotationTypeInfo[];
  private duplicates: Set<ModifierOrAnnotationTypeInfo>;
  private resolved: boolean;

  constructor(builder: ModifierGroupBuilder) {
    this.loc = builder.getLoc();
    this.javaModifiers = builder.getJavaModifiers();
    this.annotations = builder.getAnnotations();
    this.modifiers = ModifierGroup.internModifiers(builder.getModifiers());
    this.all = new Map();
    this.duplicates = new Set();
    this.allTypes = this.memoize(() => this.getAllTypes());
    this.resolve(this.modifiers);
    this.resolved = this.annotations.length === 0;
  }

  private static internModifiers(modifiers: Modifier[]): Modifier[] {
    const key = JSON.stringify(modifiers);
    if (!ModifierGroup.MODIFIERS_INTERNER.has(key)) {
      ModifierGroup.MODIFIERS_INTERNER.set(key, modifiers);
    }
    return ModifierGroup.MODIFIERS_INTERNER.get(key)!;
  }

  public static builder(): ModifierGroupBuilder {
    return new ModifierGroupBuilder();
  }

  private resolve(modifierOrAnnotations: ModifierOrAnnotation[]): void {
    for (const modifierOrAnnotation of modifierOrAnnotations) {
      if (modifierOrAnnotation.getType() == null) {
        throw new Error('Modifier or annotation type is null');
      }
      const wrapper = modifierOrAnnotation.getType().getEquivalenceWrapper();
      if (this.all.has(wrapper)) {
        if (this.duplicates.size === 0) {
          this.duplicates = new Set();
        }
        this.duplicates.add(modifierOrAnnotation.getType());
      } else {
        this.all.set(wrapper, modifierOrAnnotation);
      }
    }
  }

  public getJavaModifiers(): number {
    return this.javaModifiers;
  }

  public has(modifier: ModifierOrAnnotationTypeInfo): boolean {
    if (!this.assertIsResolvedForInput(modifier)) {
      throw new Error('Modifier is not resolved');
    }
    return this.all.has(modifier.getEquivalenceWrapper());
  }

  public all(
    modifier1: ModifierOrAnnotationTypeInfo,
    modifier2: ModifierOrAnnotationTypeInfo,
  ): boolean {
    return this.has(modifier1) && this.has(modifier2);
  }

  public some(
    modifier1: ModifierOrAnnotationTypeInfo,
    modifier2: ModifierOrAnnotationTypeInfo,
  ): boolean {
    return this.has(modifier1) || this.has(modifier2);
  }

  public not(modifier: ModifierOrAnnotationTypeInfo): boolean {
    return !this.has(modifier);
  }

  public none(
    modifier1: ModifierOrAnnotationTypeInfo,
    modifier2: ModifierOrAnnotationTypeInfo,
  ): boolean {
    return this.not(modifier1) && this.not(modifier2);
  }

  public getAnnotations(): Annotation[] {
    return this.annotations;
  }

  public isTest(): boolean {
    return this.some(TEST_METHOD, IS_TEST);
  }

  public isTestOrTestSetup(): boolean {
    return this.some(TEST_METHOD, IS_TEST) || this.has(TEST_SETUP);
  }

  public resolve(): ModifierGroup {
    if (!this.resolved) {
      this.resolve(this.annotations);
    }
    this.resolved = true;
    return this;
  }

  public copy(): ModifierGroupBuilder {
    return new ModifierGroupBuilder()
      .setLoc(this.loc)
      .addModifiers(this.modifiers)
      .addAnnotations(this.annotations);
  }

  public toString(): string {
    return `ModifierGroup{loc=${this.loc}, javaModifiers=${this.javaModifiers}, allModifiers=${this.all}}`;
  }

  public getLoc(): Location {
    return this.loc;
  }

  public getDuplicates(): Set<ModifierOrAnnotationTypeInfo> {
    if (!this.resolved) {
      throw new Error('Modifiers have not been resolved');
    }
    return this.duplicates;
  }

  public all(): ModifierOrAnnotationTypeInfo[] {
    if (!this.resolved) {
      throw new Error('Modifiers have not been resolved');
    }
    return this.allTypes();
  }

  public get(
    modifier: ModifierOrAnnotationTypeInfo,
  ): ModifierOrAnnotation | undefined {
    if (!this.assertIsResolvedForInput(modifier)) {
      throw new Error('Modifier is not resolved');
    }
    return this.all.get(modifier.getEquivalenceWrapper());
  }

  private assertIsResolvedForInput(
    modifier: ModifierOrAnnotationTypeInfo,
  ): boolean {
    if (this.resolved) {
      return true;
    }

    return modifier.accept(
      new (class implements ModifierOrAnnotationVisitor<boolean> {
        visit(type: StandardAnnotationTypeInfo): boolean {
          return false;
        }
        visit(type: ModifierTypeInfo): boolean {
          return true;
        }
      })(),
    );
  }

  public allNodes(): ModifierOrAnnotation[] {
    return Array.from(this.all.values());
  }

  private getAllTypes(): ModifierOrAnnotationTypeInfo[] {
    const types = Array.from(this.all.keys()).map((wrapper) => wrapper.get());
    const key = JSON.stringify(types);
    if (!ModifierGroup.MODIFIER_TYPES_INTERNER.has(key)) {
      ModifierGroup.MODIFIER_TYPES_INTERNER.set(key, types);
    }
    return ModifierGroup.MODIFIER_TYPES_INTERNER.get(key)!;
  }

  private memoize<T>(fn: () => T): () => T {
    let result: T | undefined;
    return () => {
      if (result === undefined) {
        result = fn();
      }
      return result;
    };
  }
}

export interface ModifierOrAnnotationTypeInfo extends TypeInfo {
  accept<T>(visitor: ModifierOrAnnotationVisitor<T>): T;
  getProperties(): Map<string, AnnotationProperty>;
  getRuleGroup(): AnnotationRuleGroup;
  isBytecodeVisible(): boolean;
  shouldForceEmitAnnotationString(): boolean;
}

interface ModifierOrAnnotationVisitor<T> {
  visit(type: StandardAnnotationTypeInfo): T;
  visit(type: ModifierTypeInfo): T;
}

// Note: You'll need to implement ModifierGroupBuilder, Location, Annotation, Modifier,
// ModifierOrAnnotation, ModifierOrAnnotationTypeInfo, TypeInfo, and other related classes/interfaces.

// Constants (these should be defined elsewhere and imported)
const TEST_METHOD: ModifierOrAnnotationTypeInfo;
const IS_TEST: ModifierOrAnnotationTypeInfo;
const TEST_SETUP: ModifierOrAnnotationTypeInfo;
export interface ModifierGroup {
  getJavaModifiers(): number;
  has(modifier: ModifierOrAnnotationTypeInfo): boolean;
  all(
    modifier1: ModifierOrAnnotationTypeInfo,
    modifier2: ModifierOrAnnotationTypeInfo,
  ): boolean;
  some(
    modifier1: ModifierOrAnnotationTypeInfo,
    modifier2: ModifierOrAnnotationTypeInfo,
  ): boolean;
  not(modifier: ModifierOrAnnotationTypeInfo): boolean;
  none(
    modifier1: ModifierOrAnnotationTypeInfo,
    modifier2: ModifierOrAnnotationTypeInfo,
  ): boolean;
  getAnnotations(): Annotation[];
  isTest(): boolean;
  isTestOrTestSetup(): boolean;
  resolve(): ModifierGroup;
  copy(): ModifierGroupBuilder;
  toString(): string;
  getLoc(): Location;
  getDuplicates(): Set<ModifierOrAnnotationTypeInfo>;
  all(): ModifierOrAnnotationTypeInfo[];
  get(modifier: ModifierOrAnnotationTypeInfo): ModifierOrAnnotation | undefined;
  allNodes(): ModifierOrAnnotation[];
}
export interface ModifierGroupBuilder {
  setLoc(loc: Location): ModifierGroupBuilder;
  addModifiers(modifiers: Modifier[]): ModifierGroupBuilder;
  addAnnotations(annotations: Annotation[]): ModifierGroupBuilder;
  build(): ModifierGroup;
}

export abstract class ModifierOrAnnotation implements AstNode {
  static readonly NAME_COMPARATOR: (
    left: ModifierOrAnnotation | null,
    right: ModifierOrAnnotation | null,
  ) => number = (left, right) => {
    const leftName = left?.getType()?.getBytecodeName() ?? null;
    const rightName = right?.getType()?.getBytecodeName() ?? null;

    return Comparables.compare(leftName, rightName);
  };

  private type: ModifierOrAnnotationTypeInfo | null;

  constructor() {
    this.type = null;
  }

  public getType(): ModifierOrAnnotationTypeInfo | null {
    return this.type;
  }

  protected setType(type: ModifierOrAnnotationTypeInfo): void {
    this.type = type;
  }

  public abstract getParameter(name: string): AnnotationParameter | null;
}
