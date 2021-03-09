/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import crypto from 'crypto';
import * as path from 'path';
import wrap from 'jest-snapshot-serializer-raw';

function mockHashContents(contents) {
  return crypto.createHash('sha1').update(contents).digest('hex');
}

jest.mock('child_process', () => ({
  // If this does not throw, we'll use the (mocked) watchman crawler
  execSync() {},
}));

jest.mock('jest-worker', () => ({
  Worker: jest.fn(worker => {
    mockWorker = jest.fn((...args) => require(worker).worker(...args));
    mockEnd = jest.fn();

    return {
      end: mockEnd,
      worker: mockWorker,
    };
  }),
}));

jest.mock('../crawlers/node');
jest.mock('../crawlers/watchman', () =>
  jest.fn(options => {
    const path = require('path');

    const {data, ignore, rootDir, roots, computeSha1} = options;
    const list = mockChangedFiles || mockFs;
    const removedFiles = new Map();

    data.clocks = mockClocks;

    for (const file in list) {
      if (
        new RegExp(roots.join('|').replace(/\\/g, '\\\\')).test(file) &&
        !ignore(file)
      ) {
        const relativeFilePath = path.relative(rootDir, file);
        if (list[file]) {
          const hash = computeSha1 ? mockHashContents(list[file]) : null;

          data.files.set(relativeFilePath, ['', 32, 42, 0, [], hash]);
        } else {
          const fileData = data.files.get(relativeFilePath);
          if (fileData) {
            removedFiles.set(relativeFilePath, fileData);
            data.files.delete(relativeFilePath);
          }
        }
      }
    }

    return Promise.resolve({
      hasteMap: data,
      removedFiles,
    });
  }),
);

const mockWatcherConstructor = jest.fn(root => {
  const EventEmitter = require('events').EventEmitter;
  mockEmitters[root] = new EventEmitter();
  mockEmitters[root].close = jest.fn();
  setTimeout(() => mockEmitters[root].emit('ready'), 0);
  return mockEmitters[root];
});

jest.mock('../watchers/NodeWatcher', () => mockWatcherConstructor);
jest.mock('../watchers/WatchmanWatcher', () => mockWatcherConstructor);

let mockChangedFiles;
let mockFs;

jest.mock('graceful-fs', () => ({
  readFileSync: jest.fn((path, options) => {
    // A file change can be triggered by writing into the
    // mockChangedFiles object.
    if (mockChangedFiles && path in mockChangedFiles) {
      return mockChangedFiles[path];
    }

    if (mockFs[path]) {
      return mockFs[path];
    }

    const error = new Error(`Cannot read path '${path}'.`);
    error.code = 'ENOENT';
    throw error;
  }),
  writeFileSync: jest.fn((path, data, options) => {
    expect(options).toBe(require('v8').serialize ? undefined : 'utf8');
    mockFs[path] = data;
  }),
}));

const cacheFilePath = '/cache-file';
const object = data => Object.assign(Object.create(null), data);
const createMap = obj => new Map(Object.keys(obj).map(key => [key, obj[key]]));

// Jest toEqual does not match Map instances from different contexts
// This normalizes them for the uses cases in this test
const useBuitinsInContext = value => {
  const stringTag = Object.prototype.toString.call(value);
  switch (stringTag) {
    case '[object Map]':
      return new Map(
        Array.from(value).map(([k, v]) => [
          useBuitinsInContext(k),
          useBuitinsInContext(v),
        ]),
      );
    case '[object Object]':
      return Object.keys(value).reduce((obj, key) => {
        obj[key] = useBuitinsInContext(value[key]);
        return obj;
      }, {});
    default:
      return value;
  }
};

let consoleWarn;
let consoleError;
let defaultConfig;
let fs;
let H;
let HasteMap;
let mockClocks;
let mockEmitters;
let mockEnd;
let mockWorker;
let getCacheFilePath;

