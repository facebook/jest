/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import formatTestNameByPattern from '../formatTestNameByPattern';

describe('for multiline test name returns', () => {
  const testNames = [
    'should\n name the \nfunction you attach',
    'should\r\n name the \r\nfunction you attach',
    'should\r name the \rfunction you attach',
  ];

  it('test name with highlighted pattern and replaced line breaks', () => {
    const pattern = 'name';

    testNames.forEach(testName => {
      expect(formatTestNameByPattern(testName, pattern, 36)).toMatchSnapshot();
    });
  });
});

describe('for one line test name', () => {
  const testName = 'should name the function you attach';

  describe('with pattern in the head returns', () => {
    const pattern = 'should';

    it('test name with highlighted pattern', () => {
      expect(formatTestNameByPattern(testName, pattern, 35)).toMatchSnapshot();
    });

    it('test name with cutted tail and highlighted pattern', () => {
      expect(formatTestNameByPattern(testName, pattern, 30)).toMatchSnapshot();
    });

    it('test name with cutted tail and cutted highlighted pattern', () => {
      expect(formatTestNameByPattern(testName, pattern, 8)).toMatchSnapshot();
    });
  });

  describe('pattern in the middle', () => {
    const pattern = 'name';

    it('test name with highlighted pattern returns', () => {
      expect(formatTestNameByPattern(testName, pattern, 35)).toMatchSnapshot();
    });

    it('test name with cutted tail and highlighted pattern', () => {
      expect(formatTestNameByPattern(testName, pattern, 25)).toMatchSnapshot();
    });

    it('test name with cutted tail and cutted highlighted pattern', () => {
      expect(formatTestNameByPattern(testName, pattern, 13)).toMatchSnapshot();
    });

    it('test name with highlighted cutted', () => {
      expect(formatTestNameByPattern(testName, pattern, 6)).toMatchSnapshot();
    });
  });

  describe('pattern in the tail returns', () => {
    const pattern = 'attach';

    it('test name with highlighted pattern', () => {
      expect(formatTestNameByPattern(testName, pattern, 35)).toMatchSnapshot();
    });

    it('test name with cutted tail and cutted highlighted pattern', () => {
      expect(formatTestNameByPattern(testName, pattern, 33)).toMatchSnapshot();
    });

    it('test name with highlighted cutted', () => {
      expect(formatTestNameByPattern(testName, pattern, 6)).toMatchSnapshot();
    });
  });
});
