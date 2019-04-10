/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Config} from '@jest/types';
import {BaseWatchPlugin, Prompt, UpdateConfigCallback} from 'jest-watcher';
import TestNamePatternPrompt from '../TestNamePatternPrompt';
import activeFilters from '../lib/active_filters_message';

class TestNamePatternPlugin extends BaseWatchPlugin {
  _prompt: Prompt;
  isInternal: true;

  constructor(options: {stdin: NodeJS.ReadStream; stdout: NodeJS.WriteStream}) {
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

  run(
    globalConfig: Config.GlobalConfig,
    updateConfigAndRun: UpdateConfigCallback,
  ): Promise<void> {
    return new Promise((res, rej) => {
      const testNamePatternPrompt = new TestNamePatternPrompt(
        this._stdout,
        this._prompt,
      );

      testNamePatternPrompt.run(
        (value: string) => {
          const mode = globalConfig.watch ? 'watch' : 'watchAll';
          updateConfigAndRun({mode, testNamePattern: value});
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
