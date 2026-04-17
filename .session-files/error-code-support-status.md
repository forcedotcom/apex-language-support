# Semantic Error Code Support Status

Generated: 2026-02-09T20:40:37.554Z

## Summary

- **Total Error Codes**: 347
- **Supported**: 131
- **Not Supported**: 216
- **Coverage**: 37.8%

## Supported Error Codes

### By Category

#### Annotations (4)

- **ANNOTATION_PROPERTY_INVALID_VALUE** (`annotation.property.invalid.value`)
  - Used in: semantics/validation/validators/AnnotationPropertyValidator.ts
- **ANNOTATION_PROPERTY_MISSING** (`annotation.property.missing`)
  - Used in: semantics/validation/validators/AnnotationPropertyValidator.ts
- **ANNOTATION_PROPERTY_NOT_SUPPORTED** (`annotation.property.not.supported`)
  - Used in: semantics/validation/validators/AnnotationPropertyValidator.ts
- **ANNOTATION_UNKNOWN** (`annotation.unknown`)
  - Used in: semantics/validation/validators/UnknownAnnotationValidator.ts

#### Collections (6)

- **INVALID_LIST_INITIALIZER** (`invalid.list.initializer`)
  - Used in: semantics/validation/validators/CollectionValidator.ts
- **INVALID_MAP_INITIALIZER** (`invalid.map.initializer`)
  - Used in: semantics/validation/validators/CollectionValidator.ts
- **INVALID_MAP_PUTALL** (`invalid.map.putAll`)
  - Used in: semantics/validation/MapPutAllValidator.ts
- **INVALID_SET_INITIALIZER** (`invalid.set.initializer`)
  - Used in: semantics/validation/validators/CollectionValidator.ts
- **INVALID_SOBJECT_LIST** (`invalid.sobject.list`)
  - Used in: semantics/validation/CollectionTypeValidator.ts
- **INVALID_SOBJECT_MAP** (`invalid.sobject.map`)
  - Used in: semantics/validation/CollectionTypeValidator.ts, semantics/validation/SObjectCollectionValidator.ts, semantics/validation/SObjectTypeValidator.ts

#### Constructors (6)

- **ILLEGAL_INSTANCE_VARIABLE_REFERENCE_IN_CONSTRUCTOR** (`illegal.instance.variable.reference.in.constructor`)
  - Used in: semantics/validation/validators/ConstructorValidator.ts
- **INVALID_CONSTRUCTOR** (`invalid.constructor`)
  - Used in: semantics/validation/validators/ConstructorNamingValidator.ts, semantics/validation/validators/ConstructorValidator.ts
- **INVALID_CONSTRUCTOR_NAME** (`invalid.constructor.name`)
  - Used in: semantics/validation/validators/ConstructorNamingValidator.ts
- **INVALID_CONSTRUCTOR_RETURN** (`invalid.constructor.return`)
  - Used in: semantics/validation/validators/ConstructorValidator.ts
- **INVALID_EXCEPTION_CONSTRUCTOR_ALREADY_DEFINED** (`invalid.exception.constructor.already.defined`)
  - Used in: semantics/validation/validators/ExceptionValidator.ts
- **INVALID_NAME_VALUE_PAIR_CONSTRUCTOR** (`invalid.name.value.pair.constructor`)
  - Used in: semantics/validation/ConstructorExpressionValidator.ts

#### Deprecation (5)

- **GLOBAL_DEPRECATE_IF_PARAMETER_DEPRECATED** (`global.deprecate.if.parameter.deprecated`)
  - Used in: semantics/validation/validators/DeprecationValidator.ts
- **GLOBAL_DEPRECATE_IF_RETURN_DEPRECATED** (`global.deprecate.if.return.deprecated`)
  - Used in: semantics/validation/validators/DeprecationValidator.ts
- **GLOBAL_DEPRECATE_IF_TYPE_DEPRECATED** (`global.deprecate.if.type.deprecated`)
  - Used in: semantics/validation/validators/DeprecationValidator.ts
- **INVOCABLE_METHOD_CAN_ONLY_HAVE_DEPRECATED** (`invocable.method.can.only.have.deprecated`)
  - Used in: semantics/validation/validators/AnnotationPropertyValidator.ts
- **WEBSERVICE_DEPRECATE_IF_TYPE_DEPRECATED** (`webservice.deprecate.if.type.deprecated`)
  - Used in: semantics/validation/validators/DeprecationValidator.ts

#### Duplicates (7)

- **DUPLICATE_FIELD** (`duplicate.field`)
  - Used in: semantics/validation/validators/DuplicateFieldInitValidator.ts, semantics/validation/validators/DuplicateSymbolValidator.ts
- **DUPLICATE_FIELD_INIT** (`duplicate.field.init`)
  - Used in: semantics/validation/validators/DuplicateFieldInitValidator.ts
- **DUPLICATE_MODIFIER** (`duplicate.modifier`)
  - Used in: parser/listeners/ApexSymbolCollectorListener.ts
- **DUPLICATE_REMOTE_ACTION_METHODS** (`duplicate.remote.action.methods`)
  - Used in: semantics/validation/validators/DuplicateAnnotationMethodValidator.ts
- **DUPLICATE_TYPE_NAME** (`duplicate.type.name`)
  - Used in: semantics/validation/validators/DuplicateTypeNameValidator.ts
- **DUPLICATE_VARIABLE** (`duplicate.variable`)
  - Used in: semantics/validation/validators/DuplicateSymbolValidator.ts, semantics/validation/validators/VariableShadowingValidator.ts, parser/listeners/ApexSymbolCollectorListener.ts
- **DUPLICATE_WEB_SERVICE_METHODS** (`duplicate.web.service.methods`)
  - Used in: semantics/validation/validators/DuplicateAnnotationMethodValidator.ts

#### Exception Handling (6)

- **INVALID_CATCH_DUPLICATE_EXCEPTION** (`invalid.catch.duplicate.exception`)
  - Used in: semantics/validation/validators/ExceptionValidator.ts
