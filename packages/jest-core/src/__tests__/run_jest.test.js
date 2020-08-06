/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import runJest from '../runJest';

jest.mock('@jest/console');

describe('runJest', () => {
  test('when watch is set then print error and exit process', async () => {
    jest.spyOn(process, 'exit').mockImplementation(() => {});

    await runJest({
      changedFilesPromise: Promise.resolve({repos: {git: new Set()}}),
      contexts: [],
      globalConfig: {testSequencer: '@jest/test-sequencer', watch: true},
      onComplete: () => null,
      outputStream: {},
      startRun: {},
      testWatcher: {isInterrupted: () => true},
    });

    await new Promise(process.nextTick);

    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
