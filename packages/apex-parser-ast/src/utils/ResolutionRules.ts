/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { ApexSymbol } from '../types/symbol';
import {
  ResolutionRule,
  NamespaceResolutionContext,
  SymbolProvider,
  ReferenceTypeValue,
  IdentifierContextValue,
} from '../types/namespaceResolution';
import { NamespaceUtils } from './NamespaceUtils';
import { BuiltInTypeTablesImpl } from './BuiltInTypeTables';

/**
 * Resolution rules for one-part type names
 * Maps to Java one-part resolution rules
 */
export class OnePartResolutionRules {
  private static readonly logger = getLogger();
  private static readonly builtInTables = BuiltInTypeTablesImpl.getInstance();

  /**
   * NamedScalarOrVoid rule
   * Priority: 1 - Built-in scalar types (String, Integer, etc.)
   */
  static readonly NamedScalarOrVoid: ResolutionRule = {
    name: 'NamedScalarOrVoid',
    priority: 1,
    appliesTo: (context: NamespaceResolutionContext): boolean => {
      return context.adjustedNameParts.length === 1;
    },
    resolve: (
      context: NamespaceResolutionContext,
      symbols: SymbolProvider,
    ): ApexSymbol | null => {
      const name = context.adjustedNameParts[0];
      return this.builtInTables.findType(name) || null;
    },
  };

  /**
   * InnerTypeOfCurrentType rule
   * Priority: 2 - Inner types of the current type
   */
  static readonly InnerTypeOfCurrentType: ResolutionRule = {
    name: 'InnerTypeOfCurrentType',
    priority: 2,
    appliesTo: (context: NamespaceResolutionContext): boolean => {
      return (
        context.adjustedNameParts.length === 1 && false // ApexSymbol doesn't have children property
      );
    },
    resolve: (
      context: NamespaceResolutionContext,
      symbols: SymbolProvider,
    ): ApexSymbol | null => {
      const name = context.adjustedNameParts[0];
      const currentType = context.compilationContext.referencingType;

      // ApexSymbol doesn't have children property
      return null;
    },
  };

  /**
   * InnerTypeOfParentType rule
   * Priority: 3 - Inner types of parent types
   */
  static readonly InnerTypeOfParentType: ResolutionRule = {
    name: 'InnerTypeOfParentType',
    priority: 3,
    appliesTo: (context: NamespaceResolutionContext): boolean => {
      return (
        context.adjustedNameParts.length === 1 &&
        context.compilationContext.parentTypes.length > 0
      );
    },
    resolve: (
      context: NamespaceResolutionContext,
      symbols: SymbolProvider,
    ): ApexSymbol | null => {
      const name = context.adjustedNameParts[0];

      // ApexSymbol doesn't have children property, so we can't search parent types
      return null;

      return null;
    },
  };

  /**
   * TopLevelTypeInSameNamespace rule
   * Priority: 6 - Types in the same namespace
   */
  static readonly TopLevelTypeInSameNamespace: ResolutionRule = {
    name: 'TopLevelTypeInSameNamespace',
    priority: 6,
    appliesTo: (context: NamespaceResolutionContext): boolean => {
      return (
        context.adjustedNameParts.length === 1 &&
        context.compilationContext.namespace !== null
      );
    },
    resolve: (
      context: NamespaceResolutionContext,
      symbols: SymbolProvider,
    ): ApexSymbol | null => {
      const name = context.adjustedNameParts[0];
      const namespace = context.compilationContext.namespace;

      if (!namespace) return null;

      const candidateName = NamespaceUtils.createTypeWithNamespace(
        namespace,
        name,
      );
      return symbols.find(
        context.compilationContext.referencingType,
        candidateName,
      );
    },
  };

