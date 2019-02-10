// Copyright (c) 2014-present, Facebook, Inc. All rights reserved.

it('subtracts 5 - 1 to equal 4 in TypeScript', () => {
  const sub = require('../sub').default;
  expect(sub(5, 1)).toBe(4);
});
