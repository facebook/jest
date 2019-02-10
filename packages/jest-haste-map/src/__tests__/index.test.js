/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import {skipSuiteOnWindows} from '../../../../scripts/ConditionalTest';
const crypto = require('crypto');

function mockHashContents(contents) {
  return crypto
    .createHash('sha1')
    .update(contents)
    .digest('hex');
}

jest.mock('child_process', () => ({
  // If this does not throw, we'll use the (mocked) watchman crawler
  execSync() {},
}));

jest.mock('jest-worker', () =>
  jest.fn(worker => {
    mockWorker = jest.fn((...args) => require(worker).worker(...args));
    mockEnd = jest.fn();

    return {
      end: mockEnd,
      worker: mockWorker,
    };
  }),
);

jest.mock('../crawlers/node');
jest.mock('../crawlers/watchman', () =>
  jest.fn(options => {
    const path = require('path');

    const {data, ignore, rootDir, roots, computeSha1} = options;
    const list = mockChangedFiles || mockFs;

    data.clocks = mockClocks;

    for (const file in list) {
      if (new RegExp(roots.join('|')).test(file) && !ignore(file)) {
        const relativeFilePath = path.relative(rootDir, file);
        if (list[file]) {
          const hash = computeSha1 ? mockHashContents(list[file]) : null;

          data.files.set(relativeFilePath, ['', 32, 42, 0, [], hash]);
        } else {
          data.files.delete(relativeFilePath);
        }
      }
    }

    return Promise.resolve(data);
  }),
);

const mockWatcherConstructor = jest.fn(root => {
  const EventEmitter = require('events').EventEmitter;
  mockEmitters[root] = new EventEmitter();
  mockEmitters[root].close = jest.fn(callback => callback());
  setTimeout(() => mockEmitters[root].emit('ready'), 0);
  return mockEmitters[root];
});

jest.mock('sane', () => ({
  NodeWatcher: mockWatcherConstructor,
  WatchmanWatcher: mockWatcherConstructor,
}));

