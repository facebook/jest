/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/* eslint-disable no-eval */
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import init from '../init';

jest.mock('prompts');
jest.mock('../../../../jest-config/build/getCacheDirectory', () => () =>
  '/tmp/jest',
);
jest.mock('path', () => ({...jest.requireActual('path'), sep: '/'}));

const resolveFromFixture = relativePath =>
  path.resolve(__dirname, 'fixtures', relativePath);

const writeFileSync = fs.writeFileSync;
const consoleLog = console.log;

describe('init', () => {
  beforeEach(() => {
    // $FlowFixMe mock console.log to reduce noise from the tests
    console.log = jest.fn();
    // $FlowFixMe mock
    fs.writeFileSync = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // $FlowFixMe
    console.log = consoleLog;
    // $FlowFixMe mock
    fs.writeFileSync = writeFileSync;
  });

  describe('project with package.json and no jest config', () => {
    describe('all questions answered with answer: "No"', () => {
      it('should return the default configuration (an empty config)', async () => {
        prompts.mockReturnValueOnce({});

        await init(resolveFromFixture('only_package_json'));

        const writtenJestConfig = fs.writeFileSync.mock.calls[0][1];

        expect(writtenJestConfig).toMatchSnapshot();

        const evaluatedConfig = eval(writtenJestConfig);

        expect(evaluatedConfig).toEqual({});
      });
    });

    describe('some questions answered with answer: "Yes"', () => {
      it('should create configuration for {clearMocks: true}', async () => {
        prompts.mockReturnValueOnce({clearMocks: true});

        await init(resolveFromFixture('only_package_json'));

        const writtenJestConfig = fs.writeFileSync.mock.calls[0][1];
        const evaluatedConfig = eval(writtenJestConfig);

        expect(evaluatedConfig).toEqual({clearMocks: true});
      });

      it('should create configuration for {coverage: true}', async () => {
        prompts.mockReturnValueOnce({coverage: true});

        await init(resolveFromFixture('only_package_json'));

        const writtenJestConfig = fs.writeFileSync.mock.calls[0][1];
        const evaluatedConfig = eval(writtenJestConfig);

        expect(evaluatedConfig).toEqual({coverageDirectory: 'coverage'});
      });

      it('should create configuration for {environment: "jsdom"}', async () => {
        prompts.mockReturnValueOnce({environment: 'jsdom'});

        await init(resolveFromFixture('only_package_json'));

        const writtenJestConfig = fs.writeFileSync.mock.calls[0][1];
        const evaluatedConfig = eval(writtenJestConfig);
        // should modify when the default environment will be changed to "node"
        expect(evaluatedConfig).toEqual({});
      });

      it('should create configuration for {environment: "node"}', async () => {
        prompts.mockReturnValueOnce({environment: 'node'});

        await init(resolveFromFixture('only_package_json'));

        const writtenJestConfig = fs.writeFileSync.mock.calls[0][1];
        const evaluatedConfig = eval(writtenJestConfig);
        // should modify when the default environment will be changed to "node"
        expect(evaluatedConfig).toEqual({testEnvironment: 'node'});
      });

      it('should create package.json with configured test command when {scripts: true}', async () => {
        prompts.mockReturnValueOnce({scripts: true});

        await init(resolveFromFixture('only_package_json'));

        const writtenPackageJson = fs.writeFileSync.mock.calls[0][1];

        expect(writtenPackageJson).toMatchSnapshot();
        expect(JSON.parse(writtenPackageJson).scripts.test).toEqual('jest');
      });
    });
  });

  describe('no package json', () => {
    it('should throw an error if there is no package.json file', async () => {
      expect.assertions(1);

      try {
        await init(resolveFromFixture('no_package_json'));
      } catch (error) {
        expect(error.message).toMatch(
          'Could not find a "package.json" file in',
        );
      }
    });
  });

  describe('has-jest-config-file', () => {
    describe('ask the user whether to override config or not', () => {
      it('user answered with "Yes"', async () => {
        prompts.mockReturnValueOnce({continue: true}).mockReturnValueOnce({});

        await init(resolveFromFixture('has_jest_config_file'));

        expect(prompts.mock.calls[0][0]).toMatchSnapshot();

        const writtenJestConfig = fs.writeFileSync.mock.calls[0][1];

        expect(writtenJestConfig).toBeDefined();
      });

      it('user answered with "No"', async () => {
        prompts.mockReturnValueOnce({continue: false});

        await init(resolveFromFixture('has_jest_config_file'));
        // return after first prompt
        expect(prompts).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('has jest config in package.json', () => {
    it('should ask the user whether to override config or not', async () => {
      prompts.mockReturnValueOnce({continue: true}).mockReturnValueOnce({});

      await init(resolveFromFixture('has_jest_config_in_package_json'));

      expect(prompts.mock.calls[0][0]).toMatchSnapshot();

      const writtenJestConfig = fs.writeFileSync.mock.calls[0][1];

      expect(writtenJestConfig).toBeDefined();
    });
  });

  describe('already has "jest" in packageJson.scripts.test', () => {
    it('should not ask "test script question"', async () => {
      prompts.mockReturnValueOnce({});

      await init(resolveFromFixture('test_script_configured'));

      const questionsNames = prompts.mock.calls[0][0].map(
        question => question.name,
      );

      expect(questionsNames).not.toContain('scripts');
    });
  });
});
