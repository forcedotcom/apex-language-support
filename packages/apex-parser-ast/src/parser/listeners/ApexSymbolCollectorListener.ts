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
  MethodDeclarationContext,
  VariableDeclaratorContext,
  InterfaceDeclarationContext,
  ConstructorDeclarationContext,
  InterfaceMethodDeclarationContext,
  FormalParameterContext,
  LocalVariableDeclarationContext,
  EnumDeclarationContext,
  BlockContext,
  ModifierContext,
  AnnotationContext,
  EnumConstantsContext,
  TriggerMemberDeclarationContext,
  TriggerUnitContext,
  PropertyDeclarationContext,
  // Add specific contexts for type reference capture
  MethodCallExpressionContext,
  NewExpressionContext,
  DotExpressionContext,
  TypeRefContext,
  // Add missing contexts for complete reference capture
  IdPrimaryContext,
  PrimaryExpressionContext,
  AssignExpressionContext,
  ArrayExpressionContext,
  CastExpressionContext,
  CatchClauseContext,
  // Use dedicated method call contexts for precise capture
  MethodCallContext,
  DotMethodCallContext,
  EnhancedForControlContext,
  TypeRefPrimaryContext,
  QualifiedNameContext,
  AnyIdContext,
  // Add contexts for type checking
  TypeListContext,
  TypeNameContext,
  InstanceOfExpressionContext,
  ExpressionListContext,
} from '@apexdevtools/apex-parser';
import { ParserRuleContext } from 'antlr4ts';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { BaseApexParserListener } from './BaseApexParserListener';
import { Namespaces, Namespace } from '../../namespace/NamespaceUtils';
import { TypeInfo, createPrimitiveType } from '../../types/typeInfo';
import { createTypeInfo } from '../../utils/TypeInfoFactory';
import { TypeReferenceFactory } from '../../types/typeReference';
import type { TypeReference } from '../../types/typeReference';
import {
  EnumSymbol,
  MethodSymbol,
  SymbolKind,
  SymbolLocation,
  SymbolModifiers,
  SymbolTable,
  SymbolVisibility,
  TypeSymbol,
  VariableSymbol,
  Annotation,
  AnnotationParameter,
  SymbolFactory,
  ApexSymbol,
  SymbolScope,
  Range,
} from '../../types/symbol';
import {
  ClassModifierValidator,
  FieldModifierValidator,
  PropertyModifierValidator,
  InterfaceBodyValidator,
  ErrorReporter,
} from '../../semantics/modifiers/index';
import { IdentifierValidator } from '../../semantics/validation/IdentifierValidator';
import {
  hasIdMethod,
  isEnumSymbol,
  isMethodSymbol,
  isClassSymbol,
  isInterfaceSymbol,
} from '../../utils/symbolNarrowing';
import { isContextType } from '../../utils/contextTypeGuards';

interface SemanticError {
  type: 'semantic';
  severity: 'error' | 'warning';
  message: string;
  line: number;
  column: number;
  filePath: string;
}

/**
 * A listener that collects symbols from Apex code and organizes them into symbol tables.
 * This listener builds a hierarchy of symbol scopes and tracks symbols defined in each scope.
 */
