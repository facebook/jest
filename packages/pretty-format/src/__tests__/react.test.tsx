/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import renderer from 'react-test-renderer';

import prettyFormat from '..';
import {OptionsReceived} from '../types';

const elementSymbol = Symbol.for('react.element');
const fragmentSymbol = Symbol.for('react.fragment');
const testSymbol = Symbol.for('react.test.json');
const {ReactElement, ReactTestComponent} = prettyFormat.plugins;

const formatElement = (element: any, options?: OptionsReceived) =>
  prettyFormat(element, {plugins: [ReactElement], ...options});

const formatTestObject = (object: any, options?: OptionsReceived) =>
  prettyFormat(object, {
    plugins: [ReactTestComponent, ReactElement],
    ...options,
  });

function assertPrintedJSX(
  val: any,
  expected: string,
  options?: OptionsReceived,
) {
  expect(formatElement(val, options)).toEqual(expected);
  expect(formatTestObject(renderer.create(val).toJSON(), options)).toEqual(
    expected,
  );
}

test('supports a single element with no props or children', () => {
  assertPrintedJSX(React.createElement('Mouse'), '<Mouse />');
});

test('supports a single element with non-empty string child', () => {
  assertPrintedJSX(
    React.createElement('Mouse', null, 'Hello World'),
    '<Mouse>\n  Hello World\n</Mouse>',
  );
});

test('supports a single element with empty string child', () => {
  assertPrintedJSX(
    React.createElement('Mouse', null, ''),
    '<Mouse>\n  \n</Mouse>',
  );
});

test('supports a single element with non-zero number child', () => {
  assertPrintedJSX(
    React.createElement('Mouse', null, 4),
    '<Mouse>\n  4\n</Mouse>',
  );
});

test('supports a single element with zero number child', () => {
  assertPrintedJSX(
    React.createElement('Mouse', null, 0),
    '<Mouse>\n  0\n</Mouse>',
  );
});

test('supports a single element with mixed children', () => {
  assertPrintedJSX(
    React.createElement('Mouse', null, [[1, null], 2, undefined, [false, [3]]]),
    '<Mouse>\n  1\n  2\n  3\n</Mouse>',
  );
});

test('supports props with strings', () => {
  assertPrintedJSX(
    React.createElement('Mouse', {style: 'color:red'}),
    '<Mouse\n  style="color:red"\n/>',
  );
});

test('supports props with multiline strings', () => {
  const val = React.createElement(
    'svg',
    null,
    React.createElement('polyline', {
      id: 'J',
      points: ['0.5,0.460', '0.5,0.875', '0.25,0.875'].join('\n'),
    }),
  );
  const expected = [
    '<svg>',
    '  <polyline',
    '    id="J"',
    '    points="0.5,0.460',
    '0.5,0.875',
    '0.25,0.875"',
    '  />',
    '</svg>',
  ].join('\n');
  assertPrintedJSX(val, expected);
});

test('supports props with numbers', () => {
  assertPrintedJSX(
    React.createElement('Mouse', {size: 5}),
    '<Mouse\n  size={5}\n/>',
  );
});

test('supports a single element with a function prop', () => {
  assertPrintedJSX(
    React.createElement<{onclick: any}>('Mouse', {
      onclick: function onclick() {},
    }),
    '<Mouse\n  onclick={[Function onclick]}\n/>',
  );
});

test('supports a single element with a object prop', () => {
  assertPrintedJSX(
    React.createElement('Mouse', {customProp: {one: '1', two: 2}}),
    '<Mouse\n  customProp={\n    Object {\n      "one": "1",\n      "two": 2,\n    }\n  }\n/>',
  );
});

test('supports an element with and object prop and children', () => {
  assertPrintedJSX(
    React.createElement(
      'Mouse',
      {customProp: {one: '1', two: 2}},
      React.createElement('Mouse'),
    ),
    '<Mouse\n  customProp={\n    Object {\n      "one": "1",\n      "two": 2,\n    }\n  }\n>\n  <Mouse />\n</Mouse>',
  );
});