jest.mock('../lib/WatchmanWatcher.js', () => mockWatcherConstructor);

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
jest.mock('fs', () => require('graceful-fs'));

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
  skipSuiteOnWindows();

  beforeEach(() => {
    jest.resetModules();

    mockEmitters = Object.create(null);
    mockFs = object({
      '/project/fruits/Banana.js': `
        const Strawberry = require("Strawberry");
      `,
      '/project/fruits/Pear.js': `
        const Banana = require("Banana");
        const Strawberry = require("Strawberry");
      `,
      '/project/fruits/Strawberry.js': `
        // Strawberry!
      `,
      '/project/fruits/__mocks__/Pear.js': `
        const Melon = require("Melon");
      `,
      '/project/vegetables/Melon.js': `
        // Melon!
      `,
      '/project/video/video.mp4': Buffer.from([
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
    console.warn = jest.fn();

    HasteMap = require('../');
    H = HasteMap.H;

    getCacheFilePath = HasteMap.getCacheFilePath;
    HasteMap.getCacheFilePath = jest.fn(() => cacheFilePath);

    defaultConfig = {
      extensions: ['js', 'json'],
      hasteImplModulePath: require.resolve('./haste_impl.js'),
      maxWorkers: 1,
      name: 'haste-map-test',
      platforms: ['ios', 'android'],
      resetCache: false,
      rootDir: '/project',
      roots: ['/project/fruits', '/project/vegetables'],
      useWatchman: true,
    };
  });

  afterEach(() => {
    console.warn = consoleWarn;
  });

  it('exports constants', () => {
    expect(HasteMap.H).toBe(require('../constants').default);
  });

  it('creates valid cache file paths', () => {
    jest.resetModuleRegistry();
    HasteMap = require('../');

    expect(
      HasteMap.getCacheFilePath('/', '@scoped/package', 'random-value'),
    ).toMatch(/^\/-scoped-package-(.*)$/);
  });

  it('creates different cache file paths for different roots', () => {
    jest.resetModuleRegistry();
    const HasteMap = require('../');
    const hasteMap1 = new HasteMap({...defaultConfig, rootDir: '/root1'});
    const hasteMap2 = new HasteMap({...defaultConfig, rootDir: '/root2'});
    expect(hasteMap1.getCacheFilePath()).not.toBe(hasteMap2.getCacheFilePath());
  });

  it('creates different cache file paths for different dependency extractor cache keys', () => {
    jest.resetModuleRegistry();
    const HasteMap = require('../');
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
    jest.resetModuleRegistry();
    const HasteMap = require('../');
    const hasteImpl = require('./haste_impl');
    hasteImpl.setCacheKey('foo');
    const hasteMap1 = new HasteMap(defaultConfig);
    hasteImpl.setCacheKey('bar');
    const hasteMap2 = new HasteMap(defaultConfig);
    expect(hasteMap1.getCacheFilePath()).not.toBe(hasteMap2.getCacheFilePath());
  });

  it('creates different cache file paths for different projects', () => {
    jest.resetModuleRegistry();
    const HasteMap = require('../');
    const hasteMap1 = new HasteMap({...defaultConfig, name: '@scoped/package'});
    const hasteMap2 = new HasteMap({...defaultConfig, name: '-scoped-package'});
    expect(hasteMap1.getCacheFilePath()).not.toBe(hasteMap2.getCacheFilePath());
  });

  it('matches files against a pattern', () =>
    new HasteMap(defaultConfig).build().then(({hasteFS}) => {
      expect(hasteFS.matchFiles(/project\/fruits/)).toEqual([
        '/project/fruits/Banana.js',
        '/project/fruits/Pear.js',
        '/project/fruits/Strawberry.js',
        '/project/fruits/__mocks__/Pear.js',
      ]);

      expect(hasteFS.matchFiles(/__mocks__/)).toEqual([
        '/project/fruits/__mocks__/Pear.js',
      ]);
    }));

  it('ignores files given a pattern', () => {
    const config = {...defaultConfig, ignorePattern: /Kiwi/};
    mockFs['/project/fruits/Kiwi.js'] = `
      // Kiwi!
    `;
    return new HasteMap(config).build().then(({hasteFS}) => {
      expect(hasteFS.matchFiles(/Kiwi/)).toEqual([]);
    });
  });

  it('builds a haste map on a fresh cache', () => {
    // Include these files in the map
    mockFs['/project/fruits/node_modules/react/React.js'] = `
      const Component = require("Component");
    `;
    mockFs['/project/fruits/node_modules/fbjs/lib/flatMap.js'] = `
      // flatMap
    `;

    // Ignore these
    mockFs[
      '/project/fruits/node_modules/react/node_modules/fbjs/lib/mapObject.js'
    ] = `
      // mapObject
    `;
    mockFs['/project/fruits/node_modules/react/node_modules/dummy/merge.js'] = `
      // merge
    `;
    mockFs[
      '/project/fruits/node_modules/react/node_modules/merge/package.json'
    ] = `
      {
        "name": "merge"
      }
    `;
    mockFs['/project/fruits/node_modules/jest/Jest.js'] = `
      const Test = require("Test");
    `;
    mockFs['/project/fruits/node_modules/fbjs2/fbjs2.js'] = `
      // fbjs2
    `;

    const hasteMap = new HasteMap({
      ...defaultConfig,
      mocksPattern: '/__mocks__/',
      providesModuleNodeModules: ['react', 'fbjs'],
    });

    return hasteMap.build().then(({__hasteMapForTest: data}) => {
      expect(data.clocks).toEqual(mockClocks);

      expect(data.files).toEqual(
        createMap({
          'fruits/Banana.js': ['Banana', 32, 42, 1, ['Strawberry'], null],
          'fruits/Pear.js': ['Pear', 32, 42, 1, ['Banana', 'Strawberry'], null],
          'fruits/Strawberry.js': ['Strawberry', 32, 42, 1, [], null],
          'fruits/__mocks__/Pear.js': ['', 32, 42, 1, ['Melon'], null],
          // node modules
          'fruits/node_modules/fbjs/lib/flatMap.js': [
            'flatMap',
            32,
            42,
            1,
            [],
            null,
          ],
          'fruits/node_modules/react/React.js': [
            'React',
            32,
            42,
            1,
            ['Component'],
            null,
          ],
          'vegetables/Melon.js': ['Melon', 32, 42, 1, [], null],
        }),
      );

      expect(data.map).toEqual(
        createMap({
          Banana: {[H.GENERIC_PLATFORM]: ['fruits/Banana.js', H.MODULE]},
          Melon: {[H.GENERIC_PLATFORM]: ['vegetables/Melon.js', H.MODULE]},
          Pear: {[H.GENERIC_PLATFORM]: ['fruits/Pear.js', H.MODULE]},
          React: {
            [H.GENERIC_PLATFORM]: [
              'fruits/node_modules/react/React.js',
              H.MODULE,
            ],
          },
          Strawberry: {
            [H.GENERIC_PLATFORM]: ['fruits/Strawberry.js', H.MODULE],
          },
          flatMap: {
            [H.GENERIC_PLATFORM]: [
              'fruits/node_modules/fbjs/lib/flatMap.js',
              H.MODULE,
            ],
          },
        }),
      );

      expect(data.mocks).toEqual(
        createMap({
          Pear: 'fruits/__mocks__/Pear.js',
        }),
      );

      // The cache file must exactly mirror the data structure returned from a
      // build
      expect(useBuitinsInContext(hasteMap.read())).toEqual(data);
    });
  });

  describe('builds a haste map on a fresh cache with SHA-1s', () => {
    [false, true].forEach(useWatchman => {
      it('uses watchman: ' + useWatchman, async () => {
        const node = require('../crawlers/node');

        node.mockImplementation(options => {
          const {data} = options;

          // The node crawler returns "null" for the SHA-1.
          data.files = createMap({
            'fruits/Banana.js': ['Banana', 32, 42, 0, ['Strawberry'], null],
            'fruits/Pear.js': [
              'Pear',
              32,
              42,
              0,
              ['Banana', 'Strawberry'],
              null,
            ],
            'fruits/Strawberry.js': ['Strawberry', 32, 42, 0, [], null],
            'fruits/__mocks__/Pear.js': ['', 32, 42, 0, ['Melon'], null],
            'vegetables/Melon.js': ['Melon', 32, 42, 0, [], null],
          });

          return Promise.resolve(data);
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
            'fruits/Banana.js': [
              'Banana',
              32,
              42,
              1,
              ['Strawberry'],
              '7772b628e422e8cf59c526be4bb9f44c0898e3d1',
            ],
            'fruits/Pear.js': [
              'Pear',
              32,
              42,
              1,
              ['Banana', 'Strawberry'],
              '89d0c2cc11dcc5e1df50b8af04ab1b597acfba2f',
            ],
            'fruits/Strawberry.js': [
              'Strawberry',
              32,
              42,
              1,
              [],
              'e8aa38e232b3795f062f1d777731d9240c0f8c25',
            ],
            'fruits/__mocks__/Pear.js': [
              '',
              32,
              42,
              1,
              ['Melon'],
              '8d40afbb6e2dc78e1ba383b6d02cafad35cceef2',
            ],
            'vegetables/Melon.js': [
              'Melon',
              32,
              42,
              1,
              [],
              'f16ccf6f2334ceff2ddb47628a2c5f2d748198ca',
            ],
          }),
        );

        expect(useBuitinsInContext(hasteMap.read())).toEqual(data);
      });
    });
  });

  it('does not crawl native files even if requested to do so', async () => {
    mockFs['/project/video/IRequireAVideo.js'] = `
      module.exports = require("./video.mp4");
    `;

    const hasteMap = new HasteMap({
      ...defaultConfig,
      extensions: [...defaultConfig.extensions],
      roots: [...defaultConfig.roots, '/project/video'],
    });

    const {__hasteMapForTest: data} = await hasteMap.build();

    expect(data.map.get('IRequireAVideo')).toBeDefined();
    expect(data.files.get('video/video.mp4')).toBeDefined();
    expect(fs.readFileSync).not.toBeCalledWith('video/video.mp4', 'utf8');
  });

  it('retains all files if `retainAllFiles` is specified', () => {
    mockFs['/project/fruits/node_modules/fbjs/fbjs.js'] = `
      // fbjs!
    `;

    const hasteMap = new HasteMap({
      ...defaultConfig,
      mocksPattern: '/__mocks__/',
      retainAllFiles: true,
    });

    return hasteMap.build().then(({__hasteMapForTest: data}) => {
      // Expect the node module to be part of files but make sure it wasn't
      // read.
      expect(data.files.get('fruits/node_modules/fbjs/fbjs.js')).toEqual([
        '',
        32,
        42,
        0,
        [],
        null,
      ]);

      expect(data.map.get('fbjs')).not.toBeDefined();

      // cache file + 5 modules - the node_module
      expect(fs.readFileSync.mock.calls.length).toBe(6);
    });
  });

  it('warns on duplicate mock files', () => {
    // Duplicate mock files for blueberry
    mockFs['/project/fruits1/__mocks__/subdir/Blueberry.js'] = `
      // Blueberry
    `;
    mockFs['/project/fruits2/__mocks__/subdir/Blueberry.js'] = `
      // Blueberry too!
    `;

    return new HasteMap({mocksPattern: '__mocks__', ...defaultConfig})
      .build()
      .then(({__hasteMapForTest: data}) => {
        expect(console.warn.mock.calls[0][0]).toMatchSnapshot();
      });
  });

  it('warns on duplicate module ids', () => {
    mockFs['/project/fruits/other/Strawberry.js'] = `
      const Banana = require("Banana");
    `;

    return new HasteMap(defaultConfig)
      .build()
      .then(({__hasteMapForTest: data}) => {
        // Duplicate modules are removed so that it doesn't cause
        // non-determinism later on.
        expect(
          data.map.get('Strawberry')[H.GENERIC_PLATFORM],
        ).not.toBeDefined();

        expect(console.warn.mock.calls[0][0]).toMatchSnapshot();
      });
  });

  it('warns on duplicate module ids only once', async () => {
    mockFs['/project/fruits/other/Strawberry.js'] = `
      const Banana = require("Banana");
    `;

    await new HasteMap(defaultConfig).build();
    expect(console.warn).toHaveBeenCalledTimes(1);

    await new HasteMap(defaultConfig).build();
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('throws on duplicate module ids if "throwOnModuleCollision" is set to true', () => {
    // Raspberry thinks it is a Strawberry
    mockFs['/project/fruits/another/Strawberry.js'] = `
      const Banana = require("Banana");
    `;

    return new HasteMap({throwOnModuleCollision: true, ...defaultConfig})
      .build()
      .catch(err => {
        expect(err).toMatchSnapshot();
      });
  });

  it('splits up modules by platform', () => {
    mockFs = Object.create(null);
    mockFs['/project/fruits/Strawberry.js'] = `
      const Banana = require("Banana");
    `;

    mockFs['/project/fruits/Strawberry.ios.js'] = `
      const Raspberry = require("Raspberry");
    `;

    mockFs['/project/fruits/Strawberry.android.js'] = `
      const Blackberry = require("Blackberry");
    `;

    return new HasteMap(defaultConfig)
      .build()
      .then(({__hasteMapForTest: data}) => {
        expect(data.files).toEqual(
          createMap({
            'fruits/Strawberry.android.js': [
              'Strawberry',
              32,
              42,
              1,
              ['Blackberry'],
              null,
            ],
            'fruits/Strawberry.ios.js': [
              'Strawberry',
              32,
              42,
              1,
              ['Raspberry'],
              null,
            ],
            'fruits/Strawberry.js': ['Strawberry', 32, 42, 1, ['Banana'], null],
          }),
        );

        expect(data.map).toEqual(
          createMap({
            Strawberry: {
              [H.GENERIC_PLATFORM]: ['fruits/Strawberry.js', H.MODULE],
              android: ['fruits/Strawberry.android.js', H.MODULE],
              ios: ['fruits/Strawberry.ios.js', H.MODULE],
            },
          }),
        );
      });
  });

  it('does not access the file system on a warm cache with no changes', () =>
    new HasteMap(defaultConfig)
      .build()
      .then(({__hasteMapForTest: initialData}) => {
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

        return new HasteMap(defaultConfig)
          .build()
          .then(({__hasteMapForTest: data}) => {
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
      }));

  it('only does minimal file system access when files change', () =>
    new HasteMap(defaultConfig)
      .build()
      .then(({__hasteMapForTest: initialData}) => {
        fs.readFileSync.mockClear();

        // Let's assume one JS file has changed.
        mockChangedFiles = object({
          '/project/fruits/Banana.js': `
            const Kiwi = require("Kiwi");
          `,
        });

        // Watchman would give us different clocks for `/project/fruits`.
        mockClocks = createMap({
          fruits: 'c:fake-clock:3',
          vegetables: 'c:fake-clock:2',
        });

        return new HasteMap(defaultConfig)
          .build()
          .then(({__hasteMapForTest: data}) => {
            expect(fs.readFileSync.mock.calls.length).toBe(2);

            if (require('v8').serialize) {
              expect(fs.readFileSync).toBeCalledWith(cacheFilePath);
            } else {
              expect(fs.readFileSync).toBeCalledWith(cacheFilePath, 'utf8');
            }
            expect(fs.readFileSync).toBeCalledWith(
              '/project/fruits/Banana.js',
              'utf8',
            );

            expect(useBuitinsInContext(data.clocks)).toEqual(mockClocks);

            const files = new Map(initialData.files);
            files.set('fruits/Banana.js', [
              'Banana',
              32,
              42,
              1,
              ['Kiwi'],
              null,
            ]);

            expect(useBuitinsInContext(data.files)).toEqual(files);

            const map = new Map(initialData.map);
            expect(useBuitinsInContext(data.map)).toEqual(map);
          });
      }));

  it('correctly handles file deletions', () =>
    new HasteMap(defaultConfig)
      .build()
      .then(({__hasteMapForTest: initialData}) => {
        fs.readFileSync.mockClear();

        // Let's assume one JS file was removed.
        delete mockFs['/project/fruits/Banana.js'];
        mockChangedFiles = object({
          '/project/fruits/Banana.js': null,
        });

        // Watchman would give us different clocks for `/project/fruits`.
        mockClocks = createMap({
          fruits: 'c:fake-clock:3',
          vegetables: 'c:fake-clock:2',
        });

        return new HasteMap(defaultConfig)
          .build()
          .then(({__hasteMapForTest: data}) => {
            const files = new Map(initialData.files);
            files.delete('fruits/Banana.js');
            expect(useBuitinsInContext(data.files)).toEqual(files);

            const map = new Map(initialData.map);
            map.delete('Banana');
            expect(useBuitinsInContext(data.map)).toEqual(map);
          });
      }));

  it('correctly handles platform-specific file additions', async () => {
    mockFs = Object.create(null);
    mockFs['/project/fruits/Strawberry.js'] = `
      const Banana = require("Banana");
    `;
    let data;
    ({__hasteMapForTest: data} = await new HasteMap(defaultConfig).build());
    expect(data.map.get('Strawberry')).toEqual({
      g: ['fruits/Strawberry.js', 0],
    });

    delete mockFs['/project/fruits/Strawberry.ios.js'];
    mockChangedFiles = object({
      '/project/fruits/Strawberry.ios.js': `
        const Raspberry = require("Raspberry");
      `,
    });
    mockClocks = createMap({fruits: 'c:fake-clock:3'});
    ({__hasteMapForTest: data} = await new HasteMap(defaultConfig).build());
    expect(data.map.get('Strawberry')).toEqual({
      g: ['fruits/Strawberry.js', 0],
      ios: ['fruits/Strawberry.ios.js', 0],
    });
  });

  it('correctly handles platform-specific file deletions', async () => {
    mockFs = Object.create(null);
    mockFs['/project/fruits/Strawberry.js'] = `
      const Banana = require("Banana");
    `;
    mockFs['/project/fruits/Strawberry.ios.js'] = `
      const Raspberry = require("Raspberry");
    `;
    let data;
    ({__hasteMapForTest: data} = await new HasteMap(defaultConfig).build());
    expect(data.map.get('Strawberry')).toEqual({
      g: ['fruits/Strawberry.js', 0],
      ios: ['fruits/Strawberry.ios.js', 0],
    });

    delete mockFs['/project/fruits/Strawberry.ios.js'];
    mockChangedFiles = object({'/project/fruits/Strawberry.ios.js': null});
    mockClocks = createMap({fruits: 'c:fake-clock:3'});
    ({__hasteMapForTest: data} = await new HasteMap(defaultConfig).build());
    expect(data.map.get('Strawberry')).toEqual({
      g: ['fruits/Strawberry.js', 0],
    });
  });

  it('correctly handles platform-specific file renames', async () => {
    mockFs = Object.create(null);
    mockFs['/project/fruits/Strawberry.ios.js'] = `
      const Raspberry = require("Raspberry");
    `;
    let data;
    ({__hasteMapForTest: data} = await new HasteMap(defaultConfig).build());
    expect(data.map.get('Strawberry')).toEqual({
      ios: ['fruits/Strawberry.ios.js', 0],
    });

    delete mockFs['/project/fruits/Strawberry.ios.js'];
    mockChangedFiles = object({
      '/project/fruits/Strawberry.ios.js': null,
      '/project/fruits/Strawberry.js': `
        const Banana = require("Banana");
      `,
    });
    mockClocks = createMap({fruits: 'c:fake-clock:3'});
    ({__hasteMapForTest: data} = await new HasteMap(defaultConfig).build());
    expect(data.map.get('Strawberry')).toEqual({
      g: ['fruits/Strawberry.js', 0],
    });
  });

  describe('duplicate modules', () => {
    beforeEach(async () => {
      mockFs['/project/fruits/another/Strawberry.js'] = `
        const Blackberry = require("Blackberry");
      `;

      const {__hasteMapForTest: data} = await new HasteMap(
        defaultConfig,
      ).build();
      expect(useBuitinsInContext(data.duplicates)).toEqual(
        createMap({
          Strawberry: createMap({
            g: createMap({
              'fruits/Strawberry.js': H.MODULE,
              'fruits/another/Strawberry.js': H.MODULE,
            }),
          }),
        }),
      );
      expect(data.map.get('Strawberry')).toEqual({});
    });

    it('recovers when a duplicate file is deleted', async () => {
      delete mockFs['/project/fruits/another/Strawberry.js'];
      mockChangedFiles = object({
        '/project/fruits/another/Strawberry.js': null,
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
        g: ['fruits/Strawberry.js', H.MODULE],
      });
      // Make sure the other files are not affected.
      expect(data.map.get('Banana')).toEqual({
        g: ['fruits/Banana.js', H.MODULE],
      });
    });

    it('recovers with the correct type when a duplicate file is deleted', async () => {
      mockFs['/project/fruits/strawberryPackage/package.json'] = `
        {"name": "Strawberry"}
      `;

      const {__hasteMapForTest: data} = await new HasteMap(
        defaultConfig,
      ).build();

      expect(useBuitinsInContext(data.duplicates)).toEqual(
        createMap({
          Strawberry: createMap({
            g: createMap({
              'fruits/Strawberry.js': H.MODULE,
              'fruits/another/Strawberry.js': H.MODULE,
              'fruits/strawberryPackage/package.json': H.PACKAGE,
            }),
          }),
        }),
      );

      delete mockFs['/project/fruits/another/Strawberry.js'];
      delete mockFs['/project/fruits/strawberryPackage/package.json'];

      mockChangedFiles = object({
        '/project/fruits/another/Strawberry.js': null,
        '/project/fruits/strawberryPackage/package.json': null,
      });
      mockClocks = createMap({
        fruits: 'c:fake-clock:4',
      });

      const {__hasteMapForTest: correctData} = await new HasteMap(
        defaultConfig,
      ).build();

      expect(useBuitinsInContext(correctData.duplicates)).toEqual(new Map());
      expect(correctData.map.get('Strawberry')).toEqual({
        g: ['fruits/Strawberry.js', H.MODULE],
      });
    });

    it('recovers when a duplicate module is renamed', async () => {
      mockChangedFiles = object({
        '/project/fruits/another/Pineapple.js': `
          const Blackberry = require("Blackberry");
        `,
        '/project/fruits/another/Strawberry.js': null,
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
        g: ['fruits/Strawberry.js', H.MODULE],
      });
      expect(data.map.get('Pineapple')).toEqual({
        g: ['fruits/another/Pineapple.js', H.MODULE],
      });
      // Make sure the other files are not affected.
      expect(data.map.get('Banana')).toEqual({
        g: ['fruits/Banana.js', H.MODULE],
      });
    });
  });

  it('discards the cache when configuration changes', () => {
    HasteMap.getCacheFilePath = getCacheFilePath;
    return new HasteMap(defaultConfig).build().then(() => {
      fs.readFileSync.mockClear();

      // Explicitly mock that no files have changed.
      mockChangedFiles = Object.create(null);

      // Watchman would give us different clocks.
      mockClocks = createMap({
        fruits: 'c:fake-clock:3',
        vegetables: 'c:fake-clock:4',
      });

      const config = {...defaultConfig, ignorePattern: /Kiwi|Pear/};
      return new HasteMap(config).build().then(({moduleMap}) => {
        expect(moduleMap.getModule('Pear')).toBe(null);
      });
    });
  });

  it('ignores files that do not exist', () => {
    const watchman = require('../crawlers/watchman');
    const mockImpl = watchman.getMockImplementation();
    // Wrap the watchman mock and add an invalid file to the file list.
    watchman.mockImplementation(options =>
      mockImpl(options).then(() => {
        const {data} = options;
        data.files.set('fruits/invalid/file.js', ['', 34, 44, 0, []]);
        return data;
      }),
    );
    return new HasteMap(defaultConfig)
      .build()
      .then(({__hasteMapForTest: data}) => {
        expect(data.files.size).toBe(5);

        // Ensure this file is not part of the file list.
        expect(data.files.get('fruits/invalid/file.js')).toBe(undefined);
      });
  });

  it('distributes work across workers', () => {
    const jestWorker = require('jest-worker');
    const path = require('path');
    const dependencyExtractor = path.join(__dirname, 'dependencyExtractor.js');
    return new HasteMap({
      ...defaultConfig,
      dependencyExtractor,
      hasteImplModulePath: undefined,
      maxWorkers: 4,
    })
      .build()
      .then(({__hasteMapForTest: data}) => {
        expect(jestWorker.mock.calls.length).toBe(1);

        expect(mockWorker.mock.calls.length).toBe(5);

        expect(mockWorker.mock.calls).toEqual([
          [
            {
              computeDependencies: true,
              computeSha1: false,
              dependencyExtractor,
              filePath: '/project/fruits/Banana.js',
              hasteImplModulePath: undefined,
              rootDir: '/project',
            },
          ],
          [
            {
              computeDependencies: true,
              computeSha1: false,
              dependencyExtractor,
              filePath: '/project/fruits/Pear.js',
              hasteImplModulePath: undefined,
              rootDir: '/project',
            },
          ],
          [
            {
              computeDependencies: true,
              computeSha1: false,
              dependencyExtractor,
              filePath: '/project/fruits/Strawberry.js',
              hasteImplModulePath: undefined,
              rootDir: '/project',
            },
          ],
          [
            {
              computeDependencies: true,
              computeSha1: false,
              dependencyExtractor,
              filePath: '/project/fruits/__mocks__/Pear.js',
              hasteImplModulePath: undefined,
              rootDir: '/project',
            },
          ],
          [
            {
              computeDependencies: true,
              computeSha1: false,
              dependencyExtractor,
              filePath: '/project/vegetables/Melon.js',
              hasteImplModulePath: undefined,
              rootDir: '/project',
            },
          ],
        ]);

        expect(mockEnd).toBeCalled();
      });
  });

  it('tries to crawl using node as a fallback', () => {
    const watchman = require('../crawlers/watchman');
    const node = require('../crawlers/node');

    watchman.mockImplementation(() => {
      throw new Error('watchman error');
    });
    node.mockImplementation(options => {
      const {data} = options;
      data.files = createMap({
        'fruits/Banana.js': ['', 32, 42, 0, [], null],
      });
      return Promise.resolve(data);
    });

    return new HasteMap(defaultConfig)
      .build()
      .then(({__hasteMapForTest: data}) => {
        expect(watchman).toBeCalled();
        expect(node).toBeCalled();

        expect(data.files).toEqual(
          createMap({
            'fruits/Banana.js': ['Banana', 32, 42, 1, ['Strawberry'], null],
          }),
        );

        expect(console.warn.mock.calls[0][0]).toMatchSnapshot();
      });
  });

  it('tries to crawl using node as a fallback when promise fails once', () => {
    const watchman = require('../crawlers/watchman');
    const node = require('../crawlers/node');

    watchman.mockImplementation(() =>
      Promise.reject(new Error('watchman error')),
    );
    node.mockImplementation(options => {
      const {data} = options;
      data.files = createMap({
        'fruits/Banana.js': ['', 32, 42, 0, [], null],
      });
      return Promise.resolve(data);
    });

    return new HasteMap(defaultConfig)
      .build()
      .then(({__hasteMapForTest: data}) => {
        expect(watchman).toBeCalled();
        expect(node).toBeCalled();

        expect(data.files).toEqual(
          createMap({
            'fruits/Banana.js': ['Banana', 32, 42, 1, ['Strawberry'], null],
          }),
        );
      });
  });

  it('stops crawling when both crawlers fail', () => {
    const watchman = require('../crawlers/watchman');
    const node = require('../crawlers/node');

    watchman.mockImplementation(() =>
      Promise.reject(new Error('watchman error')),
    );

    node.mockImplementation((roots, extensions, ignore, data) =>
      Promise.reject(new Error('node error')),
    );

    return new HasteMap(defaultConfig).build().then(
      () => expect(() => {}).toThrow(),
      error => {
        expect(error.message).toEqual(
          'Crawler retry failed:\n' +
            '  Original error: watchman error\n' +
            '  Retry error: node error\n',
        );
      },
    );
  });

  describe('file system changes processing', () => {
    function waitForItToChange(hasteMap) {
      return new Promise((resolve, reject) => {
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
      const filePath = '/project/fruits/Banana.js';
      expect(initialResult.hasteFS.getModuleName(filePath)).toBeDefined();
      expect(initialResult.moduleMap.getModule('Banana')).toBe(filePath);
      mockDeleteFile('/project/fruits', 'Banana.js');
      mockDeleteFile('/project/fruits', 'Banana.js');
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
      mockFs['/project/fruits/Tomato.js'] = `
        // Tomato!
      `;
      mockFs['/project/fruits/Pear.js'] = `
        // Pear!
      `;
      const e = mockEmitters['/project/fruits'];
      e.emit('all', 'add', 'Tomato.js', '/project/fruits', MOCK_STAT_FILE);
      e.emit('all', 'change', 'Pear.js', '/project/fruits', MOCK_STAT_FILE);
      const {eventsQueue, hasteFS, moduleMap} = await waitForItToChange(hm);
      expect(eventsQueue).toEqual([
        {
          filePath: '/project/fruits/Tomato.js',
          stat: MOCK_STAT_FILE,
          type: 'add',
        },
        {
          filePath: '/project/fruits/Pear.js',
          stat: MOCK_STAT_FILE,
          type: 'change',
        },
      ]);
      expect(hasteFS.getModuleName('/project/fruits/Tomato.js')).not.toBeNull();
      expect(moduleMap.getModule('Tomato')).toBeDefined();
      expect(moduleMap.getModule('Pear')).toBe('/project/fruits/Pear.js');
    });

    hm_it('does not emit duplicate change events', async hm => {
      const e = mockEmitters['/project/fruits'];
      e.emit('all', 'change', 'tomato.js', '/project/fruits', MOCK_STAT_FILE);
      e.emit('all', 'change', 'tomato.js', '/project/fruits', MOCK_STAT_FILE);
      const {eventsQueue} = await waitForItToChange(hm);
      expect(eventsQueue).toHaveLength(1);
    });

    hm_it(
      'emits a change even if a file in node_modules has changed',
      async hm => {
        const e = mockEmitters['/project/fruits'];
        e.emit(
          'all',
          'add',
          'apple.js',
          '/project/fruits/node_modules/',
          MOCK_STAT_FILE,
        );
        const {eventsQueue, hasteFS} = await waitForItToChange(hm);
        const filePath = '/project/fruits/node_modules/apple.js';
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
        const e = mockEmitters['/project/fruits'];
        e.emit(
          'all',
          'change',
          'Orange.ios.js',
          '/project/fruits/',
          MOCK_STAT_FILE,
        );
        e.emit(
          'all',
          'change',
          'Orange.android.js',
          '/project/fruits/',
          MOCK_STAT_FILE,
        );
        const {eventsQueue, hasteFS, moduleMap} = await waitForItToChange(hm);
        expect(eventsQueue).toHaveLength(2);
        expect(eventsQueue).toEqual([
          {
            filePath: '/project/fruits/Orange.ios.js',
            stat: MOCK_STAT_FILE,
            type: 'change',
          },
          {
            filePath: '/project/fruits/Orange.android.js',
            stat: MOCK_STAT_FILE,
            type: 'change',
          },
        ]);
        expect(
          hasteFS.getModuleName('/project/fruits/Orange.ios.js'),
        ).toBeTruthy();
        expect(
          hasteFS.getModuleName('/project/fruits/Orange.android.js'),
        ).toBeTruthy();
        const iosVariant = moduleMap.getModule('Orange', 'ios');
        expect(iosVariant).toBe('/project/fruits/Orange.ios.js');
        const androidVariant = moduleMap.getModule('Orange', 'android');
        expect(androidVariant).toBe('/project/fruits/Orange.android.js');
      },
      {
        mockFs: {
          '/project/fruits/Orange.android.js': `
            // Orange Android!
          `,
          '/project/fruits/Orange.ios.js': `
            // Orange iOS!
          `,
        },
      },
    );

    describe('recovery from duplicate module IDs', () => {
      async function setupDuplicates(hm) {
        mockFs['/project/fruits/Pear.js'] = `
          // Pear!
        `;
        mockFs['/project/fruits/another/Pear.js'] = `
          // Pear too!
        `;
        const e = mockEmitters['/project/fruits'];
        e.emit('all', 'change', 'Pear.js', '/project/fruits', MOCK_STAT_FILE);
        e.emit(
          'all',
          'add',
          'Pear.js',
          '/project/fruits/another',
          MOCK_STAT_FILE,
        );
        const {hasteFS, moduleMap} = await waitForItToChange(hm);
        expect(hasteFS.exists('/project/fruits/another/Pear.js')).toBe(true);
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
              '/project/fruits/Pear.js': H.MODULE,
              '/project/fruits/another/Pear.js': H.MODULE,
            }),
          );
          expect(error.message).toMatchSnapshot();
        }
      }

      hm_it(
        'recovers when the oldest version of the duplicates is fixed',
        async hm => {
          await setupDuplicates(hm);
          mockFs['/project/fruits/Pear.js'] = null;
          mockFs['/project/fruits/Pear2.js'] = `
            // Pear!
          `;
          const e = mockEmitters['/project/fruits'];
          e.emit('all', 'delete', 'Pear.js', '/project/fruits', MOCK_STAT_FILE);
          e.emit('all', 'add', 'Pear2.js', '/project/fruits', MOCK_STAT_FILE);
          const {moduleMap} = await waitForItToChange(hm);
          expect(moduleMap.getModule('Pear')).toBe(
            '/project/fruits/another/Pear.js',
          );
          expect(moduleMap.getModule('Pear2')).toBe('/project/fruits/Pear2.js');
        },
      );

      hm_it('recovers when the most recent duplicate is fixed', async hm => {
        await setupDuplicates(hm);
        mockFs['/project/fruits/another/Pear.js'] = null;
        mockFs['/project/fruits/another/Pear2.js'] = `
          // Pear too!
        `;
        const e = mockEmitters['/project/fruits'];
        e.emit(
          'all',
          'add',
          'Pear2.js',
          '/project/fruits/another',
          MOCK_STAT_FILE,
        );
        e.emit(
          'all',
          'delete',
          'Pear.js',
          '/project/fruits/another',
          MOCK_STAT_FILE,
        );
        const {moduleMap} = await waitForItToChange(hm);
        expect(moduleMap.getModule('Pear')).toBe('/project/fruits/Pear.js');
        expect(moduleMap.getModule('Pear2')).toBe(
          '/project/fruits/another/Pear2.js',
        );
      });

      hm_it('ignore directories', async hm => {
        const e = mockEmitters['/project/fruits'];
        e.emit(
          'all',
          'change',
          'tomato.js',
          '/project/fruits',
          MOCK_STAT_FOLDER,
        );
        e.emit(
          'all',
          'change',
          'tomato.js',
          '/project/fruits/tomato.js/index.js',
          MOCK_STAT_FILE,
        );
        const {eventsQueue} = await waitForItToChange(hm);
        expect(eventsQueue).toHaveLength(1);
      });
    });
  });
});
