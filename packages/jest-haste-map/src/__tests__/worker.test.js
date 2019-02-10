/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import path from 'path';
import fs from 'graceful-fs';
import {skipSuiteOnWindows} from '../../../../scripts/ConditionalTest';

import H from '../constants';

const {worker, getSha1} = require('../worker');

const rootDir = '/project';
let mockFs;
let readFileSync;
let readFile;

describe('worker', () => {
  skipSuiteOnWindows();

  beforeEach(() => {
    mockFs = {
      '/project/fruits/Banana.js': `
        const Strawberry = require("Strawberry");
      `,
      '/project/fruits/Pear.js': `
        const Banana = require("Banana");
        const Strawberry = require('Strawberry');
        const Lime = loadModule('Lime');
      `,
      '/project/fruits/Strawberry.js': `
        // Strawberry!
      `,
      '/project/fruits/apple.png': Buffer.from([
        137,
        80,
        78,
        71,
        13,
        10,
        26,
        10,
      ]),
      '/project/package.json': `
        {
          "name": "haste-package",
          "main": "foo.js"
        }
      `,
    };

    readFileSync = fs.readFileSync;
    readFile = fs.readFile;

    fs.readFileSync = jest.fn((path, options) => {
      if (mockFs[path]) {
        return options === 'utf8' ? mockFs[path] : Buffer.from(mockFs[path]);
      }

      throw new Error(`Cannot read path '${path}'.`);
    });

    fs.readFile = jest.fn(readFile);
  });

  afterEach(() => {
    fs.readFileSync = readFileSync;
    fs.readFile = readFile;
  });

  it('parses JavaScript files and extracts module information', async () => {
    expect(
      await worker({
        computeDependencies: true,
        filePath: '/project/fruits/Pear.js',
        rootDir,
      }),
    ).toEqual({
      dependencies: ['Banana', 'Strawberry'],
    });

    expect(
      await worker({
        computeDependencies: true,
        filePath: '/project/fruits/Strawberry.js',
        rootDir,
      }),
    ).toEqual({
      dependencies: [],
    });
  });

  it('accepts a custom dependency extractor', async () => {
    expect(
      await worker({
        computeDependencies: true,
        dependencyExtractor: path.join(__dirname, 'dependencyExtractor.js'),
        filePath: '/project/fruits/Pear.js',
        rootDir,
      }),
    ).toEqual({
      dependencies: ['Banana', 'Strawberry', 'Lime'],
    });
  });

  it('delegates to hasteImplModulePath for getting the id', async () => {
    expect(
      await worker({
        computeDependencies: true,
        filePath: '/project/fruits/Pear.js',
        hasteImplModulePath: require.resolve('./haste_impl.js'),
        rootDir,
      }),
    ).toEqual({
      dependencies: ['Banana', 'Strawberry'],
      id: 'Pear',
      module: ['fruits/Pear.js', H.MODULE],
    });

    expect(
      await worker({
        computeDependencies: true,
        filePath: '/project/fruits/Strawberry.js',
        rootDir,
      }),
    ).toEqual({
      dependencies: [],
      id: 'Strawberry',
      module: ['fruits/Strawberry.js', H.MODULE],
    });
  });

  it('parses package.json files as haste packages', async () => {
    expect(
      await worker({
        computeDependencies: true,
        filePath: '/project/package.json',
        rootDir,
      }),
    ).toEqual({
      dependencies: undefined,
      id: 'haste-package',
      module: ['package.json', H.PACKAGE],
    });
  });

  it('returns an error when a file cannot be accessed', async () => {
    let error = null;

    try {
      await worker({computeDependencies: true, filePath: '/kiwi.js', rootDir});
    } catch (err) {
      error = err;
    }

    expect(error.message).toEqual(`Cannot read path '/kiwi.js'.`);
  });

  it('simply computes SHA-1s when requested (works well with binary data)', async () => {
    expect(
      await getSha1({
        computeSha1: true,
        filePath: '/project/fruits/apple.png',
        rootDir,
      }),
    ).toEqual({sha1: '4caece539b039b16e16206ea2478f8c5ffb2ca05'});

    expect(
      await getSha1({
        computeSha1: false,
        filePath: '/project/fruits/Banana.js',
        rootDir,
      }),
    ).toEqual({sha1: null});

    expect(
      await getSha1({
        computeSha1: true,
        filePath: '/project/fruits/Banana.js',
        rootDir,
      }),
    ).toEqual({sha1: '7772b628e422e8cf59c526be4bb9f44c0898e3d1'});

    expect(
      await getSha1({
        computeSha1: true,
        filePath: '/project/fruits/Pear.js',
        rootDir,
      }),
    ).toEqual({sha1: 'c7a7a68a1c8aaf452669dd2ca52ac4a434d25552'});

    await expect(
      getSha1({computeSha1: true, filePath: '/i/dont/exist.js', rootDir}),
    ).rejects.toThrow();
  });

  it('avoids computing dependencies if not requested and Haste does not need it', async () => {
    expect(
      await worker({
        computeDependencies: false,
        filePath: '/project/fruits/Pear.js',
        hasteImplModulePath: path.resolve(__dirname, 'haste_impl.js'),
        rootDir,
      }),
    ).toEqual({
      dependencies: undefined,
      id: 'Pear',
      module: ['fruits/Pear.js', H.MODULE],
      sha1: undefined,
    });

    // Ensure not disk access happened.
    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(fs.readFile).not.toHaveBeenCalled();
  });
});
