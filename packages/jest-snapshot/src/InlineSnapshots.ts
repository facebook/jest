/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import type {PluginItem} from '@babel/core';
import type {Expression, File, Program} from '@babel/types';
import * as fs from 'graceful-fs';
import type {
  CustomParser as PrettierCustomParser,
  BuiltInParserName as PrettierParserName,
} from 'prettier';
import semver = require('semver');
import type {Config} from '@jest/types';
import type {Frame} from 'jest-message-util';
import {escapeBacktickString} from './utils';

// prettier-ignore
const babelTraverse = (
  // @ts-expect-error requireOutside Babel transform
  requireOutside('@babel/traverse') as typeof import('@babel/traverse')
).default;
// prettier-ignore
const generate = (
  // @ts-expect-error requireOutside Babel transform
  requireOutside('@babel/generator') as typeof import('@babel/generator')
).default;
// @ts-expect-error requireOutside Babel transform
const {file, templateElement, templateLiteral} = requireOutside(
  '@babel/types',
) as typeof import('@babel/types');
// @ts-expect-error requireOutside Babel transform
const {parseSync} = requireOutside(
  '@babel/core',
) as typeof import('@babel/core');

type Prettier = typeof import('prettier');

export type InlineSnapshot = {
  snapshot: string;
  frame: Frame;
  node?: Expression;
};

export function saveInlineSnapshots(
  snapshots: Array<InlineSnapshot>,
  prettierPath: Config.Path,
): void {
  let prettier: Prettier | null = null;
  if (prettierPath) {
    try {
      // @ts-expect-error requireOutside Babel transform
      prettier = requireOutside(prettierPath) as Prettier;
    } catch {
      // Continue even if prettier is not installed.
    }
  }

  const snapshotsByFile = groupSnapshotsByFile(snapshots);

  for (const sourceFilePath of Object.keys(snapshotsByFile)) {
    saveSnapshotsForFile(
      snapshotsByFile[sourceFilePath],
      sourceFilePath,
      prettier && semver.gte(prettier.version, '1.5.0') ? prettier : undefined,
    );
  }
}

const saveSnapshotsForFile = (
  snapshots: Array<InlineSnapshot>,
  sourceFilePath: Config.Path,
  prettier?: Prettier,
) => {
  const sourceFile = fs.readFileSync(sourceFilePath, 'utf8');

  // TypeScript projects may not have a babel config; make sure they can be parsed anyway.
  const presets = [require.resolve('babel-preset-current-node-syntax')];
  const plugins: Array<PluginItem> = [];
  if (/\.tsx?$/.test(sourceFilePath)) {
    plugins.push([
      require.resolve('@babel/plugin-syntax-typescript'),
      {isTSX: sourceFilePath.endsWith('x')},
      // unique name to make sure Babel does not complain about a possible duplicate plugin.
      'TypeScript syntax plugin added by Jest snapshot',
    ]);
  }

  // Record the matcher names seen during traversal and pass them down one
  // by one to formatting parser.
  const snapshotMatcherNames: Array<string> = [];

  const ast = parseSync(sourceFile, {
    filename: sourceFilePath,
    plugins,
    presets,
    root: path.dirname(sourceFilePath),
  });
  if (!ast) {
    throw new Error(`jest-snapshot: Failed to parse ${sourceFilePath}`);
  }
  traverseAst(snapshots, ast, snapshotMatcherNames);

  // substitute in the snapshots in reverse order, so slice calculations aren't thrown off.
  const sourceFileWithSnapshots = snapshots.reduceRight(
    (sourceSoFar, nextSnapshot) => {
      if (
        !nextSnapshot.node ||
        typeof nextSnapshot.node.start !== 'number' ||
        typeof nextSnapshot.node.end !== 'number'
      ) {
        throw new Error('Jest: no snapshot insert location found');
      }
      return (
        sourceSoFar.slice(0, nextSnapshot.node.start) +
        generate(nextSnapshot.node, {retainLines: true}).code.trim() +
        sourceSoFar.slice(nextSnapshot.node.end)
      );
    },
    sourceFile,
  );

  const newSourceFile = prettier
    ? runPrettier(
        prettier,
        sourceFilePath,
        sourceFileWithSnapshots,
        snapshotMatcherNames,
      )
    : sourceFileWithSnapshots;

  if (newSourceFile !== sourceFile) {
    fs.writeFileSync(sourceFilePath, newSourceFile);
  }
};

const groupSnapshotsBy =
  (createKey: (inlineSnapshot: InlineSnapshot) => string) =>
  (snapshots: Array<InlineSnapshot>) =>
    snapshots.reduce<Record<string, Array<InlineSnapshot>>>(
      (object, inlineSnapshot) => {
        const key = createKey(inlineSnapshot);
        return {...object, [key]: (object[key] || []).concat(inlineSnapshot)};
      },
      {},
    );

const groupSnapshotsByFrame = groupSnapshotsBy(({frame: {line, column}}) =>
  typeof line === 'number' && typeof column === 'number'
    ? `${line}:${column - 1}`
    : '',
);
const groupSnapshotsByFile = groupSnapshotsBy(({frame: {file}}) => file);

const indent = (snapshot: string, numIndents: number, indentation: string) => {
  const lines = snapshot.split('\n');
  // Prevent re-indentation of inline snapshots.
  if (
    lines.length >= 2 &&
    lines[1].startsWith(indentation.repeat(numIndents + 1))
  ) {
    return snapshot;
  }

  return lines
    .map((line, index) => {
      if (index === 0) {
        // First line is either a 1-line snapshot or a blank line.
        return line;
      } else if (index !== lines.length - 1) {
        // Do not indent empty lines.
        if (line === '') {
          return line;
        }

        // Not last line, indent one level deeper than expect call.
        return indentation.repeat(numIndents + 1) + line;
      } else {
        // The last line should be placed on the same level as the expect call.
        return indentation.repeat(numIndents) + line;
      }
    })
    .join('\n');
};

