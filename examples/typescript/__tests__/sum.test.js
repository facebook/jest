// Copyright 2004-present Facebook. All Rights Reserved.

it('adds 1 + 2 to equal 3 in Typescript', () => {
  const sum = require('../sum.ts').default;
  expect(sum(1, 2)).toBe(3);
});

it('adds 1 + 2 to equal 3 in JavaScript', () => {
  const sum = require('../sum.js');
  expect(sum(1, 2)).toBe(3);
});
