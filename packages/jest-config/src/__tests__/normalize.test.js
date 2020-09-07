/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import crypto from 'crypto';
import path from 'path';
import {escapeStrForRegex} from 'jest-regex-util';
import normalize from '../normalize';
import Defaults from '../Defaults';

import {DEFAULT_JS_PATTERN} from '../constants';

const DEFAULT_CSS_PATTERN = '^.+\\.(css)$';

jest
  .mock('jest-resolve')
  .mock('path', () => jest.requireActual('path').posix)
  .mock('graceful-fs', () => {
    const realFs = jest.requireActual('fs');

    return {
      ...realFs,
      statSync: () => ({isDirectory: () => true}),
    };
  });

let root;
let expectedPathFooBar;
let expectedPathFooQux;
let expectedPathAbs;
let expectedPathAbsAnother;

let virtualModuleRegexes;
beforeEach(() => (virtualModuleRegexes = [/jest-jasmine2/, /babel-jest/]));
const findNodeModule = jest.fn(name => {
  if (virtualModuleRegexes.some(regex => regex.test(name))) {
    return name;
  }
  return null;
});

// Windows uses backslashes for path separators, which need to be escaped in
// regular expressions. This little helper function helps us generate the
// expected strings for checking path patterns.
function joinForPattern() {
  return Array.prototype.join.call(arguments, escapeStrForRegex(path.sep));
}

beforeEach(() => {
  root = path.resolve('/');
  expectedPathFooBar = path.join(root, 'root', 'path', 'foo', 'bar', 'baz');
  expectedPathFooQux = path.join(root, 'root', 'path', 'foo', 'qux', 'quux');
  expectedPathAbs = path.join(root, 'an', 'abs', 'path');
  expectedPathAbsAnother = path.join(root, 'another', 'abs', 'path');

  require('jest-resolve').findNodeModule = findNodeModule;

  jest.spyOn(console, 'warn');
});

afterEach(() => {
  console.warn.mockRestore();
});

it('picks a name based on the rootDir', () => {
  const rootDir = '/root/path/foo';
  const expected = crypto
    .createHash('md5')
    .update('/root/path/foo')
    .update(String(Infinity))
    .digest('hex');
  expect(
    normalize(
      {
        rootDir,
      },
      {},
    ).options.id,
  ).toBe(expected);
});

it('keeps custom project name based on the projects rootDir', () => {
  const name = 'test';
  const options = normalize(
    {
      projects: [{name, rootDir: '/path/to/foo'}],
      rootDir: '/root/path/baz',
    },
    {},
  );

  expect(options.options.projects[0].name).toBe(name);
});

it('keeps custom names based on the rootDir', () => {
  expect(
    normalize(
      {
        id: 'custom-name',
        rootDir: '/root/path/foo',
      },
      {},
    ).options.id,
  ).toBe('custom-name');
});

it('minimal config is stable across runs', () => {
  const firstNormalization = normalize({rootDir: '/root/path/foo'}, {});
  const secondNormalization = normalize({rootDir: '/root/path/foo'}, {});

  expect(firstNormalization).toEqual(secondNormalization);
  expect(JSON.stringify(firstNormalization)).toBe(
    JSON.stringify(secondNormalization),
  );
});

it('sets coverageReporters correctly when argv.json is set', () => {
  expect(
    normalize(
      {
        rootDir: '/root/path/foo',
      },
      {
        json: true,
      },
    ).options.coverageReporters,
  ).toEqual(['json', 'lcov', 'clover']);
});

describe('rootDir', () => {
  it('throws if the options is missing a rootDir property', () => {
    expect(() => {
      normalize({}, {});
    }).toThrowErrorMatchingSnapshot();
  });
});

