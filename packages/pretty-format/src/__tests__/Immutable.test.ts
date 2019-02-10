/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import Immutable from 'immutable';

import setPrettyPrint from './setPrettyPrint';
import prettyFormat from '..';

const {Immutable: ImmutablePlugin, ReactElement} = prettyFormat.plugins;

setPrettyPrint([ReactElement, ImmutablePlugin]);

it('does not incorrectly match identity-obj-proxy as Immutable object', () => {
  // SENTINEL constant is from https://github.com/facebook/immutable-js
  const IS_ITERABLE_SENTINEL = '@@__IMMUTABLE_ITERABLE__@@';
  const val: any = {};
  val[IS_ITERABLE_SENTINEL] = IS_ITERABLE_SENTINEL; // mock the mock object :)
  const expected = `{"${IS_ITERABLE_SENTINEL}": "${IS_ITERABLE_SENTINEL}"}`;
  expect(val).toPrettyPrintTo(expected, {min: true});
});

describe('Immutable.OrderedSet', () => {
  it('supports an empty collection {min: true}', () => {
    expect(Immutable.OrderedSet([])).toPrettyPrintTo(
      'Immutable.OrderedSet []',
      {min: true},
    );
  });

  it('supports an empty collection {min: false}', () => {
    expect(Immutable.OrderedSet([])).toPrettyPrintTo(
      'Immutable.OrderedSet []',
      {min: false},
    );
  });

  it('supports a single string element', () => {
    expect(Immutable.OrderedSet(['foo'])).toPrettyPrintTo(
      'Immutable.OrderedSet ["foo"]',
      {min: true},
    );
  });

  it('supports a single integer element', () => {
    expect(Immutable.OrderedSet([1])).toPrettyPrintTo(
      'Immutable.OrderedSet [1]',
      {min: true},
    );
  });

  it('supports multiple string elements {min: true}', () => {
    expect(Immutable.OrderedSet(['jhon', 'mike', 'cristian'])).toPrettyPrintTo(
      'Immutable.OrderedSet ["jhon", "mike", "cristian"]',
      {
        min: true,
      },
    );
  });

  it('supports multiple string elements {min: false}', () => {
    expect(Immutable.OrderedSet(['jhon', 'mike', 'cristian'])).toPrettyPrintTo(
      'Immutable.OrderedSet [\n  "jhon",\n  "mike",\n  "cristian",\n]',
      {min: false},
    );
  });

  it('supports multiple integer elements {min: true}', () => {
    expect(Immutable.OrderedSet([1, 2, 3])).toPrettyPrintTo(
      'Immutable.OrderedSet [1, 2, 3]',
      {min: true},
    );
  });

  it('supports multiple integer elements {min: false}', () => {
    expect(Immutable.OrderedSet([1, 2, 3])).toPrettyPrintTo(
      'Immutable.OrderedSet [\n  1,\n  2,\n  3,\n]',
      {
        min: false,
      },
    );
  });

  it('supports object elements {min: true}', () => {
    expect(Immutable.OrderedSet([{a: 1, b: 2, c: 3}])).toPrettyPrintTo(
      'Immutable.OrderedSet [{"a": 1, "b": 2, "c": 3}]',
      {
        min: true,
      },
    );
  });

  it('supports object elements {min: false}', () => {
    expect(Immutable.OrderedSet([{a: 1, b: 2, c: 3}])).toPrettyPrintTo(
      'Immutable.OrderedSet [\n  Object {\n    "a": 1,\n    "b": 2,\n    "c": 3,\n  },\n]',
      {min: false},
    );
  });

  it('supports React elements {min: true}', () => {
    const reactElement = React.createElement('Mouse', null, 'Hello World');
    expect(Immutable.OrderedSet([reactElement, reactElement])).toPrettyPrintTo(
      'Immutable.OrderedSet [<Mouse>Hello World</Mouse>]',
      {
        min: true,
      },
    );
  });

  it('supports React elements {min: false}', () => {
    const reactElement = React.createElement('Mouse', null, 'Hello World');
    expect(Immutable.OrderedSet([reactElement, reactElement])).toPrettyPrintTo(
      'Immutable.OrderedSet [\n  <Mouse>\n    Hello World\n  </Mouse>,\n]',
      {min: false},
    );
  });
});