describe('HasteMap', () => {
  beforeEach(() => {
    jest.resetModules();

    mockEmitters = Object.create(null);
    mockFs = object({
      [path.join('/', 'project', 'fruits', 'Banana.js')]: `
        const Strawberry = require("Strawberry");
      `,
      [path.join('/', 'project', 'fruits', 'Pear.js')]: `
        const Banana = require("Banana");
        const Strawberry = require("Strawberry");
      `,
      [path.join('/', 'project', 'fruits', 'Strawberry.js')]: `
        // Strawberry!
      `,
      [path.join('/', 'project', 'fruits', '__mocks__', 'Pear.js')]: `
        const Melon = require("Melon");
      `,
      [path.join('/', 'project', 'vegetables', 'Melon.js')]: `
        // Melon!
      `,
      [path.join('/', 'project', 'video', 'video.mp4')]: Buffer.from([
        0xfa,
        0xce,
        0xb0,
        0x0c,
      ]).toString(),
    });
    mockClocks = createMap({
      fruits: 'c:fake-clock:1',
      vegetables: 'c:fake-clock:2',
      video: 'c:fake-clock:3',
    });

    mockChangedFiles = null;

    fs = require('graceful-fs');

    consoleWarn = console.warn;
    consoleError = console.error;

    console.warn = jest.fn();
    console.error = jest.fn();

    HasteMap = require('../').default;
    H = HasteMap.H;

    getCacheFilePath = HasteMap.getCacheFilePath;
    HasteMap.getCacheFilePath = jest.fn(() => cacheFilePath);

    defaultConfig = {
      extensions: ['js', 'json'],
      hasteImplModulePath: require.resolve('./haste_impl.js'),
      id: 'haste-map-test',
      maxWorkers: 1,
      platforms: ['ios', 'android'],
      resetCache: false,
      rootDir: path.join('/', 'project'),
      roots: [
        path.join('/', 'project', 'fruits'),
        path.join('/', 'project', 'vegetables'),
      ],
      useWatchman: true,
    };
  });

  afterEach(() => {
    console.warn = consoleWarn;
    console.error = consoleError;
  });

  it('exports constants', () => {
    expect(HasteMap.H).toBe(require('../constants').default);
  });

  it('creates valid cache file paths', () => {
    jest.resetModules();
    HasteMap = require('../').default;

    expect(
      HasteMap.getCacheFilePath('/', '@scoped/package', 'random-value'),
    ).toMatch(
      process.platform === 'win32'
        ? /^\\-scoped-package-(.*)$/
        : /^\/-scoped-package-(.*)$/,
    );
  });

  it('creates different cache file paths for different roots', () => {
    jest.resetModules();
    const HasteMap = require('../').default;
    const hasteMap1 = new HasteMap({...defaultConfig, rootDir: '/root1'});
    const hasteMap2 = new HasteMap({...defaultConfig, rootDir: '/root2'});
    expect(hasteMap1.getCacheFilePath()).not.toBe(hasteMap2.getCacheFilePath());
  });

  it('creates different cache file paths for different dependency extractor cache keys', () => {
    jest.resetModules();
    const HasteMap = require('../').default;
    const dependencyExtractor = require('./dependencyExtractor');
    const config = {
      ...defaultConfig,
      dependencyExtractor: require.resolve('./dependencyExtractor'),
    };
    dependencyExtractor.setCacheKey('foo');
    const hasteMap1 = new HasteMap(config);
    dependencyExtractor.setCacheKey('bar');
    const hasteMap2 = new HasteMap(config);
    expect(hasteMap1.getCacheFilePath()).not.toBe(hasteMap2.getCacheFilePath());
  });

  it('creates different cache file paths for different hasteImplModulePath cache keys', () => {
    jest.resetModules();
    const HasteMap = require('../').default;
    const hasteImpl = require('./haste_impl');
    hasteImpl.setCacheKey('foo');
    const hasteMap1 = new HasteMap(defaultConfig);
    hasteImpl.setCacheKey('bar');
    const hasteMap2 = new HasteMap(defaultConfig);
    expect(hasteMap1.getCacheFilePath()).not.toBe(hasteMap2.getCacheFilePath());
  });

  it('creates different cache file paths for different projects', () => {
    jest.resetModules();
    const HasteMap = require('../').default;
    const hasteMap1 = new HasteMap({...defaultConfig, id: '@scoped/package'});
    const hasteMap2 = new HasteMap({...defaultConfig, id: '-scoped-package'});
    expect(hasteMap1.getCacheFilePath()).not.toBe(hasteMap2.getCacheFilePath());
  });

  it('matches files against a pattern', async () => {
    const {hasteFS} = await new HasteMap(defaultConfig).build();
    expect(
      hasteFS.matchFiles(
        process.platform === 'win32' ? /project\\fruits/ : /project\/fruits/,
      ),
    ).toEqual([
      path.join('/', 'project', 'fruits', 'Banana.js'),
      path.join('/', 'project', 'fruits', 'Pear.js'),
      path.join('/', 'project', 'fruits', 'Strawberry.js'),
      path.join('/', 'project', 'fruits', '__mocks__', 'Pear.js'),
    ]);

    expect(hasteFS.matchFiles(/__mocks__/)).toEqual([
      path.join('/', 'project', 'fruits', '__mocks__', 'Pear.js'),
    ]);
  });

  it('ignores files given a pattern', async () => {
    const config = {...defaultConfig, ignorePattern: /Kiwi/};
    mockFs[path.join('/', 'project', 'fruits', 'Kiwi.js')] = `
      // Kiwi!
    `;
    const {hasteFS} = await new HasteMap(config).build();
    expect(hasteFS.matchFiles(/Kiwi/)).toEqual([]);
  });

  it('ignores vcs directories without ignore pattern', async () => {
    mockFs[path.join('/', 'project', 'fruits', '.git', 'fruit-history.js')] = `
      // test
    `;
    const {hasteFS} = await new HasteMap(defaultConfig).build();
    expect(hasteFS.matchFiles('.git')).toEqual([]);
  });

  it('ignores vcs directories with ignore pattern regex', async () => {
    const config = {...defaultConfig, ignorePattern: /Kiwi/};
    mockFs[path.join('/', 'project', 'fruits', 'Kiwi.js')] = `
      // Kiwi!
    `;

    mockFs[path.join('/', 'project', 'fruits', '.git', 'fruit-history.js')] = `
      // test
    `;
    const {hasteFS} = await new HasteMap(config).build();
    expect(hasteFS.matchFiles(/Kiwi/)).toEqual([]);
    expect(hasteFS.matchFiles('.git')).toEqual([]);
  });

  it('warn on ignore pattern except for regex', async () => {
    const config = {ignorePattern: 'Kiwi', ...defaultConfig};
    mockFs['/project/fruits/Kiwi.js'] = `
      // Kiwi!
    `;

    try {
      await new HasteMap(config).build();
    } catch (err) {
      expect(err.message).toBe(
        'jest-haste-map: the `ignorePattern` option must be a RegExp',
      );
    }
  });

  it('builds a haste map on a fresh cache', async () => {
    // Include these files in the map
    mockFs[
      path.join('/', 'project', 'fruits', 'node_modules', 'react', 'React.js')
    ] = `
      const Component = require("Component");
    `;
    mockFs[
      path.join(
        '/',
        'project',
        'fruits',
        'node_modules',
        'fbjs',
        'lib',
        'flatMap.js',
      )
    ] = `
      // flatMap
    `;

    // Ignore these
    mockFs[
      path.join(
        '/',
        'project',
        'fruits',
        'node_modules',
        'react',
        'node_modules',
        'fbjs',
        'lib',
        'mapObject.js',
      )
    ] = `
      // mapObject
    `;
    mockFs[
      path.join(
        '/',
        'project',
        'fruits',
        'node_modules',
        'react',
        'node_modules',
        'dummy',
        'merge.js',
      )
    ] = `
      // merge
    `;
    mockFs[
      path.join(
        '/',
        'project',
        'fruits',
        'node_modules',
        'react',
        'node_modules',
        'merge',
        'package.json',
      )
    ] = `
      {
        "name": "merge"
      }
    `;
    mockFs[
      path.join('/', 'project', 'fruits', 'node_modules', 'jest', 'Jest.js')
    ] = `
      const Test = require("Test");
    `;
    mockFs[
      path.join('/', 'project', 'fruits', 'node_modules', 'fbjs2', 'fbjs2.js')
    ] = `
      // fbjs2
    `;

    const hasteMap = new HasteMap({
      ...defaultConfig,
      mocksPattern: '__mocks__',
    });

    const {__hasteMapForTest: data} = await hasteMap.build();

    expect(data.clocks).toEqual(mockClocks);

    expect(data.files).toEqual(
      createMap({
        [path.join('fruits', 'Banana.js')]: [
          'Banana',
          32,
          42,
          1,
          'Strawberry',
          null,
        ],
        [path.join('fruits', 'Pear.js')]: [
          'Pear',
          32,
          42,
          1,
          'Banana\0Strawberry',
          null,
        ],
        [path.join('fruits', 'Strawberry.js')]: [
          'Strawberry',
          32,
          42,
          1,
          '',
          null,
        ],
        [path.join('fruits', '__mocks__', 'Pear.js')]: [
          '',
          32,
          42,
          1,
          'Melon',
          null,
        ],
        [path.join('vegetables', 'Melon.js')]: ['Melon', 32, 42, 1, '', null],
      }),
    );

    expect(data.map).toEqual(
      createMap({
        Banana: {
          [H.GENERIC_PLATFORM]: [path.join('fruits', 'Banana.js'), H.MODULE],
        },
        Melon: {
          [H.GENERIC_PLATFORM]: [path.join('vegetables', 'Melon.js'), H.MODULE],
        },
        Pear: {
          [H.GENERIC_PLATFORM]: [path.join('fruits', 'Pear.js'), H.MODULE],
        },
        Strawberry: {
          [H.GENERIC_PLATFORM]: [
            path.join('fruits', 'Strawberry.js'),
            H.MODULE,
          ],
        },
      }),
    );

    expect(data.mocks).toEqual(
      createMap({
        Pear: path.join('fruits', '__mocks__', 'Pear.js'),
      }),
    );

    // The cache file must exactly mirror the data structure returned from a
    // build
    expect(useBuitinsInContext(hasteMap.read())).toEqual(data);
  });

  describe('builds a haste map on a fresh cache with SHA-1s', () => {
    it.each([false, true])('uses watchman: %s', async useWatchman => {
      const node = require('../crawlers/node');

      node.mockImplementation(options => {
        const {data} = options;

        // The node crawler returns "null" for the SHA-1.
        data.files = createMap({
          [path.join('fruits', 'Banana.js')]: [
            'Banana',
            32,
            42,
            0,
            'Strawberry',
            null,
          ],
          [path.join('fruits', 'Pear.js')]: [
            'Pear',
            32,
            42,
            0,
            'Banana\0Strawberry',
            null,
          ],
          [path.join('fruits', 'Strawberry.js')]: [
            'Strawberry',
            32,
            42,
            0,
            '',
            null,
          ],
          [path.join('fruits', '__mocks__', 'Pear.js')]: [
            '',
            32,
            42,
            0,
            'Melon',
            null,
          ],
          [path.join('vegetables', 'Melon.js')]: ['Melon', 32, 42, 0, '', null],
        });

        return Promise.resolve({
          hasteMap: data,
          removedFiles: new Map(),
        });
      });

      const hasteMap = new HasteMap({
        ...defaultConfig,
        computeSha1: true,
        maxWorkers: 1,
        useWatchman,
      });

      const data = (await hasteMap.build()).__hasteMapForTest;

      expect(data.files).toEqual(
        createMap({
          [path.join('fruits', 'Banana.js')]: [
            'Banana',
            32,
            42,
            1,
            'Strawberry',
            '7772b628e422e8cf59c526be4bb9f44c0898e3d1',
          ],
          [path.join('fruits', 'Pear.js')]: [
            'Pear',
            32,
            42,
            1,
            'Banana\0Strawberry',
            '89d0c2cc11dcc5e1df50b8af04ab1b597acfba2f',
          ],
          [path.join('fruits', 'Strawberry.js')]: [
            'Strawberry',
            32,
            42,
            1,
            '',
            'e8aa38e232b3795f062f1d777731d9240c0f8c25',
          ],
          [path.join('fruits', '__mocks__', 'Pear.js')]: [
            '',
            32,
            42,
            1,
            'Melon',
            '8d40afbb6e2dc78e1ba383b6d02cafad35cceef2',
          ],
          [path.join('vegetables', 'Melon.js')]: [
            'Melon',
            32,
            42,
            1,
            '',
            'f16ccf6f2334ceff2ddb47628a2c5f2d748198ca',
          ],
        }),
      );

      expect(useBuitinsInContext(hasteMap.read())).toEqual(data);
    });
  });

  it('does not crawl native files even if requested to do so', async () => {
    mockFs[path.join('/', 'project', 'video', 'IRequireAVideo.js')] = `
      module.exports = require("./video.mp4");
    `;

    const hasteMap = new HasteMap({
      ...defaultConfig,
      extensions: [...defaultConfig.extensions],
      roots: [...defaultConfig.roots, path.join('/', 'project', 'video')],
    });

    const {__hasteMapForTest: data} = await hasteMap.build();

    expect(data.map.get('IRequireAVideo')).toBeDefined();
    expect(data.files.get(path.join('video', 'video.mp4'))).toBeDefined();
    expect(fs.readFileSync).not.toBeCalledWith(
      path.join('video', 'video.mp4'),
      'utf8',
    );
  });

  it('retains all files if `retainAllFiles` is specified', async () => {
    mockFs[
      path.join('/', 'project', 'fruits', 'node_modules', 'fbjs', 'fbjs.js')
    ] = `
      // fbjs!
    `;

    const hasteMap = new HasteMap({
      ...defaultConfig,
      mocksPattern: '__mocks__',
      retainAllFiles: true,
    });

    const {__hasteMapForTest: data} = await hasteMap.build();
    // Expect the node module to be part of files but make sure it wasn't
    // read.
    expect(
      data.files.get(path.join('fruits', 'node_modules', 'fbjs', 'fbjs.js')),
    ).toEqual(['', 32, 42, 0, [], null]);

    expect(data.map.get('fbjs')).not.toBeDefined();

    // cache file + 5 modules - the node_module
    expect(fs.readFileSync.mock.calls.length).toBe(6);
  });

  it('warns on duplicate mock files', async () => {
    expect.assertions(1);

    // Duplicate mock files for blueberry
    mockFs[
      path.join(
        '/',
        'project',
        'fruits1',
        '__mocks__',
        'subdir',
        'Blueberry.js',
      )
    ] = `
      // Blueberry
    `;
    mockFs[
      path.join(
        '/',
        'project',
        'fruits2',
        '__mocks__',
        'subdir',
        'Blueberry.js',
      )
    ] = `
      // Blueberry too!
    `;

    try {
      await new HasteMap({
        mocksPattern: '__mocks__',
        throwOnModuleCollision: true,
        ...defaultConfig,
      }).build();
    } catch {
      expect(
        wrap(console.error.mock.calls[0][0].replace(/\\/g, '/')),
      ).toMatchSnapshot();
    }
  });

  it('warns on duplicate module ids', async () => {
    mockFs[path.join('/', 'project', 'fruits', 'other', 'Strawberry.js')] = `
      const Banana = require("Banana");
    `;

    const {__hasteMapForTest: data} = await new HasteMap(defaultConfig).build();

    // Duplicate modules are removed so that it doesn't cause
    // non-determinism later on.
    expect(data.map.get('Strawberry')[H.GENERIC_PLATFORM]).not.toBeDefined();

    expect(
      wrap(console.warn.mock.calls[0][0].replace(/\\/g, '/')),
    ).toMatchSnapshot();
  });

  it('warns on duplicate module ids only once', async () => {
    mockFs[path.join('/', 'project', 'fruits', 'other', 'Strawberry.js')] = `
      const Banana = require("Banana");
    `;

    await new HasteMap(defaultConfig).build();
    expect(console.warn).toHaveBeenCalledTimes(1);

    await new HasteMap(defaultConfig).build();
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('throws on duplicate module ids if "throwOnModuleCollision" is set to true', async () => {
    expect.assertions(1);
    // Raspberry thinks it is a Strawberry
    mockFs[path.join('/', 'project', 'fruits', 'another', 'Strawberry.js')] = `
      const Banana = require("Banana");
    `;

    try {
      await new HasteMap({
        throwOnModuleCollision: true,
        ...defaultConfig,
      }).build();
    } catch (err) {
      expect(err.message).toBe(
        'Duplicated files or mocks. Please check the console for more info',
      );
    }
  });

  it('splits up modules by platform', async () => {
    mockFs = Object.create(null);
    mockFs[path.join('/', 'project', 'fruits', 'Strawberry.js')] = `
      const Banana = require("Banana");
    `;

    mockFs[path.join('/', 'project', 'fruits', 'Strawberry.ios.js')] = `
      const Raspberry = require("Raspberry");
    `;

    mockFs[path.join('/', 'project', 'fruits', 'Strawberry.android.js')] = `
      const Blackberry = require("Blackberry");
    `;

    const {__hasteMapForTest: data} = await new HasteMap(defaultConfig).build();

    expect(data.files).toEqual(
      createMap({
        [path.join('fruits', 'Strawberry.android.js')]: [
          'Strawberry',
          32,
          42,
          1,
          'Blackberry',
          null,
        ],
        [path.join('fruits', 'Strawberry.ios.js')]: [
          'Strawberry',
          32,
          42,
          1,
          'Raspberry',
          null,
        ],
        [path.join('fruits', 'Strawberry.js')]: [
          'Strawberry',
          32,
          42,
          1,
          'Banana',
          null,
        ],
      }),
    );

    expect(data.map).toEqual(
      createMap({
        Strawberry: {
          [H.GENERIC_PLATFORM]: [
            path.join('fruits', 'Strawberry.js'),
            H.MODULE,
          ],
          android: [path.join('fruits', 'Strawberry.android.js'), H.MODULE],
          ios: [path.join('fruits', 'Strawberry.ios.js'), H.MODULE],
        },
      }),
    );
  });

  it('does not access the file system on a warm cache with no changes', async () => {
    const {__hasteMapForTest: initialData} = await new HasteMap(
      defaultConfig,
    ).build();

    // The first run should access the file system once for the (empty)
    // cache file and five times for the files in the system.
    expect(fs.readFileSync.mock.calls.length).toBe(6);

    fs.readFileSync.mockClear();

    // Explicitly mock that no files have changed.
    mockChangedFiles = Object.create(null);

    // Watchman would give us different clocks.
    mockClocks = createMap({
      fruits: 'c:fake-clock:3',
      vegetables: 'c:fake-clock:4',
    });

    const {__hasteMapForTest: data} = await new HasteMap(defaultConfig).build();
    expect(fs.readFileSync.mock.calls.length).toBe(1);
    if (require('v8').deserialize) {
      expect(fs.readFileSync).toBeCalledWith(cacheFilePath);
    } else {
      expect(fs.readFileSync).toBeCalledWith(cacheFilePath, 'utf8');
    }
    expect(useBuitinsInContext(data.clocks)).toEqual(mockClocks);
    expect(useBuitinsInContext(data.files)).toEqual(initialData.files);
    expect(useBuitinsInContext(data.map)).toEqual(initialData.map);
  });

  it('only does minimal file system access when files change', async () => {
    const {__hasteMapForTest: initialData} = await new HasteMap(
      defaultConfig,
    ).build();
    fs.readFileSync.mockClear();

    // Let's assume one JS file has changed.
    mockChangedFiles = object({
      [path.join('/', 'project', 'fruits', 'Banana.js')]: `
            const Kiwi = require("Kiwi");
          `,
    });

    // Watchman would give us different clocks for `/project/fruits`.
    mockClocks = createMap({
      fruits: 'c:fake-clock:3',
      vegetables: 'c:fake-clock:2',
    });

    const {__hasteMapForTest: data} = await new HasteMap(defaultConfig).build();

    expect(fs.readFileSync.mock.calls.length).toBe(2);

    if (require('v8').serialize) {
      expect(fs.readFileSync).toBeCalledWith(cacheFilePath);
    } else {
      expect(fs.readFileSync).toBeCalledWith(cacheFilePath, 'utf8');
    }
    expect(fs.readFileSync).toBeCalledWith(
      path.join('/', 'project', 'fruits', 'Banana.js'),
      'utf8',
    );

    expect(useBuitinsInContext(data.clocks)).toEqual(mockClocks);

    const files = new Map(initialData.files);
    files.set(path.join('fruits', 'Banana.js'), [
      'Banana',
      32,
      42,
      1,
      'Kiwi',
      null,
    ]);

    expect(useBuitinsInContext(data.files)).toEqual(files);

    const map = new Map(initialData.map);
    expect(useBuitinsInContext(data.map)).toEqual(map);
  });

  it('correctly handles file deletions', async () => {
    const {__hasteMapForTest: initialData} = await new HasteMap(
      defaultConfig,
    ).build();
    fs.readFileSync.mockClear();

    // Let's assume one JS file was removed.
    delete mockFs[path.join('/', 'project', 'fruits', 'Banana.js')];
    mockChangedFiles = object({
      [path.join('/', 'project', 'fruits', 'Banana.js')]: null,
    });

    // Watchman would give us different clocks for `/project/fruits`.
    mockClocks = createMap({
      fruits: 'c:fake-clock:3',
      vegetables: 'c:fake-clock:2',
    });

    const {__hasteMapForTest: data} = await new HasteMap(defaultConfig).build();

    const files = new Map(initialData.files);
    files.delete(path.join('fruits', 'Banana.js'));
    expect(useBuitinsInContext(data.files)).toEqual(files);

    const map = new Map(initialData.map);
    map.delete('Banana');
    expect(useBuitinsInContext(data.map)).toEqual(map);
  });

  it('correctly handles platform-specific file additions', async () => {
    mockFs = Object.create(null);
    mockFs[path.join('/', 'project', 'fruits', 'Strawberry.js')] = `
      const Banana = require("Banana");
    `;
    let data;
    ({__hasteMapForTest: data} = await new HasteMap(defaultConfig).build());
    expect(data.map.get('Strawberry')).toEqual({
      g: [path.join('fruits', 'Strawberry.js'), 0],
    });

    delete mockFs[path.join('/', 'project', 'fruits', 'Strawberry.ios.js')];
    mockChangedFiles = object({
      [path.join('/', 'project', 'fruits', 'Strawberry.ios.js')]: `
        const Raspberry = require("Raspberry");
      `,
    });
    mockClocks = createMap({fruits: 'c:fake-clock:3'});
    ({__hasteMapForTest: data} = await new HasteMap(defaultConfig).build());
    expect(data.map.get('Strawberry')).toEqual({
      g: [path.join('fruits', 'Strawberry.js'), 0],
      ios: [path.join('fruits', 'Strawberry.ios.js'), 0],
    });
  });

  it('correctly handles platform-specific file deletions', async () => {
    mockFs = Object.create(null);
    mockFs[path.join('/', 'project', 'fruits', 'Strawberry.js')] = `
      const Banana = require("Banana");
    `;
    mockFs[path.join('/', 'project', 'fruits', 'Strawberry.ios.js')] = `
      const Raspberry = require("Raspberry");
    `;
    let data;
    ({__hasteMapForTest: data} = await new HasteMap(defaultConfig).build());
    expect(data.map.get('Strawberry')).toEqual({
      g: [path.join('fruits', 'Strawberry.js'), 0],
      ios: [path.join('fruits', 'Strawberry.ios.js'), 0],
    });

    delete mockFs[path.join('/', 'project', 'fruits', 'Strawberry.ios.js')];
    mockChangedFiles = object({
      [path.join('/', 'project', 'fruits', 'Strawberry.ios.js')]: null,
    });
    mockClocks = createMap({fruits: 'c:fake-clock:3'});
    ({__hasteMapForTest: data} = await new HasteMap(defaultConfig).build());
    expect(data.map.get('Strawberry')).toEqual({
      g: [path.join('fruits', 'Strawberry.js'), 0],
    });
  });

  it('correctly handles platform-specific file renames', async () => {
    mockFs = Object.create(null);
    mockFs[path.join('/', 'project', 'fruits', 'Strawberry.ios.js')] = `
      const Raspberry = require("Raspberry");
    `;
    let data;
    ({__hasteMapForTest: data} = await new HasteMap(defaultConfig).build());
    expect(data.map.get('Strawberry')).toEqual({
      ios: [path.join('fruits', 'Strawberry.ios.js'), 0],
    });

    delete mockFs[path.join('/', 'project', 'fruits', 'Strawberry.ios.js')];
    mockChangedFiles = object({
      [path.join('/', 'project', 'fruits', 'Strawberry.ios.js')]: null,
      [path.join('/', 'project', 'fruits', 'Strawberry.js')]: `
        const Banana = require("Banana");
      `,
    });
    mockClocks = createMap({fruits: 'c:fake-clock:3'});
    ({__hasteMapForTest: data} = await new HasteMap(defaultConfig).build());
    expect(data.map.get('Strawberry')).toEqual({
      g: [path.join('fruits', 'Strawberry.js'), 0],
    });
  });

  describe('duplicate modules', () => {
    beforeEach(async () => {
      mockFs[
        path.join('/', 'project', 'fruits', 'another', 'Strawberry.js')
      ] = `
        const Blackberry = require("Blackberry");
      `;

      const {__hasteMapForTest: data} = await new HasteMap(
        defaultConfig,
      ).build();
      expect(useBuitinsInContext(data.duplicates)).toEqual(
        createMap({
          Strawberry: createMap({
            g: createMap({
              [path.join('fruits', 'Strawberry.js')]: H.MODULE,
              [path.join('fruits', 'another', 'Strawberry.js')]: H.MODULE,
            }),
          }),
        }),
      );
      expect(data.map.get('Strawberry')).toEqual({});
    });

    it('recovers when a duplicate file is deleted', async () => {
      delete mockFs[
        path.join('/', 'project', 'fruits', 'another', 'Strawberry.js')
      ];
      mockChangedFiles = object({
        [path.join('/', 'project', 'fruits', 'another', 'Strawberry.js')]: null,
      });
      mockClocks = createMap({
        fruits: 'c:fake-clock:3',
        vegetables: 'c:fake-clock:2',
      });

      const {__hasteMapForTest: data} = await new HasteMap(
        defaultConfig,
      ).build();
      expect(useBuitinsInContext(data.duplicates)).toEqual(new Map());
      expect(data.map.get('Strawberry')).toEqual({
        g: [path.join('fruits', 'Strawberry.js'), H.MODULE],
      });
      // Make sure the other files are not affected.
      expect(data.map.get('Banana')).toEqual({
        g: [path.join('fruits', 'Banana.js'), H.MODULE],
      });
    });

    it('recovers with the correct type when a duplicate file is deleted', async () => {
      mockFs[
        path.join('/', 'project', 'fruits', 'strawberryPackage', 'package.json')
      ] = `
        {"name": "Strawberry"}
      `;

      const {__hasteMapForTest: data} = await new HasteMap(
        defaultConfig,
      ).build();

      expect(useBuitinsInContext(data.duplicates)).toEqual(
        createMap({
          Strawberry: createMap({
            g: createMap({
              [path.join('fruits', 'Strawberry.js')]: H.MODULE,
              [path.join('fruits', 'another', 'Strawberry.js')]: H.MODULE,
              [path.join(
                'fruits',
                'strawberryPackage',
                'package.json',
              )]: H.PACKAGE,
            }),
          }),
        }),
      );

      delete mockFs[
        path.join('/', 'project', 'fruits', 'another', 'Strawberry.js')
      ];
      delete mockFs[
        path.join('/', 'project', 'fruits', 'strawberryPackage', 'package.json')
      ];

      mockChangedFiles = object({
        [path.join('/', 'project', 'fruits', 'another', 'Strawberry.js')]: null,
        [path.join(
          '/',
          'project',
          'fruits',
          'strawberryPackage',
          'package.json',
        )]: null,
      });
      mockClocks = createMap({
        fruits: 'c:fake-clock:4',
      });

      const {__hasteMapForTest: correctData} = await new HasteMap(
        defaultConfig,
      ).build();

      expect(useBuitinsInContext(correctData.duplicates)).toEqual(new Map());
      expect(correctData.map.get('Strawberry')).toEqual({
        g: [path.join('fruits', 'Strawberry.js'), H.MODULE],
      });
    });

    it('recovers when a duplicate module is renamed', async () => {
      mockChangedFiles = object({
        [path.join('/', 'project', 'fruits', 'another', 'Pineapple.js')]: `
          const Blackberry = require("Blackberry");
        `,
        [path.join('/', 'project', 'fruits', 'another', 'Strawberry.js')]: null,
      });
      mockClocks = createMap({
        fruits: 'c:fake-clock:3',
        vegetables: 'c:fake-clock:2',
      });

      const {__hasteMapForTest: data} = await new HasteMap(
        defaultConfig,
      ).build();
      expect(useBuitinsInContext(data.duplicates)).toEqual(new Map());
      expect(data.map.get('Strawberry')).toEqual({
        g: [path.join('fruits', 'Strawberry.js'), H.MODULE],
      });
      expect(data.map.get('Pineapple')).toEqual({
        g: [path.join('fruits', 'another', 'Pineapple.js'), H.MODULE],
      });
      // Make sure the other files are not affected.
      expect(data.map.get('Banana')).toEqual({
        g: [path.join('fruits', 'Banana.js'), H.MODULE],
      });
    });
  });

  it('discards the cache when configuration changes', async () => {
    HasteMap.getCacheFilePath = getCacheFilePath;
    await new HasteMap(defaultConfig).build();
    fs.readFileSync.mockClear();

    // Explicitly mock that no files have changed.
    mockChangedFiles = Object.create(null);

    // Watchman would give us different clocks.
    mockClocks = createMap({
      fruits: 'c:fake-clock:3',
      vegetables: 'c:fake-clock:4',
    });

    const config = {...defaultConfig, ignorePattern: /Kiwi|Pear/};
    const {moduleMap} = await new HasteMap(config).build();
    expect(moduleMap.getModule('Pear')).toBe(null);
  });

  it('ignores files that do not exist', async () => {
    const watchman = require('../crawlers/watchman');
    const mockImpl = watchman.getMockImplementation();
    // Wrap the watchman mock and add an invalid file to the file list.
    watchman.mockImplementation(options =>
      mockImpl(options).then(() => {
        const {data} = options;
        data.files.set(path.join('fruits', 'invalid', 'file.js'), [
          '',
          34,
          44,
          0,
          [],
        ]);
        return {hasteMap: data, removedFiles: new Map()};
      }),
    );

    const {__hasteMapForTest: data} = await new HasteMap(defaultConfig).build();
    expect(data.files.size).toBe(5);

    // Ensure this file is not part of the file list.
    expect(data.files.get(path.join('fruits', 'invalid', 'file.js'))).toBe(
      undefined,
    );
  });

  it('distributes work across workers', async () => {
    const jestWorker = require('jest-worker').Worker;
    const path = require('path');
    const dependencyExtractor = path.join(__dirname, 'dependencyExtractor.js');
    const {__hasteMapForTest: data} = await new HasteMap({
      ...defaultConfig,
      dependencyExtractor,
      hasteImplModulePath: undefined,
      maxWorkers: 4,
    }).build();

    expect(jestWorker.mock.calls.length).toBe(1);

    expect(mockWorker.mock.calls.length).toBe(5);

    expect(mockWorker.mock.calls).toEqual([
      [
        {
          computeDependencies: true,
          computeSha1: false,
          dependencyExtractor,
          filePath: path.join('/', 'project', 'fruits', 'Banana.js'),
          hasteImplModulePath: undefined,
          rootDir: path.join('/', 'project'),
        },
      ],
      [
        {
          computeDependencies: true,
          computeSha1: false,
          dependencyExtractor,
          filePath: path.join('/', 'project', 'fruits', 'Pear.js'),
          hasteImplModulePath: undefined,
          rootDir: path.join('/', 'project'),
        },
      ],
      [
        {
          computeDependencies: true,
          computeSha1: false,
          dependencyExtractor,
          filePath: path.join('/', 'project', 'fruits', 'Strawberry.js'),
          hasteImplModulePath: undefined,
          rootDir: path.join('/', 'project'),
        },
      ],
      [
        {
          computeDependencies: true,
          computeSha1: false,
          dependencyExtractor,
          filePath: path.join('/', 'project', 'fruits', '__mocks__', 'Pear.js'),
          hasteImplModulePath: undefined,
          rootDir: path.join('/', 'project'),
        },
      ],
      [
        {
          computeDependencies: true,
          computeSha1: false,
          dependencyExtractor,
          filePath: path.join('/', 'project', 'vegetables', 'Melon.js'),
          hasteImplModulePath: undefined,
          rootDir: path.join('/', 'project'),
        },
      ],
    ]);

    expect(mockEnd).toBeCalled();
  });

  it('tries to crawl using node as a fallback', async () => {
    const watchman = require('../crawlers/watchman');
    const node = require('../crawlers/node');

    watchman.mockImplementation(() => {
      throw new Error('watchman error');
    });
    node.mockImplementation(options => {
      const {data} = options;
      data.files = createMap({
        [path.join('fruits', 'Banana.js')]: ['', 32, 42, 0, '', null],
      });
      return Promise.resolve({
        hasteMap: data,
        removedFiles: new Map(),
      });
    });

    const {__hasteMapForTest: data} = await new HasteMap(defaultConfig).build();
    expect(watchman).toBeCalled();
    expect(node).toBeCalled();

    expect(data.files).toEqual(
      createMap({
        [path.join('fruits', 'Banana.js')]: [
          'Banana',
          32,
          42,
          1,
          'Strawberry',
          null,
        ],
      }),
    );

    expect(wrap(console.warn.mock.calls[0][0])).toMatchSnapshot();
  });

  it('tries to crawl using node as a fallback when promise fails once', async () => {
    const watchman = require('../crawlers/watchman');
    const node = require('../crawlers/node');

    watchman.mockImplementation(() =>
      Promise.reject(new Error('watchman error')),
    );
    node.mockImplementation(options => {
      const {data} = options;
      data.files = createMap({
        [path.join('fruits', 'Banana.js')]: ['', 32, 42, 0, '', null],
      });
      return Promise.resolve({
        hasteMap: data,
        removedFiles: new Map(),
      });
    });

    const {__hasteMapForTest: data} = await new HasteMap(defaultConfig).build();

    expect(watchman).toBeCalled();
    expect(node).toBeCalled();

    expect(data.files).toEqual(
      createMap({
        [path.join('fruits', 'Banana.js')]: [
          'Banana',
          32,
          42,
          1,
          'Strawberry',
          null,
        ],
      }),
    );
  });

  it('stops crawling when both crawlers fail', async () => {
    expect.assertions(1);
    const watchman = require('../crawlers/watchman');
    const node = require('../crawlers/node');

    watchman.mockImplementation(() =>
      Promise.reject(new Error('watchman error')),
    );

    node.mockImplementation((roots, extensions, ignore, data) =>
      Promise.reject(new Error('node error')),
    );

    try {
      await new HasteMap(defaultConfig).build();
    } catch (error) {
      expect(error.message).toEqual(
        'Crawler retry failed:\n' +
          '  Original error: watchman error\n' +
          '  Retry error: node error\n',
      );
    }
  });

  describe('file system changes processing', () => {
    function waitForItToChange(hasteMap) {
      return new Promise(resolve => {
        hasteMap.once('change', resolve);
      });
    }

    function mockDeleteFile(dirPath, filePath) {
      const e = mockEmitters[dirPath];
      e.emit('all', 'delete', filePath, dirPath, undefined);
    }

    function hm_it(title, fn, options) {
      options = options || {};
      (options.only ? it.only : it)(title, async () => {
        if (options.mockFs) {
          mockFs = options.mockFs;
        }
        const watchConfig = {...defaultConfig, watch: true};
        const hm = new HasteMap(watchConfig);
        await hm.build();
        try {
          await fn(hm);
        } finally {
          hm.end();
        }
      });
    }

    hm_it('provides a new set of hasteHS and moduleMap', async hm => {
      const initialResult = await hm.build();
      const filePath = path.join('/', 'project', 'fruits', 'Banana.js');
      expect(initialResult.hasteFS.getModuleName(filePath)).toBeDefined();
      expect(initialResult.moduleMap.getModule('Banana')).toBe(filePath);
      mockDeleteFile(path.join('/', 'project', 'fruits'), 'Banana.js');
      mockDeleteFile(path.join('/', 'project', 'fruits'), 'Banana.js');
      const {eventsQueue, hasteFS, moduleMap} = await waitForItToChange(hm);
      expect(eventsQueue).toHaveLength(1);
      const deletedBanana = {filePath, stat: undefined, type: 'delete'};
      expect(eventsQueue).toEqual([deletedBanana]);
      // Verify we didn't change the original map.
      expect(initialResult.hasteFS.getModuleName(filePath)).toBeDefined();
      expect(initialResult.moduleMap.getModule('Banana')).toBe(filePath);
      expect(hasteFS.getModuleName(filePath)).toBeNull();
      expect(moduleMap.getModule('Banana')).toBeNull();
    });

    const MOCK_STAT_FILE = {
      isDirectory: () => false,
      mtime: {getTime: () => 45},
      size: 55,
    };

    const MOCK_STAT_FOLDER = {
      isDirectory: () => true,
      mtime: {getTime: () => 45},
      size: 55,
    };

    hm_it('handles several change events at once', async hm => {
      mockFs[path.join('/', 'project', 'fruits', 'Tomato.js')] = `
        // Tomato!
      `;
      mockFs[path.join('/', 'project', 'fruits', 'Pear.js')] = `
        // Pear!
      `;
      const e = mockEmitters[path.join('/', 'project', 'fruits')];
      e.emit(
        'all',
        'add',
        'Tomato.js',
        path.join('/', 'project', 'fruits'),
        MOCK_STAT_FILE,
      );
      e.emit(
        'all',
        'change',
        'Pear.js',
        path.join('/', 'project', 'fruits'),
        MOCK_STAT_FILE,
      );
      const {eventsQueue, hasteFS, moduleMap} = await waitForItToChange(hm);
      expect(eventsQueue).toEqual([
        {
          filePath: path.join('/', 'project', 'fruits', 'Tomato.js'),
          stat: MOCK_STAT_FILE,
          type: 'add',
        },
        {
          filePath: path.join('/', 'project', 'fruits', 'Pear.js'),
          stat: MOCK_STAT_FILE,
          type: 'change',
        },
      ]);
      expect(
        hasteFS.getModuleName(path.join('/', 'project', 'fruits', 'Tomato.js')),
      ).not.toBeNull();
      expect(moduleMap.getModule('Tomato')).toBeDefined();
      expect(moduleMap.getModule('Pear')).toBe(
        path.join('/', 'project', 'fruits', 'Pear.js'),
      );
    });

    hm_it('does not emit duplicate change events', async hm => {
      const e = mockEmitters[path.join('/', 'project', 'fruits')];
      e.emit(
        'all',
        'change',
        'tomato.js',
        path.join('/', 'project', 'fruits'),
        MOCK_STAT_FILE,
      );
      e.emit(
        'all',
        'change',
        'tomato.js',
        path.join('/', 'project', 'fruits'),
        MOCK_STAT_FILE,
      );
      const {eventsQueue} = await waitForItToChange(hm);
      expect(eventsQueue).toHaveLength(1);
    });

    hm_it(
      'emits a change even if a file in node_modules has changed',
      async hm => {
        const e = mockEmitters[path.join('/', 'project', 'fruits')];
        e.emit(
          'all',
          'add',
          'apple.js',
          path.join('/', 'project', 'fruits', 'node_modules', ''),
          MOCK_STAT_FILE,
        );
        const {eventsQueue, hasteFS} = await waitForItToChange(hm);
        const filePath = path.join(
          '/',
          'project',
          'fruits',
          'node_modules',
          'apple.js',
        );
        expect(eventsQueue).toHaveLength(1);
        expect(eventsQueue).toEqual([
          {filePath, stat: MOCK_STAT_FILE, type: 'add'},
        ]);
        expect(hasteFS.getModuleName(filePath)).toBeDefined();
      },
    );

    hm_it(
      'correctly tracks changes to both platform-specific versions of a single module name',
      async hm => {
        const {moduleMap: initMM} = await hm.build();
        expect(initMM.getModule('Orange', 'ios')).toBeTruthy();
        expect(initMM.getModule('Orange', 'android')).toBeTruthy();
        const e = mockEmitters[path.join('/', 'project', 'fruits')];
        e.emit(
          'all',
          'change',
          'Orange.ios.js',
          path.join('/', 'project', 'fruits'),
          MOCK_STAT_FILE,
        );
        e.emit(
          'all',
          'change',
          'Orange.android.js',
          path.join('/', 'project', 'fruits'),
          MOCK_STAT_FILE,
        );
        const {eventsQueue, hasteFS, moduleMap} = await waitForItToChange(hm);
        expect(eventsQueue).toHaveLength(2);
        expect(eventsQueue).toEqual([
          {
            filePath: path.join('/', 'project', 'fruits', 'Orange.ios.js'),
            stat: MOCK_STAT_FILE,
            type: 'change',
          },
          {
            filePath: path.join('/', 'project', 'fruits', 'Orange.android.js'),
            stat: MOCK_STAT_FILE,
            type: 'change',
          },
        ]);
        expect(
          hasteFS.getModuleName(
            path.join('/', 'project', 'fruits', 'Orange.ios.js'),
          ),
        ).toBeTruthy();
        expect(
          hasteFS.getModuleName(
            path.join('/', 'project', 'fruits', 'Orange.android.js'),
          ),
        ).toBeTruthy();
        const iosVariant = moduleMap.getModule('Orange', 'ios');
        expect(iosVariant).toBe(
          path.join('/', 'project', 'fruits', 'Orange.ios.js'),
        );
        const androidVariant = moduleMap.getModule('Orange', 'android');
        expect(androidVariant).toBe(
          path.join('/', 'project', 'fruits', 'Orange.android.js'),
        );
      },
      {
        mockFs: {
          [path.join('/', 'project', 'fruits', 'Orange.android.js')]: `
            // Orange Android!
          `,
          [path.join('/', 'project', 'fruits', 'Orange.ios.js')]: `
            // Orange iOS!
          `,
        },
      },
    );

    describe('recovery from duplicate module IDs', () => {
      async function setupDuplicates(hm) {
        mockFs[path.join('/', 'project', 'fruits', 'Pear.js')] = `
          // Pear!
        `;
        mockFs[path.join('/', 'project', 'fruits', 'another', 'Pear.js')] = `
          // Pear too!
        `;
        const e = mockEmitters[path.join('/', 'project', 'fruits')];
        e.emit(
          'all',
          'change',
          'Pear.js',
          path.join('/', 'project', 'fruits'),
          MOCK_STAT_FILE,
        );
        e.emit(
          'all',
          'add',
          'Pear.js',
          path.join('/', 'project', 'fruits', 'another'),
          MOCK_STAT_FILE,
        );
        const {hasteFS, moduleMap} = await waitForItToChange(hm);
        expect(
          hasteFS.exists(
            path.join('/', 'project', 'fruits', 'another', 'Pear.js'),
          ),
        ).toBe(true);
        try {
          moduleMap.getModule('Pear');
          throw new Error('should be unreachable');
        } catch (error) {
          const {
            DuplicateHasteCandidatesError,
          } = require('../ModuleMap').default;
          expect(error).toBeInstanceOf(DuplicateHasteCandidatesError);
          expect(error.hasteName).toBe('Pear');
          expect(error.platform).toBe('g');
          expect(error.supportsNativePlatform).toBe(false);
          expect(error.duplicatesSet).toEqual(
            createMap({
              [path.join('/', 'project', 'fruits', 'Pear.js')]: H.MODULE,
              [path.join(
                '/',
                'project',
                'fruits',
                'another',
                'Pear.js',
              )]: H.MODULE,
            }),
          );
          expect(wrap(error.message.replace(/\\/g, '/'))).toMatchSnapshot();
        }
      }

      hm_it(
        'recovers when the oldest version of the duplicates is fixed',
        async hm => {
          await setupDuplicates(hm);
          mockFs[path.join('/', 'project', 'fruits', 'Pear.js')] = null;
          mockFs[path.join('/', 'project', 'fruits', 'Pear2.js')] = `
            // Pear!
          `;
          const e = mockEmitters[path.join('/', 'project', 'fruits')];
          e.emit(
            'all',
            'delete',
            'Pear.js',
            path.join('/', 'project', 'fruits'),
            MOCK_STAT_FILE,
          );
          e.emit(
            'all',
            'add',
            'Pear2.js',
            path.join('/', 'project', 'fruits'),
            MOCK_STAT_FILE,
          );
          const {moduleMap} = await waitForItToChange(hm);
          expect(moduleMap.getModule('Pear')).toBe(
            path.join('/', 'project', 'fruits', 'another', 'Pear.js'),
          );
          expect(moduleMap.getModule('Pear2')).toBe(
            path.join('/', 'project', 'fruits', 'Pear2.js'),
          );
        },
      );

      hm_it('recovers when the most recent duplicate is fixed', async hm => {
        await setupDuplicates(hm);
        mockFs[
          path.join('/', 'project', 'fruits', 'another', 'Pear.js')
        ] = null;
        mockFs[path.join('/', 'project', 'fruits', 'another', 'Pear2.js')] = `
          // Pear too!
        `;
        const e = mockEmitters[path.join('/', 'project', 'fruits')];
        e.emit(
          'all',
          'add',
          'Pear2.js',
          path.join('/', 'project', 'fruits', 'another'),
          MOCK_STAT_FILE,
        );
        e.emit(
          'all',
          'delete',
          'Pear.js',
          path.join('/', 'project', 'fruits', 'another'),
          MOCK_STAT_FILE,
        );
        const {moduleMap} = await waitForItToChange(hm);
        expect(moduleMap.getModule('Pear')).toBe(
          path.join('/', 'project', 'fruits', 'Pear.js'),
        );
        expect(moduleMap.getModule('Pear2')).toBe(
          path.join('/', 'project', 'fruits', 'another', 'Pear2.js'),
        );
      });

      hm_it('ignore directories', async hm => {
        const e = mockEmitters[path.join('/', 'project', 'fruits')];
        e.emit(
          'all',
          'change',
          'tomato.js',
          path.join('/', 'project', 'fruits'),
          MOCK_STAT_FOLDER,
        );
        e.emit(
          'all',
          'change',
          'tomato.js',
          path.join('/', 'project', 'fruits', 'tomato.js', 'index.js'),
          MOCK_STAT_FILE,
        );
        const {eventsQueue} = await waitForItToChange(hm);
        expect(eventsQueue).toHaveLength(1);
      });
    });
  });
});
