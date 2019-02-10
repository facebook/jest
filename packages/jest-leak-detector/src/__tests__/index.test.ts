// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

'use strict';

import LeakDetector from '../index';

const gc = global.gc;

// Some tests override the "gc" value. Let's make sure we roll it back to its
// previous value after executing the test.
afterEach(() => {
  global.gc = gc;
});

it('complains if the value is a primitive', () => {
  expect(() => new LeakDetector(undefined)).toThrowErrorMatchingSnapshot();
  expect(() => new LeakDetector(null)).toThrowErrorMatchingSnapshot();
  expect(() => new LeakDetector(false)).toThrowErrorMatchingSnapshot();
  expect(() => new LeakDetector(42)).toThrowErrorMatchingSnapshot();
  expect(() => new LeakDetector('foo')).toThrowErrorMatchingSnapshot();
  expect(() => new LeakDetector(Symbol())).toThrowErrorMatchingSnapshot();
  expect(() => new LeakDetector(Symbol('foo'))).toThrowErrorMatchingSnapshot();
  expect(() => new LeakDetector(NaN)).toThrowErrorMatchingSnapshot();
});

it('does not show the GC if hidden', () => {
  const detector = new LeakDetector({});

  // @ts-ignore: purposefully removed
  global.gc = undefined;
  detector.isLeaking();
  expect(global.gc).not.toBeDefined();
});

it('does not hide the GC if visible', () => {
  const detector = new LeakDetector({});

  global.gc = () => {};
  detector.isLeaking();
  expect(global.gc).toBeDefined();
});

it('correctly checks simple leaks', () => {
  let reference: unknown = {};

  const detector = new LeakDetector(reference);

  // Reference is still held in memory.
  expect(detector.isLeaking()).toBe(true);

  // We destroy the only reference to the object we had.
  reference = null;

  // Reference should be gone.
  expect(detector.isLeaking()).toBe(false);
});

it('tests different objects', () => {
  const refs = [
    function() {},
    () => {},
    Object.create(null),
    [],
    /foo/g,
    new Date(1234),
    {},
  ];

  const detectors = refs.map(ref => new LeakDetector(ref));

  detectors.forEach(detector => expect(detector.isLeaking()).toBe(true));
  refs.forEach((_, i) => (refs[i] = null));
  detectors.forEach(detector => expect(detector.isLeaking()).toBe(false));
});

it('correctly checks more complex leaks', () => {
  let ref1: any = {};
  let ref2: any = {};

  // Create a circular dependency between ref1 and ref2.
  ref1.ref2 = ref2;
  ref2.ref1 = ref1;

  const detector1 = new LeakDetector(ref1);
  const detector2 = new LeakDetector(ref2);

  // References are still held in memory.
  expect(detector1.isLeaking()).toBe(true);
  expect(detector2.isLeaking()).toBe(true);

  // We destroy the reference to ref1.
  ref1 = null;

  // It will still be referenced by ref2, so both references are still leaking.
  expect(detector1.isLeaking()).toBe(true);
  expect(detector2.isLeaking()).toBe(true);

  // We destroy the reference to ref2.
  ref2 = null;

  // Now both references should be gone (yay mark & sweep!).
  expect(detector1.isLeaking()).toBe(false);
  expect(detector2.isLeaking()).toBe(false);
});
