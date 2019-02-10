// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

test('snapshots are written to custom location', () => {
  expect('foobar').toMatchSnapshot();
});
