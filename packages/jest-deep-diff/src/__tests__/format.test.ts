/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import stripAnsi = require('strip-ansi');
import {alignedAnsiStyleSerializer} from '@jest/test-utils';
import oldDiff from 'jest-diff';
import diff from '../diff';
import format from '../format';

// @ts-expect-error
expect.addSnapshotSerializer(alignedAnsiStyleSerializer);

const strippedFormat = valueDiff =>
  stripAnsi(format(valueDiff, {omitAnnotationLines: true}));

test('numbers', () => {
  expect(strippedFormat(diff(1, 2))).toBe('- 1\n+ 2');
});

test('-0 and 0', () => {
  expect(strippedFormat(diff(-0, 0))).toBe('- -0\n+ 0');
});

test('booleans', () => {
  expect(strippedFormat(diff(false, true))).toBe('- false\n+ true');
});

test('one line strings', () => {
  expect(strippedFormat(diff('banana', 'apple'))).toBe('- banana\n+ apple');
});

describe('Objects', () => {
  it('should format object updated', () => {
    const a = {a: {b: {c: 5, d: 6}}};
    const b = {a: {b: {c: 6, d: 6}}};

    const expected = [
      '  Object {',
      '    "a": Object {',
      '      "b": Object {',
      '-       "c": 5,',
      '+       "c": 6,',
      '        "d": 6,',
      '      },',
      '    },',
      '  }',
    ].join('\n');

    expect(strippedFormat(diff(a, b))).toEqual(expected);
  });

  test('if property is set to undefined it should show up in diff', () => {
    const a = {a: 2};
    const b = {a: undefined};
    const expected1 = [
      '  Object {',
      '-   "a": 2,',
      '+   "a": undefined,',
      '  }',
    ].join('\n');

    const expected2 = [
      '  Object {',
      '-   "a": undefined,',
      '+   "a": 2,',
      '  }',
    ].join('\n');
    expect(strippedFormat(diff(a, b))).toEqual(expected1);
    expect(strippedFormat(diff(b, a))).toEqual(expected2);
  });

  test('one property is complex and other is primitive', () => {
    const a = {a: 2};
    const b = {
      a: {
        b: {
          c: 3,
        },
      },
    };
    const expected = [
      '  Object {',
      '-   "a": 2,',
      '+   "a": Object {',
      '+     "b": Object {',
      '+       "c": 3,',
      '+     },',
      '+   },',
      '  }',
    ].join('\n');
    const actual = strippedFormat(diff(a, b));
    expect(actual).toEqual(expected);
  });

  test('inserted  and deleted properties', () => {
    const a = {a: {a: 1}};
    const b = {
      b: {
        b: {
          c: 3,
        },
      },
    };
    const expected = [
      '  Object {',
      '-   "a": Object {',
      '-     "a": 1,',
      '-   },',
      '+   "b": Object {',
      '+     "b": Object {',
      '+       "c": 3,',
      '+     },',
      '+   },',
      '  }',
    ].join('\n');
    expect(strippedFormat(diff(a, b))).toEqual(expected);
  });

  test('equal objects as values of object properties', () => {
    const a = {a: {a: 1}};
    const b = {a: {a: 1}, c: 2};
    const actual = strippedFormat(diff(a, b));
    const expected = [
      '  Object {',
      '    "a": Object {',
      '      "a": 1,',
      '    },',
      '+   "c": 2,',
      '  }',
    ].join('\n');
    expect(actual).toEqual(expected);
  });

  describe('multiline string as value of object property', () => {
    test('updated diff', () => {
      const a = {
        id: 'J',
        points: '0.5,0.460\n0.25,0.875',
      };
      const b = {
        id: 'J',
        points: '0.5,0.460\n0.5,0.460\n0.25,0.875',
      };

      const expected = [
        '  Object {',
        '    "id": "J",',
        '    "points": "0.5,0.460',
        '+   0.5,0.460',
        '    0.25,0.875",',
        '  }',
      ].join('\n');

      const actual = strippedFormat(diff(a, b));
      expect(actual).toBe(expected);
    });

    test('equal', () => {
      const expected = [
        '  Object {',
        '-   "id": "B",',
        '+   "id": "J",',
        '    "points": "0.5,0.460',
        '    0.5,0.460',
        '    0.25,0.875",',
        '  }',
      ].join('\n');
      const a = {
        id: 'B',
        points: '0.5,0.460\n0.5,0.460\n0.25,0.875',
      };
      const b = {
        id: 'J',
        points: '0.5,0.460\n0.5,0.460\n0.25,0.875',
      };

      const actual = strippedFormat(diff(a, b));
      expect(actual).toBe(expected);
    });
    test('inserted', () => {
      const expected = [
        '  Object {',
        '    "id": "J",',
        '+   "points": "0.5,0.460',
        '+   0.5,0.460',
        '+   0.25,0.875",',
        '  }',
      ].join('\n');
      const a = {
        id: 'J',
      };
      const b = {
        id: 'J',
        points: '0.5,0.460\n0.5,0.460\n0.25,0.875',
      };

      const actual = strippedFormat(diff(a, b));
      expect(actual).toBe(expected);
    });
  });
});

