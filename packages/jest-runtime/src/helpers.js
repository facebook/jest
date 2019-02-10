// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

// @flow

import type {Path} from 'types/Config';

import path from 'path';
import chalk from 'chalk';
import slash from 'slash';
import glob from 'glob';

const DOT = ' \u2022 ';

export const enhanceUnexpectedTokenMessage = (e: Error) => {
  e.stack =
    `${chalk.bold.red('Jest encountered an unexpected token')}

This usually means that you are trying to import a file which Jest cannot parse, e.g. it's not plain JavaScript.

By default, if Jest sees a Babel config, it will use that to transform your files, ignoring "node_modules".

Here's what you can do:
${DOT}To have some of your "node_modules" files transformed, you can specify a custom ${chalk.bold(
      '"transformIgnorePatterns"',
    )} in your config.
${DOT}If you need a custom transformation specify a ${chalk.bold(
      '"transform"',
    )} option in your config.
${DOT}If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the ${chalk.bold(
      '"moduleNameMapper"',
    )} config option.

You'll find more details and examples of these config options in the docs:
${chalk.cyan('https://jestjs.io/docs/en/configuration.html')}

${chalk.bold.red('Details:')}

` + e.stack;

  return e;
};

export const findSiblingsWithFileExtension = (
  moduleFileExtensions: Array<string>,
  from: Path,
  moduleName: string,
): string => {
  if (!path.isAbsolute(moduleName) && path.extname(moduleName) === '') {
    const dirname = path.dirname(from);
    const pathToModule = path.resolve(dirname, moduleName);

    try {
      const slashedDirname = slash(dirname);

      const matches = glob
        .sync(`${pathToModule}.*`)
        .map(match => slash(match))
        .map(match => {
          const relativePath = path.posix.relative(slashedDirname, match);

          return path.posix.dirname(match) === slashedDirname
            ? `./${relativePath}`
            : relativePath;
        })
        .map(match => `\t'${match}'`)
        .join('\n');

      if (matches) {
        const foundMessage = `\n\nHowever, Jest was able to find:\n${matches}`;

        const mappedModuleFileExtensions = moduleFileExtensions
          .map(ext => `'${ext}'`)
          .join(', ');

        return (
          foundMessage +
          "\n\nYou might want to include a file extension in your import, or update your 'moduleFileExtensions', which is currently " +
          `[${mappedModuleFileExtensions}].\n\nSee https://jestjs.io/docs/en/configuration#modulefileextensions-array-string`
        );
      }
    } catch (ignored) {}
  }

  return '';
};
