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

import {formatStackTrace} from 'jest-message-util';
import setGlobal from './set_global';

/**
 * We don't know the type of arguments for a callback ahead of time which is why
 * we are disabling the flowtype/no-weak-types rule here.
 */

/* eslint-disable flowtype/no-weak-types */
type Callback = (...args: any) => void;
/* eslint-enable flowtype/no-weak-types */

type PromiseState = 'pending' | 'fulfilled' | 'rejected';

type PromiseNode = {|
  id: number,
  state: PromiseState,
  parent?: ?PromiseNode,
  children: Array<PromiseNode>,
  output: any,
  onFulfilled: ?Callback,
  onRejected: ?Callback,
|};

type Thenable = {|
  then: Callback,
|};

export default class FakePromises {
  _config: ProjectConfig;
  _disposed: boolean;
  _fakePromise: Function;
  _global: Global;
  _promisesCurrent: Array<PromiseNode>;
  _promisesUpNext: Array<PromiseNode>;
  _realPromise: Function;
  _idCounter: number;
  _idToRef: {[number]: _Promise};
  _isRunning: boolean;

  constructor({config, global}: {config: ProjectConfig, global: Global}) {
    this._config = config;
    this._global = global;
    this._promisesCurrent = [];
    this._promisesUpNext = [];
    this._isRunning = false;

    this._realPromise = global.Promise;
    this._fakePromise = _Promise;
    this._fakePromise.onCreatedCallback = this._onPromiseCreated.bind(this);

    this._disposed = false;
    this._idToRef = {};
    this._idCounter = 0;

    this.reset();

    global.mockClearPromises = this.clearAllPromises.bind(this);
  }

  clearAllPromises() {
    for (const id in this._idToRef) {
      const promise = this._idToRef[Number(id)];
      promise.dangerouslyClearNode();
      delete this._idToRef[Number(id)];
    }

    this._idToRef = {};
    this._promisesCurrent = [];
    this._promisesUpNext = [];
  }

  dispose() {
    this._disposed = true;
    this.clearAllPromises();
    delete _Promise.onCreatedCallback;
  }

  reset() {
    this._promisesCurrent = [];
    this._promisesUpNext = [];
    this._isRunning = false;
  }

  isUsingFakePromises() {
    return this._global.Promise === this._fakePromise;
  }

  hasQueuedPromises() {
    if (this._isRunning) {
      return (
        this._promisesCurrent.length > 0 || this._promisesUpNext.length > 0
      );
    } else {
      return this._promisesCurrent.length > 0;
    }
  }

  runAllPromises() {
    if (this._disposed) {
      return;
    }

    this._checkFakePromises();
    while (this._promisesCurrent.length > 0) {
      this._runCurrentPromises();
    }
  }

  _runNonRootPromise(promise: PromiseNode, parent: PromiseNode) {
    let shouldScheduleChildren = true;

    if (parent.state === 'pending') {
      throw new Error(`_Promise is being run before its parent`);
    }
    // Promise chain has error
    // =======================
    if (
      parent.state === 'rejected' &&
      typeof promise.onRejected === 'function'
    ) {
      try {
        promise.output = promise.onRejected(parent.output);
        promise.state = 'fulfilled';
        shouldScheduleChildren = this._processOutput(promise);
      } catch (reason) {
        promise.state = 'rejected';
        promise.output = reason;
      }
    } else if (
      parent.state === 'rejected' &&
      typeof promise.onRejected !== 'function'
    ) {
      promise.state = 'rejected';
      promise.output = parent.output;

      if (promise.children.length === 0) {
        this._unhandledPromiseRejection();
      }
    }
    // Promise chain has no errors
    // ===========================
    else if (
      parent.state === 'fulfilled' &&
      typeof promise.onFulfilled === 'function'
    ) {
      try {
        promise.output = promise.onFulfilled(parent.output);
        promise.state = 'fulfilled';
        shouldScheduleChildren = this._processOutput(promise);
      } catch (reason) {
        promise.state = 'rejected';
        promise.output = reason;

        if (promise.children.length === 0) {
          this._unhandledPromiseRejection();
        }
      }
    } else if (
      parent.state === 'fulfilled' &&
      typeof promise.onFulfilled !== 'function'
    ) {
      promise.output = parent.output;
      promise.state = parent.state;
      shouldScheduleChildren = this._processOutput(promise);

      if (promise.state === 'rejected' && promise.children.length === 0) {
        this._unhandledPromiseRejection();
      }
    }

    if (shouldScheduleChildren) {
      this._promisesUpNext.push(...promise.children);
    }
  }

