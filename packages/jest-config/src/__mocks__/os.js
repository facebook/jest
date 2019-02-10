/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const os = jest.genMockFromModule('os');

let cpus;
function __setCpus(newCpus) {
  cpus = newCpus;
}

os.__setCpus = __setCpus;
os.cpus = jest.fn(() => cpus);

module.exports = os;