describe('automock', () => {
  it('falsy automock is not overwritten', () => {
    console.warn.mockImplementation(() => {});
    const {options} = normalize(
      {
        automock: false,
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options.automock).toBe(false);
  });
});

describe('collectCoverageOnlyFrom', () => {
  it('normalizes all paths relative to rootDir', () => {
    const {options} = normalize(
      {
        collectCoverageOnlyFrom: {
          'bar/baz': true,
          'qux/quux/': true,
        },
        rootDir: '/root/path/foo/',
      },
      {},
    );

    const expected = {};
    expected[expectedPathFooBar] = true;
    expected[expectedPathFooQux] = true;

    expect(options.collectCoverageOnlyFrom).toEqual(expected);
  });

  it('does not change absolute paths', () => {
    const {options} = normalize(
      {
        collectCoverageOnlyFrom: {
          '/an/abs/path': true,
          '/another/abs/path': true,
        },
        rootDir: '/root/path/foo',
      },
      {},
    );

    const expected = {};
    expected[expectedPathAbs] = true;
    expected[expectedPathAbsAnother] = true;

    expect(options.collectCoverageOnlyFrom).toEqual(expected);
  });

  it('substitutes <rootDir> tokens', () => {
    const {options} = normalize(
      {
        collectCoverageOnlyFrom: {
          '<rootDir>/bar/baz': true,
        },
        rootDir: '/root/path/foo',
      },
      {},
    );

    const expected = {};
    expected[expectedPathFooBar] = true;

    expect(options.collectCoverageOnlyFrom).toEqual(expected);
  });
});

describe('collectCoverageFrom', () => {
  it('substitutes <rootDir> tokens', () => {
    const barBaz = 'bar/baz';
    const quxQuux = 'qux/quux/';
    const notQuxQuux = `!${quxQuux}`;

    const {options} = normalize(
      {
        collectCoverageFrom: [
          barBaz,
          notQuxQuux,
          `<rootDir>/${barBaz}`,
          `!<rootDir>/${quxQuux}`,
        ],
        rootDir: '/root/path/foo/',
      },
      {},
    );

    const expected = [barBaz, notQuxQuux, barBaz, notQuxQuux];

    expect(options.collectCoverageFrom).toEqual(expected);
  });
});

describe('findRelatedTests', () => {
  it('it generates --coverageCoverageFrom patterns when needed', () => {
    const sourceFile = 'file1.js';

    const {options} = normalize(
      {
        collectCoverage: true,
        rootDir: '/root/path/foo/',
      },
      {
        _: [
          `/root/path/${sourceFile}`,
          sourceFile,
          `<rootDir>/bar/${sourceFile}`,
        ],
        findRelatedTests: true,
      },
    );

    const expected = [`../${sourceFile}`, `${sourceFile}`, `bar/${sourceFile}`];

    expect(options.collectCoverageFrom).toEqual(expected);
  });
});

function testPathArray(key) {
  it('normalizes all paths relative to rootDir', () => {
    const {options} = normalize(
      {
        [key]: ['bar/baz', 'qux/quux/'],
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options[key]).toEqual([expectedPathFooBar, expectedPathFooQux]);
  });

  it('does not change absolute paths', () => {
    const {options} = normalize(
      {
        [key]: ['/an/abs/path', '/another/abs/path'],
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options[key]).toEqual([expectedPathAbs, expectedPathAbsAnother]);
  });

  it('substitutes <rootDir> tokens', () => {
    const {options} = normalize(
      {
        [key]: ['<rootDir>/bar/baz'],
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options[key]).toEqual([expectedPathFooBar]);
  });
}

describe('roots', () => {
  testPathArray('roots');
});

describe('transform', () => {
  let Resolver;
  beforeEach(() => {
    Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name => name);
  });

  it('normalizes the path', () => {
    const {options} = normalize(
      {
        rootDir: '/root/',
        transform: {
          [DEFAULT_CSS_PATTERN]: '<rootDir>/node_modules/jest-regex-util',
          [DEFAULT_JS_PATTERN]: 'babel-jest',
          'abs-path': '/qux/quux',
        },
      },
      {},
    );

    expect(options.transform).toEqual([
      [DEFAULT_CSS_PATTERN, '/root/node_modules/jest-regex-util', {}],
      [DEFAULT_JS_PATTERN, require.resolve('babel-jest'), {}],
      ['abs-path', '/qux/quux', {}],
    ]);
  });
  it("pulls in config if it's passed as an array, and defaults to empty object", () => {
    const {options} = normalize(
      {
        rootDir: '/root/',
        transform: {
          [DEFAULT_CSS_PATTERN]: '<rootDir>/node_modules/jest-regex-util',
          [DEFAULT_JS_PATTERN]: ['babel-jest', {rootMode: 'upward'}],
          'abs-path': '/qux/quux',
        },
      },
      {},
    );
    expect(options.transform).toEqual([
      [DEFAULT_CSS_PATTERN, '/root/node_modules/jest-regex-util', {}],
      [DEFAULT_JS_PATTERN, require.resolve('babel-jest'), {rootMode: 'upward'}],
      ['abs-path', '/qux/quux', {}],
    ]);
  });
});

describe('haste', () => {
  let Resolver;
  beforeEach(() => {
    Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name => name);
  });

  it('normalizes the path for hasteImplModulePath', () => {
    const {options} = normalize(
      {
        haste: {
          hasteImplModulePath: '<rootDir>/haste_impl.js',
        },
        rootDir: '/root/',
      },
      {},
    );

    expect(options.haste).toEqual({
      hasteImplModulePath: '/root/haste_impl.js',
    });
  });
});

describe('setupFilesAfterEnv', () => {
  let Resolver;
  beforeEach(() => {
    Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name =>
      name.startsWith('/') ? name : '/root/path/foo' + path.sep + name,
    );
  });

  it('normalizes the path according to rootDir', () => {
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
        setupFilesAfterEnv: ['bar/baz'],
      },
      {},
    );

    expect(options.setupFilesAfterEnv).toEqual([expectedPathFooBar]);
  });

  it('does not change absolute paths', () => {
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
        setupFilesAfterEnv: ['/an/abs/path'],
      },
      {},
    );

    expect(options.setupFilesAfterEnv).toEqual([expectedPathAbs]);
  });

  it('substitutes <rootDir> tokens', () => {
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
        setupFilesAfterEnv: ['<rootDir>/bar/baz'],
      },
      {},
    );

    expect(options.setupFilesAfterEnv).toEqual([expectedPathFooBar]);
  });
});

