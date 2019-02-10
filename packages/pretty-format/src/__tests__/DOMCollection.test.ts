/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @jest-environment jsdom
 */
/* eslint-env browser*/

import prettyFormat from '../';
import setPrettyPrint from './setPrettyPrint';

const {DOMCollection, DOMElement} = prettyFormat.plugins;

setPrettyPrint([DOMCollection, DOMElement]);

describe('DOMCollection plugin for object properties', () => {
  it('supports DOMStringMap', () => {
    const el = document.createElement('div');
    el.dataset.foo = 'bar';

    expect(el.dataset).toPrettyPrintTo('DOMStringMap {\n  "foo": "bar",\n}');
  });

  it('supports NamedNodeMap', () => {
    const el = document.createElement('div');
    el.setAttribute('foo', 'bar');

    expect(el.attributes).toPrettyPrintTo('NamedNodeMap {\n  "foo": "bar",\n}');
  });

  it('supports config.min option', () => {
    const el = document.createElement('div');
    el.setAttribute('name1', 'value1');
    el.setAttribute('name2', 'value2');

    expect(el.attributes).toPrettyPrintTo(
      '{"name1": "value1", "name2": "value2"}',
      {min: true},
    );
  });
});

describe('DOMCollection plugin for list items', () => {
  const select = document.createElement('select');
  select.innerHTML = [
    '<option value="1">one</option>',
    '<option value="2">two</option>',
    '<option value="3">three</option>',
  ].join('');

  const form = document.createElement('form');
  form.appendChild(select);

  const expectedOption1 = [
    '  <option',
    '    value="1"',
    '  >',
    '    one',
    '  </option>,', // comma because item
  ].join('\n');
  const expectedOption2 = [
    '  <option',
    '    value="2"',
    '  >',
    '    two',
    '  </option>,', // comma because item
  ].join('\n');
  const expectedOption3 = [
    '  <option',
    '    value="3"',
    '  >',
    '    three',
    '  </option>,', // comma because item
  ].join('\n');

  const expectedHTMLCollection = [
    'HTMLCollection [',
    expectedOption1,
    expectedOption2,
    expectedOption3,
    ']',
  ].join('\n');

  it('supports HTMLCollection for getElementsByTagName', () => {
    const options = form.getElementsByTagName('option');
    expect(options).toPrettyPrintTo(expectedHTMLCollection);
  });

  it('supports HTMLCollection for children', () => {
    expect(select.children).toPrettyPrintTo(expectedHTMLCollection);
  });

  it('supports config.maxDepth option', () => {
    expect(select.children).toPrettyPrintTo('[HTMLCollection]', {maxDepth: 0});
  });

  const expectedNodeList = [
    'NodeList [',
    expectedOption1,
    expectedOption2,
    expectedOption3,
    ']',
  ].join('\n');

  it('supports NodeList for querySelectorAll', () => {
    const options = form.querySelectorAll('option');
    expect(options).toPrettyPrintTo(expectedNodeList);
  });

  it('supports NodeList for childNodes', () => {
    expect(select.childNodes).toPrettyPrintTo(expectedNodeList);
  });

  const expectedHTMLOptionsCollection = [
    'HTMLOptionsCollection [',
    expectedOption1,
    expectedOption2,
    expectedOption3,
    ']',
  ].join('\n');

  it('supports HTMLOptionsCollection for select options', () => {
    expect(select.options).toPrettyPrintTo(expectedHTMLOptionsCollection);
  });

  // When Jest upgrades to a version of jsdom later than 12.2.0,
  // the class name might become HTMLFormControlsCollection
  const expectedHTMLFormControlsCollection = [
    'HTMLCollection [',
    '  <select>',
    '    <option',
    '      value="1"',
    '    >',
    '      one',
    '    </option>', // no comma because element
    '    <option',
    '      value="2"',
    '    >',
    '      two',
    '    </option>', // no comma because element
    '    <option',
    '      value="3"',
    '    >',
    '      three',
    '    </option>', // no comma because element
    '  </select>,', // comma because item
    ']',
  ].join('\n');

  it('supports HTMLCollection for form elements', () => {
    expect(form.elements).toPrettyPrintTo(expectedHTMLFormControlsCollection);
  });
});