describe('multiline string non-snapshot', () => {
  // For example, CLI output
  // toBe or toEqual for a string isn’t enclosed in double quotes.
  const a = `Options:
--help, -h  Show help                            [boolean]
--bail, -b  Exit the test suite immediately upon the first
            failing test.                        [boolean]`;
  const b = `Options:
  --help, -h  Show help                            [boolean]
  --bail, -b  Exit the test suite immediately upon the first
              failing test.                        [boolean]`;
  const expected = [
    '  Options:',
    '- --help, -h  Show help                            [boolean]',
    '- --bail, -b  Exit the test suite immediately upon the first',
    '-             failing test.                        [boolean]',
    '+   --help, -h  Show help                            [boolean]',
    '+   --bail, -b  Exit the test suite immediately upon the first',
    '+               failing test.                        [boolean]',
  ].join('\n');

  test('(unexpanded)', () => {
    expect(strippedFormat(diff(a, b))).toBe(expected);
  });
  test('(expanded)', () => {
    expect(strippedFormat(diff(a, b))).toBe(expected);
  });
});

describe('Arrays', () => {
  test('(unexpanded)', () => {
    const a = [1, 4, 4];
    const b = [1, 6];

    const expected = [
      '  Array [',
      '    1,',
      '-   4,',
      '+   6,',
      '-   4,',
      '  ]',
    ].join('\n');
    const actual = strippedFormat(diff(a, b));
    expect(actual).toBe(expected);
  });

  test('nested objects', () => {
    const a = [1, {a: 3, b: 2, c: 20}, 4];
    const b = [1, {a: 1, b: 2, d: 30}];
    const actual = strippedFormat(diff(a, b));
    const expected = [
      '  Array [',
      '    1,',
      '    Object {',
      '-     "a": 3,',
      '+     "a": 1,',
      '      "b": 2,',
      '-     "c": 20,',
      '+     "d": 30,',
      '    },',
      '-   4,',
      '  ]',
    ].join('\n');

    expect(actual).toBe(expected);
  });

  test('nested arrays', () => {
    const a = [1, [1, 3, 3], 4];
    const b = [1, [1, 4]];
    const actual = strippedFormat(diff(a, b));
    const expected = [
      '  Array [',
      '    1,',
      '    Array [',
      '      1,',
      '-     3,',
      '+     4,',
      '-     3,',
      '    ],',
      '-   4,',
      '  ]',
    ].join('\n');

    expect(actual).toBe(expected);
  });

  test('inserted nested objects', () => {
    const a = [1];
    const b = [1, {a: 1, b: 2, d: 30}];
    const actual = strippedFormat(diff(a, b));
    const expected = [
      '  Array [',
      '    1,',
      '+   Object {',
      '+     "a": 1,',
      '+     "b": 2,',
      '+     "d": 30,',
      '+   },',
      '  ]',
    ].join('\n');

    expect(actual).toBe(expected);
  });
  test('deleted nested objects', () => {
    const a = [1, {a: 1, b: 2, d: 30}];
    const b = [1];
    const actual = strippedFormat(diff(a, b));
    const expected = [
      '  Array [',
      '    1,',
      '-   Object {',
      '-     "a": 1,',
      '-     "b": 2,',
      '-     "d": 30,',
      '-   },',
      '  ]',
    ].join('\n');

    expect(actual).toBe(expected);
  });
});