test('supports an element with complex props and mixed children', () => {
  assertPrintedJSX(
    React.createElement<{customProp: any; onclick: any}>(
      'Mouse',
      {customProp: {one: '1', two: 2}, onclick: function onclick() {}},
      'HELLO',
      React.createElement('Mouse'),
      'CIAO',
    ),
    '<Mouse\n  customProp={\n    Object {\n      "one": "1",\n      "two": 2,\n    }\n  }\n  onclick={[Function onclick]}\n>\n  HELLO\n  <Mouse />\n  CIAO\n</Mouse>',
  );
});

test('escapes children properly', () => {
  assertPrintedJSX(
    React.createElement(
      'Mouse',
      null,
      '"-"',
      React.createElement('Mouse'),
      '\\ \\\\',
    ),
    '<Mouse>\n  "-"\n  <Mouse />\n  \\ \\\\\n</Mouse>',
  );
});

test('supports everything all together', () => {
  assertPrintedJSX(
    React.createElement<{customProp: any; onclick: any}>(
      'Mouse',
      {customProp: {one: '1', two: 2}, onclick: function onclick() {}},
      'HELLO',
      React.createElement<{customProp: any; onclick: any}>(
        'Mouse',
        {customProp: {one: '1', two: 2}, onclick: function onclick() {}},
        'HELLO',
        React.createElement('Mouse'),
        'CIAO',
      ),
      'CIAO',
    ),
    '<Mouse\n  customProp={\n    Object {\n      "one": "1",\n      "two": 2,\n    }\n  }\n  onclick={[Function onclick]}\n>\n  HELLO\n  <Mouse\n    customProp={\n      Object {\n        "one": "1",\n        "two": 2,\n      }\n    }\n    onclick={[Function onclick]}\n  >\n    HELLO\n    <Mouse />\n    CIAO\n  </Mouse>\n  CIAO\n</Mouse>',
  );
});

test('sorts props in nested components', () => {
  /* eslint-disable sort-keys */
  assertPrintedJSX(
    React.createElement(
      'Mouse',
      {
        zeus: 'kentaromiura watched me fix this',
        abc: {
          one: '1',
          two: 2,
        },
      },
      React.createElement(
        'Mouse',
        {
          xyz: 123,
          acbd: {
            one: '1',
            two: 2,
          },
        },
        'NESTED',
      ),
    ),
    '<Mouse\n  abc={\n    Object {\n      "one": "1",\n      "two": 2,\n    }\n  }\n  zeus="kentaromiura watched me fix this"\n>\n  <Mouse\n    acbd={\n      Object {\n        "one": "1",\n        "two": 2,\n      }\n    }\n    xyz={123}\n  >\n    NESTED\n  </Mouse>\n</Mouse>',
  );
  /* eslint-enable sort-keys */
});

test('supports a single element with React elements as props', () => {
  assertPrintedJSX(
    React.createElement('Mouse', {
      prop: React.createElement('div'),
    }),
    '<Mouse\n  prop={<div />}\n/>',
  );
});

test('supports a single element with React elements with props', () => {
  assertPrintedJSX(
    React.createElement('Mouse', {
      prop: React.createElement('div', {foo: 'bar'}),
    }),
    '<Mouse\n  prop={\n    <div\n      foo="bar"\n    />\n  }\n/>',
  );
});

test('supports a single element with custom React elements with props', () => {
  function Cat() {
    return React.createElement('div');
  }
  assertPrintedJSX(
    React.createElement('Mouse', {
      prop: React.createElement(Cat, {foo: 'bar'}),
    }),
    '<Mouse\n  prop={\n    <Cat\n      foo="bar"\n    />\n  }\n/>',
  );
});

test('supports a single element with custom React elements with props (using displayName)', () => {
  function Cat() {
    return React.createElement('div');
  }
  Cat.displayName = 'CatDisplayName';
  assertPrintedJSX(
    React.createElement('Mouse', {
      prop: React.createElement(Cat, {foo: 'bar'}),
    }),
    '<Mouse\n  prop={\n    <CatDisplayName\n      foo="bar"\n    />\n  }\n/>',
  );
});

test('supports a single element with custom React elements with props (using anonymous function)', () => {
  assertPrintedJSX(
    React.createElement('Mouse', {
      prop: React.createElement(() => React.createElement('div'), {foo: 'bar'}),
    }),
    '<Mouse\n  prop={\n    <Unknown\n      foo="bar"\n    />\n  }\n/>',
  );
});