describe('setupTestFrameworkScriptFile', () => {
  let Resolver;

  beforeEach(() => {
    console.warn.mockImplementation(() => {});
    Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name =>
      name.startsWith('/') ? name : '/root/path/foo' + path.sep + name,
    );
  });

  it('logs a deprecation warning when `setupTestFrameworkScriptFile` is used', () => {
    normalize(
      {
        rootDir: '/root/path/foo',
        setupTestFrameworkScriptFile: 'bar/baz',
      },
      {},
    );

    expect(console.warn.mock.calls[0][0]).toMatchSnapshot();
  });

  it('logs an error when `setupTestFrameworkScriptFile` and `setupFilesAfterEnv` are used', () => {
    expect(() =>
      normalize(
        {
          rootDir: '/root/path/foo',
          setupFilesAfterEnv: ['bar/baz'],
          setupTestFrameworkScriptFile: 'bar/baz',
        },
        {},
      ),
    ).toThrowErrorMatchingSnapshot();
  });
});

describe('coveragePathIgnorePatterns', () => {
  it('does not normalize paths relative to rootDir', () => {
    // This is a list of patterns, so we can't assume any of them are
    // directories
    const {options} = normalize(
      {
        coveragePathIgnorePatterns: ['bar/baz', 'qux/quux'],
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options.coveragePathIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux'),
    ]);
  });

  it('does not normalize trailing slashes', () => {
    // This is a list of patterns, so we can't assume any of them are
    // directories
    const {options} = normalize(
      {
        coveragePathIgnorePatterns: ['bar/baz', 'qux/quux/'],
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options.coveragePathIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux', ''),
    ]);
  });

  it('substitutes <rootDir> tokens', () => {
    const {options} = normalize(
      {
        coveragePathIgnorePatterns: ['hasNoToken', '<rootDir>/hasAToken'],
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options.coveragePathIgnorePatterns).toEqual([
      'hasNoToken',
      joinForPattern('', 'root', 'path', 'foo', 'hasAToken'),
    ]);
  });
});

describe('watchPathIgnorePatterns', () => {
  it('does not normalize paths relative to rootDir', () => {
    // This is a list of patterns, so we can't assume any of them are
    // directories
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
        watchPathIgnorePatterns: ['bar/baz', 'qux/quux'],
      },
      {},
    );

    expect(options.watchPathIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux'),
    ]);
  });

  it('does not normalize trailing slashes', () => {
    // This is a list of patterns, so we can't assume any of them are
    // directories
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
        watchPathIgnorePatterns: ['bar/baz', 'qux/quux/'],
      },
      {},
    );

    expect(options.watchPathIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux', ''),
    ]);
  });

  it('substitutes <rootDir> tokens', () => {
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
        watchPathIgnorePatterns: ['hasNoToken', '<rootDir>/hasAToken'],
      },
      {},
    );

    expect(options.watchPathIgnorePatterns).toEqual([
      'hasNoToken',
      joinForPattern('', 'root', 'path', 'foo', 'hasAToken'),
    ]);
  });
});

describe('testPathIgnorePatterns', () => {
  it('does not normalize paths relative to rootDir', () => {
    // This is a list of patterns, so we can't assume any of them are
    // directories
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
        testPathIgnorePatterns: ['bar/baz', 'qux/quux'],
      },
      {},
    );

    expect(options.testPathIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux'),
    ]);
  });

  it('does not normalize trailing slashes', () => {
    // This is a list of patterns, so we can't assume any of them are
    // directories
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
        testPathIgnorePatterns: ['bar/baz', 'qux/quux/'],
      },
      {},
    );

    expect(options.testPathIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux', ''),
    ]);
  });

  it('substitutes <rootDir> tokens', () => {
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
        testPathIgnorePatterns: ['hasNoToken', '<rootDir>/hasAToken'],
      },
      {},
    );

    expect(options.testPathIgnorePatterns).toEqual([
      'hasNoToken',
      joinForPattern('', 'root', 'path', 'foo', 'hasAToken'),
    ]);
  });
});

describe('modulePathIgnorePatterns', () => {
  it('does not normalize paths relative to rootDir', () => {
    // This is a list of patterns, so we can't assume any of them are
    // directories
    const {options} = normalize(
      {
        modulePathIgnorePatterns: ['bar/baz', 'qux/quux'],
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options.modulePathIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux'),
    ]);
  });

  it('does not normalize trailing slashes', () => {
    // This is a list of patterns, so we can't assume any of them are
    // directories
    const {options} = normalize(
      {
        modulePathIgnorePatterns: ['bar/baz', 'qux/quux/'],
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options.modulePathIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux', ''),
    ]);
  });

  it('substitutes <rootDir> tokens', () => {
    const {options} = normalize(
      {
        modulePathIgnorePatterns: ['hasNoToken', '<rootDir>/hasAToken'],
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options.modulePathIgnorePatterns).toEqual([
      'hasNoToken',
      joinForPattern('', 'root', 'path', 'foo', 'hasAToken'),
    ]);
  });
});

describe('testRunner', () => {
  it('defaults to Jasmine 2', () => {
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options.testRunner).toMatch('jasmine2');
  });

  it('is overwritten by argv', () => {
    const Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name => name);
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
      },
      {
        testRunner: 'jasmine1',
      },
    );

    expect(options.testRunner).toBe('jasmine1');
  });
});

