/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ReferenceTypeValue } from './NamespaceUtils';

const IMPLICIT_NAMESPACE_ORDER_DEFAULT = ['System', 'Schema'] as const;
const REGISTRY_NAMESPACE_PREFERENCE_DEFAULT = ['System', 'Database'] as const;
const FOUNDATION_NAMESPACE_ORDER_DEFAULT = [
  'System',
  'Database',
  'Schema',
] as const;

const normalize = (value: string): string => value.trim().toLowerCase();

export const getImplicitNamespaceOrder = (
  _referenceType?: ReferenceTypeValue,
): readonly string[] => IMPLICIT_NAMESPACE_ORDER_DEFAULT;

export const getRegistryNamespacePreference = (): readonly string[] =>
  REGISTRY_NAMESPACE_PREFERENCE_DEFAULT;

export const getFoundationNamespaceOrder = (): readonly string[] =>
  FOUNDATION_NAMESPACE_ORDER_DEFAULT;

export const getImplicitQualifiedCandidates = (
  typeName: string,
  currentNamespace?: string | null,
): string[] => {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const push = (namespace: string | null | undefined): void => {
    if (!namespace) return;
    const fqn = `${namespace}.${typeName}`;
    const key = normalize(fqn);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(fqn);
  };

  push(currentNamespace);
  for (const namespace of getImplicitNamespaceOrder()) {
    push(namespace);
  }

  return candidates;
};

export const isPrimaryImplicitNamespace = (namespace: string): boolean =>
  getImplicitNamespaceOrder().some(
    (ns) => normalize(ns) === normalize(namespace),
  );
