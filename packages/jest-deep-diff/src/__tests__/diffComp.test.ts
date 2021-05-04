/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// adapted from jest-diff/__tests__/diff.test.ts
import chalk = require('chalk');
import fc from 'fast-check';
import oldDiff from 'jest-diff';
import diff from '../index';
import {noColor} from '../normalizeDiffOptions';
import {DeepDiffOptions} from '../types';

const optionsCounts: DeepDiffOptions = {
  includeChangeCounts: false,
};

// Use in toBe assertions for comparison lines.
const optionsBe: DeepDiffOptions = {
  aColor: noColor,
  bColor: noColor,
  commonColor: noColor,
  omitAnnotationLines: true,
};
const unexpandedBe: DeepDiffOptions = {
  ...optionsBe,
  expand: false,
};
const expandedBe: DeepDiffOptions = {
  ...optionsBe,
  expand: true,
};

// Use for toMatchSnapshot assertions.
const unexpanded = {expand: false};
const expanded = {expand: true};

const elementSymbol = Symbol.for('react.element');

describe('different types', () => {
  [
    [1, 'a', 'number', 'string'],
    [{}, 'a', 'object', 'string'],
    [[], 2, 'array', 'number'],
    [null, undefined, 'null', 'undefined'],
    [() => {}, 3, 'function', 'number'],
  ].forEach(values => {
    const a = values[0];
    const b = values[1];

    test(`'${String(a)}' and '${String(b)}'`, () => {
      expect(diff(a, b, expandedBe)).toBe(oldDiff(a, b, expandedBe));
    });
  });
});

describe('no visual difference', () => {
  [
    ['a', 'a'],
    [{}, {}],
    [[], []],
    [
      [1, 2],
      [1, 2],
    ],
    [11, 11],
    [NaN, NaN],
    [Number.NaN, NaN],
    /* TBD:These two functions are not considered equal by expect.toEqual but
    jest-diff shows that there are no visual differences. IMHO,
    behaviour should be to show two idential outputs but still
    mark them as updated */
    // [() => {}, () => {}],
    [null, null],
    [undefined, undefined],
    [false, false],
    [{a: 1}, {a: 1}],
    [{a: {b: 5}}, {a: {b: 5}}],
  ].forEach(values => {
    test(`'${JSON.stringify(values[0])}' and '${JSON.stringify(
      values[1],
    )}'`, () => {
      const a = values[0];
      const b = values[1];
      expect(diff(a, b, expandedBe)).toBe(oldDiff(a, b, expandedBe));
    });
  });

  test('Map key order should be irrelevant', () => {
    const arg1 = new Map([
      [1, 'foo'],
      [2, 'bar'],
    ]);
    const arg2 = new Map([
      [2, 'bar'],
      [1, 'foo'],
    ]);

    expect(diff(arg1, arg2, expandedBe)).toBe(oldDiff(arg1, arg2, expandedBe));
  });

  test.skip('Set value order should be irrelevant', () => {
    const arg1 = new Set([1, 2]);
    const arg2 = new Set([2, 1]);

    expect(diff(arg1, arg2, expandedBe)).toBe(oldDiff(arg1, arg2, expandedBe));
  });
});

describe('oneline strings', () => {
  [
    ['ab', 'aa'],
    ['123456789', '234567890'],
    ['oneline', 'multi\nline'],
    ['multi\nline', 'oneline'],
  ].forEach(([a, b]) => {
    test(a + ' ' + b, () => {
      expect(diff(a, b, optionsCounts)).toBe(oldDiff(a, b, optionsCounts));
    });
  });
});

// Some of the following assertions seem complex, but compare to alternatives:
// * toBe instead of toMatchSnapshot:
//   * to avoid visual complexity of escaped quotes in expected string
//   * to omit Expected/Received heading which is an irrelevant detail
// * join lines of expected string instead of multiline string:
//   * to avoid ambiguity about indentation in diff lines

describe('multiline strings', () => {
  const a = `line 1
line 2
line 3
line 4`;
  const b = `line 1
line  2
line 3
line 4`;
  test('(unexpanded)', () => {
    expect(diff(a, b, unexpandedBe)).toBe(oldDiff(a, b, unexpandedBe));
  });
  test('(expanded)', () => {
    expect(diff(a, b, expandedBe)).toBe(oldDiff(a, b, expandedBe));
  });
});

