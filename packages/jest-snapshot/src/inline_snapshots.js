/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import fs from 'fs';
import semver from 'semver';
import path from 'path';
import {templateElement, templateLiteral, file} from '@babel/types';

import type {Path} from 'types/Config';
import {escapeBacktickString} from './utils';

export type InlineSnapshot = {|
  snapshot: string,
  frame: {line: number, column: number, file: string},
|};

export const saveInlineSnapshots = (
  snapshots: InlineSnapshot[],
  prettier: any,
  babelTraverse: Function,
) => {
  if (!prettier) {
    throw new Error(
      `Jest: Inline Snapshots requires Prettier.\n` +
        `Please ensure "prettier" is installed in your project.`,
    );
  }

  // Custom parser API was added in 1.5.0
  if (semver.lt(prettier.version, '1.5.0')) {
    throw new Error(
      `Jest: Inline Snapshots require prettier>=1.5.0.\n` +
        `Please upgrade "prettier".`,
    );
  }

  const snapshotsByFile = groupSnapshotsByFile(snapshots);

  for (const sourceFilePath of Object.keys(snapshotsByFile)) {
    saveSnapshotsForFile(
      snapshotsByFile[sourceFilePath],
      sourceFilePath,
      prettier,
      babelTraverse,
    );
  }
};

const saveSnapshotsForFile = (
  snapshots: Array<InlineSnapshot>,
  sourceFilePath: Path,
  prettier: any,
  babelTraverse: Function,
) => {
  const sourceFile = fs.readFileSync(sourceFilePath, 'utf8');

  // Resolve project configuration.
  // For older versions of Prettier, do not load configuration.
  const config = prettier.resolveConfig
    ? prettier.resolveConfig.sync(sourceFilePath, {
        editorconfig: true,
      })
    : null;

  // Detect the parser for the test file.
  // For older versions of Prettier, fallback to a simple parser detection.
  const inferredParser = prettier.getFileInfo
    ? prettier.getFileInfo.sync(sourceFilePath).inferredParser
    : (config && config.parser) || simpleDetectParser(sourceFilePath);

  // Format the source code using the custom parser API.
  const newSourceFile = prettier.format(sourceFile, {
    ...config,
    filepath: sourceFilePath,
    parser: createParser(snapshots, inferredParser, babelTraverse),
  });

  if (newSourceFile !== sourceFile) {
    fs.writeFileSync(sourceFilePath, newSourceFile);
  }
};

const groupSnapshotsBy = (createKey: InlineSnapshot => string) => (
  snapshots: Array<InlineSnapshot>,
) =>
  snapshots.reduce((object, inlineSnapshot) => {
    const key = createKey(inlineSnapshot);
    return {...object, [key]: (object[key] || []).concat(inlineSnapshot)};
  }, {});

const groupSnapshotsByFrame = groupSnapshotsBy(
  ({frame: {line, column}}) => `${line}:${column - 1}`,
);
const groupSnapshotsByFile = groupSnapshotsBy(({frame: {file}}) => file);

const createParser = (
  snapshots: InlineSnapshot[],
  inferredParser: string,
  babelTraverse: Function,
) => (
  text: string,
  parsers: {[key: string]: (string) => any},
  options: any,
) => {
  // Workaround for https://github.com/prettier/prettier/issues/3150
  options.parser = inferredParser;

  const groupedSnapshots = groupSnapshotsByFrame(snapshots);
  const remainingSnapshots = new Set(snapshots.map(({snapshot}) => snapshot));
  let ast = parsers[inferredParser](text);

  // Flow uses a 'Program' parent node, babel expects a 'File'.
  if (ast.type !== 'File') {
    ast = file(ast, ast.comments, ast.tokens);
    delete ast.program.comments;
  }

  babelTraverse(ast, {
    CallExpression({node: {arguments: args, callee}}) {
      if (
        callee.type !== 'MemberExpression' ||
        callee.property.type !== 'Identifier'
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
      const snapshotIndex = args.findIndex(
        ({type}) => type === 'TemplateLiteral',
      );
      const values = snapshotsForFrame.map(({snapshot}) => {
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

  return ast;
};

const simpleDetectParser = (filePath: Path) => {
  const extname = path.extname(filePath);
  if (/tsx?$/.test(extname)) {
    return 'typescript';
  }
  return 'babylon';
};
