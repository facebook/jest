/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

'use strict';

import type {ValidationOptions} from './types';

const {logValidationWarning} = require('./utils');

const deprecationMessage = (message: string, options: ValidationOptions) => {
  const footer = options.footer;
  const name = options.titleDeprecation;

  logValidationWarning(name, message, footer);
};

const deprecationWarning = (
  config: Object,
  option: string,
  deprecatedOptions: Object,
  options: ValidationOptions
) => {
  if (option in deprecatedOptions) {
    deprecationMessage(deprecatedOptions[option](config), options);
  }
};

module.exports = {
  deprecationWarning,
};