- **INVALID_CATCH_EXCEPTION** (`invalid.catch.exception`)
  - Used in: semantics/validation/validators/ExceptionValidator.ts
- **INVALID_EXCEPTION_MUST_END_WITH_EXCEPTION** (`invalid.exception.must.end.with.exception`)
  - Used in: semantics/validation/validators/ExceptionValidator.ts
- **INVALID_EXCEPTION_MUST_EXTEND_EXCEPTION** (`invalid.exception.must.extend.exception`)
  - Used in: semantics/validation/validators/ExceptionValidator.ts
- **INVALID_THROW_EXCEPTION** (`invalid.throw.exception`)
  - Used in: semantics/validation/validators/ExceptionValidator.ts
- **INVALID_TRY_NEEDS_CATCH_OR_FINALLY** (`invalid.try.needs.catch.or.finally`)
  - Used in: semantics/validation/validators/TryCatchFinallyValidator.ts

#### Expressions (10)

- **ILLEGAL_SWITCH_EXPRESSION_TYPE** (`illegal.switch.expression.type`)
  - Used in: semantics/validation/validators/SwitchStatementValidator.ts
- **INVALID_BITWISE_OPERATOR_ARGUMENTS** (`invalid.bitwise.operator.arguments`)
  - Used in: semantics/validation/validators/ExpressionValidator.ts
- **INVALID_DATE_OPERAND_EXPRESSION** (`invalid.date.operand.expression`)
  - Used in: semantics/validation/BinaryExpressionValidator.ts
- **INVALID_DATETIME_OPERAND_EXPRESSION** (`invalid.datetime.operand.expression`)
  - Used in: semantics/validation/BinaryExpressionValidator.ts
- **INVALID_EXPRESSION_ASSIGNMENT** (`invalid.expression.assignment`)
  - Used in: semantics/validation/validators/ExpressionTypeValidator.ts
- **INVALID_EXPRESSION_STATEMENT** (`invalid.expression.statement`)
  - Used in: semantics/validation/validators/ExpressionTypeValidator.ts
- **INVALID_NUMERIC_ARGUMENTS_EXPRESSION** (`invalid.numeric.arguments.expression`)
  - Used in: semantics/validation/validators/ExpressionValidator.ts
- **INVALID_SHIFT_OPERATOR_ARGUMENTS** (`invalid.shift.operator.arguments`)
  - Used in: semantics/validation/BinaryExpressionValidator.ts
- **INVALID_TIME_OPERAND_EXPRESSION** (`invalid.time.operand.expression`)
  - Used in: semantics/validation/BinaryExpressionValidator.ts
- **INVALID_VOID_ARITHMETIC_EXPRESSION** (`invalid.void.arithmetic.expression`)
  - Used in: semantics/validation/BinaryExpressionValidator.ts

#### Invalid/Illegal (15)

- **ILLEGAL_ASSIGNMENT** (`illegal.assignment`)
  - Used in: semantics/validation/ConstructorExpressionValidator.ts
- **ILLEGAL_FORWARD_REFERENCE** (`illegal.forward.reference`)
  - Used in: semantics/validation/validators/ForwardReferenceValidator.ts
- **INVALID_BREAK** (`invalid.break`)
  - Used in: semantics/validation/validators/ControlFlowValidator.ts
- **INVALID_CHARACTER_IDENTIFIER** (`invalid.character.identifier`)
  - Used in: semantics/validation/IdentifierValidator.ts, semantics/validation/validators/EnumConstantNamingValidator.ts
- **INVALID_CONTINUE** (`invalid.continue`)
  - Used in: semantics/validation/validators/ControlFlowValidator.ts
- **INVALID_INTERFACE** (`invalid.interface`)
  - Used in: semantics/validation/validators/InterfaceHierarchyValidator.ts
- **INVALID_KEYWORD_IDENTIFIER** (`invalid.keyword.identifier`)
  - Used in: semantics/validation/IdentifierValidator.ts
- **INVALID_NUMBER_PARAMETERS** (`invalid.number.parameters`)
  - Used in: semantics/validation/validators/ParameterLimitValidator.ts
- **INVALID_RESERVED_NAME_IDENTIFIER** (`invalid.reserved.name.identifier`)
  - Used in: semantics/validation/IdentifierValidator.ts
- **INVALID_RETURN_VOID** (`invalid.return.void`)
  - Used in: semantics/validation/validators/ReturnStatementValidator.ts
- **INVALID_RUNAS** (`invalid.runas`)
  - Used in: semantics/validation/validators/RunAsStatementValidator.ts
- **INVALID_SUPER_CALL** (`invalid.super.call`)
  - Used in: semantics/validation/validators/ConstructorValidator.ts
- **INVALID_THIS_CALL** (`invalid.this.call`)
  - Used in: semantics/validation/validators/ConstructorValidator.ts
- **INVALID_VOID_PARAMETER** (`invalid.void.parameter`)
  - Used in: semantics/validation/validators/ExpressionTypeValidator.ts
- **INVALID_VOID_PROPERTY** (`invalid.void.property`)
  - Used in: semantics/validation/validators/ExpressionTypeValidator.ts

#### Loops (1)

- **LOOP_MUST_ITERATE_OVER_COLLECTION** (`loop.must.iterate.over.collection`)
  - Used in: semantics/validation/validators/ExpressionValidator.ts

#### Methods (13)

- **ILLEGAL_INSTANCE_METHOD_REFERENCE_IN_CONSTRUCTOR** (`illegal.instance.method.reference.in.constructor`)
  - Used in: semantics/validation/validators/ConstructorValidator.ts
- **INVALID_METHOD_NOT_FOUND** (`invalid.method.not.found`)
  - Used in: semantics/validation/validators/MethodResolutionValidator.ts
- **INVALID_RETURN_FROM_NON_METHOD** (`invalid.return.from.non.method`)
  - Used in: semantics/validation/validators/ControlFlowValidator.ts