describe('Immutable.List', () => {
  it('supports an empty collection {min: true}', () => {
    expect(Immutable.List([])).toPrettyPrintTo('Immutable.List []', {
      min: true,
    });
  });

  it('supports an empty collection {min: false}', () => {
    expect(Immutable.List([])).toPrettyPrintTo('Immutable.List []', {
      min: false,
    });
  });

  it('supports a single string element', () => {
    expect(Immutable.List(['foo'])).toPrettyPrintTo('Immutable.List ["foo"]', {
      min: true,
    });
  });

  it('supports a single integer element', () => {
    expect(Immutable.List([1])).toPrettyPrintTo('Immutable.List [1]', {
      min: true,
    });
  });

  it('supports multiple string elements {min: true}', () => {
    expect(Immutable.List(['jhon', 'mike', 'cristian'])).toPrettyPrintTo(
      'Immutable.List ["jhon", "mike", "cristian"]',
      {
        min: true,
      },
    );
  });

  it('supports multiple string elements {min: false}', () => {
    expect(Immutable.List(['jhon', 'mike', 'cristian'])).toPrettyPrintTo(
      'Immutable.List [\n  "jhon",\n  "mike",\n  "cristian",\n]',
    );
  });

  it('supports multiple integer elements {min: true}', () => {
    expect(Immutable.List([1, 2, 3])).toPrettyPrintTo(
      'Immutable.List [1, 2, 3]',
      {min: true},
    );
  });

  it('supports multiple integer elements {min: false}', () => {
    expect(Immutable.List([1, 2, 3])).toPrettyPrintTo(
      'Immutable.List [\n  1,\n  2,\n  3,\n]',
    );
  });

  it('supports object elements {min: true}', () => {
    expect(Immutable.List([{a: 1, b: 2, c: 3}])).toPrettyPrintTo(
      'Immutable.List [{"a": 1, "b": 2, "c": 3}]',
      {min: true},
    );
  });

  it('supports object elements {min: false}', () => {
    expect(Immutable.List([{a: 1, b: 2, c: 3}])).toPrettyPrintTo(
      'Immutable.List [\n  Object {\n    "a": 1,\n    "b": 2,\n    "c": 3,\n  },\n]',
    );
  });

  it('supports React elements {min: true}', () => {
    const reactElement = React.createElement('Mouse', null, 'Hello World');
    expect(Immutable.List([reactElement, reactElement])).toPrettyPrintTo(
      'Immutable.List [<Mouse>Hello World</Mouse>, <Mouse>Hello World</Mouse>]',
      {min: true},
    );
  });

  it('supports React elements {min: false}', () => {
    const reactElement = React.createElement('Mouse', null, 'Hello World');
    expect(Immutable.List([reactElement, reactElement])).toPrettyPrintTo(
      'Immutable.List [\n  <Mouse>\n    Hello World\n  </Mouse>,\n  <Mouse>\n    Hello World\n  </Mouse>,\n]',
    );
  });
});

