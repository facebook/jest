/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ProjectConfig} from 'types/Config';
import type {Global} from 'types/Global';
import type {ModuleMocker} from 'types/Mock';

import {formatStackTrace} from 'jest-message-util';
import setGlobal from './set_global';
import FakePromises from './fake_promises';

/**
 * We don't know the type of arguments for a callback ahead of time which is why
 * we are disabling the flowtype/no-weak-types rule here.
 */

/* eslint-disable flowtype/no-weak-types */
type Callback = (...args: any) => void;
/* eslint-enable flowtype/no-weak-types */

type TimerID = string;

type Tick = {|
  uuid: string,
  callback: Callback,
|};

type Timer = {|
  type: string,
  callback: Callback,
  expiry: number,
  interval: ?number,
|};

type TimerAPI = {
  clearImmediate(timeoutId?: number): void,
  clearInterval(intervalId?: number): void,
  clearTimeout(timeoutId?: number): void,
  nextTick: (callback: Callback) => void,

  /**
   * The additional arguments in the following methods are passed to the
   * callback and thus we don't know their types ahead of time as they can be
   * anything, which  is why we are disabling the flowtype/no-weak-types rule
   * here.
   */

  /* eslint-disable flowtype/no-weak-types */
  setImmediate(callback: Callback, ms?: number, ...args: Array<any>): number,
  setInterval(callback: Callback, ms?: number, ...args: Array<any>): number,
  setTimeout(callback: Callback, ms?: number, ...args: Array<any>): number,
  /* eslint-enable flowtype/no-weak-types */
};

type TimerConfig<Ref> = {|
  idToRef: (id: number) => Ref,
  refToId: (ref: Ref) => ?number,
|};

const MS_IN_A_YEAR = 31536000000;

export default class FakeTimers<TimerRef> {
  _cancelledImmediates: {[key: TimerID]: boolean};
  _cancelledTicks: {[key: TimerID]: boolean};
  _config: ProjectConfig;
  _disposed: boolean;
  _fakePromises: FakePromises;
  _fakeTimerAPIs: TimerAPI;
  _global: Global;
  _immediates: Array<Tick>;
  _maxLoops: number;
  _moduleMocker: ModuleMocker;
  _now: number;
  _ticks: Array<Tick>;
  _timerAPIs: TimerAPI;
  _timers: {[key: TimerID]: Timer};
  _uuidCounter: number;
  _timerConfig: TimerConfig<TimerRef>;

  constructor({
    global,
    fakePromises,
    moduleMocker,
    timerConfig,
    config,
    maxLoops,
  }: {
    global: Global,
    fakePromises: FakePromises,
    moduleMocker: ModuleMocker,
    timerConfig: TimerConfig<TimerRef>,
    config: ProjectConfig,
    maxLoops?: number,
  }) {
    this._global = global;
    this._timerConfig = timerConfig;
    this._config = config;
    this._maxLoops = maxLoops || 100000;
    this._uuidCounter = 1;
    this._moduleMocker = moduleMocker;

    // Store original timer APIs for future reference
    this._timerAPIs = {
      clearImmediate: global.clearImmediate,
      clearInterval: global.clearInterval,
      clearTimeout: global.clearTimeout,
      nextTick: global.process && global.process.nextTick,
      setImmediate: global.setImmediate,
      setInterval: global.setInterval,
      setTimeout: global.setTimeout,
    };

    this._fakePromises = fakePromises;

    this.reset();
    this._createMocks();
  }

  clearAllTimers() {
    this._immediates.forEach(immediate =>
      this._fakeClearImmediate(immediate.uuid),
    );
    for (const uuid in this._timers) {
      delete this._timers[uuid];
    }
  }

  dispose() {
    this._disposed = true;
    this.clearAllTimers();
    delete this._fakePromises;
  }

  reset() {
    this._cancelledTicks = {};
    this._cancelledImmediates = {};
    this._now = 0;
    this._ticks = [];
    this._immediates = [];
    this._timers = {};
    this._fakePromises.reset();
  }

