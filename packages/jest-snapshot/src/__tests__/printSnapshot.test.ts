/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import ansiRegex = require('ansi-regex');
import styles = require('ansi-styles');
import chalk = require('chalk');
import format from 'pretty-format';
import {
  aBackground2,
  aBackground3,
  aForeground2,
  aForeground3,
  bBackground2,
  bBackground3,
  bForeground2,
  bForeground3,
} from '../colors';
import jestSnapshot = require('../index');
import {
  getReceivedColorForChalkInstance,
  getSnapshotColorForChalkInstance,
  noColor,
  printPropertiesAndReceived,
  printSnapshotAndReceived,
} from '../printSnapshot';
import {serialize} from '../utils';

const aOpenForeground1 = styles.magenta.open;
const aOpenBackground1 = styles.bgYellowBright.open;
const bOpenForeground1 = styles.cyan.open;
const bOpenBackground1 = styles.bgWhiteBright.open;

const aOpenForeground2 = styles.color.ansi256(aForeground2);
const bOpenForeground2 = styles.color.ansi256(bForeground2);
const aOpenBackground2 = styles.bgColor.ansi256(aBackground2);
const bOpenBackground2 = styles.bgColor.ansi256(bBackground2);

const aOpenForeground3 = styles.color.ansi16m(
  aForeground3[0],
  aForeground3[1],
  aForeground3[2],
);
const bOpenForeground3 = styles.color.ansi16m(
  bForeground3[0],
  bForeground3[1],
  bForeground3[2],
);
const aOpenBackground3 = styles.bgColor.ansi16m(
  aBackground3[0],
  aBackground3[1],
  aBackground3[2],
);
const bOpenBackground3 = styles.bgColor.ansi16m(
  bBackground3[0],
  bBackground3[1],
  bBackground3[2],
);

const convertAnsi = (val: string): string => {
  // Trailing spaces in common lines have yellow background color.
  let isYellowBackground = false;

  return val.replace(ansiRegex(), match => {
    switch (match) {
      case styles.inverse.open:
        return '<i>';
      case styles.inverse.close:
        return '</i>';

      case styles.bold.open:
        return '<b>';
      case styles.dim.open:
        return '<d>';
      case styles.bold.close:
      case styles.dim.close:
        return '</>';

      case styles.green.open:
        return '<g>';
      case aOpenForeground1:
      case aOpenForeground2:
      case aOpenForeground3:
        return '<m>';
      case styles.red.open:
        return '<r>';
      case bOpenForeground1:
      case bOpenForeground2:
      case bOpenForeground3:
        return '<t>'; // teal/cyan/aqua
      case styles.yellow.open:
        return '<y>';
      case styles.cyan.close:
      case styles.green.close:
      case styles.magenta.close:
      case styles.red.close:
      case styles.yellow.close:
        return '</>';

      case styles.bgYellow.open:
        isYellowBackground = true;
        return '<Y>';

      case aOpenBackground1:
      case bOpenBackground1:
      case aOpenBackground2:
      case bOpenBackground2:
      case aOpenBackground3:
      case bOpenBackground3:
        isYellowBackground = false;
        return '';

      case styles.bgYellow.close:
        // The same code closes any background color.
        return isYellowBackground ? '</Y>' : '';

      default:
        return match;
    }
  });
};

expect.addSnapshotSerializer({
  serialize(val: string): string {
    return convertAnsi(val);
  },
  test(val: unknown): val is string {
    return typeof val === 'string';
  },
});

let customSerializer: format.NewPlugin | null = null;
jestSnapshot.addSerializer({
  serialize(...args) {
    return customSerializer!.serialize(...args);
  },
  test(val) {
    if (!customSerializer) {
      return false;
    }
    return customSerializer.test(val);
  },
});

const {
  toMatchInlineSnapshot,
  toMatchSnapshot,
  toThrowErrorMatchingInlineSnapshot,
  toThrowErrorMatchingSnapshot,
} = jestSnapshot;