export class ApexSymbolCollectorListener
  extends BaseApexParserListener<SymbolTable>
  implements ErrorReporter
{
  private readonly logger;
  private symbolTable: SymbolTable;
  private currentTypeSymbol: TypeSymbol | null = null;
  private currentMethodSymbol: MethodSymbol | null = null;
  private currentNamespace: Namespace | null = null; // NEW: Track current namespace
  protected projectNamespace: string | undefined = undefined; // NEW: Store project namespace
  private blockDepth: number = 0;
  private blockCounter: number = 0; // Separate counter for unique block names
  private currentModifiers: SymbolModifiers = this.createDefaultModifiers();
  private currentAnnotations: Annotation[] = [];
  private currentFilePath: string = '';
  private semanticErrors: SemanticError[] = [];
  private semanticWarnings: SemanticError[] = [];
  // Assignment LHS suppression state to avoid duplicate captures from child listeners
  private suppressAssignmentLHS: boolean = false;
  private suppressedLHSRange: SymbolLocation | null = null;

  /**
   * Creates a new instance of the ApexSymbolCollectorListener.
   * @param symbolTable Optional existing symbol table to use. If not provided, a new one will be created.
   */
  constructor(symbolTable?: SymbolTable) {
    super();
    this.logger = getLogger();
    this.symbolTable = symbolTable || new SymbolTable();
    // Initialize the file scope
    this.symbolTable.enterScope('file');
  }

  /**
   * Set the project namespace for this compilation
   */
  setProjectNamespace(namespace: string): void {
    this.projectNamespace = namespace;
    this.currentNamespace = namespace ? Namespaces.create(namespace) : null;
    this.logger.debug(() => `Set project namespace to: ${namespace}`);
  }

  /**
   * Get the collected symbol table
   */
  getResult(): SymbolTable {
    return this.symbolTable;
  }

  /**
   * Creates a new instance of this listener for processing multiple files.
   * @returns A new instance of ApexSymbolCollectorListener with a fresh symbol table.
   */
  createNewInstance(): BaseApexParserListener<SymbolTable> {
    const newTable = new SymbolTable();
    newTable.enterScope('file');
    return new ApexSymbolCollectorListener(newTable);
  }

  /**
   * Called when entering an annotation in the Apex code.
   * Processes the annotation and its parameters, creating an annotation object.
   * @param ctx The parser context for the annotation.
   */
  enterAnnotation(ctx: AnnotationContext): void {
    try {
      // Extract qualified annotation name via parser context
      const qn = ctx.qualifiedName?.();
      const ids = qn?.id();
      const _name =
        ids && ids.length > 0
          ? ids.map((i) => i.text).join('.')
          : (ctx.text || '').replace(/^@/, '');
      // Preserve parameters in the annotation name for compatibility with existing tests
      const nameWithParams = (ctx.text || '').replace(/^@/, '');

      const parameters: AnnotationParameter[] = [];

      // elementValuePairs form: name = value (, name = value)*
      const pairs = ctx.elementValuePairs?.();
      if (pairs) {
        const list = pairs.elementValuePair?.() || [];
        for (const p of list) {
          const pname = p.id()?.text;
          const pvalCtx = p.elementValue?.();
          const pval = pvalCtx
            ? this.getTextFromContext(pvalCtx as unknown as ParserRuleContext)
            : '';
          parameters.push({ name: pname, value: pval });
        }
      } else {
        // Single elementValue (positional) form
        const single = ctx.elementValue?.();
        if (single) {
          const value = this.getTextFromContext(
            single as unknown as ParserRuleContext,
          );
          parameters.push({ value });
        }
      }

      const annotation: Annotation = {
        name: nameWithParams,
        location: this.getLocation(ctx),
        parameters,
      };

      this.currentAnnotations.push(annotation);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in annotation: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a modifier
   * The parser will call this for each modifier it encounters
   */
  enterModifier(ctx: ModifierContext): void {
    try {
      const modifier = ctx.text.toLowerCase();

      // Check for modifiers in interface methods
      if (
        this.currentTypeSymbol &&
        isInterfaceSymbol(this.currentTypeSymbol) &&
        this.currentMethodSymbol &&
        modifier
      ) {
        this.addError('Modifiers are not allowed on interface methods', ctx);
      }

      // Apply the modifier to the current modifiers
      this.applyModifier(this.currentModifiers, modifier);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error processing modifier: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a class declaration in the Apex code.
   * Processes the class declaration, its modifiers, and annotations.
   * @param ctx The parser context for the class declaration.
   */
  enterClassDeclaration(ctx: ClassDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownClass';
      this.logger.debug(() => `Entering class declaration: ${name}`);

      // Validate identifier
      const validationResult = IdentifierValidator.validateIdentifier(
        name,
        SymbolKind.Class,
        !this.currentTypeSymbol, // isTopLevel
        this.createValidationScope(),
      );

      if (!validationResult.isValid) {
        validationResult.errors.forEach((error) => {
          this.addError(error, ctx);
        });
        // Continue symbol creation to maximize collection robustness even with invalid identifiers
      }

      // Validate class in interface
      InterfaceBodyValidator.validateClassInInterface(
        name,
        ctx,
        this.currentTypeSymbol,
        this,
      );

      // Get current modifiers and annotations
      const modifiers = this.getCurrentModifiers();
      const annotations = this.getCurrentAnnotations();

      // Validate class modifiers using ClassModifierValidator
      ClassModifierValidator.validateClassVisibilityModifiers(
        name,
        modifiers,
        ctx,
        !!this.currentTypeSymbol, // isInnerClass
        this.currentTypeSymbol,
        annotations,
        this,
      );

      // Get superclass and interfaces
      const superclass = ctx.typeRef()?.text;
      const interfaces =
        ctx
          .typeList()
          ?.typeRef()
          .map((t) => t.text) || [];

      // Validate inner class rules if this is an inner class
      if (this.currentTypeSymbol) {
        // Check for same name as outer class
        if (name === this.currentTypeSymbol.name) {
          this.addError(
            `Inner class '${name}' cannot have the same name as its outer class '${this.currentTypeSymbol.name}'.`,
            ctx,
          );
        }

        // Check for nested inner class by checking if currentTypeSymbol has a parent
        if (this.currentTypeSymbol && this.currentTypeSymbol.parent) {
          this.addError(
            `Inner class '${name}' cannot be defined within another inner class. ` +
              'Apex does not support nested inner classes.',
            ctx,
          );
        }
      }

      // Create a new class symbol
      const classSymbol = this.createTypeSymbol(
        ctx,
        name,
        SymbolKind.Class,
        modifiers,
      );

      // Set superclass and interfaces
      if (superclass) {
        classSymbol.superClass = superclass;
      }
      classSymbol.interfaces = interfaces;

      // Add annotations to the class symbol
      if (annotations.length > 0) {
        classSymbol.annotations = annotations;
      }

      // Store the previous type symbol for parent relationship
      const previousTypeSymbol = this.currentTypeSymbol;

      // Store the current class symbol
      this.currentTypeSymbol = classSymbol;

      // Add symbol to current scope
      this.symbolTable.addSymbol(classSymbol);

      // Manually set parent relationship if this is an inner class
      if (previousTypeSymbol) {
        classSymbol.parent = previousTypeSymbol;
      }

      // Enter class scope
      this.symbolTable.enterScope(name);
      this.logger.debug(() => `Entered class scope: ${name}`);

      // Reset annotations for the next symbol
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in class declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a class declaration
   */
  exitClassDeclaration(): void {
    // Exit the class scope
    const currentScope = this.symbolTable.getCurrentScope();
    this.logger.debug(() => `Exiting class scope: ${currentScope.name}`);
    this.symbolTable.exitScope();

    // Clear current type symbol
    this.currentTypeSymbol = null;
  }

  /**
   * Called when entering an interface declaration
   */
  enterInterfaceDeclaration(ctx: InterfaceDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownInterface';
      this.logger.debug(() => `Entering interface declaration: ${name}`);

      // Validate identifier
      const validationResult = IdentifierValidator.validateIdentifier(
        name,
        SymbolKind.Interface,
        !this.currentTypeSymbol, // isTopLevel
        this.createValidationScope(),
      );

      if (!validationResult.isValid) {
        validationResult.errors.forEach((error) => {
          this.addError(error, ctx);
        });
        // Continue symbol creation to maximize collection robustness even with invalid identifiers
      }

      // Validate interface in interface
      InterfaceBodyValidator.validateInterfaceInInterface(
        name,
        ctx,
        this.currentTypeSymbol,
        this,
      );

      // Get current modifiers and annotations
      const modifiers = this.getCurrentModifiers();
      const annotations = this.getCurrentAnnotations();

      // Validate interface modifiers using ClassModifierValidator
      ClassModifierValidator.validateInterfaceVisibilityModifiers(
        name,
        modifiers,
        ctx,
        !!this.currentTypeSymbol, // isInnerInterface
        this.currentTypeSymbol,
        this,
      );

      // Get interfaces
      const interfaces =
        ctx
          .typeList()
          ?.typeRef()
          .map((t) => t.text) || [];

      // Create a new interface symbol
      const interfaceSymbol = this.createTypeSymbol(
        ctx,
        name,
        SymbolKind.Interface,
        modifiers,
      );

      // Set interfaces
      interfaceSymbol.interfaces = interfaces;

      // Add annotations to the interface symbol
      if (annotations.length > 0) {
        interfaceSymbol.annotations = annotations;
      }

      // Store the current interface symbol
      this.currentTypeSymbol = interfaceSymbol;

      // Add symbol to current scope
      this.symbolTable.addSymbol(interfaceSymbol);

      // Enter interface scope
      this.symbolTable.enterScope(name);
      this.logger.debug(() => `Entered interface scope: ${name}`);

      // Reset annotations for the next symbol
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in interface declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting an interface declaration
   */
  exitInterfaceDeclaration(): void {
    // Exit the interface scope
    this.symbolTable.exitScope();
    this.currentTypeSymbol = null;
  }

  /**
   * Called when entering a method declaration in the Apex code.
   * Processes the method declaration, its modifiers, return type, and annotations.
   * @param ctx The parser context for the method declaration.
   */
  enterMethodDeclaration(ctx: MethodDeclarationContext): void {
    try {
      this.logger.debug(() => 'ENTERING METHOD DECLARATION');

      // Enhanced debug logging for method name extraction
      const idNode = ctx.id();
      let name = idNode?.text ?? 'unknownMethod';

      // If the ID node is empty, try to extract from formal parameters
      if (!name || name.trim() === '') {
        const formalParams = ctx.formalParameters();
        if (formalParams) {
          // The method name is typically the first part before the parentheses
          const paramsText = formalParams.text;
          const match = paramsText.match(/^([^(]+)\(/);
          if (match) {
            name = match[1].trim();
          }
        }
      }

      this.logger.debug(
        `DEBUG: enterMethodDeclaration called for method: ${name}`,
      );
      this.logger.debug(
        `DEBUG: ctx.id() result: ${idNode ? 'present' : 'null'}`,
      );
      this.logger.debug(`DEBUG: ctx.text: "${ctx.text}"`);
      this.logger.debug(
        `DEBUG: ctx.children count: ${ctx.children?.length || 0}`,
      );
      if (ctx.children) {
        ctx.children.forEach((child, index) => {
          this.logger.debug(
            `DEBUG: Child ${index}: ${child.text} (${child.constructor.name})`,
          );
        });
      }

      this.logger.debug(() => '=== Method Declaration Debug ===');
      this.logger.debug(() => `Context type: ${ctx.constructor.name}`);
      this.logger.debug(() => `ID node: ${idNode ? 'present' : 'null'}`);
      this.logger.debug(() => `ID node text: "${idNode?.text || 'undefined'}"`);
      this.logger.debug(
        () => `ID node type: ${idNode?.constructor.name || 'null'}`,
      );
      this.logger.debug(() => `Extracted name: "${name}"`);
      this.logger.debug(
        () => `Current type symbol: ${this.currentTypeSymbol?.name || 'null'}`,
      );
      this.logger.debug(
        () =>
          `Current namespace: ${this.currentNamespace?.toString() || 'null'}`,
      );

      this.logger.debug(
        () =>
          `Entering method declaration: ${name} in class: ${this.currentTypeSymbol?.name}`,
      );

      // Validate identifier
      const validationResult = IdentifierValidator.validateIdentifier(
        name,
        SymbolKind.Method,
        false, // Methods are never top-level
        this.createValidationScope(),
      );

      if (!validationResult.isValid) {
        validationResult.errors.forEach((error) => {
          this.addError(error, ctx);
        });
        // Continue symbol creation to maximize collection robustness even with invalid identifiers
      }

      // Get current modifiers and annotations
      const modifiers = this.getCurrentModifiers();
      const annotations = this.getCurrentAnnotations();

      // Check for conflicting modifiers
      if (modifiers.isAbstract && modifiers.isFinal) {
        this.addError('Method cannot be both abstract and final', ctx);
      }

      if (modifiers.isAbstract && modifiers.isStatic) {
        this.addError('Method cannot be both abstract and static', ctx);
      }

      // Get the return type
      const returnType = this.getReturnType(ctx);

      // Check for method override
      if (modifiers.isOverride) {
        const parentClass = this.currentTypeSymbol?.parent;
        if (!parentClass) {
          this.addWarning(
            `Override method ${name} must ensure a parent class has a compatible method`,
            ctx,
          );
        }
      }

      // Check for duplicate method in the same scope
      if (this.currentTypeSymbol) {
        const currentScope = this.symbolTable.getCurrentScope();
        const existingSymbols = currentScope.getAllSymbols();

        // Get the parameter types for the current method
        const currentParamTypes =
          ctx
            .formalParameters()
            ?.formalParameterList()
            ?.formalParameter()
            ?.map((param) => this.getTextFromContext(param.typeRef()))
            .join(',') || '';

        const duplicateMethod = existingSymbols.find((s) => {
          if (!isMethodSymbol(s) || s.name !== name) {
            return false;
          }
          const existingParamTypes =
            s.parameters
              ?.map((param) => param.type.originalTypeString)
              .join(',') || '';
          return existingParamTypes === currentParamTypes;
        });

        if (duplicateMethod) {
          this.addError(`Duplicate method declaration: ${name}`, ctx);
          return;
        }
      }

      // Create a new method symbol
      const methodSymbol = this.createMethodSymbol(
        ctx,
        name,
        modifiers,
        returnType,
      );

      // Add annotations to the method symbol
      if (annotations.length > 0) {
        methodSymbol.annotations = annotations;
      }

      // Store the current method symbol
      this.currentMethodSymbol = methodSymbol;
      this.logger.debug(`DEBUG: Created method symbol: ${methodSymbol.name}`);

      // Add method symbol to current scope
      this.symbolTable.addSymbol(methodSymbol);
      this.logger.debug(
        `DEBUG: Added method symbol to symbol table: ${methodSymbol.name}`,
      );

      // Enter method scope
      this.symbolTable.enterScope(name);
      this.logger.debug(`DEBUG: Entered method scope: ${name}`);
      this.logger.debug(() => `Entered method scope: ${name}`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in method declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a method declaration in the Apex code.
   * Cleans up the method scope and resets the current method symbol.
   */
  exitMethodDeclaration(): void {
    // Exit method scope
    const currentScope = this.symbolTable.getCurrentScope();
    this.logger.debug(() => `Exiting method scope: ${currentScope.name}`);
    this.symbolTable.exitScope();

    // Clear current method symbol
    this.currentMethodSymbol = null;

    // Reset modifiers and annotations for the next symbol
    this.resetModifiers();
    this.resetAnnotations();
  }

  /**
   * Called when entering a constructor declaration in the Apex code.
   * Processes the constructor declaration, its modifiers, and validates visibility.
   * @param ctx The parser context for the constructor declaration.
   */
  enterConstructorDeclaration(ctx: ConstructorDeclarationContext): void {
    try {
      this.logger.debug(() => 'ENTERING CONSTRUCTOR DECLARATION');

      // Extract constructor name from the qualified name in the context
      const qualifiedName = ctx.qualifiedName();
      const ids = qualifiedName?.id();
      const lastId = ids && ids.length > 0 ? ids[ids.length - 1] : undefined;
      const name =
        lastId?.text ?? this.currentTypeSymbol?.name ?? 'unknownConstructor';

      // Validate that constructor name is not a dotted name (semantic error)
      if (ids && ids.length > 1) {
        const qualifiedNameError =
          'Invalid constructor declaration: Constructor names cannot use qualified names. Found: ' +
          this.getTextFromContext(qualifiedName);
        this.addError(qualifiedNameError, ctx);
        return;
      }

      // Validate that constructor name matches the enclosing class name
      if (this.currentTypeSymbol && name !== this.currentTypeSymbol.name) {
        const errorMessage =
          "Invalid constructor declaration: Constructor name '" +
          name +
          "' must match the enclosing class name '" +
          this.currentTypeSymbol.name +
          "'";
        this.addError(errorMessage, ctx);
        return;
      }

      // Validate constructor in interface
      InterfaceBodyValidator.validateConstructorInInterface(
        name,
        ctx,
        this.currentTypeSymbol,
        this,
      );

      // Check for duplicate constructor
      if (this.currentTypeSymbol) {
        const currentScope = this.symbolTable.getCurrentScope();
        const existingSymbols = currentScope.getAllSymbols();

        // Get the parameter types for the current constructor
        const currentParamTypes =
          ctx
            .formalParameters()
            ?.formalParameterList()
            ?.formalParameter()
            ?.map((param) => this.getTextFromContext(param.typeRef()))
            .join(',') || '';

        const duplicateConstructor = existingSymbols.find((s) => {
          if (!isMethodSymbol(s) || s.name !== name || !s.isConstructor) {
            return false;
          }
          const existingParamTypes =
            s.parameters
              ?.map((param) => param.type.originalTypeString)
              .join(',') || '';
          return existingParamTypes === currentParamTypes;
        });

        if (duplicateConstructor) {
          this.addError(`Duplicate constructor declaration: ${name}`, ctx);
          return;
        }
      }

      const modifiers = this.getCurrentModifiers();

      // Get the qualified name id location which is the last id in the qualified name
      let qualifiedNameIdLocation: SymbolLocation | undefined;
      if (lastId?.start && lastId?.stop) {
        // lastId is a terminal token, so we need to create the location manually
        qualifiedNameIdLocation = {
          symbolRange: {
            startLine: lastId.start.line,
            startColumn: lastId.start.charPositionInLine,
            endLine: lastId.stop.line,
            endColumn:
              lastId.stop.charPositionInLine + (lastId.stop.text?.length ?? 0),
          },
          identifierRange: {
            startLine: lastId.start.line,
            startColumn: lastId.start.charPositionInLine,
            endLine: lastId.stop.line,
            endColumn:
              lastId.stop.charPositionInLine + (lastId.stop.text?.length ?? 0),
          },
        };
        this.logger.debug(
          () =>
            `DEBUG: Created constructor identifier location: ${JSON.stringify(qualifiedNameIdLocation)}`,
        );
      } else {
        this.logger.debug(
          () =>
            `DEBUG: No lastId location found for constructor: lastId=${JSON.stringify(lastId)}`,
        );
      }

      // Create constructor symbol using createMethodSymbol method
      const constructorSymbol = this.createMethodSymbol(
        ctx,
        name,
        modifiers,
        createPrimitiveType('void'),
        qualifiedNameIdLocation,
      );

      this.logger.debug(
        () =>
          `DEBUG: Constructor symbol created with location: ${JSON.stringify(constructorSymbol.location)}`,
      );
      this.logger.debug(
        () =>
          `DEBUG: Constructor symbol location type: ${typeof constructorSymbol.location}`,
      );
      this.logger.debug(
        () =>
          `DEBUG: Constructor symbol has location: ${!!constructorSymbol.location}`,
      );

      // Set constructor-specific properties
      constructorSymbol.isConstructor = true;
      constructorSymbol.kind = SymbolKind.Constructor;
      this.currentMethodSymbol = constructorSymbol;
      this.symbolTable.addSymbol(constructorSymbol);
      this.symbolTable.enterScope(name);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in constructor: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a constructor declaration in the Apex code.
   * Cleans up the constructor scope and resets the current method symbol.
   */
  exitConstructorDeclaration(): void {
    // Exit constructor scope
    this.symbolTable.exitScope();
    this.currentMethodSymbol = null;
  }

  /**
   * Called when entering an interface method declaration in the Apex code.
   * Processes the interface method declaration, its modifiers, and annotations.
   * @param ctx The parser context for the interface method declaration.
   */
  enterInterfaceMethodDeclaration(
    ctx: InterfaceMethodDeclarationContext,
  ): void {
    try {
      // Enhanced debug logging for interface method name extraction
      const idNode = ctx.id();
      const name = idNode?.text ?? 'unknownMethod';

      this.logger.debug(() => '=== Interface Method Declaration Debug ===');
      this.logger.debug(() => `Context type: ${ctx.constructor.name}`);
      this.logger.debug(() => `ID node: ${idNode ? 'present' : 'null'}`);
      this.logger.debug(() => `ID node text: "${idNode?.text || 'undefined'}"`);
      this.logger.debug(
        () => `ID node type: ${idNode?.constructor.name || 'null'}`,
      );
      this.logger.debug(() => `Extracted name: "${name}"`);
      this.logger.debug(
        () => `Current type symbol: ${this.currentTypeSymbol?.name || 'null'}`,
      );
      this.logger.debug(
        () =>
          `Current namespace: ${this.currentNamespace?.toString() || 'null'}`,
      );

      // Get current annotations
      const annotations = this.getCurrentAnnotations();

      // Check for duplicate method in the same scope
      if (this.currentTypeSymbol) {
        const currentScope = this.symbolTable.getCurrentScope();
        const existingSymbols = currentScope.getAllSymbols();
        const duplicateMethod = existingSymbols.find(
          (s) => isMethodSymbol(s) && s.name === name,
        );

        if (duplicateMethod) {
          this.addError(`Duplicate interface method declaration: ${name}`, ctx);
          return;
        }
      }

      // Interface methods are implicitly public and abstract
      const implicitModifiers: SymbolModifiers = {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: true,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      };

      // Get the return type
      const returnType = this.getReturnType(ctx);

      // Create a new method symbol
      const methodSymbol = this.createMethodSymbol(
        ctx,
        name,
        implicitModifiers,
        returnType,
      );

      // Add annotations to the method symbol
      if (annotations.length > 0) {
        methodSymbol.annotations = annotations;
      }

      // Store the current method symbol
      this.currentMethodSymbol = methodSymbol;

      // Add method symbol to current scope
      this.symbolTable.addSymbol(methodSymbol);

      // Enter method scope
      this.symbolTable.enterScope(name);
      this.logger.debug(() => `Entered interface method scope: ${name}`);

      // Reset annotations for the next symbol
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(
        `Error in interface method declaration: ${errorMessage}`,
        ctx,
      );
    }
  }

  /**
   * Called when exiting an interface method declaration in the Apex code.
   * Cleans up the method scope and resets the current method symbol.
   */
  exitInterfaceMethodDeclaration(): void {
    // Exit method scope
    this.symbolTable.exitScope();
    this.currentMethodSymbol = null;
  }

  /**
   * Called when entering a formal parameter (method parameter)
   */
  enterFormalParameter(ctx: FormalParameterContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownParameter';
      const type = this.createTypeInfo(ctx.typeRef()?.text ?? 'Object');
      const modifiers = this.getCurrentModifiers();

      // Create parameter symbol using createVariableSymbol method
      const paramSymbol = this.createVariableSymbol(
        ctx,
        modifiers,
        name,
        SymbolKind.Parameter,
        type,
      );

      if (this.currentMethodSymbol) {
        this.currentMethodSymbol.parameters.push(paramSymbol);
      }
      this.symbolTable.addSymbol(paramSymbol);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in parameter: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a property declaration
   */
  enterPropertyDeclaration(ctx: PropertyDeclarationContext): void {
    try {
      const type = this.createTypeInfo(this.getTextFromContext(ctx.typeRef()!));
      const name = ctx.id?.()?.text ?? 'unknownProperty';
      this.logger.debug(
        `Entering property declaration in class: ${this.currentTypeSymbol?.name}, type: ${type.name}`,
      );

      // Get current modifiers
      const modifiers = this.getCurrentModifiers();

      // Validate property declaration in interface
      if (this.currentTypeSymbol) {
        InterfaceBodyValidator.validatePropertyInInterface(
          modifiers,
          ctx,
          this.currentTypeSymbol,
          this,
        );
        // Additional field/property modifier validations
        PropertyModifierValidator.validatePropertyVisibilityModifiers(
          modifiers,
          ctx,
          this.currentTypeSymbol,
          this,
        );
      }

      // Create and add the property symbol
      const propertySymbol = this.createVariableSymbol(
        ctx,
        modifiers,
        name,
        SymbolKind.Property,
        type,
      );
      this.symbolTable.addSymbol(propertySymbol);

      // Reset modifiers and annotations for the next symbol
      this.resetModifiers();
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in property declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a field declaration
   */
  enterFieldDeclaration(ctx: FieldDeclarationContext): void {
    this.logger.debug(() => 'enterFieldDeclaration called');
    try {
      const type = this.createTypeInfo(this.getTextFromContext(ctx.typeRef()!));
      this.logger.debug(
        () =>
          `Entering field declaration in class: ${this.currentTypeSymbol?.name}, type: ${type.name}`,
      );

      // Get current modifiers
      const modifiers = this.getCurrentModifiers();

      // Validate field declaration in interface
      if (this.currentTypeSymbol) {
        InterfaceBodyValidator.validateFieldInInterface(
          modifiers,
          ctx,
          this.currentTypeSymbol,
          this,
        );

        // Additional field modifier validations
        FieldModifierValidator.validateFieldVisibilityModifiers(
          modifiers,
          ctx,
          this.currentTypeSymbol,
          this,
        );
      }

      // Process each variable declarator in the field declaration
      for (const declarator of ctx
        .variableDeclarators()
        ?.variableDeclarator() || []) {
        const name = declarator.id()?.text ?? 'unknownVariable';
        this.logger.debug(
          () =>
            `Processing field variable: ${name} in class: ${this.currentTypeSymbol?.name}`,
        );
        this.processVariableDeclarator(
          declarator,
          type,
          modifiers,
          SymbolKind.Field,
        );
      }

      // Reset modifiers and annotations for the next symbol
      this.resetModifiers();
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in field declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a local variable declaration statement
   */
  enterLocalVariableDeclarationStatement(ctx: ParserRuleContext): void {
    try {
      this.logger.debug(() => 'enterLocalVariableDeclarationStatement called');
      this.logger.debug(() => `Context text: ${ctx.text}`);
      this.logger.debug(
        () => `Current method: ${this.currentMethodSymbol?.name}`,
      );
      this.logger.debug(
        () => `Current scope: ${this.symbolTable.getCurrentScope().name}`,
      );

      // Extract the local variable declaration from the statement
      // The statement has the structure: localVariableDeclaration SEMI
      // So the first child should be the localVariableDeclaration
      const localVarDecl = ctx.children?.[0];
      if (localVarDecl) {
        this.logger.debug(
          () =>
            `Found local variable declaration child: ${localVarDecl.constructor.name}`,
        );

        // Process the local variable declaration directly here
        // since the parser doesn't call enterLocalVariableDeclaration
        this.processLocalVariableDeclaration(localVarDecl);
      } else {
        this.logger.debug(() => 'No local variable declaration child found');
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(
        `Error in local variable declaration statement: ${errorMessage}`,
        ctx,
      );
    }
  }

  /**
   * Called when entering an enum declaration
   */
  enterEnumDeclaration(ctx: EnumDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownEnum';

      // Validate enum in interface
      InterfaceBodyValidator.validateEnumInInterface(
        name,
        ctx,
        this.currentTypeSymbol,
        this,
      );

      const modifiers = this.getCurrentModifiers();

      // Create enum symbol using createTypeSymbol method
      const enumSymbol = this.createTypeSymbol(
        ctx,
        name,
        SymbolKind.Enum,
        modifiers,
      );

      this.currentTypeSymbol = enumSymbol;
      this.symbolTable.addSymbol(enumSymbol);
      this.symbolTable.enterScope(name);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in enum: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering enum constants
   */
  enterEnumConstants(ctx: EnumConstantsContext): void {
    try {
      if (!isEnumSymbol(this.currentTypeSymbol)) {
        this.addError('Enum constants found outside of enum declaration', ctx);
        return;
      }

      const enumType = this.createTypeInfo(
        this.currentTypeSymbol?.name ?? 'Object',
      );
      const enumSymbol = this.currentTypeSymbol;

      for (const id of ctx.id()) {
        const name = id.text;
        const modifiers = this.getCurrentModifiers();

        // Create enum value symbol using createVariableSymbol method
        const valueSymbol = this.createVariableSymbol(
          id,
          modifiers,
          name,
          SymbolKind.EnumValue,
          enumType,
        );

        enumSymbol.values.push(valueSymbol);
        this.symbolTable.addSymbol(valueSymbol);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in enum constants: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting an enum declaration
   */
  exitEnumDeclaration(): void {
    // Exit enum scope
    this.symbolTable.exitScope();
  }

  /**
   * Called when entering a block
   */
  enterBlock(ctx: BlockContext): void {
    try {
      this.blockDepth++;
      this.blockCounter++; // Increment the unique block counter
      const name = `block${this.blockCounter}`; // Use blockCounter for unique names

      // Only create scope for block management, don't register as a symbol
      // Blocks are only needed for local scope management within a file
      this.symbolTable.enterScope(name, 'block');

      // Note: We don't add block symbols to the symbol table since they're
      // only needed for scope management, not as trackable symbols
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in block: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a block
   */
  exitBlock(): void {
    // Exit block scope
    const currentScope = this.symbolTable.getCurrentScope();
    this.logger.debug(() => `Exiting block scope: ${currentScope.name}`);
    this.symbolTable.exitScope();
    this.blockDepth--;
  }
  /**
   * Called when entering a trigger declaration
   */
  enterTriggerMemberDeclaration(ctx: TriggerMemberDeclarationContext): void {
    try {
      // Get the trigger name from the parent context
      const triggerUnit = ctx.parent?.parent as TriggerUnitContext;
      const name = triggerUnit?.id(0)?.text ?? 'unknownTrigger';
      const modifiers = this.getCurrentModifiers();

      // Create trigger symbol
      const triggerSymbol = this.createTypeSymbol(
        ctx,
        name,
        SymbolKind.Trigger,
        modifiers,
      );

      // Store the current type symbol
      this.currentTypeSymbol = triggerSymbol;

      // Add symbol to current scope
      this.symbolTable.addSymbol(triggerSymbol);

      // Enter trigger scope
      this.symbolTable.enterScope(name);
      this.logger.debug(() => `Entered trigger scope: ${name}`);

      // Reset annotations for the next symbol
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in trigger declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a trigger declaration
   */
  exitTriggerMemberDeclaration(): void {
    // Exit trigger scope
    this.symbolTable.exitScope();
    this.currentTypeSymbol = null;
  }

  /**
   * Called when entering a trigger unit
   */
  enterTriggerUnit(ctx: TriggerUnitContext): void {
    try {
      // Get the trigger name from the first id
      const name = ctx.id(0)?.text ?? 'unknownTrigger';
      const modifiers = this.getCurrentModifiers();

      // Create trigger symbol
      const triggerSymbol = this.createTypeSymbol(
        ctx,
        name,
        SymbolKind.Trigger,
        modifiers,
      );

      // Store the current type symbol
      this.currentTypeSymbol = triggerSymbol;

      // Add symbol to current scope
      this.symbolTable.addSymbol(triggerSymbol);

      // Enter trigger scope
      this.symbolTable.enterScope(name);
      this.logger.debug(() => `Entered trigger scope: ${name}`);

      // Reset annotations for the next symbol
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in trigger declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a trigger unit
   */
  exitTriggerUnit(): void {
    // Exit trigger scope
    this.symbolTable.exitScope();
    this.currentTypeSymbol = null;
  }

  // NEW: Type Reference Capture Methods - Using Specific ANTLR Contexts

  /**
   * Capture method call references (e.g., "FileUtilities.createFile(...)")
   */
  enterMethodCallExpression(ctx: MethodCallExpressionContext): void {
    // No-op: method calls are captured in enterMethodCall for precise identifier locations
    this.logger.debug(
      () =>
        `DEBUG: enterMethodCallExpression encountered. Deferring to enterMethodCall for capture. Text: "${ctx.text}"`,
    );
  }

  /**
   * Capture constructor call references (e.g., "new Property__c()")
   */
  enterNewExpression(ctx: NewExpressionContext): void {
    this.logger.debug(
      `DEBUG: enterNewExpression called with text: "${ctx.text}"`,
    );
    try {
      this.captureConstructorCallReference(ctx);
    } catch (error) {
      this.logger.warn(
        () => `Error capturing constructor call reference: ${error}`,
      );
    }
  }

  /**
   * Capture field access references (e.g., "property.Id")
   */
  enterDotExpression(ctx: DotExpressionContext): void {
    // Suppress during LHS of assignment to avoid duplicate captures
    if (this.shouldSuppress(ctx)) {
      this.logger.debug(
        () =>
          `DEBUG: Suppression state: suppressAssignmentLHS=${
            this.suppressAssignmentLHS
          }, suppressedLHSRange=${JSON.stringify(this.suppressedLHSRange)}`,
      );
      return;
    }
    this.logger.debug(
      `DEBUG: enterDotExpression called with text: "${ctx.text}"`,
    );
    try {
      // Only capture field accesses here. Dot-method calls are handled in enterDotMethodCall
      this.captureDottedReferences(ctx);
    } catch (error) {
      this.logger.warn(() => `Error capturing dotted references: ${error}`);
    }
  }

  /**
   * Capture unqualified method calls using dedicated MethodCallContext
   */
  enterMethodCall(ctx: MethodCallContext): void {
    try {
      const idNode = ctx.id();
      const methodName = idNode?.text || 'unknownMethod';
      const location = idNode
        ? this.getLocation(idNode)
        : this.getLocation(ctx);
      const parentContext = this.getCurrentMethodName();

      const reference = TypeReferenceFactory.createMethodCallReference(
        methodName,
        location,
        undefined,
        parentContext,
      );
      this.symbolTable.addTypeReference(reference);
      this.logger.debug(
        () => `Captured method call (unqualified): ${methodName}`,
      );
    } catch (error) {
      this.logger.warn(() => `Error capturing MethodCall: ${error}`);
    }
  }

  /**
   * Capture qualified method calls like "Assert.isFalse(...)" using DotMethodCallContext
   */
  enterDotMethodCall(ctx: DotMethodCallContext): void {
    try {
      const anyIdNode = ctx.anyId();
      const methodName = anyIdNode?.text || 'unknownMethod';
      const methodLocation = anyIdNode
        ? this.getLocation(anyIdNode as unknown as ParserRuleContext)
        : this.getLocation(ctx);

      // Extract qualifier from the parent DotExpression
      let qualifier: string | undefined = undefined;
      let qualifierLocation: SymbolLocation | undefined = undefined;
      const parent = ctx.parent as ParserRuleContext | undefined;
      if (
        parent &&
        parent.constructor &&
        parent.constructor.name === 'DotExpressionContext'
      ) {
        const dotParent = parent as unknown as DotExpressionContext;
        const lhs =
          (dotParent as any).expression?.(0) ||
          (dotParent as any).expression?.();
        if (lhs) {
          qualifier = this.getTextFromContext(lhs);
          const parentLoc = this.getLocation(dotParent);
          if (qualifier) {
            qualifierLocation = parentLoc;
          }
        }
      }

      const parentContext = this.getCurrentMethodName();
      // Emit qualifier reference first for parity with previous behavior and tests
      if (qualifier && qualifierLocation) {
        const isClassReference = !this.isVariableInScope(qualifier);
        if (isClassReference) {
          const classRef = TypeReferenceFactory.createClassReference(
            qualifier,
            qualifierLocation,
            parentContext,
          );
          this.symbolTable.addTypeReference(classRef);
        } else {
          const variableRef = TypeReferenceFactory.createVariableUsageReference(
            qualifier,
            qualifierLocation,
            parentContext,
          );
          this.symbolTable.addTypeReference(variableRef);
        }
      }

      const reference = TypeReferenceFactory.createMethodCallReference(
        methodName,
        methodLocation,
        qualifier,
        parentContext,
      );
      this.symbolTable.addTypeReference(reference);
      this.logger.debug(
        () =>
          `Captured method call (qualified): ${qualifier ? qualifier + '.' : ''}${methodName}`,
      );
    } catch (error) {
      this.logger.warn(() => `Error capturing DotMethodCall: ${error}`);
    }
  }

  /**
   * Capture type references in variable declarations
   */
  enterTypeRef(ctx: TypeRefContext): void {
    try {
      // If this TypeRef is a generic argument (inside a TypeList), skip here.
      // The outer owning TypeRef will capture generic parameter references once with precise locations.
      if (this.isGenericArgument(ctx)) {
        return;
      }

      const typeNames = ctx.typeName();
      if (!typeNames || typeNames.length === 0) return;

      // Get the first typeName (there should only be one in most cases)
      const typeName = typeNames[0];
      if (!typeName) return;

      // Determine if this is a type declaration (variable/field declaration) or parameter
      const isTypeDeclaration = this.isTypeDeclarationContext(ctx);

      // Use grammar structure: typeName is either LIST/SET/MAP (reserved) or id (regular identifier)
      const baseTypeId = typeName.id();
      let baseTypeName: string | undefined;
      let baseLocation: SymbolLocation | undefined;

      if (baseTypeId) {
        // Regular identifier case: id typeArguments?
        baseTypeName = baseTypeId.text;
        baseLocation = this.getLocationForReference(baseTypeId);
      } else {
        // Collection type case: LIST/SET/MAP typeArguments?
        // The grammar ensures these are the only reserved types without id()
        // For collection types, the base is the first token (List, Set, or Map)

        baseTypeName = `${typeName.LIST() || typeName.SET() || typeName.MAP()}`;
        const tnLoc = this.getLocationForReference(typeName);
        baseLocation = tnLoc;
      }

      if (baseTypeName && baseLocation) {
        const parentContext = this.determineTypeReferenceContext(ctx);
        const baseReference = isTypeDeclaration
          ? TypeReferenceFactory.createTypeDeclarationReference(
              baseTypeName,
              baseLocation,
              parentContext,
            )
          : TypeReferenceFactory.createParameterTypeReference(
              baseTypeName,
              baseLocation,
              parentContext,
            );
        this.symbolTable.addTypeReference(baseReference);
        this.logger.debug(
          () =>
            `DEBUG: Created ${
              isTypeDeclaration ? 'TYPE_DECLARATION' : 'PARAMETER_TYPE'
            } for base type: "${baseTypeName}" in context: ${
              parentContext || 'unknown'
            }`,
        );
      }

      // Check for generics using parser structure
      const typeArgs = typeName.typeArguments();
      if (typeArgs) {
        const typeList = typeArgs.typeList();
        if (typeList) {
          for (const genericTypeRef of typeList.typeRef()) {
            const genericTypeName = genericTypeRef.text;
            const location = this.getLocationForReference(genericTypeRef);
            const parentContext = this.determineTypeReferenceContext(ctx);

            // Check if we already have a reference for this generic type at the same location
            if (
              this.hasExistingTypeReferenceAtLocation(
                genericTypeName,
                location,
                parentContext,
              )
            ) {
              this.logger.debug(
                () =>
                  `DEBUG: Skipping duplicate generic type reference at location: ${genericTypeName} ` +
                  `in context: ${parentContext}`,
              );
              continue;
            }

            const genericReference = isTypeDeclaration
              ? TypeReferenceFactory.createTypeDeclarationReference(
                  genericTypeName,
                  location,
                  parentContext,
                )
              : TypeReferenceFactory.createParameterTypeReference(
                  genericTypeName,
                  location,
                  parentContext,
                );
            this.symbolTable.addTypeReference(genericReference);

            this.logger.debug(
              () =>
                `DEBUG: Created PARAMETER_TYPE for generic type: "${genericTypeName}" ` +
                `in context: ${parentContext || 'unknown'}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        () => `Error capturing type declaration reference: ${error}`,
      );
    }
  }

  /**
   * Handle anyId in dot expressions (e.g., the "Id" in "property.Id")
   * This captures field access references directly from the parser structure
   */
  enterAnyId(ctx: AnyIdContext): void {
    try {
      this.logger.debug(
        () => `DEBUG: enterAnyId called with text: "${ctx.text || ''}"`,
      );

      // Check if this is part of a dot expression
      const parent = ctx.parent;
      this.logger.debug(
        () =>
          `DEBUG: Parent context: ${parent?.constructor?.name || 'undefined'}`,
      );

      if (parent && isContextType(parent, DotExpressionContext)) {
        const dotContext = parent;
        const fieldName = ctx.text;

        this.logger.debug(
          () => `DEBUG: Processing dot expression for field: "${fieldName}"`,
        );

        // Check if we're in an assignment LHS context to avoid duplication
        if (this.isInAssignmentLHS(ctx)) {
          this.logger.debug(
            () =>
              `DEBUG: Skipping field access capture in assignment LHS: "${fieldName}"`,
          );
          return;
        }

        // Get the left expression (the object)
        const expressions = dotContext.expression();
        this.logger.debug(
          () =>
            `DEBUG: Expressions type: ${typeof expressions}, isArray: ${Array.isArray(expressions)}`,
        );

        // Handle both array and single expression cases
        const leftExpression =
          Array.isArray(expressions) && expressions.length > 0
            ? expressions[0]
            : (expressions ?? null);

        this.logger.debug(
          () =>
            `DEBUG: Left expression type: ${leftExpression?.constructor?.name || 'undefined'}`,
        );

        if (leftExpression) {
          const objectName = leftExpression.text;

          this.logger.debug(
            () => `DEBUG: Left expression (object): "${objectName}"`,
          );

          // Create FIELD_ACCESS reference
          const location = this.getLocationForReference(ctx);
          const parentContext = this.getCurrentMethodName();

          const fieldRef = TypeReferenceFactory.createFieldAccessReference(
            fieldName,
            location,
            objectName,
            parentContext,
          );

          this.symbolTable.addTypeReference(fieldRef);
          this.logger.debug(
            () => `Captured FIELD_ACCESS: ${fieldName} (object: ${objectName})`,
          );
        }
      } else {
        this.logger.debug(
          () =>
            `DEBUG: Not in dot expression context, parent: ${parent?.constructor?.name || 'undefined'}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        () => `Error handling anyId in dot expression: ${error}`,
      );
    }
  }

  /**
   * Capture identifier usage in primary expressions (e.g., variable names)
   * This captures simple variable references like "myVariable"
   */
  enterIdPrimary(ctx: IdPrimaryContext): void {
    if (this.shouldSuppress(ctx)) {
      this.logger.debug(
        () =>
          `DEBUG: Suppressing idPrimary within assignment LHS: "${ctx.text || ''}"`,
      );
      return;
    }

    // Skip emitting a VARIABLE_USAGE when this identifier participates in a dotted
    // expression (e.g., EncodingUtil.urlEncode or obj.field), UNLESS it's a method call parameter.
    // Method call parameters need to be captured even inside dot expressions.
    if (!this.isMethodCallParameter(ctx)) {
      let parent: ParserRuleContext | undefined = ctx.parent;
      while (parent) {
        if (
          isContextType(parent, DotExpressionContext) ||
          isContextType(parent, DotMethodCallContext)
        ) {
          this.logger.debug(
            () =>
              `DEBUG: Skipping idPrimary capture inside dot expression: "${ctx.text || ''}"`,
          );
          return;
        }
        parent = parent.parent;
      }
    }

    const variableName = this.getTextFromContext(ctx);
    const location = this.getLocation(ctx);
    const parentContext = this.getCurrentMethodName();

    const reference = TypeReferenceFactory.createVariableUsageReference(
      variableName,
      location,
      parentContext,
    );
    this.symbolTable.addTypeReference(reference);
    this.logger.debug(
      `DEBUG: Created VARIABLE_USAGE for primary identifier: "${variableName}"`,
    );
  }

  /**
   * Capture primary expression references
   * This handles the overall primary expression context
   */
  enterPrimaryExpression(ctx: PrimaryExpressionContext): void {
    // The specific primary types are handled by their individual listeners
    // This method can be used for general primary expression processing if needed
    this.logger.debug('DEBUG: Entering primary expression context');
  }

  /**
   * Capture assignment expression references
   * This captures both left-hand and right-hand side of assignments
   */
  enterAssignExpression(ctx: AssignExpressionContext): void {
    // Decide LHS access (readwrite for compound ops, else write)
    const isCompound = !!(
      ctx.ADD_ASSIGN() ||
      ctx.SUB_ASSIGN() ||
      ctx.MUL_ASSIGN() ||
      ctx.DIV_ASSIGN() ||
      ctx.AND_ASSIGN() ||
      ctx.OR_ASSIGN() ||
      ctx.XOR_ASSIGN() ||
      ctx.LSHIFT_ASSIGN() ||
      ctx.RSHIFT_ASSIGN() ||
      ctx.URSHIFT_ASSIGN()
    );
    const lhsAccess: 'write' | 'readwrite' = isCompound ? 'readwrite' : 'write';

    const leftExpression = ctx.expression(0);
    if (leftExpression) {
      const lhsLoc = this.getLocation(leftExpression);
      const parentContext = this.getCurrentMethodName();
      const lhsText = this.getTextFromContext(leftExpression);

      // Suppress child captures within LHS range
      this.suppressAssignmentLHS = true;
      this.suppressedLHSRange = lhsLoc;

      // If it's a simple identifier, mark as write/readwrite
      if (isContextType(leftExpression, PrimaryExpressionContext)) {
        const varRef = TypeReferenceFactory.createVariableUsageReference(
          lhsText,
          lhsLoc,
          parentContext,
          lhsAccess,
        );
        this.symbolTable.addTypeReference(varRef);
        return;
      }

      // If it's a dotted field reference: obj.field
      if (isContextType(leftExpression, DotExpressionContext)) {
        const dotExpr = leftExpression;
        const anyId = dotExpr.anyId();
        if (anyId) {
          const fieldName = this.getTextFromContext(anyId);
          const objectExpr = dotExpr.expression();
          if (objectExpr) {
            const objectName = this.getTextFromContext(objectExpr);
            const objLocation = lhsLoc;
            // qualifier read
            const objRef = TypeReferenceFactory.createVariableUsageReference(
              objectName,
              objLocation,
              parentContext,
              'read',
            );
            this.symbolTable.addTypeReference(objRef);
            // field write/readwrite
            const fieldRef = TypeReferenceFactory.createFieldAccessReference(
              fieldName,
              lhsLoc,
              objectName,
              parentContext,
              lhsAccess,
            );
            this.symbolTable.addTypeReference(fieldRef);
            return;
          }
        }
      }
      // For complex LHS (e.g., arr[i]), we avoid emitting flattened refs; let child listeners capture reads
    }
  }

  /**
   * Cleanup suppression state after assignment expression
   */
  exitAssignExpression(): void {
    this.suppressAssignmentLHS = false;
    this.suppressedLHSRange = null;
  }

  /**
   * Capture array expression references
   * This captures array access like "myArray[index]"
   */
  enterArrayExpression(ctx: ArrayExpressionContext): void {
    // Capture the array variable name
    const arrayExpression = ctx.expression(0);
    if (arrayExpression) {
      const arrayName = this.getTextFromContext(arrayExpression);
      const location = this.getLocation(arrayExpression);
      const parentContext = this.getCurrentMethodName();

      const reference = TypeReferenceFactory.createVariableUsageReference(
        arrayName,
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(reference);
      this.logger.debug(
        `DEBUG: Created VARIABLE_USAGE for array access: "${arrayName}"`,
      );
    }

    // Capture the index expression
    const indexExpression = ctx.expression(1);
    if (indexExpression) {
      const indexText = this.getTextFromContext(indexExpression);
      const location = this.getLocation(indexExpression);
      const parentContext = this.getCurrentMethodName();

      const reference = TypeReferenceFactory.createVariableUsageReference(
        indexText,
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(reference);
      this.logger.debug(
        `DEBUG: Created VARIABLE_USAGE for array index: "${indexText}"`,
      );
    }
  }

  /**
   * Capture cast expression references
   * This captures type casting like "(String) myVariable"
   */
  enterCastExpression(ctx: CastExpressionContext): void {
    // Capture the type being cast to
    const typeRef = ctx.typeRef();
    if (typeRef) {
      const typeName = this.getTextFromContext(typeRef);
      const location = this.getLocation(typeRef);
      const parentContext = this.getCurrentMethodName();

      const reference = TypeReferenceFactory.createClassReference(
        typeName,
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(reference);
      this.logger.debug(
        `DEBUG: Created CLASS_REFERENCE for cast type: "${typeName}"`,
      );
    }

    // Capture the expression being cast
    const expression = ctx.expression();
    if (expression) {
      const exprText = this.getTextFromContext(expression);
      const location = this.getLocation(expression);
      const parentContext = this.getCurrentMethodName();

      const reference = TypeReferenceFactory.createVariableUsageReference(
        exprText,
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(reference);
      this.logger.debug(
        `DEBUG: Created VARIABLE_USAGE for cast expression: "${exprText}"`,
      );
    }
  }

  /**
   * Capture exception type in catch clauses: catch (QualifiedName e)
   */
  enterCatchClause(ctx: CatchClauseContext): void {
    try {
      const qn: QualifiedNameContext | undefined = ctx.qualifiedName?.();
      if (!qn) return;
      const typeName = this.getTextFromContext(qn);
      const location = this.getLocation(qn as unknown as ParserRuleContext);
      const parentContext = this.getCurrentMethodName();
      const classRef = TypeReferenceFactory.createClassReference(
        typeName,
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(classRef);
      this.logger.debug(
        () => `DEBUG: Created CLASS_REFERENCE for catch type: "${typeName}"`,
      );
    } catch (e) {
      this.logger.warn(() => `Error capturing catch clause type: ${e}`);
    }
  }

  /**
   * Capture enhanced-for variable type and source collection usage
   * for (typeRef id : expression)
   */
  enterEnhancedForControl(ctx: EnhancedForControlContext): void {
    try {
      const typeRef = ctx.typeRef?.();
      if (typeRef) {
        const typeName = this.getTextFromContext(typeRef);
        const location = this.getLocation(typeRef);
        const parentContext = this.getCurrentMethodName();
        const paramRef = TypeReferenceFactory.createParameterTypeReference(
          typeName,
          location,
          parentContext,
        );
        this.symbolTable.addTypeReference(paramRef);
        this.logger.debug(
          () =>
            `DEBUG: Created PARAMETER_TYPE for enhanced for type: "${typeName}"`,
        );
      }

      const expr = ctx.expression?.();
      if (expr) {
        const exprText = this.getTextFromContext(expr);
        const location = this.getLocation(expr);
        const parentContext = this.getCurrentMethodName();
        const usageRef = TypeReferenceFactory.createVariableUsageReference(
          exprText,
          location,
          parentContext,
        );
        this.symbolTable.addTypeReference(usageRef);
        this.logger.debug(
          () =>
            `DEBUG: Created VARIABLE_USAGE for enhanced for source: "${exprText}"`,
        );
      }
    } catch (e) {
      this.logger.warn(() => `Error capturing enhanced for control: ${e}`);
    }
  }

  /**
   * Capture type literals like: TypeName.class
   */
  enterTypeRefPrimary(ctx: TypeRefPrimaryContext): void {
    try {
      const tr = ctx.typeRef?.();
      if (!tr) return;
      const typeName = this.getTextFromContext(tr);
      const location = this.getLocation(tr);
      const parentContext = this.getCurrentMethodName();
      const classRef = TypeReferenceFactory.createClassReference(
        typeName,
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(classRef);
      this.logger.debug(
        () =>
          `DEBUG: Created CLASS_REFERENCE for type literal: "${typeName}.class"`,
      );
    } catch (e) {
      this.logger.warn(() => `Error capturing typeRefPrimary: ${e}`);
    }
  }

  /**
   * Called when entering a for loop initialization
   */
  enterForInit(ctx: any): void {
    try {
      this.logger.debug(
        () =>
          `enterForInit: ${ctx.text} in method: ${this.currentMethodSymbol?.name}`,
      );

      // Check if this is a local variable declaration (e.g., "Integer i = 0")
      const localVarDecl = ctx.localVariableDeclaration();
      if (localVarDecl) {
        // Process the local variable declaration within the for loop
        this.processLocalVariableDeclaration(localVarDecl);
      }

      // Note: If it's an expressionList (e.g., "i = 0"), we don't need to process it
      // as a variable declaration since it's just an assignment to an existing variable
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in for loop initialization: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a for statement
   */
  enterForStatement(ctx: any): void {
    try {
      this.logger.debug(
        () =>
          `enterForStatement: ${ctx.text} in method: ${this.currentMethodSymbol?.name}`,
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in for statement: ${errorMessage}`, ctx);
    }
  }

  /**
   * Add an error to the error list
   */
  addError(message: string, ctx: ParserRuleContext): void {
    const error: SemanticError = {
      type: 'semantic',
      severity: 'error',
      message,
      line: ctx.start.line,
      column: ctx.start.charPositionInLine,
      filePath: this.currentFilePath,
    };
    this.semanticErrors.push(error);
    super.addError(message, ctx);
  }

  /**
   * Add a warning to the warning list
   */
  addWarning(message: string, ctx: ParserRuleContext): void {
    const warning: SemanticError = {
      type: 'semantic',
      severity: 'warning',
      message,
      line: ctx.start.line,
      column: ctx.start.charPositionInLine,
      filePath: this.currentFilePath,
    };
    this.semanticWarnings.push(warning);
    super.addWarning(message, ctx);
  }

  /**
   * Get all semantic errors
   */
  getErrors(): SemanticError[] {
    return this.semanticErrors;
  }

  /**
   * Get all semantic warnings
   */
  getWarnings(): string[] {
    return this.semanticWarnings.map((warning) => warning.message);
  }

  /**
   * Get all semantic warnings with full details
   */
  getSemanticWarnings(): SemanticError[] {
    return this.semanticWarnings;
  }

  /**
   * Create default modifiers
   */
  private createDefaultModifiers(): SymbolModifiers {
    return {
      visibility: SymbolVisibility.Default,
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      isVirtual: false,
      isOverride: false,
      isTransient: false,
      isTestMethod: false,
      isWebService: false,
      isBuiltIn: false,
    };
  }

  /**
   * Reset modifiers to defaults
   */
  private resetModifiers(): void {
    this.currentModifiers = this.createDefaultModifiers();
  }

  /**
   * Get the current modifiers
   */
  private getCurrentModifiers(): SymbolModifiers {
    return { ...this.currentModifiers };
  }

  /**
   * Reset the current annotations list
   */
  private resetAnnotations(): void {
    this.currentAnnotations = [];
  }

  /**
   * Get the current annotations
   */
  private getCurrentAnnotations(): Annotation[] {
    return [...this.currentAnnotations];
  }

  /**
   * Process a local variable declaration (extracted from statement)
   */
  private processLocalVariableDeclaration(ctx: any): void {
    try {
      this.logger.debug(
        () =>
          `processLocalVariableDeclaration: ${ctx.text} in method: ${this.currentMethodSymbol?.name}`,
      );
      // Get current modifiers and reset for next declaration
      const modifiers = this.getCurrentModifiers();
      this.resetModifiers();

      // Extract type reference and variable declarators from children
      // The structure is: modifier* typeRef variableDeclarators
      let typeRefChild: any = null;
      let variableDeclaratorsChild: any = null;

      // Find the typeRef and variableDeclarators children
      for (const child of ctx.children || []) {
        if (child.constructor.name === 'TypeRefContext') {
          typeRefChild = child;
        } else if (child.constructor.name === 'VariableDeclaratorsContext') {
          variableDeclaratorsChild = child;
        }
      }

      // Get the type
      const varTypeText = typeRefChild
        ? this.getTextFromContext(typeRefChild)
        : 'Object';
      const varType = this.createTypeInfo(varTypeText);

      // Process each variable declared
      if (variableDeclaratorsChild) {
        const variableDeclarators =
          variableDeclaratorsChild.variableDeclarator();

        // Collect all variable names in this statement for duplicate checking within the statement
        const statementVariableNames = new Set<string>();

        for (const declarator of variableDeclarators) {
          const name = declarator.id()?.text ?? 'unknownVariable';

          // Check for duplicate variable names within the same statement
          if (statementVariableNames.has(name)) {
            this.addError(
              `Duplicate variable declaration: '${name}' is already declared in this statement`,
              declarator,
            );
            continue; // Skip processing this duplicate variable
          }
          statementVariableNames.add(name);

          // Check for duplicate variable declaration in the current scope (from previous statements)
          const existingSymbol =
            this.symbolTable.findSymbolInCurrentScope(name);
          if (existingSymbol) {
            this.addError(
              `Duplicate variable declaration: '${name}' is already declared in this scope`,
              declarator,
            );
            continue; // Skip processing this duplicate variable
          }

          this.logger.debug(
            () =>
              `Processing local variable: ${name} in method: ${this.currentMethodSymbol?.name}`,
          );

          // Always process the variable in the current scope
          this.processVariableDeclarator(
            declarator,
            varType,
            modifiers,
            SymbolKind.Variable,
          );
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(
        `Error in local variable declaration: ${errorMessage}`,
        ctx,
      );
    }
  }

  /**
   * Process a variable declarator
   */
  private processVariableDeclarator(
    ctx: VariableDeclaratorContext,
    type: TypeInfo,
    modifiers: SymbolModifiers,
    kind: SymbolKind.Field | SymbolKind.Variable | SymbolKind.EnumValue,
  ): void {
    try {
      this.logger.debug(
        () =>
          // eslint-disable-next-line max-len
          `processVariableDeclarator: ${ctx.text} in method: ${this.currentMethodSymbol?.name} type: ${type.name} kind: ${kind}`,
      );

      const name = ctx.id()?.text ?? 'unknownVariable';

      // Validate identifier
      const validationResult = IdentifierValidator.validateIdentifier(
        name,
        kind,
        false, // Variables are never top-level
        this.createValidationScope(),
      );

      if (!validationResult.isValid) {
        validationResult.errors.forEach((error) => {
          this.addError(error, ctx);
        });
      }

      const variableSymbol = this.createVariableSymbol(
        ctx,
        modifiers,
        name,
        kind,
        type,
      );

      this.symbolTable.addSymbol(variableSymbol);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in variable: ${errorMessage}`, ctx);
    }
  }

  /**
   * Get location information from a context
   * symbolRange covers the entire context, identifierRange covers just the identifier
   */
  private getLocation(ctx: ParserRuleContext): SymbolLocation {
    const fullRange = {
      startLine: ctx.start.line, // Use native ANTLR 1-based line numbers
      startColumn: ctx.start.charPositionInLine, // Both use 0-based columns
      endLine: ctx.stop?.line ?? ctx.start.line, // Use native ANTLR 1-based line numbers
      endColumn:
        (ctx.stop?.charPositionInLine ?? ctx.start.charPositionInLine) +
        (ctx.stop?.text?.length ?? 0),
    };

    // Get identifier range using parser's direct access methods
    const identifierRange = this.getIdentifierRange(ctx) || fullRange;

    return {
      symbolRange: fullRange,
      identifierRange: identifierRange,
    };
  }

  /**
   * Get precise location information for just the identifier (name)
   * This excludes any surrounding context like keywords, modifiers, etc.
   *
   * @param ctx The parser context containing the identifier
   * @returns The precise location of the identifier
   */
  private getIdentifierLocation(ctx: ParserRuleContext): SymbolLocation {
    const identifierRange = this.getIdentifierRange(ctx);

    if (identifierRange) {
      return {
        symbolRange: identifierRange, // For identifier-only contexts, both ranges are the same
        identifierRange: identifierRange,
      };
    }

    // Fallback to full context location
    return this.getLocation(ctx);
  }

  /**
   * Extract the precise range of the identifier from a parser context
   * Uses ANTLR's direct access methods for accurate positioning
   */
  private getIdentifierRange(ctx: ParserRuleContext): Range | null {
    // Strategy 1: Check if the context has an id() method (most common case)
    if (hasIdMethod(ctx)) {
      const identifierNode = ctx.id();
      if (identifierNode?.start && identifierNode?.stop) {
        return {
          startLine: identifierNode.start.line,
          startColumn: identifierNode.start.charPositionInLine,
          endLine: identifierNode.stop.line,
          endColumn:
            identifierNode.stop.charPositionInLine +
            (identifierNode.stop.text?.length ?? 0),
        };
      }
    }

    // Strategy 2: Check for qualifiedName context (e.g., constructor names)
    if ('qualifiedName' in ctx && typeof ctx.qualifiedName === 'function') {
      const qn = ctx.qualifiedName();
      if (qn?.id && qn.id().length > 0) {
        const lastId = qn.id()[qn.id().length - 1]; // Get the last identifier in qualified name
        if (lastId?.start && lastId?.stop) {
          return {
            startLine: lastId.start.line,
            startColumn: lastId.start.charPositionInLine,
            endLine: lastId.stop.line,
            endColumn:
              lastId.stop.charPositionInLine + (lastId.stop.text?.length ?? 0),
          };
        }
      }
    }

    // Strategy 3: Check for anyId context (e.g., field access)
    if ('anyId' in ctx && typeof ctx.anyId === 'function') {
      const anyId = ctx.anyId();
      if (anyId?.start && anyId?.stop) {
        return {
          startLine: anyId.start.line,
          startColumn: anyId.start.charPositionInLine,
          endLine: anyId.stop.line,
          endColumn:
            anyId.stop.charPositionInLine + (anyId.stop.text?.length ?? 0),
        };
      }
    }

    return null;
  }

  /**
   * Apply a modifier to the modifiers object
   */
  private applyModifier(modifiers: SymbolModifiers, modifier: string): void {
    switch (modifier.toLowerCase()) {
      case 'public':
        modifiers.visibility = SymbolVisibility.Public;
        break;
      case 'private':
        modifiers.visibility = SymbolVisibility.Private;
        break;
      case 'protected':
        modifiers.visibility = SymbolVisibility.Protected;
        break;
      case 'global':
        modifiers.visibility = SymbolVisibility.Global;
        break;
      case 'static':
        modifiers.isStatic = true;
        break;
      case 'final':
        modifiers.isFinal = true;
        break;
      case 'abstract':
        modifiers.isAbstract = true;
        break;
      case 'virtual':
        modifiers.isVirtual = true;
        break;
      case 'override':
        modifiers.isOverride = true;
        break;
      case 'transient':
        modifiers.isTransient = true;
        break;
      case 'testmethod':
        modifiers.isTestMethod = true;
        break;
      case 'webservice':
        modifiers.isWebService = true;
        break;
    }
  }

  /**
   * Extract text from a parser context
   */
  private getTextFromContext(ctx: any): string {
    if (!ctx) return '';
    return ctx.text || '';
  }

  /**
   * Get the return type from a method declaration context
   * Handles both typeRef and VOID cases
   */
  private getReturnType(
    ctx: MethodDeclarationContext | InterfaceMethodDeclarationContext,
  ): TypeInfo {
    if (ctx.typeRef()) {
      return this.createTypeInfo(this.getTextFromContext(ctx.typeRef()!));
    }
    // Handle VOID case
    return createPrimitiveType('void');
  }

  /**
   * Create a TypeInfo object from a type string
   * Uses createTypeInfo for comprehensive namespace resolution
   */
  private createTypeInfo(typeString: string): TypeInfo {
    return createTypeInfo(typeString);
  }

  /**
   * Check if a symbol has a parent that is a class (meaning it's an inner class)
   * @param symbol The symbol to check, defaults to the current type symbol if not provided
   * @returns true if the symbol is an inner class, false otherwise
   */
  private hasClassParent(symbol?: TypeSymbol | null): boolean {
    if (!symbol) {
      return false;
    }
    const parent = symbol.parent;
    return parent !== null && parent !== undefined && isClassSymbol(parent);
  }

  /**
   * Check if a symbol is nested within another inner class
   * @param symbol The symbol to check, defaults to the current type symbol if not provided
   * @returns true if the symbol is nested within another inner class, false otherwise
   */
  private isNestedInInnerClass(symbol?: TypeSymbol | null): boolean {
    // Use the provided symbol or fall back to current type symbol
    const symbolToCheck = symbol || this.currentTypeSymbol;

    // If no symbol to check, return false
    if (!symbolToCheck) {
      return false;
    }

    // Start with the parent
    let current = symbolToCheck.parent;
    let classCount = 0;

    // Traverse up the parent chain
    while (current) {
      if (isClassSymbol(current)) {
        classCount++;
        // If we find more than one class in the parent chain,
        // this means we have a nested inner class
        if (classCount > 1) {
          return true;
        }
      }
      current = current.parent;
    }

    return false;
  }

  /**
   * Detect whether a TypeRef node is used as a generic argument (e.g., the String in List<String>)
   * by checking if any ancestor is a TypeList context.
   */
  private isGenericArgument(ctx: TypeRefContext): boolean {
    let current: any = ctx.parent;
    while (current) {
      if (isContextType(current, TypeListContext)) return true;
      // Stop if we climb past the TypeRef owner (another TypeRef or TypeName)
      if (
        isContextType(current, TypeRefContext) ||
        isContextType(current, TypeNameContext)
      ) {
        // keep climbing; generic arguments are nested under TypeList within TypeName
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Capture constructor call reference from NewExpressionContext using parser structure
   */
  private captureConstructorCallReference(ctx: NewExpressionContext): void {
    try {
      const creator = ctx.creator();
      if (!creator) return;

      const createdName = creator.createdName();
      if (!createdName) return;

      // Get the base type name from the createdName
      const idCreatedNamePairs = createdName.idCreatedNamePair();
      if (!idCreatedNamePairs || idCreatedNamePairs.length === 0) return;

      // Get the first idCreatedNamePair (the base type)
      const firstPair = idCreatedNamePairs[0];
      const anyId = firstPair.anyId();
      if (!anyId) return;

      const typeName = anyId.text;
      const location = this.getLocationForReference(anyId);
      const parentContext = this.getCurrentMethodName();

      // Emit constructor call for the base type
      const ctorRef = TypeReferenceFactory.createConstructorCallReference(
        typeName,
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(ctorRef);
      this.logger.debug(
        () => `Captured constructor call reference: ${typeName}`,
      );

      // Handle generic type arguments if present
      const typeArgs = firstPair.typeList();
      if (typeArgs) {
        for (const typeRef of typeArgs.typeRef()) {
          const genericTypeName = typeRef.text;
          const genericLocation = this.getLocationForReference(typeRef);

          // Check if we already have a reference for this constructor generic type at the same location
          if (
            this.hasExistingTypeReferenceAtLocation(
              genericTypeName,
              genericLocation,
              parentContext,
            )
          ) {
            this.logger.debug(
              () =>
                `DEBUG: Skipping duplicate constructor generic type reference at location: ${genericTypeName} ` +
                `in context: ${parentContext}`,
            );
            continue;
          }

          const paramRef = TypeReferenceFactory.createParameterTypeReference(
            genericTypeName,
            genericLocation,
            parentContext,
          );
          this.symbolTable.addTypeReference(paramRef);
          this.logger.debug(
            () =>
              `DEBUG: Created PARAMETER_TYPE for constructor generic: "${genericTypeName}"`,
          );
        }
      }

      // Handle dotted names (e.g., Namespace.Type)
      if (idCreatedNamePairs.length > 1) {
        for (let i = 1; i < idCreatedNamePairs.length; i++) {
          const pair = idCreatedNamePairs[i];
          const anyId = pair.anyId();
          if (anyId) {
            const dottedTypeName = anyId.text;
            const dottedLocation = this.getLocationForReference(
              anyId as unknown as ParserRuleContext,
            );

            const dottedParamRef =
              TypeReferenceFactory.createParameterTypeReference(
                dottedTypeName,
                dottedLocation,
                parentContext,
              );
            this.symbolTable.addTypeReference(dottedParamRef);
            this.logger.debug(
              () =>
                `DEBUG: Created PARAMETER_TYPE for dotted constructor type: "${dottedTypeName}"`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        () => `Error capturing constructor call reference: ${error}`,
      );
    }
  }

  /**
   * Get the name of the current method being processed
   * Traverses the scope stack to find the parent method scope
   */
  private getCurrentMethodName(): string | undefined {
    // Traverse the scope hierarchy to find the parent method
    let currentScope: SymbolScope | null = this.symbolTable.getCurrentScope();

    while (currentScope) {
      // Skip file, global, and block scopes
      if (
        currentScope.name !== 'file' &&
        currentScope.name !== 'global' &&
        !currentScope.name.startsWith('block')
      ) {
        // This is likely a method scope
        return currentScope.name;
      }
      // Move up to parent scope
      currentScope = currentScope.parent || null;
    }

    return undefined;
  }

  /**
   * Get location information for references
   * @param ctx The parser context
   * @returns ANTLR-compliant location with 1-based line numbers
   */
  private getLocationForReference(ctx: ParserRuleContext): SymbolLocation {
    // For references, we want to focus on the identifier location
    // but still provide the full context range
    const identifierRange = this.getIdentifierRange(ctx);

    if (identifierRange) {
      return {
        symbolRange: this.getLocation(ctx).symbolRange, // Full context
        identifierRange: identifierRange, // Just the identifier
      };
    }

    // Fallback to standard location
    return this.getLocation(ctx);
  }

  /**
   * Determine if a type reference is in a type declaration context (variable/field declaration)
   * @param ctx The TypeRefContext
   * @returns true if this is a type declaration, false otherwise
   */
  private isTypeDeclarationContext(ctx: TypeRefContext): boolean {
    // Traverse up the parse tree to find the appropriate context
    let current: any = ctx.parent;

    while (current) {
      // Check for variable/field declaration contexts
      if (
        isContextType(current, FieldDeclarationContext) ||
        isContextType(current, PropertyDeclarationContext) ||
        isContextType(current, LocalVariableDeclarationContext) ||
        isContextType(current, VariableDeclaratorContext)
      ) {
        return true;
      }

      // Check for parameter contexts
      if (isContextType(current, FormalParameterContext)) {
        return false;
      }

      // Move up to parent
      current = current.parent;
    }

    // Default to type declaration if we can't determine
    return true;
  }

  /**
   * Check if a type reference already exists for the given type name and context
   * This helps prevent duplicate type references
   * @param typeName The type name to check
   * @param context The context to check in
   * @returns true if a reference already exists, false otherwise
   */
  private hasExistingTypeReference(
    typeName: string,
    context: string | undefined,
  ): boolean {
    if (!context) return false;

    // Get all references from the symbol table and check for duplicates
    const allReferences = this.symbolTable.getAllReferences();

    // Only consider it a duplicate if an identical name+context already exists twice or more.
    // This keeps one occurrence for cases like List<String> and Map<String, T> that legitimately
    // need multiple distinct String references at different locations.
    let count = 0;
    for (const ref of allReferences as TypeReference[]) {
      if (
        ref.name === typeName &&
        (ref.context === 5 || ref.context === 6) &&
        ref.parentContext === context
      ) {
        count += 1;
        if (count >= 2) return true;
      }
    }
    return false;
  }

  /**
   * Check if a type reference already exists at the same location
   * This helps prevent duplicate type references at the exact same position
   * @param typeName The type name to check
   * @param location The location to check
   * @param context The context to check in
   * @returns true if a reference already exists at the same location, false otherwise
   */
  private hasExistingTypeReferenceAtLocation(
    typeName: string,
    location: SymbolLocation,
    context: string | undefined,
  ): boolean {
    if (!context) return false;

    // Get all references from the symbol table and check for exact location matches
    const allReferences = this.symbolTable.getAllReferences();

    return allReferences.some(
      (ref) =>
        ref.name === typeName &&
        (ref.context === 5 || ref.context === 6) && // TYPE_DECLARATION = 5, PARAMETER_TYPE = 6
        ref.parentContext === context &&
        ref.location.identifierRange.startLine ===
          location.identifierRange.startLine &&
        ref.location.identifierRange.startColumn ===
          location.identifierRange.startColumn &&
        ref.location.identifierRange.endLine ===
          location.identifierRange.endLine &&
        ref.location.identifierRange.endColumn ===
          location.identifierRange.endColumn,
    );
  }

  /**
   * Determine the appropriate context for a type reference based on the parser tree
   * @param ctx The TypeRefContext
   * @returns The context string or undefined if not in a recognizable context
   */
  private determineTypeReferenceContext(
    ctx: TypeRefContext,
  ): string | undefined {
    // Traverse up the parse tree to find the appropriate context
    let current = ctx.parent;

    while (current) {
      // Check for method-related contexts
      if (
        isContextType(current, FormalParameterContext) ||
        isContextType(current, MethodDeclarationContext) ||
        isContextType(current, InterfaceMethodDeclarationContext) ||
        isContextType(current, LocalVariableDeclarationContext) ||
        isContextType(current, NewExpressionContext) ||
        isContextType(current, CastExpressionContext) ||
        isContextType(current, InstanceOfExpressionContext) ||
        isContextType(current, EnhancedForControlContext) ||
        isContextType(current, TypeRefPrimaryContext)
      ) {
        return this.getCurrentMethodName();
      }

      // Check for field/property contexts
      if (
        isContextType(current, FieldDeclarationContext) ||
        isContextType(current, PropertyDeclarationContext)
      ) {
        return this.currentTypeSymbol?.name;
      }

      // Move up to parent
      current = current.parent;
    }

    // Fallback to current method or type context
    return this.getCurrentMethodName() || this.currentTypeSymbol?.name;
  }

  /**
   * Determine if capturing should be suppressed for the given ctx because
   * it lies within the current assignment LHS range.
   */
  private shouldSuppress(ctx: ParserRuleContext): boolean {
    if (!this.suppressAssignmentLHS || !this.suppressedLHSRange) return false;
    const loc = this.getLocation(ctx);
    const r = this.suppressedLHSRange;
    const withinLines =
      loc.identifierRange.startLine >= r.identifierRange.startLine &&
      loc.identifierRange.endLine <= r.identifierRange.endLine;
    const withinCols =
      (loc.identifierRange.startLine > r.identifierRange.startLine ||
        loc.identifierRange.startColumn >= r.identifierRange.startColumn) &&
      (loc.identifierRange.endLine < r.identifierRange.endLine ||
        loc.identifierRange.endColumn <= r.identifierRange.endColumn);
    return withinLines && withinCols;
  }

  /**
   * Check if a variable name exists in the current scope
   */
  private isVariableInScope(variableName: string): boolean {
    // Check if the variable exists in the current symbol table scope
    return this.symbolTable
      .getCurrentScope()
      ?.getAllSymbols()
      .some((symbol: ApexSymbol) => symbol.name === variableName);
  }

  /**
   * Check if an identifier is a method call parameter
   * This helps distinguish between identifiers that should be captured
   * even when they appear inside dot expressions
   */
  private isMethodCallParameter(ctx: IdPrimaryContext): boolean {
    let current: any = ctx.parent;

    while (current) {
      // If we find an expression list, this is likely a method call parameter
      if (
        isContextType(current, ExpressionListContext) ||
        isContextType(current, MethodCallContext) ||
        isContextType(current, DotMethodCallContext)
      ) {
        return true;
      }

      // Move up to parent
      current = current.parent;
    }

    return false;
  }

  /**
   * Check if an identifier is in an assignment LHS context
   * This helps prevent duplication between enterAssignExpression and enterAnyId
   */
  private isInAssignmentLHS(ctx: AnyIdContext): boolean {
    let current: any = ctx.parent;

    while (current) {
      // If we find an assignment expression, this is in an assignment LHS
      if (isContextType(current, AssignExpressionContext)) {
        return true;
      }

      // Move up to parent
      current = current.parent;
    }

    return false;
  }
  private createTypeSymbol(
    ctx: ParserRuleContext,
    name: string,
    kind:
      | SymbolKind.Class
      | SymbolKind.Interface
      | SymbolKind.Trigger
      | SymbolKind.Enum,
    modifiers: SymbolModifiers,
  ): TypeSymbol | EnumSymbol {
    const location = this.getLocation(ctx);
    const parent = this.currentTypeSymbol;

    // Get the identifier location for the type symbol using context-specific extraction
    let identifierLocation: SymbolLocation;

    if (
      kind === SymbolKind.Class &&
      isContextType(ctx, ClassDeclarationContext)
    ) {
      const classCtx = ctx as ClassDeclarationContext;
      const identifierRange = this.extractClassIdentifierRange(classCtx);
      identifierLocation = identifierRange
        ? { symbolRange: identifierRange, identifierRange }
        : this.getLocation(ctx);
    } else if (
      kind === SymbolKind.Interface &&
      isContextType(ctx, InterfaceDeclarationContext)
    ) {
      const interfaceCtx = ctx as InterfaceDeclarationContext;
      const identifierRange = this.extractClassIdentifierRange(
        interfaceCtx as any,
      );
      identifierLocation = identifierRange
        ? { symbolRange: identifierRange, identifierRange }
        : this.getLocation(ctx);
    } else if (kind === SymbolKind.Trigger) {
      // For triggers, use the standard identifier extraction
      identifierLocation = this.getIdentifierLocation(ctx);
    } else if (kind === SymbolKind.Enum) {
      // For enums, use the standard identifier extraction
      identifierLocation = this.getIdentifierLocation(ctx);
    } else {
      // Fallback to standard identifier extraction
      identifierLocation = this.getIdentifierLocation(ctx);
    }

    // Determine namespace based on context
    const namespace = this.determineNamespaceForType(name, kind);

    // Get current scope path for unique symbol ID
    const scopePath = this.symbolTable.getCurrentScopePath();

    const typeSymbol = SymbolFactory.createFullSymbolWithNamespace(
      name,
      kind,
      location,
      this.currentFilePath,
      modifiers,
      parent?.id || null,
      { interfaces: [] },
      namespace, // Pass the determined namespace (can be null)
      this.getCurrentAnnotations(),
      identifierLocation,
      scopePath, // Pass scope path for unique ID generation
    ) as TypeSymbol;

    // Fix the parent key to use the correct kind
    if (parent && typeSymbol.parentKey) {
      typeSymbol.parentKey.kind = parent.kind;
    }

    // For enums, we need to add the values array
    // TODO: change to a more generic approach
    if (isEnumSymbol(typeSymbol)) {
      typeSymbol.values = [];
      return typeSymbol;
    }

    return typeSymbol;
  }

  /**
   * Determine namespace for a type based on context
   */
  private determineNamespaceForType(
    name: string,
    kind: SymbolKind,
  ): Namespace | null {
    // Top-level types get project namespace
    if (!this.currentTypeSymbol) {
      return this.currentNamespace;
    }

    // Inner types inherit from outer type
    const parentNamespace = this.currentTypeSymbol.namespace;
    if (parentNamespace instanceof Namespace) {
      return parentNamespace;
    }
    return null;
  }

  private createMethodSymbol(
    ctx: ParserRuleContext,
    name: string,
    modifiers: SymbolModifiers,
    returnType: TypeInfo,
    identifierLocation?: SymbolLocation,
  ): MethodSymbol {
    const location = this.getLocation(ctx);
    const parent = this.currentTypeSymbol;

    // Inherit namespace from containing type
    const parentNamespace = parent?.namespace;
    const namespace =
      parentNamespace instanceof Namespace ? parentNamespace : null;

    // Get current scope path for unique symbol ID
    const scopePath = this.symbolTable.getCurrentScopePath();

    // Use provided identifierLocation or extract from context
    const finalIdentifierLocation =
      identifierLocation ||
      (isContextType(ctx, MethodDeclarationContext)
        ? (() => {
            const range = this.extractMethodIdentifierRange(
              ctx as MethodDeclarationContext,
            );
            return range
              ? { symbolRange: range, identifierRange: range }
              : null;
          })()
        : null) ||
      this.getIdentifierLocation(ctx);

    const methodSymbol = SymbolFactory.createFullSymbolWithNamespace(
      name,
      SymbolKind.Method,
      location,
      this.currentFilePath,
      modifiers,
      parent?.id || null,
      { returnType, parameters: [] },
      namespace, // Inherit namespace from parent (can be null)
      this.getCurrentAnnotations(),
      finalIdentifierLocation,
      scopePath, // Pass scope path for unique ID generation
    ) as MethodSymbol;

    // Initialize the parameters array for MethodSymbol interface
    methodSymbol.parameters = [];
    methodSymbol.returnType = returnType;
    methodSymbol.isConstructor = false;

    return methodSymbol;
  }

  private createVariableSymbol(
    ctx: ParserRuleContext,
    modifiers: SymbolModifiers,
    name: string,
    kind:
      | SymbolKind.Property
      | SymbolKind.Variable
      | SymbolKind.Parameter
      | SymbolKind.Field
      | SymbolKind.EnumValue,
    type: TypeInfo,
  ): VariableSymbol {
    const location = this.getLocation(ctx);
    const parent = this.currentTypeSymbol || this.currentMethodSymbol;

    // Get the identifier location for the variable symbol using context-specific extraction
    let identifierLocation: SymbolLocation;

    if (
      kind === SymbolKind.Field &&
      isContextType(ctx, FieldDeclarationContext)
    ) {
      const fieldCtx = ctx as FieldDeclarationContext;
      const identifierRange = this.extractFieldIdentifierRange(fieldCtx);
      identifierLocation = identifierRange
        ? { symbolRange: identifierRange, identifierRange }
        : this.getIdentifierLocation(ctx);
    } else if (
      kind === SymbolKind.Property &&
      isContextType(ctx, PropertyDeclarationContext)
    ) {
      const propertyCtx = ctx as PropertyDeclarationContext;
      const identifierRange = this.extractPropertyIdentifierRange(propertyCtx);
      identifierLocation = identifierRange
        ? { symbolRange: identifierRange, identifierRange }
        : this.getIdentifierLocation(ctx);
    } else {
      // For other variable types, use the standard identifier extraction
      identifierLocation = this.getIdentifierLocation(ctx);
    }

    // Inherit namespace from containing type or method
    const parentNamespace = parent?.namespace;
    const namespace =
      parentNamespace instanceof Namespace ? parentNamespace : null;

    // Get current scope path for unique symbol ID
    const scopePath = this.symbolTable.getCurrentScopePath();

    const variableSymbol = SymbolFactory.createFullSymbolWithNamespace(
      name,
      kind,
      location,
      this.currentFilePath,
      modifiers,
      parent?.id || null,
      { type },
      namespace, // Inherit namespace from parent (can be null)
      this.getCurrentAnnotations(),
      identifierLocation,
      scopePath, // Pass scope path for unique ID generation
    ) as VariableSymbol;

    // Set the type property for VariableSymbol interface compatibility
    variableSymbol.type = type;

    return variableSymbol;
  }

  private getCurrentPath(): string[] {
    const path: string[] = [];
    let current = this.currentTypeSymbol;
    while (current) {
      path.unshift(current.name);
      current = current.parent as TypeSymbol | null;
    }
    return path;
  }

  /**
   * Create a validation scope for identifier validation
   */
  private createValidationScope() {
    return {
      // Assume long identifiers supported if namespace is set
      supportsLongIdentifiers: this.projectNamespace !== undefined,
      version: 58, // Default to latest Apex API version
      isFileBased: true,
    };
  }

  /**
   * Capture references for dotted expressions (e.g., FileUtilities.createFile or property.Id)
   * Emits both CLASS_REFERENCE/VARIABLE_USAGE and METHOD_CALL for method calls,
   * VARIABLE_USAGE and FIELD_ACCESS for field access.
   */
  private captureDottedReferences(ctx: DotExpressionContext): void {
    try {
      // If this is a dot-method call variant, skip here; handled by enterDotMethodCall
      const dotCall = (ctx as any).dotMethodCall?.();
      if (dotCall) {
        return;
      }

      // Otherwise this is a property/field access: <lhs>.<anyId>
      const rhs = ctx.anyId();
      const lhs = (ctx as any).expression?.(0) || (ctx as any).expression?.();
      if (!rhs || !lhs) return;

      const qualifier = this.getTextFromContext(lhs);
      const parentContext = this.getCurrentMethodName();

      // Compute qualifier location from the dot-expression start and qualifier length
      const parentLoc = this.getLocation(ctx);
      let qualifierLocation: SymbolLocation | undefined;
      if (qualifier) {
        qualifierLocation = parentLoc;
      }

      // Emit qualifier reference for simple identifiers
      if (qualifier && qualifierLocation && !qualifier.includes('.')) {
        const isClassReference = !this.isVariableInScope(qualifier);
        if (isClassReference) {
          const classRef = TypeReferenceFactory.createClassReference(
            qualifier,
            qualifierLocation,
            parentContext,
          );
          this.symbolTable.addTypeReference(classRef);
        } else {
          const variableRef = TypeReferenceFactory.createVariableUsageReference(
            qualifier,
            qualifierLocation,
            parentContext,
          );
          this.symbolTable.addTypeReference(variableRef);
        }
      }
      // Field access emission happens in enterAnyId to avoid duplicates
    } catch (error) {
      this.logger.warn(() => `Error capturing dotted references: ${error}`);
    }
  }

  /**
   * Extract identifier range for class declaration contexts
   * Handles cases where the class name might be in different locations
   */
  private extractClassIdentifierRange(
    ctx: ClassDeclarationContext,
  ): Range | null {
    // Use the main identifier extraction method
    return this.getIdentifierRange(ctx);
  }

  /**
   * Extract identifier range for method declaration contexts
   * Handles both regular methods and constructors
   */
  private extractMethodIdentifierRange(
    ctx: MethodDeclarationContext,
  ): Range | null {
    // Use the main identifier extraction method
    return this.getIdentifierRange(ctx);
  }

  /**
   * Extract identifier range for constructor declaration contexts
   * Handles qualified name cases and extracts the actual constructor name
   */
  private extractConstructorIdentifierRange(
    ctx: ConstructorDeclarationContext,
  ): Range | null {
    // Use the main identifier extraction method
    return this.getIdentifierRange(ctx);
  }

  /**
   * Extract identifier range for field declaration contexts
   * Handles variable declarators within field declarations
   */
  private extractFieldIdentifierRange(
    ctx: FieldDeclarationContext,
  ): Range | null {
    // Use the main identifier extraction method
    return this.getIdentifierRange(ctx);
  }

  /**
   * Extract identifier range for property declaration contexts
   */
  private extractPropertyIdentifierRange(
    ctx: PropertyDeclarationContext,
  ): Range | null {
    // Use the main identifier extraction method
    return this.getIdentifierRange(ctx);
  }
}