test('supports a single element with custom React elements with a child', () => {
  function Cat(props: any) {
    return React.createElement('div', props);
  }
  assertPrintedJSX(
    React.createElement('Mouse', {
      prop: React.createElement(Cat, {}, React.createElement('div')),
    }),
    '<Mouse\n  prop={\n    <Cat>\n      <div />\n    </Cat>\n  }\n/>',
  );
});

test('supports undefined element type', () => {
  expect(formatElement({$$typeof: elementSymbol, props: {}})).toEqual(
    '<UNDEFINED />',
  );
});

test('supports a fragment with no children', () => {
  expect(
    formatElement({$$typeof: elementSymbol, props: {}, type: fragmentSymbol}),
  ).toEqual('<React.Fragment />');
});

test('supports a fragment with string child', () => {
  expect(
    formatElement({
      $$typeof: elementSymbol,
      props: {children: 'test'},
      type: fragmentSymbol,
    }),
  ).toEqual('<React.Fragment>\n  test\n</React.Fragment>');
});

test('supports a fragment with element child', () => {
  expect(
    formatElement({
      $$typeof: elementSymbol,
      props: {children: React.createElement('div', null, 'test')},
      type: fragmentSymbol,
    }),
  ).toEqual('<React.Fragment>\n  <div>\n    test\n  </div>\n</React.Fragment>');
});

test('supports a single element with React elements with a child', () => {
  assertPrintedJSX(
    React.createElement('Mouse', {
      prop: React.createElement('div', null, 'mouse'),
    }),
    '<Mouse\n  prop={\n    <div>\n      mouse\n    </div>\n  }\n/>',
  );
});

test('supports a single element with React elements with children', () => {
  assertPrintedJSX(
    React.createElement('Mouse', {
      prop: React.createElement(
        'div',
        null,
        'mouse',
        React.createElement('span', null, 'rat'),
      ),
    }),
    '<Mouse\n  prop={\n    <div>\n      mouse\n      <span>\n        rat\n      </span>\n    </div>\n  }\n/>',
  );
});

test('supports a single element with React elements with array children', () => {
  assertPrintedJSX(
    React.createElement('Mouse', {
      prop: React.createElement('div', null, 'mouse', [
        React.createElement('span', {key: 1}, 'rat'),
        React.createElement('span', {key: 2}, 'cat'),
      ]),
    }),
    '<Mouse\n  prop={\n    <div>\n      mouse\n      <span>\n        rat\n      </span>\n      <span>\n        cat\n      </span>\n    </div>\n  }\n/>',
  );
});

test('supports array of elements', () => {
  const val = [
    React.createElement('dt', null, 'jest'),
    React.createElement('dd', null, 'to talk in a playful manner'),
    React.createElement(
      'dd',
      {style: {color: '#99424F'}},
      'painless JavaScript testing',
    ),
  ];
  const expected = [
    'Array [',
    '  <dt>',
    '    jest',
    '  </dt>,',
    '  <dd>',
    '    to talk in a playful manner',
    '  </dd>,',
    '  <dd',
    '    style={',
    '      Object {',
    '        "color": "#99424F",',
    '      }',
    '    }',
    '  >',
    '    painless JavaScript testing',
    '  </dd>,',
    ']',
  ].join('\n');
  expect(formatElement(val)).toEqual(expected);
  expect(
    formatTestObject(val.map(element => renderer.create(element).toJSON())),
  ).toEqual(expected);
});

describe('test object for subset match', () => {
  // Although test object returned by renderer.create(element).toJSON()
  // has both props and children, make sure plugin allows them to be undefined.
  test('undefined props', () => {
    const val = {
      $$typeof: testSymbol,
      children: ['undefined props'],
      type: 'span',
    };
    expect(formatTestObject(val)).toEqual('<span>\n  undefined props\n</span>');
  });
  test('undefined children', () => {
    const val = {
      $$typeof: testSymbol,
      props: {
        className: 'undefined children',
      },
      type: 'span',
    };
    expect(formatTestObject(val)).toEqual(
      '<span\n  className="undefined children"\n/>',
    );
  });
});

