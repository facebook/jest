/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import prettyFormat from '../';
import {OptionsReceived, Plugins} from '../types';

declare global {
  namespace jest {
    interface Matchers<R> {
      toPrettyPrintTo(expected: any, options?: OptionsReceived): R;
    }
  }
}

const setPrettyPrint = (plugins: Plugins) => {
  expect.extend({
    toPrettyPrintTo(received: any, expected: any, options?: OptionsReceived) {
      const prettyFormatted = prettyFormat(received, {plugins, ...options});
      const pass = prettyFormatted === expected;

      const message = pass
        ? () =>
            this.utils.matcherHint('.not.toBe') +
            '\n\n' +
            `Expected value to not be:\n` +
            `  ${this.utils.printExpected(expected)}\n` +
            `Received:\n` +
            `  ${this.utils.printReceived(prettyFormatted)}`
        : () => {
            // @ts-ignore: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/32891
            const diffString = this.utils.diff(expected, prettyFormatted, {
              expand: this.expand,
            });
            return (
              this.utils.matcherHint('.toBe') +
              '\n\n' +
              `Expected value to be:\n` +
              `  ${this.utils.printExpected(expected)}\n` +
              `Received:\n` +
              `  ${this.utils.printReceived(prettyFormatted)}` +
              (diffString ? `\n\nDifference:\n\n${diffString}` : '')
            );
          };

      return {actual: prettyFormatted, message, pass};
    },
  });
};

export default setPrettyPrint;