describe('coverageDirectory', () => {
  it('defaults to <rootDir>/coverage', () => {
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options.coverageDirectory).toBe('/root/path/foo/coverage');
  });
});

describe('testEnvironment', () => {
  let Resolver;
  beforeEach(() => {
    Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name => {
      if (['jsdom', 'jest-environment-jsdom'].includes(name)) {
        return `node_modules/${name}`;
      }
      if (name.startsWith('/root')) {
        return name;
      }
      return findNodeModule(name);
    });
  });

  it('resolves to an environment and prefers jest-environment-`name`', () => {
    const {options} = normalize(
      {
        rootDir: '/root',
        testEnvironment: 'jsdom',
      },
      {},
    );

    expect(options.testEnvironment).toEqual(
      'node_modules/jest-environment-jsdom',
    );
  });

  it('throws on invalid environment names', () => {
    expect(() =>
      normalize(
        {
          rootDir: '/root',
          testEnvironment: 'phantom',
        },
        {},
      ),
    ).toThrowErrorMatchingSnapshot();
  });

  it('works with rootDir', () => {
    const {options} = normalize(
      {
        rootDir: '/root',
        testEnvironment: '<rootDir>/testEnvironment.js',
      },
      {},
    );

    expect(options.testEnvironment).toEqual('/root/testEnvironment.js');
  });
});

describe('babel-jest', () => {
  let Resolver;
  beforeEach(() => {
    Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name =>
      name.indexOf('babel-jest') === -1
        ? path.sep + 'node_modules' + path.sep + name
        : name,
    );
  });

  it('correctly identifies and uses babel-jest', () => {
    const {options} = normalize(
      {
        rootDir: '/root',
      },
      {},
    );

    expect(options.transform[0][0]).toBe(DEFAULT_JS_PATTERN);
    expect(options.transform[0][1]).toEqual(require.resolve('babel-jest'));
  });

  it('uses babel-jest if babel-jest is explicitly specified in a custom transform options', () => {
    const customJSPattern = '^.+\\.js$';
    const {options} = normalize(
      {
        rootDir: '/root',
        transform: {
          [customJSPattern]: 'babel-jest',
        },
      },
      {},
    );

    expect(options.transform[0][0]).toBe(customJSPattern);
    expect(options.transform[0][1]).toEqual(require.resolve('babel-jest'));
  });
});

describe('Upgrade help', () => {
  beforeEach(() => {
    console.warn.mockImplementation(() => {});

    const Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name => {
      if (name == 'bar/baz') {
        return '/node_modules/bar/baz';
      }
      return findNodeModule(name);
    });
  });

  it('logs a warning when `scriptPreprocessor` and/or `preprocessorIgnorePatterns` are used', () => {
    const {options: options, hasDeprecationWarnings} = normalize(
      {
        preprocessorIgnorePatterns: ['bar/baz', 'qux/quux'],
        rootDir: '/root/path/foo',
        scriptPreprocessor: 'bar/baz',
      },
      {},
    );

    expect(options.transform).toEqual([['.*', '/node_modules/bar/baz', {}]]);
    expect(options.transformIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux'),
    ]);

    expect(options.scriptPreprocessor).toBe(undefined);
    expect(options.preprocessorIgnorePatterns).toBe(undefined);
    expect(hasDeprecationWarnings).toBeTruthy();

    expect(console.warn.mock.calls[0][0]).toMatchSnapshot();
  });
});

describe('testRegex', () => {
  it('testRegex empty string is mapped to empty array', () => {
    const {options} = normalize(
      {
        rootDir: '/root',
        testRegex: '',
      },
      {},
    );

    expect(options.testRegex).toEqual([]);
  });
  it('testRegex string is mapped to an array', () => {
    const {options} = normalize(
      {
        rootDir: '/root',
        testRegex: '.*',
      },
      {},
    );

    expect(options.testRegex).toEqual(['.*']);
  });
  it('testRegex array is preserved', () => {
    const {options} = normalize(
      {
        rootDir: '/root',
        testRegex: ['.*', 'foo\\.bar'],
      },
      {},
    );

    expect(options.testRegex).toEqual(['.*', 'foo\\.bar']);
  });
});

