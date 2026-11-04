/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { CompilerService } from '../../../../src/parser/compilerService';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
// eslint-disable-next-line max-len
import { TopLevelTypeFilenameValidator } from '../../../../src/semantics/validation/validators/TopLevelTypeFilenameValidator';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import {
  compileFixture,
  createValidationOptions,
  runValidator,
} from './helpers/validation-test-helpers';

describe('TopLevelTypeFilenameValidator', () => {
  const VALIDATOR_CATEGORY = 'top-level-type-filename';
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const validateFixture = async (filename: string, fileUri?: string) => {
    const symbolTable = await compileFixture(
      VALIDATOR_CATEGORY,
      filename,
      fileUri,
      symbolManager,
      compilerService,
    );
    const result = await runValidator(
      TopLevelTypeFilenameValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );
    return { result, symbolTable };
  };

  it('reports the deployment-equivalent error for a mismatched class name', async () => {
    const { result, symbolTable } = await validateFixture('MyException.cls');

    expect(result.errors).toEqual([
      expect.objectContaining({
        code: ErrorCodes.FILE_NAME_MISMATCH_WITH_CLASS_NAME,
        message: 'File name mismatch with class name: MyExceptionssssss',
        location: symbolTable
          .getAllSymbols()
          .find((symbol) => symbol.parentId === null && symbol.kind === 'class')
          ?.location,
      }),
    ]);
  });

  it.each<[string, string]>([
    ['MyEnum.cls', 'MyEnumMismatch'],
    ['MyInterface.cls', 'MyInterfaceMismatch'],
  ])(
    'reports a mismatch for a top-level declaration in %s',
    async (filename: string, typeName: string) => {
      const { result } = await validateFixture(filename);

      expect(result.errors).toEqual([
        expect.objectContaining({
          code: ErrorCodes.FILE_NAME_MISMATCH_WITH_CLASS_NAME,
          message: `File name mismatch with class name: ${typeName}`,
        }),
      ]);
    },
  );

  it('accepts matching filenames and ignores nested types', async () => {
    const { result } = await validateFixture('MatchingName.cls');

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports case-only filename mismatches', async () => {
    const { result } = await validateFixture(
      'MatchingName.cls',
      'file:///test/matchingname.cls',
    );

    expect(result.errors).toEqual([
      expect.objectContaining({
        code: ErrorCodes.FILE_NAME_MISMATCH_WITH_CLASS_NAME,
        message: 'File name mismatch with class name: MatchingName',
      }),
    ]);
  });

  it.each<readonly [string]>([
    ['file:///test/MyException.trigger'],
    ['file:///test/MyException.apex'],
  ])('ignores non-class documents: %s', async (fileUri: string) => {
    const { result } = await validateFixture('MyException.cls', fileUri);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
