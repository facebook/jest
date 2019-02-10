/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

test('should match 1', () => expect(1).toBe(1));
test('should match 2', () => expect(1).toBe(1));
test('should not match 1', () => expect(1).toBe(1));
test('wisconsin', () => expect(1).toBe(1));
test.concurrent('should not match 2', () => expect(1).toBe(1));
