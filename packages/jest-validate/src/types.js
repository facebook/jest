/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

type Title = {|
  deprecation?: string,
  error?: string,
  warning?: string,
|};

export type ValidationOptions = {
  comment?: string,
  condition?: (option: any, validOption: any) => boolean,
  deprecate?: (
    config: Object,
    option: string,
    deprecatedOptions: Object,
    options: ValidationOptions,
  ) => boolean,
  deprecatedConfig?: {[key: string]: Function},
  error?: (
    option: string,
    received: any,
    defaultValue: any,
    options: ValidationOptions,
    path?: Array<string>,
  ) => void,
  exampleConfig: Object,
  recursive?: boolean,
  recursiveBlacklist?: Array<string>,
  title?: Title,
  unknown?: (
    config: Object,
    exampleConfig: Object,
    option: string,
    options: ValidationOptions,
    path?: Array<string>,
  ) => void,
};