describe('indent option', () => {
  const val = React.createElement(
    'ul',
    null,
    React.createElement(
      'li',
      {style: {color: 'green', textDecoration: 'none'}},
      'Test indent option',
    ),
  );
  const expected = [
    '<ul>',
    '  <li',
    '    style={',
    '      Object {',
    '        "color": "green",',
    '        "textDecoration": "none",',
    '      }',
    '    }',
    '  >',
    '    Test indent option',
    '  </li>',
    '</ul>',
  ].join('\n');
  test('default implicit: 2 spaces', () => {
    assertPrintedJSX(val, expected);
  });
  test('default explicit: 2 spaces', () => {
    assertPrintedJSX(val, expected, {indent: 2});
  });

  // Tests assume that no strings in val contain multiple adjacent spaces!
  test('non-default: 0 spaces', () => {
    const indent = 0;
    assertPrintedJSX(val, expected.replace(/ {2}/g, ' '.repeat(indent)), {
      indent,
    });
  });
  test('non-default: 4 spaces', () => {
    const indent = 4;
    assertPrintedJSX(val, expected.replace(/ {2}/g, ' '.repeat(indent)), {
      indent,
    });
  });
});

describe('maxDepth option', () => {
  test('elements', () => {
    const maxDepth = 2;
    const val = React.createElement(
      // ++depth === 1
      'dl',
      null,
      React.createElement('dt', {id: 'jest'}, 'jest'), // ++depth === 2
      React.createElement(
        // ++depth === 2
        'dd',
        {
          id: 'jest-1',
        },
        'to talk in a ',
        React.createElement('em', null, 'playful'), // ++depth === 3
        ' manner',
      ),
      React.createElement(
        // ++ depth === 2
        'dd',
        {
          id: 'jest-2',
          style: {
            // ++depth === 3
            color: '#99424F',
          },
        },
        React.createElement('em', null, 'painless'), // ++depth === 3
        ' JavaScript testing',
      ),
    );
    const expected = [
      '<dl>',
      '  <dt',
      '    id="jest"',
      '  >',
      '    jest',
      '  </dt>',
      '  <dd',
      '    id="jest-1"',
      '  >',
      '    to talk in a ',
      '    <em … />',
      '     manner',
      '  </dd>',
      '  <dd',
      '    id="jest-2"',
      '    style={[Object]}',
      '  >',
      '    <em … />',
      '     JavaScript testing',
      '  </dd>',
      '</dl>',
    ].join('\n');
    assertPrintedJSX(val, expected, {maxDepth});
  });
  test('array of elements', () => {
    const maxDepth = 2;
    const array = [
      // ++depth === 1
      React.createElement(
        // ++depth === 2
        'dd',
        {
          id: 'jest-1',
        },
        'to talk in a ',
        React.createElement('em', null, 'playful'), // ++depth === 3
        ' manner',
      ),
      React.createElement(
        // ++ depth === 2
        'dd',
        {
          id: 'jest-2',
          style: {
            // ++depth === 3
            color: '#99424F',
          },
        },
        React.createElement('em', null, 'painless'), // ++depth === 3
        ' JavaScript testing',
      ),
    ];
    const expected = [
      'Array [',
      '  <dd',
      '    id="jest-1"',
      '  >',
      '    to talk in a ',
      '    <em … />',
      '     manner',
      '  </dd>,',
      '  <dd',
      '    id="jest-2"',
      '    style={[Object]}',
      '  >',
      '    <em … />',
      '     JavaScript testing',
      '  </dd>,',
      ']',
    ].join('\n');
    expect(formatElement(array, {maxDepth})).toEqual(expected);
    expect(
      formatTestObject(
        array.map(element => renderer.create(element).toJSON()),
        {maxDepth},
      ),
    ).toEqual(expected);
  });
});

test('min option', () => {
  assertPrintedJSX(
    React.createElement<{customProp: any; onclick: any}>(
      'Mouse',
      {customProp: {one: '1', two: 2}, onclick: function onclick() {}},
      'HELLO',
      React.createElement(
        'Mouse',
        {customProp: {one: '1', two: 2}, onclick: function onclick() {}},
        'HELLO',
        React.createElement('Mouse'),
        'CIAO',
      ),
      'CIAO',
    ),
    '<Mouse customProp={{"one": "1", "two": 2}} onclick={[Function onclick]}>HELLO<Mouse customProp={{"one": "1", "two": 2}} onclick={[Function onclick]}>HELLO<Mouse />CIAO</Mouse>CIAO</Mouse>',
    {min: true},
  );
});