describe('testMatch', () => {
  it('testMatch default not applied if testRegex is set', () => {
    const {options} = normalize(
      {
        rootDir: '/root',
        testRegex: '.*',
      },
      {},
    );

    expect(options.testMatch.length).toBe(0);
  });

  it('testRegex default not applied if testMatch is set', () => {
    const {options} = normalize(
      {
        rootDir: '/root',
        testMatch: ['**/*.js'],
      },
      {},
    );

    expect(options.testRegex).toEqual([]);
  });

  it('throws if testRegex and testMatch are both specified', () => {
    expect(() => {
      normalize(
        {
          rootDir: '/root',
          testMatch: ['**/*.js'],
          testRegex: '.*',
        },
        {},
      );
    }).toThrowErrorMatchingSnapshot();
  });

  it('normalizes testMatch', () => {
    const {options} = normalize(
      {
        rootDir: '/root',
        testMatch: ['<rootDir>/**/*.js'],
      },
      {},
    );

    expect(options.testMatch).toEqual(['/root/**/*.js']);
  });
});

describe('moduleDirectories', () => {
  it('defaults to node_modules', () => {
    const {options} = normalize({rootDir: '/root'}, {});

    expect(options.moduleDirectories).toEqual(['node_modules']);
  });

  it('normalizes moduleDirectories', () => {
    const {options} = normalize(
      {
        moduleDirectories: ['<rootDir>/src', '<rootDir>/node_modules'],
        rootDir: '/root',
      },
      {},
    );

    expect(options.moduleDirectories).toEqual([
      '/root/src',
      '/root/node_modules',
    ]);
  });
});

describe('preset', () => {
  beforeEach(() => {
    const Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name => {
      if (name === 'react-native/jest-preset') {
        return '/node_modules/react-native/jest-preset.json';
      }

      if (name === 'react-native-js-preset/jest-preset') {
        return '/node_modules/react-native-js-preset/jest-preset.js';
      }

      if (name === 'doesnt-exist') {
        return null;
      }

      return '/node_modules/' + name;
    });
    jest.doMock(
      '/node_modules/react-native/jest-preset.json',
      () => ({
        moduleNameMapper: {b: 'b'},
        modulePathIgnorePatterns: ['b'],
        setupFiles: ['b'],
        setupFilesAfterEnv: ['b'],
        transform: {b: 'b'},
      }),
      {virtual: true},
    );
    jest.doMock(
      '/node_modules/react-native-js-preset/jest-preset.js',
      () => ({
        moduleNameMapper: {
          json: true,
        },
      }),
      {virtual: true},
    );
    jest.mock(
      '/node_modules/with-json-ext/jest-preset.json',
      () => ({
        moduleNameMapper: {
          json: true,
        },
      }),
      {virtual: true},
    );
    jest.mock(
      '/node_modules/with-js-ext/jest-preset.js',
      () => ({
        moduleNameMapper: {
          js: true,
        },
      }),
      {virtual: true},
    );
    jest.mock(
      '/node_modules/exist-but-no-jest-preset/index.js',
      () => ({
        moduleNameMapper: {
          js: true,
        },
      }),
      {virtual: true},
    );
  });

  afterEach(() => {
    jest.dontMock('/node_modules/react-native/jest-preset.json');
  });

  test('throws when preset not found', () => {
    expect(() => {
      normalize(
        {
          preset: 'doesnt-exist',
          rootDir: '/root/path/foo',
        },
        {},
      );
    }).toThrowErrorMatchingSnapshot();
  });

  test('throws when module was found but no "jest-preset.js" or "jest-preset.json" files', () => {
    expect(() => {
      normalize(
        {
          preset: 'exist-but-no-jest-preset',
          rootDir: '/root/path/foo',
        },
        {},
      );
    }).toThrowErrorMatchingSnapshot();
  });

  test('throws when a dependency is missing in the preset', () => {
    jest.doMock(
      '/node_modules/react-native-js-preset/jest-preset.js',
      () => {
        require('library-that-is-not-installed');
        return {
          transform: {},
        };
      },
      {virtual: true},
    );

    expect(() => {
      normalize(
        {
          preset: 'react-native-js-preset',
          rootDir: '/root/path/foo',
        },
        {},
      );
    }).toThrowError(/Cannot find module 'library-that-is-not-installed'/);
  });

  test('throws when preset is invalid', () => {
    jest.doMock('/node_modules/react-native/jest-preset.json', () =>
      jest.requireActual('./jest-preset.json'),
    );

    expect(() => {
      normalize(
        {
          preset: 'react-native',
          rootDir: '/root/path/foo',
        },
        {},
      );
    }).toThrowError(/Unexpected token } in JSON at position 104[\s\S]* at /);
  });

  test('throws when preset evaluation throws type error', () => {
    jest.doMock(
      '/node_modules/react-native-js-preset/jest-preset.js',
      () => ({
        transform: {}.nonExistingProp.call(),
      }),
      {virtual: true},
    );

    expect(() => {
      normalize(
        {
          preset: 'react-native-js-preset',
          rootDir: '/root/path/foo',
        },
        {},
      );
    }).toThrowError(
      /TypeError: Cannot read property 'call' of undefined[\s\S]* at /,
    );
  });

  test('works with "react-native"', () => {
    expect(() => {
      normalize(
        {
          preset: 'react-native',
          rootDir: '/root/path/foo',
        },
        {},
      );
    }).not.toThrow();
  });

  test('searches for .json and .js preset files', () => {
    const Resolver = require('jest-resolve');

    normalize(
      {
        preset: 'react-native',
        rootDir: '/root/path/foo',
      },
      {},
    );

    const options = Resolver.findNodeModule.mock.calls[0][1];
    expect(options.extensions).toEqual(['.json', '.js']);
  });

  test('merges with options', () => {
    const {options} = normalize(
      {
        moduleNameMapper: {a: 'a'},
        modulePathIgnorePatterns: ['a'],
        preset: 'react-native',
        rootDir: '/root/path/foo',
        setupFiles: ['a'],
        setupFilesAfterEnv: ['a'],
        transform: {a: 'a'},
      },
      {},
    );

    expect(options.moduleNameMapper).toEqual([
      ['a', 'a'],
      ['b', 'b'],
    ]);
    expect(options.modulePathIgnorePatterns).toEqual(['b', 'a']);
    expect(options.setupFiles.sort()).toEqual([
      '/node_modules/a',
      '/node_modules/b',
    ]);
    expect(options.setupFilesAfterEnv.sort()).toEqual([
      '/node_modules/a',
      '/node_modules/b',
    ]);
    expect(options.transform).toEqual([
      ['a', '/node_modules/a', {}],
      ['b', '/node_modules/b', {}],
    ]);
  });

  test('merges with options and moduleNameMapper preset is overridden by options', () => {
    // Object initializer not used for properties as a workaround for
    //  sort-keys eslint rule while specifying properties in
    //  non-alphabetical order for a better test
    const moduleNameMapper = {};
    moduleNameMapper.e = 'ee';
    moduleNameMapper.b = 'bb';
    moduleNameMapper.c = 'cc';
    moduleNameMapper.a = 'aa';
    const {options} = normalize(
      {
        moduleNameMapper,
        preset: 'react-native',
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options.moduleNameMapper).toEqual([
      ['e', 'ee'],
      ['b', 'bb'],
      ['c', 'cc'],
      ['a', 'aa'],
    ]);
  });

  test('merges with options and transform preset is overridden by options', () => {
    /* eslint-disable sort-keys */
    const transform = {
      e: 'ee',
      b: 'bb',
      c: 'cc',
      a: 'aa',
    };
    /* eslint-enable */
    const {options} = normalize(
      {
        preset: 'react-native',
        rootDir: '/root/path/foo',
        transform,
      },
      {},
    );

    expect(options.transform).toEqual([
      ['e', '/node_modules/ee', {}],
      ['b', '/node_modules/bb', {}],
      ['c', '/node_modules/cc', {}],
      ['a', '/node_modules/aa', {}],
    ]);
  });

  test('extracts setupFilesAfterEnv from preset', () => {
    const {options} = normalize(
      {
        preset: 'react-native',
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options.setupFilesAfterEnv).toEqual(['/node_modules/b']);
  });
});

