/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TypeAssignmentValidator } from '../../../../src/semantics/validation/validators/TypeAssignmentValidator';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';

describe('TypeAssignmentValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'type-assignment';

  // Helper to compile a fixture file for this validator
  const compileFixtureForValidator = async (
    filename: string,
    fileUri?: string,
  ) =>
    compileFixture(
      VALIDATOR_CATEGORY,
      filename,
      fileUri,
      symbolManager,
      compilerService,
    );

  it('should have correct metadata', () => {
    expect(TypeAssignmentValidator.id).toBe('type-assignment');
    expect(TypeAssignmentValidator.name).toBe('Type Assignment Validator');
    expect(TypeAssignmentValidator.tier).toBe(ValidationTier.THOROUGH);
    expect(TypeAssignmentValidator.priority).toBe(10);
  });

  it('should pass validation for compatible primitive types', async () => {
    const symbolTable = await compileFixtureForValidator(
      'CompatiblePrimitive.cls',
    );

    const result = await runValidator(
      TypeAssignmentValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect incompatible primitive type assignment', async () => {
    const symbolTable = await compileFixtureForValidator(
      'IncompatiblePrimitive.cls',
    );

    const result = await runValidator(
      TypeAssignmentValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('Type mismatch');
    expect(errorMessage).toContain('String');
    // Error may mention the source type (Integer) or just the value ('123')
    expect(
      errorMessage.includes('Integer') ||
        errorMessage.includes('123') ||
        errorMessage.includes('cannot assign'),
    ).toBe(true);
  });

  it('should detect incompatible collection type assignment', async () => {
    const symbolTable = await compileFixtureForValidator(
      'IncompatibleCollection.cls',
    );

    const result = await runValidator(
      TypeAssignmentValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('Type mismatch');
    expect(errorMessage).toContain('ContentDocumentLink');
    expect(errorMessage).toContain('List');
  });

  it('should pass validation for compatible collection types', async () => {
    const symbolTable = await compileFixtureForValidator(
      'CompatibleCollection.cls',
    );

    const result = await runValidator(
      TypeAssignmentValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should skip variables without initializers', async () => {
    const symbolTable = await compileFixtureForValidator('NoInitializer.cls');

    const result = await runValidator(
      TypeAssignmentValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate field declarations', async () => {
    const symbolTable = await compileFixtureForValidator(
      'FieldDeclaration.cls',
    );

    const result = await runValidator(
      TypeAssignmentValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect incompatible field assignment', async () => {
    const symbolTable = await compileFixtureForValidator(
      'IncompatibleField.cls',
    );

    const result = await runValidator(
      TypeAssignmentValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('Type mismatch');
  });
});
