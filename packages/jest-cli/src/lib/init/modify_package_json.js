/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const modifyPackageJson = ({
  projectPackageJson,
  shouldModifyScripts,
  hasJestProperty,
}: {
  projectPackageJson: Object,
  shouldModifyScripts: boolean,
}): string => {
  if (shouldModifyScripts) {
    projectPackageJson.scripts
      ? (projectPackageJson.scripts.test = 'jest')
      : (projectPackageJson.scripts = {test: 'jest'});
  }

  delete projectPackageJson.jest;

  return JSON.stringify(projectPackageJson, null, 2) + '\n';
};

export default modifyPackageJson;