describe('preset with globals', () => {
  beforeEach(() => {
    const Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name => {
      if (name === 'global-foo/jest-preset') {
        return '/node_modules/global-foo/jest-preset.json';
      }

      return '/node_modules/' + name;
    });
    jest.doMock(
      '/node_modules/global-foo/jest-preset.json',
      () => ({
        globals: {
          __DEV__: false,
          config: {
            hereToStay: 'This should stay here',
          },
          myString: 'hello world',
        },
      }),
      {virtual: true},
    );
  });

  afterEach(() => {
    jest.dontMock('/node_modules/global-foo/jest-preset.json');
  });

  test('should merge the globals preset correctly', () => {
    const {options} = normalize(
      {
        globals: {
          __DEV__: true,
          config: {
            sideBySide: 'This should also live another day',
          },
          myString: 'hello sunshine',
          textValue: 'This is just text',
        },
        preset: 'global-foo',
        rootDir: '/root/path/foo',
      },
      {},
    );

    expect(options.globals).toEqual({
      __DEV__: true,
      config: {
        hereToStay: 'This should stay here',
        sideBySide: 'This should also live another day',
      },
      myString: 'hello sunshine',
      textValue: 'This is just text',
    });
  });
});

describe.each(['setupFiles', 'setupFilesAfterEnv'])(
  'preset without %s',
  configKey => {
    let Resolver;
    beforeEach(() => {
      Resolver = require('jest-resolve');
      Resolver.findNodeModule = jest.fn(
        name => path.sep + 'node_modules' + path.sep + name,
      );
    });

    beforeAll(() => {
      jest.doMock(
        '/node_modules/react-foo/jest-preset',
        () => ({
          moduleNameMapper: {b: 'b'},
          modulePathIgnorePatterns: ['b'],
        }),
        {virtual: true},
      );
    });

    afterAll(() => {
      jest.dontMock('/node_modules/react-foo/jest-preset');
    });

    it(`should normalize ${configKey} correctly`, () => {
      const {options} = normalize(
        {
          [configKey]: ['a'],
          preset: 'react-foo',
          rootDir: '/root/path/foo',
        },
        {},
      );

      expect(options).toEqual(
        expect.objectContaining({[configKey]: ['/node_modules/a']}),
      );
    });
  },
);

