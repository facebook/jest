/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Config} from '@jest/types';
import shouldInstrument from '../shouldInstrument';
import {makeGlobalConfig, makeProjectConfig} from '../../../../TestUtils';
import {Options} from '../types';

describe('shouldInstrument', () => {
  const defaultFilename = 'source_file.test.js';
  const defaultOptions: Options = {
    ...makeGlobalConfig({
      collectCoverage: true,
    }),
    changedFiles: undefined,
  };
  const defaultConfig = makeProjectConfig({rootDir: '/'});
  describe('should return true', () => {
    const testShouldInstrument = (
      filename = defaultFilename,
      options: Partial<Options>,
      config: Partial<Config.ProjectConfig>,
    ) => {
      const result = shouldInstrument(
        filename,
        {...defaultOptions, ...options},
        {...defaultConfig, ...config},
      );
      expect(result).toBe(true);
    };

    it('when testRegex is provided and file is not a test file', () => {
      testShouldInstrument('source_file.js', defaultOptions, {
        testRegex: ['.*\\.(test)\\.(js)$'],
      });
    });

    it('when more than one testRegex is provided and filename is not a test file', () => {
      testShouldInstrument('source_file.js', defaultOptions, {
        testRegex: ['.*\\_(test)\\.(js)$', '.*\\.(test)\\.(js)$', 'never'],
      });
    });

    it('when testMatch is provided and file is not a test file', () => {
      testShouldInstrument('source_file.js', defaultOptions, {
        testMatch: ['**/?(*.)(test).js', '!**/dont/**/*.js'],
      });
    });

    it('when testPathIgnorePatterns is provided and file is not a test file', () => {
      testShouldInstrument('src/test.js', defaultOptions, {
        testPathIgnorePatterns: ['src/'],
      });
    });

    it('when more than one testPathIgnorePatterns is provided and filename is not a test file', () => {
      testShouldInstrument('src/test.js', defaultOptions, {
        testPathIgnorePatterns: ['test/', 'src/'],
      });
    });

    it('when testRegex and testPathIgnorePatterns are provided and file is not a test file', () => {
      testShouldInstrument('src/source_file.js', defaultOptions, {
        testPathIgnorePatterns: ['test/'],
        testRegex: ['.*\\.(test)\\.(js)$'],
      });
    });

    it('when testMatch and testPathIgnorePatterns are provided and file is not a test file', () => {
      testShouldInstrument('src/source_file.js', defaultOptions, {
        testMatch: ['**/?(*.)(test).js', '!**/dont/**/*.js'],
        testPathIgnorePatterns: ['test/'],
      });
    });

    it('should return true when file is in collectCoverageOnlyFrom when provided', () => {
      testShouldInstrument(
        'collect/only/from/here.js',
        {},
        {
          ...defaultConfig,
          collectCoverageOnlyFrom: {'collect/only/from/here.js': true},
        },
      );
    });

    it('should return true when filename matches collectCoverageFrom', () => {
      testShouldInstrument(
        'do/collect/coverage.js',
        {},
        {
          ...defaultConfig,
          collectCoverageFrom: ['!**/dont/**/*.js', '**/do/**/*.js'],
        },
      );
    });

    it('should return true if the file is not in coveragePathIgnorePatterns', () => {
      testShouldInstrument('do/collect/coverage.js', defaultOptions, {
        coveragePathIgnorePatterns: ['dont'],
      });
    });

    it('should return true if file is a testfile but forceCoverageMatch is set', () => {
      testShouldInstrument('do/collect/sum.coverage.test.js', defaultOptions, {
        forceCoverageMatch: ['**/*.(coverage).(test).js'],
        testRegex: ['.*\\.(test)\\.(js)$'],
      });
    });
  });

  describe('should return false', () => {
    const testShouldInstrument = (
      filename = defaultFilename,
      options: Partial<Options>,
      config: Partial<Config.ProjectConfig>,
    ) => {
      const result = shouldInstrument(
        filename,
        {...defaultOptions, ...options},
        {...defaultConfig, ...config},
      );
      expect(result).toBe(false);
    };

    it('if collectCoverage is falsy', () => {
      testShouldInstrument(
        'source_file.js',
        {
          collectCoverage: false,
        },
        defaultConfig,
      );
    });

    it('when testRegex is provided and filename is a test file', () => {
      testShouldInstrument(defaultFilename, defaultOptions, {
        testRegex: ['.*\\.(test)\\.(js)$'],
      });
    });

    it('when more than one testRegex is provided and filename matches one of the patterns', () => {
      testShouldInstrument(defaultFilename, defaultOptions, {
        testRegex: ['.*\\_(test)\\.(js)$', '.*\\.(test)\\.(js)$', 'never'],
      });
    });

    it('when testMatch is provided and file is a test file', () => {
      testShouldInstrument(defaultFilename, defaultOptions, {
        testMatch: ['**/?(*.)(test).js'],
      });
    });

    it('when testRegex and testPathIgnorePatterns are provided and filename is a test file', () => {
      testShouldInstrument('test/' + defaultFilename, defaultOptions, {
        testPathIgnorePatterns: ['src/'],
        testRegex: ['.*\\.(test)\\.(js)$'],
      });
    });

    it('when testMatch and testPathIgnorePatterns are provided and file is a test file', () => {
      testShouldInstrument('test/' + defaultFilename, defaultOptions, {
        testMatch: ['**/?(*.)(test).js'],
        testPathIgnorePatterns: ['src/'],
      });
    });

    it('when file is not in collectCoverageOnlyFrom when provided', () => {
      testShouldInstrument(
        'source_file.js',
        {},
        {
          ...defaultConfig,
          collectCoverageOnlyFrom: {'collect/only/from/here.js': true},
        },
      );
    });

    it('when filename does not match collectCoverageFrom', () => {
      testShouldInstrument(
        'dont/collect/coverage.js',
        {},
        {
          ...defaultConfig,
          collectCoverageFrom: ['!**/dont/**/*.js', '**/do/**/*.js'],
        },
      );
    });

    it('if the file is in coveragePathIgnorePatterns', () => {
      testShouldInstrument('dont/collect/coverage.js', defaultOptions, {
        coveragePathIgnorePatterns: ['dont'],
      });
    });

    it('if file is in mock patterns', () => {
      const filename =
        process.platform === 'win32'
          ? 'dont\\__mocks__\\collect\\coverage.js'
          : 'dont/__mocks__/collect/coverage.js';

      testShouldInstrument(filename, defaultOptions, defaultConfig);
    });

    it('if file is a globalSetup file', () => {
      testShouldInstrument('globalSetup.js', defaultOptions, {
        globalSetup: 'globalSetup.js',
      });
    });

    it('if file is globalTeardown file', () => {
      testShouldInstrument('globalTeardown.js', defaultOptions, {
        globalTeardown: 'globalTeardown.js',
      });
    });

    it('if file is in setupFiles', () => {
      testShouldInstrument('setupTest.js', defaultOptions, {
        setupFiles: ['setupTest.js'],
      });
    });

    it('if file is in setupFilesAfterEnv', () => {
      testShouldInstrument('setupTest.js', defaultOptions, {
        setupFilesAfterEnv: ['setupTest.js'],
      });
    });
  });
});
