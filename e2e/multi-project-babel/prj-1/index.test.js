// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
const f = require('./');

it('Transpiles', () => {
  expect(f('test')).toBe('test');
});
