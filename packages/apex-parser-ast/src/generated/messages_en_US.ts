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
 * 
 * Messages have been transformed from MessageFormat style ({0}, {1}) to printf style (%s)
 * to be compatible with @salesforce/vscode-i18n. All placeholders are %s since Jorje's
 * {n} format doesn't carry type information.
 */

/**
 * Union type of all available error code keys
 * Provides type safety for error code references
 */
export type ErrorCodeKey =
  | 'abstract.methods.cannot.have.body'
  | 'ambiguous.method.signature'
  | 'annotation.jsonaccess.must.specify.control.parameter'
  | 'annotation.not.supported'
  | 'annotation.plural'
  | 'annotation.property.bad.string.value'
  | 'annotation.property.cannot.be.empty'
  | 'annotation.property.greater.than.or.equal'
  | 'annotation.property.invalid.api.version'
  | 'annotation.property.invalid.format'
  | 'annotation.property.invalid.lightning.web.component.name'
  | 'annotation.property.invalid.multiple.parameter'
  | 'annotation.property.invalid.perm.value'
  | 'annotation.property.invalid.static.resource.name'
  | 'annotation.property.invalid.type'
  | 'annotation.property.invalid.value'
  | 'annotation.property.is.not.allowed'
  | 'annotation.property.less.than.or.equal'
  | 'annotation.property.max.version'
  | 'annotation.property.min.version'
  | 'annotation.property.missing'
  | 'annotation.property.not.supported'
  | 'annotation.property.not.supported.for.type'
  | 'annotation.property.sibling.invalid.value'
  | 'annotation.property.testFor.empty.suffix'
  | 'annotation.property.testFor.invalid.prefix'
  | 'annotation.property.type.mismatch'
  | 'annotation.property.value.is.not.allowed'
  | 'annotation.property.value.not.found'
  | 'anonymous.plural'
  | 'array.ref.not.allowed'
  | 'aura.duplicate.method.field'
  | 'aura.overloaded.method'
  | 'cannot.override.static.method'
  | 'cannot.reduce.method.visibility.override'
  | 'cannot.rename'
  | 'circular.definition'
  | 'class.must.implement.abstract.method'
  | 'class.plural'
  | 'constructor.plural'
  | 'custom.metadata.type.namespace.not.visible'
  | 'custom.settings.namespace.not.visible'
  | 'date.string'
  | 'declarations.single.scope'
  | 'declare.missing.method'
  | 'declare.missing.method.available'
  | 'defining.type.requires'
  | 'dependent.class.invalid'
  | 'dependent.class.invalidChain'
  | 'deprecate.sobject.recalculateformulas'
  | 'dml.operation.not.allowed'
  | 'duplicate.field'
  | 'duplicate.field.init'
  | 'duplicate.modifier'
  | 'duplicate.remote.action.methods'
  | 'duplicate.type.name'
  | 'duplicate.type.parameter'
  | 'duplicate.variable'
  | 'duplicate.web.service.methods'
  | 'enclosing.type'
  | 'enclosing.type.for'
  | 'enum.plural'
  | 'explicit.unmanaged'
  | 'export.data.category'
  | 'expression.too.long'
  | 'external.string.does.not.exist'
  | 'extract.constant'
  | 'extract.variable'
  | 'field.does.not.exist'
  | 'field.does.not.support.type'
  | 'field.plural'
  | 'generic.interface.already.implemented'
  | 'global.deprecate.if.parameter.deprecated'
  | 'global.deprecate.if.return.deprecated'
  | 'global.deprecate.if.type.deprecated'
  | 'identifier.too.long'
  | 'illegal.accessor.on.property'
  | 'illegal.all.call'
  | 'illegal.assignment'
  | 'illegal.comparator.for.sort'
  | 'illegal.conversion'
  | 'illegal.decimal.literal'
  | 'illegal.double.literal'
  | 'illegal.forward.reference'
  | 'illegal.instance.method.reference.in.constructor'
  | 'illegal.instance.variable.reference.in.constructor'
  | 'illegal.integer.literal'
  | 'illegal.java.expression'
  | 'illegal.long.literal'
  | 'illegal.no.when.blocks'
  | 'illegal.non.foreign.key.reference'
  | 'illegal.non.when.type'
  | 'illegal.string.literal'
  | 'illegal.switch.expression.type'
  | 'illegal.when.type'
  | 'incompatible.cast.types'
  | 'incompatible.nullcoalescing.expression.types'
  | 'incompatible.ternary.expression.types'
  | 'interface.already.implemented'
  | 'interface.implementation.method.deprecated'
  | 'interface.implementation.method.not.visible'
  | 'interface.implementation.missing.method'
  | 'interface.plural'
  | 'invalid.abstract.method.call'
  | 'invalid.already.match.type'
  | 'invalid.apex.identifier'
  | 'invalid.apex.symbol'
  | 'invalid.bitwise.operator.arguments'
  | 'invalid.boolean.prefix.operand'
  | 'invalid.break'
  | 'invalid.cast.type'
  | 'invalid.catch.duplicate.exception'
  | 'invalid.catch.exception'
  | 'invalid.character.identifier'
  | 'invalid.class'
  | 'invalid.comparison.types'
  | 'invalid.condition.type'
  | 'invalid.constructor'
  | 'invalid.constructor.name'
  | 'invalid.constructor.return'
  | 'invalid.continue'
  | 'invalid.control.character'
  | 'invalid.date'
  | 'invalid.date.operand.expression'
  | 'invalid.date.time'
  | 'invalid.datetime.operand.expression'
  | 'invalid.default.constructor'
  | 'invalid.dml.type'
  | 'invalid.duplicate.trigger.usage'
  | 'invalid.exact.equality.type'
  | 'invalid.exception.constructor.already.defined'
  | 'invalid.exception.must.end.with.exception'
  | 'invalid.exception.must.extend.exception'
  | 'invalid.expression.assignment'
  | 'invalid.expression.statement'
  | 'invalid.field.type.load'
  | 'invalid.field.type.store'
  | 'invalid.final.field.assignment'
  | 'invalid.final.super.type'
  | 'invalid.fully.qualified.enum'
  | 'invalid.inequality.type'
  | 'invalid.initial.key.type'
  | 'invalid.initial.value.type'
  | 'invalid.inner.type.no.inner.types'
  | 'invalid.inner.type.no.static.blocks'
  | 'invalid.instanceof.always.false'
  | 'invalid.instanceof.always.true'
  | 'invalid.instanceof.invalid.type'
  | 'invalid.interface'
  | 'invalid.java.expression'
  | 'invalid.java.expression.class.not.found'
  | 'invalid.java.expression.field.not.found'
  | 'invalid.java.expression.method.not.found'
  | 'invalid.java.expression.method.not.static'
  | 'invalid.keyword.identifier'
  | 'invalid.list.index.type'
  | 'invalid.list.initial.expression.type'
  | 'invalid.list.initializer'
  | 'invalid.list.type'
  | 'invalid.logical.type'
  | 'invalid.loop.type'
  | 'invalid.map.initializer'
  | 'invalid.map.putAll'
  | 'invalid.merge.duplicate.records'
  | 'invalid.metadata.too.large'
  | 'invalid.method.not.found'
  | 'invalid.method.with.parameters'
  | 'invalid.multiple.methods.with.modifier'
  | 'invalid.name.value.pair.constructor'
  | 'invalid.negate.prefix.operand'
  | 'invalid.new.abstract'
  | 'invalid.new.protected.method'
  | 'invalid.non.static.method.context'
  | 'invalid.non.static.variable.context'
  | 'invalid.normal.constructor'
  | 'invalid.number.parameters'
  | 'invalid.numeric.arguments.expression'
  | 'invalid.numeric.postfix.operand'
  | 'invalid.numeric.prefix.decrement'
  | 'invalid.numeric.prefix.increment'
  | 'invalid.parameterized.type'
  | 'invalid.parameterized.type.count'
  | 'invalid.public.remote.action'
  | 'invalid.read.only'
  | 'invalid.reserved.name.identifier'
  | 'invalid.reserved.type.identifier'
  | 'invalid.return.from.non.method'
  | 'invalid.return.non.void'
  | 'invalid.return.void'
  | 'invalid.row.lock'
  | 'invalid.runas'
  | 'invalid.set.initial.expression.type'
  | 'invalid.set.initializer'
  | 'invalid.shift.operator.arguments'
  | 'invalid.sobject.list'
  | 'invalid.sobject.map'
  | 'invalid.static.method.context'
  | 'invalid.static.variable.context'
  | 'invalid.string.literal.illegal.character.sequence'
  | 'invalid.string.literal.illegal.last.character'
  | 'invalid.string.literal.illegal.linebreaks'
  | 'invalid.string.literal.illegal.unicode'
  | 'invalid.string.literal.illegal.unicode.sequence'
  | 'invalid.super.call'
  | 'invalid.super.static.context'
  | 'invalid.super.type'
  | 'invalid.switch.enum'
  | 'invalid.this.call'
  | 'invalid.this.static.context'
  | 'invalid.throw.exception'
  | 'invalid.time'
  | 'invalid.time.operand.expression'
  | 'invalid.trigger.before.undelete'
  | 'invalid.trigger.object'
  | 'invalid.trigger.platform.event'
  | 'invalid.trigger.return'
  | 'invalid.try.needs.catch.or.finally'
  | 'invalid.type.bitwise.negate'
  | 'invalid.unit'
  | 'invalid.unresolved.annotation'
  | 'invalid.unresolved.type'
  | 'invalid.void.arithmetic.expression'
  | 'invalid.void.parameter'
  | 'invalid.void.property'
  | 'invalid.void.variable'
  | 'invalid.when.expression.type'
  | 'invalid.when.field.constant'
  | 'invalid.when.field.literal'
  | 'invalid.when.literal.expression'
  | 'invocable.method.can.only.have.deprecated'
  | 'invocable.method.non.list.parameter'
  | 'invocable.method.single.param'
  | 'local.plural'
  | 'loop.must.iterate.over.collection'
  | 'loop.variable.mismatch.concrete.sobject.type'
  | 'loop.variable.mismatch.sobject.type'
  | 'loop.with.query.requires.statement'
  | 'max.enums.exceeded'
  | 'maximum.type.depth.exceeded'
  | 'merge.not.supported'
  | 'merge.requires.concrete.type'
  | 'method.already.exists'
  | 'method.does.not.override'
  | 'method.does.not.support.parameter.type'
  | 'method.does.not.support.return.type'
  | 'method.invalid.add.error.not.sobject.field'
  | 'method.invalid.add.error.not.sobject.scalar.field'
  | 'method.invalid.on.sobject.field'
  | 'method.invalid.sobject.list'
  | 'method.invalid.sobject.map'
  | 'method.must.have.body'
  | 'method.not.visible'
  | 'method.only.list.custom.settings'
  | 'method.parameter.type.not.visible'
  | 'method.plural'
  | 'method.return.type.not.visible'
  | 'method.types.clash'
  | 'methods.must.override'
  | 'mismatched.syntax'
  | 'missing.closing.mark'
  | 'missing.closing.quote'
  | 'missing.syntax'
  | 'modifier.cannot.be'
  | 'modifier.illegal.defining.type'
  | 'modifier.illegal.defining.type.for'
  | 'modifier.is.by.default'
  | 'modifier.is.internal'
  | 'modifier.is.not.allowed'
  | 'modifier.min.version'
  | 'modifier.not.in.top.level.type'
  | 'modifier.not.on.top.level.type'
  | 'modifier.require.at.least'
  | 'modifier.requires'
  | 'namespace.guard.one.private.constructor'
  | 'namespace.guard.private.constructor'
  | 'namespace.guard.static.only'
  | 'new.inner.type.name.conflict.interface'
  | 'new.inner.type.name.conflict.outer'
  | 'new.inner.type.name.conflict.super.type'
  | 'new.name.cannot.end.exception'
  | 'new.name.conflict.inner'
  | 'new.name.conflict.local'
  | 'new.name.invalid.exception'
  | 'new.name.member.conflict'
  | 'no.super.type'
  | 'no.type.arguments.for.parameterized.type'
  | 'non.static.aura.method.cannot.have.params'
  | 'non.static.aura.method.must.begin.with.get'
  | 'non.virtual.methods.cannot.override'
  | 'not.unique.when.value.or.type'
  | 'not.visible.max.version'
  | 'not.visible.min.version'
  | 'package.version.forbidden'
  | 'package.version.invalid'
  | 'package.version.requires.namespace'
  | 'page.does.not.exist'
  | 'parallel.test.class.cannot.have.see.all.data'
  | 'parallel.test.method.cannot.have.see.all.data'
  | 'parameter.plural'
  | 'parameterized.type.too.deep'
  | 'property.plural'
  | 'query.too.large'
  | 'real.loc'
  | 'rest.resource.url.empty'
  | 'rest.resource.url.illegal.wildcard.predecessor'
  | 'rest.resource.url.illegal.wildcard.successor'
  | 'rest.resource.url.invalid.url'
  | 'rest.resource.url.no.slash'
  | 'rest.resource.url.too.long'
  | 'safe.navigation.invalid.between.sobject.field.and.add.error'
  | 'safe.navigation.invalid.between.sobject.field.and.method'
  | 'script.too.large'
  | 'sfdc.only.cannot.have.global.fields'
  | 'sobject.not.constructable'
  | 'synthetic.loc'
  | 'test.class.must.not.be.exception'
  | 'test.method.cannot.have.params'
  | 'test.setup.cannot.have.defining.type.see.all.data'
  | 'test.setup.cannot.have.params'
  | 'test.setup.cannot.have.see.all.data'
  | 'test.setup.must.return.void'
  | 'time.string'
  | 'toplevel.must.be.public.or.global'
  | 'trigger.not.supported'
  | 'trigger.plural'
  | 'type.arguments.for.non.parameterized.type'
  | 'type.must.be.top.level'
  | 'type.not.constructable'
  | 'type.not.visible'
  | 'type.parameters.not.supported'
  | 'unexpected.eof'
  | 'unexpected.error'
  | 'unexpected.symbol.expected.found'
  | 'unexpected.symbol.not.set'
  | 'unexpected.symbol.range'
  | 'unexpected.symbol.set'
  | 'unexpected.syntax.error'
  | 'unexpected.token'
  | 'unknown.constructor'
  | 'unmatched.syntax'
  | 'unreachable.statement'
  | 'unrecognized.symbol.not.valid.apex.identifier'
  | 'upsert.invalid.field'
  | 'upsert.requires.concrete.type'
  | 'usereplica.preferred.must.be.static'
  | 'variable.does.not.exist'
  | 'variable.not.visible'
  | 'webservice.deprecate.if.type.deprecated'
  | 'when.clause.literal.or.valid.constant'
  | 'when.else.not.last';

