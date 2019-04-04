/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

jest.mock('fs');
jest.mock('prettier');

import fs from 'fs';
import path from 'path';
import prettier from 'prettier';
import babelTraverse from '@babel/traverse';
import {Frame} from 'jest-message-util';

import {saveInlineSnapshots} from '../InlineSnapshots';

const writeFileSync = fs.writeFileSync;
const readFileSync = fs.readFileSync;
const existsSync = fs.existsSync;
const statSync = fs.statSync;
const readdirSync = fs.readdirSync;
beforeEach(() => {
  fs.writeFileSync = jest.fn();
  fs.readFileSync = jest.fn();
  fs.existsSync = jest.fn(() => true);
  (fs.statSync as jest.Mock).mockImplementation(filePath => ({
    isDirectory: () => !filePath.endsWith('.js'),
  }));
  fs.readdirSync = jest.fn(() => []);

  (prettier.resolveConfig.sync as jest.Mock).mockReset();
});
afterEach(() => {
  fs.writeFileSync = writeFileSync;
  fs.readFileSync = readFileSync;
  fs.existsSync = existsSync;
  fs.statSync = statSync;
  fs.readdirSync = readdirSync;
});

test('saveInlineSnapshots() replaces empty function call with a template literal', () => {
  const filename = path.join(__dirname, 'my.test.js');
  (fs.readFileSync as jest.Mock).mockImplementation(
    () => `expect(1).toMatchInlineSnapshot();\n`,
  );

  saveInlineSnapshots(
    [
      {
        frame: {column: 11, file: filename, line: 1} as Frame,
        snapshot: `1`,
      },
    ],
    prettier,
    babelTraverse,
  );

  expect(fs.writeFileSync).toHaveBeenCalledWith(
    filename,
    'expect(1).toMatchInlineSnapshot(`1`);\n',
  );
});

test.each([['babylon'], ['flow'], ['typescript']])(
  'saveInlineSnapshots() replaces existing template literal - %s parser',
  parser => {
    const filename = path.join(__dirname, 'my.test.js');
    (fs.readFileSync as jest.Mock).mockImplementation(
      () => 'expect(1).toMatchInlineSnapshot(`2`);\n',
    );

    (prettier.resolveConfig.sync as jest.Mock).mockReturnValue({parser});

    saveInlineSnapshots(
      [
        {
          frame: {column: 11, file: filename, line: 1} as Frame,
          snapshot: `1`,
        },
      ],
      prettier,
      babelTraverse,
    );

    expect(
      (prettier.resolveConfig.sync as jest.Mock).mock.results[0].value,
    ).toEqual({parser});

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      filename,
      'expect(1).toMatchInlineSnapshot(`1`);\n',
    );
  },
);

test('saveInlineSnapshots() replaces existing template literal with property matchers', () => {
  const filename = path.join(__dirname, 'my.test.js');
  (fs.readFileSync as jest.Mock).mockImplementation(
    () => 'expect(1).toMatchInlineSnapshot({}, `2`);\n',
  );

  saveInlineSnapshots(
    [
      {
        frame: {column: 11, file: filename, line: 1} as Frame,
        snapshot: `1`,
      },
    ],
    prettier,
    babelTraverse,
  );

  expect(fs.writeFileSync).toHaveBeenCalledWith(
    filename,
    'expect(1).toMatchInlineSnapshot({}, `1`);\n',
  );
});