describe('chalk', () => {
  // Because these tests give code coverage of get functions
  // and give confidence that the escape sequences are correct,
  // convertAnsi can return same serialization for any chalk level
  // so snapshot tests pass in any environment with chalk level >= 1.

  // Simulate comparison lines from printSnapshotAndReceived.
  const formatLines = chalkInstance => {
    const aColor = getSnapshotColorForChalkInstance(chalkInstance);
    const bColor = getReceivedColorForChalkInstance(chalkInstance);
    const cColor = chalkInstance.dim;
    const changeLineTrailingSpaceColor = noColor;
    const commonLineTrailingSpaceColor = chalkInstance.bgYellow;

    return [
      aColor(`- delete 1${changeLineTrailingSpaceColor(' ')}`),
      cColor(`  common 2${commonLineTrailingSpaceColor('  ')}`),
      bColor(`+ insert 0`),
    ].join('\n');
  };

  const expected0 = '- delete 1 \n  common 2  \n+ insert 0';
  const expected1 =
    '<m>- delete 1 </>\n<d>  common 2<Y>  </Y></>\n<t>+ insert 0</>';

  test('level 0', () => {
    const chalkInstance = new chalk.Instance({level: 0});
    const formatted = formatLines(chalkInstance);
    const converted = convertAnsi(formatted);

    expect(converted).toBe(expected0);
    expect(formatted).toBe(expected0);
  });

  test('level 1', () => {
    const chalkInstance = new chalk.Instance({level: 1});
    const formatted = formatLines(chalkInstance);
    const converted = convertAnsi(formatted);

    expect(converted).toBe(expected1);
    expect(formatted).toMatch(aOpenForeground1 + aOpenBackground1 + '-');
    expect(formatted).toMatch(bOpenForeground1 + bOpenBackground1 + '+');
    expect(formatted).not.toMatch(chalkInstance.bgYellow(' ')); // noColor
    expect(formatted).toMatch(chalkInstance.bgYellow('  '));
  });

  test('level 2', () => {
    const chalkInstance = new chalk.Instance({level: 2});
    const formatted = formatLines(chalkInstance);
    const converted = convertAnsi(formatted);

    expect(converted).toBe(expected1);
    expect(formatted).toMatch(aOpenForeground2 + aOpenBackground2 + '-');
    expect(formatted).toMatch(bOpenForeground2 + bOpenBackground2 + '+');
    expect(formatted).not.toMatch(chalkInstance.bgYellow(' ')); // noColor
    expect(formatted).toMatch(chalkInstance.bgYellow('  '));
  });

  test('level 3', () => {
    const chalkInstance = new chalk.Instance({level: 3});
    const formatted = formatLines(chalkInstance);
    const converted = convertAnsi(formatted);

    expect(converted).toBe(expected1);
    expect(formatted).toMatch(aOpenForeground3 + aOpenBackground3 + '-');
    expect(formatted).toMatch(bOpenForeground3 + bOpenBackground3 + '+');
    expect(formatted).not.toMatch(chalkInstance.bgYellow(' ')); // noColor
    expect(formatted).toMatch(chalkInstance.bgYellow('  '));
  });
});

