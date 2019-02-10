/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import diff from '../';

describe('invalid arg', () => {
  const isCommon = () => false;
  const foundSubsequence = () => {};

  describe('length', () => {
    test('is not a number', () => {
      expect(() => {
        diff('0' as any, 0, isCommon, foundSubsequence);
      }).toThrow(/aLength/);
    });
    test('Infinity is not a safe integer', () => {
      expect(() => {
        diff(Infinity, 0, isCommon, foundSubsequence);
      }).toThrow(/aLength/);
    });
    test('Not a Number is not a safe integer', () => {
      expect(() => {
        diff(NaN, 0, isCommon, foundSubsequence);
      }).toThrow(/aLength/);
    });

    test('MAX_SAFE_INTEGER + 1 is not a safe integer', () => {
      expect(() => {
        diff(0, Number.MAX_SAFE_INTEGER + 1, isCommon, foundSubsequence);
      }).toThrow(/bLength/);
    });
    test('MIN_SAFE_INTEGER - 1 is not a safe integer', () => {
      expect(() => {
        diff(0, Number.MIN_SAFE_INTEGER - 1, isCommon, foundSubsequence);
      }).toThrow(/bLength/);
    });
    test('is a negative integer', () => {
      expect(() => {
        diff(0, -1, isCommon, foundSubsequence);
      }).toThrow(/bLength/);
    });
  });

  describe('callback', () => {
    test('null is not a function', () => {
      expect(() => {
        diff(0, 0, null as any, foundSubsequence);
      }).toThrow(/isCommon/);
    });
    test('undefined is not a function', () => {
      expect(() => {
        diff(0, 0, isCommon, undefined as any);
      }).toThrow(/foundSubsequence/);
    });
  });
});

// Return length of longest common subsequence according to Object.is method.
const countCommonObjectIs = (a: Array<any>, b: Array<any>): number => {
  let n = 0;
  diff(
    a.length,
    b.length,
    (aIndex: number, bIndex: number) => Object.is(a[aIndex], b[bIndex]),
    (nCommon: number) => {
      n += nCommon;
    },
  );
  return n;
};

// Return length of longest common subsequence according to === operator.
const countCommonStrictEquality = (a: Array<any>, b: Array<any>): number => {
  let n = 0;
  diff(
    a.length,
    b.length,
    (aIndex: number, bIndex: number) => a[aIndex] === b[bIndex],
    (nCommon: number) => {
      n += nCommon;
    },
  );
  return n;
};

describe('input callback encapsulates comparison', () => {
  describe('zero and negative zero', () => {
    const a = [0];
    const b = [-0];

    test('are not common according to Object.is method', () => {
      expect(countCommonObjectIs(a, b)).toEqual(0);
    });
    test('are common according to === operator', () => {
      expect(countCommonStrictEquality(a, b)).toEqual(1);
    });
  });

  describe('Not a Number', () => {
    // input callback encapsulates identical sequences
    const a = [NaN];

    test('is common according to Object.is method', () => {
      expect(countCommonObjectIs(a, a)).toEqual(1);
    });
    test('is not common according to === operator', () => {
      expect(countCommonStrictEquality(a, a)).toEqual(0);
    });
  });
});

const assertMin = (name: string, val: number, min: number) => {
  if (val < min) {
    throw new RangeError(`${name} value ${val} is less than min ${min}`);
  }
};

const assertMax = (name: string, val: number, max: number) => {
  if (max < val) {
    throw new RangeError(`${name} value ${val} is greater than max ${max}`);
  }
};

const assertEnd = (name: string, val: number, end: number) => {
  if (end <= val) {
    throw new RangeError(`${name} value ${val} is not less than end ${end}`);
  }
};

const assertCommonItems = (
  a: Array<any> | string,
  b: Array<any> | string,
  nCommon: number,
  aCommon: number,
  bCommon: number,
) => {
  for (; nCommon !== 0; nCommon -= 1, aCommon += 1, bCommon += 1) {
    if (a[aCommon] !== b[bCommon]) {
      throw new Error(
        `output item is not common for aCommon=${aCommon} and bCommon=${bCommon}`,
      );
    }
  }
};