  _runRootPromise(promise: PromiseNode) {
    let shouldScheduleChildren = true;

    if (typeof promise.onFulfilled === 'function') {
      try {
        promise.output = promise.onFulfilled();
        promise.state = 'fulfilled';
        shouldScheduleChildren = this._processOutput(promise);
      } catch (reason) {
        promise.state = 'rejected';
        promise.output = reason;

        if (promise.children.length === 0) {
          this._unhandledPromiseRejection();
        }
      }
    } else if (typeof promise.onRejected === 'function') {
      try {
        promise.output = promise.onRejected();
        promise.state = 'rejected';
      } catch (reason) {
        promise.state = 'rejected';
        promise.output = reason;
      }

      if (promise.children.length === 0) {
        this._unhandledPromiseRejection();
      }
    } else {
      return;
    }

    if (shouldScheduleChildren) {
      this._promisesUpNext.push(...promise.children);
    }
  }

  _processOutput(promise: PromiseNode) {
    if (promise.output instanceof _Promise) {
      return this._handleOutputIsPromise(promise);
    } else if (
      typeof promise.output === 'object' &&
      typeof promise.output.then === 'function'
    ) {
      return this._handleOutputIsThenable(promise, promise.output);
    }
    return true; // should schedule children
  }

  _handleOutputIsPromise(
    promise: PromiseNode,
    rescheduledChildren: Array<PromiseNode> = [],
  ) {
    const outputNode = promise.output.dangerouslyGetNode();

    promise.children.forEach(child => {
      child.parent = outputNode;
    });

    rescheduledChildren.push(...promise.children);
    outputNode.children.push(...promise.children);
    promise.children = [];

    if (outputNode.output instanceof _Promise) {
      this._handleOutputIsPromise(outputNode, rescheduledChildren);
    } else if (outputNode.state !== 'pending') {
      rescheduledChildren.forEach(child => this._schedulePromise(child));
    }

    return false; // shouldn't schedule children
  }

  _handleOutputIsThenable(promise: PromiseNode, thenable: Thenable) {
    const promiseFromThenable = _Promise.fromThenable(thenable);
    promise.output = promiseFromThenable;
    return this._handleOutputIsPromise(promise);
  }

  _runCurrentPromises() {
    this._isRunning = true;

    while (this._promisesCurrent.length > 0) {
      const promise = this._promisesCurrent.shift();
      if (promise.parent !== undefined && promise.parent !== null) {
        this._runNonRootPromise(promise, promise.parent);
      } else {
        this._runRootPromise(promise);
      }
    }

    this._promisesCurrent = this._promisesUpNext;
    this._promisesUpNext = [];
    this._isRunning = false;
  }

  useRealPromises() {
    setGlobal(this._global, 'Promise', this._realPromise);
  }

  useFakePromises() {
    this._checkWillCompileAsyncToGenerator();
    setGlobal(this._global, 'Promise', this._fakePromise);
  }

  _onPromiseCreated(promise: _Promise, node: PromiseNode) {
    node.id = this._idCounter++;
    this._idToRef[node.id] = promise;

    if (
      node.parent !== null &&
      node.parent !== undefined &&
      node.parent.state !== 'pending'
    ) {
      if (node.parent.output instanceof _Promise) {
        this._handleOutputIsPromise(node.parent);
        return;
      } else if (
        typeof node.parent.output === 'object' &&
        typeof node.parent.output.then === 'function'
      ) {
        this._handleOutputIsThenable(node.parent, node.parent.output);
        return;
      }
    }
    this._schedulePromise(node);
  }

  _schedulePromise(promise: PromiseNode) {
    // The promise queue should only contain 'pending' nodes.
    if (promise.parent === undefined || promise.parent === null) {
      this._promisesCurrent.push(promise);
    } else if (
      typeof promise.parent === 'object' &&
      promise.parent.state !== 'pending' &&
      !this._promisesCurrent.includes(promise.parent) &&
      !this._promisesUpNext.includes(promise.parent)
    ) {
      const promiseQueue = this._isRunning
        ? this._promisesUpNext
        : this._promisesCurrent;
      promiseQueue.push(promise);
    }
  }

  _checkFakePromises() {
    if (this._global.Promise !== this._fakePromise) {
      this._global.console.warn(
        `A function to invoke promises was called but the promises API is not ` +
          `mocked with fake promises. Call \`jest.useFakePromises()\` in this ` +
          `test or enable fake promises globally by setting ` +
          `\`"promises": "fake"\` in ` +
          `the configuration file. Fake promises will also be used by default ` +
          `if you use fake timers.\n\n` +
          `Stack Trace:\n` +
          formatStackTrace(new Error().stack, this._config, {
            noStackTrace: false,
          }),
      );
    }
  }