describe('Maps', () => {
  test('primitive keys', () => {
    const a = new Map([
      ['a', 1],
      ['b', 3],
      ['c', 3],
    ]);
    const b = new Map([
      ['a', 1],
      ['b', 2],
      ['d', 4],
    ]);

    const actual = strippedFormat(diff(a, b));
    const expected = [
      '  Map {',
      '    "a" => 1,',
      '-   "b" => 3,',
      '+   "b" => 2,',
      '-   "c" => 3,',
      '+   "d" => 4,',
      '  }',
    ].join('\n');

    expect(actual).toEqual(expected);
  });

  test.skip('complex keys', () => {
    const a = new Map([
      [{a: 1}, {a: 2}],
      [{a: 2}, {a: 3}],
    ]);
    const b = new Map([
      [{a: 3}, {a: 2}],
      [{b: 2}, {a: 3}],
    ]);

    const expected = [
      '  Map {',
      '    Object {',
      '-     "a": 1,',
      '+     "a": 3,',
      '    } => Object {',
      '      "a": 2,',
      '    },',
      '    Object {',
      '-     "a": 2,',
      '+     "b": 2,',
      '    } => Object {',
      '      "a": 3,',
      '    },',
      '  }',
    ].join('\n');

    const actual = strippedFormat(diff(a, b));
    expect(actual).toEqual(expected);
  });
});

describe('Sets', () => {
  test.todo('marks updated values');
});

describe('multiline strings', () => {
  const a = `line 1
line 2
line 3
line 4`;
  const b = `line 1
line  2
line 3
line 4`;
  const expected = [
    '  line 1',
    '- line 2',
    '+ line  2',
    '  line 3',
    '  line 4',
  ].join('\n');

  test('(unexpanded)', () => {
    expect(strippedFormat(diff(a, b))).toBe(expected);
  });
});

describe('circular values', () => {
  test('(unexpanded)', () => {
    const a: Record<string, unknown> = {};
    a.x = {y: a};
    const b: Record<string, unknown> = {};
    const bx: Record<string, unknown> = {};
    b.x = bx;
    bx.y = bx;
    expect(strippedFormat(diff(a, b))).toMatchSnapshot();
  });

  test('nested circular values', () => {
    const a: Record<string, unknown> = {b: 1};
    a.x = {y: a};
    const b: Record<string, unknown> = {};
    b.x = {y: b};

    expect(strippedFormat(diff(a, b))).toMatchSnapshot();
  });

  test('only one side has circularity', () => {
    const a: Record<string, unknown> = {};
    a.x = {y: a};
    const b = {
      x: {
        y: {
          a: {
            b: 3,
          },
        },
      },
    };

    expect(strippedFormat(diff(a, b))).toMatchSnapshot();
    expect(strippedFormat(diff(b, a))).toMatchSnapshot();
  });

  test('other side is primitive', () => {
    const a: Record<string, unknown> = {};
    a.x = {y: a};
    const b = {
      x: {
        y: 3,
      },
    };

    expect(strippedFormat(diff(a, b))).toMatchSnapshot();
    expect(strippedFormat(diff(b, a))).toMatchSnapshot();
  });
});