// Given lengths of sequences and input function to compare items at indexes,
// return number of differences according to baseline greedy forward algorithm.
const countDifferences = (
  aLength: number,
  bLength: number,
  isCommon,
): number => {
  const dMax = aLength + bLength;
  const aIndexes = [-1]; // initialize for aLast + 1 in loop when d = 0

  for (let d = 0; d <= dMax; d += 1) {
    let aIndexPrev1 = 0; // that is, not yet set

    for (let iF = 0, kF = -d; iF <= d; iF += 1, kF += 2) {
      const aFirst =
        iF === 0 || (iF !== d && aIndexPrev1 < aIndexes[iF])
          ? aIndexes[iF] // vertical to insert from b
          : aIndexPrev1 + 1; // horizontal to delete from a

      // To get last point of path segment, move along diagonal of common items.
      let aLast = aFirst;
      let bLast = aFirst - kF;
      while (
        aLast + 1 < aLength &&
        bLast + 1 < bLength &&
        isCommon(aLast + 1, bLast + 1)
      ) {
        aLast += 1;
        bLast += 1;
      }

      aIndexPrev1 = aIndexes[iF];
      aIndexes[iF] = aLast;

      if (aLast === aLength - 1 && bLast === bLength - 1) {
        return d;
      }
    }
  }
  throw new Error(`countDifferences did not return a number`);
};

// Return array of items in a longest common subsequence of array-like objects.
const findCommonItems = (
  a: Array<any> | string,
  b: Array<any> | string,
): Array<any> => {
  const aLength = a.length;
  const bLength = b.length;
  const isCommon = (aIndex: number, bIndex: number) => {
    assertMin('input aIndex', aIndex, 0);
    assertEnd('input aIndex', aIndex, aLength);
    assertMin('input bIndex', bIndex, 0);
    assertEnd('input bIndex', bIndex, bLength);
    return a[aIndex] === b[bIndex];
  };

  const array = [];
  diff(
    aLength,
    bLength,
    isCommon,
    (nCommon: number, aCommon: number, bCommon: number) => {
      assertMin('output nCommon', nCommon, 1);
      assertMin('output aCommon', aCommon, 0);
      assertMax('output aCommon + nCommon', aCommon + nCommon, aLength);
      assertMin('output bCommon', bCommon, 0);
      assertMax('output bCommon + nCommon', bCommon + nCommon, bLength);
      assertCommonItems(a, b, nCommon, aCommon, bCommon);
      for (; nCommon !== 0; nCommon -= 1, aCommon += 1) {
        array.push(a[aCommon]);
      }
    },
  );

  const nDifferences = countDifferences(aLength, bLength, isCommon);
  expect(aLength + bLength - 2 * array.length).toBe(nDifferences);

  return array;
};

// Assert that array-like objects have the expected common items.
const expectCommonItems = (
  a: Array<any> | string,
  b: Array<any> | string,
  expected: Array<any>,
) => {
  expect(findCommonItems(a, b)).toEqual(expected);

  if (a.length !== b.length) {
    // If sequences a and b have different lengths,
    // then if you swap sequences in your callback functions,
    // this package finds the same items.
    expect(findCommonItems(b, a)).toEqual(expected);
  }
};

describe('input callback encapsulates sequences', () => {
  // Example sequences in “edit graph” analogy from
  // An O(ND) Difference Algorithm and Its Variations by Eugene W. Myers
  const a = ['a', 'b', 'c', 'a', 'b', 'b', 'a'];
  const b = ['c', 'b', 'a', 'b', 'a', 'c'];

  // Because a and b have more than one longest common subsequence,
  // expected value might change if implementation changes.
  // For example, Myers paper shows: ['c', 'a', 'b', 'a']
  const expected = ['c', 'b', 'b', 'a'];

  test('arrays of strings', () => {
    expectCommonItems(a, b, expected);
  });
  test('string and array of strings', () => {
    expectCommonItems(a.join(''), b, expected);
  });
  test('strings', () => {
    expectCommonItems(a.join(''), b.join(''), expected);
  });
});

