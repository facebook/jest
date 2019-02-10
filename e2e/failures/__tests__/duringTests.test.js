// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

'use strict';

const deepObject = {
  notAnError: [{hello: true, tooDeep: {notVisible: true}}],
};

test('Promise thrown during test', () => {
  throw Promise.resolve(5);
});

test('Boolean thrown during test', () => {
  // eslint-disable-next-line no-throw-literal
  throw false;
});

test('undefined thrown during test', () => {
  // eslint-disable-next-line no-throw-literal
  throw undefined;
});

test('Object thrown during test', () => {
  throw deepObject;
});

test('Error during test', () => {
  // eslint-disable-next-line no-undef
  doesNotExist.alsoThisNot;
});

test('done(Error)', done => {
  done(new Error('this is an error'));
});

test('done(non-error)', done => {
  done(deepObject);
});

test('returned promise rejection', () => Promise.reject(deepObject));
