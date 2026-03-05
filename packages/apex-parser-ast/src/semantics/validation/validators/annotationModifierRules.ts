/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Annotation modifier rules derived from apex-jorje AnnotationTypeInfos and AnnotationRules.
 * Used for MODIFIER_ILLEGAL_DEFINING_TYPE, MODIFIER_ILLEGAL_DEFINING_TYPE_FOR, MODIFIER_MIN_VERSION.
 */

/** Unit type for defining type (from jorje UnitType) */
export type UnitType = 'CLASS' | 'INTERFACE' | 'ENUM' | 'TRIGGER' | 'ANONYMOUS';

/** Element kind for min version (method, class, property, etc.) */
export type AnnotationElementKind =
  | 'METHOD'
  | 'CLASS'
  | 'INTERFACE'
  | 'ENUM'
  | 'PROPERTY'
  | 'FIELD'
  | 'CONSTRUCTOR';

/** Required modifier on defining type: isTest, RestResource, global, namespaceAccessible */
export type RequiredDefiningModifier =
  | 'isTest'
  | 'RestResource'
  | 'global'
  | 'namespaceAccessibleOrGlobal';

/**
 * Annotations that require a specific unit type (defining type).
 * If the defining type is not in the allowed set, report MODIFIER_ILLEGAL_DEFINING_TYPE.
 * Key: annotation name (lowercase), Value: allowed unit types
 */
export const ANNOTATION_ALLOWED_UNIT_TYPES: ReadonlyMap<
  string,
  ReadonlySet<UnitType>
> = new Map([
  // @InvocableMethod: only on methods in CLASS (not trigger, anonymous)
  ['invocablemethod', new Set(['CLASS'])],
  // @InvocableVariable: only on fields in CLASS
  ['invocablevariable', new Set(['CLASS'])],
  // @TestSetup: only on methods in CLASS (requires @isTest on class)
  ['testsetup', new Set(['CLASS'])],
  // @TestMethod/@IsTest on method: only in CLASS
  ['istest', new Set(['CLASS'])],
  ['testmethod', new Set(['CLASS'])],
  // @RestResource: CLASS, INTERFACE, ENUM, METHOD
  ['restresource', new Set(['CLASS', 'INTERFACE', 'ENUM'])],
  // @HttpGet, @HttpPost, etc.: methods only, defining type must have @RestResource
  ['httpdelete', new Set(['CLASS'])],
  ['httpget', new Set(['CLASS'])],
  ['httppost', new Set(['CLASS'])],
  ['httpput', new Set(['CLASS'])],
  ['httppatch', new Set(['CLASS'])],
  // @Future: METHOD only, class must be top-level
  ['future', new Set(['CLASS'])],
  // @RemoteAction: METHOD, PROPERTY, FIELD, CLASS - but defining type must be global
  ['remoteaction', new Set(['CLASS', 'INTERFACE'])],
  // @WebService: METHOD, PROPERTY - defining type must be global
  ['webservice', new Set(['CLASS'])],
  // @NamespaceAccessible: CLASS, INTERFACE, ENUM, METHOD, FIELD, PROPERTY, CONSTRUCTOR
  ['namespaceaccessible', new Set(['CLASS', 'INTERFACE', 'ENUM'])],
]);

/**
 * Annotations that require the defining type to have specific modifiers.
 * Key: annotation name (lowercase), Value: required modifier(s) - any one suffices for "any" types
 */
export const ANNOTATION_REQUIRED_DEFINING_MODIFIERS: ReadonlyMap<
  string,
  ReadonlyArray<RequiredDefiningModifier>
> = new Map([
  ['testmethod', ['isTest']],
  ['istest', ['isTest']], // when on method, class must have @isTest
  ['testsetup', ['isTest']],
  ['namespaceaccessible', ['namespaceAccessibleOrGlobal']],
  ['remoteaction', ['global']],
  ['webservice', ['global']],
  ['httpdelete', ['RestResource']],
  ['httpget', ['RestResource']],
  ['httppost', ['RestResource']],
  ['httpput', ['RestResource']],
  ['httppatch', ['RestResource']],
]);

/**
 * Annotations with minimum API version requirements.
 * Key: annotation name (lowercase), Value: map of element kind -> { minMajor, displayVersion }
 */
export const ANNOTATION_MIN_VERSIONS: ReadonlyMap<
  string,
  ReadonlyMap<
    AnnotationElementKind,
    { minMajor: number; displayVersion: string }
  >
> = new Map([
  [
    'namespaceaccessible',
    new Map([
      ['CLASS', { minMajor: 21, displayVersion: '21.4' }],
      ['PROPERTY', { minMajor: 22, displayVersion: '22.8' }],
      ['METHOD', { minMajor: 21, displayVersion: '21.4' }],
      ['FIELD', { minMajor: 21, displayVersion: '21.4' }],
      ['CONSTRUCTOR', { minMajor: 21, displayVersion: '21.4' }],
      ['INTERFACE', { minMajor: 21, displayVersion: '21.4' }],
      ['ENUM', { minMajor: 21, displayVersion: '21.4' }],
    ]),
  ],
  [
    'remoteaction',
    new Map([['METHOD', { minMajor: 17, displayVersion: '17.0' }]]),
  ],
  [
    'restresource',
    new Map([['CLASS', { minMajor: 17, displayVersion: '17.2' }]]),
  ],
  [
    'testsetup',
    new Map([['METHOD', { minMajor: 17, displayVersion: '17.6' }]]),
  ],
  [
    'invocablemethod',
    new Map([['METHOD', { minMajor: 19, displayVersion: '19.4' }]]),
  ],
  [
    'invocablevariable',
    new Map([['FIELD', { minMajor: 19, displayVersion: '19.4' }]]),
  ],
  ['httpget', new Map([['METHOD', { minMajor: 17, displayVersion: '17.6' }]])],
  [
    'httpdelete',
    new Map([['METHOD', { minMajor: 17, displayVersion: '17.6' }]]),
  ],
  ['httppost', new Map([['METHOD', { minMajor: 17, displayVersion: '17.6' }]])],
  ['httpput', new Map([['METHOD', { minMajor: 17, displayVersion: '17.6' }]])],
  [
    'httppatch',
    new Map([['METHOD', { minMajor: 17, displayVersion: '17.6' }]]),
  ],
]);
