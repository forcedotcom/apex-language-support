/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ClassDeclarationContext,
  FieldDeclarationContext,
  InterfaceDeclarationContext,
  MethodDeclarationContext,
} from '@apexdevtools/apex-parser';

import { BaseApexParserListener } from './BaseApexParserListener.js';
import { TypeInfo, createPrimitiveType } from '../../types/typeInfo.js';

/**
 * Structure information for an Apex class or interface
 */
export interface ApexClassInfo {
  name: string;
  isInterface: boolean;
  methods: ApexMethodInfo[];
  properties: ApexPropertyInfo[];
  innerClasses: ApexClassInfo[];
  lineStart: number;
  lineEnd: number;
}

/**
 * Structure information for an Apex method
 */
export interface ApexMethodInfo {
  name: string;
  returnType: TypeInfo;
  parameters: { name: string; type: TypeInfo }[];
  modifiers: string[];
  lineStart: number;
  lineEnd: number;
}

/**
 * Structure information for an Apex property/field
 */
export interface ApexPropertyInfo {
  name: string;
  type: TypeInfo;
  modifiers: string[];
  lineStart: number;
}

/**
 * A listener that builds a structural representation of Apex classes and their members.
 * Useful for generating outlines, symbol tables, etc.
 */
export class ApexStructureListener extends BaseApexParserListener<
  ApexClassInfo[]
