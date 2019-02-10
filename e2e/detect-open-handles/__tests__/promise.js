// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

test('something', () => {
  // eslint-disable-next-line no-new
  new Promise(() => {});
  expect(true).toBe(true);
});
