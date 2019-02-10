/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import EventEmitter from 'events';

type State = {|
  interrupted: boolean,
|};

export default class TestWatcher extends EventEmitter {
  state: State;
  _isWatchMode: boolean;

  constructor({isWatchMode}: {isWatchMode: boolean}) {
    super();
    this.state = {interrupted: false};
    this._isWatchMode = isWatchMode;
  }

  setState(state: State) {
    Object.assign(this.state, state);
    this.emit('change', this.state);
  }

  isInterrupted() {
    return this.state.interrupted;
  }

  isWatchMode() {
    return this._isWatchMode;
  }
}