  runAllMicroTasks() {
    if (this._fakePromises.isUsingFakePromises()) {
      let i;
      for (i = 0; i < this._maxLoops; i++) {
        this.runAllTicks();

        if (this._fakePromises.hasQueuedPromises()) {
          this._fakePromises.runAllPromises();
        } else {
          break;
        }
      }

      this.runAllTicks();
    } else {
      this.runAllTicks();
    }
  }

  runAllTicks() {
    this._checkFakeTimers();
    // Only run a generous number of ticks and then bail.
    // This is just to help avoid recursive loops
    let i;
    for (i = 0; i < this._maxLoops; i++) {
      const tick = this._ticks.shift();

      if (tick === undefined) {
        break;
      }

      if (!this._cancelledTicks.hasOwnProperty(tick.uuid)) {
        // Callback may throw, so update the map prior calling.
        this._cancelledTicks[tick.uuid] = true;
        tick.callback();
      }
    }

    if (i === this._maxLoops) {
      throw new Error(
        'Ran ' +
          this._maxLoops +
          ' ticks, and there are still more! ' +
          "Assuming we've hit an infinite recursion and bailing out...",
      );
    }
  }

  runAllImmediates() {
    this._checkFakeTimers();
    this.runAllMicroTasks();

    // Only run a generous number of immediates and then bail.
    let i;
    for (i = 0; i < this._maxLoops; i++) {
      const immediate = this._immediates.shift();
      if (immediate === undefined) {
        break;
      }
      this._runImmediate(immediate);

      if (this._ticks.length || this._fakePromises.hasQueuedPromises()) {
        this.runAllMicroTasks();
      }
    }

    if (i === this._maxLoops) {
      throw new Error(
        'Ran ' +
          this._maxLoops +
          ' immediates, and there are still more! Assuming ' +
          "we've hit an infinite recursion and bailing out...",
      );
    }
  }

  _runImmediate(immediate: Tick) {
    if (!this._cancelledImmediates.hasOwnProperty(immediate.uuid)) {
      // Callback may throw, so update the map prior calling.
      this._cancelledImmediates[immediate.uuid] = true;
      immediate.callback();
    }
  }

  runAllTimers() {
    this._checkFakeTimers();
    this.runAllMicroTasks();
    this.runAllImmediates();

    // Only run a generous number of timers and then bail.
    // This is just to help avoid recursive loops
    let i;
    for (i = 0; i < this._maxLoops; i++) {
      const nextTimerHandle = this._getNextTimerHandle();

      // If there are no more timer handles, stop!
      if (nextTimerHandle === null) {
        break;
      }

      this._runTimerHandle(nextTimerHandle);

      // Some of the immediate calls could be enqueued
      // during the previous handling of the timers, we should
      // run them as well.
      if (this._immediates.length) {
        this.runAllImmediates();
      }

      if (this._ticks.length || this._fakePromises.hasQueuedPromises()) {
        this.runAllMicroTasks();
      }
    }

    if (i === this._maxLoops) {
      throw new Error(
        'Ran ' +
          this._maxLoops +
          ' timers, and there are still more! ' +
          "Assuming we've hit an infinite recursion and bailing out...",
      );
    }
  }

  runOnlyPendingTimers() {
    const timers = Object.assign({}, this._timers);
    this._checkFakeTimers();
    this._immediates.forEach(this._runImmediate, this);
    Object.keys(timers)
      .sort((left, right) => timers[left].expiry - timers[right].expiry)
      .forEach(this._runTimerHandle, this);
  }

  advanceTimersByTime(msToRun: number) {
    this._checkFakeTimers();
    // Only run a generous number of timers and then bail.
    // This is just to help avoid recursive loops
    let i;
    for (i = 0; i < this._maxLoops; i++) {
      const timerHandle = this._getNextTimerHandle();

      // If there are no more timer handles, stop!
      if (timerHandle === null) {
        break;
      }

      const nextTimerExpiry = this._timers[timerHandle].expiry;
      if (this._now + msToRun < nextTimerExpiry) {
        // There are no timers between now and the target we're running to, so
        // adjust our time cursor and quit
        this._now += msToRun;
        break;
      } else {
        msToRun -= nextTimerExpiry - this._now;
        this._now = nextTimerExpiry;
        this._runTimerHandle(timerHandle);
      }
    }

    if (i === this._maxLoops) {
      throw new Error(
        'Ran ' +
          this._maxLoops +
          ' timers, and there are still more! ' +
          "Assuming we've hit an infinite recursion and bailing out...",
      );
    }
  }

