/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const babelJest = require('../index');

//Mock data for all the tests
const sourceString = `
const sum = (a, b) => a+b;
const difference = (a, b) => a-b;

const customMultiply = (obj, mul) => {
    const {a, ...rest} = obj;
    return a * mul;
}

customMultiply({a: 32, dummy: "test"}, 2);
`;

const mockConfig = {
  moduleFileExtensions: [],
};

test(`Returns source string with inline maps when no transformOptions is passed`, () => {
  const result = babelJest.process(sourceString, 'dummy_path.js', mockConfig);
  expect(typeof result).toBe('object');
  expect(result.code).toBeDefined();
  expect(result.map).toBeDefined();
  expect(result.code).toMatch('//# sourceMappingURL');
  expect(result.code).toMatch('customMultiply');
  expect(result.map.sources).toEqual(['dummy_path.js']);
  expect(JSON.stringify(result.map.sourcesContent)).toMatch('customMultiply');
});
