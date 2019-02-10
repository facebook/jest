/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';

beforeEach(() => jest.resetModules());

const testPath = names => {
  const {addSerializer, getSerializers} = require('../plugins');
  const prev = getSerializers();
  const added = names.map(name =>
    require(require.resolve(`./plugins/${name}`)),
  );

  // Jest tests snapshotSerializers in order preceding built-in serializers.
  // Therefore, add in reverse because the last added is the first tested.
  added
    .concat()
    .reverse()
    .forEach(serializer => addSerializer(serializer));

  const next = getSerializers();
  expect(next.length).toBe(added.length + prev.length);
  expect(next).toEqual(added.concat(prev));
};

it('gets plugins', () => {
  const {getSerializers} = require('../plugins');
  const plugins = getSerializers();
  expect(plugins).toHaveLength(5);
});

it('adds plugins from an empty array', () => testPath([]));
it('adds a single plugin path', () => testPath(['foo']));
it('adds multiple plugin paths', () => testPath(['foo', 'bar']));