- **METHOD_ALREADY_EXISTS** (`method.already.exists`)
  - Used in: semantics/validation/validators/DuplicateMethodValidator.ts, semantics/validation/validators/MethodSignatureEquivalenceValidator.ts
- **METHOD_DOES_NOT_OVERRIDE** (`method.does.not.override`)
  - Used in: semantics/validation/validators/MethodOverrideValidator.ts
- **METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE** (`method.does.not.support.parameter.type`)
  - Used in: semantics/validation/validators/MethodResolutionValidator.ts
- **METHOD_DOES_NOT_SUPPORT_RETURN_TYPE** (`method.does.not.support.return.type`)
  - Used in: semantics/validation/validators/MethodResolutionValidator.ts, semantics/validation/validators/ReturnStatementValidator.ts
- **METHOD_INVALID_ADD_ERROR_NOT_SOBJECT_FIELD** (`method.invalid.add.error.not.sobject.field`)
  - Used in: semantics/validation/AddErrorMethodValidator.ts
- **METHOD_INVALID_ADD_ERROR_NOT_SOBJECT_SCALAR_FIELD** (`method.invalid.add.error.not.sobject.scalar.field`)
  - Used in: semantics/validation/SObjectTypeValidator.ts, semantics/validation/AddErrorMethodValidator.ts
- **METHOD_MUST_HAVE_BODY** (`method.must.have.body`)
  - Used in: semantics/validation/validators/AbstractMethodBodyValidator.ts
- **METHOD_NOT_VISIBLE** (`method.not.visible`)
  - Used in: semantics/validation/validators/MethodResolutionValidator.ts
- **METHOD_PARAMETER_TYPE_NOT_VISIBLE** (`method.parameter.type.not.visible`)
  - Used in: semantics/validation/validators/TypeVisibilityValidator.ts
- **METHOD_RETURN_TYPE_NOT_VISIBLE** (`method.return.type.not.visible`)
  - Used in: semantics/validation/validators/TypeVisibilityValidator.ts

#### Modifiers (4)

- **MODIFIER_CANNOT_BE** (`modifier.cannot.be`)
  - Used in: semantics/validation/validators/ModifierValidator.ts
- **MODIFIER_IS_NOT_ALLOWED** (`modifier.is.not.allowed`)
  - Used in: semantics/validation/validators/ModifierValidator.ts
- **MODIFIER_NOT_IN_TOP_LEVEL_TYPE** (`modifier.not.in.top.level.type`)
  - Used in: semantics/validation/validators/ModifierValidator.ts
- **MODIFIER_REQUIRES** (`modifier.requires`)
  - Used in: semantics/validation/validators/ModifierValidator.ts

#### Other (23)

- **ABSTRACT_METHODS_CANNOT_HAVE_BODY** (`abstract.methods.cannot.have.body`)
  - Used in: semantics/validation/validators/AbstractMethodBodyValidator.ts
- **AMBIGUOUS_METHOD_SIGNATURE** (`ambiguous.method.signature`)
  - Used in: semantics/validation/validators/MethodResolutionValidator.ts
- **AURA_DUPLICATE_METHOD_FIELD** (`aura.duplicate.method.field`)
  - Used in: semantics/validation/validators/AuraEnabledValidator.ts
- **AURA_OVERLOADED_METHOD** (`aura.overloaded.method`)
  - Used in: semantics/validation/validators/AuraEnabledValidator.ts
- **CIRCULAR_DEFINITION** (`circular.definition`)
  - Used in: semantics/validation/validators/InterfaceHierarchyValidator.ts, semantics/validation/validators/TypeSelfReferenceValidator.ts, semantics/validation/validators/ClassHierarchyValidator.ts
- **EXPRESSION_TOO_LONG** (`expression.too.long`)
  - Used in: semantics/validation/CompilationUnitValidator.ts, semantics/validation/AdvancedValidator.ts
- **GENERIC_INTERFACE_ALREADY_IMPLEMENTED** (`generic.interface.already.implemented`)
  - Used in: semantics/validation/validators/InterfaceHierarchyValidator.ts
- **IDENTIFIER_TOO_LONG** (`identifier.too.long`)
  - Used in: semantics/validation/IdentifierValidator.ts
- **INCOMPATIBLE_CAST_TYPES** (`incompatible.cast.types`)
  - Used in: semantics/validation/TypeCastingValidator.ts
- **INCOMPATIBLE_TERNARY_EXPRESSION_TYPES** (`incompatible.ternary.expression.types`)
  - Used in: semantics/validation/validators/ExpressionValidator.ts
- **INVOCABLE_METHOD_NON_LIST_PARAMETER** (`invocable.method.non.list.parameter`)
  - Used in: semantics/validation/validators/AnnotationPropertyValidator.ts
- **INVOCABLE_METHOD_SINGLE_PARAM** (`invocable.method.single.param`)
  - Used in: semantics/validation/validators/AnnotationPropertyValidator.ts
- **MAX_ENUMS_EXCEEDED** (`max.enums.exceeded`)
  - Used in: semantics/validation/validators/EnumLimitValidator.ts
- **METHODS_MUST_OVERRIDE** (`methods.must.override`)
  - Used in: semantics/validation/validators/MethodOverrideValidator.ts
- **NO_SUPER_TYPE** (`no.super.type`)
  - Used in: semantics/validation/validators/ConstructorValidator.ts
- **NON_STATIC_AURA_METHOD_CANNOT_HAVE_PARAMS** (`non.static.aura.method.cannot.have.params`)
  - Used in: semantics/validation/validators/AuraEnabledValidator.ts
- **NON_STATIC_AURA_METHOD_MUST_BEGIN_WITH_GET** (`non.static.aura.method.must.begin.with.get`)
  - Used in: semantics/validation/validators/AuraEnabledValidator.ts
- **NON_VIRTUAL_METHODS_CANNOT_OVERRIDE** (`non.virtual.methods.cannot.override`)
  - Used in: semantics/validation/validators/MethodOverrideValidator.ts