/**
 * Messages as Record for use with @salesforce/vscode-i18n
 * Placeholders have been transformed from {n} to %s format
 */
export const messages: Record<string, string> = {
  'abstract.methods.cannot.have.body': 'Abstract methods cannot have a body',
  'ambiguous.method.signature': 'Ambiguous method signature: %s',
  'annotation.jsonaccess.must.specify.control.parameter': 'At least one JSON serialization control parameter must be specified',
  'annotation.not.supported': 'Annotation is not valid in your org: %s',
  'annotation.plural': 'annotations',
  'annotation.property.bad.string.value': 'Annotation property, %s on %s, unknown value: %s',
  'annotation.property.cannot.be.empty': 'Specify a value for the %s annotation property',
  'annotation.property.greater.than.or.equal': 'Annotation property, %s on %s, must be greater than or equal to %s: %s',
  'annotation.property.invalid.api.version': 'Annotation property, %s on %s, invalid version: %s',
  'annotation.property.invalid.format': 'Annotation property, the format of %s on %s is invalid, please check if the %s has the correct formats',
  'annotation.property.invalid.lightning.web.component.name': 'Invalid value for property configurationEditor: %s is not a valid Lightning Web Component name',
  'annotation.property.invalid.multiple.parameter': 'Annotation property %s does not support multiple %s parameters',
  'annotation.property.invalid.perm.value': 'Annotation property, %s on %s, value is not valid in your org: %s',
  'annotation.property.invalid.static.resource.name': 'Invalid value for property %s: We cannot find the icon %s. Ensure that you uploaded the icon as a static resource',
  'annotation.property.invalid.type': 'Annotation property, %s on %s is not supported for type %s',
  'annotation.property.invalid.value': 'Invalid value for property %s expected type %s',
  'annotation.property.is.not.allowed': 'Annotation property, %s on %s, is not allowed on %s',
  'annotation.property.less.than.or.equal': 'Annotation property, %s on %s, must be less than or equal to %s: %s',
  'annotation.property.max.version': 'Annotation property, %s on %s, must be in version %s or lower',
  'annotation.property.min.version': 'Annotation property, %s on %s, must be in version %s or higher',
  'annotation.property.missing': 'Required property is missing: %s',
  'annotation.property.not.supported': 'No such property, %s, defined on this annotation: %s',
  'annotation.property.not.supported.for.type': 'The %s annotation property doesn\'\'t support the %s data type',
  'annotation.property.sibling.invalid.value': 'Invalid combination of values for properties %s and %s on %s',
  'annotation.property.testFor.empty.suffix': 'Invalid value for property %s, expected Apex %s name is missing or empty',
  'annotation.property.testFor.invalid.prefix': 'Invalid prefix for property %s. Specify %s in the format \'\'prefix:name, ...\'\' where prefix is %s. Use commas to separate multiple type names in the same format.',
  'annotation.property.type.mismatch': 'The data type of the value for the %s annotation property doesn\'\'t match the data type of the \'\'%s\'\' variable. Specify a value with a data type of %s',
  'annotation.property.value.is.not.allowed': 'Invalid annotation property value, %s, for property %s on %s',
  'annotation.property.value.not.found': 'Invalid value for property %s expected Apex %s %s not found',
  'anonymous.plural': 'anonymous classes',
  'array.ref.not.allowed': 'A type is not allowed to extend or implement an array ref: %s',
  'aura.duplicate.method.field': 'AuraEnabled method and variable cannot have the same name: %s',
  'aura.overloaded.method': 'Overload of AuraEnabled method: %s overload is not permitted',
  'cannot.override.static.method': 'Cannot override static method: %s with %s',
  'cannot.reduce.method.visibility.override': 'Cannot reduce the visibility of method: %s',
  'cannot.rename': 'Unable to rename symbol. You can rename symbols only if they are defined in a source file',
  'circular.definition': 'Circular definition: %s',
  'class.must.implement.abstract.method': 'Class %s must implement the abstract method: %s',
  'class.plural': 'classes',
  'constructor.plural': 'constructors',
  'custom.metadata.type.namespace.not.visible': 'Custom Metadata Type cannot be referenced outside code from the same namespace.',
  'custom.settings.namespace.not.visible': 'Custom Setting cannot be referenced outside code from the same namespace.',
  'date.string': '\\ YYYY must be a year (AD) 0001-9999. mm must be a month 01-12. DD must be a day 01-31.',
  'declarations.single.scope': 'Declarations can only have one scope',
  'declare.missing.method': 'Create method \'\'%s\'\' in \'\'%s\'\'',
  'declare.missing.method.available': 'Quick fix available: Declare missing method, \'\'%s\'\'',
  'defining.type.requires': '%s defined types requires that %s',
  'dependent.class.invalid': 'Dependent class is invalid and needs recompilation:\n Class %s : %s',
  'dependent.class.invalidChain': '%s-->%s',
  'deprecate.sobject.recalculateformulas': 'SObject.recalculateFormulas() is deprecated as of API version 57.0. Use Formula.recalculateFormulas() instead',
  'dml.operation.not.allowed': 'DML operation %s not allowed on %s',
  'duplicate.field': 'Duplicate field: %s',
  'duplicate.field.init': 'Duplicate field initialization: %s',
  'duplicate.modifier': 'Duplicate modifier: %s',
  'duplicate.remote.action.methods': 'Remote Action does not support two remote action methods with the same name and same number of parameters',
  'duplicate.type.name': 'Type name already in use: %s',
  'duplicate.type.parameter': 'Duplicate type parameter: %s',
  'duplicate.variable': 'Duplicate variable: %s',
  'duplicate.web.service.methods': 'Web Service does not support two web service methods with the same name: %s',
  'enclosing.type': 'In enclosing types of, %s,',
  'enclosing.type.for': 'Enclosing type for %s %s in apex',
  'enum.plural': 'enums',
  'explicit.unmanaged': 'Unmanaged packages cannot explicitly reference this organization\'s namespace.',
  'export.data.category': 'Salesforce.com does not currently allow export of components referencing to Data Categories.',
  'expression.too.long': 'Expression is too long, please split this expression into multiple statements',
  'external.string.does.not.exist': 'External string does not exist: %s',
  'extract.constant': 'Extract Constant',
  'extract.variable': 'Extract Variable',
  'field.does.not.exist': 'Field does not exist: %s on %s',
  'field.does.not.support.type': '%s fields do not support type of %s',
  'field.plural': 'fields',
  'generic.interface.already.implemented': 'Generic Interface already implemented: %s',
  'global.deprecate.if.parameter.deprecated': 'Global methods must be deprecated when parameter type is deprecated: %s',
  'global.deprecate.if.return.deprecated': 'Global methods must be deprecated when return type is deprecated: %s',
  'global.deprecate.if.type.deprecated': 'Global fields must be deprecated when type is deprecated: %s',
  'identifier.too.long': 'Identifier name is too long: %s',
  'illegal.accessor.on.property': 'Cannot declare %s accessor on %s property',
  'illegal.all.call': 'Illegal all method call for argument type, %s, for collection: %s',
  'illegal.assignment': 'Illegal assignment from %s to %s',
  'illegal.comparator.for.sort': 'Incompatible Comparator argument type: %s, for collection: %s',
  'illegal.conversion': 'Illegal conversion from %s to %s',
  'illegal.decimal.literal': 'Illegal decimal',
  'illegal.double.literal': 'Illegal double',
  'illegal.forward.reference': 'Illegal forward reference: %s',
  'illegal.instance.method.reference.in.constructor': 'Cannot reference instance methods in a constructor invocation: %s',
  'illegal.instance.variable.reference.in.constructor': 'Cannot reference instance variables in a constructor invocation: %s',
  'illegal.integer.literal': 'Illegal integer',
  'illegal.java.expression': 'Java expression only allowed for trusted sources',
  'illegal.long.literal': 'Illegal long',
  'illegal.no.when.blocks': 'Switch statement requires at least one when block',
  'illegal.non.foreign.key.reference': 'A non foreign key field cannot be referenced in a path expression: %s',
  'illegal.non.when.type': 'Switching on SObject types must be a \'when type variable\' or \'when null\'',
  'illegal.string.literal': 'Illegal string literal: %s',
  'illegal.switch.expression.type': '%s is not a valid switch expression type',
  'illegal.when.type': '%s cannot be a \'when type variable\' block',
  'incompatible.cast.types': 'Incompatible types since an instance of %s is never an instance of %s',
  'incompatible.nullcoalescing.expression.types': 'Incompatible types in null coalescing operator: %s, %s',
  'incompatible.ternary.expression.types': 'Incompatible types in ternary operator: %s, %s',
  'interface.already.implemented': 'Interface already implemented: %s',
  'interface.implementation.method.deprecated': 'Cannot deprecate an interface implementation method: %s',
  'interface.implementation.method.not.visible': '%s: Overriding implementations of global or public interface methods must be global or public: %s',
  'interface.implementation.missing.method': 'Class %s must implement the method: %s',
  'interface.plural': 'interfaces',
  'invalid.abstract.method.call': 'Abstract method cannot be called directly: %s',
  'invalid.already.match.type': '%s in the \'when expression\' is already matching the switch expression type',
  'invalid.apex.identifier': 'Invalid identifier \'\'%s\'\'. Apex identifiers must start with an ASCII letter (a-z or A-Z) followed by any number of ASCII letters (a-z or A-Z), digits (0 - 9), \'\'_\'\'.',
  'invalid.apex.symbol': 'Found punctuation symbol or operator \'\'%s\'\' that isn\'\'t valid in Apex.',
  'invalid.bitwise.operator.arguments': '%s operator can only be applied to Boolean expressions or to Integer or Long expressions',
  'invalid.boolean.prefix.operand': '%s operator can only be applied to boolean expressions',
  'invalid.break': 'Break statement must be in loop',
  'invalid.cast.type': 'Operation cast is not allowed on type: %s',
  'invalid.catch.duplicate.exception': 'Exception type already caught: %s',
  'invalid.catch.exception': 'Catch block variable must be of type exception: %s',
  'invalid.character.identifier': 'Invalid character in identifier: %s',
  'invalid.class': 'Invalid class: %s',
  'invalid.comparison.types': 'Comparison arguments must be compatible types: %s, %s',
  'invalid.condition.type': 'Condition expression must be of type Boolean: %s',
  'invalid.constructor': 'No constructor defined: %s',
  'invalid.constructor.name': 'Invalid constructor name: %s',
  'invalid.constructor.return': 'Constructors must not return a value',
  'invalid.continue': 'Continue statement must be in loop',
  'invalid.control.character': 'Found control character hex 0x%s (decimal %s) that isn\'\'t valid in Apex.',
  'invalid.date': 'Invalid Date \'\'%s\'\'. If you are trying to do subtraction adding spaces around the \'\'-\'\' sign(s) will help. Apex dates must be of the form YYYY-mm-DD.%s',
  'invalid.date.operand.expression': 'Date expressions must use Integer or Long',
  'invalid.date.time': 'Invalid DateTime \'\'%s\'\'. Apex DateTimes must be of the form YYYY-mm-DDtHH:MM:SS.NNNzOFFSET.%s%s',
  'invalid.datetime.operand.expression': 'Date/time expressions must use Integer or Double or Decimal',
  'invalid.default.constructor': 'No default constructor available in super type: %s',
  'invalid.dml.type': 'DML requires SObject or SObject list type: %s',
  'invalid.duplicate.trigger.usage': 'Duplicate Trigger Usage: %s',
  'invalid.exact.equality.type': 'Exact equality operator only allowed for reference types: %s',
  'invalid.exception.constructor.already.defined': 'System exception constructor already defined: %s',
  'invalid.exception.must.end.with.exception': 'Classes extending Exception must have a name ending in \'Exception\': %s',
  'invalid.exception.must.extend.exception': 'Exception class must extend another Exception class: %s',
  'invalid.expression.assignment': 'Expression cannot be assigned',
  'invalid.expression.statement': 'Expression cannot be a statement.',
  'invalid.field.type.load': 'A value cannot be read from %s in type %s',
  'invalid.field.type.store': 'A value cannot be stored to %s in type %s',
  'invalid.final.field.assignment': 'Final members can only be assigned in their declaration, init blocks, or constructors: %s',
  'invalid.final.super.type': 'Non-virtual and non-abstract type cannot be extended: %s',
  'invalid.fully.qualified.enum': 'Enum value used in \'when expression\' should be unqualified',
  'invalid.inequality.type': 'Inequality operator not allowed for this type: %s',
  'invalid.initial.key.type': 'Invalid key type %s for %s',
  'invalid.initial.value.type': 'Invalid value type %s for %s',
  'invalid.inner.type.no.inner.types': 'Inner types are not allowed to have inner types',
  'invalid.inner.type.no.static.blocks': 'Inner types are not allowed to have static blocks',
  'invalid.instanceof.always.false': 'Operation instanceof is always false since an instance of %s is never an instance of %s',
  'invalid.instanceof.always.true': 'Operation instanceof is always true since an instance of %s is always an instance of %s',
  'invalid.instanceof.invalid.type': 'Operation instanceof is not allowed on type: %s',
  'invalid.interface': 'Invalid interface: %s',
  'invalid.java.expression': 'Java expression requires class.field or class.method',
  'invalid.java.expression.class.not.found': 'Java class not found: %s',
  'invalid.java.expression.field.not.found': 'Java field not found: %s from the type %s',
  'invalid.java.expression.method.not.found': 'Java method not found: %s from the type %s',
  'invalid.java.expression.method.not.static': 'Java method not static: %s from the type %s',
  'invalid.keyword.identifier': 'Identifier cannot be a keyword: %s',
  'invalid.list.index.type': 'List index must be of type %s: %s',
  'invalid.list.initial.expression.type': 'Initial expression is of incorrect type, expected: %s but was: %s',
  'invalid.list.initializer': 'Invalid initializer type %s found for List<%s>: expected an Integer or a List of type %s',
  'invalid.list.type': 'Expression must be a list type: %s',
  'invalid.logical.type': 'Logical operator can only be applied to %s',
  'invalid.loop.type': 'Invalid loop variable type expected %s was %s',
  'invalid.map.initializer': 'Invalid initializer type %s found for Map<%s,%s>: expected a Map with the same key and value types, or a valid SObject List',
  'invalid.map.putAll': 'Invalid putAll type %s found for %s',
  'invalid.merge.duplicate.records': 'Invalid type for duplicate records',
  'invalid.metadata.too.large': 'Class compilation requires too much metadata. Please consider splitting this class into multiple classes',
  'invalid.method.not.found': 'Method does not exist or incorrect signature: %s from the type %s',
  'invalid.method.with.parameters': '%s methods do not support parameters',
  'invalid.multiple.methods.with.modifier': 'Only one method per type can be defined with: %s',
  'invalid.name.value.pair.constructor': 'Invalid constructor syntax, name=value pairs can only be used for SObjects: %s',
  'invalid.negate.prefix.operand': 'Unary negation must use a numeric argument',
  'invalid.new.abstract': 'Abstract classes cannot be constructed: %s',
  'invalid.new.protected.method': 'New protected methods cannot be defined in non-virtual classes',
  'invalid.non.static.method.context': 'Non static method cannot be referenced from a static context: %s',
  'invalid.non.static.variable.context': 'Non static field cannot be referenced from a static context: %s from the type %s',
  'invalid.normal.constructor': 'Type requires name=value pair construction: %s',
  'invalid.number.parameters': 'Invalid number of parameters exceeds: %s',
  'invalid.numeric.arguments.expression': 'Arithmetic expressions must use numeric arguments',
  'invalid.numeric.postfix.operand': 'Unary postfix increment/decrement can only be applied to numeric expressions: %s',
  'invalid.numeric.prefix.decrement': 'Unary prefix decrement can only be applied to numeric expressions: %s',
  'invalid.numeric.prefix.increment': 'Unary prefix increment can only be applied to numeric expressions: %s',
  'invalid.parameterized.type': 'Invalid parameterized type: %s',
  'invalid.parameterized.type.count': 'Invalid type argument count for %s: expected %s but found %s',
  'invalid.public.remote.action': 'Remote Action method must be global in a global component',
  'invalid.read.only': 'Only WebService, RemoteAction or Schedulable.execute(SchedulableContext) methods can be marked ReadOnly',
  'invalid.reserved.name.identifier': 'Identifier name is reserved: %s',
  'invalid.reserved.type.identifier': 'Identifier type is reserved: %s',
  'invalid.return.from.non.method': 'Return must be called from a method',
  'invalid.return.non.void': 'Missing return statement required return type: %s',
  'invalid.return.void': 'Void method must not return a value',
  'invalid.row.lock': 'Cannot lock rows for an SObject type that can not be updated: %s',
  'invalid.runas': 'runAs requires a single argument of type \'User\' or \'Version\'',
  'invalid.set.initial.expression.type': 'Initial expression is of incorrect type, expected: %s but was: %s',
  'invalid.set.initializer': 'Invalid initializer type %s found for Set<%s>: expected a List or a Set of type: %s',
  'invalid.shift.operator.arguments': '%s operation can only be applied to Integer or Long types',
  'invalid.sobject.list': 'Only concrete SObject lists can be created',
  'invalid.sobject.map': 'Only concrete SObject maps can be created',
  'invalid.static.method.context': 'Static method cannot be referenced from a non static context: %s',
  'invalid.static.variable.context': 'Static field cannot be referenced from a non static context: %s from the type %s',
  'invalid.string.literal.illegal.character.sequence': 'Invalid string literal \'\'%s\'\'. Illegal character sequence \'\\\'%s\'\' in string literal.',
  'invalid.string.literal.illegal.last.character': 'Invalid string literal \'\'%s\'\'.  \'\\\' is not allowed as the last character in a string literal.',
  'invalid.string.literal.illegal.linebreaks': 'Line breaks are not allowed in string literals',
  'invalid.string.literal.illegal.unicode': 'Invalid string literal \'\'%s\'\'. Illegal unicode sequence. \'\\u\'%s\'\' in string literal.',
  'invalid.string.literal.illegal.unicode.sequence': 'Invalid string literal \'\'%s\'\'. Illegal unicode sequence. Less than four hex digits \'\\\'%s\'\' in string literal.',
  'invalid.super.call': 'Call to \'super()\' must be the first statement in a constructor method',
  'invalid.super.static.context': 'Super cannot be referenced in a static context',
  'invalid.super.type': 'Invalid super type: %s',
  'invalid.switch.enum': 'Field must be an enum reference',
  'invalid.this.call': 'Call to \'this()\' must be the first statement in a constructor method',
  'invalid.this.static.context': 'This cannot be referenced in a static context',
  'invalid.throw.exception': 'Throw expression must be of type exception: %s',
  'invalid.time': 'Invalid Time \'\'%s\'\'. Apex times must be of the form HH:MM:SS.NNNzOFFSET.%s',
  'invalid.time.operand.expression': 'Time expressions must use Integer or Long',
  'invalid.trigger.before.undelete': 'Trigger Usage Before Undelete is not supported',
  'invalid.trigger.object': 'Trigger type isn\'\'t an SObject: %s',
  'invalid.trigger.platform.event': 'Platform Event SObjects only supports after insert: %s',
  'invalid.trigger.return': 'Trigger bodies must not return a value',
  'invalid.try.needs.catch.or.finally': 'Try block must have at least one catch block or a finally block',
  'invalid.type.bitwise.negate': 'Invalid type for bitwise negate: %s',
  'invalid.unit': 'Invalid unit',
  'invalid.unresolved.annotation': 'Annotation does not exist: %s',
  'invalid.unresolved.type': 'Invalid type: %s',
  'invalid.void.arithmetic.expression': 'Arithmetic expressions are not allowed on void types',
  'invalid.void.parameter': 'Parameters cannot be of type void',
  'invalid.void.property': 'Properties cannot be of type void',
  'invalid.void.variable': 'Variables cannot be of type void',
  'invalid.when.expression.type': '%s value in \'when expression\' cannot be implicitly converted to the %s type in switch expression',
  'invalid.when.field.constant': 'Field must be a static final constant: %s',
  'invalid.when.field.literal': 'Field must be a non null literal: %s',
  'invalid.when.literal.expression': '\'when expression\' must be a literal, a constant literal field or enum value',
  'invocable.method.can.only.have.deprecated': 'The only annotation that can be used with InvocableMethod is Deprecated',
  'invocable.method.non.list.parameter': 'Unsupported parameter type %s. Valid invocable parameters must be List types like List<T> where T is a supported type',
  'invocable.method.single.param': 'Only one parameter is supported on methods with @Invocable annotation',
  'local.plural': 'locals',
  'loop.must.iterate.over.collection': 'Loop must iterate over collection: %s',
  'loop.variable.mismatch.concrete.sobject.type': 'Loop variable must be a generic SObject or List or a concrete SObject or List of: %s',
  'loop.variable.mismatch.sobject.type': 'Loop variable must be a generic SObject or List or a concrete SObject or List.',
  'loop.with.query.requires.statement': 'Loop with query must provide a statement',
  'max.enums.exceeded': 'Maximum number of enum items exceeded: %s',
  'maximum.type.depth.exceeded': 'Maximum type depth exceeded: 10',
  'merge.not.supported': 'Specified type %s cannot be merged',
  'merge.requires.concrete.type': 'Merge requires a concrete SObject type: %s',
  'method.already.exists': 'Method already defined: %s %s from the type %s',
  'method.does.not.override': '@Override specified for non-overriding method: %s',
  'method.does.not.support.parameter.type': '%s methods do not support parameter type of %s',
  'method.does.not.support.return.type': '%s methods do not support return type of %s',
  'method.invalid.add.error.not.sobject.field': 'addError must be invoked on an expression that is an exact SObject field reference',
  'method.invalid.add.error.not.sobject.scalar.field': 'addError must be invoked on an SObject scalar field',
  'method.invalid.on.sobject.field': 'Method %s must be invoked on an expression that is an exact SObject field reference',
  'method.invalid.sobject.list': 'Operation only applies to SObject list types: %s',
  'method.invalid.sobject.map': 'Operation only applies to SObject value map types: %s',
  'method.must.have.body': 'Method must have a body',
  'method.not.visible': 'Method is not visible: %s',
  'method.only.list.custom.settings': 'Method only supports list type Custom Settings: %s',
  'method.parameter.type.not.visible': 'Method parameter type %s is not visible for: %s',
  'method.plural': 'methods',
  'method.return.type.not.visible': 'Method return type %s is not visible for: %s',
  'method.types.clash': 'Method return types clash: %s vs %s from the type %s',
  'methods.must.override': 'Method must use the override keyword: %s',
  'mismatched.syntax': 'Expecting \'\'%s\'\' but was: %s',
  'missing.closing.mark': 'Missing closing mark %s on multi-line comment.',
  'missing.closing.quote': 'Missing closing quote character %s on string.',
  'missing.syntax': 'Missing \'\'%s\'\' at %s',
  'modifier.cannot.be': '%s %s cannot be %s',
  'modifier.illegal.defining.type': '%s is not allowed in %s',
  'modifier.illegal.defining.type.for': 'Defining type for %s',
  'modifier.is.by.default': '%s are by default %s',
  'modifier.is.internal': '%s annotation can only be used by Salesforce code',
  'modifier.is.not.allowed': '%s is not allowed on %s',
  'modifier.min.version': '%s %s must be in version %s or higher',
  'modifier.not.in.top.level.type': '%s can only be used on %s of a top level type',
  'modifier.not.on.top.level.type': '%s can only be used on a top level type',
  'modifier.require.at.least': '%s %s require at least one of the following %s',
  'modifier.requires': '%s %s must be declared as %s',
  'namespace.guard.one.private.constructor': '@NamespaceGuard classes must have at least one private constructor',
  'namespace.guard.private.constructor': '@NamespaceGuard classes cannot have a public constructor',
  'namespace.guard.static.only': '@NamespaceGuard classes can only have static methods',
  'new.inner.type.name.conflict.interface': 'New name for inner type cannot be the same as the interface being implemented by the outer type',
  'new.inner.type.name.conflict.outer': 'New name for inner type cannot be the same as the name of the containing outer type',
  'new.inner.type.name.conflict.super.type': 'New name for inner type cannot be the same as the type being extended by the outer type',
  'new.name.cannot.end.exception': 'New name for a type that is not an Exception cannot end in \'Exception\'',
  'new.name.conflict.inner': 'New name cannot be the same as the name of an inner type',
  'new.name.conflict.local': 'New identifier name cannot be the same as the name of an existing local variable or parameter',
  'new.name.invalid.exception': 'New name for an exception type must end in \'Exception\'',
  'new.name.member.conflict': 'New name cannot be the same as the name of an existing member in: %s',
  'no.super.type': 'No super type defined: %s',
  'no.type.arguments.for.parameterized.type': 'No type arguments provided for a parameterized type: %s',
  'non.static.aura.method.cannot.have.params': 'Non static AuraEnabled methods may not have parameters',
  'non.static.aura.method.must.begin.with.get': 'Non static AuraEnabled methods must be named with a prefix \'get\'',
  'non.virtual.methods.cannot.override': 'Non-virtual, non-abstract methods cannot be overridden: %s',
  'not.unique.when.value.or.type': '%s occurs as more than one when branch for this switch statement',
  'not.visible.max.version': '%s was removed after version %s: %s',
  'not.visible.min.version': '%s not added until version %s: %s',
  'package.version.forbidden': 'Unmanaged packages cannot reference Package.Version.',
  'package.version.invalid': 'Package.Version.%s is not a valid version.',
  'package.version.requires.namespace': 'Package.Version Requires a namespaced org',
  'page.does.not.exist': 'Page does not exist: %s',
  'parallel.test.class.cannot.have.see.all.data': 'Test class annotated with @isTest(IsParallel=true) cannot also be annotated with @isTest(SeeAllData=true)',
  'parallel.test.method.cannot.have.see.all.data': 'Test class annotated with @isTest(IsParallel=true) cannot have any methods annotated with @isTest(SeeAllData=true)',
  'parameter.plural': 'parameters',
  'parameterized.type.too.deep': 'Exceeded max parameterized type depth: %s, depth: %s',
  'property.plural': 'properties',
  'query.too.large': 'Query is too large',
  'real.loc': 'startIndex: %s endIndex: %s line: %s column: %s',
  'rest.resource.url.empty': 'Rest Resource url cannot be empty',
  'rest.resource.url.illegal.wildcard.predecessor': 'Rest Resource url wildcard, \'*\', must be preceded by a forward slash, \'/\'',
  'rest.resource.url.illegal.wildcard.successor': 'Rest Resource url wildcard, \'*\', must be followed by a forward slash, \'/\', or be the last character',
  'rest.resource.url.invalid.url': 'Rest Resource url was invalid',
  'rest.resource.url.no.slash': 'Rest Resource url must begin with a forward slash, \'/\'',
  'rest.resource.url.too.long': 'Rest Resource url cannot be longer than 255 characters',
  'safe.navigation.invalid.between.sobject.field.and.add.error': 'Safe navigation operator is not allowed between SObject field and addError',
  'safe.navigation.invalid.between.sobject.field.and.method': 'Safe navigation operator is not allowed between SObject field and %s',
  'script.too.large': 'Script too large: %s...',
  'sfdc.only.cannot.have.global.fields': 'SfdcOnly defined types cannot have global fields',
  'sobject.not.constructable': 'SObject is not constructable: %s',
  'synthetic.loc': 'no location',
  'test.class.must.not.be.exception': 'Only top-level non-exception class types can be marked as tests',
  'test.method.cannot.have.params': 'Test methods must have no arguments',
  'test.setup.cannot.have.defining.type.see.all.data': 'Test class cannot be annotated with @isTest(SeeAllData=true)',
  'test.setup.cannot.have.params': 'Test methods must have no arguments',
  'test.setup.cannot.have.see.all.data': 'Test class containing a test setup method cannot have any methods annotated with @isTest(SeeAllData=true)',
  'test.setup.must.return.void': 'Test setup method must return void',
  'time.string': '\\ HH must be 00-23, MM must be 00-59, and SS must be 00-59. .NNN is optional and is the milliseconds within the second 000-999. OFFSET is the timezone offset and has an optional + or - followed by HHMM or HH:MM.',
  'toplevel.must.be.public.or.global': 'Top-level type must have public or global visibility',
  'trigger.not.supported': 'SObject type does not allow triggers: %s',
  'trigger.plural': 'triggers',
  'type.arguments.for.non.parameterized.type': 'Type arguments provided for a non-parameterized type: %s',
  'type.must.be.top.level': 'Only top-level classes can implement %s',
  'type.not.constructable': 'Type cannot be constructed: %s',
  'type.not.visible': 'Type is not visible: %s',
  'type.parameters.not.supported': 'Type parameters are not supported',
  'unexpected.eof': 'Unexpected <EOF>',
  'unexpected.error': 'Unexpected error: %s',
  'unexpected.symbol.expected.found': 'Unexpected symbol \'\'%s\'\', was expecting \'\'%s\'\'.',
  'unexpected.symbol.not.set': 'Unexpected symbol \'\'%s\'\', was NOT expecting anything in the set [%s].',
  'unexpected.symbol.range': 'Unexpected symbol \'\'%s\'\', was expected something in the range \'\'%s\'\'..\'\'%s\'\'.',
  'unexpected.symbol.set': 'Unexpected symbol \'\'%s\'\', was expecting something in the set [%s].',
  'unexpected.syntax.error': 'Unexpected syntax error: %s.',
  'unexpected.token': 'Unexpected token %s.',
  'unknown.constructor': 'Constructor not defined: [%s].<Constructor>%s',
  'unmatched.syntax': 'Extra \'\'%s\'\', at %s.',
  'unreachable.statement': 'Unreachable statement',
  'unrecognized.symbol.not.valid.apex.identifier': 'Unrecognized symbol \'\'%s\'\', which is not a valid Apex identifier.',
  'upsert.invalid.field': 'Invalid field for upsert, must be an External Id custom or standard indexed field: %s',
  'upsert.requires.concrete.type': 'Upsert with a field specification requires a concrete SObject type',
  'usereplica.preferred.must.be.static': 'ReadOnly methods with useReplica=preferred parameter must be declared as static',
  'variable.does.not.exist': 'Variable does not exist: %s',
  'variable.not.visible': 'Variable is not visible: %s',
  'webservice.deprecate.if.type.deprecated': 'WebService fields must be deprecated when type is deprecated: %s',
  'when.clause.literal.or.valid.constant': 'When clause must be a literal or a non null constant literal: %s',
  'when.else.not.last': '\'when else\' must be the last when block'
} as const;