test('ReactElement plugin highlights syntax', () => {
  const jsx = React.createElement('Mouse', {
    prop: React.createElement(
      'div',
      null,
      'mouse',
      React.createElement('span', null, 'rat'),
    ),
  });
  expect(
    formatElement(jsx, {
      highlight: true,
    }),
  ).toMatchSnapshot();
});

test('ReactTestComponent plugin highlights syntax', () => {
  const jsx = React.createElement('Mouse', {
    prop: React.createElement(
      'div',
      null,
      'mouse',
      React.createElement('span', null, 'rat'),
    ),
  });
  expect(
    formatTestObject(renderer.create(jsx).toJSON(), {
      highlight: true,
    }),
  ).toMatchSnapshot();
});

test('throws if theme option is null', () => {
  const jsx = React.createElement(
    'Mouse',
    {style: 'color:red'},
    'Hello, Mouse!',
  );
  expect(() => {
    // @ts-ignore
    formatElement(jsx, {
      highlight: true,
      theme: null,
    });
  }).toThrow('pretty-format: Option "theme" must not be null.');
});

test('throws if theme option is not of type "object"', () => {
  expect(() => {
    const jsx = React.createElement(
      'Mouse',
      {style: 'color:red'},
      'Hello, Mouse!',
    );
    // @ts-ignore
    formatElement(jsx, {
      highlight: true,
      theme: 'beautiful',
    });
  }).toThrow(
    'pretty-format: Option "theme" must be of type "object" but instead received "string".',
  );
});

test('throws if theme option has value that is undefined in ansi-styles', () => {
  expect(() => {
    const jsx = React.createElement(
      'Mouse',
      {style: 'color:red'},
      'Hello, Mouse!',
    );
    formatElement(jsx, {
      highlight: true,
      theme: {
        content: 'unknown',
        prop: 'yellow',
        tag: 'cyan',
        value: 'green',
      },
    });
  }).toThrow(
    'pretty-format: Option "theme" has a key "content" whose value "unknown" is undefined in ansi-styles.',
  );
});

test('ReactElement plugin highlights syntax with color from theme option', () => {
  const jsx = React.createElement(
    'Mouse',
    {style: 'color:red'},
    'Hello, Mouse!',
  );
  expect(
    formatElement(jsx, {
      highlight: true,
      theme: {
        value: 'red',
      },
    }),
  ).toMatchSnapshot();
});

test('ReactTestComponent plugin highlights syntax with color from theme option', () => {
  const jsx = React.createElement(
    'Mouse',
    {style: 'color:red'},
    'Hello, Mouse!',
  );
  expect(
    formatTestObject(renderer.create(jsx).toJSON(), {
      highlight: true,
      theme: {
        value: 'red',
      },
    }),
  ).toMatchSnapshot();
});

test('supports forwardRef with a child', () => {
  function Cat(props: any) {
    return React.createElement('div', props, props.children);
  }

  expect(
    formatElement(React.createElement(React.forwardRef(Cat), null, 'mouse')),
  ).toEqual('<ForwardRef(Cat)>\n  mouse\n</ForwardRef(Cat)>');
});

test('supports context Provider with a child', () => {
  const {Provider} = React.createContext('test');

  expect(
    formatElement(
      React.createElement(Provider, {value: 'test-value'}, 'child'),
    ),
  ).toEqual(
    '<Context.Provider\n  value="test-value"\n>\n  child\n</Context.Provider>',
  );
});

test('supports context Consumer with a child', () => {
  const {Consumer} = React.createContext('test');

  expect(
    formatElement(
      React.createElement(Consumer, null, () =>
        React.createElement('div', null, 'child'),
      ),
    ),
  ).toEqual('<Context.Consumer>\n  [Function anonymous]\n</Context.Consumer>');
});

test('ReactElement removes undefined props', () => {
  assertPrintedJSX(
    React.createElement('Mouse', {
      abc: undefined,
      xyz: true,
    }),
    '<Mouse\n  xyz={true}\n/>',
  );
});

test('ReactTestComponent removes undefined props', () => {
  const jsx = React.createElement('Mouse', {
    abc: undefined,
    xyz: true,
  });
  expect(
    formatElement(jsx, {
      highlight: true,
      theme: {
        value: 'red',
      },
    }),
  ).toMatchSnapshot();
});
