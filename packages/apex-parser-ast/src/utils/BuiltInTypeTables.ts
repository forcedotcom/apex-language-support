/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbol, SymbolKind, SymbolVisibility } from '../types/symbol';
import { BuiltInTypeTables } from '../namespace/NamespaceUtils';
import { getLogger } from '@salesforce/apex-lsp-shared';

/**
 * Built-in type tables for Apex
 * Maps to Java TypeInfoTables
 */
export class BuiltInTypeTablesImpl implements BuiltInTypeTables {
  private static instance: BuiltInTypeTablesImpl;
  private readonly logger = getLogger();

  // Type tables
  readonly wrapperTypes: Map<string, ApexSymbol>;
  readonly scalarTypes: Map<string, ApexSymbol>;
  readonly collectionTypes: Map<string, ApexSymbol>;
  readonly systemTypes: Map<string, ApexSymbol>;
  readonly schemaTypes: Map<string, ApexSymbol>;
  readonly sObjectTypes: Map<string, ApexSymbol>;

  private constructor() {
    this.wrapperTypes = this.createWrapperTypes();
    this.scalarTypes = this.createScalarTypes();
    this.collectionTypes = this.createCollectionTypes();
    this.systemTypes = this.createSystemTypes();
    this.schemaTypes = this.createSchemaTypes();
    this.sObjectTypes = this.createSObjectTypes();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BuiltInTypeTablesImpl {
    if (!BuiltInTypeTablesImpl.instance) {
      BuiltInTypeTablesImpl.instance = new BuiltInTypeTablesImpl();
    }
    return BuiltInTypeTablesImpl.instance;
  }

  /**
   * Create wrapper type symbols
   * Maps to Java WRAPPER_TYPES
   */
  private createWrapperTypes(): Map<string, ApexSymbol> {
    const types = new Map<string, ApexSymbol>();

    const wrapperTypeNames = [
      'String',
      'Integer',
      'Long',
      'Double',
      'Decimal',
      'Boolean',
      'Date',
      'DateTime',
      'Time',
      'Blob',
      'Id', // Consistent with Salesforce Apex documentation
      'Object',
    ];

    wrapperTypeNames.forEach((name) => {
      const symbol = this.createBuiltInSymbol(
        name,
        SymbolKind.Class,
        'BUILT_IN',
      );
      types.set(name.toLowerCase(), symbol);
    });

    return types;
  }

  /**
   * Create scalar type symbols
   * Maps to Java scalar type handling
   */
  private createScalarTypes(): Map<string, ApexSymbol> {
    const types = new Map<string, ApexSymbol>();

    const scalarTypeNames = ['void', 'null'];

    scalarTypeNames.forEach((name) => {
      const symbol = this.createBuiltInSymbol(
        name,
        SymbolKind.Class,
        'BUILT_IN',
      );
      types.set(name.toLowerCase(), symbol);
    });

    return types;
  }

  /**
   * Create collection type symbols
   * Maps to Java collection type handling
   */
  private createCollectionTypes(): Map<string, ApexSymbol> {
    const types = new Map<string, ApexSymbol>();

    const collectionTypeNames = ['List', 'Set', 'Map'];

    collectionTypeNames.forEach((name) => {
      const symbol = this.createBuiltInSymbol(
        name,
        SymbolKind.Class,
        'BUILT_IN',
      );
      types.set(name.toLowerCase(), symbol);
    });

    return types;
  }

  /**
   * Create System namespace types
   * Maps to Java System namespace types
   */
  private createSystemTypes(): Map<string, ApexSymbol> {
    const types = new Map<string, ApexSymbol>();

    const systemTypeNames = ['System', 'SystemException'];

    systemTypeNames.forEach((name) => {
      const symbol = this.createBuiltInSymbol(name, SymbolKind.Class, 'System');
      types.set(name.toLowerCase(), symbol);
    });

    return types;
  }

  /**
   * Create Schema namespace types
   * Maps to Java Schema namespace types
   */
  private createSchemaTypes(): Map<string, ApexSymbol> {
    const types = new Map<string, ApexSymbol>();

    const schemaTypeNames = [
      'Schema',
      'SObjectType',
      'SObjectField',
      'DescribeSObjectResult',
      'DescribeFieldResult',
      'PicklistEntry',
      'RecordTypeInfo',
    ];

    schemaTypeNames.forEach((name) => {
      const symbol = this.createBuiltInSymbol(name, SymbolKind.Class, 'Schema');
      types.set(name.toLowerCase(), symbol);
    });

    return types;
  }

  /**
   * Create SObject type symbols
   * Maps to Java SObject type handling
   */
  private createSObjectTypes(): Map<string, ApexSymbol> {
    const types = new Map<string, ApexSymbol>();

    // Common SObject types
    const sObjectTypeNames = [
      // Standard Objects
      'Account',
      'Contact',
      'Lead',
      'Opportunity',
      'Case',
      'User',
      'Profile',
      'Role',
      'Group',
      'Queue',
      'Task',
      'Event',
      'Note',
      'Attachment',
      'ContentDocument',
      'ContentVersion',
      'FeedItem',
      'FeedComment',
      'Campaign',
      'CampaignMember',
      'Asset',
      'Contract',
      'Order',
      'OrderItem',
      'Pricebook2',
      'PricebookEntry',
      'Product2',
      'Quote',
      'QuoteLineItem',
      'Entitlement',
      'ServiceContract',
      'WorkOrder',
      'WorkOrderLineItem',
      'KnowledgeArticle',
      'KnowledgeArticleVersion',
      'Solution',
      'Idea',
      'Vote',
      'Partner',
      'PartnerRole',
      'CollaborationGroup',
      'CollaborationGroupMember',
      'Topic',
      'TopicAssignment',
      'CustomObject__c', // Placeholder for custom objects
    ];

    sObjectTypeNames.forEach((name) => {
      const symbol = this.createBuiltInSymbol(
        name,
        SymbolKind.Class,
        'SObject',
      );
      types.set(name.toLowerCase(), symbol);
    });

    return types;
  }

  /**
   * Create a built-in symbol
   */
  private createBuiltInSymbol(
    name: string,
    kind: SymbolKind,
    namespace: string,
  ): ApexSymbol {
    return {
      id: `built-in-${namespace}-${name}`,
      name,
      kind,
      namespace,
      location: {
        startLine: 0,
        startColumn: 0,
        endLine: 0,
        endColumn: 0,
      },
      key: {
        path: ['built-in', namespace, name],
        prefix: 'built-in',
        name: name,
      },
      parentKey: null,
      filePath: 'built-in://apex',
      parentId: null,
      _modifierFlags: 0,
      _isLoaded: true,
      modifiers: {
        visibility: SymbolVisibility.Public,
        isStatic: true,
        isFinal: true,
        isBuiltIn: true,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
      },
    };
  }

  /**
   * Find a type in all built-in tables
   */
  findType(lowerCaseName: string): ApexSymbol | null {
    // Check wrapper types first (highest priority)
    const wrapperType = this.wrapperTypes.get(lowerCaseName);
    if (wrapperType) return wrapperType;

    // Check scalar types
    const scalarType = this.scalarTypes.get(lowerCaseName);
    if (scalarType) return scalarType;

    // Check collection types
    const collectionType = this.collectionTypes.get(lowerCaseName);
    if (collectionType) return collectionType;

    // Check system types
    const systemType = this.systemTypes.get(lowerCaseName);
    if (systemType) return systemType;

    // Check schema types
    const schemaType = this.schemaTypes.get(lowerCaseName);
    if (schemaType) return schemaType;

    // Check SObject types
    const sObjectType = this.sObjectTypes.get(lowerCaseName);
    if (sObjectType) return sObjectType;

    return null;
  }

  /**
   * Get all built-in types
   */
  getAllTypes(): ApexSymbol[] {
    const allTypes: ApexSymbol[] = [];

    this.wrapperTypes.forEach((type) => allTypes.push(type));
    this.scalarTypes.forEach((type) => allTypes.push(type));
    this.collectionTypes.forEach((type) => allTypes.push(type));
    this.systemTypes.forEach((type) => allTypes.push(type));
    this.schemaTypes.forEach((type) => allTypes.push(type));
    this.sObjectTypes.forEach((type) => allTypes.push(type));

    return allTypes;
  }

  /**
   * Get statistics about built-in types
   */
  getStats(): {
    totalTypes: number;
    wrapperTypes: number;
    scalarTypes: number;
    collectionTypes: number;
    systemTypes: number;
    schemaTypes: number;
    sObjectTypes: number;
  } {
    return {
      totalTypes: this.getAllTypes().length,
      wrapperTypes: this.wrapperTypes.size,
      scalarTypes: this.scalarTypes.size,
      collectionTypes: this.collectionTypes.size,
      systemTypes: this.systemTypes.size,
      schemaTypes: this.schemaTypes.size,
      sObjectTypes: this.sObjectTypes.size,
    };
  }

  /**
   * Check if a type is built-in
   */
  isBuiltInType(name: string): boolean {
    const lowerCaseName = name.toLowerCase();
    return this.findType(lowerCaseName) !== null;
  }

  /**
   * Get built-in type by category
   */
  getTypesByCategory(
    category:
      | 'wrapper'
      | 'scalar'
      | 'collection'
      | 'system'
      | 'schema'
      | 'sobject',
  ): ApexSymbol[] {
    switch (category) {
      case 'wrapper':
        return Array.from(this.wrapperTypes.values());
      case 'scalar':
        return Array.from(this.scalarTypes.values());
      case 'collection':
        return Array.from(this.collectionTypes.values());
      case 'system':
        return Array.from(this.systemTypes.values());
      case 'schema':
        return Array.from(this.schemaTypes.values());
      case 'sobject':
        return Array.from(this.sObjectTypes.values());
      default:
        return [];
    }
  }
}
