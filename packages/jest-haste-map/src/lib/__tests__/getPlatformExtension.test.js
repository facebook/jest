/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 * All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import getPlatformExtension from '../getPlatformExtension';

describe('getPlatformExtension', () => {
  it('should get platform ext', () => {
    expect(getPlatformExtension('a.ios.js')).toBe('ios');
    expect(getPlatformExtension('a.android.js')).toBe('android');
    expect(getPlatformExtension('/b/c/a.ios.js')).toBe('ios');
    expect(getPlatformExtension('/b/c.android/a.ios.js')).toBe('ios');
    expect(getPlatformExtension('/b/c/a@1.5x.ios.png')).toBe('ios');
    expect(getPlatformExtension('/b/c/a@1.5x.lol.png')).toBe(null);
    expect(getPlatformExtension('/b/c/a.lol.png')).toBe(null);
  });
});
