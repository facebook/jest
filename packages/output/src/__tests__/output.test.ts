/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import output from '..';
import {Writable} from 'stream';

describe('@jest/output', () => {
  beforeEach(() => {
    output.setOutStream(process.stdout);
    output.setErrorStream(process.stderr);
  });
  describe('err', () => {
    it('writes to process.stderr by default', () => {
      const spy = jest.spyOn(process.stderr, 'write');
      // @ts-ignore
      spy.mockImplementation(() => {});
      output.err('error-test');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toEqual('error-test');
      spy.mockRestore();
    });
  });
  describe('out', () => {
    it('writes to process.stdout by default', () => {
      const spy = jest.spyOn(process.stdout, 'write');
      // @ts-ignore
      spy.mockImplementation(() => {});
      output.out('log-test');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toEqual('log-test');
      spy.mockRestore();
    });
  });
  describe('clearLine', () => {
    it('clears the line for the provided stream(s)', () => {
      const writeOut = jest.fn();
      const writeErr = jest.fn();
      const stdout = new Writable({write: writeOut});
      const stderr = new Writable({write: writeErr});
      (stdout as any).isTTY = true;
      output.setOutStream(stdout);
      output.setErrorStream(stderr);
      output.clearLine(output.out, output.err);
      expect(writeOut).toHaveBeenCalledTimes(1);
      expect(writeErr).toHaveBeenCalledTimes(1);
      expect(writeOut.mock.calls[0][0].toString()).toEqual('\x1b[999D\x1b[K');
      expect(writeErr.mock.calls[0][0].toString()).toEqual('\x1b[999D\x1b[K');
    });
  });
  describe('isTTY', () => {
    it('returns isTTY or undefined based on the current log stream', () => {
      expect(output.isTTY).toEqual(process.stdout.isTTY);
      const customStream = new Writable();
      output.setOutStream(customStream);
      expect(output.isTTY).toBeUndefined();
    });
  });
  describe('setErrorStream', () => {
    it('sets the error stream', () => {
      let data = '';
      const write = chunk => (data += chunk.toString());
      const stream = new Writable({write});
      const spy = jest.spyOn(process.stderr, 'write');
      output.setErrorStream(stream);
      output.err('error-test');
      expect(spy).not.toHaveBeenCalled();
      expect(data).toEqual('error-test');
    });
  });
  describe('setLogStream', () => {
    it('sets the log stream', () => {
      let data = '';
      const write = chunk => (data += chunk.toString());
      const stream = new Writable({write});
      const spy = jest.spyOn(process.stdout, 'write');
      output.setOutStream(stream);
      output.out('log-test');
      expect(spy).not.toHaveBeenCalled();
      expect(data).toEqual('log-test');
    });
  });
});