describe('no common items', () => {
  // default export does not call findSubsequences nor divide

  describe('negative zero is equivalent to zero for length', () => {
    const countItemsNegativeZero = (aLength, bLength) => {
      let n = 0;
      diff(
        aLength,
        bLength,
        () => {
          throw new Error('input function should not have been called');
        },
        nCommon => {
          n += nCommon;
        },
      );
      return n;
    };

    test('of a', () => {
      expect(countItemsNegativeZero(-0, 1)).toEqual(0);
    });
    test('of b', () => {
      expect(countItemsNegativeZero(1, -0)).toEqual(0);
    });
    test('of a and b', () => {
      expect(countItemsNegativeZero(-0, -0)).toEqual(0);
    });
  });

  test('a empty and b empty', () => {
    const a = [];
    const b = [];
    const expected = [];
    expectCommonItems(a, b, expected);
  });
  test('a empty and b non-empty', () => {
    const a = [];
    const b = [false];
    const expected = [];
    expectCommonItems(a, b, expected);
  });
  test('a non-empty and b empty', () => {
    const a = [false, true];
    const b = [];
    const expected = [];
    expectCommonItems(a, b, expected);
  });

  // default export does call findSubsequences and divide
  describe('a non-empty and b non-empty', () => {
    test('baDeltaLength 0 even', () => {
      // findSubsequences not transposed because graph is square
      // reverse path overlaps on first iteration with d === 1
      // last segment cannot have a prev segment
      const a = [false];
      const b = [true];
      const expected = [];
      expectCommonItems(a, b, expected);
    });
    test('baDeltaLength 1 odd', () => {
      // findSubsequences transposed because graph has landscape orientation
      // forward path overlaps on first iteration with d === 2
      // last segment has a prev segment because unroll a half iteration
      const a = [0, 1];
      const b = ['0'];
      const expected = [];
      expectCommonItems(a, b, expected);
    });
    test('baDeltaLength 2 even', () => {
      // findSubsequences transposed because graph has landscape orientation
      // reverse path overlaps with d === 3
      // last segment has a prev segment
      const a = [0, 1, 2, 3];
      const b = ['0', '1'];
      const expected = [];
      expectCommonItems(a, b, expected);
    });
    test('baDeltaLength 7 odd', () => {
      // findSubsequences not transposed because graph has portrait orientation
      // forward path overlaps with d === 7
      // last segment has a prev segment
      const a = ['0', '1', '2'];
      const b = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const expected = [];
      expectCommonItems(a, b, expected);
    });
  });
});

describe('only common items', () => {
  // input callback encapsulates identical sequences
  // default export trims common items from the start
  // default export does not call findSubsequences nor divide
  test('length 1', () => {
    const a = [false];
    expectCommonItems(a, a, a);
  });
  test('length 2', () => {
    const a = [false, true];
    expectCommonItems(a, a, a);
  });
});

describe('all common items outside', () => {
  const common1 = 'common1';
  const common2 = 'common2';
  const common3 = 'common3';

  // default export does not call findSubsequences nor divide
  test('preceding changes', () => {
    // default export trims common item from the start
    const a = [common1];
    const b = [common1, 'insert1', 'insert2'];
    const expected = [common1];
    expectCommonItems(a, b, expected);
  });
  test('following change', () => {
    // default export trims common items from the end
    const a = ['delete1', common1, common2];
    const b = [common1, common2];
    const expected = [common1, common2];
    expectCommonItems(a, b, expected);
  });
  test('preceding and following changes in one sequence', () => {
    // default export trims common items from the start and end
    const a = [common1, common2, 'delete1', 'delete2', common3];
    const b = [common1, common2, common3];
    const expected = [common1, common2, common3];
    expectCommonItems(a, b, expected);
  });
});

describe('some common items inside and outside', () => {
  const common1 = 'common1';
  const common2 = 'common2';

  // default export does call findSubsequences and divide
  test('preceding changes adjacent to common in both sequences', () => {
    // default export trims common item from the start
    // baDeltaLength 0 even
    // common item follows last (only) reverse segment when d === 1
    const a = [common1, common2, 'delete1_lastR'];
    const b = [common1, 'insert1', common2];
    const expected = [common1, common2];
    expectCommonItems(a, b, expected);
  });
  test('following changes adjacent to common in both sequences', () => {
    // default export trims common item from the end
    // baDeltaLength 1 odd
    // common item follows prev (but not last) forward segment when d === 2
    const a = [common1, 'delete1', common2];
    const b = ['insert1_prevF', common1, 'insert2_lastF', common2];
    const expected = [common1, common2];
    expectCommonItems(a, b, expected);
  });
});