> {
  private classes: ApexClassInfo[] = [];
  private currentClass: ApexClassInfo | null = null;
  private currentMethod: ApexMethodInfo | null = null;
  private currentClassStack: ApexClassInfo[] = [];

  /**
   * Get the collected class structure information
   */
  getResult(): ApexClassInfo[] {
    return this.classes;
  }

  /**
   * Called when entering a class declaration
   */
  enterClassDeclaration(ctx: ClassDeclarationContext): void {
    const className = ctx.id()?.text ?? 'UnknownClass';
    const isInterface = false;

    const classInfo: ApexClassInfo = {
      name: className,
      isInterface,
      methods: [],
      properties: [],
      innerClasses: [],
      lineStart: ctx.start.line,
      lineEnd: ctx.stop?.line ?? ctx.start.line,
    };

    // Check if we're inside another class (inner class)
    if (this.currentClass) {
      // Add as inner class
      this.currentClassStack.push(this.currentClass);
      this.currentClass.innerClasses.push(classInfo);
    } else {
      // Top-level class
      this.classes.push(classInfo);
    }

    this.currentClass = classInfo;
  }

  /**
   * Called when exiting a class declaration
   */
  exitClassDeclaration(): void {
    // Pop the class stack if needed
    if (this.currentClassStack.length > 0) {
      this.currentClass = this.currentClassStack.pop() ?? null;
    } else {
      this.currentClass = null;
    }
  }

  /**
   * Called when entering an interface declaration
   */
  enterInterfaceDeclaration(ctx: InterfaceDeclarationContext): void {
    const interfaceName = ctx.id()?.text ?? 'UnknownInterface';

    const interfaceInfo: ApexClassInfo = {
      name: interfaceName,
      isInterface: true,
      methods: [],
      properties: [],
      innerClasses: [],
      lineStart: ctx.start.line,
      lineEnd: ctx.stop?.line ?? ctx.start.line,
    };

    if (this.currentClass) {
      this.currentClassStack.push(this.currentClass);
      this.currentClass.innerClasses.push(interfaceInfo);
    } else {
      this.classes.push(interfaceInfo);
    }

    this.currentClass = interfaceInfo;
  }

  /**
   * Called when exiting an interface declaration
   */
  exitInterfaceDeclaration(): void {
    if (this.currentClassStack.length > 0) {
      this.currentClass = this.currentClassStack.pop() ?? null;
    } else {
      this.currentClass = null;
    }
  }

  /**
   * Called when entering a method declaration
   */
  enterMethodDeclaration(ctx: MethodDeclarationContext): void {
    if (!this.currentClass) return;

    const methodName = ctx.id()?.text ?? 'unknownMethod';
    const returnTypeCtx = ctx.typeRef();
    const returnTypeText = returnTypeCtx
      ? this.getTextFromContext(returnTypeCtx)
      : 'void';

    // Create TypeInfo for return type
    const returnType = this.createTypeInfo(returnTypeText);

    // Extract modifiers
    const modifiers: string[] = [];
    const modifierListCtx = ctx.parent?.parent?.getChild(0);
    if (modifierListCtx && modifierListCtx.childCount) {
      for (let i = 0; i < modifierListCtx.childCount; i++) {
        modifiers.push(modifierListCtx.getChild(i).text);
      }
    }

    // Extract parameters
    const parameters: { name: string; type: TypeInfo }[] = [];
    const formalParametersCtx = ctx.formalParameters();
    if (formalParametersCtx && formalParametersCtx.formalParameterList()) {
      const paramListCtx = formalParametersCtx.formalParameterList();
      if (paramListCtx && paramListCtx.formalParameter()) {
        paramListCtx.formalParameter().forEach((paramCtx) => {
          const paramName = paramCtx.id()?.text ?? 'unknown';
          const paramTypeText = paramCtx.typeRef()
            ? this.getTextFromContext(paramCtx.typeRef())
            : 'Object';
          const paramType = this.createTypeInfo(paramTypeText);
          parameters.push({ name: paramName, type: paramType });
        });
      }
    }

    const methodInfo: ApexMethodInfo = {
      name: methodName,
      returnType,
      parameters,
      modifiers,
      lineStart: ctx.start.line,
      lineEnd: ctx.stop?.line ?? ctx.start.line,
    };

    this.currentMethod = methodInfo;
    this.currentClass.methods.push(methodInfo);
  }

  /**
   * Called when exiting a method declaration
   */
  exitMethodDeclaration(): void {
    this.currentMethod = null;
  }

  /**
   * Called when entering a field declaration
   */
  enterFieldDeclaration(ctx: FieldDeclarationContext): void {
    if (!this.currentClass) return;

    const fieldTypeText = ctx.typeRef()
      ? this.getTextFromContext(ctx.typeRef())
      : 'Object';

    const fieldType = this.createTypeInfo(fieldTypeText);

    // Extract modifiers
    const modifiers: string[] = [];
    const modifierListCtx = ctx.parent?.getChild(0);
    if (modifierListCtx && modifierListCtx.childCount) {
      for (let i = 0; i < modifierListCtx.childCount; i++) {
        modifiers.push(modifierListCtx.getChild(i).text);
      }
    }

    // Handle multiple variable declarations in one statement
    const variableDeclarators = ctx.variableDeclarators().variableDeclarator();
    for (const declarator of variableDeclarators) {
      const fieldName = declarator.id()?.text ?? 'unknownField';

      const propertyInfo: ApexPropertyInfo = {
        name: fieldName,
        type: fieldType,
        modifiers,
        lineStart: declarator.start.line,
      };

      this.currentClass.properties.push(propertyInfo);
    }
  }

  /**
   * Helper method to get the full text for a type reference
   */
  private getTextFromContext(ctx: any): string {
    if (!ctx) return 'Object';

    // For simplicity just returning the text, but could be enhanced to handle complex types better
    return ctx.text;
  }

  /**
   * Helper method to create TypeInfo from a type string
   */
  private createTypeInfo(typeString: string): TypeInfo {
    // This is a simplified implementation
    // A full implementation would parse complex types with generics

    // Check if it's an array
    if (typeString.endsWith('[]')) {
      const baseType = this.createTypeInfo(
        typeString.substring(0, typeString.length - 2),
      );
      return {
        name: `${baseType.name}[]`,
        isArray: true,
        isCollection: false,
        isPrimitive: false,
        typeParameters: [baseType],
        originalTypeString: typeString,
        getNamespace: () => baseType.getNamespace(),
      };
    }

    // Check if it has generic parameters
    if (typeString.includes('<')) {
      const baseName = typeString.substring(0, typeString.indexOf('<'));
      // A full implementation would parse the generic parameters
      // This is simplified for now
      return {
        name: baseName,
        isArray: false,
        isCollection: ['List', 'Set', 'Map'].includes(baseName),
        isPrimitive: false,
        originalTypeString: typeString,
        getNamespace: () => null,
      };
    }

    // Check if it's a primitive type
    const primitiveTypes = [
      'Integer',
      'String',
      'Boolean',
      'Double',
      'Long',
      'Date',
      'Datetime',
      'Time',
      'Decimal',
      'Id',
      'void',
      'Blob',
    ];

    if (primitiveTypes.includes(typeString)) {
      return createPrimitiveType(typeString);
    }

    // Default to a regular type
    return {
      name: typeString,
      isArray: false,
      isCollection: false,
      isPrimitive: false,
      originalTypeString: typeString,
      getNamespace: () => null,
    };
  }

  /**
   * Create a new instance of this listener
   * Used when processing multiple files to create a fresh listener for each file
   */
  createNewInstance(): BaseApexParserListener<ApexClassInfo[]> {
    return new ApexStructureListener();
  }
}
