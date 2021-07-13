/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';

describe('snapshot serializer', () => {
  it('does not show prototypes for object and array inline', () => {
    const object = {
      array: [{hello: 'Danger'}],
    };
    expect(object).toMatchInlineSnapshot(`
{
  "array": [
    {
      "hello": "Danger",
    },
  ],
}
`);
  });

  it('uses 8 chars for indent, and shows no prototypes for object and array in a snapshot', () => {
    const object = {
      array: [{hello: 'Danger'}],
    };
    expect(object).toMatchSnapshot('no prototypes');
  });
});