describe('Immutable.Stack', () => {
  it('supports an empty collection {min: true}', () => {
    expect(Immutable.Stack([])).toPrettyPrintTo('Immutable.Stack []', {
      min: true,
    });
  });

  it('supports an empty collection {min: false}', () => {
    expect(Immutable.Stack([])).toPrettyPrintTo('Immutable.Stack []', {
      min: false,
    });
  });

  it('supports a single string element', () => {
    expect(Immutable.Stack(['foo'])).toPrettyPrintTo(
      'Immutable.Stack ["foo"]',
      {min: true},
    );
  });

  it('supports a single integer element', () => {
    expect(Immutable.Stack([1])).toPrettyPrintTo('Immutable.Stack [1]', {
      min: true,
    });
  });

  it('supports multiple string elements {min: true}', () => {
    expect(Immutable.Stack(['jhon', 'mike', 'cristian'])).toPrettyPrintTo(
      'Immutable.Stack ["jhon", "mike", "cristian"]',
      {
        min: true,
      },
    );
  });

  it('supports multiple string elements {min: false}', () => {
    expect(Immutable.Stack(['jhon', 'mike', 'cristian'])).toPrettyPrintTo(
      'Immutable.Stack [\n  "jhon",\n  "mike",\n  "cristian",\n]',
    );
  });

  it('supports multiple integer elements {min: true}', () => {
    expect(Immutable.Stack([1, 2, 3])).toPrettyPrintTo(
      'Immutable.Stack [1, 2, 3]',
      {min: true},
    );
  });

  it('supports multiple integer elements {min: false}', () => {
    expect(Immutable.Stack([1, 2, 3])).toPrettyPrintTo(
      'Immutable.Stack [\n  1,\n  2,\n  3,\n]',
    );
  });

  it('supports object elements {min: true}', () => {
    expect(Immutable.Stack([{a: 1, b: 2, c: 3}])).toPrettyPrintTo(
      'Immutable.Stack [{"a": 1, "b": 2, "c": 3}]',
      {
        min: true,
      },
    );
  });

  it('supports object elements {min: false}', () => {
    expect(Immutable.Stack([{a: 1, b: 2, c: 3}])).toPrettyPrintTo(
      'Immutable.Stack [\n  Object {\n    "a": 1,\n    "b": 2,\n    "c": 3,\n  },\n]',
    );
  });

  it('supports React elements {min: true}', () => {
    const reactElement = React.createElement('Mouse', null, 'Hello World');
    expect(Immutable.Stack([reactElement, reactElement])).toPrettyPrintTo(
      'Immutable.Stack [<Mouse>Hello World</Mouse>, <Mouse>Hello World</Mouse>]',
      {min: true},
    );
  });

  it('supports React elements {min: false}', () => {
    const reactElement = React.createElement('Mouse', null, 'Hello World');
    expect(Immutable.Stack([reactElement, reactElement])).toPrettyPrintTo(
      'Immutable.Stack [\n  <Mouse>\n    Hello World\n  </Mouse>,\n  <Mouse>\n    Hello World\n  </Mouse>,\n]',
    );
  });
});

describe('Immutable.Set', () => {
  it('supports an empty collection {min: true}', () => {
    expect(Immutable.Set([])).toPrettyPrintTo('Immutable.Set []', {min: true});
  });

  it('supports an empty collection {min: false}', () => {
    expect(Immutable.Set([])).toPrettyPrintTo('Immutable.Set []', {
      min: false,
    });
  });

  it('supports a single string element', () => {
    expect(Immutable.Set(['foo'])).toPrettyPrintTo('Immutable.Set ["foo"]', {
      min: true,
    });
  });

  it('supports a single integer element', () => {
    expect(Immutable.Set([1])).toPrettyPrintTo('Immutable.Set [1]', {
      min: true,
    });
  });

  it('supports multiple string elements {min: true}', () => {
    expect(Immutable.Set(['jhon', 'mike', 'cristian'])).toPrettyPrintTo(
      'Immutable.Set ["jhon", "mike", "cristian"]',
      {
        min: true,
      },
    );
  });

  it('supports multiple string elements {min: false}', () => {
    expect(Immutable.Set(['jhon', 'mike', 'cristian'])).toPrettyPrintTo(
      'Immutable.Set [\n  "jhon",\n  "mike",\n  "cristian",\n]',
    );
  });

  it('supports multiple integer elements {min: true}', () => {
    expect(Immutable.Set([1, 2, 3])).toPrettyPrintTo(
      'Immutable.Set [1, 2, 3]',
      {min: true},
    );
  });

  it('supports multiple integer elements {min: false}', () => {
    expect(Immutable.Set([1, 2, 3])).toPrettyPrintTo(
      'Immutable.Set [\n  1,\n  2,\n  3,\n]',
    );
  });

  it('supports object elements {min: true}', () => {
    expect(Immutable.Set([{a: 1, b: 2, c: 3}])).toPrettyPrintTo(
      'Immutable.Set [{"a": 1, "b": 2, "c": 3}]',
      {min: true},
    );
  });

  it('supports object elements {min: false}', () => {
    expect(Immutable.Set([{a: 1, b: 2, c: 3}])).toPrettyPrintTo(
      'Immutable.Set [\n  Object {\n    "a": 1,\n    "b": 2,\n    "c": 3,\n  },\n]',
    );
  });

  it('supports React elements {min: true}', () => {
    const reactElement = React.createElement('Mouse', null, 'Hello World');
    expect(Immutable.Set([reactElement, reactElement])).toPrettyPrintTo(
      'Immutable.Set [<Mouse>Hello World</Mouse>]',
      {
        min: true,
      },
    );
  });

  it('supports React elements {min: false}', () => {
    const reactElement = React.createElement('Mouse', null, 'Hello World');
    expect(Immutable.Set([reactElement, reactElement])).toPrettyPrintTo(
      'Immutable.Set [\n  <Mouse>\n    Hello World\n  </Mouse>,\n]',
    );
  });
});