describe('objects', () => {
  const a = {a: {b: {c: 5}}};
  const b = {a: {b: {c: 6}}};

  test('(unexpanded)', () => {
    expect(diff(a, b, unexpandedBe)).toBe(oldDiff(a, b, unexpandedBe));
  });
  test('(expanded)', () => {
    expect(diff(a, b, expandedBe)).toBe(oldDiff(a, b, expandedBe));
  });
});

test('numbers', () => {
  expect(diff(1, 2, optionsBe)).toBe(oldDiff(1, 2, optionsBe));
});

test('-0 and 0', () => {
  expect(diff(-0, 0, optionsBe)).toBe(oldDiff(-0, 0, optionsBe));
});

test('booleans', () => {
  expect(diff(false, true, optionsBe)).toBe(oldDiff(false, true, optionsBe));
});

describe('multiline string non-snapshot', () => {
  // For example, CLI output
  // toBe or toBe for a string isn’t enclosed in double quotes.
  const a = `Options:
--help, -h  Show help                            [boolean]
--bail, -b  Exit the test suite immediately upon the first
            failing test.                        [boolean]`;
  const b = `Options:
  --help, -h  Show help                            [boolean]
  --bail, -b  Exit the test suite immediately upon the first
              failing test.                        [boolean]`;

  test('(unexpanded)', () => {
    expect(diff(a, b, unexpandedBe)).toBe(oldDiff(a, b, unexpandedBe));
  });
  test('(expanded)', () => {
    expect(diff(a, b, expandedBe)).toBe(oldDiff(a, b, expandedBe));
  });
});

describe('multiline string snapshot', () => {
  // For example, CLI output
  // A snapshot of a string is enclosed in double quotes.
  const a = `"
Options:
--help, -h  Show help                            [boolean]
--bail, -b  Exit the test suite immediately upon the first
            failing test.                        [boolean]"`;
  const b = `"
Options:
  --help, -h  Show help                            [boolean]
  --bail, -b  Exit the test suite immediately upon the first
              failing test.                        [boolean]"`;

  test('(unexpanded)', () => {
    expect(diff(a, b, unexpandedBe)).toEqual(oldDiff(a, b, unexpandedBe));
  });
  test('(expanded)', () => {
    expect(diff(a, b, expandedBe)).toEqual(oldDiff(a, b, expandedBe));
  });
});

describe.skip('React elements', () => {
  const a = {
    $$typeof: elementSymbol,
    props: {
      children: 'Hello',
      className: 'fun',
    },
    type: 'div',
  };
  const b = {
    $$typeof: elementSymbol,
    props: {
      children: 'Goodbye',
      className: 'fun',
    },
    type: 'div',
  };

  test('(unexpanded)', () => {
    expect(diff(a, b, unexpandedBe)).toBe(oldDiff(a, b, unexpandedBe));
  });
  test('(expanded)', () => {
    expect(diff(a, b, expandedBe)).toBe(oldDiff(a, b, expandedBe));
  });
});

// This is expected to be different
describe.skip('multiline string as value of object property', () => {
  describe('(non-snapshot)', () => {
    const a = {
      id: 'J',
      points: '0.5,0.460\n0.25,0.875',
    };
    const b = {
      id: 'J',
      points: '0.5,0.460\n0.5,0.875\n0.25,0.875',
    };

    test('(unexpanded)', () => {
      expect(diff(a, b, unexpandedBe)).toBe(oldDiff(a, b, unexpandedBe));
    });
    test('(expanded)', () => {
      expect(diff(a, b, expandedBe)).toBe(oldDiff(a, b, unexpandedBe));
    });
  });
});

describe('color of text', () => {
  const searching = '';
  const object = {
    descending: false,
    fieldKey: 'what',
  };
  const a = {
    searching,
    sorting: object,
  };
  const b = {
    searching,
    sorting: {
      ...object,
      descending: true,
    },
  };
  const received = diff(a, b, expanded);
  test('(expanded)', () => {
    expect(received).toBe(oldDiff(a, b, expanded));
  });
  test('(unexpanded)', () => {
    // Expect same result, unless diff is long enough to require patch marks.
    expect(diff(a, b, unexpanded)).toBe(received);
  });
});

