/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getPrerequisitesForLspRequestType } from '../../src/services/LspRequestPrerequisiteMapping';

describe('LspRequestPrerequisiteMapping hardening contracts', () => {
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
