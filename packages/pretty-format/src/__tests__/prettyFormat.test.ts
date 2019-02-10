/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import prettyFormat from '../';

function returnArguments(..._args: Array<unknown>) {
  return arguments;
}

class MyArray<T> extends Array<T> {}

function MyObject(value: unknown) {
  // @ts-ignore
  this.name = value;
}

describe('prettyFormat()', () => {
  it('prints empty arguments', () => {
    const val = returnArguments();
    expect(prettyFormat(val)).toEqual('Arguments []');
  });

  it('prints arguments', () => {
    const val = returnArguments(1, 2, 3);
    expect(prettyFormat(val)).toEqual('Arguments [\n  1,\n  2,\n  3,\n]');
  });

  it('prints an empty array', () => {
    const val: never[] = [];
    expect(prettyFormat(val)).toEqual('Array []');
  });

  it('prints an array with items', () => {
    const val = [1, 2, 3];
    expect(prettyFormat(val)).toEqual('Array [\n  1,\n  2,\n  3,\n]');
  });

  it('prints a empty typed array', () => {
    const val = new Uint32Array(0);
    expect(prettyFormat(val)).toEqual('Uint32Array []');
  });

  it('prints a typed array with items', () => {
    const val = new Uint32Array(3);
    expect(prettyFormat(val)).toEqual('Uint32Array [\n  0,\n  0,\n  0,\n]');
  });

  it('prints an array buffer', () => {
    const val = new ArrayBuffer(3);
    expect(prettyFormat(val)).toEqual('ArrayBuffer []');
  });

  it('prints a nested array', () => {
    const val = [[1, 2, 3]];
    expect(prettyFormat(val)).toEqual(
      'Array [\n  Array [\n    1,\n    2,\n    3,\n  ],\n]',
    );
  });

  it('prints true', () => {
    const val = true;
    expect(prettyFormat(val)).toEqual('true');
  });

  it('prints false', () => {
    const val = false;
    expect(prettyFormat(val)).toEqual('false');
  });

  it('prints an error', () => {
    const val = new Error();
    expect(prettyFormat(val)).toEqual('[Error]');
  });

  it('prints a typed error with a message', () => {
    const val = new TypeError('message');
    expect(prettyFormat(val)).toEqual('[TypeError: message]');
  });

  it('prints a function constructor', () => {
    /* eslint-disable no-new-func */
    const val = new Function();
    /* eslint-enable no-new-func */
    // In Node 8.1.4: val.name === 'anonymous'
    expect(prettyFormat(val)).toEqual('[Function anonymous]');
  });

  it('prints an anonymous callback function', () => {
    let val;
    function f(cb: () => void) {
      val = cb;
    }
    f(() => {});
    // In Node 8.1.4: val.name === ''
    expect(prettyFormat(val)).toEqual('[Function anonymous]');
  });

  it('prints an anonymous assigned function', () => {
    const val = () => {};
    const formatted = prettyFormat(val);
    // Node 6.5 infers function names
    expect(
      formatted === '[Function anonymous]' || formatted === '[Function val]',
    ).toBeTruthy();
  });

  it('prints a named function', () => {
    const val = function named() {};
    expect(prettyFormat(val)).toEqual('[Function named]');
  });

  it('prints a named generator function', () => {
    const val = function* generate() {
      yield 1;
      yield 2;
      yield 3;
    };
    expect(prettyFormat(val)).toEqual('[Function generate]');
  });

  it('can customize function names', () => {
    const val = function named() {};
    expect(
      prettyFormat(val, {
        printFunctionName: false,
      }),
    ).toEqual('[Function]');
  });

  it('prints Infinity', () => {
    const val = Infinity;
    expect(prettyFormat(val)).toEqual('Infinity');
  });

  it('prints -Infinity', () => {
    const val = -Infinity;
    expect(prettyFormat(val)).toEqual('-Infinity');
  });

  it('prints an empty map', () => {
    const val = new Map();
    expect(prettyFormat(val)).toEqual('Map {}');
  });

  it('prints a map with values', () => {
    const val = new Map();
    val.set('prop1', 'value1');
    val.set('prop2', 'value2');
    expect(prettyFormat(val)).toEqual(
      'Map {\n  "prop1" => "value1",\n  "prop2" => "value2",\n}',
    );
  });

  it('prints a map with non-string keys', () => {
    const val = new Map<any, any>([
      [false, 'boolean'],
      ['false', 'string'],
      [0, 'number'],
      ['0', 'string'],
      [null, 'null'],
      ['null', 'string'],
      [undefined, 'undefined'],
      ['undefined', 'string'],
      [Symbol('description'), 'symbol'],
      ['Symbol(description)', 'string'],
      [['array', 'key'], 'array'],
      [{key: 'value'}, 'object'],
    ]);
    const expected = [
      'Map {',
      '  false => "boolean",',
      '  "false" => "string",',
      '  0 => "number",',
      '  "0" => "string",',
      '  null => "null",',
      '  "null" => "string",',
      '  undefined => "undefined",',
      '  "undefined" => "string",',
      '  Symbol(description) => "symbol",',
      '  "Symbol(description)" => "string",',
      '  Array [',
      '    "array",',
      '    "key",',
      '  ] => "array",',
      '  Object {',
      '    "key": "value",',
      '  } => "object",',
      '}',
    ].join('\n');
    expect(prettyFormat(val)).toEqual(expected);
  });

  it('prints NaN', () => {
    const val = NaN;
    expect(prettyFormat(val)).toEqual('NaN');
  });

  it('prints null', () => {
    const val = null;
    expect(prettyFormat(val)).toEqual('null');
  });

  it('prints a positive number', () => {
    const val = 123;
    expect(prettyFormat(val)).toEqual('123');
  });

  it('prints a negative number', () => {
    const val = -123;
    expect(prettyFormat(val)).toEqual('-123');
  });

  it('prints zero', () => {
    const val = 0;
    expect(prettyFormat(val)).toEqual('0');
  });

  it('prints negative zero', () => {
    const val = -0;
    expect(prettyFormat(val)).toEqual('-0');
  });

  it('prints a date', () => {
    const val = new Date(10e11);
    expect(prettyFormat(val)).toEqual('2001-09-09T01:46:40.000Z');
  });

  it('prints an invalid date', () => {
    const val = new Date(Infinity);
    expect(prettyFormat(val)).toEqual('Date { NaN }');
  });

  it('prints an empty object', () => {
    const val = {};
    expect(prettyFormat(val)).toEqual('Object {}');
  });

  it('prints an object with properties', () => {
    const val = {prop1: 'value1', prop2: 'value2'};
    expect(prettyFormat(val)).toEqual(
      'Object {\n  "prop1": "value1",\n  "prop2": "value2",\n}',
    );
  });

  it('prints an object with properties and symbols', () => {
    const val: any = {};
    val[Symbol('symbol1')] = 'value2';
    val[Symbol('symbol2')] = 'value3';
    val.prop = 'value1';
    expect(prettyFormat(val)).toEqual(
      'Object {\n  "prop": "value1",\n  Symbol(symbol1): "value2",\n  Symbol(symbol2): "value3",\n}',
    );
  });

  it('prints an object without non-enumerable properties which have string key', () => {
    const val: any = {
      enumerable: true,
    };
    const key = 'non-enumerable';
    Object.defineProperty(val, key, {
      enumerable: false,
      value: false,
    });
    expect(prettyFormat(val)).toEqual('Object {\n  "enumerable": true,\n}');
  });

  it('prints an object without non-enumerable properties which have symbol key', () => {
    const val: any = {
      enumerable: true,
    };
    const key = Symbol('non-enumerable');
    Object.defineProperty(val, key, {
      enumerable: false,
      value: false,
    });
    expect(prettyFormat(val)).toEqual('Object {\n  "enumerable": true,\n}');
  });

  it('prints an object with sorted properties', () => {
    /* eslint-disable sort-keys */
    const val = {b: 1, a: 2};
    /* eslint-enable sort-keys */
    expect(prettyFormat(val)).toEqual('Object {\n  "a": 2,\n  "b": 1,\n}');
  });

  it('prints regular expressions from constructors', () => {
    const val = new RegExp('regexp');
    expect(prettyFormat(val)).toEqual('/regexp/');
  });

  it('prints regular expressions from literals', () => {
    const val = /regexp/gi;
    expect(prettyFormat(val)).toEqual('/regexp/gi');
  });

  it('prints regular expressions {escapeRegex: false}', () => {
    const val = /regexp\d/gi;
    expect(prettyFormat(val)).toEqual('/regexp\\d/gi');
  });

  it('prints regular expressions {escapeRegex: true}', () => {
    const val = /regexp\d/gi;
    expect(prettyFormat(val, {escapeRegex: true})).toEqual('/regexp\\\\d/gi');
  });

  it('escapes regular expressions nested inside object', () => {
    const obj = {test: /regexp\d/gi};
    expect(prettyFormat(obj, {escapeRegex: true})).toEqual(
      'Object {\n  "test": /regexp\\\\d/gi,\n}',
    );
  });

  it('prints an empty set', () => {
    const val = new Set();
    expect(prettyFormat(val)).toEqual('Set {}');
  });

  it('prints a set with values', () => {
    const val = new Set();
    val.add('value1');
    val.add('value2');
    expect(prettyFormat(val)).toEqual('Set {\n  "value1",\n  "value2",\n}');
  });

  it('prints a string', () => {
    const val = 'string';
    expect(prettyFormat(val)).toEqual('"string"');
  });

  it('prints and escape a string', () => {
    const val = '"\'\\';
    expect(prettyFormat(val)).toEqual('"\\"\'\\\\"');
  });

  it("doesn't escape string with {excapeString: false}", () => {
    const val = '"\'\\n';
    expect(prettyFormat(val, {escapeString: false})).toEqual('""\'\\n"');
  });

  it('prints a string with escapes', () => {
    expect(prettyFormat('"-"')).toEqual('"\\"-\\""');
    expect(prettyFormat('\\ \\\\')).toEqual('"\\\\ \\\\\\\\"');
  });

  it('prints a multiline string', () => {
    const val = ['line 1', 'line 2', 'line 3'].join('\n');
    expect(prettyFormat(val)).toEqual('"' + val + '"');
  });

  it('prints a multiline string as value of object property', () => {
    const polyline = {
      props: {
        id: 'J',
        points: ['0.5,0.460', '0.5,0.875', '0.25,0.875'].join('\n'),
      },
      type: 'polyline',
    };
    const val = {
      props: {
        children: polyline,
      },
      type: 'svg',
    };
    expect(prettyFormat(val)).toEqual(
      [
        'Object {',
        '  "props": Object {',
        '    "children": Object {',
        '      "props": Object {',
        '        "id": "J",',
        '        "points": "0.5,0.460',
        '0.5,0.875',
        '0.25,0.875",',
        '      },',
        '      "type": "polyline",',
        '    },',
        '  },',
        '  "type": "svg",',
        '}',
      ].join('\n'),
    );
  });

  it('prints a symbol', () => {
    const val = Symbol('symbol');
    expect(prettyFormat(val)).toEqual('Symbol(symbol)');
  });

  it('prints undefined', () => {
    const val = undefined;
    expect(prettyFormat(val)).toEqual('undefined');
  });

  it('prints a WeakMap', () => {
    const val = new WeakMap();
    expect(prettyFormat(val)).toEqual('WeakMap {}');
  });

  it('prints a WeakSet', () => {
    const val = new WeakSet();
    expect(prettyFormat(val)).toEqual('WeakSet {}');
  });

  it('prints deeply nested objects', () => {
    const val = {prop: {prop: {prop: 'value'}}};
    expect(prettyFormat(val)).toEqual(
      'Object {\n  "prop": Object {\n    "prop": Object {\n      "prop": "value",\n    },\n  },\n}',
    );
  });

  it('prints circular references', () => {
    const val: any = {};
    val.prop = val;
    expect(prettyFormat(val)).toEqual('Object {\n  "prop": [Circular],\n}');
  });

  it('prints parallel references', () => {
    const inner = {};
    const val = {prop1: inner, prop2: inner};
    expect(prettyFormat(val)).toEqual(
      'Object {\n  "prop1": Object {},\n  "prop2": Object {},\n}',
    );
  });

  describe('indent option', () => {
    const val = [
      {
        id: '8658c1d0-9eda-4a90-95e1-8001e8eb6036',
        text: 'Add alternative serialize API for pretty-format plugins',
        type: 'ADD_TODO',
      },
      {
        id: '8658c1d0-9eda-4a90-95e1-8001e8eb6036',
        type: 'TOGGLE_TODO',
      },
    ];
    const expected = [
      'Array [',
      '  Object {',
      '    "id": "8658c1d0-9eda-4a90-95e1-8001e8eb6036",',
      '    "text": "Add alternative serialize API for pretty-format plugins",',
      '    "type": "ADD_TODO",',
      '  },',
      '  Object {',
      '    "id": "8658c1d0-9eda-4a90-95e1-8001e8eb6036",',
      '    "type": "TOGGLE_TODO",',
      '  },',
      ']',
    ].join('\n');
    test('default implicit: 2 spaces', () => {
      expect(prettyFormat(val)).toEqual(expected);
    });
    test('default explicit: 2 spaces', () => {
      expect(prettyFormat(val, {indent: 2})).toEqual(expected);
    });

    // Tests assume that no strings in val contain multiple adjacent spaces!
    test('non-default: 0 spaces', () => {
      const indent = 0;
      expect(prettyFormat(val, {indent})).toEqual(
        expected.replace(/ {2}/g, ' '.repeat(indent)),
      );
    });
    test('non-default: 4 spaces', () => {
      const indent = 4;
      expect(prettyFormat(val, {indent})).toEqual(
        expected.replace(/ {2}/g, ' '.repeat(indent)),
      );
    });
  });

  it('can customize the max depth', () => {
    const val = [
      {
        'arguments empty': returnArguments(),
        'arguments non-empty': returnArguments('arg'),
        'array literal empty': [],
        'array literal non-empty': ['item'],
        'extended array empty': new MyArray(),
        'map empty': new Map(),
        'map non-empty': new Map([['name', 'value']]),
        'object literal empty': {},
        'object literal non-empty': {name: 'value'},
        // @ts-ignore
        'object with constructor': new MyObject('value'),
        'object without constructor': Object.create(null),
        'set empty': new Set(),
        'set non-empty': new Set(['value']),
      },
    ];
    expect(prettyFormat(val, {maxDepth: 2})).toEqual(
      [
        'Array [',
        '  Object {',
        '    "arguments empty": [Arguments],',
        '    "arguments non-empty": [Arguments],',
        '    "array literal empty": [Array],',
        '    "array literal non-empty": [Array],',
        '    "extended array empty": [MyArray],',
        '    "map empty": [Map],',
        '    "map non-empty": [Map],',
        '    "object literal empty": [Object],',
        '    "object literal non-empty": [Object],',
        '    "object with constructor": [MyObject],',
        '    "object without constructor": [Object],',
        '    "set empty": [Set],',
        '    "set non-empty": [Set],',
        '  },',
        ']',
      ].join('\n'),
    );
  });

  it('throws on invalid options', () => {
    expect(() => {
      // @ts-ignore
      prettyFormat({}, {invalidOption: true});
    }).toThrow();
  });

  it('supports plugins', () => {
    class Foo {}

    expect(
      prettyFormat(new Foo(), {
        plugins: [
          {
            print: () => 'class Foo',
            test(object) {
              return object.constructor.name === 'Foo';
            },
          },
        ],
      }),
    ).toEqual('class Foo');
  });

  it('supports plugins that return empty string', () => {
    const val = {
      payload: '',
    };
    const options = {
      plugins: [
        {
          print(val: any) {
            return val.payload;
          },
          test(val: any) {
            return val && typeof val.payload === 'string';
          },
        },
      ],
    };
    expect(prettyFormat(val, options)).toEqual('');
  });

  it('throws if plugin does not return a string', () => {
    const val = 123;
    const options = {
      plugins: [
        {
          print(val: any) {
            return val;
          },
          test() {
            return true;
          },
        },
      ],
    };
    expect(() => {
      prettyFormat(val, options);
    }).toThrow();
  });

  it('throws PrettyFormatPluginError if test throws an error', () => {
    expect.hasAssertions();
    const options = {
      plugins: [
        {
          print: () => '',
          test() {
            throw new Error('Where is the error?');
          },
        },
      ],
    };

    try {
      prettyFormat('', options);
    } catch (error) {
      expect(error.name).toBe('PrettyFormatPluginError');
    }
  });

  it('throws PrettyFormatPluginError if print throws an error', () => {
    expect.hasAssertions();
    const options = {
      plugins: [
        {
          print: () => {
            throw new Error('Where is the error?');
          },
          test: () => true,
        },
      ],
    };

    try {
      prettyFormat('', options);
    } catch (error) {
      expect(error.name).toBe('PrettyFormatPluginError');
    }
  });

  it('throws PrettyFormatPluginError if serialize throws an error', () => {
    expect.hasAssertions();
    const options = {
      plugins: [
        {
          serialize: () => {
            throw new Error('Where is the error?');
          },
          test: () => true,
        },
      ],
    };

    try {
      prettyFormat('', options);
    } catch (error) {
      expect(error.name).toBe('PrettyFormatPluginError');
    }
  });

  it('supports plugins with deeply nested arrays (#24)', () => {
    const val = [[1, 2], [3, 4]];
    expect(
      prettyFormat(val, {
        plugins: [
          {
            print(val, print) {
              return val.map((item: any) => print(item)).join(' - ');
            },
            test(val) {
              return Array.isArray(val);
            },
          },
        ],
      }),
    ).toEqual('1 - 2 - 3 - 4');
  });

  it('should call plugins on nested basic values', () => {
    const val = {prop: 42};
    expect(
      prettyFormat(val, {
        plugins: [
          {
            print(_val, _print) {
              return '[called]';
            },
            test(val) {
              return typeof val === 'string' || typeof val === 'number';
            },
          },
        ],
      }),
    ).toEqual('Object {\n  [called]: [called],\n}');
  });

  it('prints objects with no constructor', () => {
    expect(prettyFormat(Object.create(null))).toEqual('Object {}');
  });

  it('prints identity-obj-proxy with string constructor', () => {
    const val = Object.create(null);
    val.constructor = 'constructor'; // mock the mock object :)
    const expected = [
      'Object {', // Object instead of undefined
      '  "constructor": "constructor",',
      '}',
    ].join('\n');
    expect(prettyFormat(val)).toEqual(expected);
  });

  it('calls toJSON and prints its return value', () => {
    expect(
      prettyFormat({
        toJSON: () => ({value: false}),
        value: true,
      }),
    ).toEqual('Object {\n  "value": false,\n}');
  });

  it('calls toJSON and prints an internal representation.', () => {
    expect(
      prettyFormat({
        toJSON: () => '[Internal Object]',
        value: true,
      }),
    ).toEqual('"[Internal Object]"');
  });

  it('calls toJSON only on functions', () => {
    expect(
      prettyFormat({
        toJSON: false,
        value: true,
      }),
    ).toEqual('Object {\n  "toJSON": false,\n  "value": true,\n}');
  });

  it('does not call toJSON recursively', () => {
    expect(
      prettyFormat({
        toJSON: () => ({toJSON: () => ({value: true})}),
        value: false,
      }),
    ).toEqual('Object {\n  "toJSON": [Function toJSON],\n}');
  });

  it('calls toJSON on Sets', () => {
    const set = new Set([1]);
    (set as any).toJSON = () => 'map';
    expect(prettyFormat(set)).toEqual('"map"');
  });

  it('disables toJSON calls through options', () => {
    const value = {apple: 'banana', toJSON: jest.fn(() => '1')};
    const name = value.toJSON.name || 'anonymous';
    const set = new Set([value]);
    (set as any).toJSON = jest.fn(() => 'map');
    expect(
      prettyFormat(set, {
        callToJSON: false,
      }),
    ).toEqual(
      'Set {\n  Object {\n    "apple": "banana",\n    "toJSON": [Function ' +
        name +
        '],\n  },\n}',
    );
    expect((set as any).toJSON).not.toBeCalled();
    expect(value.toJSON).not.toBeCalled();
  });

  describe('min', () => {
    it('prints some basic values in min mode', () => {
      const val = {
        boolean: [false, true],
        null: null,
        number: [0, -0, 123, -123, Infinity, -Infinity, NaN],
        string: ['', 'non-empty'],
        undefined,
      };
      expect(
        prettyFormat(val, {
          min: true,
        }),
      ).toEqual(
        '{' +
          [
            '"boolean": [false, true]',
            '"null": null',
            '"number": [0, -0, 123, -123, Infinity, -Infinity, NaN]',
            '"string": ["", "non-empty"]',
            '"undefined": undefined',
          ].join(', ') +
          '}',
      );
    });

    it('prints some complex values in min mode', () => {
      const val = {
        'arguments empty': returnArguments(),
        'arguments non-empty': returnArguments('arg'),
        'array literal empty': [],
        'array literal non-empty': ['item'],
        'extended array empty': new MyArray(),
        'map empty': new Map(),
        'map non-empty': new Map([['name', 'value']]),
        'object literal empty': {},
        'object literal non-empty': {name: 'value'},
        // @ts-ignore
        'object with constructor': new MyObject('value'),
        'object without constructor': Object.create(null),
        'set empty': new Set(),
        'set non-empty': new Set(['value']),
      };
      expect(
        prettyFormat(val, {
          min: true,
        }),
      ).toEqual(
        '{' +
          [
            '"arguments empty": []',
            '"arguments non-empty": ["arg"]',
            '"array literal empty": []',
            '"array literal non-empty": ["item"]',
            '"extended array empty": []',
            '"map empty": Map {}',
            '"map non-empty": Map {"name" => "value"}',
            '"object literal empty": {}',
            '"object literal non-empty": {"name": "value"}',
            '"object with constructor": {"name": "value"}',
            '"object without constructor": {}',
            '"set empty": Set {}',
            '"set non-empty": Set {"value"}',
          ].join(', ') +
          '}',
      );
    });

    it('does not allow indent !== 0 in min mode', () => {
      expect(() => {
        prettyFormat(1, {indent: 1, min: true});
      }).toThrow();
    });
  });
});
