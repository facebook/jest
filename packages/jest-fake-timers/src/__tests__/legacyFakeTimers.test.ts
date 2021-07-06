/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as util from 'util';
import {runInNewContext} from 'vm';
import wrap from 'jest-snapshot-serializer-raw';
import {ModuleMocker} from 'jest-mock';
import FakeTimers from '../legacyFakeTimers';

const timerConfig = {
  idToRef: (id: number) => id,
  refToId: (ref: number) => ref,
};

const config = {
  rootDir: '/',
  testMatch: [],
};

describe('FakeTimers', () => {
  let moduleMocker: ModuleMocker;

  beforeEach(() => {
    const global = runInNewContext('this');
    moduleMocker = new ModuleMocker(global);
  });

  describe('construction', () => {
    it('installs setTimeout mock', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();
      expect(global.setTimeout).not.toBe(undefined);
    });

    it('accepts to promisify setTimeout mock', async () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();
      const timeoutPromise = util.promisify(global.setTimeout)(0, 'resolved');
      timers.runAllTimers();
      await expect(timeoutPromise).resolves.toBe('resolved');
    });

    it('installs clearTimeout mock', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();
      expect(global.clearTimeout).not.toBe(undefined);
    });

    it('installs setInterval mock', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();
      expect(global.setInterval).not.toBe(undefined);
    });

    it('installs clearInterval mock', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();
      expect(global.clearInterval).not.toBe(undefined);
    });

    it('mocks process.nextTick if it exists on global', () => {
      const origNextTick = () => {};
      const global = {
        process: {
          nextTick: origNextTick,
        },
      } as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();
      expect(global.process.nextTick).not.toBe(origNextTick);
    });

    it('mocks setImmediate if it exists on global', () => {
      const origSetImmediate = () => {};
      const global = {
        process,
        setImmediate: origSetImmediate,
      } as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();
      expect(global.setImmediate).not.toBe(origSetImmediate);
    });

    it('mocks clearImmediate if setImmediate is on global', () => {
      const origSetImmediate = () => {};
      const origClearImmediate = () => {};
      const global = {
        clearImmediate: origClearImmediate,
        process,
        setImmediate: origSetImmediate,
      } as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();
      expect(global.clearImmediate).not.toBe(origClearImmediate);
    });

    it('does not mock requestAnimationFrame if not available', () => {
      const global = {
        process,
      } as unknown as typeof globalThis & Window;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();
      expect(global.requestAnimationFrame).toBe(undefined);
    });

    it('mocks requestAnimationFrame if available on global', () => {
      const origRequestAnimationFrame = () => {};
      const global = {
        process,
        requestAnimationFrame: origRequestAnimationFrame,
      } as unknown as typeof globalThis & Window;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();
      expect(global.requestAnimationFrame).not.toBe(undefined);
      expect(global.requestAnimationFrame).not.toBe(origRequestAnimationFrame);
    });

    it('does not mock cancelAnimationFrame if not available on global', () => {
      const global = {
        process,
      } as unknown as typeof globalThis & Window;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();
      expect(global.cancelAnimationFrame).toBe(undefined);
    });

    it('mocks cancelAnimationFrame if available on global', () => {
      const origCancelAnimationFrame = () => {};
      const global = {
        cancelAnimationFrame: origCancelAnimationFrame,
        process,
      } as unknown as typeof globalThis & Window;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();
      expect(global.cancelAnimationFrame).not.toBe(undefined);
      expect(global.cancelAnimationFrame).not.toBe(origCancelAnimationFrame);
    });
  });

  describe('runAllTicks', () => {
    it('runs all ticks, in order', () => {
      const global = {
        process: {
          nextTick: () => {},
        },
      } as unknown as typeof globalThis;

      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const runOrder: Array<string> = [];
      const mock1 = jest.fn(() => runOrder.push('mock1'));
      const mock2 = jest.fn(() => runOrder.push('mock2'));

      global.process.nextTick(mock1);
      global.process.nextTick(mock2);

      expect(mock1).toHaveBeenCalledTimes(0);
      expect(mock2).toHaveBeenCalledTimes(0);

      timers.runAllTicks();

      expect(mock1).toHaveBeenCalledTimes(1);
      expect(mock2).toHaveBeenCalledTimes(1);
      expect(runOrder).toEqual(['mock1', 'mock2']);
    });

    it('does nothing when no ticks have been scheduled', () => {
      const nextTick = jest.fn();
      const global = {
        process: {
          nextTick,
        },
      } as unknown as typeof globalThis;

      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();
      timers.runAllTicks();

      expect(nextTick).toHaveBeenCalledTimes(0);
    });

    it('only runs a scheduled callback once', () => {
      const global = {
        process: {
          nextTick: () => {},
        },
      } as unknown as typeof globalThis;

      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const mock1 = jest.fn();
      global.process.nextTick(mock1);
      expect(mock1).toHaveBeenCalledTimes(0);

      timers.runAllTicks();
      expect(mock1).toHaveBeenCalledTimes(1);

      timers.runAllTicks();
      expect(mock1).toHaveBeenCalledTimes(1);
    });

    it('cancels a callback even from native nextTick', () => {
      const nativeNextTick = jest.fn();

      const global = {
        process: {
          nextTick: nativeNextTick,
        },
      } as unknown as typeof globalThis;

      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const mock1 = jest.fn();
      global.process.nextTick(mock1);
      timers.runAllTicks();
      expect(mock1).toHaveBeenCalledTimes(1);
      expect(nativeNextTick).toHaveBeenCalledTimes(1);

      // Now imagine we fast forward to the next real tick. We need to be sure
      // that native nextTick doesn't try to run the callback again
      nativeNextTick.mock.calls[0][0]();
      expect(mock1).toHaveBeenCalledTimes(1);
    });

    it('cancels a callback even from native setImmediate', () => {
      const nativeSetImmediate = jest.fn();

      const global = {
        process,
        setImmediate: nativeSetImmediate,
      } as unknown as typeof globalThis;

      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const mock1 = jest.fn();
      global.setImmediate(mock1);
      timers.runAllImmediates();
      expect(mock1).toHaveBeenCalledTimes(1);
      expect(nativeSetImmediate).toHaveBeenCalledTimes(1);

      // ensure that native setImmediate doesn't try to run the callback again
      nativeSetImmediate.mock.calls[0][0]();
      expect(mock1).toHaveBeenCalledTimes(1);
    });

    it('doesnt run a tick callback if native nextTick already did', () => {
      const nativeNextTick = jest.fn();

      const global = {
        process: {
          nextTick: nativeNextTick,
        },
      } as unknown as typeof globalThis;

      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const mock1 = jest.fn();
      global.process.nextTick(mock1);

      // Emulate native nextTick running...
      nativeNextTick.mock.calls[0][0]();
      expect(mock1).toHaveBeenCalledTimes(1);

      // Ensure runAllTicks() doesn't run the callback again
      timers.runAllTicks();
      expect(mock1).toHaveBeenCalledTimes(1);
    });

    it('doesnt run immediate if native setImmediate already did', () => {
      const nativeSetImmediate = jest.fn();

      const global = {
        process,
        setImmediate: nativeSetImmediate,
      } as unknown as typeof globalThis;

      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const mock1 = jest.fn();
      global.setImmediate(mock1);

      // Emulate native setImmediate running...
      nativeSetImmediate.mock.calls[0][0]();
      expect(mock1).toHaveBeenCalledTimes(1);

      // Ensure runAllTicks() doesn't run the callback again
      timers.runAllImmediates();
      expect(mock1).toHaveBeenCalledTimes(1);
    });

    it('native doesnt run immediate if fake already did', () => {
      const nativeSetImmediate = jest.fn();

      const global = {
        process,
        setImmediate: nativeSetImmediate,
      } as unknown as typeof globalThis;

      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const mock1 = jest.fn();
      global.setImmediate(mock1);

      //run all immediates now
      timers.runAllImmediates();
      expect(mock1).toHaveBeenCalledTimes(1);

      // Emulate native setImmediate running ensuring it doesn't re-run
      nativeSetImmediate.mock.calls[0][0]();

      expect(mock1).toHaveBeenCalledTimes(1);
    });

    it('throws before allowing infinite recursion', () => {
      const global = {
        process: {
          nextTick: () => {},
        },
      } as unknown as typeof globalThis;

      const timers = new FakeTimers({
        config,
        global,
        maxLoops: 100,
        moduleMocker,
        timerConfig,
      });

      timers.useFakeTimers();

      global.process.nextTick(function infinitelyRecursingCallback() {
        global.process.nextTick(infinitelyRecursingCallback);
      });

      expect(() => {
        timers.runAllTicks();
      }).toThrow(
        new Error(
          "Ran 100 ticks, and there are still more! Assuming we've hit an " +
            'infinite recursion and bailing out...',
        ),
      );
    });
  });

  describe('runAllTimers', () => {
    it('runs all timers in order', () => {
      const global = {
        cancelAnimationFrame: () => {},
        process,
        requestAnimationFrame: () => {},
      } as unknown as typeof globalThis & Window;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const runOrder: Array<string> = [];
      const mock1 = jest.fn(() => runOrder.push('mock1'));
      const mock2 = jest.fn(() => runOrder.push('mock2'));
      const mock3 = jest.fn(() => runOrder.push('mock3'));
      const mock4 = jest.fn(() => runOrder.push('mock4'));
      const mock5 = jest.fn(() => runOrder.push('mock5'));
      const mock6 = jest.fn(() => runOrder.push('mock6'));
      const mockAnimatioNFrame = jest.fn(() => runOrder.push('animationFrame'));

      global.setTimeout(mock1, 100);
      global.setTimeout(mock2, NaN);
      global.setTimeout(mock3, 0);
      const intervalHandler = global.setInterval(() => {
        mock4();
        global.clearInterval(intervalHandler);
      }, 200);
      global.setTimeout(mock5, Infinity);
      global.setTimeout(mock6, -Infinity);
      global.requestAnimationFrame(mockAnimatioNFrame);

      timers.runAllTimers();
      expect(runOrder).toEqual([
        'mock2',
        'mock3',
        'mock5',
        'mock6',
        'animationFrame',
        'mock1',
        'mock4',
      ]);
    });

    it('warns when trying to advance timers while real timers are used', () => {
      const consoleWarn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      const timers = new FakeTimers({
        config: {
          rootDir: __dirname,
          testMatch: [],
        },
        global,
        moduleMocker,
        timerConfig,
      });
      timers.runAllTimers();
      expect(
        wrap(consoleWarn.mock.calls[0][0].split('\nStack Trace')[0]),
      ).toMatchSnapshot();
      consoleWarn.mockRestore();
    });

    it('does nothing when no timers have been scheduled', () => {
      const nativeSetTimeout = jest.fn();
      const global = {
        process,
        setTimeout: nativeSetTimeout,
      } as unknown as typeof globalThis;

      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();
      timers.runAllTimers();
    });

    it('only runs a setTimeout callback once (ever)', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const fn = jest.fn();
      global.setTimeout(fn, 0);
      expect(fn).toHaveBeenCalledTimes(0);

      timers.runAllTimers();
      expect(fn).toHaveBeenCalledTimes(1);

      timers.runAllTimers();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('runs callbacks with arguments after the interval', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const fn = jest.fn();
      global.setTimeout(fn, 0, 'mockArg1', 'mockArg2');

      timers.runAllTimers();
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('mockArg1', 'mockArg2');
    });

    it('doesnt pass the callback to native setTimeout', () => {
      const nativeSetTimeout = jest.fn();

      const global = {
        process,
        setTimeout: nativeSetTimeout,
      } as unknown as typeof globalThis;

      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const mock1 = jest.fn();
      global.setTimeout(mock1, 0);

      timers.runAllTimers();
      expect(mock1).toHaveBeenCalledTimes(1);
      expect(nativeSetTimeout).toHaveBeenCalledTimes(0);
    });

    it('throws before allowing infinite recursion', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        maxLoops: 100,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      global.setTimeout(function infinitelyRecursingCallback() {
        global.setTimeout(infinitelyRecursingCallback, 0);
      }, 0);

      expect(() => {
        timers.runAllTimers();
      }).toThrow(
        new Error(
          "Ran 100 timers, and there are still more! Assuming we've hit an " +
            'infinite recursion and bailing out...',
        ),
      );
    });

    it('also clears ticks', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const fn = jest.fn();
      global.setTimeout(() => {
        process.nextTick(fn);
      }, 0);
      expect(fn).toHaveBeenCalledTimes(0);

      timers.runAllTimers();
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('advanceTimersByTime', () => {
    it('runs timers in order', () => {
      const global = {
        cancelAnimationFrame: () => {},
        process,
        requestAnimationFrame: () => {},
      } as unknown as typeof globalThis & Window;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const runOrder: Array<string | ['animationFrame', number]> = [];
      const mock1 = jest.fn(() => runOrder.push('mock1'));
      const mock2 = jest.fn(() => runOrder.push('mock2'));
      const mock3 = jest.fn(() => runOrder.push('mock3'));
      const mock4 = jest.fn(() => runOrder.push('mock4'));
      const mockAnimationFrame = jest.fn(timestamp =>
        runOrder.push(['animationFrame', timestamp]),
      );

      global.setTimeout(mock1, 100);
      global.setTimeout(mock2, 0);
      global.setTimeout(mock3, 0);
      global.setInterval(() => {
        mock4();
      }, 200);
      global.requestAnimationFrame(mockAnimationFrame);

      // Move forward to t=15
      timers.advanceTimersByTime(15);
      expect(runOrder).toEqual(['mock2', 'mock3']);

      // Move forward to t=16
      timers.advanceTimersByTime(1);
      expect(runOrder).toEqual(['mock2', 'mock3', ['animationFrame', 16]]);

      // Move forward to t=60
      timers.advanceTimersByTime(44);
      expect(runOrder).toEqual(['mock2', 'mock3', ['animationFrame', 16]]);

      // Move forward to t=100
      timers.advanceTimersByTime(40);
      expect(runOrder).toEqual([
        'mock2',
        'mock3',
        ['animationFrame', 16],
        'mock1',
      ]);

      // Move forward to t=200
      timers.advanceTimersByTime(100);
      expect(runOrder).toEqual([
        'mock2',
        'mock3',
        ['animationFrame', 16],
        'mock1',
        'mock4',
      ]);

      // Move forward to t=400
      timers.advanceTimersByTime(200);
      expect(runOrder).toEqual([
        'mock2',
        'mock3',
        ['animationFrame', 16],
        'mock1',
        'mock4',
        'mock4',
      ]);
    });

    it('does nothing when no timers have been scheduled', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      timers.advanceTimersByTime(100);
    });
    it('throws before allowing infinite recursion', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        maxLoops: 100,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      global.setTimeout(function infinitelyRecursingCallback() {
        global.setTimeout(infinitelyRecursingCallback, 0);
      }, 0);

      expect(() => {
        timers.advanceTimersByTime(50);
      }).toThrow(
        new Error(
          "Ran 100 timers, and there are still more! Assuming we've hit an " +
            'infinite recursion and bailing out...',
        ),
      );
    });
  });

  describe('advanceTimersToNextTimer', () => {
    it('runs timers in order', () => {
      const global = {
        cancelAnimationFrame: () => {},
        process,
        requestAnimationFrame: () => {},
      } as unknown as typeof globalThis & Window;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const runOrder: Array<string> = [];
      const mock1 = jest.fn(() => runOrder.push('mock1'));
      const mock2 = jest.fn(() => runOrder.push('mock2'));
      const mock3 = jest.fn(() => runOrder.push('mock3'));
      const mock4 = jest.fn(() => runOrder.push('mock4'));
      const mockAnimationFrame = jest.fn(() => runOrder.push('animationFrame'));

      global.setTimeout(mock1, 100);
      global.setTimeout(mock2, 0);
      global.setTimeout(mock3, 0);
      global.setInterval(() => {
        mock4();
      }, 200);
      global.requestAnimationFrame(mockAnimationFrame);

      timers.advanceTimersToNextTimer();
      // Move forward to t=0
      expect(runOrder).toEqual(['mock2', 'mock3']);

      timers.advanceTimersToNextTimer();
      // Move forward to t=17
      expect(runOrder).toEqual(['mock2', 'mock3', 'animationFrame']);

      timers.advanceTimersToNextTimer();
      // Move forward to t=100
      expect(runOrder).toEqual(['mock2', 'mock3', 'animationFrame', 'mock1']);

      timers.advanceTimersToNextTimer();
      // Move forward to t=200
      expect(runOrder).toEqual([
        'mock2',
        'mock3',
        'animationFrame',
        'mock1',
        'mock4',
      ]);

      timers.advanceTimersToNextTimer();
      // Move forward to t=400
      expect(runOrder).toEqual([
        'mock2',
        'mock3',
        'animationFrame',
        'mock1',
        'mock4',
        'mock4',
      ]);
    });

    it('run correct amount of steps', () => {
      const global = {
        cancelAnimationFrame: () => {},
        process,
        requestAnimationFrame: () => {},
      } as unknown as typeof globalThis & Window;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const runOrder: Array<string> = [];
      const mock1 = jest.fn(() => runOrder.push('mock1'));
      const mock2 = jest.fn(() => runOrder.push('mock2'));
      const mock3 = jest.fn(() => runOrder.push('mock3'));
      const mock4 = jest.fn(() => runOrder.push('mock4'));
      const mockAnimationFrame = jest.fn(() => runOrder.push('animationFrame'));

      global.setTimeout(mock1, 100);
      global.setTimeout(mock2, 0);
      global.setTimeout(mock3, 0);
      global.setInterval(() => {
        mock4();
      }, 200);
      global.requestAnimationFrame(mockAnimationFrame);

      // Move forward to t=17
      timers.advanceTimersToNextTimer(2);
      expect(runOrder).toEqual(['mock2', 'mock3', 'animationFrame']);

      // Move forward to t=100
      timers.advanceTimersToNextTimer(1);
      expect(runOrder).toEqual(['mock2', 'mock3', 'animationFrame', 'mock1']);

      // Move forward to t=600
      timers.advanceTimersToNextTimer(3);
      expect(runOrder).toEqual([
        'mock2',
        'mock3',
        'animationFrame',
        'mock1',
        'mock4',
        'mock4',
        'mock4',
      ]);
    });

    it('setTimeout inside setTimeout', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const runOrder: Array<string> = [];
      const mock1 = jest.fn(() => runOrder.push('mock1'));
      const mock2 = jest.fn(() => runOrder.push('mock2'));
      const mock3 = jest.fn(() => runOrder.push('mock3'));
      const mock4 = jest.fn(() => runOrder.push('mock4'));

      global.setTimeout(mock1, 0);
      global.setTimeout(() => {
        mock2();
        global.setTimeout(mock3, 50);
      }, 25);
      global.setTimeout(mock4, 100);

      // Move forward to t=75
      timers.advanceTimersToNextTimer(3);
      expect(runOrder).toEqual(['mock1', 'mock2', 'mock3']);
    });

    it('does nothing when no timers have been scheduled', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      timers.advanceTimersToNextTimer();
    });
  });

  describe('reset', () => {
    it('resets all pending setTimeouts', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const mock1 = jest.fn();
      global.setTimeout(mock1, 100);

      timers.reset();
      timers.runAllTimers();
      expect(mock1).toHaveBeenCalledTimes(0);
    });

    it('resets all pending setIntervals', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const mock1 = jest.fn();
      global.setInterval(mock1, 200);

      timers.reset();
      timers.runAllTimers();
      expect(mock1).toHaveBeenCalledTimes(0);
    });

    it('resets all pending animation frames', () => {
      const global = {
        cancelAnimationFrame: () => {},
        process,
        requestAnimationFrame: () => {},
      } as unknown as typeof globalThis & Window;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const mock1 = jest.fn();
      global.requestAnimationFrame(mock1);

      timers.reset();
      timers.runAllTimers();
      expect(mock1).toHaveBeenCalledTimes(0);
    });

    it('resets all pending ticks callbacks & immediates', () => {
      const global = {
        process: {
          nextTick: () => {},
        },
        setImmediate: () => {},
      } as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const mock1 = jest.fn();
      global.process.nextTick(mock1);
      global.setImmediate(mock1);

      timers.reset();
      timers.runAllTicks();
      timers.runAllImmediates();
      expect(mock1).toHaveBeenCalledTimes(0);
    });

    it('resets current advanceTimersByTime time cursor', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const mock1 = jest.fn();
      global.setTimeout(mock1, 100);
      timers.advanceTimersByTime(50);

      timers.reset();
      global.setTimeout(mock1, 100);

      timers.advanceTimersByTime(50);
      expect(mock1).toHaveBeenCalledTimes(0);
    });
  });

  describe('runOnlyPendingTimers', () => {
    it('runs all timers in order', () => {
      const nativeSetImmediate = jest.fn();

      const global = {
        cancelAnimationFrame: () => {},
        process,
        requestAnimationFrame: () => {},
        setImmediate: nativeSetImmediate,
      } as unknown as typeof globalThis & Window;

      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const runOrder: Array<string> = [];

      global.setTimeout(function cb() {
        runOrder.push('mock1');
        global.setTimeout(cb, 100);
      }, 100);

      global.setTimeout(function cb() {
        runOrder.push('mock2');
        global.setTimeout(cb, 0);
      }, 0);

      global.setInterval(() => {
        runOrder.push('mock3');
      }, 200);

      global.setImmediate(() => {
        runOrder.push('mock4');
      });

      global.setImmediate(function cb() {
        runOrder.push('mock5');
        global.setTimeout(cb, 400);
      });

      global.requestAnimationFrame(function cb() {
        runOrder.push('animationFrame');
        global.requestAnimationFrame(cb);
      });

      timers.runOnlyPendingTimers();
      expect(runOrder).toEqual([
        'mock4',
        'mock5',
        'mock2',
        'animationFrame',
        'mock1',
        'mock3',
      ]);

      timers.runOnlyPendingTimers();
      expect(runOrder).toEqual([
        'mock4',
        'mock5',
        'mock2',
        'animationFrame',
        'mock1',
        'mock3',

        'mock2',
        'animationFrame',
        'mock1',
        'mock3',
        'mock5',
      ]);
    });

    it('does not run timers that were cleared in another timer', () => {
      const global = {process} as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      const fn = jest.fn();
      const timer = global.setTimeout(fn, 10);
      global.setTimeout(() => {
        global.clearTimeout(timer);
      }, 0);

      timers.runOnlyPendingTimers();
      expect(fn).not.toBeCalled();
    });
  });

  describe('runWithRealTimers', () => {
    it('executes callback with native timers', () => {
      const nativeClearInterval = jest.fn();
      const nativeClearTimeout = jest.fn();
      const nativeSetInterval = jest.fn();
      const nativeSetTimeout = jest.fn();

      const global = {
        clearInterval: nativeClearInterval,
        clearTimeout: nativeClearTimeout,
        process,
        setInterval: nativeSetInterval,
        setTimeout: nativeSetTimeout,
      } as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      // clearInterval()
      timers.runWithRealTimers(() => {
        (global as any).clearInterval();
      });
      expect(nativeClearInterval).toHaveBeenCalledTimes(1);
      expect(global.clearInterval).toHaveBeenCalledTimes(0);

      // clearTimeout()
      timers.runWithRealTimers(() => {
        (global as any).clearTimeout();
      });
      expect(nativeClearTimeout).toHaveBeenCalledTimes(1);
      expect(global.clearTimeout).toHaveBeenCalledTimes(0);

      // setInterval()
      timers.runWithRealTimers(() => {
        (global as any).setInterval();
      });
      expect(nativeSetInterval).toHaveBeenCalledTimes(1);
      expect(global.setInterval).toHaveBeenCalledTimes(0);

      // setTimeout()
      timers.runWithRealTimers(() => {
        (global as any).setTimeout();
      });
      expect(nativeSetTimeout).toHaveBeenCalledTimes(1);
      expect(global.setTimeout).toHaveBeenCalledTimes(0);
    });

    it('resets mock timers after executing callback', () => {
      const nativeClearInterval = jest.fn();
      const nativeClearTimeout = jest.fn();
      const nativeSetInterval = jest.fn();
      const nativeSetTimeout = jest.fn();

      const global = {
        clearInterval: nativeClearInterval,
        clearTimeout: nativeClearTimeout,
        process,
        setInterval: nativeSetInterval,
        setTimeout: nativeSetTimeout,
      } as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      // clearInterval()
      timers.runWithRealTimers(() => {
        (global as any).clearInterval();
      });
      expect(nativeClearInterval).toHaveBeenCalledTimes(1);
      expect(global.clearInterval).toHaveBeenCalledTimes(0);

      (global as any).clearInterval();
      expect(nativeClearInterval).toHaveBeenCalledTimes(1);
      expect(global.clearInterval).toHaveBeenCalledTimes(1);

      // clearTimeout()
      timers.runWithRealTimers(() => {
        (global as any).clearTimeout();
      });
      expect(nativeClearTimeout).toHaveBeenCalledTimes(1);
      expect(global.clearTimeout).toHaveBeenCalledTimes(0);

      (global as any).clearTimeout();
      expect(nativeClearTimeout).toHaveBeenCalledTimes(1);
      expect(global.clearTimeout).toHaveBeenCalledTimes(1);

      // setInterval()
      timers.runWithRealTimers(() => {
        (global as any).setInterval();
      });
      expect(nativeSetInterval).toHaveBeenCalledTimes(1);
      expect(global.setInterval).toHaveBeenCalledTimes(0);

      (global as any).setInterval();
      expect(nativeSetInterval).toHaveBeenCalledTimes(1);
      expect(global.setInterval).toHaveBeenCalledTimes(1);

      // setTimeout()
      timers.runWithRealTimers(() => {
        (global as any).setTimeout();
      });
      expect(nativeSetTimeout).toHaveBeenCalledTimes(1);
      expect(global.setTimeout).toHaveBeenCalledTimes(0);

      (global as any).setTimeout();
      expect(nativeSetTimeout).toHaveBeenCalledTimes(1);
      expect(global.setTimeout).toHaveBeenCalledTimes(1);
    });

    it('resets mock timer functions even if callback throws', () => {
      const nativeSetTimeout = jest.fn();
      const global = {
        process,
        setTimeout: nativeSetTimeout,
      } as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      expect(() => {
        timers.runWithRealTimers(() => {
          (global as any).setTimeout();
          throw new Error('test');
        });
      }).toThrow(new Error('test'));
      expect(nativeSetTimeout).toHaveBeenCalledTimes(1);
      expect(global.setTimeout).toHaveBeenCalledTimes(0);

      (global as any).setTimeout();
      expect(nativeSetTimeout).toHaveBeenCalledTimes(1);
      expect(global.setTimeout).toHaveBeenCalledTimes(1);
    });
  });

  describe('useRealTimers', () => {
    it('resets native timer APIs', () => {
      const nativeSetTimeout = jest.fn();
      const nativeSetInterval = jest.fn();
      const nativeClearTimeout = jest.fn();
      const nativeClearInterval = jest.fn();

      const global = {
        clearInterval: nativeClearInterval,
        clearTimeout: nativeClearTimeout,
        process,
        setInterval: nativeSetInterval,
        setTimeout: nativeSetTimeout,
      } as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      // Ensure that timers has overridden the native timer APIs
      // (because if it didn't, this test might pass when it shouldn't)
      expect(global.setTimeout).not.toBe(nativeSetTimeout);
      expect(global.setInterval).not.toBe(nativeSetInterval);
      expect(global.clearTimeout).not.toBe(nativeClearTimeout);
      expect(global.clearInterval).not.toBe(nativeClearInterval);

      timers.useRealTimers();

      expect(global.setTimeout).toBe(nativeSetTimeout);
      expect(global.setInterval).toBe(nativeSetInterval);
      expect(global.clearTimeout).toBe(nativeClearTimeout);
      expect(global.clearInterval).toBe(nativeClearInterval);
    });

    it('resets native process.nextTick when present', () => {
      const nativeProcessNextTick = jest.fn();

      const global = {
        process: {nextTick: nativeProcessNextTick},
      } as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      // Ensure that timers has overridden the native timer APIs
      // (because if it didn't, this test might pass when it shouldn't)
      expect(global.process.nextTick).not.toBe(nativeProcessNextTick);

      timers.useRealTimers();

      expect(global.process.nextTick).toBe(nativeProcessNextTick);
    });

    it('resets native setImmediate when present', () => {
      const nativeSetImmediate = jest.fn();
      const nativeClearImmediate = jest.fn();

      const global = {
        clearImmediate: nativeClearImmediate,
        process,
        setImmediate: nativeSetImmediate,
      } as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      // Ensure that timers has overridden the native timer APIs
      // (because if it didn't, this test might pass when it shouldn't)
      expect(global.setImmediate).not.toBe(nativeSetImmediate);
      expect(global.clearImmediate).not.toBe(nativeClearImmediate);

      timers.useRealTimers();

      expect(global.setImmediate).toBe(nativeSetImmediate);
      expect(global.clearImmediate).toBe(nativeClearImmediate);
    });

    it('resets native requestAnimationFrame when present', () => {
      const nativeCancelAnimationFrame = jest.fn();
      const nativeRequestAnimationFrame = jest.fn();

      const global = {
        cancelAnimationFrame: nativeCancelAnimationFrame,
        process,
        requestAnimationFrame: nativeRequestAnimationFrame,
      } as unknown as typeof globalThis & Window;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useFakeTimers();

      // Ensure that timers has overridden the native timer APIs
      // (because if it didn't, this test might pass when it shouldn't)
      expect(global.cancelAnimationFrame).not.toBe(nativeCancelAnimationFrame);
      expect(global.requestAnimationFrame).not.toBe(
        nativeRequestAnimationFrame,
      );

      timers.useRealTimers();

      expect(global.cancelAnimationFrame).toBe(nativeCancelAnimationFrame);
      expect(global.requestAnimationFrame).toBe(nativeRequestAnimationFrame);
    });
  });

  describe('useFakeTimers', () => {
    it('resets mock timer APIs', () => {
      const nativeSetTimeout = jest.fn();
      const nativeSetInterval = jest.fn();
      const nativeClearTimeout = jest.fn();
      const nativeClearInterval = jest.fn();

      const global = {
        clearInterval: nativeClearInterval,
        clearTimeout: nativeClearTimeout,
        process,
        setInterval: nativeSetInterval,
        setTimeout: nativeSetTimeout,
      } as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useRealTimers();

      // Ensure that the real timers are installed at this point
      // (because if they aren't, this test might pass when it shouldn't)
      expect(global.setTimeout).toBe(nativeSetTimeout);
      expect(global.setInterval).toBe(nativeSetInterval);
      expect(global.clearTimeout).toBe(nativeClearTimeout);
      expect(global.clearInterval).toBe(nativeClearInterval);

      timers.useFakeTimers();

      expect(global.setTimeout).not.toBe(nativeSetTimeout);
      expect(global.setInterval).not.toBe(nativeSetInterval);
      expect(global.clearTimeout).not.toBe(nativeClearTimeout);
      expect(global.clearInterval).not.toBe(nativeClearInterval);
    });

    it('resets mock process.nextTick when present', () => {
      const nativeProcessNextTick = jest.fn();

      const global = {
        process: {nextTick: nativeProcessNextTick},
      } as unknown as typeof globalThis;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      timers.useRealTimers();

      // Ensure that the real timers are installed at this point
      // (because if they aren't, this test might pass when it shouldn't)
      expect(global.process.nextTick).toBe(nativeProcessNextTick);

      timers.useFakeTimers();

      expect(global.process.nextTick).not.toBe(nativeProcessNextTick);
    });

    it('resets mock setImmediate when present', () => {
      const nativeSetImmediate = jest.fn();
      const nativeClearImmediate = jest.fn();

      const global = {
        clearImmediate: nativeClearImmediate,
        process,
        setImmediate: nativeSetImmediate,
      } as unknown as typeof globalThis;
      const fakeTimers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      fakeTimers.useRealTimers();

      // Ensure that the real timers are installed at this point
      // (because if they aren't, this test might pass when it shouldn't)
      expect(global.setImmediate).toBe(nativeSetImmediate);
      expect(global.clearImmediate).toBe(nativeClearImmediate);

      fakeTimers.useFakeTimers();

      expect(global.setImmediate).not.toBe(nativeSetImmediate);
      expect(global.clearImmediate).not.toBe(nativeClearImmediate);
    });

    it('resets mock requestAnimationFrame when present', () => {
      const nativeCancelAnimationFrame = jest.fn();
      const nativeRequestAnimationFrame = jest.fn();

      const global = {
        cancelAnimationFrame: nativeCancelAnimationFrame,
        process,
        requestAnimationFrame: nativeRequestAnimationFrame,
      } as unknown as typeof globalThis & Window;
      const fakeTimers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });
      fakeTimers.useRealTimers();

      // Ensure that the real timers are installed at this point
      // (because if they aren't, this test might pass when it shouldn't)
      expect(global.cancelAnimationFrame).toBe(nativeCancelAnimationFrame);
      expect(global.requestAnimationFrame).toBe(nativeRequestAnimationFrame);

      fakeTimers.useFakeTimers();

      expect(global.cancelAnimationFrame).not.toBe(nativeCancelAnimationFrame);
      expect(global.requestAnimationFrame).not.toBe(
        nativeRequestAnimationFrame,
      );
    });
  });

  describe('getTimerCount', () => {
    it('returns the correct count', () => {
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });

      timers.useFakeTimers();

      global.setTimeout(() => {}, 0);
      global.setTimeout(() => {}, 0);
      global.setTimeout(() => {}, 10);

      expect(timers.getTimerCount()).toEqual(3);

      timers.advanceTimersByTime(5);

      expect(timers.getTimerCount()).toEqual(1);

      timers.advanceTimersByTime(5);

      expect(timers.getTimerCount()).toEqual(0);
    });

    it('includes immediates and ticks', () => {
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });

      timers.useFakeTimers();

      global.setTimeout(() => {}, 0);
      global.setImmediate(() => {});
      process.nextTick(() => {});

      expect(timers.getTimerCount()).toEqual(3);
    });

    it('not includes cancelled immediates', () => {
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });

      timers.useFakeTimers();

      global.setImmediate(() => {});
      expect(timers.getTimerCount()).toEqual(1);
      timers.clearAllTimers();

      expect(timers.getTimerCount()).toEqual(0);
    });

    it('includes animation frames', () => {
      const global = {
        cancelAnimationFrame: () => {},
        process,
        requestAnimationFrame: () => {},
      } as unknown as typeof globalThis & Window;
      const timers = new FakeTimers({
        config,
        global,
        moduleMocker,
        timerConfig,
      });

      timers.useFakeTimers();

      global.requestAnimationFrame(() => {});
      expect(timers.getTimerCount()).toEqual(1);
      timers.clearAllTimers();

      expect(timers.getTimerCount()).toEqual(0);
    });
  });
});