describe('all common items inside non-recursive', () => {
  // The index intervals preceding and following the middle change
  // contain only changes, therefore they cannot contain any common items.
  const common1 = 'common1';
  const common2 = 'common2';
  const common3 = 'common3';

  test('move from start to end relative to change', () => {
    // baDeltaLength 0 even
    // common items follow last (only) reverse segment when d === 1
    const a = [common1, common2, 'delete1'];
    const b = ['insert1', common1, common2];
    const expected = [common1, common2];
    expectCommonItems(a, b, expected);
  });
  test('move from start to end relative to common', () => {
    // baDeltaLength 0 even
    // common items follow last (only) reverse segment when d === 1
    const a = [common1, common2, common3];
    const b = [common3, common1, common2];
    // common3 is delete from a and insert from b
    const expected = [common1, common2];
    expectCommonItems(a, b, expected);
  });
  test('move from start to end relative to change and common', () => {
    // baDeltaLength 0 even
    // common items follow last reverse segment when d === 3
    const a = [common1, common2, 'delete1_lastR', common3, 'delete2'];
    const b = ['insert1', common3, 'insert2', common1, common2];
    // common3 is delete from a and insert from b
    const expected = [common1, common2];
    expectCommonItems(a, b, expected);
  });
  test('reverse relative to change', () => {
    // baDeltaLength 0 even
    // common item follows last reverse segment when d === 4
    const a = [common1, 'delete1', common2, 'delete2', common3];
    const b = [common3, 'insert1_lastR', common2, 'insert2', common1];

    // Because a and b have more than one longest common subsequence,
    // expected value might change if implementation changes.
    // common1 and common2 are delete from a and insert from b
    const expected = [common3];
    expectCommonItems(a, b, expected);
  });

  test('preceding middle', () => {
    // baDeltaLength 1 odd
    // common items follow prev and last forward segments when d === 3
    const a = ['delete1', common1, common2, common3, 'delete2'];
    const b = [
      'insert1_prevF',
      common1,
      'insert2_lastF',
      common2,
      common3,
      'insert3',
    ];
    const expected = [common1, common2, common3];
    expectCommonItems(a, b, expected);
  });
  test('following middle', () => {
    // baDeltaLength 2 even
    // common items follow prev and last reverse segments when d === 4
    const a = ['delete1', 'delete2', common1, common2, common3, 'delete3'];
    const b = [
      'insert1',
      'insert2',
      common1,
      common2,
      'insert3_lastR',
      common3,
      'insert4_prevR',
      'insert5',
    ];
    const expected = [common1, common2, common3];
    expectCommonItems(a, b, expected);
  });
});