- **NOT_UNIQUE_WHEN_VALUE_OR_TYPE** (`not.unique.when.value.or.type`)
  - Used in: semantics/validation/validators/SwitchStatementValidator.ts
- **SCRIPT_TOO_LARGE** (`script.too.large`)
  - Used in: semantics/validation/CompilationUnitValidator.ts, semantics/validation/validators/SourceSizeValidator.ts
- **UNKNOWN_CONSTRUCTOR** (`unknown.constructor`)
  - Used in: semantics/validation/validators/ConstructorValidator.ts
- **UNREACHABLE_STATEMENT** (`unreachable.statement`)
  - Used in: semantics/validation/validators/UnreachableStatementValidator.ts
- **WHEN_ELSE_NOT_LAST** (`when.else.not.last`)
  - Used in: semantics/validation/validators/SwitchStatementValidator.ts

#### REST Resources (5)

- **REST_RESOURCE_URL_EMPTY** (`rest.resource.url.empty`)
  - Used in: semantics/validation/validators/AnnotationPropertyValidator.ts
- **REST_RESOURCE_URL_ILLEGAL_WILDCARD_PREDECESSOR** (`rest.resource.url.illegal.wildcard.predecessor`)
  - Used in: semantics/validation/validators/AnnotationPropertyValidator.ts
- **REST_RESOURCE_URL_ILLEGAL_WILDCARD_SUCCESSOR** (`rest.resource.url.illegal.wildcard.successor`)
  - Used in: semantics/validation/validators/AnnotationPropertyValidator.ts
- **REST_RESOURCE_URL_NO_SLASH** (`rest.resource.url.no.slash`)
  - Used in: semantics/validation/validators/AnnotationPropertyValidator.ts
- **REST_RESOURCE_URL_TOO_LONG** (`rest.resource.url.too.long`)
  - Used in: semantics/validation/validators/AnnotationPropertyValidator.ts

#### Safe Navigation (1)

- **SAFE_NAVIGATION_INVALID_BETWEEN_SOBJECT_FIELD_AND_ADD_ERROR** (`safe.navigation.invalid.between.sobject.field.and.add.error`)
  - Used in: semantics/validation/AddErrorMethodValidator.ts

#### Switch Statements (2)

- **ILLEGAL_NO_WHEN_BLOCKS** (`illegal.no.when.blocks`)
  - Used in: semantics/validation/validators/SwitchStatementValidator.ts
- **INVALID_SWITCH_ENUM** (`invalid.switch.enum`)
  - Used in: semantics/validation/validators/SwitchStatementValidator.ts

#### Testing (4)

- **TEST_CLASS_MUST_NOT_BE_EXCEPTION** (`test.class.must.not.be.exception`)
  - Used in: semantics/validation/validators/TestMethodValidator.ts
- **TEST_METHOD_CANNOT_HAVE_PARAMS** (`test.method.cannot.have.params`)
  - Used in: semantics/validation/validators/TestMethodValidator.ts
- **TEST_SETUP_CANNOT_HAVE_PARAMS** (`test.setup.cannot.have.params`)
  - Used in: semantics/validation/validators/TestMethodValidator.ts
- **TEST_SETUP_MUST_RETURN_VOID** (`test.setup.must.return.void`)
  - Used in: semantics/validation/validators/TestMethodValidator.ts

#### Triggers (1)

- **INVALID_TRIGGER_RETURN** (`invalid.trigger.return`)
  - Used in: semantics/validation/validators/ReturnStatementValidator.ts

#### Type Hierarchy (2)

- **INTERFACE_ALREADY_IMPLEMENTED** (`interface.already.implemented`)
  - Used in: semantics/validation/validators/InterfaceHierarchyValidator.ts
- **INTERFACE_IMPLEMENTATION_MISSING_METHOD** (`interface.implementation.missing.method`)
  - Used in: semantics/validation/validators/InterfaceHierarchyValidator.ts

#### Types (10)

- **INVALID_CAST_TYPE** (`invalid.cast.type`)
  - Used in: semantics/validation/TypeCastingValidator.ts
- **INVALID_COMPARISON_TYPES** (`invalid.comparison.types`)
  - Used in: semantics/validation/validators/ExpressionValidator.ts
- **INVALID_CONDITION_TYPE** (`invalid.condition.type`)
  - Used in: semantics/validation/validators/ExpressionValidator.ts
- **INVALID_DML_TYPE** (`invalid.dml.type`)
  - Used in: semantics/validation/validators/DmlStatementValidator.ts
- **INVALID_FINAL_SUPER_TYPE** (`invalid.final.super.type`)
  - Used in: semantics/validation/validators/ClassHierarchyValidator.ts
- **INVALID_INEQUALITY_TYPE** (`invalid.inequality.type`)
  - Used in: semantics/validation/BooleanExpressionValidator.ts
- **INVALID_LIST_INDEX_TYPE** (`invalid.list.index.type`)
  - Used in: semantics/validation/validators/CollectionValidator.ts
- **INVALID_LOGICAL_TYPE** (`invalid.logical.type`)
  - Used in: semantics/validation/BooleanExpressionValidator.ts
- **INVALID_RESERVED_TYPE_IDENTIFIER** (`invalid.reserved.type.identifier`)
  - Used in: semantics/validation/IdentifierValidator.ts
- **TYPE_NOT_VISIBLE** (`type.not.visible`)
  - Used in: semantics/validation/validators/TypeVisibilityValidator.ts

#### Variables/Fields (5)

- **FIELD_DOES_NOT_EXIST** (`field.does.not.exist`)
  - Used in: semantics/validation/validators/VariableResolutionValidator.ts
- **INVALID_FINAL_FIELD_ASSIGNMENT** (`invalid.final.field.assignment`)
  - Used in: semantics/validation/validators/FinalAssignmentValidator.ts
- **INVALID_VOID_VARIABLE** (`invalid.void.variable`)
  - Used in: semantics/validation/validators/ExpressionTypeValidator.ts
- **VARIABLE_DOES_NOT_EXIST** (`variable.does.not.exist`)
  - Used in: semantics/validation/validators/VariableResolutionValidator.ts
