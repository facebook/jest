/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {wrap} from 'jest-snapshot-serializer-raw';
import {makeGlobalConfig, makeProjectConfig} from '@jest/test-utils';
import type {Config} from '@jest/types';
import type {Options, ShouldInstrumentOptions, Transformer} from '../types';

jest
  .mock('graceful-fs', () =>
    // Node 10.5.x compatibility
    ({
      ...jest.createMockFromModule('fs'),
      ReadStream: jest.requireActual('fs').ReadStream,
      WriteStream: jest.requireActual('fs').WriteStream,
      readFileSync: jest.fn(path => {
        if (mockFs[path]) {
          return mockFs[path];
        }

        throw new Error(`Cannot read path '${path}'.`);
      }),
      statSync: path => ({
        isFile: () => !!mockFs[path],
        mtime: {getTime: () => 42, toString: () => '42'},
      }),
    }),
  )
  .mock('graceful-fs', () => ({
    ...jest.requireActual('graceful-fs'),
    realPathSync: {
      native: dirInput => dirInput,
    },
  }))
  .mock('jest-haste-map', () => ({
    getCacheFilePath: (cacheDir: string, baseDir: string) => cacheDir + baseDir,
  }))
  .mock('jest-util', () => ({
    ...jest.requireActual('jest-util'),
    createDirectory: jest.fn(),
  }))
  .mock('path', () => jest.requireActual('path').posix);

