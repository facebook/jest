/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Writable} from 'stream';

type Callback = (error: Error | null | undefined) => void;
type Encoding = string | undefined;
type WriteFn = (
  chunk: any,
  encoding?: Encoding,
  callback?: Callback,
) => boolean;

class Output {
  private _stdout: NodeJS.WriteStream;
  private _stderr: NodeJS.WriteStream;

  constructor() {
    this._stdout = process.stdout;
    this._stderr = process.stderr;
  }

  get isTTY() {
    return this._stdout.isTTY;
  }

  err(chunk: any, encoding?: Encoding, callback?: Callback) {
    return this._stderr.write(chunk, encoding, callback);
  }

  out(chunk: any, encoding?: Encoding, callback?: Callback) {
    return this._stdout.write(chunk, encoding, callback);
  }

  clearLine(...args: Array<WriteFn>) {
    if (this.isTTY) {
      args.forEach(fn => fn.call(this, '\x1b[999D\x1b[K'));
    }
  }

  setErrorStream(stream: NodeJS.WriteStream | Writable) {
    this._stderr = stream as NodeJS.WriteStream;
  }

  setOutStream(stream: NodeJS.WriteStream | Writable) {
    this._stdout = stream as NodeJS.WriteStream;
  }
}

export default new Output();