  /**
   * BuiltInSystemSchema rule
   * Priority: 7 - Built-in System and Schema types
   */
  static readonly BuiltInSystemSchema: ResolutionRule = {
    name: 'BuiltInSystemSchema',
    priority: 7,
    appliesTo: (context: NamespaceResolutionContext): boolean => {
      return context.adjustedNameParts.length === 1;
    },
    resolve: (
      context: NamespaceResolutionContext,
      symbols: SymbolProvider,
    ): ApexSymbol | null => {
      const name = context.adjustedNameParts[0];

      // Check System types
      const systemType = this.builtInTables.systemTypes.get(name);
      if (systemType) return systemType;

      // Check Schema types
      const schemaType = this.builtInTables.schemaTypes.get(name);
      if (schemaType) return schemaType;

      return null;
    },
  };

  /**
   * SObject rule
   * Priority: 8 - SObject types
   */
  static readonly SObject: ResolutionRule = {
    name: 'SObject',
    priority: 8,
    appliesTo: (context: NamespaceResolutionContext): boolean => {
      return context.adjustedNameParts.length === 1;
    },
    resolve: (
      context: NamespaceResolutionContext,
      symbols: SymbolProvider,
    ): ApexSymbol | null => {
      const name = context.adjustedNameParts[0];
      return symbols.findSObjectType(name);
    },
  };

  /**
   * Get all one-part resolution rules in priority order
   */
  static getAllRules(): ResolutionRule[] {
    return [
      this.NamedScalarOrVoid,
      this.InnerTypeOfCurrentType,
      this.InnerTypeOfParentType,
      this.TopLevelTypeInSameNamespace,
      this.BuiltInSystemSchema,
      this.SObject,
    ].sort((a, b) => a.priority - b.priority);
  }
}

/**
 * Resolution rules for two-part type names
 * Maps to Java two-part resolution rules
 */
export class TwoPartResolutionRules {
  private static readonly logger = getLogger();

  /**
   * NamespaceAndTopLevelType rule
   * Priority: 4 - Explicit namespace + type name
   */
  static readonly NamespaceAndTopLevelType: ResolutionRule = {
    name: 'NamespaceAndTopLevelType',
    priority: 4,
    appliesTo: (context: NamespaceResolutionContext): boolean => {
      return context.adjustedNameParts.length === 2;
    },
    resolve: (
      context: NamespaceResolutionContext,
      symbols: SymbolProvider,
    ): ApexSymbol | null => {
      const [firstPart, secondPart] = context.adjustedNameParts;

      const namespaceResult = NamespaceUtils.parse(firstPart);
      if (!namespaceResult.isValid) return null;

      const candidateName = NamespaceUtils.createTypeWithNamespace(
        namespaceResult.namespace,
        secondPart,
      );

      return symbols.find(
        context.compilationContext.referencingType,
        candidateName,
      );
    },
  };

  /**
   * BuiltInNamespace rule
   * Priority: 5 - Built-in namespace types
   */
  static readonly BuiltInNamespace: ResolutionRule = {
    name: 'BuiltInNamespace',
    priority: 5,
    appliesTo: (context: NamespaceResolutionContext): boolean => {
      return context.adjustedNameParts.length === 2;
    },
    resolve: (
      context: NamespaceResolutionContext,
      symbols: SymbolProvider,
    ): ApexSymbol | null => {
      const [firstPart, secondPart] = context.adjustedNameParts;

      // Check if first part is a built-in namespace
      if (firstPart === 'system' || firstPart === 'schema') {
        const fullName = `${firstPart}.${secondPart}`;
        return symbols.findBuiltInType(fullName);
      }

      return null;
    },
  };

  /**
   * SchemaSObject rule
   * Priority: 6 - Schema SObject types
   */
  static readonly SchemaSObject: ResolutionRule = {
    name: 'SchemaSObject',
    priority: 6,
    appliesTo: (context: NamespaceResolutionContext): boolean => {
      return (
        context.adjustedNameParts.length === 2 &&
        context.adjustedNameParts[0] === 'schema'
      );
    },
    resolve: (
      context: NamespaceResolutionContext,
      symbols: SymbolProvider,
    ): ApexSymbol | null => {
      const [, secondPart] = context.adjustedNameParts;
      return symbols.findSObjectType(secondPart);
    },
  };