describe('Immutable.Map', () => {
  it('supports an empty collection {min: true}', () => {
    expect(Immutable.Map({})).toPrettyPrintTo('Immutable.Map {}', {min: true});
  });

  it('supports an empty collection {min: false}', () => {
    expect(Immutable.Map({})).toPrettyPrintTo('Immutable.Map {}', {
      min: false,
    });
  });

  it('supports an object with single key', () => {
    expect(Immutable.Map({a: 1})).toPrettyPrintTo('Immutable.Map {"a": 1}', {
      min: true,
    });
  });

  it('supports an object with multiple keys {min: true}', () => {
    expect(Immutable.Map({a: 1, b: 2, c: 3})).toPrettyPrintTo(
      'Immutable.Map {"a": 1, "b": 2, "c": 3}',
      {min: true},
    );
  });

  it('supports an object with multiple keys {min: false}', () => {
    expect(Immutable.Map({a: 1, b: 2, c: 3})).toPrettyPrintTo(
      'Immutable.Map {\n  "a": 1,\n  "b": 2,\n  "c": 3,\n}',
    );
  });

  it('supports object elements {min: true}', () => {
    expect(Immutable.Map({key: {a: 1, b: 2, c: 3}})).toPrettyPrintTo(
      'Immutable.Map {"key": {"a": 1, "b": 2, "c": 3}}',
      {
        min: true,
      },
    );
  });

  it('supports object elements {min: false}', () => {
    expect(Immutable.Map({key: {a: 1, b: 2, c: 3}})).toPrettyPrintTo(
      'Immutable.Map {\n  "key": Object {\n    "a": 1,\n    "b": 2,\n    "c": 3,\n  },\n}',
    );
  });

  it('supports React elements {min: true}', () => {
    const reactElement = React.createElement('Mouse', null, 'Hello World');
    expect(Immutable.Map({a: reactElement, b: reactElement})).toPrettyPrintTo(
      'Immutable.Map {"a": <Mouse>Hello World</Mouse>, "b": <Mouse>Hello World</Mouse>}',
      {min: true},
    );
  });

  it('supports React elements {min: false}', () => {
    const reactElement = React.createElement('Mouse', null, 'Hello World');
    expect(Immutable.Map({a: reactElement, b: reactElement})).toPrettyPrintTo(
      'Immutable.Map {\n  "a": <Mouse>\n    Hello World\n  </Mouse>,\n  "b": <Mouse>\n    Hello World\n  </Mouse>,\n}',
    );
  });
});

