/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export interface Process {
  stdout: stream$Writable | tty$WriteStream;
  exit(code?: number): void;
}