describe('runner', () => {
  let Resolver;
  beforeEach(() => {
    Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name => {
      if (['eslint', 'jest-runner-eslint', 'my-runner-foo'].includes(name)) {
        return `node_modules/${name}`;
      }
      if (name.startsWith('/root')) {
        return name;
      }
      return findNodeModule(name);
    });
  });

  it('defaults to `jest-runner`', () => {
    const {options} = normalize({rootDir: '/root'}, {});

    expect(options.runner).toBe('jest-runner');
  });

  it('resolves to runners that do not have the prefix', () => {
    const {options} = normalize(
      {
        rootDir: '/root/',
        runner: 'my-runner-foo',
      },
      {},
    );

    expect(options.runner).toBe('node_modules/my-runner-foo');
  });

  it('resolves to runners and prefers jest-runner-`name`', () => {
    const {options} = normalize(
      {
        rootDir: '/root/',
        runner: 'eslint',
      },
      {},
    );

    expect(options.runner).toBe('node_modules/jest-runner-eslint');
  });

  it('throw error when a runner is not found', () => {
    expect(() =>
      normalize(
        {
          rootDir: '/root/',
          runner: 'missing-runner',
        },
        {},
      ),
    ).toThrowErrorMatchingSnapshot();
  });
});

describe('watchPlugins', () => {
  let Resolver;
  beforeEach(() => {
    Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name => {
      if (
        ['typeahead', 'jest-watch-typeahead', 'my-watch-plugin'].includes(name)
      ) {
        return `node_modules/${name}`;
      }

      if (name.startsWith('/root')) {
        return name;
      }
      return findNodeModule(name);
    });
  });

  it('defaults to undefined', () => {
    const {options} = normalize({rootDir: '/root'}, {});

    expect(options.watchPlugins).toEqual(undefined);
  });

  it('resolves to watch plugins and prefers jest-watch-`name`', () => {
    const {options} = normalize(
      {
        rootDir: '/root/',
        watchPlugins: ['typeahead'],
      },
      {},
    );

    expect(options.watchPlugins).toEqual([
      {config: {}, path: 'node_modules/jest-watch-typeahead'},
    ]);
  });

  it('resolves watch plugins that do not have the prefix', () => {
    const {options} = normalize(
      {
        rootDir: '/root/',
        watchPlugins: ['my-watch-plugin'],
      },
      {},
    );

    expect(options.watchPlugins).toEqual([
      {config: {}, path: 'node_modules/my-watch-plugin'},
    ]);
  });

  it('normalizes multiple watchPlugins', () => {
    const {options} = normalize(
      {
        rootDir: '/root/',
        watchPlugins: ['jest-watch-typeahead', '<rootDir>/path/to/plugin'],
      },
      {},
    );

    expect(options.watchPlugins).toEqual([
      {config: {}, path: 'node_modules/jest-watch-typeahead'},
      {config: {}, path: '/root/path/to/plugin'},
    ]);
  });

  it('throw error when a watch plugin is not found', () => {
    expect(() =>
      normalize(
        {
          rootDir: '/root/',
          watchPlugins: ['missing-plugin'],
        },
        {},
      ),
    ).toThrowErrorMatchingSnapshot();
  });
});

