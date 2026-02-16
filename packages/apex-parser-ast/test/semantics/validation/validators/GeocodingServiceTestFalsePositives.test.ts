/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Reproduces false positive errors from GeocodingServiceTest.cls.
 * These tests assert that valid code does NOT produce incorrect diagnostics.
 *
 * False positives addressed:
 * - invalid.final.field.assignment: address.street = STREET wrongly flagged (street vs STREET resolution)
 * - field.does.not.exist: postalcode on GeocodingServiceTest (should be GeocodingAddress)
 * - field.does.not.exist: lat/lon on List (should resolve to element type Coordinates)
 * - method.does.not.support.parameter.type: setBody (string concat comma in JSON wrongly splits args)
 */

import { Effect } from 'effect';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  FinalAssignmentValidator,
  VariableResolutionValidator,
  MethodResolutionValidator,
} from '../../../../src/semantics/validation/validators';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import {
  loadFixture,
  compileFixture,
  compileSourceLayeredWithOptions,
  runValidator,
} from './helpers/validation-test-helpers';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';

describe('GeocodingServiceTest false positives', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const setupWithGeocodingService = async () => {
    await compileFixture(
      'geocoding',
      'GeocodingService.cls',
      'file:///test/GeocodingService.cls',
      symbolManager,
      compilerService,
    );
    const testSource = loadFixture('geocoding', 'GeocodingServiceTest.cls');
    const { symbolTable, options } = await compileSourceLayeredWithOptions(
      testSource,
      'file:///test/GeocodingServiceTest.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: true,
      },
      { layers: ['public-api', 'full'] },
    );
    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(
        symbolTable.getFileUri() || '',
      ),
    );
    return { symbolTable, options };
  };

  it('should NOT report invalid.final.field.assignment for address.street = STREET pattern', async () => {
    const { symbolTable, options } = await setupWithGeocodingService();

    const result = await runValidator(
      FinalAssignmentValidator.validate(symbolTable, options),
      symbolManager,
    );

    const finalErrors = result.errors.filter(
      (e: any) => e.code === ErrorCodes.INVALID_FINAL_FIELD_ASSIGNMENT,
    );
    const constantErrors = finalErrors.filter((e: any) =>
      ['STREET', 'CITY', 'STATE', 'COUNTRY'].some((name) =>
        e.message?.includes(name),
      ),
    );

    if (constantErrors.length > 0) {
      console.log(
        'Unexpected invalid.final.field.assignment:',
        constantErrors.map((e: any) => e.message),
      );
    }

    expect(constantErrors).toHaveLength(0);
  });

  it('should NOT report field.does.not.exist for postalcode on GeocodingServiceTest', async () => {
    const { symbolTable, options } = await setupWithGeocodingService();

    const result = await runValidator(
      VariableResolutionValidator.validate(symbolTable, options),
      symbolManager,
    );

    const postalcodeErrors = result.errors.filter(
      (e: any) =>
        e.code === ErrorCodes.FIELD_DOES_NOT_EXIST &&
        e.message?.includes('postalcode') &&
        e.message?.includes('GeocodingServiceTest'),
    );

    if (postalcodeErrors.length > 0) {
      console.log(
        'Unexpected field.does.not.exist (postalcode on GeocodingServiceTest):',
        postalcodeErrors.map((e: any) => e.message),
      );
    }

    expect(postalcodeErrors).toHaveLength(0);
  });

  it('should NOT report field.does.not.exist for lat/lon on List', async () => {
    const { symbolTable, options } = await setupWithGeocodingService();

    const result = await runValidator(
      VariableResolutionValidator.validate(symbolTable, options),
      symbolManager,
    );

    const latLonOnListErrors = result.errors.filter(
      (e: any) =>
        e.code === ErrorCodes.FIELD_DOES_NOT_EXIST &&
        (e.message?.includes('lat on List') ||
          e.message?.includes('lon on List')),
    );

    if (latLonOnListErrors.length > 0) {
      console.log(
        'Unexpected field.does.not.exist (lat/lon on List):',
        latLonOnListErrors.map((e: any) => e.message),
      );
    }

    expect(latLonOnListErrors).toHaveLength(0);
  });

  it('should NOT report method.does.not.support.parameter.type for setBody with string concatenation', async () => {
    const { symbolTable, options } = await setupWithGeocodingService();

    const result = await runValidator(
      MethodResolutionValidator.validate(symbolTable, options),
      symbolManager,
    );

    const setBodyErrors = result.errors.filter(
      (e: any) =>
        e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE &&
        e.message?.toLowerCase().includes('setbody'),
    );

    if (setBodyErrors.length > 0) {
      console.log(
        'Unexpected method.does.not.support.parameter.type for setBody:',
        setBodyErrors.map((e: any) => e.message),
      );
    }

    expect(setBodyErrors).toHaveLength(0);
  });

  describe('when GeocodingService is NOT loaded (isolated file)', () => {
    const setupWithoutGeocodingService = async () => {
      const testSource = loadFixture('geocoding', 'GeocodingServiceTest.cls');
      const { symbolTable, options } = await compileSourceLayeredWithOptions(
        testSource,
        'file:///test/GeocodingServiceTest.cls',
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
        { layers: ['public-api', 'full'] },
      );
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );
      return { symbolTable, options };
    };

    it('should NOT report invalid.final.field.assignment (fix does not depend on cross-file resolution)', async () => {
      const { symbolTable, options } = await setupWithoutGeocodingService();

      const result = await runValidator(
        FinalAssignmentValidator.validate(symbolTable, options),
        symbolManager,
      );

      const constantErrors = result.errors.filter(
        (e: any) =>
          e.code === ErrorCodes.INVALID_FINAL_FIELD_ASSIGNMENT &&
          ['STREET', 'CITY', 'STATE', 'COUNTRY'].some((name) =>
            e.message?.includes(name),
          ),
      );

      expect(constantErrors).toHaveLength(0);
    });

    it(
      'should NOT report method.does.not.support.parameter.type for setBody ' +
        '(fix does not depend on cross-file resolution)',
      async () => {
        const { symbolTable, options } = await setupWithoutGeocodingService();

        const result = await runValidator(
          MethodResolutionValidator.validate(symbolTable, options),
          symbolManager,
        );

        const setBodyErrors = result.errors.filter(
          (e: any) =>
            e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE &&
            e.message?.toLowerCase().includes('setbody'),
        );

        expect(setBodyErrors).toHaveLength(0);
      },
    );
  });
});
