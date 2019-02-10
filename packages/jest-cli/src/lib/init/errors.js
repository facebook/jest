/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export class NotFoundPackageJsonError extends Error {
  name: string;
  message: string;

  constructor(rootDir: string) {
    super();
    this.name = '';
    this.message = `Could not find a "package.json" file in ${rootDir}`;
    Error.captureStackTrace(this, () => {});
  }
}

export class MalformedPackageJsonError extends Error {
  name: string;
  message: string;

  constructor(packageJsonPath: string) {
    super();
    this.name = '';
    this.message =
      `There is malformed json in ${packageJsonPath}\n` +
      'Fix it, and then run "jest --init"';
    Error.captureStackTrace(this, () => {});
  }
}
