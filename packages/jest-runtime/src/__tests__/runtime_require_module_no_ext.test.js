/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

let createRuntime;

describe('Runtime requireModule with no extension', () => {
  beforeEach(() => {
    createRuntime = require('createRuntime');
  });

  it('throws error pointing out file with extension', async () => {
    const runtime = await createRuntime(__filename);

    expect(() =>
      runtime.requireModuleOrMock(
        runtime.__mockRootPath,
        'RegularModuleWithWrongExt',
      ),
    ).toThrowErrorMatchingSnapshot();
  });
});
