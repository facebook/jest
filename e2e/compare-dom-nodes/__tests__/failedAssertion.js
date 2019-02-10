// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

/* global document */

test('a failed assertion comparing a DOM node does not crash Jest', () => {
  expect(document.body).toBe(null);
});