describe('Immutable.OrderedMap', () => {
  it('supports an empty collection {min: true}', () => {
    expect(Immutable.OrderedMap({})).toPrettyPrintTo(
      'Immutable.OrderedMap {}',
      {min: true},
    );
  });

  it('supports an empty collection {min: false}', () => {
    expect(Immutable.OrderedMap({})).toPrettyPrintTo(
      'Immutable.OrderedMap {}',
      {min: false},
    );
  });

  it('supports an object with single key', () => {
    expect(Immutable.OrderedMap({a: 1})).toPrettyPrintTo(
      'Immutable.OrderedMap {"a": 1}',
      {min: true},
    );
  });

  it('supports an object with multiple keys {min: true}', () => {
    expect(Immutable.OrderedMap({a: 1, b: 2, c: 3})).toPrettyPrintTo(
      'Immutable.OrderedMap {"a": 1, "b": 2, "c": 3}',
      {
        min: true,
      },
    );
  });

  it('supports an object with multiple keys {min: false}', () => {
    expect(Immutable.OrderedMap({a: 1, b: 2, c: 3})).toPrettyPrintTo(
      'Immutable.OrderedMap {\n  "a": 1,\n  "b": 2,\n  "c": 3,\n}',
    );
  });

  it('supports object elements {min: true}', () => {
    expect(Immutable.OrderedMap({key: {a: 1, b: 2, c: 3}})).toPrettyPrintTo(
      'Immutable.OrderedMap {"key": {"a": 1, "b": 2, "c": 3}}',
      {
        min: true,
      },
    );
  });

  it('supports object elements {min: false}', () => {
    expect(Immutable.OrderedMap({key: {a: 1, b: 2, c: 3}})).toPrettyPrintTo(
      'Immutable.OrderedMap {\n  "key": Object {\n    "a": 1,\n    "b": 2,\n    "c": 3,\n  },\n}',
    );
  });

  it('supports React elements {min: true}', () => {
    const reactElement = React.createElement('Mouse', null, 'Hello World');
    expect(
      Immutable.OrderedMap({a: reactElement, b: reactElement}),
    ).toPrettyPrintTo(
      'Immutable.OrderedMap {"a": <Mouse>Hello World</Mouse>, "b": <Mouse>Hello World</Mouse>}',
      {min: true},
    );
  });

  it('supports React elements {min: false}', () => {
    const reactElement = React.createElement('Mouse', null, 'Hello World');
    expect(
      Immutable.OrderedMap({a: reactElement, b: reactElement}),
    ).toPrettyPrintTo(
      'Immutable.OrderedMap {\n  "a": <Mouse>\n    Hello World\n  </Mouse>,\n  "b": <Mouse>\n    Hello World\n  </Mouse>,\n}',
    );
  });

  it('supports non-string keys', () => {
    const val = Immutable.OrderedMap<any, any>([
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
      [Immutable.Map({key: 'value'}), 'immutable map'],
    ]);
    const expected = [
      'Immutable.OrderedMap {',
      '  false: "boolean",',
      '  "false": "string",',
      '  0: "number",',
      '  "0": "string",',
      '  null: "null",',
      '  "null": "string",',
      '  undefined: "undefined",',
      '  "undefined": "string",',
      '  Symbol(description): "symbol",',
      '  "Symbol(description)": "string",',
      '  Array [',
      '    "array",',
      '    "key",',
      '  ]: "array",',
      '  Object {',
      '    "key": "value",',
      '  }: "object",',
      '  Immutable.Map {',
      '    "key": "value",',
      '  }: "immutable map",',
      '}',
    ].join('\n');
    expect(val).toPrettyPrintTo(expected);
  });
});

describe('Immutable.Record', () => {
  it('supports an empty record {min: true}', () => {
    const ABRecord = Immutable.Record({}, 'ABRecord');

    expect(ABRecord()).toPrettyPrintTo('Immutable.ABRecord {}', {
      min: true,
    });
  });

  it('supports an empty record {min: false}', () => {
    const ABRecord = Immutable.Record({}, 'ABRecord');

    expect(ABRecord()).toPrettyPrintTo('Immutable.ABRecord {}', {
      min: false,
    });
  });

  it('supports a record with descriptive name', () => {
    const ABRecord = Immutable.Record({a: 1, b: 2}, 'ABRecord');

    expect(ABRecord()).toPrettyPrintTo('Immutable.ABRecord {"a": 1, "b": 2}', {
      min: true,
    });
  });

  it('supports a record without descriptive name', () => {
    const ABRecord = Immutable.Record({a: 1, b: 2});

    expect(ABRecord()).toPrettyPrintTo('Immutable.Record {"a": 1, "b": 2}', {
      min: true,
    });
  });

  it('supports a record with values {min: true}', () => {
    const ABRecord = Immutable.Record({a: 1, b: 2}, 'ABRecord');

    expect(ABRecord({a: 3, b: 4})).toPrettyPrintTo(
      'Immutable.ABRecord {"a": 3, "b": 4}',
      {min: true},
    );
  });

  it('supports a record with values {min: false}', () => {
    const ABRecord = Immutable.Record({a: 1, b: 2}, 'ABRecord');

    expect(ABRecord({a: 3, b: 4})).toPrettyPrintTo(
      'Immutable.ABRecord {\n  "a": 3,\n  "b": 4,\n}',
    );
  });

  it('supports a record with Map value {min: true}', () => {
    const ABRecord = Immutable.Record(
      {a: Immutable.Map({c: 1}), b: 2},
      'ABRecord',
    );

    expect(ABRecord()).toPrettyPrintTo(
      'Immutable.ABRecord {"a": Immutable.Map {"c": 1}, "b": 2}',
      {
        min: true,
      },
    );
  });

  it('supports a record with Map value {min: false}', () => {
    const ABRecord = Immutable.Record(
      {a: Immutable.Map({c: 1}), b: 2},
      'ABRecord',
    );

    expect(ABRecord()).toPrettyPrintTo(
      'Immutable.ABRecord {\n  "a": Immutable.Map {\n    "c": 1,\n  },\n  "b": 2,\n}',
    );
  });

  it('supports imbricated Record {min: true}', () => {
    const CDRecord = Immutable.Record({c: 3, d: 4}, 'CDRecord');
    const ABRecord = Immutable.Record({a: CDRecord(), b: 2}, 'ABRecord');

    expect(ABRecord()).toPrettyPrintTo(
      'Immutable.ABRecord {"a": Immutable.CDRecord {"c": 3, "d": 4}, "b": 2}',
      {min: true},
    );
  });

  it('supports imbricated Record {min: false}', () => {
    const CDRecord = Immutable.Record({c: 3, d: 4}, 'CDRecord');
    const ABRecord = Immutable.Record({a: CDRecord(), b: 2}, 'ABRecord');

    expect(ABRecord()).toPrettyPrintTo(
      'Immutable.ABRecord {\n  "a": Immutable.CDRecord {\n    "c": 3,\n    "d": 4,\n  },\n  "b": 2,\n}',
    );
  });
});

