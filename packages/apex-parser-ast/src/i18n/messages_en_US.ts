/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// This file is auto-generated during build from messages_en_US.properties
// @ts-nocheck
/* eslint-disable max-len */
// DO NOT EDIT - This file is generated automatically

/**
 * English error messages from jorje's messages_en_US.properties
 * Generated at build time for browser/web worker compatibility
 * Messages use MessageFormat-style placeholders: {0}, {1}, etc.
 */
export const messages: Map<string, string> = new Map([
  ['abstract.methods.cannot.have.body', 'Abstract methods cannot have a body'],
  ['ambiguous.method.signature', 'Ambiguous method signature: {0}'],
  [
    'annotation.jsonaccess.must.specify.control.parameter',
    'At least one JSON serialization control parameter must be specified',
  ],
  ['annotation.not.supported', 'Annotation is not valid in your org: {0}'],
  ['annotation.plural', 'annotations'],
  [
    'annotation.property.bad.string.value',
    'Annotation property, {0} on {1}, unknown value: {2}',
  ],
  [
    'annotation.property.cannot.be.empty',
    'Specify a value for the {0} annotation property',
  ],
  [
    'annotation.property.greater.than.or.equal',
    'Annotation property, {0} on {1}, must be greater than or equal to {2}: {3}',
  ],
  [
    'annotation.property.invalid.api.version',
    'Annotation property, {0} on {1}, invalid version: {2}',
  ],
  [
    'annotation.property.invalid.format',
    'Annotation property, the format of {0} on {1} is invalid, please check if the {0} has the correct formats',
  ],
  [
    'annotation.property.invalid.lightning.web.component.name',
    'Invalid value for property configurationEditor: {0} is not a valid Lightning Web Component name',
  ],
  [
    'annotation.property.invalid.multiple.parameter',
    'Annotation property {0} does not support multiple {1} parameters',
  ],
  [
    'annotation.property.invalid.perm.value',
    'Annotation property, {0} on {1}, value is not valid in your org: {2}',
  ],
  [
    'annotation.property.invalid.static.resource.name',
    'Invalid value for property {0}: We cannot find the icon {1}. Ensure that you uploaded the icon as a static resource',
  ],
  [
    'annotation.property.invalid.type',
    'Annotation property, {0} on {1} is not supported for type {2}',
  ],
  [
    'annotation.property.invalid.value',
    'Invalid value for property {0} expected type {1}',
  ],
  [
    'annotation.property.is.not.allowed',
    'Annotation property, {0} on {1}, is not allowed on {2}',
  ],
  [
    'annotation.property.less.than.or.equal',
    'Annotation property, {0} on {1}, must be less than or equal to {2}: {3}',
  ],
  [
    'annotation.property.max.version',
    'Annotation property, {0} on {1}, must be in version {2} or lower',
  ],
  [
    'annotation.property.min.version',
    'Annotation property, {0} on {1}, must be in version {2} or higher',
  ],
  ['annotation.property.missing', 'Required property is missing: {0}'],
  [
    'annotation.property.not.supported',
    'No such property, {0}, defined on this annotation: {1}',
  ],
  [
    'annotation.property.not.supported.for.type',
    "The {0} annotation property doesn''t support the {1} data type",
  ],
  [
    'annotation.property.sibling.invalid.value',
    'Invalid combination of values for properties {0} and {1} on {2}',
  ],
  [
    'annotation.property.testFor.empty.suffix',
    'Invalid value for property {0}, expected Apex {1} name is missing or empty',
  ],
  [
    'annotation.property.testFor.invalid.prefix',
    "Invalid prefix for property {0}. Specify {1} in the format ''prefix:name, ...'' where prefix is {2}. Use commas to separate multiple type names in the same format.",
  ],
  [
    'annotation.property.type.mismatch',
    "The data type of the value for the {0} annotation property doesn''t match the data type of the ''{1}'' variable. Specify a value with a data type of {2}",
  ],
  [
    'annotation.property.value.is.not.allowed',
    'Invalid annotation property value, {0}, for property {1} on {2}',
  ],
  [
    'annotation.property.value.not.found',
    'Invalid value for property {0} expected Apex {1} {2} not found',
  ],
  ['anonymous.plural', 'anonymous classes'],
  [
    'array.ref.not.allowed',
    'A type is not allowed to extend or implement an array ref: {0}',
  ],
  [
    'aura.duplicate.method.field',
    'AuraEnabled method and variable cannot have the same name: {0}',
  ],
  [
    'aura.overloaded.method',
    'Overload of AuraEnabled method: {0} overload is not permitted',
  ],
  [
    'cannot.override.static.method',
    'Cannot override static method: {0} with {1}',
  ],
  [
    'cannot.reduce.method.visibility.override',
    'Cannot reduce the visibility of method: {0}',
  ],
  [
    'cannot.rename',
    'Unable to rename symbol. You can rename symbols only if they are defined in a source file',
  ],
  ['circular.definition', 'Circular definition: {0}'],
  [
    'class.must.implement.abstract.method',
    'Class {0} must implement the abstract method: {1}',
  ],
  ['class.plural', 'classes'],
  ['constructor.plural', 'constructors'],
  [
    'custom.metadata.type.namespace.not.visible',
    'Custom Metadata Type cannot be referenced outside code from the same namespace.',
  ],
  [
    'custom.settings.namespace.not.visible',
    'Custom Setting cannot be referenced outside code from the same namespace.',
  ],
  [
    'date.string',
    '\\ YYYY must be a year (AD) 0001-9999. mm must be a month 01-12. DD must be a day 01-31.',
  ],
  ['declarations.single.scope', 'Declarations can only have one scope'],
  ['declare.missing.method', "Create method ''{0}'' in ''{1}''"],
  [
    'declare.missing.method.available',
    "Quick fix available: Declare missing method, ''{0}''",
  ],
  ['defining.type.requires', '{0} defined types requires that {1}'],
  [
    'dependent.class.invalid',
    'Dependent class is invalid and needs recompilation:\n Class {0} : {1}',
  ],
  ['dependent.class.invalidChain', '{0}-->{1}'],
  [
    'deprecate.sobject.recalculateformulas',
    'SObject.recalculateFormulas() is deprecated as of API version 57.0. Use Formula.recalculateFormulas() instead',
  ],
  ['dml.operation.not.allowed', 'DML operation {0} not allowed on {1}'],
  ['duplicate.field', 'Duplicate field: {0}'],
  ['duplicate.field.init', 'Duplicate field initialization: {0}'],
  ['duplicate.modifier', 'Duplicate modifier: {0}'],
  [
    'duplicate.remote.action.methods',
    'Remote Action does not support two remote action methods with the same name and same number of parameters',
  ],
  ['duplicate.type.name', 'Type name already in use: {0}'],
  ['duplicate.type.parameter', 'Duplicate type parameter: {0}'],
  ['duplicate.variable', 'Duplicate variable: {0}'],
  [
    'duplicate.web.service.methods',
    'Web Service does not support two web service methods with the same name: {0}',
  ],
  ['enclosing.type', 'In enclosing types of, {0},'],
  ['enclosing.type.for', 'Enclosing type for {0} {1} in apex'],
  ['enum.plural', 'enums'],
  [
    'explicit.unmanaged',
    "Unmanaged packages cannot explicitly reference this organization's namespace.",
  ],
  [
    'export.data.category',
    'Salesforce.com does not currently allow export of components referencing to Data Categories.',
  ],
  [
    'expression.too.long',
    'Expression is too long, please split this expression into multiple statements',
  ],
  ['external.string.does.not.exist', 'External string does not exist: {0}'],
  ['extract.constant', 'Extract Constant'],
  ['extract.variable', 'Extract Variable'],
  ['field.does.not.exist', 'Field does not exist: {0} on {1}'],
  ['field.does.not.support.type', '{0} fields do not support type of {1}'],
  ['field.plural', 'fields'],
  [
    'generic.interface.already.implemented',
    'Generic Interface already implemented: {0}',
  ],
  [
    'global.deprecate.if.parameter.deprecated',
    'Global methods must be deprecated when parameter type is deprecated: {0}',
  ],
  [
    'global.deprecate.if.return.deprecated',
    'Global methods must be deprecated when return type is deprecated: {0}',
  ],
  [
    'global.deprecate.if.type.deprecated',
    'Global fields must be deprecated when type is deprecated: {0}',
  ],
  ['identifier.too.long', 'Identifier name is too long: {0}'],
  [
    'illegal.accessor.on.property',
    'Cannot declare {0} accessor on {1} property',
  ],
  [
    'illegal.all.call',
    'Illegal all method call for argument type, {0}, for collection: {1}',
  ],
  ['illegal.assignment', 'Illegal assignment from {0} to {1}'],
  [
    'illegal.comparator.for.sort',
    'Incompatible Comparator argument type: {0}, for collection: {1}',
  ],
  ['illegal.conversion', 'Illegal conversion from {0} to {1}'],
  ['illegal.decimal.literal', 'Illegal decimal'],
  ['illegal.double.literal', 'Illegal double'],
  ['illegal.forward.reference', 'Illegal forward reference: {0}'],
  [
    'illegal.instance.method.reference.in.constructor',
    'Cannot reference instance methods in a constructor invocation: {0}',
  ],
  [
    'illegal.instance.variable.reference.in.constructor',
    'Cannot reference instance variables in a constructor invocation: {0}',
  ],
  ['illegal.integer.literal', 'Illegal integer'],
  [
    'illegal.java.expression',
    'Java expression only allowed for trusted sources',
  ],
  ['illegal.long.literal', 'Illegal long'],
  [
    'illegal.no.when.blocks',
    'Switch statement requires at least one when block',
  ],
  [
    'illegal.non.foreign.key.reference',
    'A non foreign key field cannot be referenced in a path expression: {0}',
  ],
  [
    'illegal.non.when.type',
    "Switching on SObject types must be a 'when type variable' or 'when null'",
  ],
  ['illegal.string.literal', 'Illegal string literal: {0}'],
  [
    'illegal.switch.expression.type',
    '{0} is not a valid switch expression type',
  ],
  ['illegal.when.type', "{0} cannot be a 'when type variable' block"],
  [
    'incompatible.cast.types',
    'Incompatible types since an instance of {0} is never an instance of {1}',
  ],
  [
    'incompatible.nullcoalescing.expression.types',
    'Incompatible types in null coalescing operator: {0}, {1}',
  ],
  [
    'incompatible.ternary.expression.types',
    'Incompatible types in ternary operator: {0}, {1}',
  ],
  ['interface.already.implemented', 'Interface already implemented: {0}'],
  [
    'interface.implementation.method.deprecated',
    'Cannot deprecate an interface implementation method: {0}',
  ],
  [
    'interface.implementation.method.not.visible',
    '{0}: Overriding implementations of global or public interface methods must be global or public: {1}',
  ],
  [
    'interface.implementation.missing.method',
    'Class {0} must implement the method: {1}',
  ],
  ['interface.plural', 'interfaces'],
  [
    'invalid.abstract.method.call',
    'Abstract method cannot be called directly: {0}',
  ],
  [
    'invalid.already.match.type',
    "{0} in the 'when expression' is already matching the switch expression type",
  ],
  [
    'invalid.apex.identifier',
    "Invalid identifier ''{0}''. Apex identifiers must start with an ASCII letter (a-z or A-Z) followed by any number of ASCII letters (a-z or A-Z), digits (0 - 9), ''_''.",
  ],
  [
    'invalid.apex.symbol',
    "Found punctuation symbol or operator ''{0}'' that isn''t valid in Apex.",
  ],
  [
    'invalid.bitwise.operator.arguments',
    '{0} operator can only be applied to Boolean expressions or to Integer or Long expressions',
  ],
  [
    'invalid.boolean.prefix.operand',
    '{0} operator can only be applied to boolean expressions',
  ],
  ['invalid.break', 'Break statement must be in loop'],
  ['invalid.cast.type', 'Operation cast is not allowed on type: {0}'],
  ['invalid.catch.duplicate.exception', 'Exception type already caught: {0}'],
  [
    'invalid.catch.exception',
    'Catch block variable must be of type exception: {0}',
  ],
  ['invalid.character.identifier', 'Invalid character in identifier: {0}'],
  ['invalid.class', 'Invalid class: {0}'],
  [
    'invalid.comparison.types',
    'Comparison arguments must be compatible types: {0}, {1}',
  ],
  [
    'invalid.condition.type',
    'Condition expression must be of type Boolean: {0}',
  ],
  ['invalid.constructor', 'No constructor defined: {0}'],
  ['invalid.constructor.name', 'Invalid constructor name: {0}'],
  ['invalid.constructor.return', 'Constructors must not return a value'],
  ['invalid.continue', 'Continue statement must be in loop'],
  [
    'invalid.control.character',
    "Found control character hex 0x{0} (decimal {1}) that isn''t valid in Apex.",
  ],
  [
    'invalid.date',
    "Invalid Date ''{0}''. If you are trying to do subtraction adding spaces around the ''-'' sign(s) will help. Apex dates must be of the form YYYY-mm-DD.{1}",
  ],
  [
    'invalid.date.operand.expression',
    'Date expressions must use Integer or Long',
  ],
  [
    'invalid.date.time',
    "Invalid DateTime ''{0}''. Apex DateTimes must be of the form YYYY-mm-DDtHH:MM:SS.NNNzOFFSET.{1}{2}",
  ],
  [
    'invalid.datetime.operand.expression',
    'Date/time expressions must use Integer or Double or Decimal',
  ],
  [
    'invalid.default.constructor',
    'No default constructor available in super type: {0}',
  ],
  ['invalid.dml.type', 'DML requires SObject or SObject list type: {0}'],
  ['invalid.duplicate.trigger.usage', 'Duplicate Trigger Usage: {0}'],
  [
    'invalid.exact.equality.type',
    'Exact equality operator only allowed for reference types: {0}',
  ],
  [
    'invalid.exception.constructor.already.defined',
    'System exception constructor already defined: {0}',
  ],
  [
    'invalid.exception.must.end.with.exception',
    "Classes extending Exception must have a name ending in 'Exception': {0}",
  ],
  [
    'invalid.exception.must.extend.exception',
    'Exception class must extend another Exception class: {0}',
  ],
  ['invalid.expression.assignment', 'Expression cannot be assigned'],
  ['invalid.expression.statement', 'Expression cannot be a statement.'],
  ['invalid.field.type.load', 'A value cannot be read from {0} in type {1}'],
  ['invalid.field.type.store', 'A value cannot be stored to {0} in type {1}'],
  [
    'invalid.final.field.assignment',
    'Final members can only be assigned in their declaration, init blocks, or constructors: {0}',
  ],
  [
    'invalid.final.super.type',
    'Non-virtual and non-abstract type cannot be extended: {0}',
  ],
  [
    'invalid.fully.qualified.enum',
    "Enum value used in 'when expression' should be unqualified",
  ],
  [
    'invalid.inequality.type',
    'Inequality operator not allowed for this type: {0}',
  ],
  ['invalid.initial.key.type', 'Invalid key type {0} for {1}'],
  ['invalid.initial.value.type', 'Invalid value type {0} for {1}'],
  [
    'invalid.inner.type.no.inner.types',
    'Inner types are not allowed to have inner types',
  ],
  [
    'invalid.inner.type.no.static.blocks',
    'Inner types are not allowed to have static blocks',
  ],
  [
    'invalid.instanceof.always.false',
    'Operation instanceof is always false since an instance of {0} is never an instance of {1}',
  ],
  [
    'invalid.instanceof.always.true',
    'Operation instanceof is always true since an instance of {0} is always an instance of {1}',
  ],
  [
    'invalid.instanceof.invalid.type',
    'Operation instanceof is not allowed on type: {0}',
  ],
  ['invalid.interface', 'Invalid interface: {0}'],
  [
    'invalid.java.expression',
    'Java expression requires class.field or class.method',
  ],
  ['invalid.java.expression.class.not.found', 'Java class not found: {0}'],
  [
    'invalid.java.expression.field.not.found',
    'Java field not found: {0} from the type {1}',
  ],
  [
    'invalid.java.expression.method.not.found',
    'Java method not found: {0} from the type {1}',
  ],
  [
    'invalid.java.expression.method.not.static',
    'Java method not static: {0} from the type {1}',
  ],
  ['invalid.keyword.identifier', 'Identifier cannot be a keyword: {0}'],
  ['invalid.list.index.type', 'List index must be of type {0}: {1}'],
  [
    'invalid.list.initial.expression.type',
    'Initial expression is of incorrect type, expected: {0} but was: {1}',
  ],
  [
    'invalid.list.initializer',
    'Invalid initializer type {0} found for List<{1}>: expected an Integer or a List of type {1}',
  ],
  ['invalid.list.type', 'Expression must be a list type: {0}'],
  ['invalid.logical.type', 'Logical operator can only be applied to {0}'],
  ['invalid.loop.type', 'Invalid loop variable type expected {0} was {1}'],
  [
    'invalid.map.initializer',
    'Invalid initializer type {0} found for Map<{1},{2}>: expected a Map with the same key and value types, or a valid SObject List',
  ],
  ['invalid.map.putAll', 'Invalid putAll type {0} found for {1}'],
  ['invalid.merge.duplicate.records', 'Invalid type for duplicate records'],
  [
    'invalid.metadata.too.large',
    'Class compilation requires too much metadata. Please consider splitting this class into multiple classes',
  ],
  [
    'invalid.method.not.found',
    'Method does not exist or incorrect signature: {0} from the type {1}',
  ],
  ['invalid.method.with.parameters', '{0} methods do not support parameters'],
  [
    'invalid.multiple.methods.with.modifier',
    'Only one method per type can be defined with: {0}',
  ],
  [
    'invalid.name.value.pair.constructor',
    'Invalid constructor syntax, name=value pairs can only be used for SObjects: {0}',
  ],
  [
    'invalid.negate.prefix.operand',
    'Unary negation must use a numeric argument',
  ],
  ['invalid.new.abstract', 'Abstract classes cannot be constructed: {0}'],
  [
    'invalid.new.protected.method',
    'New protected methods cannot be defined in non-virtual classes',
  ],
  [
    'invalid.non.static.method.context',
    'Non static method cannot be referenced from a static context: {0}',
  ],
  [
    'invalid.non.static.variable.context',
    'Non static field cannot be referenced from a static context: {0} from the type {1}',
  ],
  [
    'invalid.normal.constructor',
    'Type requires name=value pair construction: {0}',
  ],
  ['invalid.number.parameters', 'Invalid number of parameters exceeds: {0}'],
  [
    'invalid.numeric.arguments.expression',
    'Arithmetic expressions must use numeric arguments',
  ],
  [
    'invalid.numeric.postfix.operand',
    'Unary postfix increment/decrement can only be applied to numeric expressions: {0}',
  ],
  [
    'invalid.numeric.prefix.decrement',
    'Unary prefix decrement can only be applied to numeric expressions: {0}',
  ],
  [
    'invalid.numeric.prefix.increment',
    'Unary prefix increment can only be applied to numeric expressions: {0}',
  ],
  ['invalid.parameterized.type', 'Invalid parameterized type: {0}'],
  [
    'invalid.parameterized.type.count',
    'Invalid type argument count for {0}: expected {1} but found {2}',
  ],
  [
    'invalid.public.remote.action',
    'Remote Action method must be global in a global component',
  ],
  [
    'invalid.read.only',
    'Only WebService, RemoteAction or Schedulable.execute(SchedulableContext) methods can be marked ReadOnly',
  ],
  ['invalid.reserved.name.identifier', 'Identifier name is reserved: {0}'],
  ['invalid.reserved.type.identifier', 'Identifier type is reserved: {0}'],
  ['invalid.return.from.non.method', 'Return must be called from a method'],
  [
    'invalid.return.non.void',
    'Missing return statement required return type: {0}',
  ],
  ['invalid.return.void', 'Void method must not return a value'],
  [
    'invalid.row.lock',
    'Cannot lock rows for an SObject type that can not be updated: {0}',
  ],
  [
    'invalid.runas',
    "runAs requires a single argument of type 'User' or 'Version'",
  ],
  [
    'invalid.set.initial.expression.type',
    'Initial expression is of incorrect type, expected: {0} but was: {1}',
  ],
  [
    'invalid.set.initializer',
    'Invalid initializer type {0} found for Set<{1}>: expected a List or a Set of type: {1}',
  ],
  [
    'invalid.shift.operator.arguments',
    '{0} operation can only be applied to Integer or Long types',
  ],
  ['invalid.sobject.list', 'Only concrete SObject lists can be created'],
  ['invalid.sobject.map', 'Only concrete SObject maps can be created'],
  [
    'invalid.static.method.context',
    'Static method cannot be referenced from a non static context: {0}',
  ],
  [
    'invalid.static.variable.context',
    'Static field cannot be referenced from a non static context: {0} from the type {1}',
  ],
  [
    'invalid.string.literal.illegal.character.sequence',
    "Invalid string literal ''{0}''. Illegal character sequence '\\'{1}'' in string literal.",
  ],
  [
    'invalid.string.literal.illegal.last.character',
    "Invalid string literal ''{0}''.  '\\' is not allowed as the last character in a string literal.",
  ],
  [
    'invalid.string.literal.illegal.linebreaks',
    'Line breaks are not allowed in string literals',
  ],
  [
    'invalid.string.literal.illegal.unicode',
    "Invalid string literal ''{0}''. Illegal unicode sequence. '\\u'{1}'' in string literal.",
  ],
  [
    'invalid.string.literal.illegal.unicode.sequence',
    "Invalid string literal ''{0}''. Illegal unicode sequence. Less than four hex digits '\\'{1}'' in string literal.",
  ],
  [
    'invalid.super.call',
    "Call to 'super()' must be the first statement in a constructor method",
  ],
  [
    'invalid.super.static.context',
    'Super cannot be referenced in a static context',
  ],
  ['invalid.super.type', 'Invalid super type: {0}'],
  ['invalid.switch.enum', 'Field must be an enum reference'],
  [
    'invalid.this.call',
    "Call to 'this()' must be the first statement in a constructor method",
  ],
  [
    'invalid.this.static.context',
    'This cannot be referenced in a static context',
  ],
  [
    'invalid.throw.exception',
    'Throw expression must be of type exception: {0}',
  ],
  [
    'invalid.time',
    "Invalid Time ''{0}''. Apex times must be of the form HH:MM:SS.NNNzOFFSET.{1}",
  ],
  [
    'invalid.time.operand.expression',
    'Time expressions must use Integer or Long',
  ],
  [
    'invalid.trigger.before.undelete',
    'Trigger Usage Before Undelete is not supported',
  ],
  ['invalid.trigger.object', "Trigger type isn''t an SObject: {0}"],
  [
    'invalid.trigger.platform.event',
    'Platform Event SObjects only supports after insert: {0}',
  ],
  ['invalid.trigger.return', 'Trigger bodies must not return a value'],
  [
    'invalid.try.needs.catch.or.finally',
    'Try block must have at least one catch block or a finally block',
  ],
  ['invalid.type.bitwise.negate', 'Invalid type for bitwise negate: {0}'],
  ['invalid.unit', 'Invalid unit'],
  ['invalid.unresolved.annotation', 'Annotation does not exist: {0}'],
  ['invalid.unresolved.type', 'Invalid type: {0}'],
  [
    'invalid.void.arithmetic.expression',
    'Arithmetic expressions are not allowed on void types',
  ],
  ['invalid.void.parameter', 'Parameters cannot be of type void'],
  ['invalid.void.property', 'Properties cannot be of type void'],
  ['invalid.void.variable', 'Variables cannot be of type void'],
  [
    'invalid.when.expression.type',
    "{0} value in 'when expression' cannot be implicitly converted to the {1} type in switch expression",
  ],
  ['invalid.when.field.constant', 'Field must be a static final constant: {0}'],
  ['invalid.when.field.literal', 'Field must be a non null literal: {0}'],
  [
    'invalid.when.literal.expression',
    "'when expression' must be a literal, a constant literal field or enum value",
  ],
  [
    'invocable.method.can.only.have.deprecated',
    'The only annotation that can be used with InvocableMethod is Deprecated',
  ],
  [
    'invocable.method.non.list.parameter',
    'Unsupported parameter type {0}. Valid invocable parameters must be List types like List<T> where T is a supported type',
  ],
  [
    'invocable.method.single.param',
    'Only one parameter is supported on methods with @Invocable annotation',
  ],
  ['local.plural', 'locals'],
  [
    'loop.must.iterate.over.collection',
    'Loop must iterate over collection: {0}',
  ],
  [
    'loop.variable.mismatch.concrete.sobject.type',
    'Loop variable must be a generic SObject or List or a concrete SObject or List of: {0}',
  ],
  [
    'loop.variable.mismatch.sobject.type',
    'Loop variable must be a generic SObject or List or a concrete SObject or List.',
  ],
  [
    'loop.with.query.requires.statement',
    'Loop with query must provide a statement',
  ],
  ['max.enums.exceeded', 'Maximum number of enum items exceeded: {0}'],
  ['maximum.type.depth.exceeded', 'Maximum type depth exceeded: 10'],
  ['merge.not.supported', 'Specified type {0} cannot be merged'],
  [
    'merge.requires.concrete.type',
    'Merge requires a concrete SObject type: {0}',
  ],
  [
    'method.already.exists',
    'Method already defined: {0} {1} from the type {2}',
  ],
  [
    'method.does.not.override',
    '@Override specified for non-overriding method: {0}',
  ],
  [
    'method.does.not.support.parameter.type',
    '{0} methods do not support parameter type of {1}',
  ],
  [
    'method.does.not.support.return.type',
    '{0} methods do not support return type of {1}',
  ],
  [
    'method.invalid.add.error.not.sobject.field',
    'addError must be invoked on an expression that is an exact SObject field reference',
  ],
  [
    'method.invalid.add.error.not.sobject.scalar.field',
    'addError must be invoked on an SObject scalar field',
  ],
  [
    'method.invalid.on.sobject.field',
    'Method {0} must be invoked on an expression that is an exact SObject field reference',
  ],
  [
    'method.invalid.sobject.list',
    'Operation only applies to SObject list types: {0}',
  ],
  [
    'method.invalid.sobject.map',
    'Operation only applies to SObject value map types: {0}',
  ],
  ['method.must.have.body', 'Method must have a body'],
  ['method.not.visible', 'Method is not visible: {0}'],
  [
    'method.only.list.custom.settings',
    'Method only supports list type Custom Settings: {0}',
  ],
  [
    'method.parameter.type.not.visible',
    'Method parameter type {0} is not visible for: {1}',
  ],
  ['method.plural', 'methods'],
  [
    'method.return.type.not.visible',
    'Method return type {0} is not visible for: {1}',
  ],
  [
    'method.types.clash',
    'Method return types clash: {0} vs {1} from the type {2}',
  ],
  ['methods.must.override', 'Method must use the override keyword: {0}'],
  ['mismatched.syntax', "Expecting ''{1}'' but was: {0}"],
  ['missing.closing.mark', 'Missing closing mark {0} on multi-line comment.'],
  ['missing.closing.quote', 'Missing closing quote character {0} on string.'],
  ['missing.syntax', "Missing ''{1}'' at {0}"],
  ['modifier.cannot.be', '{0} {1} cannot be {2}'],
  ['modifier.illegal.defining.type', '{0} is not allowed in {1}'],
  ['modifier.illegal.defining.type.for', 'Defining type for {0}'],
  ['modifier.is.by.default', '{0} are by default {1}'],
  [
    'modifier.is.internal',
    '{0} annotation can only be used by Salesforce code',
  ],
  ['modifier.is.not.allowed', '{0} is not allowed on {1}'],
  ['modifier.min.version', '{0} {1} must be in version {2} or higher'],
  [
    'modifier.not.in.top.level.type',
    '{0} can only be used on {1} of a top level type',
  ],
  [
    'modifier.not.on.top.level.type',
    '{0} can only be used on a top level type',
  ],
  [
    'modifier.require.at.least',
    '{0} {1} require at least one of the following {2}',
  ],
  ['modifier.requires', '{0} {1} must be declared as {2}'],
  [
    'namespace.guard.one.private.constructor',
    '@NamespaceGuard classes must have at least one private constructor',
  ],
  [
    'namespace.guard.private.constructor',
    '@NamespaceGuard classes cannot have a public constructor',
  ],
  [
    'namespace.guard.static.only',
    '@NamespaceGuard classes can only have static methods',
  ],
  [
    'new.inner.type.name.conflict.interface',
    'New name for inner type cannot be the same as the interface being implemented by the outer type',
  ],
  [
    'new.inner.type.name.conflict.outer',
    'New name for inner type cannot be the same as the name of the containing outer type',
  ],
  [
    'new.inner.type.name.conflict.super.type',
    'New name for inner type cannot be the same as the type being extended by the outer type',
  ],
  [
    'new.name.cannot.end.exception',
    "New name for a type that is not an Exception cannot end in 'Exception'",
  ],
  [
    'new.name.conflict.inner',
    'New name cannot be the same as the name of an inner type',
  ],
  [
    'new.name.conflict.local',
    'New identifier name cannot be the same as the name of an existing local variable or parameter',
  ],
  [
    'new.name.invalid.exception',
    "New name for an exception type must end in 'Exception'",
  ],
  [
    'new.name.member.conflict',
    'New name cannot be the same as the name of an existing member in: {0}',
  ],
  ['no.super.type', 'No super type defined: {0}'],
  [
    'no.type.arguments.for.parameterized.type',
    'No type arguments provided for a parameterized type: {0}',
  ],
  [
    'non.static.aura.method.cannot.have.params',
    'Non static AuraEnabled methods may not have parameters',
  ],
  [
    'non.static.aura.method.must.begin.with.get',
    "Non static AuraEnabled methods must be named with a prefix 'get'",
  ],
  [
    'non.virtual.methods.cannot.override',
    'Non-virtual, non-abstract methods cannot be overridden: {0}',
  ],
  [
    'not.unique.when.value.or.type',
    '{0} occurs as more than one when branch for this switch statement',
  ],
  ['not.visible.max.version', '{0} was removed after version {2}: {1}'],
  ['not.visible.min.version', '{0} not added until version {2}: {1}'],
  [
    'package.version.forbidden',
    'Unmanaged packages cannot reference Package.Version.',
  ],
  ['package.version.invalid', 'Package.Version.{0} is not a valid version.'],
  [
    'package.version.requires.namespace',
    'Package.Version Requires a namespaced org',
  ],
  ['page.does.not.exist', 'Page does not exist: {0}'],
  [
    'parallel.test.class.cannot.have.see.all.data',
    'Test class annotated with @isTest(IsParallel=true) cannot also be annotated with @isTest(SeeAllData=true)',
  ],
  [
    'parallel.test.method.cannot.have.see.all.data',
    'Test class annotated with @isTest(IsParallel=true) cannot have any methods annotated with @isTest(SeeAllData=true)',
  ],
  ['parameter.plural', 'parameters'],
  [
    'parameterized.type.too.deep',
    'Exceeded max parameterized type depth: {0}, depth: {1}',
  ],
  ['property.plural', 'properties'],
  ['query.too.large', 'Query is too large'],
  ['real.loc', 'startIndex: {0} endIndex: {1} line: {2} column: {3}'],
  ['rest.resource.url.empty', 'Rest Resource url cannot be empty'],
  [
    'rest.resource.url.illegal.wildcard.predecessor',
    "Rest Resource url wildcard, '*', must be preceded by a forward slash, '/'",
  ],
  [
    'rest.resource.url.illegal.wildcard.successor',
    "Rest Resource url wildcard, '*', must be followed by a forward slash, '/', or be the last character",
  ],
  ['rest.resource.url.invalid.url', 'Rest Resource url was invalid'],
  [
    'rest.resource.url.no.slash',
    "Rest Resource url must begin with a forward slash, '/'",
  ],
  [
    'rest.resource.url.too.long',
    'Rest Resource url cannot be longer than 255 characters',
  ],
  [
    'safe.navigation.invalid.between.sobject.field.and.add.error',
    'Safe navigation operator is not allowed between SObject field and addError',
  ],
  [
    'safe.navigation.invalid.between.sobject.field.and.method',
    'Safe navigation operator is not allowed between SObject field and {0}',
  ],
  ['script.too.large', 'Script too large: {0}...'],
  [
    'sfdc.only.cannot.have.global.fields',
    'SfdcOnly defined types cannot have global fields',
  ],
  ['sobject.not.constructable', 'SObject is not constructable: {0}'],
  ['synthetic.loc', 'no location'],
  [
    'test.class.must.not.be.exception',
    'Only top-level non-exception class types can be marked as tests',
  ],
  ['test.method.cannot.have.params', 'Test methods must have no arguments'],
  [
    'test.setup.cannot.have.defining.type.see.all.data',
    'Test class cannot be annotated with @isTest(SeeAllData=true)',
  ],
  ['test.setup.cannot.have.params', 'Test methods must have no arguments'],
  [
    'test.setup.cannot.have.see.all.data',
    'Test class containing a test setup method cannot have any methods annotated with @isTest(SeeAllData=true)',
  ],
  ['test.setup.must.return.void', 'Test setup method must return void'],
  [
    'time.string',
    '\\ HH must be 00-23, MM must be 00-59, and SS must be 00-59. .NNN is optional and is the milliseconds within the second 000-999. OFFSET is the timezone offset and has an optional + or - followed by HHMM or HH:MM.',
  ],
  [
    'toplevel.must.be.public.or.global',
    'Top-level type must have public or global visibility',
  ],
  ['trigger.not.supported', 'SObject type does not allow triggers: {0}'],
  ['trigger.plural', 'triggers'],
  [
    'type.arguments.for.non.parameterized.type',
    'Type arguments provided for a non-parameterized type: {0}',
  ],
  ['type.must.be.top.level', 'Only top-level classes can implement {0}'],
  ['type.not.constructable', 'Type cannot be constructed: {0}'],
  ['type.not.visible', 'Type is not visible: {0}'],
  ['type.parameters.not.supported', 'Type parameters are not supported'],
  ['unexpected.eof', 'Unexpected <EOF>'],
  ['unexpected.error', 'Unexpected error: {0}'],
  [
    'unexpected.symbol.expected.found',
    "Unexpected symbol ''{0}'', was expecting ''{1}''.",
  ],
  [
    'unexpected.symbol.not.set',
    "Unexpected symbol ''{0}'', was NOT expecting anything in the set [{1}].",
  ],
  [
    'unexpected.symbol.range',
    "Unexpected symbol ''{0}'', was expected something in the range ''{1}''..''{2}''.",
  ],
  [
    'unexpected.symbol.set',
    "Unexpected symbol ''{0}'', was expecting something in the set [{1}].",
  ],
  ['unexpected.syntax.error', 'Unexpected syntax error: {0}.'],
  ['unexpected.token', 'Unexpected token {0}.'],
  ['unknown.constructor', 'Constructor not defined: [{0}].<Constructor>{1}'],
  ['unmatched.syntax', "Extra ''{1}'', at {0}."],
  ['unreachable.statement', 'Unreachable statement'],
  [
    'unrecognized.symbol.not.valid.apex.identifier',
    "Unrecognized symbol ''{0}'', which is not a valid Apex identifier.",
  ],
  [
    'upsert.invalid.field',
    'Invalid field for upsert, must be an External Id custom or standard indexed field: {0}',
  ],
  [
    'upsert.requires.concrete.type',
    'Upsert with a field specification requires a concrete SObject type',
  ],
  [
    'usereplica.preferred.must.be.static',
    'ReadOnly methods with useReplica=preferred parameter must be declared as static',
  ],
  ['variable.does.not.exist', 'Variable does not exist: {0}'],
  ['variable.not.visible', 'Variable is not visible: {0}'],
  [
    'webservice.deprecate.if.type.deprecated',
    'WebService fields must be deprecated when type is deprecated: {0}',
  ],
  [
    'when.clause.literal.or.valid.constant',
    'When clause must be a literal or a non null constant literal: {0}',
  ],
  ['when.else.not.last', "'when else' must be the last when block"],
]);
