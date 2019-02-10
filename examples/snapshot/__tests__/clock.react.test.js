// Copyright 2004-present Facebook. All Rights Reserved.

'use strict';

import React from 'react';
import Clock from '../Clock.react';
import renderer from 'react-test-renderer';

jest.useFakeTimers();
Date.now = jest.fn(() => 1482363367071);

it('renders correctly', () => {
  const tree = renderer.create(<Clock />).toJSON();
  expect(tree).toMatchSnapshot();
});