describe('indentation of heterogeneous collections', () => {
  // Don’t interpret tests that pretty-format and plugins are compatible
  // as recommendation to compose immutable and non-immutable collections.
  test('empty Immutable.List as child of Object', () => {
    const val = {
      filter: 'all',
      todos: Immutable.List([]),
    };
    expect(val).toPrettyPrintTo(
      [
        'Object {',
        '  "filter": "all",',
        '  "todos": Immutable.List [],',
        '}',
      ].join('\n'),
    );
  });
  test('empty Immutable.Map as child of Array', () => {
    const val = [Immutable.Map({})];
    expect(val).toPrettyPrintTo(
      ['Array [', '  Immutable.Map {},', ']'].join('\n'),
    );
  });

  test('non-empty Array as child of Immutable.Map', () => {
    const val = Immutable.Map({
      filter: 'completed',
      todos: [
        Immutable.Map({
          completed: true,
          text: 'Replace print with serialize',
        }),
      ],
    });
    expect(val).toPrettyPrintTo(
      [
        'Immutable.Map {',
        '  "filter": "completed",',
        '  "todos": Array [',
        '    Immutable.Map {',
        '      "completed": true,',
        '      "text": "Replace print with serialize",',
        '    },',
        '  ],',
        '}',
      ].join('\n'),
    );
  });
  test('non-empty Object as child of Immutable.List', () => {
    const val = Immutable.List([
      {
        completed: true,
        text: 'Replace print with serialize',
      },
    ]);
    expect(val).toPrettyPrintTo(
      [
        'Immutable.List [',
        '  Object {',
        '    "completed": true,',
        '    "text": "Replace print with serialize",',
        '  },',
        ']',
      ].join('\n'),
    );
  });
});

describe('indent option', () => {
  const val = Immutable.Map({
    filter: 'completed',
    todos: Immutable.List([
      Immutable.Map({
        completed: true,
        text: 'Replace print with serialize',
      }),
      Immutable.Map({
        completed: false,
        text: 'Return if depth exceeds max',
      }),
    ]),
  });
  const expected = [
    'Immutable.Map {',
    '  "filter": "completed",',
    '  "todos": Immutable.List [',
    '    Immutable.Map {',
    '      "completed": true,',
    '      "text": "Replace print with serialize",',
    '    },',
    '    Immutable.Map {',
    '      "completed": false,',
    '      "text": "Return if depth exceeds max",',
    '    },',
    '  ],',
    '}',
  ].join('\n');
  test('default implicit: 2 spaces', () => {
    expect(val).toPrettyPrintTo(expected);
  });
  test('default explicit: 2 spaces', () => {
    expect(val).toPrettyPrintTo(expected, {indent: 2});
  });

  // Tests assume that no strings in val contain multiple adjacent spaces!
  test('non-default: 0 spaces', () => {
    const indent = 0;
    expect(val).toPrettyPrintTo(expected.replace(/ {2}/g, ' '.repeat(indent)), {
      indent,
    });
  });
  test('non-default: 4 spaces', () => {
    const indent = 4;
    expect(val).toPrettyPrintTo(expected.replace(/ {2}/g, ' '.repeat(indent)), {
      indent,
    });
  });
});

