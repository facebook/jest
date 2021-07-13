/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// addEventHandler and removeEventHandler are provided in the ./index
import {addEventHandler, removeEventHandler} from '../index';
// dispatch comes from the ./state
import {dispatch} from '../state';

test('addEventHandler and removeEventHandler control handlers', async () => {
  const spy = jest.fn();

  addEventHandler(spy);
  expect(spy).not.toHaveBeenCalledWith({name: 'unknown1'}, expect.anything());
  await dispatch({name: 'unknown1' as any});
  expect(spy).toHaveBeenCalledWith({name: 'unknown1'}, expect.anything());

  removeEventHandler(spy);
  expect(spy).not.toHaveBeenCalledWith({name: 'unknown2'}, expect.anything());
  await dispatch({name: 'unknown2' as any});
  expect(spy).not.toHaveBeenCalledWith({name: 'unknown2'}, expect.anything());
});
