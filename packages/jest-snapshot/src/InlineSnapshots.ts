/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from 'fs';
import path from 'path';
import semver from 'semver';
import {
  templateElement,
  templateLiteral,
  file,
  CallExpression,
} from '@babel/types';
import {Frame} from 'jest-message-util';

import {Config} from '@jest/types';
import {escapeBacktickString} from './utils';

export type InlineSnapshot = {
  snapshot: string;
  frame: Frame;
};

export const saveInlineSnapshots = (
  snapshots: Array<InlineSnapshot>,
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
  sourceFilePath: Config.Path,
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

  // Insert snapshots using the custom parser API. After insertion, the code is
  // formatted, except snapshot indentation. Snapshots cannot be formatted until
  // after the initial format because we don't know where the call expression
  // will be placed (specifically its indentation).
  const newSourceFile = prettier.format(sourceFile, {
    ...config,
    filepath: sourceFilePath,
    parser: createInsertionParser(snapshots, inferredParser, babelTraverse),
  });

  // Format the snapshots using the custom parser API.
  const formattedNewSourceFile = prettier.format(newSourceFile, {
    ...config,
    filepath: sourceFilePath,
    parser: createFormattingParser(inferredParser, babelTraverse),
  });

  if (formattedNewSourceFile !== sourceFile) {
    fs.writeFileSync(sourceFilePath, formattedNewSourceFile);
  }
};

const groupSnapshotsBy = (
  createKey: (inlineSnapshot: InlineSnapshot) => string,
) => (snapshots: Array<InlineSnapshot>) =>
  snapshots.reduce<{[key: string]: Array<InlineSnapshot>}>(
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
  return lines
    .map((line, index) => {
      if (index === 0) {
        // First line is either a 1-line snapshot or a blank line.
        return line;
      } else if (index !== lines.length - 1) {
        // Not last line, indent one level deeper than expect call.
        return indentation.repeat(numIndents + 1) + line;
      } else {
        // The last line should be placed on the same level as the expect call.
        return indentation.repeat(numIndents) + line;
      }
    })
    .join('\n');
};

const getAst = (
  parsers: {[key: string]: (text: string) => any},
  inferredParser: string,
  text: string,
) => {
  // Flow uses a 'Program' parent node, babel expects a 'File'.
  let ast = parsers[inferredParser](text);
  if (ast.type !== 'File') {
    ast = file(ast, ast.comments, ast.tokens);
    delete ast.program.comments;
  }
  return ast;
};

// This parser inserts snapshots into the AST.
const createInsertionParser = (
  snapshots: Array<InlineSnapshot>,
  inferredParser: string,
  babelTraverse: Function,
) => (
  text: string,
  parsers: {[key: string]: (text: string) => any},
  options: any,
) => {
  // Workaround for https://github.com/prettier/prettier/issues/3150
  options.parser = inferredParser;

  const groupedSnapshots = groupSnapshotsByFrame(snapshots);
  const remainingSnapshots = new Set(snapshots.map(({snapshot}) => snapshot));

  const ast = getAst(parsers, inferredParser, text);
  babelTraverse(ast, {
    CallExpression({node: {arguments: args, callee}}: {node: CallExpression}) {
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

// This parser formats snapshots to the correct indentation.
const createFormattingParser = (
  inferredParser: string,
  babelTraverse: Function,
) => (
  text: string,
  parsers: {[key: string]: (text: string) => any},
  options: any,
) => {
  // Workaround for https://github.com/prettier/prettier/issues/3150
  options.parser = inferredParser;

  const ast = getAst(parsers, inferredParser, text);
  babelTraverse(ast, {
    CallExpression({node: {arguments: args, callee}}: {node: CallExpression}) {
      if (
        callee.type !== 'MemberExpression' ||
        callee.property.type !== 'Identifier' ||
        callee.property.name !== 'toMatchInlineSnapshot' ||
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
            ? callee.loc.start.column / options.tabWidth
            : callee.loc.start.column / 2, // Each tab is 2 characters.
        ),
        useSpaces ? ' '.repeat(options.tabWidth) : '\t',
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

const simpleDetectParser = (filePath: Config.Path) => {
  const extname = path.extname(filePath);
  if (/tsx?$/.test(extname)) {
    return 'typescript';
  }
  return 'babylon';
};