describe('maxDepth option', () => {
  // Don’t interpret tests that pretty-format and plugins are compatible
  // as recommendation to compose immutable and non-immutable collections.
  test('Immutable.List as child of Object', () => {
    const val = {
      // ++depth === 1
      filter: 'all',
      todos: Immutable.List([
        Immutable.Map({
          completed: true,
          text: 'Return if depth exceeds max',
        }),
      ]),
    };
    const expected = [
      'Object {',
      '  "filter": "all",',
      '  "todos": [Immutable.List],',
      '}',
    ].join('\n');
    expect(val).toPrettyPrintTo(expected, {maxDepth: 1});
  });
  test('Immutable.Map as child of Array', () => {
    const val = [
      // ++depth === 1
      Immutable.Map({
        completed: false,
        text: 'Return if depth exceeds max',
      }),
    ];
    const expected = ['Array [', '  [Immutable.Map],', ']'].join('\n');
    expect(val).toPrettyPrintTo(expected, {maxDepth: 1});
  });

  test('Immutable.Seq as child of Immutable.Map', () => {
    const val = {
      // ++depth === 1
      filter: 'all',
      todos: Immutable.Seq(
        Immutable.List([
          Immutable.Map({
            completed: true,
            text: 'Return if depth exceeds max',
          }),
        ]),
      ),
    };
    const expected = [
      'Object {',
      '  "filter": "all",',
      '  "todos": [Immutable.Seq],',
      '}',
    ].join('\n');
    expect(val).toPrettyPrintTo(expected, {maxDepth: 1});
  });
  test('Immutable.Map as descendants in immutable collection', () => {
    const val = Immutable.Map({
      // ++depth === 1
      filter: 'uncompleted',
      todos: Immutable.List([
        // ++depth === 2
        Immutable.Map({
          // ++depth === 3
          completed: true,
          text: 'Replace print with serialize',
        }),
        Immutable.Map({
          // ++depth === 3
          completed: true,
          text: 'Return if depth exceeds max',
        }),
      ]),
    });
    const expected = [
      'Immutable.Map {',
      '  "filter": "uncompleted",',
      '  "todos": Immutable.List [',
      '    [Immutable.Map],',
      '    [Immutable.Map],',
      '  ],',
      '}',
    ].join('\n');
    expect(val).toPrettyPrintTo(expected, {maxDepth: 2});
  });
});

