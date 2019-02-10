// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

'use strict';

it('skips a test inside a promise', () =>
  new Promise(() => {
    pending('skipped a test inside a promise');
  }));