  runWithRealTimers(cb: Callback) {
    const prevClearImmediate = this._global.clearImmediate;
    const prevClearInterval = this._global.clearInterval;
    const prevClearTimeout = this._global.clearTimeout;
    const prevNextTick = this._global.process.nextTick;
    const prevSetImmediate = this._global.setImmediate;
    const prevSetInterval = this._global.setInterval;
    const prevSetTimeout = this._global.setTimeout;

    this.useRealTimers();

    let cbErr = null;
    let errThrown = false;
    try {
      cb();
    } catch (e) {
      errThrown = true;
      cbErr = e;
    }

    this._global.clearImmediate = prevClearImmediate;
    this._global.clearInterval = prevClearInterval;
    this._global.clearTimeout = prevClearTimeout;
    this._global.process.nextTick = prevNextTick;
    this._global.setImmediate = prevSetImmediate;
    this._global.setInterval = prevSetInterval;
    this._global.setTimeout = prevSetTimeout;

    if (errThrown) {
      throw cbErr;
    }
  }

  useRealTimers() {
    const global = this._global;
    setGlobal(global, 'clearImmediate', this._timerAPIs.clearImmediate);
    setGlobal(global, 'clearInterval', this._timerAPIs.clearInterval);
    setGlobal(global, 'clearTimeout', this._timerAPIs.clearTimeout);
    setGlobal(global, 'setImmediate', this._timerAPIs.setImmediate);
    setGlobal(global, 'setInterval', this._timerAPIs.setInterval);
    setGlobal(global, 'setTimeout', this._timerAPIs.setTimeout);

    global.process.nextTick = this._timerAPIs.nextTick;
  }

  useFakeTimers() {
    this._createMocks();

    const global = this._global;
    setGlobal(global, 'clearImmediate', this._fakeTimerAPIs.clearImmediate);
    setGlobal(global, 'clearInterval', this._fakeTimerAPIs.clearInterval);
    setGlobal(global, 'clearTimeout', this._fakeTimerAPIs.clearTimeout);
    setGlobal(global, 'setImmediate', this._fakeTimerAPIs.setImmediate);
    setGlobal(global, 'setInterval', this._fakeTimerAPIs.setInterval);
    setGlobal(global, 'setTimeout', this._fakeTimerAPIs.setTimeout);

    global.process.nextTick = this._fakeTimerAPIs.nextTick;
  }

  getTimerCount() {
    this._checkFakeTimers();

    return Object.keys(this._timers).length;
  }

  _checkFakeTimers() {
    if (this._global.setTimeout !== this._fakeTimerAPIs.setTimeout) {
      this._global.console.warn(
        `A function to advance timers was called but the timers API is not ` +
          `mocked with fake timers. Call \`jest.useFakeTimers()\` in this ` +
          `test or enable fake timers globally by setting ` +
          `\`"timers": "fake"\` in ` +
          `the configuration file. This warning is likely a result of a ` +
          `default configuration change in Jest 15.\n\n` +
          `Release Blog Post: https://jestjs.io/blog/2016/09/01/jest-15.html\n` +
          `Stack Trace:\n` +
          formatStackTrace(new Error().stack, this._config, {
            noStackTrace: false,
          }),
      );
    }
  }

  _createMocks() {
    const fn = impl => this._moduleMocker.fn().mockImplementation(impl);

    this._fakeTimerAPIs = {
      clearImmediate: fn(this._fakeClearImmediate.bind(this)),
      clearInterval: fn(this._fakeClearTimer.bind(this)),
      clearTimeout: fn(this._fakeClearTimer.bind(this)),
      nextTick: fn(this._fakeNextTick.bind(this)),
      setImmediate: fn(this._fakeSetImmediate.bind(this)),
      setInterval: fn(this._fakeSetInterval.bind(this)),
      setTimeout: fn(this._fakeSetTimeout.bind(this)),
    };
  }

