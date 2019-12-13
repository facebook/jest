// Copyright (c) 2014-present, Facebook, Inc. All rights reserved.

import sum from './sum';

const sub = (a: number, b: number): number => {
  return sum(a, -b);
};

export default sub;
