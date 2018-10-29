/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

describe('FakePromises', () => {
  let FakePromises, config;

  beforeEach(() => {
    FakePromises = require('../fake_promises').default;
    config = {
      compileAsyncToGenerator: true,
    };
  });

  describe('construction', () => {
    it('installs global.Promise mock', () => {
      const global = {};
      const promises = new FakePromises({config, global});
      promises.useFakePromises();
      expect(global.Promise).not.toBe(undefined);
    });
  });

  describe('runAllPromises', () => {
    it('runs all promises', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const p1 = global.Promise.resolve(0);
      const p2 = global.Promise.resolve(0);

      promises.runAllPromises();

      expect(p1.dangerouslyGetNode().state).toBe('fulfilled');
      expect(p2.dangerouslyGetNode().state).toBe('fulfilled');
    });

    it("traverses all promises with identical parent in order in which they're scheduled", () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const runOrder = [];
      const mock1 = jest.fn(() => runOrder.push('mock1'));
      const mock2 = jest.fn(() => runOrder.push('mock2'));
      global.Promise.resolve(0).then(mock1);
      global.Promise.resolve(0).then(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(1);
      expect(runOrder).toEqual(['mock1', 'mock2']);
    });

    it('traverses promise trees in-order', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const runOrder = [];
      const mock1 = jest.fn(() => runOrder.push('mock1'));
      const mock2 = jest.fn(() => runOrder.push('mock2'));
      const mock3 = jest.fn(() => runOrder.push('mock3'));
      const mock4 = jest.fn(() => runOrder.push('mock4'));
      global.Promise.resolve(0)
        .then(mock1)
        .then(mock3);
      global.Promise.resolve(0)
        .then(mock2)
        .then(mock4);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);
      expect(mock3.mock.calls.length).toBe(0);
      expect(mock4.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(1);
      expect(mock3.mock.calls.length).toBe(1);
      expect(mock4.mock.calls.length).toBe(1);

      expect(runOrder).toEqual(['mock1', 'mock2', 'mock3', 'mock4']);
    });

    it('schedules promises with completed parents immediately', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const promise = global.Promise.resolve(0)
        .then(() => 1)
        .then(() => 2);

      promises.runAllPromises();

      const runOrder = [];
      const mock1 = jest.fn(() => runOrder.push('mock1'));
      const mock2 = jest.fn(() => runOrder.push('mock2'));
      promise.then(mock1);
      global.Promise.resolve(0).then(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(1);
      expect(runOrder).toEqual(['mock1', 'mock2']);
    });

    it('warns if promise rejection is not handled', () => {
      const consoleWarn = console.warn;
      console.warn = jest.fn();
      config.rootDir = __dirname;
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();
      global.Promise.reject(0);
      promises.runAllPromises();

      expect(
        console.warn.mock.calls[0][0].split('\nStack Trace')[0],
      ).toMatchSnapshot();
      console.warn = consoleWarn;
    });

    it('propagates errors to the first onRejected callback', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});
      const mock2 = jest.fn(() => {});

      global.Promise.reject(0)
        .catch(mock1)
        .catch(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(0);
    });

    it('synchronizes implicit promises created with async-await syntax', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      async function test() {
        return await 5;
      }

      const mock1 = jest.fn(() => {});
      test().then(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toBe(5);
    });
  });

  describe('useFakePromises', () => {
    it('warns if compileAsyncToGenerator config option is set to false', () => {
      const consoleWarn = console.warn;
      console.warn = jest.fn();
      config.rootDir = __dirname;
      config.compileAsyncToGenerator = false;
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      expect(
        console.warn.mock.calls[0][0].split('\nStack Trace')[0],
      ).toMatchSnapshot();
      console.warn = consoleWarn;
    });
  });

  describe('useRealPromises', () => {
    it('resets native timer APIs', () => {
      const nativePromise = jest.fn();
      global.Promise = nativePromise;

      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      expect(global.Promise).not.toBe(nativePromise);

      promises.useRealPromises();

      expect(global.Promise).toBe(nativePromise);
    });
  });

  describe('_Promise.constructor()', () => {
    it('passes resolved value as input to child onResolve callbacks', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => 'mock1');

      new global.Promise(resolve => resolve('x')).then(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toBe('x');
    });

    it('passes rejected reason as input to child onRejected callbacks', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => 'mock1');

      new global.Promise((resolve, reject) => reject('x')).catch(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toBe('x');
    });

    it('returns a forever pending promise if callback neither rejects nor resolves', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => 'mock1');
      const mock2 = jest.fn(() => 'mock2');

      const promise = new global.Promise(() => {});
      promise.then(mock1).catch(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);
      expect(promise.dangerouslyGetNode().state).toBe('pending');
    });
  });

  describe('_Promise.resolve()', () => {
    it('passes resolved value as input to child onResolve callbacks', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => 'mock1');
      const mock2 = jest.fn(() => 'mock2');

      const promise = global.Promise.resolve('x');
      promise.then(mock1);
      promise.then(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toBe('x');
      expect(mock2.mock.calls[0][0]).toBe('x');
    });

    it('returns the resolved promise instead of creating a new promise if resolved value is a promise', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});
      const p1 = global.Promise.resolve('x');
      const p2 = global.Promise.resolve(p1);
      p2.then(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toBe('x');
      expect(p2).toBe(p1);
    });

    it("reschedules the callback to the end of the promise's children queue if resolved value is a promise", () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const runOrder = [];
      const mock1 = jest.fn(() => runOrder.push('mock1'));
      const mock2 = jest.fn(() => runOrder.push('mock2'));

      const promise = global.Promise.resolve(0);
      promise.then(mock1);
      global.Promise.resolve(promise).then(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(1);
      expect(runOrder).toEqual(['mock1', 'mock2']);
    });

    describe('if resolved value is a thenable', () => {
      it('calls the thenable callback asynchronously', () => {
        const runOrder = [];
        const mock1 = jest.fn(() => runOrder.push('mock1'));
        const mock2 = jest.fn(() => runOrder.push('mock2'));

        const global = {};
        const promises = new FakePromises({
          config,
          global,
        });
        promises.useFakePromises();

        const thenable = {
          then: mock1,
        };

        global.Promise.resolve(thenable);
        mock2();

        expect(mock1.mock.calls.length).toBe(0);
        expect(mock2.mock.calls.length).toBe(1);

        promises.runAllPromises();

        expect(mock1.mock.calls.length).toBe(1);
        expect(mock2.mock.calls.length).toBe(1);
        expect(runOrder).toEqual(['mock2', 'mock1']);
      });

      it('returns a resolved promise if thenable callback resolves', () => {
        const global = {};
        const promises = new FakePromises({
          config,
          global,
        });
        promises.useFakePromises();

        const thenable = {
          then: (onFulFilled, onRejected) => {
            onFulFilled('resolved value');
          },
        };
        const mock1 = jest.fn(() => {});

        global.Promise.resolve(thenable).then(mock1);

        expect(mock1.mock.calls.length).toBe(0);

        promises.runAllPromises();

        expect(mock1.mock.calls.length).toBe(1);
        expect(mock1.mock.calls[0][0]).toBe('resolved value');
      });

      it('returns a rejected promise if thenable callback rejects', () => {
        const global = {};
        const promises = new FakePromises({
          config,
          global,
        });
        promises.useFakePromises();

        const thenable = {
          then: (onFulFilled, onRejected) => {
            onRejected('rejected value');
          },
        };
        const mock1 = jest.fn(() => {});

        global.Promise.resolve(thenable).catch(mock1);

        expect(mock1.mock.calls.length).toBe(0);

        promises.runAllPromises();

        expect(mock1.mock.calls.length).toBe(1);
        expect(mock1.mock.calls[0][0]).toBe('rejected value');
      });

      it('returns a pending promise if thenable callback neither resolves nor rejects', () => {
        const global = {};
        const promises = new FakePromises({
          config,
          global,
        });
        promises.useFakePromises();

        const thenable = {then: () => {}};
        const mock1 = jest.fn(() => {});

        const promise = global.Promise.resolve(thenable).then(mock1);

        expect(mock1.mock.calls.length).toBe(0);

        promises.runAllPromises();

        expect(mock1.mock.calls.length).toBe(0);
        expect(promise.dangerouslyGetNode().state).toBe('pending');
      });

      it('calls thenable callback once, even if parallel child promises are scheduled', () => {
        const global = {};
        const promises = new FakePromises({
          config,
          global,
        });
        promises.useFakePromises();

        const mock1 = jest.fn(() => {});
        const thenable = {
          then: (onFulFilled, onRejected) => {
            mock1();
            onFulFilled('resolved value');
          },
        };
        const mock2 = jest.fn(() => {});
        const mock3 = jest.fn(() => {});

        const promise = global.Promise.resolve(thenable);
        promise.then(mock2);
        promise.then(mock3);

        expect(mock1.mock.calls.length).toBe(0);
        expect(mock2.mock.calls.length).toBe(0);
        expect(mock3.mock.calls.length).toBe(0);

        promises.runAllPromises();

        expect(mock1.mock.calls.length).toBe(1);
        expect(mock2.mock.calls.length).toBe(1);
        expect(mock3.mock.calls.length).toBe(1);
      });

      it('adds one more promise to the promise chain than a normal resolved value', () => {
        const global = {};
        const promises = new FakePromises({
          config,
          global,
        });
        promises.useFakePromises();

        const runOrder = [];
        const mock1 = jest.fn(() => runOrder.push('mock1'));
        const mock2 = jest.fn(() => runOrder.push('mock2'));
        const thenable = {
          then: onFulfilled => onFulfilled('x'),
        };

        global.Promise.resolve(thenable).then(mock1);
        global.Promise.resolve(0).then(mock2);

        expect(mock1.mock.calls.length).toBe(0);
        expect(mock2.mock.calls.length).toBe(0);

        promises.runAllPromises();

        expect(mock1.mock.calls.length).toBe(1);
        expect(mock2.mock.calls.length).toBe(1);
        expect(runOrder).toEqual(['mock2', 'mock1']);
      });
    });
  });

  describe('_Promise.reject()', () => {
    it('passes rejected reason as input to child onRejected callbacks', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => 'mock1');

      global.Promise.reject('x').catch(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toBe('x');
    });

    it("doesn't convert a thenables to promises", () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => 'mock1');
      const mock2 = jest.fn(() => 'mock2');

      const thenable = {
        then: onResolved => {
          mock1();
          onResolved('resolved value');
        },
      };

      global.Promise.reject(thenable).catch(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(1);
      expect(mock2.mock.calls[0][0]).toEqual(thenable);
    });
  });

  describe('_Promise.then()', () => {
    it("passes the onResolved callback's return value as an input to the next onResolved callback", () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => 'mock1');
      const mock2 = jest.fn(() => 'mock2');

      global.Promise.resolve(0)
        .then(mock1)
        .then(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(1);
      expect(mock2.mock.calls[0][0]).toBe('mock1');
    });

    it('passes errors thrown in the onResolved callback as a reason to the next onRejected callback', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => global.Promise.reject('mock1'));
      const mock2 = jest.fn(() => 'mock2');
      const mock3 = jest.fn(() => 'mock3');

      global.Promise.resolve(0)
        .then(mock1)
        .then(mock2, mock3);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);
      expect(mock3.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(0);
      expect(mock3.mock.calls.length).toBe(1);
      expect(mock3.mock.calls[0][0]).toBe('mock1');
    });

    it('schedules promises even if the parent is a completed promise', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const promise = global.Promise.resolve(0);

      promises.runAllPromises();

      const runOrder = [];
      const mock1 = jest.fn(() => runOrder.push('mock1'));
      const mock2 = jest.fn(() => runOrder.push('mock2'));

      promise.then(mock1);
      global.Promise.resolve(0).then(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(1);
      expect(runOrder).toEqual(['mock1', 'mock2']);
    });

    it("if output is promise then children are appended to the end of output promise's tree", () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const runOrder = [];
      const mock1 = jest.fn(() => runOrder.push('mock1'));
      const mock2 = jest.fn(() => runOrder.push('mock2'));
      const mock3 = jest.fn(() => runOrder.push('mock3'));
      const mock4 = jest.fn(() => runOrder.push('mock4'));
      global.Promise.resolve(0)
        .then(() => {
          mock1();
          return global.Promise.resolve(0).then(mock2);
        })
        .then(mock3)
        .then(mock4);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);
      expect(mock3.mock.calls.length).toBe(0);
      expect(mock4.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(1);
      expect(mock3.mock.calls.length).toBe(1);
      expect(mock4.mock.calls.length).toBe(1);

      expect(runOrder).toEqual(['mock1', 'mock2', 'mock3', 'mock4']);
    });

    it("doesn't catch errors that occur in the onFulfilled callback if onRejected callback is provided", () => {
      config.rootDir = __dirname;
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {
        throw new Error();
      });
      const mock2 = jest.fn(() => {});
      const mock3 = jest.fn(() => {});

      global.Promise.resolve(0)
        .then(mock1, mock2)
        .catch(mock3);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);
      expect(mock3.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(0);
      expect(mock3.mock.calls.length).toBe(1);
    });

    it('catches errors that occur  further upstream if onRejected callback is provided', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});
      const mock2 = jest.fn(() => {});

      global.Promise.reject(0).then(mock1, mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(1);
    });
  });

  describe('_Promise.catch()', () => {
    it("catches errors that occur in parent's callback", () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});
      global.Promise.reject(0).catch(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
    });

    it('catches errors from further upstream (rejections that occur before immediate parent)', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});
      const mock2 = jest.fn(() => {});
      global.Promise.reject(0)
        .then(mock1)
        .catch(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(1);
    });

    it('passes the value returned by the onRejected callback as input to the next onResolved callback', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => 'mock1');
      const mock2 = jest.fn(() => 'mock2');
      global.Promise.reject(0)
        .catch(mock1)
        .then(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(1);
      expect(mock2.mock.calls[0][0]).toBe('mock1');
    });

    it('passes errors that occur in the onRejected callback downstream', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => global.Promise.reject('mock1'));
      const mock2 = jest.fn(() => 'mock2');
      global.Promise.reject(0)
        .catch(mock1)
        .catch(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(1);
      expect(mock2.mock.calls[0][0]).toBe('mock1');
    });

    it("completes catch callbacks in order in which they're scheduled", () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const runOrder = [];
      const mock1 = jest.fn(() => runOrder.push('mock1'));
      const mock2 = jest.fn(() => runOrder.push('mock2'));
      global.Promise.reject(0).catch(mock1);
      global.Promise.reject(0).catch(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(1);
      expect(runOrder).toEqual(['mock1', 'mock2']);
    });
  });

  describe('_Promise.finally()', () => {
    it('catches errors that occur further upstream', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});

      global.Promise.reject(0).finally(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
    });

    it("it doesn't pass an argument to its callback", () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});

      global.Promise.resolve('defined').finally(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toBe(undefined);
    });

    it('passes resolved value to children', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});
      const mock2 = jest.fn(() => {});

      global.Promise.resolve('defined')
        .finally(mock1)
        .then(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(1);
      expect(mock2.mock.calls[0][0]).toBe('defined');
    });

    it('passes rejected value to children', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});
      const mock2 = jest.fn(() => {});

      global.Promise.reject('defined')
        .finally(mock1)
        .then(mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock2.mock.calls.length).toBe(1);
      expect(mock2.mock.calls[0][0]).toBe('defined');
    });
  });

  describe('_Promise.all()', () => {
    it('resolves with an empty array if an empty array is passed to it', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});

      global.Promise.all([]).then(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toEqual([]);
    });

    it('throws an error if argument is not an array', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();
      expect(() => global.Promise.all(1)).toThrow(TypeError);
    });

    it('resolves with an array that includes any non-promise value from the input array', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});
      global.Promise.all([1]).then(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toEqual([1]);
    });

    it('converts thenable input array entries to promises', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const thenable = {then: onResolve => onResolve('x')};
      const mock1 = jest.fn(() => {});
      global.Promise.all([thenable]).then(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toEqual(['x']);
    });

    it('includes resolved values of input promises according to their order in input promise', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});
      const p2 = global.Promise.resolve('p2');
      const p1 = global.Promise.resolve('p1');
      global.Promise.all([p1, p2]).then(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toEqual(['p1', 'p2']);
    });

    it('includes resolved values of input promises in order', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});
      const p1 = global.Promise.resolve('p1');
      const p2 = global.Promise.resolve('p2');
      global.Promise.all([p1, p2]).then(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toEqual(['p1', 'p2']);
    });

    it('rejects when a promise amongst its values rejects', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});
      const mock2 = jest.fn(() => {});
      const p1 = global.Promise.reject('p1');
      global.Promise.all([p1]).then(mock1, mock2);

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(1);
      expect(mock2.mock.calls[0][0]).toEqual('p1');
    });
  });

  describe('_Promise.race()', () => {
    it('never resolves if an empty array is passed', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});
      const promise = global.Promise.race([]).then(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(0);
      expect(promise.dangerouslyGetNode().state).toBe('pending');
    });

    it('returns first promise to resolve', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const p1 = global.Promise.resolve(0).then(() => 'x');
      const p2 = global.Promise.resolve('y');
      const mock1 = jest.fn(() => {});
      global.Promise.race([p1, p2]).then(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toEqual('y');
    });

    it('resolves non-promise values and races them against other input values', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const mock1 = jest.fn(() => {});
      global.Promise.race(['x', 'y']).then(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toEqual('x');
    });

    it('converts thenables to promises and races them against other input values', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const thenable = {then: resolve => resolve('x')};
      const mock1 = jest.fn(() => {});
      global.Promise.race([thenable]).then(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toEqual('x');
    });

    it('rejects if the first promise to complete is a rejection', () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const p1 = global.Promise.resolve(0).then(() => 'x');
      const p2 = global.Promise.reject('y');
      const mock1 = jest.fn(() => {});
      global.Promise.race([p1, p2]).catch(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toEqual('y');
    });

    it("doens't prioritize rejections over resolutions", () => {
      const global = {};
      const promises = new FakePromises({
        config,
        global,
      });
      promises.useFakePromises();

      const p1 = global.Promise.resolve('x');
      const p2 = global.Promise.reject('y');
      const mock1 = jest.fn(() => {});
      global.Promise.race([p1, p2]).then(mock1);

      expect(mock1.mock.calls.length).toBe(0);

      promises.runAllPromises();

      expect(mock1.mock.calls.length).toBe(1);
      expect(mock1.mock.calls[0][0]).toEqual('x');
    });
  });

  describe('isUsingFakePromises', () => {
    it('indicates when using fake promises', () => {
      const global = {};
      const promises = new FakePromises({config, global});
      promises.useFakePromises();
      expect(promises.isUsingFakePromises()).toBe(true);
    });

    it('indicates when not using fake promises', () => {
      const global = {};
      const promises = new FakePromises({config, global});
      promises.useRealPromises();
      expect(promises.isUsingFakePromises()).toBe(false);
    });
  });

  describe('hasQueuedPromises', () => {
    it('indicates when no promises are queued', () => {
      const global = {};
      const promises = new FakePromises({config, global});
      promises.useFakePromises();
      expect(promises.hasQueuedPromises()).toBe(false);
    });

    it('indicates when promises are queued', () => {
      const global = {};
      const promises = new FakePromises({config, global});
      promises.useFakePromises();
      global.Promise.resolve(0);
      expect(promises.hasQueuedPromises()).toBe(true);
    });
  });
});
