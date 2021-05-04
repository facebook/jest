/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import prettyFormat from 'pretty-format';
import {wrappedCircularSerializer} from './complex/circularObjects';
import diff from './diff';
import format from './format';
import {isLeafType} from './getType';
import type {DeepDiffOptions, DiffPlugin, FormatPlugin, Plugin} from './types';

export type {DiffObject} from './types';

const serialize = (val: unknown) => {
  if (isLeafType(val)) {
    return prettyFormat(val, {
      plugins: [wrappedCircularSerializer],
    });
  }

  throw new Error(`cannot serialzie value : ${val}`);
};

function formatAndDiff(a: unknown, b: unknown, opts?: DeepDiffOptions): string {
  const providedPlugins: Array<Plugin> = (opts && opts.plugins) || [];
  const formatPlugins: Array<FormatPlugin> = [];
  const diffPlugins: Array<DiffPlugin> = [];
  for (const plugin of providedPlugins) {
    formatPlugins.push({
      format: plugin.format,
      test: plugin.test,
    });
    diffPlugins.push({
      diff: plugin.diff,
      markChildrenRecursively: plugin.markChildrenRecursively,
      test: plugin.test,
    });
  }

  return format(diff(a, b, undefined, undefined, diffPlugins), {
    serialize,
    ...opts,
    plugins: formatPlugins,
  });
}

export default formatAndDiff;