- **VARIABLE_NOT_VISIBLE** (`variable.not.visible`)
  - Used in: semantics/validation/validators/VariableResolutionValidator.ts

#### Visibility (1)

- **CANNOT_REDUCE_METHOD_VISIBILITY_OVERRIDE** (`cannot.reduce.method.visibility.override`)
  - Used in: semantics/validation/validators/MethodOverrideValidator.ts

## Not Supported Error Codes (Gaps)

### By Category

#### Annotations (24)

- **ANNOTATION_JSONACCESS_MUST_SPECIFY_CONTROL_PARAMETER** (`annotation.jsonaccess.must.specify.control.parameter`)
- **ANNOTATION_NOT_SUPPORTED** (`annotation.not.supported`)
  - **Note**: This error code is for org-specific validation (known annotation not available in the org). Currently, `UnknownAnnotationValidator` uses `ANNOTATION_UNKNOWN` for unrecognized annotations. `ANNOTATION_NOT_SUPPORTED` would require org metadata to determine which annotations are available in the current org context.
- **ANNOTATION_PLURAL** (`annotation.plural`)
- **ANNOTATION_PROPERTY_BAD_STRING_VALUE** (`annotation.property.bad.string.value`)
- **ANNOTATION_PROPERTY_CANNOT_BE_EMPTY** (`annotation.property.cannot.be.empty`)
- **ANNOTATION_PROPERTY_GREATER_THAN_OR_EQUAL** (`annotation.property.greater.than.or.equal`)
- **ANNOTATION_PROPERTY_INVALID_API_VERSION** (`annotation.property.invalid.api.version`)
- **ANNOTATION_PROPERTY_INVALID_FORMAT** (`annotation.property.invalid.format`)
- **ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME** (`annotation.property.invalid.lightning.web.component.name`)
- **ANNOTATION_PROPERTY_INVALID_MULTIPLE_PARAMETER** (`annotation.property.invalid.multiple.parameter`)
- **ANNOTATION_PROPERTY_INVALID_PERM_VALUE** (`annotation.property.invalid.perm.value`)
- **ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME** (`annotation.property.invalid.static.resource.name`)
- **ANNOTATION_PROPERTY_INVALID_TYPE** (`annotation.property.invalid.type`)
- **ANNOTATION_PROPERTY_IS_NOT_ALLOWED** (`annotation.property.is.not.allowed`)
- **ANNOTATION_PROPERTY_LESS_THAN_OR_EQUAL** (`annotation.property.less.than.or.equal`)
- **ANNOTATION_PROPERTY_MAX_VERSION** (`annotation.property.max.version`)
- **ANNOTATION_PROPERTY_MIN_VERSION** (`annotation.property.min.version`)
- **ANNOTATION_PROPERTY_NOT_SUPPORTED_FOR_TYPE** (`annotation.property.not.supported.for.type`)
- **ANNOTATION_PROPERTY_SIBLING_INVALID_VALUE** (`annotation.property.sibling.invalid.value`)
- **ANNOTATION_PROPERTY_TESTFOR_EMPTY_SUFFIX** (`annotation.property.testFor.empty.suffix`)
- **ANNOTATION_PROPERTY_TESTFOR_INVALID_PREFIX** (`annotation.property.testFor.invalid.prefix`)
- **ANNOTATION_PROPERTY_TYPE_MISMATCH** (`annotation.property.type.mismatch`)
- **ANNOTATION_PROPERTY_VALUE_IS_NOT_ALLOWED** (`annotation.property.value.is.not.allowed`)
- **ANNOTATION_PROPERTY_VALUE_NOT_FOUND** (`annotation.property.value.not.found`)

#### Constructors (2)

- **INVALID_DEFAULT_CONSTRUCTOR** (`invalid.default.constructor`)
- **INVALID_NORMAL_CONSTRUCTOR** (`invalid.normal.constructor`)

#### DML Operations (1)

- **INVALID_MERGE_DUPLICATE_RECORDS** (`invalid.merge.duplicate.records`)

#### Deprecation (1)

- **DEPRECATE_SOBJECT_RECALCULATEFORMULAS** (`deprecate.sobject.recalculateformulas`)

#### Duplicates (1)

- **DUPLICATE_TYPE_PARAMETER** (`duplicate.type.parameter`)

#### Expressions (11)

- **ILLEGAL_JAVA_EXPRESSION** (`illegal.java.expression`)
- **INVALID_BOOLEAN_PREFIX_OPERAND** (`invalid.boolean.prefix.operand`)
- **INVALID_JAVA_EXPRESSION** (`invalid.java.expression`)
- **INVALID_JAVA_EXPRESSION_CLASS_NOT_FOUND** (`invalid.java.expression.class.not.found`)
- **INVALID_JAVA_EXPRESSION_FIELD_NOT_FOUND** (`invalid.java.expression.field.not.found`)
- **INVALID_LIST_INITIAL_EXPRESSION_TYPE** (`invalid.list.initial.expression.type`)
- **INVALID_NEGATE_PREFIX_OPERAND** (`invalid.negate.prefix.operand`)
- **INVALID_NUMERIC_POSTFIX_OPERAND** (`invalid.numeric.postfix.operand`)
- **INVALID_SET_INITIAL_EXPRESSION_TYPE** (`invalid.set.initial.expression.type`)
- **INVALID_WHEN_EXPRESSION_TYPE** (`invalid.when.expression.type`)
- **INVALID_WHEN_LITERAL_EXPRESSION** (`invalid.when.literal.expression`)

#### Invalid/Illegal (37)