describe('testPathPattern', () => {
  const initialOptions = {rootDir: '/root'};
  const consoleLog = console.log;

  beforeEach(() => {
    console.log = jest.fn();
  });

  afterEach(() => {
    console.log = consoleLog;
  });

  it('defaults to empty', () => {
    const {options} = normalize(initialOptions, {});
    expect(options.testPathPattern).toBe('');
  });

  const cliOptions = [
    {name: '--testPathPattern', property: 'testPathPattern'},
    {name: '<regexForTestFiles>', property: '_'},
  ];
  for (const opt of cliOptions) {
    describe(opt.name, () => {
      it('uses ' + opt.name + ' if set', () => {
        const argv = {[opt.property]: ['a/b']};
        const {options} = normalize(initialOptions, argv);

        expect(options.testPathPattern).toBe('a/b');
      });

      it('ignores invalid regular expressions and logs a warning', () => {
        const argv = {[opt.property]: ['a(']};
        const {options} = normalize(initialOptions, argv);

        expect(options.testPathPattern).toBe('');
        expect(console.log.mock.calls[0][0]).toMatchSnapshot();
      });

      it('joins multiple ' + opt.name + ' if set', () => {
        const argv = {testPathPattern: ['a/b', 'c/d']};
        const {options} = normalize(initialOptions, argv);

        expect(options.testPathPattern).toBe('a/b|c/d');
      });

      describe('posix', () => {
        it('should not escape the pattern', () => {
          const argv = {[opt.property]: ['a\\/b', 'a/b', 'a\\b', 'a\\\\b']};
          const {options} = normalize(initialOptions, argv);

          expect(options.testPathPattern).toBe('a\\/b|a/b|a\\b|a\\\\b');
        });
      });

      describe('win32', () => {
        beforeEach(() => {
          jest.mock('path', () => jest.requireActual('path').win32);
          require('jest-resolve').findNodeModule = findNodeModule;
        });

        afterEach(() => {
          jest.resetModules();
        });

        it('preserves any use of "\\"', () => {
          const argv = {[opt.property]: ['a\\b', 'c\\\\d']};
          const {options} = require('../normalize').default(
            initialOptions,
            argv,
          );

          expect(options.testPathPattern).toBe('a\\b|c\\\\d');
        });

        it('replaces POSIX path separators', () => {
          const argv = {[opt.property]: ['a/b']};
          const {options} = require('../normalize').default(
            initialOptions,
            argv,
          );

          expect(options.testPathPattern).toBe('a\\\\b');
        });

        it('replaces POSIX paths in multiple args', () => {
          const argv = {[opt.property]: ['a/b', 'c/d']};
          const {options} = require('../normalize').default(
            initialOptions,
            argv,
          );

          expect(options.testPathPattern).toBe('a\\\\b|c\\\\d');
        });

        it('coerces all patterns to strings', () => {
          const argv = {[opt.property]: [1]};
          const {options} = normalize(initialOptions, argv);

          expect(options.testPathPattern).toBe('1');
        });
      });
    });
  }

  it('joins multiple --testPathPatterns and <regexForTestFiles>', () => {
    const {options} = normalize(initialOptions, {
      _: ['a', 'b'],
      testPathPattern: ['c', 'd'],
    });
    expect(options.testPathPattern).toBe('a|b|c|d');
  });

  it('gives precedence to --all', () => {
    const {options} = normalize(initialOptions, {
      all: true,
      onlyChanged: true,
    });

    expect(options.onlyChanged).toBe(false);
  });
});

describe('moduleFileExtensions', () => {
  it('defaults to something useful', () => {
    const {options} = normalize({rootDir: '/root'}, {});

    expect(options.moduleFileExtensions).toEqual([
      'js',
      'json',
      'jsx',
      'ts',
      'tsx',
      'node',
    ]);
  });

  it('throws if missing `js` but using jest-runner', () => {
    [undefined, 'jest-runner'].forEach(runner =>
      expect(() =>
        normalize(
          {
            moduleFileExtensions: ['json', 'jsx'],
            rootDir: '/root/',
            runner,
          },
          {},
        ),
      ).toThrowError("moduleFileExtensions must include 'js'"),
    );
  });

  it('does not throw if missing `js` with a custom runner', () => {
    expect(() =>
      normalize(
        {
          moduleFileExtensions: ['json', 'jsx'],
          rootDir: '/root/',
          runner: './', // does not need to be a valid runner for this validation
        },
        {},
      ),
    ).not.toThrow();
  });
});

describe('cwd', () => {
  it('is set to process.cwd', () => {
    const {options} = normalize({rootDir: '/root/'}, {});
    expect(options.cwd).toBe(process.cwd());
  });

  it('is not lost if the config has its own cwd property', () => {
    console.warn.mockImplementation(() => {});
    const {options} = normalize(
      {
        cwd: '/tmp/config-sets-cwd-itself',
        rootDir: '/root/',
      },
      {},
    );
    expect(options.cwd).toBe(process.cwd());
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('Defaults', () => {
  it('should be accepted by normalize', () => {
    normalize({...Defaults, rootDir: '/root'}, {});

    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe('displayName', () => {
  test.each`
    displayName             | description
    ${{}}                   | ${'is an empty object'}
    ${{name: 'hello'}}      | ${'missing color'}
    ${{color: 'green'}}     | ${'missing name'}
    ${{color: 2, name: []}} | ${'using invalid values'}
  `(
    'should throw an error when displayName is $description',
    ({displayName}) => {
      expect(() => {
        normalize(
          {
            displayName,
            rootDir: '/root/',
          },
          {},
        );
      }).toThrowErrorMatchingSnapshot();
    },
  );

  it.each([
    undefined,
    'jest-runner',
    'jest-runner-eslint',
    'jest-runner-tslint',
    'jest-runner-tsc',
  ])('generates a default color for the runner %s', runner => {
    virtualModuleRegexes.push(/jest-runner-.+/);
    const {
      options: {displayName},
    } = normalize(
      {
        displayName: 'project',
        rootDir: '/root/',
        runner,
      },
      {},
    );
    expect(displayName.name).toBe('project');
    expect(displayName.color).toMatchSnapshot();
  });
});

describe('testTimeout', () => {
  it('should return timeout value if defined', () => {
    console.warn.mockImplementation(() => {});
    const {options} = normalize({rootDir: '/root/', testTimeout: 1000}, {});

    expect(options.testTimeout).toBe(1000);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should throw an error if timeout is a negative number', () => {
    expect(() =>
      normalize({rootDir: '/root/', testTimeout: -1}, {}),
    ).toThrowErrorMatchingSnapshot();
  });
});