describe('Immutable.Seq', () => {
  it('supports an empty sequence from array {min: true}', () => {
    expect(Immutable.Seq([])).toPrettyPrintTo('Immutable.Seq []', {min: true});
  });
  it('supports an empty sequence from array {min: false}', () => {
    expect(Immutable.Seq([])).toPrettyPrintTo('Immutable.Seq []', {min: false});
  });
  it('supports a non-empty sequence from array {min: true}', () => {
    expect(Immutable.Seq([0, 1, 2])).toPrettyPrintTo(
      'Immutable.Seq [0, 1, 2]',
      {min: true},
    );
  });
  it('supports a non-empty sequence from array {min: false}', () => {
    expect(Immutable.Seq([0, 1, 2])).toPrettyPrintTo(
      'Immutable.Seq [\n  0,\n  1,\n  2,\n]',
      {min: false},
    );
  });

  it('supports a non-empty sequence from arguments', () => {
    function returnArguments(..._args: Array<any>) {
      return arguments;
    }
    expect(Immutable.Seq(returnArguments(0, 1, 2))).toPrettyPrintTo(
      'Immutable.Seq [\n  0,\n  1,\n  2,\n]',
    );
  });

  it('supports an empty sequence from object {min: true}', () => {
    expect(Immutable.Seq({})).toPrettyPrintTo('Immutable.Seq {}', {min: true});
  });
  it('supports an empty sequence from object {min: false}', () => {
    expect(Immutable.Seq({})).toPrettyPrintTo('Immutable.Seq {}', {min: false});
  });
  it('supports a non-empty sequence from object {min: true}', () => {
    expect(Immutable.Seq({key: 'value'})).toPrettyPrintTo(
      'Immutable.Seq {"key": "value"}',
      {
        min: true,
      },
    );
  });
  it('supports a non-empty sequence from object {min: false}', () => {
    expect(Immutable.Seq({key: 'value'})).toPrettyPrintTo(
      'Immutable.Seq {\n  "key": "value",\n}',
      {
        min: false,
      },
    );
  });

  it('supports a sequence of entries from Immutable.Map', () => {
    expect(Immutable.Seq(Immutable.Map({key: 'value'}))).toPrettyPrintTo(
      'Immutable.Seq {\n  "key": "value",\n}',
    );
  });

  it('supports a sequence of values from ECMAScript Set', () => {
    expect(Immutable.Seq(new Set([0, 1, 2]))).toPrettyPrintTo(
      'Immutable.Seq [\n  0,\n  1,\n  2,\n]',
    );
  });
  it('supports a sequence of values from Immutable.List', () => {
    expect(Immutable.Seq(Immutable.List([0, 1, 2]))).toPrettyPrintTo(
      'Immutable.Seq [\n  0,\n  1,\n  2,\n]',
    );
  });
  it('supports a sequence of values from Immutable.Set', () => {
    expect(Immutable.Seq(Immutable.Set([0, 1, 2]))).toPrettyPrintTo(
      'Immutable.Seq [\n  0,\n  1,\n  2,\n]',
    );
  });
  it('supports a sequence of values from Immutable.Stack', () => {
    expect(Immutable.Seq(Immutable.Stack([0, 1, 2]))).toPrettyPrintTo(
      'Immutable.Seq [\n  0,\n  1,\n  2,\n]',
    );
  });
});

describe('Immutable.Seq lazy entries', () => {
  const expected = 'Immutable.Seq {…}';
  const object = {key0: '', key1: '1'};
  const filterer = (value: string) => value.length !== 0;

  // undefined size confirms correct criteria for lazy Seq
  test('from object properties', () => {
    const val = Immutable.Seq(object).filter(filterer);
    expect(val.size).toBeUndefined();
    expect(val).toPrettyPrintTo(expected);
  });
  test('from Immutable.Map entries', () => {
    const val = Immutable.Seq(Immutable.Map(object)).filter(filterer);
    expect(val.size).toBeUndefined();
    expect(val).toPrettyPrintTo(expected);
  });
});

describe('Immutable.Seq lazy values', () => {
  const expected = 'Immutable.Seq […]';
  const array = ['', '1', '22'];
  const filterer = (item: string) => item.length !== 0;

  test('from Immutable.Range', () => {
    const val = Immutable.Range(1, Infinity);
    expect(val.size).toBe(Infinity);
    expect(val).toPrettyPrintTo(expected);
  });

  // undefined size confirms correct criteria for lazy Seq
  test('from iterator', () => {
    function returnIterator(values: Array<string>) {
      let i = 0;
      return {
        next() {
          return i < values.length
            ? {done: false, value: values[i++]}
            : {done: true};
        },
      };
    }
    const val = Immutable.Seq(returnIterator(array));
    expect(val.size).toBeUndefined();
    expect(val).toPrettyPrintTo(expected);
  });
  test('from array items', () => {
    const val = Immutable.Seq(array).filter(filterer);
    expect(val.size).toBeUndefined();
    expect(val).toPrettyPrintTo(expected);
  });
  test('from Immutable.List values', () => {
    const val = Immutable.Seq(Immutable.List(array)).filter(filterer);
    expect(val.size).toBeUndefined();
    expect(val).toPrettyPrintTo(expected);
  });
  test('from ECMAScript Set values', () => {
    const val = Immutable.Seq(new Set(array)).filter(filterer);
    expect(val.size).toBeUndefined();
    expect(val).toPrettyPrintTo(expected);
  });
});
