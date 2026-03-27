/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { DetailLevel } from './DocumentStateCache';
import { getLayerOrderIndex } from './PrerequisiteHelpers';

export interface PrerequisiteRequestSpec {
  readonly fileUri: string;
  readonly documentVersion: number;
  readonly targetDetailLevel: DetailLevel | null;
  readonly needsCrossFileResolution: boolean;
}

export interface InFlightPrerequisiteEntry extends PrerequisiteRequestSpec {
  readonly key: string;
  readonly createdAt: number;
  targetDetailLevel: DetailLevel | null;
  needsCrossFileResolution: boolean;
  revision: number;
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
}

export interface AcquireOrJoinResult {
  readonly key: string;
  readonly joined: boolean;
  readonly upgraded: boolean;
  readonly promise: Promise<void>;
  readonly entry: InFlightPrerequisiteEntry;
}

const getKey = (fileUri: string, documentVersion: number): string =>
  `${fileUri}::${documentVersion}`;

export class InFlightPrerequisiteRegistry {
  private readonly entries = new Map<string, InFlightPrerequisiteEntry>();
  private readonly completed = new Map<
    string,
    {
      targetDetailLevel: DetailLevel | null;
      needsCrossFileResolution: boolean;
    }
  >();

  public isSatisfied(spec: PrerequisiteRequestSpec): boolean {
    const key = getKey(spec.fileUri, spec.documentVersion);
    const completed = this.completed.get(key);
    if (!completed) {
      return false;
    }

    const detailSatisfied =
      !spec.targetDetailLevel ||
      (!!completed.targetDetailLevel &&
        getLayerOrderIndex(completed.targetDetailLevel) >=
          getLayerOrderIndex(spec.targetDetailLevel));
    const crossFileSatisfied =
      !spec.needsCrossFileResolution || completed.needsCrossFileResolution;
    return detailSatisfied && crossFileSatisfied;
  }

  public acquireOrJoin(spec: PrerequisiteRequestSpec): AcquireOrJoinResult {
    const key = getKey(spec.fileUri, spec.documentVersion);
    const existing = this.entries.get(key);
    if (existing) {
      let upgraded = false;
      if (
        spec.targetDetailLevel &&
        (!existing.targetDetailLevel ||
          getLayerOrderIndex(spec.targetDetailLevel) >
            getLayerOrderIndex(existing.targetDetailLevel))
      ) {
        existing.targetDetailLevel = spec.targetDetailLevel;
        upgraded = true;
      }

      if (spec.needsCrossFileResolution && !existing.needsCrossFileResolution) {
        existing.needsCrossFileResolution = true;
        upgraded = true;
      }

      if (upgraded) {
        existing.revision += 1;
      }

      return {
        key,
        joined: true,
        upgraded,
        promise: existing.promise,
        entry: existing,
      };
    }

    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const entry: InFlightPrerequisiteEntry = {
      key,
      fileUri: spec.fileUri,
      documentVersion: spec.documentVersion,
      targetDetailLevel: spec.targetDetailLevel,
      needsCrossFileResolution: spec.needsCrossFileResolution,
      createdAt: Date.now(),
      revision: 0,
      promise,
      resolve,
      reject,
    };

    this.entries.set(key, entry);

    return { key, joined: false, upgraded: false, promise, entry };
  }

  public get(key: string): InFlightPrerequisiteEntry | undefined {
    return this.entries.get(key);
  }

  public complete(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) {
      return;
    }
    this.completed.set(key, {
      targetDetailLevel: entry.targetDetailLevel,
      needsCrossFileResolution: entry.needsCrossFileResolution,
    });
    this.entries.delete(key);
    entry.resolve();
  }

  public fail(key: string, error: unknown): void {
    const entry = this.entries.get(key);
    if (!entry) {
      return;
    }
    this.entries.delete(key);
    entry.reject(error);
  }

  public evictStaleForUri(fileUri: string, currentVersion: number): void {
    for (const [key, entry] of this.entries.entries()) {
      if (
        entry.fileUri === fileUri &&
        entry.documentVersion !== currentVersion
      ) {
        this.entries.delete(key);
        entry.resolve();
      }
    }

    const prefix = `${fileUri}::`;
    for (const key of this.completed.keys()) {
      if (!key.startsWith(prefix)) {
        continue;
      }
      const version = Number(key.slice(prefix.length));
      if (Number.isFinite(version) && version !== currentVersion) {
        this.completed.delete(key);
      }
    }
  }
}

let inFlightRegistry: InFlightPrerequisiteRegistry | null = null;

export const getInFlightPrerequisiteRegistry =
  (): InFlightPrerequisiteRegistry => {
    if (!inFlightRegistry) {
      inFlightRegistry = new InFlightPrerequisiteRegistry();
    }
    return inFlightRegistry;
  };
