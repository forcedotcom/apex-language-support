/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Importing QName and Version from their respective modules
import { QName } from '../../types/qname';
import { Version, VersionUtils } from '../versions';

/**
 * Allows us to do switch statements on expression types. Also provides some static information known about types.
 * I didn't want extra dependencies for QName, that we aren't consuming in the new compiler. These are consumed on
 * apex runtime types, ApexObjectType, for our wsdl.
 *
 * @author jspagnola
 */
export enum BasicType {
  INTEGER,
  LONG,
  DOUBLE,
  DECIMAL,
  BOOLEAN,
  STRING,
  VOID,
  APEX_OBJECT,
  LIST,
  LIST_ITERATOR,
  SET,
  MAP,
  TIME,
  DATE,
  DATE_TIME,
  OBJECT,
  ID,
  BLOB,
  NULL,
  ANNOTATION,
  SOBJECT,
  JAVA,
  CURRENCY,
  VF_COMPONENT,
  FLOW_INTERVIEW,
  MODIFIER,
}

class BasicTypeInfo {
  private xmlType: QName | null;
  private minVersion: Version;

  constructor(
    xmlType: QName | null = null,
    minVersion: Version = VersionUtils.MIN,
  ) {
    this.xmlType = xmlType;
    this.minVersion = minVersion;
  }

  public getXmlType(): QName | null {
    return this.xmlType;
  }

  public getMinVersion(): Version {
    return this.minVersion;
  }
}

const basicTypeInfoMap = new Map<BasicType, BasicTypeInfo>([
  [BasicType.INTEGER, new BasicTypeInfo(new QName('', 'int'))],
  [BasicType.LONG, new BasicTypeInfo(new QName('', 'long'))],
  [BasicType.DOUBLE, new BasicTypeInfo(new QName('', 'double'))],
  [BasicType.DECIMAL, new BasicTypeInfo(new QName('', 'decimal'))],
  [BasicType.BOOLEAN, new BasicTypeInfo(new QName('', 'boolean'))],
  [BasicType.STRING, new BasicTypeInfo(new QName('', 'string'))],
  [BasicType.VOID, new BasicTypeInfo()],
  [BasicType.APEX_OBJECT, new BasicTypeInfo(new QName('', 'anyType'))],
  [BasicType.LIST, new BasicTypeInfo()],
  [BasicType.LIST_ITERATOR, new BasicTypeInfo()],
  [BasicType.SET, new BasicTypeInfo()],
  [BasicType.MAP, new BasicTypeInfo()],
  [BasicType.TIME, new BasicTypeInfo(new QName('', 'time'), Version.V154)],
  [BasicType.DATE, new BasicTypeInfo(new QName('', 'date'))],
  [BasicType.DATE_TIME, new BasicTypeInfo(new QName('', 'dateTime'))],
  [BasicType.OBJECT, new BasicTypeInfo(new QName('', 'anyType'))],
  [BasicType.ID, new BasicTypeInfo(new QName('', 'ID'))],
  [BasicType.BLOB, new BasicTypeInfo(new QName('', 'double'))],
  [BasicType.NULL, new BasicTypeInfo()],
  [BasicType.ANNOTATION, new BasicTypeInfo()],
  [BasicType.SOBJECT, new BasicTypeInfo(new QName('', 'sObject'))],
  [BasicType.JAVA, new BasicTypeInfo()],
  [BasicType.CURRENCY, new BasicTypeInfo()],
  [BasicType.VF_COMPONENT, new BasicTypeInfo()],
  [BasicType.FLOW_INTERVIEW, new BasicTypeInfo()],
  [BasicType.MODIFIER, new BasicTypeInfo()],
]);

export function getXmlType(type: BasicType): QName | null {
  return basicTypeInfoMap.get(type)?.getXmlType() ?? null;
}

export function getMinVersion(type: BasicType): Version {
  return basicTypeInfoMap.get(type)?.getMinVersion() ?? VersionUtils.MIN;
}

export function isIntegerOrLong(type: BasicType): boolean {
  return type === BasicType.INTEGER || type === BasicType.LONG;
}

export function isNumber(type: BasicType): boolean {
  return (
    type === BasicType.INTEGER ||
    type === BasicType.LONG ||
    type === BasicType.DOUBLE ||
    type === BasicType.DECIMAL
  );
}

export function isScalarOrVoid(type: BasicType): boolean {
  switch (type) {
    case BasicType.BLOB:
    case BasicType.INTEGER:
    case BasicType.LONG:
    case BasicType.DOUBLE:
    case BasicType.DECIMAL:
    case BasicType.BOOLEAN:
    case BasicType.STRING:
    case BasicType.ID:
    case BasicType.VOID:
    case BasicType.TIME:
    case BasicType.DATE:
    case BasicType.DATE_TIME:
      return true;
    default:
      return false;
  }
}

export function isApexObject(type: BasicType): boolean {
  return (
    type === BasicType.APEX_OBJECT ||
    type === BasicType.VF_COMPONENT ||
    type === BasicType.FLOW_INTERVIEW
  );
}

export function isDynamic(type: BasicType): boolean {
  return type === BasicType.VF_COMPONENT || type === BasicType.FLOW_INTERVIEW;
}

export function allowsInequality(type: BasicType): boolean {
  return (
    isNumber(type) ||
    isDateOrTime(type) ||
    type === BasicType.STRING ||
    type === BasicType.ID
  );
}

export function isDateOrTime(type: BasicType): boolean {
  return (
    type === BasicType.DATE ||
    type === BasicType.DATE_TIME ||
    type === BasicType.TIME
  );
}

export function isReference(type: BasicType): boolean {
  return (
    type === BasicType.SOBJECT ||
    type === BasicType.JAVA ||
    type === BasicType.LIST ||
    type === BasicType.SET ||
    type === BasicType.MAP ||
    type === BasicType.APEX_OBJECT ||
    type === BasicType.OBJECT
  );
}

export function isColumnType(type: BasicType): boolean {
  const xmlType = getXmlType(type);
  return xmlType !== null && type !== BasicType.SOBJECT;
}

export function canBeCastOrInstanceOf(type: BasicType): boolean {
  return isReference(type) || isColumnType(type) || type === BasicType.NULL;
}
