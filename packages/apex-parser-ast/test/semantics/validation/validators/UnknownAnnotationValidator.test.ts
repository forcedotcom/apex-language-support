/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { UnknownAnnotationValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixtureWithOptions,
  runValidator,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('UnknownAnnotationValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'unknown-annotation';

  it('should have correct metadata', () => {
    expect(UnknownAnnotationValidator.id).toBe('unknown-annotation');
    expect(UnknownAnnotationValidator.name).toBe(
      'Unknown Annotation Validator',
    );
    expect(UnknownAnnotationValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(UnknownAnnotationValidator.priority).toBe(4);
  });

  it('should detect INVALID_UNRESOLVED_ANNOTATION for unresolved custom annotation at THOROUGH tier', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'UnresolvedAnnotation.cls',
      'file:///test/UnresolvedAnnotation.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      UnknownAnnotationValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_UNRESOLVED_ANNOTATION,
    );
    expect(hasError).toBe(true);
  });
});