describe('matcher error', () => {
  describe('toMatchInlineSnapshot', () => {
    const received = {
      id: 'abcdef',
      text: 'Throw matcher error',
      type: 'ADD_ITEM',
    };

    test('Expected properties must be an object (non-null) without snapshot', () => {
      const context = {
        isNot: false,
        promise: '',
      };
      const properties = false;

      expect(() => {
        toMatchInlineSnapshot.call(context, received, properties);
      }).toThrowErrorMatchingSnapshot();
    });

    test('Expected properties must be an object (null) with snapshot', () => {
      const context = {
        isNot: false,
        promise: '',
      };
      const properties = null;
      const snapshot = '';

      expect(() => {
        toMatchInlineSnapshot.call(context, received, properties, snapshot);
      }).toThrowErrorMatchingSnapshot();
    });

    test('Inline snapshot must be a string', () => {
      const context = {
        isNot: false,
        promise: 'resolves',
      };
      const properties = {};
      const snapshot = Symbol('is not a string');

      expect(() => {
        toMatchInlineSnapshot.call(context, received, properties, snapshot);
      }).toThrowErrorMatchingSnapshot();
    });

    test('Snapshot matchers cannot be used with not', () => {
      const context = {
        isNot: true,
        promise: '',
      };
      const received = -13;
      const snapshot = '13';

      expect(() => {
        toMatchInlineSnapshot.call(context, received, snapshot);
      }).toThrowErrorMatchingSnapshot();
    });
  });

  describe('toMatchSnapshot', () => {
    const received = {
      id: 'abcdef',
      text: 'Throw matcher error',
      type: 'ADD_ITEM',
    };

    test('Expected properties must be an object (non-null)', () => {
      const context = {
        isNot: false,
        promise: '',
      };
      const properties = () => {};

      expect(() => {
        toMatchSnapshot.call(context, received, properties);
      }).toThrowErrorMatchingSnapshot();
    });

    test('Expected properties must be an object (null) with hint', () => {
      const context = {
        isNot: false,
        promise: '',
      };
      const properties = null;
      const hint = 'reminder';

      expect(() => {
        toMatchSnapshot.call(context, received, properties, hint);
      }).toThrowErrorMatchingSnapshot();
    });

    test('Expected properties must be an object (null) without hint', () => {
      const context = {
        isNot: false,
        promise: '',
      };
      const properties = null;

      expect(() => {
        toMatchSnapshot.call(context, received, properties);
      }).toThrowErrorMatchingSnapshot();
    });

    describe('received value must be an object', () => {
      const context = {
        currentTestName: '',
        isNot: false,
        promise: '',
        snapshotState: {},
      };
      const properties = {};

      test('(non-null)', () => {
        expect(() => {
          toMatchSnapshot.call(context, 'string', properties);
        }).toThrowErrorMatchingSnapshot();
      });

      test('(null)', () => {
        expect(() => {
          toMatchSnapshot.call(context, null, properties);
        }).toThrowErrorMatchingSnapshot();
      });
    });

    // Future test: Snapshot hint must be a string

    test('Snapshot state must be initialized', () => {
      const context = {
        isNot: false,
        promise: 'resolves',
      };
      const hint = 'initialize me';

      expect(() => {
        toMatchSnapshot.call(context, received, hint);
      }).toThrowErrorMatchingSnapshot();
    });
  });

  describe('toThrowErrorMatchingInlineSnapshot', () => {
    test('Inline snapshot must be a string', () => {
      const context = {
        isNot: false,
        promise: '',
      };
      const received = () => {
        throw new Error('Not found');
      };
      const snapshot = 404;
      const fromPromise = false;

      expect(() => {
        toThrowErrorMatchingInlineSnapshot.call(
          context,
          received,
          snapshot,
          fromPromise,
        );
      }).toThrowErrorMatchingSnapshot();
    });

    test('Snapshot state must be initialized', () => {
      const context = {
        isNot: false,
        promise: 'rejects',
      };
      const received = new Error('404');
      const snapshot = '"Not found"';
      const fromPromise = true;

      expect(() => {
        toThrowErrorMatchingInlineSnapshot.call(
          context,
          received,
          snapshot,
          fromPromise,
        );
      }).toThrowErrorMatchingSnapshot();
    });
  });

  describe('toThrowErrorMatchingSnapshot', () => {
    test('Received value must be a function', () => {
      const context = {
        isNot: false,
        promise: '',
      };
      const received = 13;
      const fromPromise = false;

      expect(() => {
        toThrowErrorMatchingSnapshot.call(
          context,
          received,
          undefined,
          fromPromise,
        );
      }).toThrowErrorMatchingSnapshot();
    });

    test('Snapshot matchers cannot be used with not', () => {
      const context = {
        isNot: true,
        promise: '',
      };
      const received = new Error('received');
      const hint = 'reminder';
      const fromPromise = true;

      expect(() => {
        toThrowErrorMatchingSnapshot.call(context, received, hint, fromPromise);
      }).toThrowErrorMatchingSnapshot();
    });

    // Future test: Snapshot hint must be a string
  });
});

describe('other error', () => {
  describe('toThrowErrorMatchingSnapshot', () => {
    test('Received function did not throw', () => {
      const context = {
        isNot: false,
        promise: '',
      };
      const received = () => {};
      const fromPromise = false;

      expect(() => {
        toThrowErrorMatchingSnapshot.call(
          context,
          received,
          undefined,
          fromPromise,
        );
      }).toThrowErrorMatchingSnapshot();
    });
  });
});