describe.skip('indentation in React elements (non-snapshot)', () => {
  const leaf = {
    $$typeof: elementSymbol,
    props: {
      children: ['text'],
    },
    type: 'span',
  };
  const a = {
    $$typeof: elementSymbol,
    props: {
      children: [leaf],
    },
    type: 'span',
  };
  const b = {
    $$typeof: elementSymbol,
    props: {
      children: [
        {
          $$typeof: elementSymbol,
          props: {
            children: [leaf],
          },
          type: 'strong',
        },
      ],
    },
    type: 'span',
  };

  describe('from less to more', () => {
    test('(unexpanded)', () => {
      expect(diff(a, b, unexpandedBe)).toBe(oldDiff(a, b, unexpandedBe));
    });
    test('(expanded)', () => {
      expect(diff(a, b, expandedBe)).toBe(oldDiff(a, b, expandedBe));
    });
  });

  describe('from more to less', () => {
    test('(unexpanded)', () => {
      expect(diff(a, b, unexpandedBe)).toBe(oldDiff(a, b, unexpandedBe));
    });
    test('(expanded)', () => {
      expect(diff(a, b, expandedBe)).toBe(oldDiff(a, b, expandedBe));
    });
  });
});

describe.skip('outer React element (non-snapshot)', () => {
  const a = {
    $$typeof: elementSymbol,
    props: {
      children: 'Jest',
    },
    type: 'h1',
  };
  const b = {
    $$typeof: elementSymbol,
    props: {
      children: [
        a,
        {
          $$typeof: elementSymbol,
          props: {
            children: 'Delightful JavaScript Testing',
          },
          type: 'h2',
        },
      ],
    },
    type: 'header',
  };

  describe('from less to more', () => {
    test('(unexpanded)', () => {
      expect(diff(a, b, unexpandedBe)).toBe(oldDiff(a, b, unexpandedBe));
    });
    test('(expanded)', () => {
      expect(diff(a, b, expandedBe)).toBe(oldDiff(a, b, expandedBe));
    });
  });

  describe('from more to less', () => {
    test('(unexpanded)', () => {
      expect(diff(b, a, unexpandedBe)).toBe(oldDiff(a, b, unexpandedBe));
    });
    test('(expanded)', () => {
      expect(diff(b, a, expandedBe)).toBe(oldDiff(a, b, expandedBe));
    });
  });
});

test.skip('collapses big diffs to patch format', () => {
  const arg1 = {test: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]};
  const arg2 = {test: [1, 2, 3, 4, 5, 6, 7, 8, 10, 9]};
  const result = diff(arg1, arg2, unexpanded);
  console.log(result);
  console.log(oldDiff(arg1, arg2, unexpanded));
  expect(result).toBe(oldDiff(arg1, arg2, unexpanded));
});

describe.skip('context', () => {
  const testDiffContextLines = (contextLines?: number) => {
    const validContextLines =
      typeof contextLines === 'number' &&
      Number.isSafeInteger(contextLines) &&
      contextLines >= 0;

    test(`number of lines: ${
      typeof contextLines === 'number' ? contextLines : 'undefined'
    } ${validContextLines ? '' : '(5 default)'}`, () => {
      const options = {
        ...optionsCounts,
        contextLines,
        expand: false,
      };
      if (!validContextLines) {
        options.patchColor = chalk.dim;
      }

      const arg1 = {test: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]};
      const arg2 = {test: [1, 2, 3, 4, 5, 6, 7, 8, 10, 9]};

      const result = diff(arg1, arg2, options);
      expect(result).toEqual(oldDiff(arg1, arg2, options));
    });
  };

  testDiffContextLines(-1); // (5 default)
  testDiffContextLines(0);
  testDiffContextLines(1);
  testDiffContextLines(2);
  testDiffContextLines(3.1); // (5 default)
  testDiffContextLines(); // (5 default)
});
// settings for anything arbitrary
const anythingSettings = {
  key: fc.oneof(fc.string(), fc.constantFrom('k1', 'k2', 'k3')),
  maxDepth: 2, // Limit object depth (default: 2)
  maxKeys: 5, // Limit number of keys per object (default: 5)
  // withBoxedValues: true,
  // Issue #7975 have to be fixed before enabling the generation of Map
  withMap: false,
  // Issue #7975 have to be fixed before enabling the generation of Set
  withSet: false,
};

const assertSettings = {
  numRuns: 1000,
};

// This will never pass but it's used now for finding some edge cases
describe.skip('property tests', () => {
  it('should be equivalent to old diff', () => {
    fc.assert(
      fc.property(
        fc.anything(anythingSettings),
        fc.anything(anythingSettings),
        (a, b) => {
          if (
            (a && Object.keys(a).length === 0) ||
            (a && Object.keys(b).length === 0)
          )
            return;
          try {
            expect(diff(a, b, unexpandedBe)).toBe(oldDiff(a, b, unexpandedBe));
          } catch (err) {
            console.log(diff(a, b, unexpandedBe));
            throw err;
          }
        },
      ),
      assertSettings,
    );
  });
});
