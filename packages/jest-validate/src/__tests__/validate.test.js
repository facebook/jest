/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import validate from '../validate';
import {multipleValidOptions} from '../condition';
import jestValidateExampleConfig from '../exampleConfig';
import jestValidateDefaultConfig from '../defaultConfig';

const {
  defaultConfig,
  validConfig,
  deprecatedConfig,
} = require('./fixtures/jestConfig');

test('recursively validates default Jest config', () => {
  expect(
    validate(defaultConfig, {
      exampleConfig: validConfig,
    }),
  ).toEqual({
    hasDeprecationWarnings: false,
    isValid: true,
  });
});

test('recursively validates default jest-validate config', () => {
  expect(
    validate(jestValidateDefaultConfig, {
      exampleConfig: jestValidateExampleConfig,
    }),
  ).toEqual({
    hasDeprecationWarnings: false,
    isValid: true,
  });
});

test.each([
  ['Boolean', {automock: []}],
  ['Array', {coverageReporters: {}}],
  ['String', {preset: 1337}],
  ['Object', {haste: 42}],
])('pretty prints valid config for %s', (type, config) => {
  expect(() =>
    validate(config, {
      exampleConfig: validConfig,
    }),
  ).toThrowErrorMatchingSnapshot();
});

test(`pretty prints valid config for Function`, () => {
  const config = {fn: 'test'};
  const validConfig = {fn: (config, option, deprecatedOptions) => true};
  expect(() =>
    validate(config, {
      exampleConfig: validConfig,
    }),
  ).toThrowErrorMatchingSnapshot();
});

test('omits null and undefined config values', () => {
  const config = {
    haste: undefined,
    preset: null,
  };
  expect(validate(config, {exampleConfig: validConfig})).toEqual({
    hasDeprecationWarnings: false,
    isValid: true,
  });
});

test('recursively omits null and undefined config values', () => {
  const config = {
    haste: {
      providesModuleNodeModules: null,
    },
  };
  expect(
    validate(config, {exampleConfig: validConfig, recursive: true}),
  ).toEqual({
    hasDeprecationWarnings: false,
    isValid: true,
  });
});

test('respects blacklist', () => {
  const warn = console.warn;
  console.warn = jest.fn();
  const config = {
    something: {
      nested: {
        some_random_key: 'value',
        some_random_key2: 'value2',
      },
    },
  };
  const exampleConfig = {
    something: {
      nested: {
        test: true,
      },
    },
  };

  validate(config, {exampleConfig});

  expect(console.warn).toBeCalled();

  console.warn.mockReset();

  validate(config, {
    exampleConfig,
    recursiveBlacklist: ['something.nested'],
  });

  expect(console.warn).not.toBeCalled();
  console.warn = warn;
});

test('displays warning for unknown config options', () => {
  const config = {unkwon: {}};
  const validConfig = {unknown: 'string'};
  const warn = console.warn;
  console.warn = jest.fn();

  validate(config, {exampleConfig: validConfig});

  expect(console.warn.mock.calls[0][0]).toMatchSnapshot();
  console.warn = warn;
});

test('displays warning for deprecated config options', () => {
  const config = {scriptPreprocessor: 'test'};
  const warn = console.warn;
  console.warn = jest.fn();

  expect(
    validate(config, {
      deprecatedConfig,
      exampleConfig: validConfig,
    }),
  ).toEqual({
    hasDeprecationWarnings: true,
    isValid: true,
  });

  expect(console.warn.mock.calls[0][0]).toMatchSnapshot();
  console.warn = warn;
});

test('works with custom warnings', () => {
  const config = {unknown: 'string'};
  const validConfig = {test: [1, 2]};
  const warn = console.warn;
  const options = {
    comment: 'My custom comment',
    deprecatedConfig,
    exampleConfig: validConfig,
    title: {
      warning: 'My Custom Warning',
    },
  };
  console.warn = jest.fn();

  validate(config, options);

  expect(console.warn.mock.calls[0][0]).toMatchSnapshot();
  console.warn = warn;
});

test('works with custom errors', () => {
  const config = {test: 'string'};
  const validConfig = {test: [1, 2]};
  const options = {
    comment: 'My custom comment',
    deprecatedConfig,
    exampleConfig: validConfig,
    title: {
      error: 'My Custom Error',
    },
  };

  expect(() => validate(config, options)).toThrowErrorMatchingSnapshot();
});

test('works with custom deprecations', () => {
  const config = {scriptPreprocessor: 'test'};
  const warn = console.warn;
  const options = {
    comment: 'My custom comment',
    deprecatedConfig,
    exampleConfig: validConfig,
    title: {
      deprecation: 'My Custom Deprecation Warning',
    },
  };
  console.warn = jest.fn();

  validate(config, options);

  expect(console.warn.mock.calls[0][0]).toMatchSnapshot();
  console.warn = warn;
});

test('works with multiple valid types', () => {
  const exampleConfig = {
    foo: multipleValidOptions('text', ['text']),
  };

  expect(
    validate(
      {foo: 'foo'},
      {
        exampleConfig,
      },
    ),
  ).toEqual({
    hasDeprecationWarnings: false,
    isValid: true,
  });
  expect(
    validate(
      {foo: ['foo']},
      {
        exampleConfig,
      },
    ),
  ).toEqual({
    hasDeprecationWarnings: false,
    isValid: true,
  });
});

test('reports errors nicely when failing with multiple valid options', () => {
  const exampleConfig = {
    foo: multipleValidOptions('text', ['text']),
  };

  expect(() =>
    validate(
      {foo: 2},
      {
        exampleConfig,
      },
    ),
  ).toThrowErrorMatchingSnapshot();
});

test('Repeated types within multiple valid examples are coalesced in error report', () => {
  const exampleConfig = {
    foo: multipleValidOptions('foo', 'bar', 2),
  };

  expect(() =>
    validate(
      {foo: false},
      {
        exampleConfig,
      },
    ),
  ).toThrowErrorMatchingSnapshot();
});

test('Comments in config JSON using "//" key are not warned', () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const config = {'//': 'a comment'};

  validate(config, {
    exampleConfig: validConfig,
  });
  expect(console.warn).not.toBeCalled();

  console.warn.mockReset();

  validate(config, {
    exampleConfig: validConfig,
    recursiveBlacklist: [('myCustomKey': "don't validate this")],
  });
  expect(console.warn).not.toBeCalled();

  console.warn.mockRestore();
});