const resolveAst = (fileOrProgram: any): File => {
  // Flow uses a 'Program' parent node, babel expects a 'File'.
  let ast = fileOrProgram;
  if (ast.type !== 'File') {
    ast = file(ast, ast.comments, ast.tokens);
    delete ast.program.comments;
  }
  return ast;
};

const traverseAst = (
  snapshots: Array<InlineSnapshot>,
  fileOrProgram: File | Program,
  snapshotMatcherNames: Array<string>,
) => {
  const ast = resolveAst(fileOrProgram);
  const groupedSnapshots = groupSnapshotsByFrame(snapshots);
  const remainingSnapshots = new Set(snapshots.map(({snapshot}) => snapshot));

  babelTraverse(ast, {
    CallExpression({node}) {
      const {arguments: args, callee} = node;
      if (
        callee.type !== 'MemberExpression' ||
        callee.property.type !== 'Identifier' ||
        callee.property.loc == null
      ) {
        return;
      }
      const {line, column} = callee.property.loc.start;
      const snapshotsForFrame = groupedSnapshots[`${line}:${column}`];
      if (!snapshotsForFrame) {
        return;
      }
      if (snapshotsForFrame.length > 1) {
        throw new Error(
          'Jest: Multiple inline snapshots for the same call are not supported.',
        );
      }

      snapshotMatcherNames.push(callee.property.name);

      const snapshotIndex = args.findIndex(
        ({type}) => type === 'TemplateLiteral',
      );
      const values = snapshotsForFrame.map(inlineSnapshot => {
        inlineSnapshot.node = node;
        const {snapshot} = inlineSnapshot;
        remainingSnapshots.delete(snapshot);

        return templateLiteral(
          [templateElement({raw: escapeBacktickString(snapshot)})],
          [],
        );
      });
      const replacementNode = values[0];

      if (snapshotIndex > -1) {
        args[snapshotIndex] = replacementNode;
      } else {
        args.push(replacementNode);
      }
    },
  });

  if (remainingSnapshots.size) {
    throw new Error(`Jest: Couldn't locate all inline snapshots.`);
  }
};

const runPrettier = (
  prettier: Prettier,
  sourceFilePath: string,
  sourceFileWithSnapshots: string,
  snapshotMatcherNames: Array<string>,
) => {
  // Resolve project configuration.
  // For older versions of Prettier, do not load configuration.
  const config = prettier.resolveConfig
    ? prettier.resolveConfig.sync(sourceFilePath, {editorconfig: true})
    : null;

  // Detect the parser for the test file.
  // For older versions of Prettier, fallback to a simple parser detection.
  // @ts-expect-error
  const inferredParser: PrettierParserName | undefined = prettier.getFileInfo
    ? prettier.getFileInfo.sync(sourceFilePath).inferredParser
    : (config && typeof config.parser === 'string' && config.parser) ||
      simpleDetectParser(sourceFilePath);

  if (!inferredParser) {
    throw new Error(
      `Could not infer Prettier parser for file ${sourceFilePath}`,
    );
  }

  // Snapshots have now been inserted. Run prettier to make sure that the code is
  // formatted, except snapshot indentation. Snapshots cannot be formatted until
  // after the initial format because we don't know where the call expression
  // will be placed (specifically its indentation), so we have to do two
  // prettier.format calls back-to-back.
  return prettier.format(
    prettier.format(sourceFileWithSnapshots, {
      ...config,
      filepath: sourceFilePath,
    }),
    {
      ...config,
      filepath: sourceFilePath,
      parser: createFormattingParser(snapshotMatcherNames, inferredParser),
    },
  );
};

// This parser formats snapshots to the correct indentation.
const createFormattingParser =
  (
    snapshotMatcherNames: Array<string>,
    inferredParser: PrettierParserName,
  ): PrettierCustomParser =>
  (text, parsers, options) => {
    // Workaround for https://github.com/prettier/prettier/issues/3150
    options.parser = inferredParser;

    const ast = resolveAst(parsers[inferredParser](text, options));
    babelTraverse(ast, {
      CallExpression({node: {arguments: args, callee}}) {
        if (
          callee.type !== 'MemberExpression' ||
          callee.property.type !== 'Identifier' ||
          !snapshotMatcherNames.includes(callee.property.name) ||
          !callee.loc ||
          callee.computed
        ) {
          return;
        }

        let snapshotIndex: number | undefined;
        let snapshot: string | undefined;
        for (let i = 0; i < args.length; i++) {
          const node = args[i];
          if (node.type === 'TemplateLiteral') {
            snapshotIndex = i;
            snapshot = node.quasis[0].value.raw;
          }
        }
        if (snapshot === undefined || snapshotIndex === undefined) {
          return;
        }

        const useSpaces = !options.useTabs;
        snapshot = indent(
          snapshot,
          Math.ceil(
            useSpaces
              ? callee.loc.start.column / (options.tabWidth ?? 1)
              : callee.loc.start.column / 2, // Each tab is 2 characters.
          ),
          useSpaces ? ' '.repeat(options.tabWidth ?? 1) : '\t',
        );

        const replacementNode = templateLiteral(
          [
            templateElement({
              raw: snapshot,
            }),
          ],
          [],
        );
        args[snapshotIndex] = replacementNode;
      },
    });

    return ast;
  };

const simpleDetectParser = (filePath: Config.Path): PrettierParserName => {
  const extname = path.extname(filePath);
  if (/\.tsx?$/.test(extname)) {
    return 'typescript';
  }
  return 'babel';
};