- **ILLEGAL_ACCESSOR_ON_PROPERTY** (`illegal.accessor.on.property`)
- **ILLEGAL_ALL_CALL** (`illegal.all.call`)
- **ILLEGAL_COMPARATOR_FOR_SORT** (`illegal.comparator.for.sort`)
- **ILLEGAL_CONVERSION** (`illegal.conversion`)
- **ILLEGAL_DECIMAL_LITERAL** (`illegal.decimal.literal`)
- **ILLEGAL_DOUBLE_LITERAL** (`illegal.double.literal`)
- **ILLEGAL_INTEGER_LITERAL** (`illegal.integer.literal`)
- **ILLEGAL_LONG_LITERAL** (`illegal.long.literal`)
- **ILLEGAL_NON_FOREIGN_KEY_REFERENCE** (`illegal.non.foreign.key.reference`)
- **ILLEGAL_STRING_LITERAL** (`illegal.string.literal`)
- **INVALID_APEX_IDENTIFIER** (`invalid.apex.identifier`)
- **INVALID_APEX_SYMBOL** (`invalid.apex.symbol`)
- **INVALID_CLASS** (`invalid.class`)
- **INVALID_CONTROL_CHARACTER** (`invalid.control.character`)
- **INVALID_DATE** (`invalid.date`)
- **INVALID_DATE_TIME** (`invalid.date.time`)
- **INVALID_FULLY_QUALIFIED_ENUM** (`invalid.fully.qualified.enum`)
- **INVALID_INSTANCEOF_ALWAYS_FALSE** (`invalid.instanceof.always.false`)
- **INVALID_INSTANCEOF_ALWAYS_TRUE** (`invalid.instanceof.always.true`)
- **INVALID_METADATA_TOO_LARGE** (`invalid.metadata.too.large`)
- **INVALID_NEW_ABSTRACT** (`invalid.new.abstract`)
- **INVALID_NUMERIC_PREFIX_DECREMENT** (`invalid.numeric.prefix.decrement`)
- **INVALID_NUMERIC_PREFIX_INCREMENT** (`invalid.numeric.prefix.increment`)
- **INVALID_PUBLIC_REMOTE_ACTION** (`invalid.public.remote.action`)
- **INVALID_READ_ONLY** (`invalid.read.only`)
- **INVALID_RETURN_NON_VOID** (`invalid.return.non.void`)
- **INVALID_ROW_LOCK** (`invalid.row.lock`)
- **INVALID_STRING_LITERAL_ILLEGAL_CHARACTER_SEQUENCE** (`invalid.string.literal.illegal.character.sequence`)
- **INVALID_STRING_LITERAL_ILLEGAL_LAST_CHARACTER** (`invalid.string.literal.illegal.last.character`)
- **INVALID_STRING_LITERAL_ILLEGAL_LINEBREAKS** (`invalid.string.literal.illegal.linebreaks`)
- **INVALID_STRING_LITERAL_ILLEGAL_UNICODE** (`invalid.string.literal.illegal.unicode`)
- **INVALID_STRING_LITERAL_ILLEGAL_UNICODE_SEQUENCE** (`invalid.string.literal.illegal.unicode.sequence`)
- **INVALID_SUPER_STATIC_CONTEXT** (`invalid.super.static.context`)
- **INVALID_THIS_STATIC_CONTEXT** (`invalid.this.static.context`)
- **INVALID_TIME** (`invalid.time`)
- **INVALID_UNIT** (`invalid.unit`)
- **INVALID_UNRESOLVED_ANNOTATION** (`invalid.unresolved.annotation`)

#### Loops (3)

- **LOOP_VARIABLE_MISMATCH_CONCRETE_SOBJECT_TYPE** (`loop.variable.mismatch.concrete.sobject.type`)
- **LOOP_VARIABLE_MISMATCH_SOBJECT_TYPE** (`loop.variable.mismatch.sobject.type`)
- **LOOP_WITH_QUERY_REQUIRES_STATEMENT** (`loop.with.query.requires.statement`)

#### Methods (14)

- **INVALID_ABSTRACT_METHOD_CALL** (`invalid.abstract.method.call`)
- **INVALID_JAVA_EXPRESSION_METHOD_NOT_FOUND** (`invalid.java.expression.method.not.found`)
- **INVALID_JAVA_EXPRESSION_METHOD_NOT_STATIC** (`invalid.java.expression.method.not.static`)
- **INVALID_METHOD_WITH_PARAMETERS** (`invalid.method.with.parameters`)
- **INVALID_MULTIPLE_METHODS_WITH_MODIFIER** (`invalid.multiple.methods.with.modifier`)
- **INVALID_NEW_PROTECTED_METHOD** (`invalid.new.protected.method`)
- **INVALID_NON_STATIC_METHOD_CONTEXT** (`invalid.non.static.method.context`)
- **INVALID_STATIC_METHOD_CONTEXT** (`invalid.static.method.context`)
- **METHOD_INVALID_ON_SOBJECT_FIELD** (`method.invalid.on.sobject.field`)
- **METHOD_INVALID_SOBJECT_LIST** (`method.invalid.sobject.list`)
- **METHOD_INVALID_SOBJECT_MAP** (`method.invalid.sobject.map`)
- **METHOD_ONLY_LIST_CUSTOM_SETTINGS** (`method.only.list.custom.settings`)
- **METHOD_PLURAL** (`method.plural`)
- **METHOD_TYPES_CLASH** (`method.types.clash`)

#### Modifiers (7)

- **MODIFIER_ILLEGAL_DEFINING_TYPE** (`modifier.illegal.defining.type`)
- **MODIFIER_ILLEGAL_DEFINING_TYPE_FOR** (`modifier.illegal.defining.type.for`)
- **MODIFIER_IS_BY_DEFAULT** (`modifier.is.by.default`)
- **MODIFIER_IS_INTERNAL** (`modifier.is.internal`)
- **MODIFIER_MIN_VERSION** (`modifier.min.version`)
- **MODIFIER_NOT_ON_TOP_LEVEL_TYPE** (`modifier.not.on.top.level.type`)
- **MODIFIER_REQUIRE_AT_LEAST** (`modifier.require.at.least`)

#### Other (68)