jest.mock(
  'test_preprocessor',
  () => {
    const escapeStrings = (str: string) => str.replace(/'/, `'`);

    const transformer: Transformer = {
      getCacheKey: jest.fn(() => 'ab'),
      process: (content, filename, config) => require('dedent')`
          const TRANSFORMED = {
            filename: '${escapeStrings(filename)}',
            script: '${escapeStrings(content)}',
            config: '${escapeStrings(JSON.stringify(config))}',
          };
        `,
    };

    return transformer;
  },
  {virtual: true},
);

jest.mock(
  'configureable-preprocessor',
  () => ({
    createTransformer: jest.fn(() => ({
      process: jest.fn(() => 'processedCode'),
    })),
  }),
  {virtual: true},
);

jest.mock(
  'cache_fs_preprocessor',
  () => ({
    getCacheKey: jest.fn(() => 'ab'),
    process: jest.fn(() => 'processedCode'),
  }),
  {virtual: true},
);

jest.mock(
  'preprocessor-with-sourcemaps',
  () => ({
    getCacheKey: jest.fn(() => 'ab'),
    process: jest.fn(),
  }),
  {virtual: true},
);

jest.mock(
  'css-preprocessor',
  () => {
    const transformer: Transformer = {
      getCacheKey: jest.fn(() => 'cd'),
      process: (content, filename) => jest.requireActual('dedent')`
          module.exports = {
            filename: ${filename},
            rawFirstLine: ${content.split('\n')[0]},
          };
        `,
    };

    return transformer;
  },
  {virtual: true},
);

jest.mock('passthrough-preprocessor', () => ({process: jest.fn()}), {
  virtual: true,
});

// Bad preprocessor
jest.mock('skipped-required-props-preprocessor', () => ({}), {virtual: true});

// Bad preprocessor
jest.mock(
  'skipped-required-create-transformer-props-preprocessor',
  () => ({
    createTransformer() {
      return {};
    },
  }),
  {virtual: true},
);

jest.mock(
  'skipped-process-method-preprocessor',
  () => ({
    createTransformer() {
      return {process: jest.fn(() => 'code')};
    },
  }),
  {virtual: true},
);

const getCachePath = (
  mockFs: Record<Config.Path, string>,
  config: Config.ProjectConfig,
) => {
  for (const path in mockFs) {
    if (path.startsWith(config.cacheDirectory)) {
      return path;
    }
  }
  return null;
};

let createScriptTransformer: typeof import('../ScriptTransformer').createScriptTransformer;
let config: Config.ProjectConfig;
let fs: typeof import('fs');
let mockFs: Record<Config.Path, string>;
let object: <T>(input: T) => T;
let writeFileAtomic: typeof import('write-file-atomic');

jest.mock('write-file-atomic', () => ({
  sync: jest.fn().mockImplementation((filePath, data) => {
    mockFs[filePath] = data;
  }),
}));

describe('ScriptTransformer', () => {
  const reset = () => {
    jest.resetModules();

    object = data => Object.assign(Object.create(null), data);

    mockFs = object({
      '/fruits/banana.js': ['module.exports = "banana";'].join('\n'),
      '/fruits/banana:colon.js': ['module.exports = "bananaColon";'].join('\n'),
      '/fruits/grapefruit.js': [
        'module.exports = function () { return "grapefruit"; }',
      ].join('\n'),
      '/fruits/kiwi.js': ['module.exports = () => "kiwi";'].join('\n'),
      '/fruits/package.json': ['{"name": "fruits"}'].join('\n'),
      '/node_modules/react.js': ['module.exports = "react";'].join('\n'),
      '/styles/App.css': ['root {', '  font-family: Helvetica;', '}'].join(
        '\n',
      ),
    });

    fs = require('graceful-fs');
    fs.readFileSync = jest.fn((path, options) => {
      invariant(typeof path === 'string');

      expect(options).toBe('utf8');
      if (mockFs[path]) {
        return mockFs[path];
      }

      throw new Error(`Cannot read path '${path}'.`);
    });
    fs.writeFileSync = jest.fn((path, data, options) => {
      invariant(typeof path === 'string');
      expect(options).toBe('utf8');
      mockFs[path] = data;
    });

    fs.unlinkSync = jest.fn();
    fs.statSync = jest.fn(path => ({
      isFile() {
        invariant(typeof path === 'string');
        return !!mockFs[path];
      },
      mtime: {getTime: () => 42, toString: () => '42'},
    }));

    fs.existsSync = jest.fn(path => {
      invariant(typeof path === 'string');

      return !!mockFs[path];
    });

    writeFileAtomic = require('write-file-atomic');

    config = makeProjectConfig({
      cache: true,
      cacheDirectory: '/cache/',
      id: 'test',
      rootDir: '/',
      transformIgnorePatterns: ['/node_modules/'],
    });

    createScriptTransformer = require('../ScriptTransformer')
      .createScriptTransformer;
  };

  beforeEach(reset);
  afterEach(() => jest.unmock('../shouldInstrument'));

  it('transforms a file properly', async () => {
    const scriptTransformer = await createScriptTransformer(config);
    const transformedBananaWithCoverage = scriptTransformer.transform(
      '/fruits/banana.js',
      getCoverageOptions({collectCoverage: true}),
    );

    expect(wrap(transformedBananaWithCoverage.code)).toMatchSnapshot();

    // no-cache case
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync).toBeCalledWith('/fruits/banana.js', 'utf8');

    // in-memory cache
    const transformedBananaWithCoverageAgain = scriptTransformer.transform(
      '/fruits/banana.js',
      getCoverageOptions({collectCoverage: true}),
    );
    expect(transformedBananaWithCoverageAgain).toBe(
      transformedBananaWithCoverage,
    );

    const transformedKiwiWithCoverage = scriptTransformer.transform(
      '/fruits/kiwi.js',
      getCoverageOptions({collectCoverage: true}),
    );
    expect(wrap(transformedKiwiWithCoverage.code)).toMatchSnapshot();

    expect(transformedBananaWithCoverage.code).not.toEqual(
      transformedKiwiWithCoverage.code,
    );
    expect(transformedBananaWithCoverage.code).not.toMatch(/instrumented kiwi/);

    // If we disable coverage, we get a different result.
    const transformedKiwiWithoutCoverage = scriptTransformer.transform(
      '/fruits/kiwi.js',
      getCoverageOptions({collectCoverage: false}),
    );

    expect(transformedKiwiWithoutCoverage.code).not.toEqual(
      transformedKiwiWithCoverage.code,
    );
  });

  it("throws an error if `process` doesn't return a string or an object containing `code` key with processed string", async () => {
    config = {
      ...config,
      transform: [['\\.js$', 'passthrough-preprocessor', {}]],
    };
    const scriptTransformer = await createScriptTransformer(config);

    const incorrectReturnValues = [
      [undefined, '/fruits/banana.js'],
      [{a: 'a'}, '/fruits/kiwi.js'],
      [[], '/fruits/grapefruit.js'],
    ];

    incorrectReturnValues.forEach(([returnValue, filePath]) => {
      invariant(typeof filePath === 'string');
      require('passthrough-preprocessor').process.mockReturnValue(returnValue);
      expect(() =>
        scriptTransformer.transform(filePath, getCoverageOptions()),
      ).toThrow('must return a string');
    });

    const correctReturnValues = [
      ['code', '/fruits/banana.js'],
      [{code: 'code'}, '/fruits/kiwi.js'],
    ];

    correctReturnValues.forEach(([returnValue, filePath]) => {
      invariant(typeof filePath === 'string');
      require('passthrough-preprocessor').process.mockReturnValue(returnValue);
      expect(() =>
        scriptTransformer.transform(filePath, getCoverageOptions()),
      ).not.toThrow();
    });
  });

  it("throws an error if `process` isn't defined", async () => {
    config = {
      ...config,
      transform: [['\\.js$', 'skipped-required-props-preprocessor', {}]],
    };
    await expect(() => createScriptTransformer(config)).rejects.toThrow(
      'Jest: a transform must export a `process` function.',
    );
  });

  it('throws an error if createTransformer returns object without `process` method', async () => {
    config = {
      ...config,
      transform: [
        [
          '\\.js$',
          'skipped-required-create-transformer-props-preprocessor',
          {},
        ],
      ],
    };
    await expect(() => createScriptTransformer(config)).rejects.toThrow(
      'Jest: a transform must export a `process` function.',
    );
  });

  it("shouldn't throw error without process method. But with corrent createTransformer method", async () => {
    config = {
      ...config,
      transform: [['\\.js$', 'skipped-process-method-preprocessor', {}]],
    };
    const scriptTransformer = await createScriptTransformer(config);
    expect(() =>
      scriptTransformer.transformSource('sample.js', '', {instrument: false}),
    ).not.toThrow();
  });

  it('uses the supplied preprocessor', async () => {
    config = {...config, transform: [['\\.js$', 'test_preprocessor', {}]]};
    const scriptTransformer = await createScriptTransformer(config);
    const res1 = scriptTransformer.transform(
      '/fruits/banana.js',
      getCoverageOptions(),
    );

    expect(require('test_preprocessor').getCacheKey).toBeCalled();

    expect(wrap(res1.code)).toMatchSnapshot();

    const res2 = scriptTransformer.transform(
      '/node_modules/react.js',
      getCoverageOptions(),
    );
    // ignores preprocessor
    expect(wrap(res2.code)).toMatchSnapshot();
  });

  it('uses multiple preprocessors', async () => {
    config = {
      ...config,
      transform: [
        ['\\.js$', 'test_preprocessor', {}],
        ['\\.css$', 'css-preprocessor', {}],
      ],
    };
    const scriptTransformer = await createScriptTransformer(config);

    const res1 = scriptTransformer.transform(
      '/fruits/banana.js',
      getCoverageOptions(),
    );
    const res2 = scriptTransformer.transform(
      '/styles/App.css',
      getCoverageOptions(),
    );

    expect(require('test_preprocessor').getCacheKey).toBeCalled();
    expect(require('css-preprocessor').getCacheKey).toBeCalled();
    expect(wrap(res1.code)).toMatchSnapshot();
    expect(wrap(res2.code)).toMatchSnapshot();

    const res3 = scriptTransformer.transform(
      '/node_modules/react.js',
      getCoverageOptions(),
    );
    // ignores preprocessor
    expect(wrap(res3.code)).toMatchSnapshot();
  });

  it('writes source map if preprocessor supplies it', async () => {
    config = {
      ...config,
      transform: [['\\.js$', 'preprocessor-with-sourcemaps', {}]],
    };
    const scriptTransformer = await createScriptTransformer(config);

    const map = {
      mappings: ';AAAA',
      version: 3,
    };

    require('preprocessor-with-sourcemaps').process.mockReturnValue({
      code: 'content',
      map,
    });

    const result = scriptTransformer.transform(
      '/fruits/banana.js',
      getCoverageOptions(),
    );
    expect(result.sourceMapPath).toEqual(expect.any(String));
    const mapStr = JSON.stringify(map);
    expect(writeFileAtomic.sync).toBeCalledTimes(2);
    expect(writeFileAtomic.sync).toBeCalledWith(result.sourceMapPath, mapStr, {
      encoding: 'utf8',
      fsync: false,
    });
  });

  it('writes source map if preprocessor inlines it', async () => {
    config = {
      ...config,
      transform: [['\\.js$', 'preprocessor-with-sourcemaps', {}]],
    };
    const scriptTransformer = await createScriptTransformer(config);

    const sourceMap = JSON.stringify({
      mappings: 'AAAA,IAAM,CAAC,GAAW,CAAC,CAAC',
      version: 3,
    });

    const content =
      'var x = 1;\n' +
      '//# sourceMappingURL=data:application/json;base64,' +
      Buffer.from(sourceMap).toString('base64');

    require('preprocessor-with-sourcemaps').process.mockReturnValue(content);

    const result = scriptTransformer.transform(
      '/fruits/banana.js',
      getCoverageOptions(),
    );
    expect(result.sourceMapPath).toEqual(expect.any(String));
    expect(writeFileAtomic.sync).toBeCalledTimes(2);
    expect(writeFileAtomic.sync).toBeCalledWith(
      result.sourceMapPath,
      sourceMap,
      {encoding: 'utf8', fsync: false},
    );
  });

  it('warns of unparseable inlined source maps from the preprocessor', async () => {
    const warn = console.warn;
    console.warn = jest.fn();

    config = {
      ...config,
      transform: [['\\.js$', 'preprocessor-with-sourcemaps', {}]],
    };
    const scriptTransformer = await createScriptTransformer(config);

    const sourceMap = JSON.stringify({
      mappings: 'AAAA,IAAM,CAAC,GAAW,CAAC,CAAC',
      version: 3,
    });

    // Cut off the inlined map prematurely with slice so the JSON ends abruptly
    const content =
      'var x = 1;\n' +
      '//# sourceMappingURL=data:application/json;base64,' +
      Buffer.from(sourceMap).toString('base64').slice(0, 16);

    require('preprocessor-with-sourcemaps').process.mockReturnValue(content);

    const result = scriptTransformer.transform(
      '/fruits/banana.js',
      getCoverageOptions({collectCoverage: true}),
    );
    expect(result.sourceMapPath).toBeNull();
    expect(writeFileAtomic.sync).toBeCalledTimes(1);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(wrap(console.warn.mock.calls[0][0])).toMatchSnapshot();
    console.warn = warn;
  });

  it('writes source maps if given by the transformer', async () => {
    config = {
      ...config,
      transform: [['\\.js$', 'preprocessor-with-sourcemaps', {}]],
    };
    const scriptTransformer = await createScriptTransformer(config);

    const map = {
      mappings: ';AAAA',
      version: 3,
    };

    require('preprocessor-with-sourcemaps').process.mockReturnValue({
      code: 'content',
      map,
    });

    const result = scriptTransformer.transform(
      '/fruits/banana.js',
      getCoverageOptions(),
    );
    expect(result.sourceMapPath).toEqual(expect.any(String));
    expect(writeFileAtomic.sync).toBeCalledTimes(2);
    expect(writeFileAtomic.sync).toBeCalledWith(
      result.sourceMapPath,
      JSON.stringify(map),
      {
        encoding: 'utf8',
        fsync: false,
      },
    );
  });

  it('does not write source map if not given by the transformer', async () => {
    config = {
      ...config,
      transform: [['\\.js$', 'preprocessor-with-sourcemaps', {}]],
    };
    const scriptTransformer = await createScriptTransformer(config);

    require('preprocessor-with-sourcemaps').process.mockReturnValue({
      code: 'content',
      map: null,
    });

    const result = scriptTransformer.transform(
      '/fruits/banana.js',
      getCoverageOptions({collectCoverage: true}),
    );
    expect(result.sourceMapPath).toBeFalsy();
    expect(writeFileAtomic.sync).toHaveBeenCalledTimes(1);
  });

  it('should write a source map for the instrumented file when transformed', async () => {
    const transformerConfig: Config.ProjectConfig = {
      ...config,
      transform: [['\\.js$', 'preprocessor-with-sourcemaps', {}]],
    };
    const scriptTransformer = await createScriptTransformer(transformerConfig);

    const map = {
      mappings: ';AAAA',
      version: 3,
    };

    // A map from the original source to the instrumented output
    /* eslint-disable sort-keys */
    const instrumentedCodeMap = {
      version: 3,
      sources: ['banana.js'],
      names: ['content'],
      mappings:
        ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;AAeY;;;;;;;;;;AAfZA,OAAO',
      sourcesContent: ['content'],
    };
    /* eslint-enable */

    require('preprocessor-with-sourcemaps').process.mockReturnValue({
      code: 'content',
      map,
    });

    const result = scriptTransformer.transform(
      '/fruits/banana.js',
      getCoverageOptions({collectCoverage: true}),
    );
    expect(result.sourceMapPath).toEqual(expect.any(String));
    expect(writeFileAtomic.sync).toBeCalledTimes(2);
    expect(writeFileAtomic.sync).toBeCalledWith(
      result.sourceMapPath,
      JSON.stringify(instrumentedCodeMap),
      expect.anything(),
    );

    // Inline source map allows debugging of original source when running instrumented code
    expect(result.code).toContain('//# sourceMappingURL');
  });

  it('should write a source map for the instrumented file when not transformed', async () => {
    const scriptTransformer = await createScriptTransformer(config);

    // A map from the original source to the instrumented output
    /* eslint-disable sort-keys */
    const instrumentedCodeMap = {
      version: 3,
      sources: ['banana.js'],
      names: ['module', 'exports'],
      mappings:
        ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;AAeY;;;;;;;;;;AAfZA,MAAM,CAACC,OAAP,GAAiB,QAAjB',
      sourcesContent: ['module.exports = "banana";'],
    };
    /* eslint-enable */

    require('preprocessor-with-sourcemaps').process.mockReturnValue({
      code: 'content',
      map: null,
    });

    const result = scriptTransformer.transform(
      '/fruits/banana.js',
      getCoverageOptions({collectCoverage: true}),
    );
    expect(result.sourceMapPath).toEqual(expect.any(String));
    expect(writeFileAtomic.sync).toBeCalledTimes(2);
    expect(writeFileAtomic.sync).toBeCalledWith(
      result.sourceMapPath,
      JSON.stringify(instrumentedCodeMap),
      expect.anything(),
    );

    // Inline source map allows debugging of original source when running instrumented code
    expect(result.code).toContain('//# sourceMappingURL');
  });

  it('passes expected transform options to getCacheKey', async () => {
    config = {
      ...config,
      transform: [['\\.js$', 'test_preprocessor', {configKey: 'configValue'}]],
    };
    const scriptTransformer = await createScriptTransformer(config);

    scriptTransformer.transform(
      '/fruits/banana.js',
      getCoverageOptions({collectCoverage: true}),
    );

    const {getCacheKey} = require('test_preprocessor');
    expect(getCacheKey).toMatchSnapshot();
  });

  it('creates transformer with config', async () => {
    const transformerConfig = {};
    config = Object.assign(config, {
      transform: [['\\.js$', 'configureable-preprocessor', transformerConfig]],
    });
    const scriptTransformer = await createScriptTransformer(config);

    scriptTransformer.transform('/fruits/banana.js', {});
    expect(
      require('configureable-preprocessor').createTransformer,
    ).toHaveBeenCalledWith(transformerConfig);
  });

  it('reads values from the cache', async () => {
    const transformConfig: Config.ProjectConfig = {
      ...config,
      transform: [['\\.js$', 'test_preprocessor', {}]],
    };
    let scriptTransformer = await createScriptTransformer(transformConfig);
    scriptTransformer.transform('/fruits/banana.js', getCoverageOptions());

    const cachePath = getCachePath(mockFs, config);
    expect(writeFileAtomic.sync).toBeCalled();
    expect(writeFileAtomic.sync.mock.calls[0][0]).toBe(cachePath);

    // Cache the state in `mockFsCopy`
    const mockFsCopy = mockFs;
    jest.resetModules();
    reset();

    // Restore the cached fs
    mockFs = mockFsCopy;
    scriptTransformer = await createScriptTransformer(transformConfig);
    scriptTransformer.transform('/fruits/banana.js', getCoverageOptions());

    expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    expect(fs.readFileSync).toBeCalledWith('/fruits/banana.js', 'utf8');
    expect(fs.readFileSync).toBeCalledWith(cachePath, 'utf8');
    expect(writeFileAtomic.sync).not.toBeCalled();

    // Don't read from the cache when `config.cache` is false.
    jest.resetModules();
    reset();
    mockFs = mockFsCopy;
    transformConfig.cache = false;
    scriptTransformer = await createScriptTransformer(transformConfig);
    scriptTransformer.transform('/fruits/banana.js', getCoverageOptions());

    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync).toBeCalledWith('/fruits/banana.js', 'utf8');
    expect(fs.readFileSync).not.toBeCalledWith(cachePath, 'utf8');
    expect(writeFileAtomic.sync).toBeCalled();
  });

  it('reads values from the cache when the file contains colons', async () => {
    const transformConfig: Config.ProjectConfig = {
      ...config,
      transform: [['\\.js$', 'test_preprocessor', {}]],
    };
    let scriptTransformer = await createScriptTransformer(transformConfig);
    scriptTransformer.transform(
      '/fruits/banana:colon.js',
      getCoverageOptions(),
    );

    const cachePath = getCachePath(mockFs, config);
    expect(writeFileAtomic.sync).toBeCalled();
    expect(writeFileAtomic.sync.mock.calls[0][0]).toBe(cachePath);

    // Cache the state in `mockFsCopy`
    const mockFsCopy = mockFs;
    jest.resetModules();
    reset();

    // Restore the cached fs
    mockFs = mockFsCopy;
    scriptTransformer = await createScriptTransformer(transformConfig);
    scriptTransformer.transform('/fruits/banana:colon.js', {});

    expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    expect(fs.readFileSync).toBeCalledWith('/fruits/banana:colon.js', 'utf8');
    expect(fs.readFileSync).toBeCalledWith(cachePath, 'utf8');
    expect(writeFileAtomic.sync).not.toBeCalled();
  });

  it('should reuse the value from in-memory cache which is set by custom transformer', async () => {
    const cacheFS = new Map<string, string>();
    const testPreprocessor = require('cache_fs_preprocessor');
    const scriptTransformer = await createScriptTransformer(
      {
        ...config,
        transform: [['\\.js$', 'cache_fs_preprocessor', {}]],
      },
      cacheFS,
    );
    const fileName1 = '/fruits/banana.js';
    const fileName2 = '/fruits/kiwi.js';

    scriptTransformer.transform(fileName1, getCoverageOptions());

    cacheFS.set(fileName2, 'foo');

    scriptTransformer.transform(fileName2, getCoverageOptions());

    expect(testPreprocessor.getCacheKey.mock.calls[0][2].cacheFS).toBeDefined();
    expect(testPreprocessor.process.mock.calls[0][2].cacheFS).toBeDefined();
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync).toBeCalledWith(fileName1, 'utf8');
  });

  it('does not reuse the in-memory cache between different projects', async () => {
    const scriptTransformer = await createScriptTransformer({
      ...config,
      transform: [['\\.js$', 'test_preprocessor', {}]],
    });

    scriptTransformer.transform('/fruits/banana.js', getCoverageOptions());

    const anotherScriptTransformer = await createScriptTransformer({
      ...config,
      transform: [['\\.js$', 'css-preprocessor', {}]],
    });

    anotherScriptTransformer.transform(
      '/fruits/banana.js',
      getCoverageOptions(),
    );

    expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    expect(fs.readFileSync).toBeCalledWith('/fruits/banana.js', 'utf8');
  });

  it('preload transformer when using `createScriptTransformer`', async () => {
    const scriptTransformer = await createScriptTransformer({
      ...config,
      transform: [['\\.js$', 'test_preprocessor', {}]],
    });

    expect(Array.from(scriptTransformer._transformCache.entries())).toEqual([
      ['test_preprocessor', expect.any(Object)],
    ]);
  });
});

function getCoverageOptions(
  overrides: Partial<ShouldInstrumentOptions> = {},
): Options {
  const globalConfig = makeGlobalConfig(overrides);

  return {
    collectCoverage: globalConfig.collectCoverage,
    collectCoverageFrom: globalConfig.collectCoverageFrom,
    collectCoverageOnlyFrom: globalConfig.collectCoverageOnlyFrom,
    coverageProvider: globalConfig.coverageProvider,
    supportsDynamicImport: false,
    supportsExportNamespaceFrom: false,
    supportsStaticESM: false,
    supportsTopLevelAwait: false,
  };
}

function invariant(subject: unknown): asserts subject {
  if (!subject) {
    throw new Error('Went boom');
  }
}
