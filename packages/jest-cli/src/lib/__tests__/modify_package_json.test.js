/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import modifyPackageJson from '../init/modify_package_json';

test('should remove jest config if exists', () => {
  expect(
    modifyPackageJson({
      projectPackageJson: {
        jest: {
          coverage: true,
        },
      },
      shouldModifyScripts: true,
    }),
  ).toMatchSnapshot();
});

test('should add test script when there are no scripts', () => {
  expect(
    modifyPackageJson({
      projectPackageJson: {},
      shouldModifyScripts: true,
    }),
  ).toMatchSnapshot();
});

test('should add test script when there are scripts', () => {
  expect(
    modifyPackageJson({
      projectPackageJson: {
        scripts: {
          lint: 'eslint .',
          test: 'jasmine',
        },
      },
      shouldModifyScripts: true,
    }),
  ).toMatchSnapshot();
});

test('should not add test script when { shouldModifyScripts: false }', () => {
  expect(
    modifyPackageJson({
      projectPackageJson: {},
      shouldModifyScripts: false,
    }),
  ).toMatchSnapshot();
});
