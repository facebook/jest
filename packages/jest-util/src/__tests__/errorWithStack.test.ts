/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import ErrorWithStack from '../ErrorWithStack';

describe('ErrorWithStack', () => {
  const message = '💩 something went wrong';
  const callsite = () => {};

  it('calls Error.captureStackTrace with given callsite when capture exists', () => {
    jest.spyOn(Error, 'captureStackTrace');

    const actual = new ErrorWithStack(message, callsite);

    expect(actual).toBeInstanceOf(Error);
    expect(actual.message).toBe(message);
    expect(Error.captureStackTrace).toHaveBeenCalledWith(actual, callsite);
  });
});
