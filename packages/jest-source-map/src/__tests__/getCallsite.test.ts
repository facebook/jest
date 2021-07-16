/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as fs from 'graceful-fs';
import SourceMap from 'source-map-sync';
import getCallsite from '../getCallsite';

// Node 10.5.x compatibility
jest.mock('graceful-fs', () => ({
  ...jest.createMockFromModule<typeof import('fs')>('fs'),
  ReadStream: jest.requireActual('fs').ReadStream,
  WriteStream: jest.requireActual('fs').WriteStream,
}));

describe('getCallsite', () => {
  test('without source map', () => {
    const site = getCallsite(0);

    expect(site.getFileName()).toEqual(__filename);
    expect(site.getColumnNumber()).toEqual(expect.any(Number));
    expect(site.getLineNumber()).toEqual(expect.any(Number));
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  test('ignores errors when fs throws', () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Mock error');
    });

    const site = getCallsite(0, new Map([[__filename, 'mockedSourceMapFile']]));

    expect(site.getFileName()).toEqual(__filename);
    expect(site.getColumnNumber()).toEqual(expect.any(Number));
    expect(site.getLineNumber()).toEqual(expect.any(Number));
    expect(fs.readFileSync).toHaveBeenCalledWith('mockedSourceMapFile', 'utf8');
  });

  test('reads source map file to determine line and column', () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => 'file data');

    const sourceMapColumn = 1;
    const sourceMapLine = 2;

    SourceMap.SourceMapConsumer = class {
      originalPositionFor(params: Record<string, number>) {
        expect(params).toMatchObject({
          column: expect.any(Number),
          line: expect.any(Number),
        });

        return {
          column: sourceMapColumn,
          line: sourceMapLine,
        };
      }
    };

    const site = getCallsite(0, new Map([[__filename, 'mockedSourceMapFile']]));

    expect(site.getFileName()).toEqual(__filename);
    expect(site.getColumnNumber()).toEqual(sourceMapColumn);
    expect(site.getLineNumber()).toEqual(sourceMapLine);
    expect(fs.readFileSync).toHaveBeenCalledWith('mockedSourceMapFile', 'utf8');
  });
});
