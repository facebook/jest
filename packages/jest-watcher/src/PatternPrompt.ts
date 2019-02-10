/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk from 'chalk';
import ansiEscapes from 'ansi-escapes';
import {specialChars} from 'jest-util';
import Prompt from './lib/Prompt';
import {
  printPatternCaret,
  printRestoredPatternCaret,
} from './lib/patternModeHelpers';

const {CLEAR} = specialChars;

const usage = (entity: string) =>
  `\n${chalk.bold('Pattern Mode Usage')}\n` +
  ` ${chalk.dim('\u203A Press')} Esc ${chalk.dim('to exit pattern mode.')}\n` +
  ` ${chalk.dim('\u203A Press')} Enter ` +
  `${chalk.dim(`to filter by a ${entity} regex pattern.`)}\n` +
  `\n`;

const usageRows = usage('').split('\n').length;

const isValid = (pattern: string) => {
  try {
    const regex = new RegExp(pattern, 'i');
    return !!regex;
  } catch (e) {
    return false;
  }
};

export default class PatternPrompt {
  _pipe: NodeJS.WritableStream;
  _prompt: Prompt;
  _entityName: string;
  _currentUsageRows: number;

  constructor(pipe: NodeJS.WritableStream, prompt: Prompt) {
    // TODO: Should come in the constructor
    this._entityName = '';
    this._pipe = pipe;
    this._prompt = prompt;
    this._currentUsageRows = usageRows;
  }

  run(onSuccess: () => void, onCancel: () => void, options?: {header: string}) {
    this._pipe.write(ansiEscapes.cursorHide);
    this._pipe.write(CLEAR);

    if (options && options.header) {
      this._pipe.write(options.header + '\n');
      this._currentUsageRows = usageRows + options.header.split('\n').length;
    } else {
      this._currentUsageRows = usageRows;
    }

    this._pipe.write(usage(this._entityName));
    this._pipe.write(ansiEscapes.cursorShow);

    const _onSuccess = this._validation(onSuccess);

    this._prompt.enter(this._onChange.bind(this), _onSuccess, onCancel);
  }

  _validation(onSuccess: Function) {
    return (pattern: string) => {
      const valid = isValid(pattern);
      if (valid) {
        onSuccess(pattern);
      } else {
        this._pipe.write(
          '\n' + chalk.red('Please provide valid RegExp') + '\n',
        );
        printPatternCaret('', this._pipe);
        printRestoredPatternCaret(pattern, this._currentUsageRows, this._pipe);
      }
    };
  }

  protected _onChange() {
    this._pipe.write(ansiEscapes.eraseLine);
    this._pipe.write(ansiEscapes.cursorLeft);
  }
}
