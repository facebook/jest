/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import * as path from 'path';
import * as fs from 'graceful-fs';
import H from '../constants';
import {extractMetadata, getSha1} from '../worker';

jest.mock('graceful-fs', () => {
  const path = require('path');
  const mockFs = {
    [path.join('/project', 'fruits', 'Banana.js')]: `
        const Strawberry = require("Strawberry");
      `,
    [path.join('/project', 'fruits', 'Pear.js')]: `
        const Banana = require("Banana");
        const Strawberry = require('Strawberry');
        const Lime = loadModule('Lime');
      `,
    [path.join('/project', 'fruits', 'Strawberry.js')]: `
        // Strawberry!
      `,
    [path.join('/project', 'fruits', 'apple.png')]: Buffer.from([
      137,
      80,
      78,
      71,
      13,
      10,
      26,
      10,
    ]),
    [path.join('/project', 'package.json')]: `
        {
          "name": "haste-package",
          "main": "foo.js"
        }
      `,
  };

  return {
    ...jest.createMockFromModule('graceful-fs'),
    readFileSync: jest.fn((path, options) => {
      if (mockFs[path]) {
        return options === 'utf8' ? mockFs[path] : Buffer.from(mockFs[path]);
      }

      throw new Error(`Cannot read path '${path}'.`);
    }),
  };
});

const rootDir = '/project';

describe('extractMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses JavaScript files and extracts module information', async () => {
    expect(
      await extractMetadata({
        computeDependencies: true,
        filePath: path.join('/project', 'fruits', 'Pear.js'),
        rootDir,
      }),
    ).toEqual({
      dependencies: ['Banana', 'Strawberry'],
    });

    expect(
      await extractMetadata({
        computeDependencies: true,
        filePath: path.join('/project', 'fruits', 'Strawberry.js'),
        rootDir,
      }),
    ).toEqual({
      dependencies: [],
    });
  });

  it('accepts a custom dependency extractor', async () => {
    expect(
      await extractMetadata({
        computeDependencies: true,
        dependencyExtractor: path.join(__dirname, 'dependencyExtractor.js'),
        filePath: path.join('/project', 'fruits', 'Pear.js'),
        rootDir,
      }),
    ).toEqual({
      dependencies: ['Banana', 'Strawberry', 'Lime'],
    });
  });

  it('delegates to hasteImplModulePath for getting the id', async () => {
    expect(
      await extractMetadata({
        computeDependencies: true,
        filePath: path.join('/project', 'fruits', 'Pear.js'),
        hasteImplModulePath: require.resolve('./haste_impl.js'),
        rootDir,
      }),
    ).toEqual({
      dependencies: ['Banana', 'Strawberry'],
      id: 'Pear',
      module: [path.join('fruits', 'Pear.js'), H.MODULE],
    });

    expect(
      await extractMetadata({
        computeDependencies: true,
        filePath: path.join('/project', 'fruits', 'Strawberry.js'),
        rootDir,
      }),
    ).toEqual({
      dependencies: [],
      id: 'Strawberry',
      module: [path.join('fruits', 'Strawberry.js'), H.MODULE],
    });
  });

  it('parses package.json files as haste packages', async () => {
    expect(
      await extractMetadata({
        computeDependencies: true,
        filePath: path.join('/project', 'package.json'),
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
      await extractMetadata({
        computeDependencies: true,
        filePath: '/kiwi.js',
        rootDir,
      });
    } catch (err) {
      error = err;
    }

    expect(error.message).toEqual(`Cannot read path '/kiwi.js'.`);
  });

  it('simply computes SHA-1s when requested (works well with binary data)', async () => {
    expect(
      await getSha1({
        computeSha1: true,
        filePath: path.join('/project', 'fruits', 'apple.png'),
        rootDir,
      }),
    ).toEqual({sha1: '4caece539b039b16e16206ea2478f8c5ffb2ca05'});

    expect(
      await getSha1({
        computeSha1: false,
        filePath: path.join('/project', 'fruits', 'Banana.js'),
        rootDir,
      }),
    ).toEqual({sha1: null});

    expect(
      await getSha1({
        computeSha1: true,
        filePath: path.join('/project', 'fruits', 'Banana.js'),
        rootDir,
      }),
    ).toEqual({sha1: '7772b628e422e8cf59c526be4bb9f44c0898e3d1'});

    expect(
      await getSha1({
        computeSha1: true,
        filePath: path.join('/project', 'fruits', 'Pear.js'),
        rootDir,
      }),
    ).toEqual({sha1: 'c7a7a68a1c8aaf452669dd2ca52ac4a434d25552'});

    await expect(
      getSha1({computeSha1: true, filePath: '/i/dont/exist.js', rootDir}),
    ).rejects.toThrow();
  });

  it('avoids computing dependencies if not requested and Haste does not need it', async () => {
    expect(
      await extractMetadata({
        computeDependencies: false,
        filePath: path.join('/project', 'fruits', 'Pear.js'),
        hasteImplModulePath: path.resolve(__dirname, 'haste_impl.js'),
        rootDir,
      }),
    ).toEqual({
      dependencies: undefined,
      id: 'Pear',
      module: [path.join('fruits', 'Pear.js'), H.MODULE],
      sha1: undefined,
    });

    // Ensure not disk access happened.
    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(fs.readFile).not.toHaveBeenCalled();
  });
});
