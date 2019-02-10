// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

'use strict';

function awaitable() {
  return Promise.resolve();
}

module.exports.syncMethod = () => 42;

module.exports.asyncMethod = async () => {
  await awaitable();
  return 42;
};
