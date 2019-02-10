/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ValidationOptions} from './types';

import {deprecationWarning} from './deprecated';
import {unknownOptionWarning} from './warnings';
import {errorMessage} from './errors';
import {validationCondition} from './condition';
import {ERROR, DEPRECATION, WARNING} from './utils';

export default ({
  comment: '',
  condition: validationCondition,
  deprecate: deprecationWarning,
  deprecatedConfig: {},
  error: errorMessage,
  exampleConfig: {},
  recursive: true,
  // Allow NPM-sanctioned comments in package.json. Use a "//" key.
  recursiveBlacklist: ['//'],
  title: {
    deprecation: DEPRECATION,
    error: ERROR,
    warning: WARNING,
  },
  unknown: unknownOptionWarning,
}: ValidationOptions);
