/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
'use strict';

const fs = require('fs');

const http = require('http');

test('fs Error', () => {
  expect.hasAssertions();

  try {
    fs.readFileSync('does not exist');
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }
});

test('http error', () =>
  new Promise((resolve, reject) => {
    const request = http.request('http://does-not-exist/blah', res => {
      console.log(`STATUS: ${res.statusCode}`);
      res.on('end', () => {
        reject(new Error('Ended before failure'));
      });
    });

    request.once('error', err => {
      try {
        expect(err).toBeInstanceOf(Error);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }));

test('Array', () => {
  expect([]).toBeInstanceOf(Array);
});
