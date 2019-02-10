/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import {sync as realpath} from 'realpath-native';
import defaultQuestions, {testScriptQuestion} from './questions';
import {NotFoundPackageJsonError, MalformedPackageJsonError} from './errors';
import {PACKAGE_JSON, JEST_CONFIG} from '../../constants';
import generateConfigFile from './generate_config_file';
import modifyPackageJson from './modify_package_json';

type PromptsResults = {
  clearMocks: boolean,
  coverage: boolean,
  environment: boolean,
  scripts: boolean,
};

export default async (rootDir: string = realpath(process.cwd())) => {
  // prerequisite checks
  const projectPackageJsonPath: string = path.join(rootDir, PACKAGE_JSON);
  const jestConfigPath: string = path.join(rootDir, JEST_CONFIG);

  if (!fs.existsSync(projectPackageJsonPath)) {
    throw new NotFoundPackageJsonError(rootDir);
  }

  const questions = defaultQuestions.slice(0);
  let hasJestProperty: boolean = false;
  let hasJestConfig: boolean = false;
  let projectPackageJson: ?Object;

  try {
    projectPackageJson = JSON.parse(
      fs.readFileSync(projectPackageJsonPath, 'utf-8'),
    );
  } catch (error) {
    throw new MalformedPackageJsonError(projectPackageJsonPath);
  }

  if (projectPackageJson.jest) {
    hasJestProperty = true;
  }

  if (fs.existsSync(jestConfigPath)) {
    hasJestConfig = true;
  }

  if (hasJestProperty || hasJestConfig) {
    const result: {continue: boolean} = await prompts({
      initial: true,
      message:
        'It seems that you already have a jest configuration, do you want to override it?',
      name: 'continue',
      type: 'confirm',
    });

    if (!result.continue) {
      console.log();
      console.log('Aborting...');
      return;
    }
  }

  // Add test script installation only if needed
  if (
    !projectPackageJson.scripts ||
    projectPackageJson.scripts.test !== 'jest'
  ) {
    questions.unshift(testScriptQuestion);
  }

  // Start the init process
  console.log();
  console.log(
    chalk.underline(
      `The following questions will help Jest to create a suitable configuration for your project\n`,
    ),
  );

  let promptAborted: boolean = false;

  const results: PromptsResults = await prompts(questions, {
    onCancel: () => {
      promptAborted = true;
    },
  });

  if (promptAborted) {
    console.log();
    console.log('Aborting...');
    return;
  }

  const shouldModifyScripts = results.scripts;

  if (shouldModifyScripts || hasJestProperty) {
    const modifiedPackageJson = modifyPackageJson({
      projectPackageJson,
      shouldModifyScripts,
    });

    fs.writeFileSync(projectPackageJsonPath, modifiedPackageJson);

    console.log('');
    console.log(`✏️  Modified ${chalk.cyan(projectPackageJsonPath)}`);
  }

  const generatedConfig = generateConfigFile(results);

  fs.writeFileSync(jestConfigPath, generatedConfig);

  console.log('');
  console.log(
    `📝  Configuration file created at ${chalk.cyan(jestConfigPath)}`,
  );
};
