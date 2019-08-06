/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import each from '../';

const noop = () => {};
const expectFunction = expect.any(Function);

const get = (object, lensPath) =>
  lensPath.reduce((acc, key) => acc[key], object);

const getGlobalTestMocks = () => {
  const globals: any = {
    describe: jest.fn(),
    fdescribe: jest.fn(),
    fit: jest.fn(),
    it: jest.fn(),
    test: jest.fn(),
    xdescribe: jest.fn(),
    xit: jest.fn(),
    xtest: jest.fn(),
  };
  globals.test.only = jest.fn();
  globals.test.skip = jest.fn();
  globals.it.only = jest.fn();
  globals.it.skip = jest.fn();
  globals.describe.only = jest.fn();
  globals.describe.skip = jest.fn();
  return globals;
};

describe('jest-each', () => {
  [
    ['test'],
    ['test', 'only'],
    ['it'],
    ['fit'],
    ['it', 'only'],
    ['describe'],
    ['fdescribe'],
    ['describe', 'only'],
  ].forEach(keyPath => {
    describe(`.${keyPath.join('.')}`, () => {
      test('throws error when there are no arguments for given headings', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          a    | b    | expected
        `;
        const testFunction = get(eachObject, keyPath);
        const testCallBack = jest.fn();
        testFunction('this will blow up :(', testCallBack);

        const globalMock = get(globalTestMocks, keyPath);

        expect(() =>
          globalMock.mock.calls[0][1](),
        ).toThrowErrorMatchingSnapshot();
        expect(testCallBack).not.toHaveBeenCalled();
      });

      test('throws error when there are fewer arguments than headings when given one row', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          a    | b    | expected
          ${0} | ${1} |
        `;
        const testFunction = get(eachObject, keyPath);
        const testCallBack = jest.fn();
        testFunction('this will blow up :(', testCallBack);

        const globalMock = get(globalTestMocks, keyPath);

        expect(() =>
          globalMock.mock.calls[0][1](),
        ).toThrowErrorMatchingSnapshot();
        expect(testCallBack).not.toHaveBeenCalled();
      });

      test('throws error when there are fewer arguments than headings over multiple rows', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          a    | b    | expected
          ${0} | ${1} | ${1}
          ${1} | ${1} |
        `;
        const testFunction = get(eachObject, keyPath);
        const testCallBack = jest.fn();
        testFunction('this will blow up :(', testCallBack);

        const globalMock = get(globalTestMocks, keyPath);

        expect(() =>
          globalMock.mock.calls[0][1](),
        ).toThrowErrorMatchingSnapshot();
        expect(testCallBack).not.toHaveBeenCalled();
      });

      test('throws error when headings are missing', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          ${0} | ${1} | ${1}
        `;
        const testFunction = get(eachObject, keyPath);
        const testCallBack = jest.fn();
        testFunction('this will blow up :(', testCallBack);

        const globalMock = get(globalTestMocks, keyPath);

        expect(() =>
          globalMock.mock.calls[0][1](),
        ).toThrowErrorMatchingSnapshot();
        expect(testCallBack).not.toHaveBeenCalled();
      });

      test('throws an error when called with an empty string', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`   `;
        const testFunction = get(eachObject, keyPath);
        const testCallBack = jest.fn();
        testFunction('this will blow up :(', testCallBack);

        const globalMock = get(globalTestMocks, keyPath);

        expect(() =>
          globalMock.mock.calls[0][1](),
        ).toThrowErrorMatchingSnapshot();
        expect(testCallBack).not.toHaveBeenCalled();
      });

      test('calls global with given title', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          a    | b    | expected
          ${0} | ${1} | ${1}
        `;
        const testFunction = get(eachObject, keyPath);
        testFunction('expected string', noop);

        const globalMock = get(globalTestMocks, keyPath);
        expect(globalMock).toHaveBeenCalledTimes(1);
        expect(globalMock).toHaveBeenCalledWith(
          'expected string',
          expectFunction,
          undefined,
        );
      });

      test('calls multiple with single heading', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          a
          ${0}
          ${1}
          ${2}
        `;
        const testFunction = get(eachObject, keyPath);
        testFunction('expected: a=$a', noop);

        const globalMock = get(globalTestMocks, keyPath);
        expect(globalMock.mock.calls).toEqual([
          ['expected: a=0', expectFunction, undefined],
          ['expected: a=1', expectFunction, undefined],
          ['expected: a=2', expectFunction, undefined],
        ]);
      });

      test('calls global with given title when multiple tests cases exist', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          a    | b    | expected
          ${0} | ${1} | ${1}
          ${1} | ${1} | ${2}
        `;
        const testFunction = get(eachObject, keyPath);
        testFunction('expected string', noop);

        const globalMock = get(globalTestMocks, keyPath);
        expect(globalMock).toHaveBeenCalledTimes(2);
        expect(globalMock).toHaveBeenCalledWith(
          'expected string',
          expectFunction,
          undefined,
        );
        expect(globalMock).toHaveBeenCalledWith(
          'expected string',
          expectFunction,
          undefined,
        );
      });

      test('calls global with title containing param values when using $variable format', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          a    | b    | expected
          ${0} | ${1} | ${1}
          ${1} | ${1} | ${2}
        `;
        const testFunction = get(eachObject, keyPath);
        testFunction('expected string: a=$a, b=$b, expected=$expected', noop);

        const globalMock = get(globalTestMocks, keyPath);
        expect(globalMock).toHaveBeenCalledTimes(2);
        expect(globalMock).toHaveBeenCalledWith(
          'expected string: a=0, b=1, expected=1',
          expectFunction,
          undefined,
        );
        expect(globalMock).toHaveBeenCalledWith(
          'expected string: a=1, b=1, expected=2',
          expectFunction,
          undefined,
        );
      });

      test('calls global with title containing $key in multiple positions', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          a    | b    | expected
          ${0} | ${1} | ${1}
          ${1} | ${1} | ${2}
        `;
        const testFunction = get(eachObject, keyPath);
        testFunction(
          'add($a, $b) expected string: a=$a, b=$b, expected=$expected',
          noop,
        );

        const globalMock = get(globalTestMocks, keyPath);
        expect(globalMock).toHaveBeenCalledTimes(2);
        expect(globalMock).toHaveBeenCalledWith(
          'add(0, 1) expected string: a=0, b=1, expected=1',
          expectFunction,
          undefined,
        );
        expect(globalMock).toHaveBeenCalledWith(
          'add(1, 1) expected string: a=1, b=1, expected=2',
          expectFunction,
          undefined,
        );
      });

      test('calls global with title containing $key.path', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          a
          ${{foo: {bar: 'baz'}}}
        `;
        const testFunction = get(eachObject, keyPath);
        testFunction('interpolates object keyPath to value: $a.foo.bar', noop);

        const globalMock = get(globalTestMocks, keyPath);
        expect(globalMock).toHaveBeenCalledTimes(1);
        expect(globalMock).toHaveBeenCalledWith(
          'interpolates object keyPath to value: baz',
          expectFunction,
          undefined,
        );
      });

      test('calls global with title containing last seen object when $key.path is invalid', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          a
          ${{foo: {bar: 'baz'}}}
        `;
        const testFunction = get(eachObject, keyPath);
        testFunction('interpolates object keyPath to value: $a.foo.qux', noop);

        const globalMock = get(globalTestMocks, keyPath);
        expect(globalMock).toHaveBeenCalledTimes(1);
        expect(globalMock).toHaveBeenCalledWith(
          'interpolates object keyPath to value: {"bar": "baz"}',
          expectFunction,
          undefined,
        );
      });

      test('calls global with cb function with object built from table headings and values', () => {
        const globalTestMocks = getGlobalTestMocks();
        const testCallBack = jest.fn();
        const eachObject = each.withGlobal(globalTestMocks)`
          a    | b    | expected
          ${0} | ${1} | ${1}
          ${1} | ${1} | ${2}
        `;
        const testFunction = get(eachObject, keyPath);
        testFunction('expected string', testCallBack);

        const globalMock = get(globalTestMocks, keyPath);

        globalMock.mock.calls[0][1]();
        expect(testCallBack).toHaveBeenCalledTimes(1);
        expect(testCallBack).toHaveBeenCalledWith({a: 0, b: 1, expected: 1});

        globalMock.mock.calls[1][1]();
        expect(testCallBack).toHaveBeenCalledTimes(2);
        expect(testCallBack).toHaveBeenCalledWith({a: 1, b: 1, expected: 2});
      });

      test('calls global with given timeout', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          a    | b    | expected
          ${0} | ${1} | ${1}
        `;

        const testFunction = get(eachObject, keyPath);
        testFunction('some test', noop, 10000);
        const globalMock = get(globalTestMocks, keyPath);
        expect(globalMock).toHaveBeenCalledWith(
          'some test',
          expect.any(Function),
          10000,
        );
      });

      test('formats primitive values using .toString()', () => {
        const globalTestMocks = getGlobalTestMocks();
        const number = 1;
        const string = 'hello';
        const boolean = true;
        const symbol = Symbol('world');
        const nullValue = null;
        const undefinedValue = undefined;
        const eachObject = each.withGlobal(globalTestMocks)`
          number | string | boolean | symbol | nullValue | undefinedValue
          ${number} | ${string} | ${boolean} | ${symbol} | ${nullValue} | ${undefinedValue}
        `;

        const testFunction = get(eachObject, keyPath);
        testFunction(
          'number: $number | string: $string | boolean: $boolean | symbol: $symbol | null: $nullValue | undefined: $undefinedValue',
          noop,
        );
        const globalMock = get(globalTestMocks, keyPath);
        expect(globalMock).toHaveBeenCalledWith(
          'number: 1 | string: hello | boolean: true | symbol: Symbol(world) | null: null | undefined: undefined',
          expect.any(Function),
          undefined,
        );
      });

      describe('comments', () => {
        test('removes commented out tests and allow spaces between', () => {
          const globalTestMocks = getGlobalTestMocks();
          const eachObject = each.withGlobal(globalTestMocks)`
          a    | b    | expected // is ignored

          /* first section */
          /* ${5} | ${5} | ${0} */
          ${1} | ${1} | ${2} /* stuff at end */
          /* ${5} | ${5} | ${1} /* ignores third comment */ */
          
          /* ${5} | ${5} | ${2} /* multi-line comments */
          ${5} | ${5} | ${3}
          ${5} | ${5} | ${4} */
          


          // second section
          // ${5} | ${5} | ${5} // ignored
          ${2} | ${2} | ${4} // ignore trailing
        `;
          const testFunction = get(eachObject, keyPath);
          testFunction('expected string: a=$a, b=$b, expected=$expected', noop);

          const globalMock = get(globalTestMocks, keyPath);
          expect(globalMock.mock.calls).toEqual([
            [
              'expected string: a=1, b=1, expected=2',
              expect.any(Function),
              undefined,
            ],
            [
              'expected string: a=2, b=2, expected=4',
              expect.any(Function),
              undefined,
            ],
          ]);
        });

        test('removes comments with windows new line characters "\\r\\n"', () => {
          const globalTestMocks = getGlobalTestMocks();
          const eachObject = each.withGlobal(
            globalTestMocks,
          )`\r\na    | b    | expected\r\n// ${1} | ${1} | ${0}\r\n${1} | ${1} | ${2}\r\n/* ${1} | ${1} | ${5} */\r\n${2} | ${2} | ${4}\r\n`;
          const testFunction = get(eachObject, keyPath);
          testFunction('expected string: a=$a, b=$b, expected=$expected', noop);

          const globalMock = get(globalTestMocks, keyPath);
          expect(globalMock.mock.calls).toEqual([
            [
              'expected string: a=1, b=1, expected=2',
              expect.any(Function),
              undefined,
            ],
            [
              'expected string: a=2, b=2, expected=4',
              expect.any(Function),
              undefined,
            ],
          ]);
        });

        test('comments with single header', () => {
          const globalTestMocks = getGlobalTestMocks();
          const eachObject = each.withGlobal(globalTestMocks)`
          a // ignore trailing

          /* first section */
          /* ${0} */
          ${1} /* ignore trailing */
          
          ${2} // ignore end
          // second section
          // ${3}
          ${4}
        `;
          const testFunction = get(eachObject, keyPath);
          testFunction('expected: a=$a', noop);

          const globalMock = get(globalTestMocks, keyPath);
          expect(globalMock.mock.calls).toEqual([
            ['expected: a=1', expect.any(Function), undefined],
            ['expected: a=2', expect.any(Function), undefined],
            ['expected: a=4', expect.any(Function), undefined],
          ]);
        });

        test('various comment patterns', () => {
          const globalTestMocks = getGlobalTestMocks();
          const eachObject = each.withGlobal(globalTestMocks)`
            /* upper */
            /*
              //
              /* // second */
              /* third // */
              /* ignore */
              / * / * /
            */
            
            a | b | /* inline */ | expected
            // first section ||/* end
            
            ${1} | ${1} /*line ignore*/| ${2} // ignore
            //|| ${0} | ${0} | ${1}
            /*||*/ ${2} |/* inline */ ${2} | ${4}
            ${3} | ${3} | ${6}
          `;

          const testFunction = get(eachObject, keyPath);
          testFunction('expected string: a=$a, b=$b, expected=$expected', noop);

          const globalMock = get(globalTestMocks, keyPath);
          expect(globalMock.mock.calls).toEqual([
            [
              'expected string: a=1, b=1, expected=2',
              expect.any(Function),
              undefined,
            ],
            [
              'expected string: a=2, b=2, expected=4',
              expect.any(Function),
              undefined,
            ],
            [
              'expected string: a=3, b=3, expected=6',
              expect.any(Function),
              undefined,
            ],
          ]);
        });

        test('throws error part of data is commented out', () => {
          const globalTestMocks = getGlobalTestMocks();
          const eachObject = each.withGlobal(globalTestMocks)`
          a    | b  | expected
          ${0} | // ${1} | ${1}
        `;
          const testFunction = get(eachObject, keyPath);
          const testCallBack = jest.fn();
          testFunction('this will blow up :(', testCallBack);

          const globalMock = get(globalTestMocks, keyPath);

          expect(() =>
            globalMock.mock.calls[0][1](),
          ).toThrowErrorMatchingSnapshot();
          expect(testCallBack).not.toHaveBeenCalled();
        });

        test('throws syntax error when closing multiline comment was never opened', () => {
          const globalTestMocks = getGlobalTestMocks();
          const eachObject = each.withGlobal(globalTestMocks)`
          a    | b  | expected */
          ${0} | ${1} | ${1}
        `;
          const testFunction = get(eachObject, keyPath);
          const testCallBack = jest.fn();
          testFunction('this will blow up :(', testCallBack);

          const globalMock = get(globalTestMocks, keyPath);

          expect(() =>
            globalMock.mock.calls[0][1](),
          ).toThrowErrorMatchingSnapshot();
          expect(testCallBack).not.toHaveBeenCalled();
        });

        test('throws syntax error when closing multiline comment was never closed', () => {
          const globalTestMocks = getGlobalTestMocks();
          const eachObject = each.withGlobal(globalTestMocks)`
          a    | b  | expected
          ${0} | ${1} | ${1} /*
        `;
          const testFunction = get(eachObject, keyPath);
          const testCallBack = jest.fn();
          testFunction('this will blow up :(', testCallBack);

          const globalMock = get(globalTestMocks, keyPath);

          expect(() =>
            globalMock.mock.calls[0][1](),
          ).toThrowErrorMatchingSnapshot();
          expect(testCallBack).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('done callback', () => {
    test.each([
      [['test']],
      [['test', 'only']],
      [['it']],
      [['fit']],
      [['it', 'only']],
    ])(
      'calls %O with done when cb function has more args than params of given test row',
      keyPath => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
        a    | b    | expected
        ${0} | ${1} | ${1}
      `;
        const testFunction = get(eachObject, keyPath);
        testFunction('expected string', ({a, b, expected}, done) => {
          expect(a).toBe(0);
          expect(b).toBe(1);
          expect(expected).toBe(1);
          expect(done).toBe('DONE');
        });
        get(globalTestMocks, keyPath).mock.calls[0][1]('DONE');
      },
    );

    test.each([[['describe']], [['fdescribe']], [['describe', 'only']]])(
      'does not call %O with done when test function has more args than params of given test row',
      keyPath => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
        a    | b    | expected
        ${0} | ${1} | ${1}
      `;
        const testFunction = get(eachObject, keyPath);
        testFunction('expected string', function({a, b, expected}, done) {
          expect(a).toBe(0);
          expect(b).toBe(1);
          expect(expected).toBe(1);
          expect(done).toBe(undefined);
          expect(arguments.length).toBe(1);
        });
        get(globalTestMocks, keyPath).mock.calls[0][1]('DONE');
      },
    );
  });

  [
    ['xtest'],
    ['test', 'skip'],
    ['xit'],
    ['it', 'skip'],
    ['xdescribe'],
    ['describe', 'skip'],
  ].forEach(keyPath => {
    describe(`.${keyPath.join('.')}`, () => {
      test('calls global with given title', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          a    | b    | expected
          ${0} | ${1} | ${1}
        `;
        const testFunction = get(eachObject, keyPath);
        testFunction('expected string', noop);

        const globalMock = get(globalTestMocks, keyPath);
        expect(globalMock).toHaveBeenCalledTimes(1);
        expect(globalMock).toHaveBeenCalledWith(
          'expected string',
          expectFunction,
          undefined,
        );
      });

      test('calls global with given title when multiple tests cases exist', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          a    | b    | expected
          ${0} | ${1} | ${1}
          ${1} | ${1} | ${2}
        `;
        const testFunction = get(eachObject, keyPath);
        testFunction('expected string', noop);

        const globalMock = get(globalTestMocks, keyPath);
        expect(globalMock).toHaveBeenCalledTimes(2);
        expect(globalMock).toHaveBeenCalledWith(
          'expected string',
          expectFunction,
          undefined,
        );
        expect(globalMock).toHaveBeenCalledWith(
          'expected string',
          expectFunction,
          undefined,
        );
      });

      test('calls global with title containing param values when using $variable format', () => {
        const globalTestMocks = getGlobalTestMocks();
        const eachObject = each.withGlobal(globalTestMocks)`
          a    | b    | expected
          ${0} | ${1} | ${1}
          ${1} | ${1} | ${2}
        `;
        const testFunction = get(eachObject, keyPath);
        testFunction('expected string: a=$a, b=$b, expected=$expected', noop);

        const globalMock = get(globalTestMocks, keyPath);
        expect(globalMock).toHaveBeenCalledTimes(2);
        expect(globalMock).toHaveBeenCalledWith(
          'expected string: a=0, b=1, expected=1',
          expectFunction,
          undefined,
        );
        expect(globalMock).toHaveBeenCalledWith(
          'expected string: a=1, b=1, expected=2',
          expectFunction,
          undefined,
        );
      });
    });
  });
});