- **ANONYMOUS_PLURAL** (`anonymous.plural`)
- **ARRAY_REF_NOT_ALLOWED** (`array.ref.not.allowed`)
- **CANNOT_OVERRIDE_STATIC_METHOD** (`cannot.override.static.method`)
- **CANNOT_RENAME** (`cannot.rename`)
- **CONSTRUCTOR_PLURAL** (`constructor.plural`)
- **DATE_STRING** (`date.string`)
- **DECLARATIONS_SINGLE_SCOPE** (`declarations.single.scope`)
- **DECLARE_MISSING_METHOD** (`declare.missing.method`)
- **DECLARE_MISSING_METHOD_AVAILABLE** (`declare.missing.method.available`)
- **DEFINING_TYPE_REQUIRES** (`defining.type.requires`)
- **DEPENDENT_CLASS_INVALID** (`dependent.class.invalid`)
- **DEPENDENT_CLASS_INVALIDCHAIN** (`dependent.class.invalidChain`)
- **DML_OPERATION_NOT_ALLOWED** (`dml.operation.not.allowed`)
- **ENCLOSING_TYPE** (`enclosing.type`)
- **ENCLOSING_TYPE_FOR** (`enclosing.type.for`)
- **ENUM_PLURAL** (`enum.plural`)
- **EXPLICIT_UNMANAGED** (`explicit.unmanaged`)
- **EXPORT_DATA_CATEGORY** (`export.data.category`)
- **EXTERNAL_STRING_DOES_NOT_EXIST** (`external.string.does.not.exist`)
- **EXTRACT_CONSTANT** (`extract.constant`)
- **EXTRACT_VARIABLE** (`extract.variable`)
- **INCOMPATIBLE_NULLCOALESCING_EXPRESSION_TYPES** (`incompatible.nullcoalescing.expression.types`)
- **LOCAL_PLURAL** (`local.plural`)
- **MAXIMUM_TYPE_DEPTH_EXCEEDED** (`maximum.type.depth.exceeded`)
- **MERGE_NOT_SUPPORTED** (`merge.not.supported`)
- **MERGE_REQUIRES_CONCRETE_TYPE** (`merge.requires.concrete.type`)
- **MISMATCHED_SYNTAX** (`mismatched.syntax`)
- **MISSING_CLOSING_MARK** (`missing.closing.mark`)
- **MISSING_CLOSING_QUOTE** (`missing.closing.quote`)
- **MISSING_SYNTAX** (`missing.syntax`)
- **NEW_INNER_TYPE_NAME_CONFLICT_INTERFACE** (`new.inner.type.name.conflict.interface`)
- **NEW_INNER_TYPE_NAME_CONFLICT_OUTER** (`new.inner.type.name.conflict.outer`)
- **NEW_INNER_TYPE_NAME_CONFLICT_SUPER_TYPE** (`new.inner.type.name.conflict.super.type`)
- **NEW_NAME_CANNOT_END_EXCEPTION** (`new.name.cannot.end.exception`)
- **NEW_NAME_CONFLICT_INNER** (`new.name.conflict.inner`)
- **NEW_NAME_CONFLICT_LOCAL** (`new.name.conflict.local`)
- **NEW_NAME_INVALID_EXCEPTION** (`new.name.invalid.exception`)
- **NEW_NAME_MEMBER_CONFLICT** (`new.name.member.conflict`)
- **NO_TYPE_ARGUMENTS_FOR_PARAMETERIZED_TYPE** (`no.type.arguments.for.parameterized.type`)
- **PACKAGE_VERSION_FORBIDDEN** (`package.version.forbidden`)
- **PACKAGE_VERSION_INVALID** (`package.version.invalid`)
- **PACKAGE_VERSION_REQUIRES_NAMESPACE** (`package.version.requires.namespace`)
- **PAGE_DOES_NOT_EXIST** (`page.does.not.exist`)
- **PARAMETER_PLURAL** (`parameter.plural`)
- **PARAMETERIZED_TYPE_TOO_DEEP** (`parameterized.type.too.deep`)
- **PROPERTY_PLURAL** (`property.plural`)
- **QUERY_TOO_LARGE** (`query.too.large`)
- **REAL_LOC** (`real.loc`)
- **SOBJECT_NOT_CONSTRUCTABLE** (`sobject.not.constructable`)
- **SYNTHETIC_LOC** (`synthetic.loc`)
- **TIME_STRING** (`time.string`)
- **TOPLEVEL_MUST_BE_PUBLIC_OR_GLOBAL** (`toplevel.must.be.public.or.global`)
- **TRIGGER_NOT_SUPPORTED** (`trigger.not.supported`)
- **TRIGGER_PLURAL** (`trigger.plural`)
- **UNEXPECTED_EOF** (`unexpected.eof`)
- **UNEXPECTED_ERROR** (`unexpected.error`)
- **UNEXPECTED_SYMBOL_EXPECTED_FOUND** (`unexpected.symbol.expected.found`)
- **UNEXPECTED_SYMBOL_NOT_SET** (`unexpected.symbol.not.set`)
- **UNEXPECTED_SYMBOL_RANGE** (`unexpected.symbol.range`)
- **UNEXPECTED_SYMBOL_SET** (`unexpected.symbol.set`)
- **UNEXPECTED_SYNTAX_ERROR** (`unexpected.syntax.error`)
- **UNEXPECTED_TOKEN** (`unexpected.token`)
- **UNMATCHED_SYNTAX** (`unmatched.syntax`)
- **UNRECOGNIZED_SYMBOL_NOT_VALID_APEX_IDENTIFIER** (`unrecognized.symbol.not.valid.apex.identifier`)
- **UPSERT_INVALID_FIELD** (`upsert.invalid.field`)
- **UPSERT_REQUIRES_CONCRETE_TYPE** (`upsert.requires.concrete.type`)
- **USEREPLICA_PREFERRED_MUST_BE_STATIC** (`usereplica.preferred.must.be.static`)
- **WHEN_CLAUSE_LITERAL_OR_VALID_CONSTANT** (`when.clause.literal.or.valid.constant`)

#### REST Resources (1)

- **REST_RESOURCE_URL_INVALID_URL** (`rest.resource.url.invalid.url`)

