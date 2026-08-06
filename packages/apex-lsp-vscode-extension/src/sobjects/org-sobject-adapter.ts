/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  SObjectDescribe,
  SObjectDescribeField,
} from '@salesforce/apex-lsp-shared';
import { MAX_SOBJECT_WIRE_BYTES } from '@salesforce/apex-lsp-shared';
export { MAX_SOBJECT_WIRE_BYTES } from '@salesforce/apex-lsp-shared';
import {
  type OrgArtifactFileSystem,
  type SObjectDocumentField,
} from '../services/org-artifact-fs';

export type SObjectAdaptationResult =
  | { readonly status: 'ok'; readonly describe: SObjectDescribe }
  | {
      readonly status: 'too-large';
      readonly name: string;
      readonly sizeBytes: number;
      readonly maxBytes: number;
    }
  | {
      readonly status: 'invalid';
      readonly message: string;
    }
  | {
      readonly status: 'stale';
      readonly name: string;
    };

interface RawDescribeField {
  readonly name: string;
  readonly label?: string;
  readonly type: string;
  readonly referenceTo?: readonly string[];
  readonly relationshipName?: string | null;
  readonly nillable?: boolean;
  readonly createable?: boolean;
  readonly updateable?: boolean;
  readonly calculated?: boolean;
  readonly length?: number;
  readonly precision?: number;
  readonly scale?: number;
}

interface RawDescribe {
  readonly name: string;
  readonly label?: string;
  readonly labelPlural?: string;
  readonly custom: boolean;
  readonly queryable?: boolean;
  readonly createable?: boolean;
  readonly updateable?: boolean;
  readonly deletable?: boolean;
  readonly fields: readonly RawDescribeField[];
}

/**
 * Adapts the current services describe result without merging workspace data.
 * Reconciliation remains the responsibility of the future sf-org-data path.
 */
export class OrgSObjectAdapter {
  constructor(private readonly fileSystem: OrgArtifactFileSystem) {}

  adapt(
    input: unknown,
    generation = this.fileSystem.generation,
  ): SObjectAdaptationResult {
    const decoded = decodeDescribe(input);
    if (!decoded.ok) {
      return { status: 'invalid', message: decoded.message };
    }
    const raw = decoded.value;
    const fields = [...raw.fields].sort(compareByName);
    const staged = this.fileSystem.stageSObject(
      {
        name: raw.name,
        label: raw.label,
        labelPlural: raw.labelPlural,
        custom: raw.custom,
        fields: fields.map(toDocumentField),
      },
      generation,
    );
    const adaptedFields: SObjectDescribeField[] = fields.map((field) => ({
      name: field.name,
      label: field.label,
      type: field.type,
      referenceTo: field.referenceTo,
      relationshipName: field.relationshipName ?? undefined,
      nillable: field.nillable,
      createable: field.createable,
      updateable: field.updateable,
      calculated: field.calculated,
      length: field.length,
      precision: field.precision,
      scale: field.scale,
      definitionTarget: requireFieldTarget(staged.fieldTargets, field.name),
    }));
    const describe: SObjectDescribe = {
      name: raw.name,
      label: raw.label,
      labelPlural: raw.labelPlural,
      custom: raw.custom,
      queryable: raw.queryable,
      createable: raw.createable,
      updateable: raw.updateable,
      deletable: raw.deletable,
      fields: adaptedFields,
      definitionTarget: staged.objectTarget,
    };
    const sizeBytes = utf8Size(JSON.stringify(describe));
    if (sizeBytes > MAX_SOBJECT_WIRE_BYTES) {
      return {
        status: 'too-large',
        name: raw.name,
        sizeBytes,
        maxBytes: MAX_SOBJECT_WIRE_BYTES,
      };
    }
    if (!staged.commit()) {
      return { status: 'stale', name: raw.name };
    }
    return { status: 'ok', describe };
  }
}

function decodeDescribe(input: unknown):
  | { readonly ok: true; readonly value: RawDescribe }
  | {
      readonly ok: false;
      readonly message: string;
    } {
  if (!isRecord(input)) {
    return { ok: false, message: 'Describe result must be an object' };
  }
  if (!isNonEmptyString(input.name)) {
    return { ok: false, message: 'Describe result requires a name' };
  }
  if (typeof input.custom !== 'boolean') {
    return { ok: false, message: 'Describe result requires custom boolean' };
  }
  if (!Array.isArray(input.fields)) {
    return { ok: false, message: 'Describe result requires fields array' };
  }
  const fields: RawDescribeField[] = [];
  for (const candidate of input.fields) {
    if (
      !isRecord(candidate) ||
      !isNonEmptyString(candidate.name) ||
      !isNonEmptyString(candidate.type)
    ) {
      return {
        ok: false,
        message: 'Every describe field requires name and type',
      };
    }
    fields.push(candidate as unknown as RawDescribeField);
  }
  return {
    ok: true,
    value: input as unknown as RawDescribe,
  };
}

function requireFieldTarget(
  targets: ReadonlyMap<string, SObjectDescribeField['definitionTarget']>,
  name: string,
): SObjectDescribeField['definitionTarget'] {
  const target = targets.get(name.toLowerCase());
  if (!target) {
    throw new Error(`Missing staged definition target for ${name}`);
  }
  return target;
}

function toDocumentField(field: RawDescribeField): SObjectDocumentField {
  return {
    name: field.name,
    label: field.label,
    type: field.type,
    relationshipName: field.relationshipName ?? undefined,
    referenceTo: field.referenceTo,
  };
}

function utf8Size(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function compareByName(
  left: { readonly name: string },
  right: { readonly name: string },
): number {
  return (
    left.name.localeCompare(right.name, 'en', {
      sensitivity: 'base',
    }) || left.name.localeCompare(right.name, 'en')
  );
}