  _checkWillCompileAsyncToGenerator() {
    if (!this._config.compileAsyncToGenerator) {
      this._global.console.warn(
        `Fake promises are being used with the \`compileAsyncToGenerator\` option ` +
          `being set to \`false\`. Any promises implicitly created with the ` +
          `\`async\`-\`await\` syntax may not be mocked.\n\n` +
          `Stack Trace:\n` +
          formatStackTrace(new Error().stack, this._config, {
            noStackTrace: false,
          }),
      );
    }
  }

  _unhandledPromiseRejection() {
    this._global.console.warn(
      `UnhandledPromiseRejectionWarning: Unhandled promise rejection.\n\n` +
        `Stack Trace:\n` +
        formatStackTrace(new Error().stack, this._config, {
          noStackTrace: false,
        }),
    );
  }
}

class _Promise {
  static onCreatedCallback: Callback;

  _node: PromiseNode;

  constructor(
    resolver: Callback,
    {
      parent,
      onFulfilled,
      onRejected,
    }: {
      parent?: ?PromiseNode,
      onFulfilled?: ?Callback,
      onRejected?: ?Callback,
    } = {},
  ) {
    this._node = {
      children: [],
      id: -1,
      onFulfilled: onFulfilled ? onFulfilled : undefined,
      onRejected: onRejected ? onRejected : undefined,
      output: undefined,
      parent,
      state: 'pending',
    };

    let didSchedulePromise = false;
    const resolve = value => {
      if (this._node.onRejected === undefined) {
        this._node.onFulfilled = () => value;
        _Promise.onCreatedCallback(this, this._node);
        didSchedulePromise = true;
      }
    };
    const reject = reason => {
      if (this._node.onFulfilled === undefined) {
        this._node.onRejected = () => reason;
        _Promise.onCreatedCallback(this, this._node);
        didSchedulePromise = true;
      }
    };

    try {
      resolver(resolve, reject);
    } catch (reason) {
      this._node.onRejected = () => reason;
    }

    if (
      typeof _Promise.onCreatedCallback === 'function' &&
      !didSchedulePromise
    ) {
      _Promise.onCreatedCallback(this, this._node);
    }
  }

  static resolve(value: any) {
    if (value instanceof _Promise) {
      return value;
    }
    return new _Promise(resolve => resolve(value));
  }

  static reject(reason: any) {
    return new _Promise((resolve, reject) => reject(reason));
  }

  static all(iterable: any) {
    const values = [];
    let resolvedValues = 0;
    let hasError = false;

    if (!(iterable instanceof Array)) {
      throw new TypeError('(var)[Symbol.iterator] is not a function');
    } else if (iterable.length === 0) {
      return _Promise.resolve([]);
    }

    return new _Promise((resolve, reject) => {
      iterable.forEach((item, index) => {
        const promise = _Promise.resolve(item);

        promise.then(
          value => {
            if (!hasError) {
              values[index] = value;
              resolvedValues++;
              if (resolvedValues === iterable.length) {
                resolve(values);
              }
            }
          },
          reason => {
            hasError = true;
            reject(reason);
          },
        );
      });
    });
  }

  static race(iterable: any) {
    if (!(iterable instanceof Array)) {
      throw new TypeError('(var)[Symbol.iterator] is not a function');
    }

    let hasValue = false;
    let hasError = false;

    return new _Promise((resolve, reject) => {
      iterable.forEach(item => {
        const promise = _Promise.resolve(item);

        promise.then(
          value => {
            if (!hasValue && !hasError) {
              hasValue = true;
              resolve(value);
            }
          },
          reason => {
            if (!hasValue) {
              hasError = true;
              reject(reason);
            }
          },
        );
      });
    });
  }

  then(onFulfilled: Callback, onRejected: ?Callback = undefined) {
    if (
      this._node.state !== 'pending' &&
      this._node.output instanceof _Promise
    ) {
      return this._node.output.then(onFulfilled, onRejected);
    }

    const nextPromise = new _Promise(() => {}, {
      onFulfilled,
      onRejected,
      parent: this._node,
    });
    this._node.children.push(nextPromise.dangerouslyGetNode());

    return nextPromise;
  }

  catch(onRejected: Callback) {
    const nextPromise = new _Promise(() => {}, {
      onRejected,
      parent: this._node,
    });
    this._node.children.push(nextPromise.dangerouslyGetNode());

    return nextPromise;
  }

  finally(onFinally: Callback) {
    const callback = input => {
      onFinally();
      return input;
    };

    const nextPromise = new _Promise(() => {}, {
      onFulfilled: callback,
      onRejected: callback,
      parent: this._node,
    });
    this._node.children.push(nextPromise.dangerouslyGetNode());

    return nextPromise;
  }

  // Signatures not defined in the Promise API
  // =========================================

  dangerouslyGetNode() {
    return this._node;
  }

  dangerouslyClearNode() {
    delete this._node;
  }

  static fromThenable(thenable: Thenable) {
    return new _Promise(thenable.then);
  }
}
