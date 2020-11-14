// Copyright (c) 2014-present, Facebook, Inc. All rights reserved.

it('adds 1 + 2 to equal 3 in TScript', () => {
  // Generally, `import` should be used for TypeScript
  // as using `require` will not return any type information.
  const sum = require('../sum.ts').default;
  expect(sum(1, 2)).toBe(3);
});

it('adds 1 + 2 to equal 3 in JavaScript', () => {
  const sum = require('../sum.js');
  expect(sum(1, 2)).toBe(3);
});