  _fakeClearTimer(timerRef: TimerRef) {
    const uuid = this._timerConfig.refToId(timerRef);

    if (uuid && this._timers.hasOwnProperty(uuid)) {
      delete this._timers[String(uuid)];
    }
  }

  _fakeClearImmediate(uuid: TimerID) {
    this._cancelledImmediates[uuid] = true;
  }

  _fakeNextTick(callback: Callback) {
    if (this._disposed) {
      return;
    }

    const args = [];
    for (let ii = 1, ll = arguments.length; ii < ll; ii++) {
      args.push(arguments[ii]);
    }

    const uuid = String(this._uuidCounter++);

    this._ticks.push({
      callback: () => callback.apply(null, args),
      uuid,
    });

    const cancelledTicks = this._cancelledTicks;
    this._timerAPIs.nextTick(() => {
      if (!cancelledTicks.hasOwnProperty(uuid)) {
        // Callback may throw, so update the map prior calling.
        cancelledTicks[uuid] = true;
        callback.apply(null, args);
      }
    });
  }

  _fakeSetImmediate(callback: Callback) {
    if (this._disposed) {
      return null;
    }

    const args = [];
    for (let ii = 1, ll = arguments.length; ii < ll; ii++) {
      args.push(arguments[ii]);
    }

    const uuid = this._uuidCounter++;

    this._immediates.push({
      callback: () => callback.apply(null, args),
      uuid: String(uuid),
    });

    const cancelledImmediates = this._cancelledImmediates;
    this._timerAPIs.setImmediate(() => {
      if (!cancelledImmediates.hasOwnProperty(uuid)) {
        // Callback may throw, so update the map prior calling.
        cancelledImmediates[String(uuid)] = true;
        callback.apply(null, args);
      }
    });

    return uuid;
  }

  _fakeSetInterval(callback: Callback, intervalDelay?: number) {
    if (this._disposed) {
      return null;
    }

    if (intervalDelay == null) {
      intervalDelay = 0;
    }

    const args = [];
    for (let ii = 2, ll = arguments.length; ii < ll; ii++) {
      args.push(arguments[ii]);
    }

    const uuid = this._uuidCounter++;

    this._timers[String(uuid)] = {
      callback: () => callback.apply(null, args),
      expiry: this._now + intervalDelay,
      interval: intervalDelay,
      type: 'interval',
    };

    return this._timerConfig.idToRef(uuid);
  }

  _fakeSetTimeout(callback: Callback, delay?: number) {
    if (this._disposed) {
      return null;
    }

    // eslint-disable-next-line no-bitwise
    delay = Number(delay) | 0;

    const args = [];
    for (let ii = 2, ll = arguments.length; ii < ll; ii++) {
      args.push(arguments[ii]);
    }

    const uuid = this._uuidCounter++;

    this._timers[String(uuid)] = {
      callback: () => callback.apply(null, args),
      expiry: this._now + delay,
      interval: null,
      type: 'timeout',
    };

    return this._timerConfig.idToRef(uuid);
  }

  _getNextTimerHandle() {
    let nextTimerHandle = null;
    let uuid;
    let soonestTime = MS_IN_A_YEAR;
    let timer;
    for (uuid in this._timers) {
      timer = this._timers[uuid];
      if (timer.expiry < soonestTime) {
        soonestTime = timer.expiry;
        nextTimerHandle = uuid;
      }
    }

    return nextTimerHandle;
  }

  _runTimerHandle(timerHandle: TimerID) {
    const timer = this._timers[timerHandle];

    if (!timer) {
      return;
    }

    switch (timer.type) {
      case 'timeout':
        const callback = timer.callback;
        delete this._timers[timerHandle];
        callback();
        break;

      case 'interval':
        timer.expiry = this._now + timer.interval;
        timer.callback();
        break;

      default:
        throw new Error('Unexpected timer type: ' + timer.type);
    }
  }
}
