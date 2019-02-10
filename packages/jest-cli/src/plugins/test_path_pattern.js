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
import TestPathPatternPrompt from '../TestPathPatternPrompt';
import activeFilters from '../lib/active_filters_message';

class TestPathPatternPlugin extends BaseWatchPlugin {
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
      key: 'p',
      prompt: 'filter by a filename regex pattern',
    };
  }

  onKey(key: string) {
    this._prompt.put(key);
  }

  run(globalConfig: GlobalConfig, updateConfigAndRun: Function): Promise<void> {
    return new Promise((res, rej) => {
      const testPathPatternPrompt = new TestPathPatternPrompt(
        this._stdout,
        this._prompt,
      );

      testPathPatternPrompt.run(
        (value: string) => {
          updateConfigAndRun({mode: 'watch', testPathPattern: value});
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

export default TestPathPatternPlugin;