#### Safe Navigation (1)

- **SAFE_NAVIGATION_INVALID_BETWEEN_SOBJECT_FIELD_AND_METHOD** (`safe.navigation.invalid.between.sobject.field.and.method`)

#### Testing (4)

- **PARALLEL_TEST_CLASS_CANNOT_HAVE_SEE_ALL_DATA** (`parallel.test.class.cannot.have.see.all.data`)
- **PARALLEL_TEST_METHOD_CANNOT_HAVE_SEE_ALL_DATA** (`parallel.test.method.cannot.have.see.all.data`)
- **TEST_SETUP_CANNOT_HAVE_DEFINING_TYPE_SEE_ALL_DATA** (`test.setup.cannot.have.defining.type.see.all.data`)
- **TEST_SETUP_CANNOT_HAVE_SEE_ALL_DATA** (`test.setup.cannot.have.see.all.data`)

#### Triggers (4)

- **INVALID_DUPLICATE_TRIGGER_USAGE** (`invalid.duplicate.trigger.usage`)
- **INVALID_TRIGGER_BEFORE_UNDELETE** (`invalid.trigger.before.undelete`)
- **INVALID_TRIGGER_OBJECT** (`invalid.trigger.object`)
- **INVALID_TRIGGER_PLATFORM_EVENT** (`invalid.trigger.platform.event`)

#### Type Hierarchy (5)

- **CLASS_MUST_IMPLEMENT_ABSTRACT_METHOD** (`class.must.implement.abstract.method`)
- **CLASS_PLURAL** (`class.plural`)
- **INTERFACE_IMPLEMENTATION_METHOD_DEPRECATED** (`interface.implementation.method.deprecated`)
- **INTERFACE_IMPLEMENTATION_METHOD_NOT_VISIBLE** (`interface.implementation.method.not.visible`)
- **INTERFACE_PLURAL** (`interface.plural`)

#### Types (22)

- **ILLEGAL_NON_WHEN_TYPE** (`illegal.non.when.type`)
- **ILLEGAL_WHEN_TYPE** (`illegal.when.type`)
- **INVALID_ALREADY_MATCH_TYPE** (`invalid.already.match.type`)
- **INVALID_EXACT_EQUALITY_TYPE** (`invalid.exact.equality.type`)
- **INVALID_FIELD_TYPE_LOAD** (`invalid.field.type.load`)
- **INVALID_FIELD_TYPE_STORE** (`invalid.field.type.store`)
- **INVALID_INITIAL_KEY_TYPE** (`invalid.initial.key.type`)
- **INVALID_INITIAL_VALUE_TYPE** (`invalid.initial.value.type`)
- **INVALID_INNER_TYPE_NO_INNER_TYPES** (`invalid.inner.type.no.inner.types`)
- **INVALID_INNER_TYPE_NO_STATIC_BLOCKS** (`invalid.inner.type.no.static.blocks`)
- **INVALID_INSTANCEOF_INVALID_TYPE** (`invalid.instanceof.invalid.type`)
- **INVALID_LIST_TYPE** (`invalid.list.type`)
- **INVALID_LOOP_TYPE** (`invalid.loop.type`)
- **INVALID_PARAMETERIZED_TYPE** (`invalid.parameterized.type`)
- **INVALID_PARAMETERIZED_TYPE_COUNT** (`invalid.parameterized.type.count`)
- **INVALID_SUPER_TYPE** (`invalid.super.type`)
- **INVALID_TYPE_BITWISE_NEGATE** (`invalid.type.bitwise.negate`)
- **INVALID_UNRESOLVED_TYPE** (`invalid.unresolved.type`)
- **TYPE_ARGUMENTS_FOR_NON_PARAMETERIZED_TYPE** (`type.arguments.for.non.parameterized.type`)
- **TYPE_MUST_BE_TOP_LEVEL** (`type.must.be.top.level`)
- **TYPE_NOT_CONSTRUCTABLE** (`type.not.constructable`)
- **TYPE_PARAMETERS_NOT_SUPPORTED** (`type.parameters.not.supported`)

#### Variables/Fields (6)

- **FIELD_DOES_NOT_SUPPORT_TYPE** (`field.does.not.support.type`)
- **FIELD_PLURAL** (`field.plural`)
- **INVALID_NON_STATIC_VARIABLE_CONTEXT** (`invalid.non.static.variable.context`)
- **INVALID_STATIC_VARIABLE_CONTEXT** (`invalid.static.variable.context`)
- **INVALID_WHEN_FIELD_CONSTANT** (`invalid.when.field.constant`)
- **INVALID_WHEN_FIELD_LITERAL** (`invalid.when.field.literal`)

#### Visibility (4)

- **CUSTOM_METADATA_TYPE_NAMESPACE_NOT_VISIBLE** (`custom.metadata.type.namespace.not.visible`)
- **CUSTOM_SETTINGS_NAMESPACE_NOT_VISIBLE** (`custom.settings.namespace.not.visible`)
- **NOT_VISIBLE_MAX_VERSION** (`not.visible.max.version`)
- **NOT_VISIBLE_MIN_VERSION** (`not.visible.min.version`)

## Notes

- Error codes are categorized by their string value prefix and content.
- "Supported" means the error code is referenced in at least one validator or parser listener.
- "Not Supported" means the error code exists but is not currently used in any validator.
- Some validators may use string literals instead of ErrorCodes constants.
- Generated files (ErrorCodes.ts, messages_en_US.ts) are excluded from the analysis.

## Important Distinctions

### ANNOTATION_UNKNOWN vs ANNOTATION_NOT_SUPPORTED

- **ANNOTATION_UNKNOWN** (`annotation.unknown`): Used when an annotation is not recognized at all (not in the known annotation list). Currently implemented in `UnknownAnnotationValidator`.
- **ANNOTATION_NOT_SUPPORTED** (`annotation.not.supported`): Used when an annotation is known but not available/supported in the current org context. This requires org-specific metadata and is not currently implemented.
