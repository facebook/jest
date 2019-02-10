/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk from 'chalk';
import ansiEscapes from 'ansi-escapes';
import stringLength from 'string-length';

export const printPatternCaret = (
  pattern: string,
  pipe: NodeJS.WritableStream,
) => {
  const inputText = `${chalk.dim(' pattern \u203A')} ${pattern}`;

  pipe.write(ansiEscapes.eraseDown);
  pipe.write(inputText);
  pipe.write(ansiEscapes.cursorSavePosition);
};

export const printRestoredPatternCaret = (
  pattern: string,
  currentUsageRows: number,
  pipe: NodeJS.WritableStream,
) => {
  const inputText = `${chalk.dim(' pattern \u203A')} ${pattern}`;

  pipe.write(
    ansiEscapes.cursorTo(stringLength(inputText), currentUsageRows - 1),
  );
  pipe.write(ansiEscapes.cursorRestorePosition);
};