  /**
   * Get all two-part resolution rules in priority order
   */
  static getAllRules(): ResolutionRule[] {
    return [
      this.NamespaceAndTopLevelType,
      this.BuiltInNamespace,
      this.SchemaSObject,
    ].sort((a, b) => a.priority - b.priority);
  }
}

/**
 * Resolution rules for three-part type names
 * Maps to Java three-part resolution rules
 */
export class ThreePartResolutionRules {
  /**
   * InnerClassWithNamespace rule
   * Priority: 1 - Inner classes with namespaces: Namespace.Outer.Inner
   */
  static readonly InnerClassWithNamespace: ResolutionRule = {
    name: 'InnerClassWithNamespace',
    priority: 1,
    appliesTo: (context: NamespaceResolutionContext): boolean => {
      return context.adjustedNameParts.length === 3;
    },
    resolve: (
      context: NamespaceResolutionContext,
      symbols: SymbolProvider,
    ): ApexSymbol | null => {
      const [namespacePart, outerPart, innerPart] = context.adjustedNameParts;

      // First resolve the outer class
      const outerClassName = NamespaceUtils.createTypeWithNamespace(
        NamespaceUtils.parse(namespacePart).namespace,
        outerPart,
      );

      const outerClass = symbols.find(
        context.compilationContext.referencingType,
        outerClassName,
      );
      if (!outerClass) return null;

      // ApexSymbol doesn't have children property
      return null;
    },
  };

  /**
   * Get all three-part resolution rules in priority order
   */
  static getAllRules(): ResolutionRule[] {
    return [this.InnerClassWithNamespace].sort(
      (a, b) => a.priority - b.priority,
    );
  }
}

/**
 * Resolution order factory
 * Maps to Java TypeNameResolutionOrder.get()
 */
export class ResolutionOrderFactory {
  /**
   * Get resolution order based on reference type
   */
  static getResolutionOrder(
    referenceType: ReferenceTypeValue,
  ): ResolutionRule[] {
    switch (referenceType) {
      case 'LOAD':
      case 'STORE':
        return this.getVariableResolutionOrder();
      case 'METHOD':
        return this.getMethodResolutionOrder();
      case 'CLASS':
        return this.getClassRefResolutionOrder();
      case 'NONE':
      default:
        return this.getDefaultResolutionOrder();
    }
  }

  /**
   * Variable resolution order (LOAD/STORE)
   */
  private static getVariableResolutionOrder(): ResolutionRule[] {
    return [
      ...OnePartResolutionRules.getAllRules(),
      ...TwoPartResolutionRules.getAllRules(),
      ...ThreePartResolutionRules.getAllRules(),
    ];
  }

  /**
   * Method resolution order (METHOD)
   */
  private static getMethodResolutionOrder(): ResolutionRule[] {
    return [
      ...OnePartResolutionRules.getAllRules(),
      ...TwoPartResolutionRules.getAllRules(),
      ...ThreePartResolutionRules.getAllRules(),
    ];
  }

  /**
   * Class reference resolution order (CLASS)
   */
  private static getClassRefResolutionOrder(): ResolutionRule[] {
    return [
      ...OnePartResolutionRules.getAllRules(),
      ...TwoPartResolutionRules.getAllRules(),
      ...ThreePartResolutionRules.getAllRules(),
    ];
  }

  /**
   * Default resolution order (NONE)
   */
  private static getDefaultResolutionOrder(): ResolutionRule[] {
    return [
      ...OnePartResolutionRules.getAllRules(),
      ...TwoPartResolutionRules.getAllRules(),
      ...ThreePartResolutionRules.getAllRules(),
    ];
  }
}
