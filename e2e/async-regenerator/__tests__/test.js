// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

test('dummy test', async () => {
  const value = await Promise.resolve(1);
  expect(value).toBe(1);
});