describe('pass false', () => {
  describe('toMatchInlineSnapshot', () => {
    describe('with properties', () => {
      const id = 'abcdef';
      const properties = {id};
      const type = 'ADD_ITEM';

      describe('equals false', () => {
        const context = {
          currentTestName: 'with properties',
          equals: () => false,
          isNot: false,
          promise: '',
          snapshotState: {
            fail: fullTestName => fullTestName + ' 1',
          },
          utils: {
            iterableEquality: () => {},
            subsetEquality: () => {},
          },
        };
        const received = {
          id: 'abcdefg',
          text: 'Increase code coverage',
          type,
        };

        test('with snapshot', () => {
          const snapshot = '';
          const {message, pass} = toMatchInlineSnapshot.call(
            context,
            received,
            properties,
            snapshot,
          );
          expect(pass).toBe(false);
          expect(message()).toMatchSnapshot();
        });

        test('without snapshot', () => {
          const {message, pass} = toMatchInlineSnapshot.call(
            context,
            received,
            properties,
          );
          expect(pass).toBe(false);
          expect(message()).toMatchSnapshot();
        });
      });

      test('equals true', () => {
        const context = {
          currentTestName: 'with properties',
          equals: () => true,
          isNot: false,
          promise: '',
          snapshotState: {
            expand: false,
            match({inlineSnapshot, received}) {
              return {
                actual: format(received),
                count: 1,
                expected: inlineSnapshot,
                pass: false,
              };
            },
          },
          utils: {
            iterableEquality: () => {},
            subsetEquality: () => {},
          },
        };
        const received = {
          id,
          text: 'received',
          type,
        };
        const snapshot = format({
          id,
          text: 'inline snapshot',
          type,
        });

        const {message, pass} = toMatchInlineSnapshot.call(
          context,
          received,
          properties,
          snapshot,
        );
        expect(pass).toBe(false);
        expect(message()).toMatchSnapshot();
      });
    });
  });

  describe('toMatchSnapshot', () => {
    test('New snapshot was not written (multi line)', () => {
      const context = {
        currentTestName: 'New snapshot was not written',
        isNot: false,
        promise: '',
        snapshotState: {
          match({received}) {
            return {
              actual: format(received),
              count: 1,
              expected: undefined,
              pass: false,
            };
          },
        },
      };
      const received = 'To write or not to write,\nthat is the question.';
      const hint = '(CI)';

      const {message, pass} = toMatchSnapshot.call(context, received, hint);
      expect(pass).toBe(false);
      expect(message()).toMatchSnapshot();
    });

    test('New snapshot was not written (single line)', () => {
      const context = {
        currentTestName: 'New snapshot was not written',
        isNot: false,
        promise: '',
        snapshotState: {
          match({received}) {
            return {
              actual: format(received),
              count: 2,
              expected: undefined,
              pass: false,
            };
          },
        },
      };
      const received = 'Write me if you can!';
      const hint = '(CI)';

      const {message, pass} = toMatchSnapshot.call(context, received, hint);
      expect(pass).toBe(false);
      expect(message()).toMatchSnapshot();
    });

    describe('with properties', () => {
      const id = 'abcdef';
      const properties = {id};
      const type = 'ADD_ITEM';

      describe('equals false', () => {
        const context = {
          currentTestName: 'with properties',
          equals: () => false,
          isNot: false,
          promise: '',
          snapshotState: {
            fail: fullTestName => fullTestName + ' 1',
          },
          utils: {
            iterableEquality: () => {},
            subsetEquality: () => {},
          },
        };

        test('isLineDiffable false', () => {
          const {message, pass} = toMatchSnapshot.call(
            context,
            new RangeError('Invalid array length'),
            {name: 'Error'},
          );
          expect(pass).toBe(false);
          expect(message()).toMatchSnapshot();
        });

        test('isLineDiffable true', () => {
          const received = {
            id: 'abcdefg',
            text: 'Increase code coverage',
            type,
          };

          const {message, pass} = toMatchSnapshot.call(
            context,
            received,
            properties,
          );
          expect(pass).toBe(false);
          expect(message()).toMatchSnapshot();
        });
      });

      test('equals true', () => {
        const context = {
          currentTestName: 'with properties',
          equals: () => true,
          isNot: false,
          promise: '',
          snapshotState: {
            expand: false,
            match({received}) {
              return {
                actual: format(received),
                count: 1,
                expected: format({
                  id,
                  text: 'snapshot',
                  type,
                }),
                pass: false,
              };
            },
          },
          utils: {
            iterableEquality: () => {},
            subsetEquality: () => {},
          },
        };
        const received = {
          id,
          text: 'received',
          type,
        };
        const hint = 'change text value';

        const {message, pass} = toMatchSnapshot.call(
          context,
          received,
          properties,
          hint,
        );
        expect(pass).toBe(false);
        expect(message()).toMatchSnapshot();
      });
    });
  });

  describe('toThrowErrorMatchingInlineSnapshot', () => {
    test('with snapshot', () => {
      const context = {
        currentTestName: 'with snapshot',
        isNot: false,
        promise: '',
        snapshotState: {
          expand: false,
          match({inlineSnapshot, received}) {
            return {
              actual: format(received),
              count: 1,
              expected: inlineSnapshot,
              pass: false,
            };
          },
        },
      };
      const received = new Error('received');
      const snapshot = '"inline snapshot"';
      const fromPromise = true;

      const {message, pass} = toThrowErrorMatchingInlineSnapshot.call(
        context,
        received,
        snapshot,
        fromPromise,
      );
      expect(pass).toBe(false);
      expect(message()).toMatchSnapshot();
    });
  });
});