describe('all common items inside recursive', () => {
  // Because a and b have only one longest common subsequence,
  // expected value cannot change if implementation changes.
  const common1 = 'common1';
  const common2 = 'common2';
  const common3 = 'common3';
  const common4 = 'common4';
  const common5 = 'common5';
  const common6 = 'common6';

  test('prev reverse at depth 1 and preceding at depth 2', () => {
    // depth 1 common item follows prev reverse segment when d === 3
    // depth 2 preceding common items follow prev and last forward segments when d === 2
    const a = [
      'delete1_depth2_preceding_prevF',
      common1,
      common2,
      common3,
      'delete2_depth1_prevR',
      'delete3',
    ];
    const b = [
      common1,
      'insert1_depth2_preceding_lastF',
      common2,
      'insert2',
      'insert3_depth1_lastR',
      common3,
    ];
    const expected = [common1, common2, common3];
    expectCommonItems(a, b, expected);
  });
  test('last forward at depth 1 and following at depth 2', () => {
    // depth 1 common item follows last forward segment when d === 5
    // depth 2 following common items follow prev and last reverse segments when d === 2
    const a = [
      'delete1',
      'delete2',
      common1,
      'delete3',
      common2,
      'delete4_depth2_following_lastR',
      common3,
    ];
    const b = [
      'insert1',
      'insert2',
      'insert3_depth1_lastF',
      common1,
      'insert4',
      common2,
      common3,
      'insert5_depth2_following_prevR',
    ];
    const expected = [common1, common2, common3];
    expectCommonItems(a, b, expected);
  });
  test('preceding at depth 2 and both at depth 3 of following', () => {
    // depth 1 transposed from landscape to portrait so swap args
    // depth 1 common items do not follow prev nor last forward segment when d === 8
    // depth 2 preceding common item follows prev forward segment when d === 4
    // depth 2 following transposed again so unswap swapped args
    // depth 2 following common items do not follow prev nor last foward segment when d === 4
    // depth 3 preceding common item follows last forward segment when d === 2
    // depth 3 following rransposed again so swap args again
    // depth 3 following common item follows last forward segment when d === 2
    const a = [
      'delete1_depth2_preceding_prevF',
      common1,
      'delete2_depth2_preceding_middle',
      'delete3',
      'delete4',
      'delete5_depth1_middle',
      common2,
      'delete6',
      'delete7',
      'delete8_depth3_following_lastF',
      common3,
    ];
    const b = [
      'insert1',
      'insert2',
      common1,
      'insert3',
      'insert4',
      'insert5_depth3_preceding_lastF',
      common2,
      'insert6_depth2_following_middle',
      common3,
      'insert7',
    ];
    const expected = [common1, common2, common3];
    expectCommonItems(a, b, expected);
  });

  test('interleaved single change', () => {
    // depth 1 common items follow prev and last forward segment when d === 4
    // depth 2 preceding common items follow prev and last forward segment when d === 2
    // depth 2 following common items follow prev and last forward segment when d === 2
    const a = [common1, common2, common3, common4, common5, common6];
    const b = [
      'insert1_depth_2_preceding_prevF',
      common1,
      'insert2_depth2_preceding_lastF',
      common2,
      'insert3_depth1_prevF',
      common3,
      'insert4_depth1_lastF',
      common4,
      'insert5_depth2_following_prevF',
      common5,
      'insert6_depth2_following_lastF',
      common6,
      'insert7',
    ];
    const expected = [common1, common2, common3, common4, common5, common6];
    expectCommonItems(a, b, expected);
  });
  test('interleaved double changes', () => {
    // depth 1 common item follows prev reverse segment when d === 7
    // depth 2 preceding transposed from landscape to portrait so swap args
    // depth 2 preceding common item follows last forward segment when d === 4
    // depth 3 preceding transposed again so unswap swapped args
    // depth 3 preceding preceding common item follows last forward segment when d === 2
    // depth 2 following common item follows prev reverse segment when d === 3
    // depth 3 following preceding transposed
    // depth 3 following preceding common item follows last forward segment when d === 2
    const a = [
      'delete1',
      common1,
      'delete2_depth2_preceding_lastF',
      common2,
      'delete3_depth3_preceding_following_lastF',
      common3,
      'delete4',
      common4,
      'delete5_depth3_following_preceding_lastF',
      common5,
      'delete6',
      common6,
      'delete7',
    ];
    const b = [
      'insert1_depth3_preceding_preceding_lastF',
      common1,
      'insert2',
      common2,
      'insert3',
      common3,
      'insert4_depth1_middle',
      common4,
      'insert5_depth1_prevR',
      common5,
      'insert6',
      common6,
      'insert7_depth2_following_prevR',
    ];
    const expected = [common1, common2, common3, common4, common5, common6];
    expectCommonItems(a, b, expected);
  });

  test('optimization decreases iMaxF', () => {
    // iMaxF 3 initially because aLength
    // iMaxF 1 at d === 4
    // depth 1 common items do not follow prev nor last forward segment when d === 5
    // depth 2 preceding common item follows last forward segment when d === 3
    // depth 3 preceding preceding common item follows last (only) reverse segment when d === 1
    const a = [common1, 'delete1_depth3_lastR', common2];
    const b = [
      'insert1',
      common1,
      'insert2_depth2_lastF',
      common2,
      'insert3',
      'insert4',
      'insert5',
      'insert6',
      'insert7',
      'insert8',
      'insert9',
    ];
    const expected = [common1, common2];
    expectCommonItems(a, b, expected);
  });
  test('optimization decreases iMaxR', () => {
    // iMaxF 3 initially because aLength
    // iMaxR 0 at d === 2
    // depth 1 common items do not follow prev nor last forward segment when d === 5
    // depth 2 following common items follow prev reverse segment when d === 2
    const a = [common1, common2];
    const b = [
      'insert1',
      'insert2',
      'insert3',
      'insert4',
      'insert5_depth1_middle',
      'insert6',
      'insert7',
      'insert8_depth2_middle',
      common1,
      common2,
      'insert9_depth2_prevR',
    ];
    const expected = [common1, common2];
    expectCommonItems(a, b, expected);
  });
});

