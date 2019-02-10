// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

jest.useRealTimers();

test('bar', () => {
  jest.runAllTimers();
});