describe('pass true', () => {
  describe('toMatchSnapshot', () => {
    test('without properties', () => {
      const context = {
        isNot: false,
        promise: '',
        snapshotState: {
          match() {
            return {
              expected: '',
              pass: true,
            };
          },
        },
      };
      const received = 7;

      const {pass} = toMatchSnapshot.call(context, received);
      expect(pass).toBe(true);
    });
  });
});

describe('printPropertiesAndReceived', () => {
  test('omit missing properties', () => {
    const received = {
      b: {},
      branchMap: {},
      f: {},
      fnMap: {},
      // hash is missing
      path: '…',
      s: {},
      statementMap: {},
    };
    const properties = {
      hash: expect.any(String),
      path: expect.any(String),
    };

    expect(
      printPropertiesAndReceived(properties, received, false),
    ).toMatchSnapshot();
  });
});

describe('printSnapshotAndReceived', () => {
  // Simulate default serialization.
  const testWithStringify = (
    expected: unknown,
    received: unknown,
    expand: boolean,
  ): string =>
    printSnapshotAndReceived(
      serialize(expected),
      serialize(received),
      received,
      expand,
    );

  // Simulate custom raw string serialization.
  const testWithoutStringify = (
    expected: string,
    received: string,
    expand: boolean,
  ): string => printSnapshotAndReceived(expected, received, received, expand);

  describe('backtick', () => {
    test('single line expected and received', () => {
      const expected = 'var foo = `backtick`;';
      const received = 'var foo = tag`backtick`;';

      expect(testWithStringify(expected, received, false)).toMatchSnapshot();
    });
  });

  describe('empty string', () => {
    test('expected and received single line', () => {
      const expected = '';
      const received = 'single line string';

      expect(testWithStringify(expected, received, false)).toMatchSnapshot();
    });

    test('received and expected multi line', () => {
      const expected = 'multi\nline\nstring';
      const received = '';

      expect(testWithStringify(expected, received, false)).toMatchSnapshot();
    });
  });

  describe('escape', () => {
    test('double quote marks in string', () => {
      const expected = 'What does "oobleck" mean?';
      const received = 'What does "ewbleck" mean?';

      expect(testWithStringify(expected, received, false)).toMatchSnapshot();
    });

    test('backslash in multi line string', () => {
      const expected = 'Forward / slash and back \\ slash';
      const received = 'Forward / slash\nBack \\ slash';

      expect(testWithStringify(expected, received, false)).toMatchSnapshot();
    });

    test('backslash in single line string', () => {
      const expected = 'forward / slash and back \\ slash';
      const received = 'Forward / slash and back \\ slash';

      expect(testWithStringify(expected, received, false)).toMatchSnapshot();
    });

    test('regexp', () => {
      const expected = /\\(")/g;
      const received = /\\(")/;

      expect(testWithStringify(expected, received, false)).toMatchSnapshot();
    });
  });

  describe('expand', () => {
    // prettier/pull/5272
    const expected = [
      'type TypeName<T> =',
      'T extends string ? "string" :',
      'T extends number ? "number" :',
      'T extends boolean ? "boolean" :',
      'T extends undefined ? "undefined" :',
      'T extends Function ? "function" :',
      '"object";',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      'type TypeName<T> = T extends string',
      '? "string"',
      ': T extends number',
      '? "number"',
      ': T extends boolean',
      '? "boolean"',
      ': T extends undefined',
      '? "undefined"',
      ': T extends Function ? "function" : "object";',
      '',
    ].join('\n');
    const received = [
      'type TypeName<T> =',
      'T extends string ? "string" :',
      'T extends number ? "number" :',
      'T extends boolean ? "boolean" :',
      'T extends undefined ? "undefined" :',
      'T extends Function ? "function" :',
      '"object";',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      'type TypeName<T> = T extends string',
      '? "string"',
      ': T extends number',
      '? "number"',
      ': T extends boolean',
      '? "boolean"',
      ': T extends undefined',
      '? "undefined"',
      ': T extends Function',
      '? "function"',
      ': "object";',
      '',
    ].join('\n');

    test('false', () => {
      expect(testWithStringify(expected, received, false)).toMatchSnapshot();
    });

    test('true', () => {
      expect(testWithStringify(expected, received, true)).toMatchSnapshot();
    });
  });

  test('fallback to line diff', () => {
    const expected = [
      '[...a, ...b,];',
      '[...a, ...b];',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '[...a, ...b];',
      '[...a, ...b];',
      '',
    ].join('\n');
    const received = [
      '====================================options=====================================',
      'parsers: ["flow", "typescript"]',
      'printWidth: 80',
      '                                                                                | printWidth',
      '=====================================input======================================',
      '[...a, ...b,];',
      '[...a, ...b];',
      '',
      '=====================================output=====================================',
      '[...a, ...b];',
      '[...a, ...b];',
      '',
      '================================================================================',
    ].join('\n');

    expect(testWithStringify(expected, received, false)).toMatchSnapshot();
  });

  describe('has no common after clean up chaff', () => {
    test('array', () => {
      const expected = ['delete', 'two'];
      const received = ['insert', '2'];

      expect(testWithStringify(expected, received, false)).toMatchSnapshot();
    });

    test('string single line', () => {
      const expected = 'delete';
      const received = 'insert';

      expect(testWithStringify(expected, received, false)).toMatchSnapshot();
    });
  });

  describe('MAX_DIFF_STRING_LENGTH', () => {
    describe('unquoted', () => {
      // Do not call diffStringsUnified if either string is longer than max.
      const lessChange = chalk.inverse('single ');
      const less = 'single line';
      const more = 'multi line' + '\n123456789'.repeat(2000); // 10 + 20K chars

      test('both are less', () => {
        const less2 = 'multi\nline';
        const difference = printSnapshotAndReceived(less2, less, less, true);

        expect(difference).toMatch('- multi');
        expect(difference).toMatch('- line');
        expect(difference).toMatch(lessChange);
        expect(difference).not.toMatch('+ single line');
      });

      test('expected is more', () => {
        const difference = printSnapshotAndReceived(more, less, less, true);

        expect(difference).toMatch('- multi line');
        expect(difference).toMatch('+ single line');
        expect(difference).not.toMatch(lessChange);
      });

      test('received is more', () => {
        const difference = printSnapshotAndReceived(less, more, more, true);

        expect(difference).toMatch('- single line');
        expect(difference).toMatch('+ multi line');
        expect(difference).not.toMatch(lessChange);
      });
    });

    describe('quoted', () => {
      // Do not call diffStringsRaw if either string is longer than max.
      const lessChange = chalk.inverse('no');
      const less = 'no numbers';
      const more = 'many numbers' + ' 123456789'.repeat(2000); // 12 + 20K chars
      const lessQuoted = '"' + less + '"';
      const moreQuoted = '"' + more + '"';

      test('both are less', () => {
        const lessQuoted2 = '"0 numbers"';
        const stringified = printSnapshotAndReceived(
          lessQuoted2,
          lessQuoted,
          less,
          true,
        );

        expect(stringified).toMatch('Received:');
        expect(stringified).toMatch(lessChange);
        expect(stringified).not.toMatch('+ Received');
      });

      test('expected is more', () => {
        const stringified = printSnapshotAndReceived(
          moreQuoted,
          lessQuoted,
          less,
          true,
        );

        expect(stringified).toMatch('Received:');
        expect(stringified).toMatch(less);
        expect(stringified).not.toMatch('+ Received');
        expect(stringified).not.toMatch(lessChange);
      });

      test('received is more', () => {
        const stringified = printSnapshotAndReceived(
          lessQuoted,
          moreQuoted,
          more,
          true,
        );

        expect(stringified).toMatch('Snapshot:');
        expect(stringified).toMatch(less);
        expect(stringified).not.toMatch('- Snapshot');
        expect(stringified).not.toMatch(lessChange);
      });
    });
  });

  describe('isLineDiffable', () => {
    describe('false', () => {
      test('asymmetric matcher', () => {
        const expected = null;
        const received = {asymmetricMatch: () => {}};

        expect(testWithStringify(expected, received, false)).toMatchSnapshot();
      });

      test('boolean', () => {
        const expected = true;
        const received = false;

        expect(testWithStringify(expected, received, false)).toMatchSnapshot();
      });

      test('date', () => {
        const expected = new Date('2019-09-19');
        const received = new Date('2019-09-20');

        expect(testWithStringify(expected, received, false)).toMatchSnapshot();
      });

      test('error', () => {
        const expected = new Error(
          'Cannot spread fragment "NameAndAppearances" within itself.',
        );
        const received = new Error(
          'Cannot spread fragment "NameAndAppearancesAndFriends" within itself.',
        );

        expect(testWithStringify(expected, received, false)).toMatchSnapshot();
      });

      test('function', () => {
        const expected = undefined;
        const received = () => {};

        expect(testWithStringify(expected, received, false)).toMatchSnapshot();
      });

      test('number', () => {
        const expected = -0;
        const received = NaN;

        expect(testWithStringify(expected, received, false)).toMatchSnapshot();
      });
    });

    describe('true', () => {
      test('array', () => {
        const expected0 = {
          code: 4011,
          weight: 2.13,
        };
        const expected1 = {
          code: 4019,
          count: 4,
        };

        const expected = [expected0, expected1];
        const received = [
          {_id: 'b14680dec683e744ada1f2fe08614086', ...expected0},
          {_id: '7fc63ff01769c4fa7d9279e97e307829', ...expected1},
        ];

        expect(testWithStringify(expected, received, false)).toMatchSnapshot();
      });

      test('object', () => {
        const type = 'img';
        const expected = {
          props: {
            className: 'logo',
            src: '/img/jest.png',
          },
          type,
        };
        const received = {
          props: {
            alt: 'Jest logo',
            class: 'logo',
            src: '/img/jest.svg',
          },
          type,
        };

        expect(testWithStringify(expected, received, false)).toMatchSnapshot();
      });

      test('single line expected and received', () => {
        const expected = [];
        const received = {};

        expect(testWithStringify(expected, received, false)).toMatchSnapshot();
      });

      test('single line expected and multi line received', () => {
        const expected = [];
        const received = [0];

        expect(testWithStringify(expected, received, false)).toMatchSnapshot();
      });
    });
  });

  test('multi line small change in one line and other is unchanged', () => {
    const expected =
      "There is no route defined for key 'Settings'.\nMust be one of: 'Home'";
    const received =
      "There is no route defined for key Settings.\nMust be one of: 'Home'";

    expect(testWithStringify(expected, received, false)).toMatchSnapshot();
  });

  test('multi line small changes', () => {
    const expected = [
      '    69 | ',
      "    70 | test('assert.doesNotThrow', () => {",
      '  > 71 |   assert.doesNotThrow(() => {',
      '       |          ^',
      "    72 |     throw Error('err!');",
      '    73 |   });',
      '    74 | });',
      '    at Object.doesNotThrow (__tests__/assertionError.test.js:71:10)',
    ].join('\n');
    const received = [
      '    68 | ',
      "    69 | test('assert.doesNotThrow', () => {",
      '  > 70 |   assert.doesNotThrow(() => {',
      '       |          ^',
      "    71 |     throw Error('err!');",
      '    72 |   });',
      '    73 | });',
      '    at Object.doesNotThrow (__tests__/assertionError.test.js:70:10)',
    ].join('\n');

    expect(testWithStringify(expected, received, false)).toMatchSnapshot();
  });

  test('single line large changes', () => {
    const expected = 'Array length must be a finite positive integer';
    const received = 'Invalid array length';

    expect(testWithStringify(expected, received, false)).toMatchSnapshot();
  });

  describe('ignore indentation', () => {
    const $$typeof = Symbol.for('react.test.json');

    test('markup delete', () => {
      const received = {
        $$typeof,
        children: [
          {
            $$typeof,
            children: ['Ignore indentation for most serialized objects'],
            type: 'h3',
          },
          {
            $$typeof,
            children: [
              'Call ',
              {
                $$typeof,
                children: ['diffLinesUnified2'],
                type: 'code',
              },
              ' to compare without indentation',
            ],
            type: 'p',
          },
        ],
        type: 'div',
      };
      const expected = {
        $$typeof,
        children: [received],
        type: 'div',
      };

      expect(testWithStringify(expected, received, false)).toMatchSnapshot();
    });

    test('markup fall back', () => {
      // Because text has more than one adjacent line.
      const text = [
        'for (key in foo) {',
        '  if (Object.prototype.hasOwnProperty.call(foo, key)) {',
        '    doSomething(key);',
        '  }',
        '}',
      ].join('\n');

      const expected = {
        $$typeof,
        children: [text],
        props: {
          className: 'language-js',
        },
        type: 'pre',
      };
      const received = {
        $$typeof,
        children: [expected],
        type: 'div',
      };

      expect(testWithStringify(expected, received, false)).toMatchSnapshot();
    });

    test('markup insert', () => {
      const text = 'when';
      const expected = {
        $$typeof,
        children: [text],
        type: 'th',
      };
      const received = {
        $$typeof,
        children: [
          {
            $$typeof,
            children: [text],
            type: 'span',
          },
          {
            $$typeof,
            children: ['↓'],
            props: {
              title: 'ascending from older to newer',
            },
            type: 'abbr',
          },
        ],
        type: 'th',
      };

      expect(testWithStringify(expected, received, false)).toMatchSnapshot();
    });

    test('ignores custom indentation of unchanged line', () => {
      try {
        const pluginGeneratedContent = `  **some plugin-generated string with custom leading whitespace**\n\n`;
        const seen = new WeakSet();

        const plugin: format.NewPlugin = {
          test: val => typeof val === 'object' && val.props && !seen.has(val),
          serialize: (val, config, indentation, depth, refs, printer) => {
            seen.add(val);
            const serialized = printer(val, config, indentation, depth, refs);
            seen.delete(val);
            return pluginGeneratedContent + serialized;
          },
        };

        customSerializer = plugin;

        const snapshot = {
          props: {
            alt: 'Jest logo',
            class: 'logo',
            src: '/img/jest.svg',
          },
          type: 'img',
        };
        const received = {
          ...snapshot,
          props: {
            ...snapshot.props,
            class: 'logo round',
          },
        };
        expect(
          printSnapshotAndReceived(
            serialize(snapshot),
            serialize(received),
            received,
            true,
          ),
        ).toMatchSnapshot();
      } finally {
        customSerializer = null;
      }
    });

    describe('object', () => {
      const text = 'Ignore indentation in snapshot';
      const time = '2019-11-11';
      const type = 'CREATE_ITEM';
      const less = {
        text,
        time,
        type,
      };
      const more = {
        payload: {
          text,
          time,
        },
        type,
      };

      test('delete', () => {
        expect(testWithStringify(more, less, false)).toMatchSnapshot();
      });

      test('insert', () => {
        expect(testWithStringify(less, more, false)).toMatchSnapshot();
      });
    });
  });

  describe('without serialize', () => {
    test('backtick single line expected and received', () => {
      const expected = 'var foo = `backtick`;';
      const received = 'var foo = `back${x}tick`;';

      expect(testWithoutStringify(expected, received, false)).toMatchSnapshot();
    });

    test('backtick single line expected and multi line received', () => {
      const expected = 'var foo = `backtick`;';
      const received = 'var foo = `back\ntick`;';

      expect(testWithoutStringify(expected, received, false)).toMatchSnapshot();
    });

    test('has no common after clean up chaff multi line', () => {
      const expected = 'delete\ntwo';
      const received = 'insert\n2';

      expect(testWithoutStringify(expected, received, false)).toMatchSnapshot();
    });

    test('has no common after clean up chaff single line', () => {
      const expected = 'delete';
      const received = 'insert';

      expect(testWithoutStringify(expected, received, false)).toMatchSnapshot();
    });

    test('prettier/pull/5590', () => {
      const expected = [
        '====================================options=====================================',
        'parsers: ["html"]',
        'printWidth: 80',
        '                                                                                | printWidth',
        '=====================================input======================================',
        `<img src="test.png" alt='John "ShotGun" Nelson'>`,
        '',
        '=====================================output=====================================',
        '<img src="test.png" alt="John &quot;ShotGun&quot; Nelson" />',
        '',
        '================================================================================',
      ].join('\n');
      const received = [
        '====================================options=====================================',
        'parsers: ["html"]',
        'printWidth: 80',
        '                                                                                | printWidth',
        '=====================================input======================================',
        `<img src="test.png" alt='John "ShotGun" Nelson'>`,
        '',
        '=====================================output=====================================',
        `<img src="test.png" alt='John "ShotGun" Nelson' />`,
        '',
        '================================================================================',
      ].join('\n');

      expect(testWithoutStringify(expected, received, false)).toMatchSnapshot();
    });
  });
});