const assertCommonSubstring = (
  a: string,
  b: string,
  nCommon: number,
  aCommon: number,
  bCommon: number,
) => {
  const aSubstring = a.slice(aCommon, aCommon + nCommon);
  const bSubstring = b.slice(bCommon, bCommon + nCommon);
  if (aSubstring !== bSubstring) {
    throw new Error(
      `output substrings ${aSubstring} and ${bSubstring} are not common for nCommon=${nCommon} aCommon=${aCommon} bCommon=${bCommon}`,
    );
  }
};

// Return array of substrings in a longest common subsequence of strings.
const findCommonSubstrings = (a: string, b: string): Array<string> => {
  const array = [];
  diff(
    a.length,
    b.length,
    (aIndex: number, bIndex: number) => {
      assertMin('input aIndex', aIndex, 0);
      assertEnd('input aIndex', aIndex, a.length);
      assertMin('input bIndex', bIndex, 0);
      assertEnd('input bIndex', bIndex, b.length);
      return a[aIndex] === b[bIndex];
    },
    (nCommon: number, aCommon: number, bCommon: number) => {
      assertMin('output nCommon', nCommon, 1);
      assertMin('output aCommon', aCommon, 0);
      assertMax('output aCommon + nCommon', aCommon + nCommon, a.length);
      assertMin('output bCommon', bCommon, 0);
      assertMax('output bCommon + nCommon', bCommon + nCommon, b.length);
      assertCommonSubstring(a, b, nCommon, aCommon, bCommon);
      array.push(a.slice(aCommon, aCommon + nCommon));
    },
  );
  return array;
};

describe('common substrings', () => {
  // Find changed and unchanged substrings within adjacent changed lines
  // in expected and received values after a test fails in Jest.
  test('progress', () => {
    // Confirm expected progress. If change is correct, then update test.
    // A property value changes from an object to an array of objects.
    // prettier-ignore
    const a = [
      '"sorting": Object {',
      '"ascending": true,',
    ].join('\n');
    // prettier-ignore
    const b = [
      '"sorting": Array [',
      'Object {',
      '"descending": false,',
    ].join('\n');
    const expected = ['"sorting": ', 'Object {\n"', 'scending": ', 'e,'];
    const abCommonSubstrings = findCommonSubstrings(a, b);
    const baCommonSubstrings = findCommonSubstrings(b, a);
    expect(abCommonSubstrings).toEqual(baCommonSubstrings);
    expect(abCommonSubstrings).toEqual(expected);
  });
  test('regression', () => {
    // Prevent unexpected regression. If change is incorrect, then fix code.
    // Internationalization fails for a text node.
    // English translation and French quotation by Antoine de Saint Exupéry:
    const a = `It seems that perfection is attained not when there is nothing more to add, but when there is nothing more to remove.`;
    const b = `Il semble que la perfection soit atteinte non quand il n'y a plus rien à ajouter, mais quand il n'y a plus rien à retrancher.`;
    const abCommonSubstrings = findCommonSubstrings(a, b);
    const baCommonSubstrings = findCommonSubstrings(b, a);
    expect(abCommonSubstrings).toEqual(baCommonSubstrings);
    expect(abCommonSubstrings).toMatchSnapshot();
  });
  test('wrapping', () => {
    const a = [
      'When engineers are provided with ready-to-use tools, they end up writing more',
      'tests, which in turn results in more stable code bases.',
    ].join('\n');
    const b = [
      'When engineers have ready-to-use tools, they write more tests, which results in',
      'more stable and healthy code bases.',
    ].join('\n');
    const abCommonSubstrings = findCommonSubstrings(a, b);
    const baCommonSubstrings = findCommonSubstrings(b, a);
    expect(abCommonSubstrings).toEqual(baCommonSubstrings);
    expect(abCommonSubstrings).toMatchSnapshot();
  });
});