test('saveInlineSnapshots() throws if frame does not match', () => {
  const filename = path.join(__dirname, 'my.test.js');
  (fs.readFileSync as jest.Mock).mockImplementation(
    () => 'expect(1).toMatchInlineSnapshot();\n',
  );

  const save = () =>
    saveInlineSnapshots(
      [
        {
          frame: {column: 2 /* incorrect */, file: filename, line: 1} as Frame,
          snapshot: `1`,
        },
      ],
      prettier,
      babelTraverse,
    );

  expect(save).toThrowError(/Couldn't locate all inline snapshots./);
});

test('saveInlineSnapshots() throws if multiple calls to to the same location', () => {
  const filename = path.join(__dirname, 'my.test.js');
  (fs.readFileSync as jest.Mock).mockImplementation(
    () => 'expect(1).toMatchInlineSnapshot();\n',
  );

  const frame = {column: 11, file: filename, line: 1} as Frame;
  const save = () =>
    saveInlineSnapshots(
      [{frame, snapshot: `1`}, {frame, snapshot: `2`}],
      prettier,
      babelTraverse,
    );

  expect(save).toThrowError(
    /Multiple inline snapshots for the same call are not supported./,
  );
});

test('saveInlineSnapshots() uses escaped backticks', () => {
  const filename = path.join(__dirname, 'my.test.js');
  (fs.readFileSync as jest.Mock).mockImplementation(
    () => 'expect("`").toMatchInlineSnapshot();\n',
  );

  const frame = {column: 13, file: filename, line: 1} as Frame;
  saveInlineSnapshots([{frame, snapshot: '`'}], prettier, babelTraverse);

  expect(fs.writeFileSync).toHaveBeenCalledWith(
    filename,
    'expect("`").toMatchInlineSnapshot(`\\``);\n',
  );
});

test('saveInlineSnapshots() works with non-literals in expect call', () => {
  const filename = path.join(__dirname, 'my.test.js');
  (fs.readFileSync as jest.Mock).mockImplementation(
    () => `expect({a: 'a'}).toMatchInlineSnapshot();\n`,
  );
  (prettier.resolveConfig.sync as jest.Mock).mockReturnValue({
    bracketSpacing: false,
    singleQuote: true,
  });

  saveInlineSnapshots(
    [
      {
        frame: {column: 18, file: filename, line: 1} as Frame,
        snapshot: `{a: 'a'}`,
      },
    ],
    prettier,
    babelTraverse,
  );

  expect(fs.writeFileSync).toHaveBeenCalledWith(
    filename,
    "expect({a: 'a'}).toMatchInlineSnapshot(`{a: 'a'}`);\n",
  );
});

test('saveInlineSnapshots() indents multi-line snapshots with spaces', () => {
  const filename = path.join(__dirname, 'my.test.js');
  (fs.readFileSync as jest.Mock).mockImplementation(
    () =>
      "it('is a test', () => {\n" +
      "  expect({a: 'a'}).toMatchInlineSnapshot();\n" +
      '});\n',
  );
  (prettier.resolveConfig.sync as jest.Mock).mockReturnValue({
    bracketSpacing: false,
    singleQuote: true,
  });

  saveInlineSnapshots(
    [
      {
        frame: {column: 20, file: filename, line: 2} as Frame,
        snapshot: `\nObject {\n  a: 'a'\n}\n`,
      },
    ],
    prettier,
    babelTraverse,
  );

  expect(fs.writeFileSync).toHaveBeenCalledWith(
    filename,
    "it('is a test', () => {\n" +
      "  expect({a: 'a'}).toMatchInlineSnapshot(`\n" +
      '    Object {\n' +
      "      a: 'a'\n" +
      '    }\n' +
      '  `);\n' +
      '});\n',
  );
});

test('saveInlineSnapshots() indents multi-line snapshots with tabs', () => {
  const filename = path.join(__dirname, 'my.test.js');
  (fs.readFileSync as jest.Mock).mockImplementation(
    () =>
      "it('is a test', () => {\n" +
      "  expect({a: 'a'}).toMatchInlineSnapshot();\n" +
      '});\n',
  );
  (prettier.resolveConfig.sync as jest.Mock).mockReturnValue({
    bracketSpacing: false,
    singleQuote: true,
    useTabs: true,
  });

  saveInlineSnapshots(
    [
      {
        frame: {column: 20, file: filename, line: 2} as Frame,
        snapshot: `\nObject {\n  a: 'a'\n}\n`,
      },
    ],
    prettier,
    babelTraverse,
  );

  expect(fs.writeFileSync).toHaveBeenCalledWith(
    filename,
    "it('is a test', () => {\n" +
      "\texpect({a: 'a'}).toMatchInlineSnapshot(`\n" +
      '\t\tObject {\n' +
      "\t\t  a: 'a'\n" +
      '\t\t}\n' +
      '\t`);\n' +
      '});\n',
  );
});

test('saveInlineSnapshots() indents snapshots after prettier reformats', () => {
  const filename = path.join(__dirname, 'my.test.js');
  (fs.readFileSync as jest.Mock).mockImplementation(
    () => "it('is a test', () => expect({a: 'a'}).toMatchInlineSnapshot());\n",
  );
  (prettier.resolveConfig.sync as jest.Mock).mockReturnValue({
    bracketSpacing: false,
    singleQuote: true,
  });

  saveInlineSnapshots(
    [
      {
        frame: {column: 40, file: filename, line: 1} as Frame,
        snapshot: `\nObject {\n  a: 'a'\n}\n`,
      },
    ],
    prettier,
    babelTraverse,
  );

  expect(fs.writeFileSync).toHaveBeenCalledWith(
    filename,
    "it('is a test', () =>\n" +
      "  expect({a: 'a'}).toMatchInlineSnapshot(`\n" +
      '    Object {\n' +
      "      a: 'a'\n" +
      '    }\n' +
      '  `));\n',
  );
});
