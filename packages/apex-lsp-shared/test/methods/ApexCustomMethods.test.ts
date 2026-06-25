/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  APEX_METHODS,
  getApexMethodDescriptor,
  isApexMethod,
  type ApexMethodDescriptor,
  type ApexMethodDirection,
  type ApexMethodId,
} from '../../src/methods/ApexCustomMethods';
import { DEVELOPMENT_CAPABILITIES } from '../../src/capabilities/ApexLanguageServerCapabilities';

/** The 13 canonical method strings, exactly as specified by the WI table. */
const EXPECTED_METHOD_STRINGS = [
  'apex/findMissingArtifact',
  'apex/requestWorkspaceLoad',
  'apex/sendWorkspaceBatch',
  'apex/processWorkspaceBatches',
  'apex/workspaceIngestionComplete',
  'apex/workspaceLoadComplete',
  'apex/workspaceLoadFailed',
  'apex/queueState',
  'apex/queueStateChanged',
  'apex/graphData',
  'apex/profiling/start',
  'apex/profiling/stop',
  'apex/profiling/status',
] as const;

const descriptors: ApexMethodDescriptor[] = Object.values(APEX_METHODS);

describe('APEX_METHODS registry', () => {
  it('contains exactly the 13 expected method strings, no extras', () => {
    const actual = descriptors.map((d) => d.method).sort();
    const expected = [...EXPECTED_METHOD_STRINGS].sort();
    expect(actual).toEqual(expected);
    expect(descriptors).toHaveLength(13);
  });

  describe('per-method direction / kind / devModeOnly / capabilityKey', () => {
    type Row = {
      id: ApexMethodId;
      method: string;
      direction: ApexMethodDirection;
      kind: 'request' | 'notification';
      devModeOnly: boolean;
      capabilityKey?: string;
    };

    const table: Row[] = [
      {
        id: 'findMissingArtifact',
        method: 'apex/findMissingArtifact',
        direction: 'serverToClient',
        kind: 'request',
        devModeOnly: false,
        capabilityKey: 'findMissingArtifactProvider',
      },
      {
        id: 'requestWorkspaceLoad',
        method: 'apex/requestWorkspaceLoad',
        direction: 'serverToClient',
        kind: 'notification',
        devModeOnly: false,
      },
      {
        id: 'sendWorkspaceBatch',
        method: 'apex/sendWorkspaceBatch',
        direction: 'clientToServer',
        kind: 'request',
        devModeOnly: false,
      },
      {
        id: 'processWorkspaceBatches',
        method: 'apex/processWorkspaceBatches',
        direction: 'clientToServer',
        kind: 'request',
        devModeOnly: false,
      },
      {
        id: 'workspaceIngestionComplete',
        method: 'apex/workspaceIngestionComplete',
        direction: 'serverToClient',
        kind: 'notification',
        devModeOnly: false,
      },
      {
        id: 'workspaceLoadComplete',
        method: 'apex/workspaceLoadComplete',
        direction: 'clientToServer',
        kind: 'notification',
        devModeOnly: false,
      },
      {
        id: 'workspaceLoadFailed',
        method: 'apex/workspaceLoadFailed',
        direction: 'clientToServer',
        kind: 'notification',
        devModeOnly: false,
      },
      {
        id: 'queueState',
        method: 'apex/queueState',
        direction: 'clientToServer',
        kind: 'request',
        devModeOnly: true,
      },
      {
        id: 'queueStateChanged',
        method: 'apex/queueStateChanged',
        direction: 'serverToClient',
        kind: 'notification',
        devModeOnly: true,
      },
      {
        id: 'graphData',
        method: 'apex/graphData',
        direction: 'clientToServer',
        kind: 'request',
        devModeOnly: true,
      },
      {
        id: 'profilingStart',
        method: 'apex/profiling/start',
        direction: 'clientToServer',
        kind: 'request',
        devModeOnly: true,
        capabilityKey: 'profilingProvider',
      },
      {
        id: 'profilingStop',
        method: 'apex/profiling/stop',
        direction: 'clientToServer',
        kind: 'request',
        devModeOnly: true,
        capabilityKey: 'profilingProvider',
      },
      {
        id: 'profilingStatus',
        method: 'apex/profiling/status',
        direction: 'clientToServer',
        kind: 'request',
        devModeOnly: true,
        capabilityKey: 'profilingProvider',
      },
    ];

    it.each(table)(
      '$id matches the WI table',
      ({ id, method, direction, kind, devModeOnly, capabilityKey }) => {
        const descriptor: ApexMethodDescriptor = APEX_METHODS[id];
        expect(descriptor.method).toBe(method);
        expect(descriptor.direction).toBe(direction);
        expect(descriptor.kind).toBe(kind);
        expect(descriptor.devModeOnly).toBe(devModeOnly);
        expect(descriptor.capabilityKey).toBe(capabilityKey);
      },
    );
  });

  describe('direction discipline', () => {
    it('serverToClient set is exactly the 4 expected methods', () => {
      const serverToClient = descriptors
        .filter((d) => d.direction === 'serverToClient')
        .map((d) => d.method)
        .sort();
      expect(serverToClient).toEqual(
        [
          'apex/findMissingArtifact',
          'apex/requestWorkspaceLoad',
          'apex/workspaceIngestionComplete',
          'apex/queueStateChanged',
        ].sort(),
      );
      expect(serverToClient).toHaveLength(4);
    });

    it('workspaceLoadComplete and workspaceLoadFailed are clientToServer (regression guard)', () => {
      expect(APEX_METHODS.workspaceLoadComplete.direction).toBe(
        'clientToServer',
      );
      expect(APEX_METHODS.workspaceLoadFailed.direction).toBe('clientToServer');
    });
  });

  describe('capabilityKey discipline', () => {
    it('exactly 4 entries carry a capabilityKey', () => {
      const withCapability = descriptors.filter(
        (d) => d.capabilityKey !== undefined,
      );
      expect(withCapability).toHaveLength(4);
    });

    it('only findMissingArtifact and the three profiling ids have a capabilityKey', () => {
      expect(APEX_METHODS.findMissingArtifact.capabilityKey).toBe(
        'findMissingArtifactProvider',
      );
      expect(APEX_METHODS.profilingStart.capabilityKey).toBe(
        'profilingProvider',
      );
      expect(APEX_METHODS.profilingStop.capabilityKey).toBe(
        'profilingProvider',
      );
      expect(APEX_METHODS.profilingStatus.capabilityKey).toBe(
        'profilingProvider',
      );

      const idsWithoutCapability: ApexMethodId[] = [
        'requestWorkspaceLoad',
        'sendWorkspaceBatch',
        'processWorkspaceBatches',
        'workspaceIngestionComplete',
        'workspaceLoadComplete',
        'workspaceLoadFailed',
        'queueState',
        'queueStateChanged',
        'graphData',
      ];
      for (const id of idsWithoutCapability) {
        const descriptor: ApexMethodDescriptor = APEX_METHODS[id];
        expect(descriptor.capabilityKey).toBeUndefined();
      }
    });

    it('every capabilityKey is a real key of ExperimentalCapabilities', () => {
      // Build the allowed set at runtime from the experimental block of a real
      // capabilities value — no type-level ExperimentalCapabilityKey import.
      const experimentalKeys = new Set(
        Object.keys(DEVELOPMENT_CAPABILITIES.experimental ?? {}),
      );
      expect(experimentalKeys.size).toBeGreaterThan(0);

      for (const descriptor of descriptors) {
        if (descriptor.capabilityKey !== undefined) {
          expect(experimentalKeys.has(descriptor.capabilityKey)).toBe(true);
        }
      }
    });
  });

  describe('devModeOnly discipline', () => {
    it('exactly the dev-mode methods are flagged', () => {
      const devOnly = descriptors
        .filter((d) => d.devModeOnly)
        .map((d) => d.method)
        .sort();
      expect(devOnly).toEqual(
        [
          'apex/queueState',
          'apex/queueStateChanged',
          'apex/graphData',
          'apex/profiling/start',
          'apex/profiling/stop',
          'apex/profiling/status',
        ].sort(),
      );
    });
  });
});

describe('isApexMethod', () => {
  it('returns true for every canonical method string', () => {
    for (const method of EXPECTED_METHOD_STRINGS) {
      expect(isApexMethod(method)).toBe(true);
    }
  });

  it('returns false for non-apex strings', () => {
    expect(isApexMethod('textDocument/hover')).toBe(false);
    expect(isApexMethod('apex/notARealMethod')).toBe(false);
    expect(isApexMethod('')).toBe(false);
  });
});

describe('getApexMethodDescriptor', () => {
  it('round-trips every registered method back to its descriptor', () => {
    for (const descriptor of descriptors) {
      expect(getApexMethodDescriptor(descriptor.method)).toBe(descriptor);
    }
  });

  it('returns undefined for an unknown method', () => {
    expect(getApexMethodDescriptor('apex/notARealMethod')).toBeUndefined();
  });
});
