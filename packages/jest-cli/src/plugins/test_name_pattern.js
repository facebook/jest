/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import type {GlobalConfig} from 'types/Config';
import {BaseWatchPlugin, Prompt} from 'jest-watcher';
import TestNamePatternPrompt from '../TestNamePatternPrompt';
import activeFilters from '../lib/active_filters_message';

class TestNamePatternPlugin extends BaseWatchPlugin {
  _prompt: Prompt;
  isInternal: true;

  constructor(options: {
    stdin: stream$Readable | tty$ReadStream,
    stdout: stream$Writable | tty$WriteStream,
  }) {
    super(options);
    this._prompt = new Prompt();
    this.isInternal = true;
  }

  getUsageInfo() {
    return {
      key: 't',
      prompt: 'filter by a test name regex pattern',
    };
  }

  onKey(key: string) {
    this._prompt.put(key);
  }

  run(globalConfig: GlobalConfig, updateConfigAndRun: Function): Promise<void> {
    return new Promise((res, rej) => {
      const testNamePatternPrompt = new TestNamePatternPrompt(
        this._stdout,
        this._prompt,
      );

      testNamePatternPrompt.run(
        (value: string) => {
          updateConfigAndRun({mode: 'watch', testNamePattern: value});
          res();
        },
        rej,
        {
          header: activeFilters(globalConfig),
        },
      );
    });
  }
}

export default TestNamePatternPlugin;
