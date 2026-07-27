/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getPrerequisitesForLspRequestType } from '../../src/services/LspRequestPrerequisiteMapping';
import { getLspRequestPreparationPolicy } from '../../src/services/LspRequestPreparationPolicy';

describe('LspRequestPrerequisiteMapping hardening contracts', () => {
  it('keeps hover cursor-scoped instead of materializing the whole file graph', () => {
    const hover = getPrerequisitesForLspRequestType('hover');

    expect(hover.requiredDetailLevel).toBe('full');
    expect(hover.requiresReferenceResolution).toBe(true);
    expect(hover.requiresCrossFileResolution).toBe(false);
  });

  it('keeps definition and signatureHelp strict blocking during workspace load', () => {
    const definition = getPrerequisitesForLspRequestType('definition');
    const signatureHelp = getPrerequisitesForLspRequestType('signatureHelp');

    expect(definition.executionMode).toBe('blocking');
    expect(definition.skipDuringWorkspaceLoad).toBe(false);
    expect(definition.requiresCrossFileResolution).toBe(true);

    expect(signatureHelp.executionMode).toBe('blocking');
    expect(signatureHelp.skipDuringWorkspaceLoad).toBe(false);
    expect(signatureHelp.requiresCrossFileResolution).toBe(true);
  });

  it('keeps implementation as workspace-wide blocking', () => {
    const implementation = getPrerequisitesForLspRequestType('implementation');

    expect(implementation.executionMode).toBe('blocking');
    expect(implementation.requiresWorkspaceLoad).toBe(true);
    expect(implementation.requiresCrossFileResolution).toBe(true);
    expect(implementation.skipDuringWorkspaceLoad).toBe(false);
  });

  it('keeps references and rename workspace-wide blocking requirements', () => {
    const references = getPrerequisitesForLspRequestType('references');
    const rename = getPrerequisitesForLspRequestType('rename');

    expect(references.executionMode).toBe('blocking');
    expect(references.requiresWorkspaceLoad).toBe(true);
    expect(references.requiresCrossFileResolution).toBe(true);

    expect(rename.executionMode).toBe('blocking');
    expect(rename.requiresWorkspaceLoad).toBe(true);
    expect(rename.requiresCrossFileResolution).toBe(true);
  });
});

describe('LSP request preparation policies', () => {
  it.each([
    ['hover', 'full', 'live-if-available', 'cursor-target', 'best-effort'],
    ['completion', 'private', 'live-required', 'cursor-target', 'best-effort'],
    ['definition', 'full', 'live-required', 'cursor-target', 'strict'],
    ['signatureHelp', 'full', 'live-required', 'outbound-file', 'strict'],
    ['codeAction', 'full', 'live-required', 'none', 'strict'],
    ['implementation', 'full', 'live-required', 'inbound-dependents', 'strict'],
    ['references', 'full', 'live-required', 'workspace', 'strict'],
  ] as const)(
    'maps %s to its authoritative preparation profile',
    (requestType, detail, content, dependencyScope, failureMode) => {
      const policy = getLspRequestPreparationPolicy(requestType);

      expect(policy).toMatchObject({
        requiredDetailLevel: detail,
        content,
        dependencyScope,
        failureMode,
      });
    },
  );

  it('derives detail level from the prerequisite mapping', () => {
    const completion = getLspRequestPreparationPolicy('completion');

    expect(completion.requiredDetailLevel).toBe(
      getPrerequisitesForLspRequestType('completion').requiredDetailLevel,
    );
    expect(completion.reuseUnchangedCursor).toBe(true);
    expect(completion.writeBack).toBe(true);
  });
});
