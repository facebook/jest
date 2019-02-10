/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Config, NewPlugin, Printer, Refs} from '../types';

import {
  printChildren,
  printElement,
  printElementAsLeaf,
  printProps,
} from './lib/markup';

const elementSymbol = Symbol.for('react.element');
const fragmentSymbol = Symbol.for('react.fragment');
const forwardRefSymbol = Symbol.for('react.forward_ref');
const providerSymbol = Symbol.for('react.provider');
const contextSymbol = Symbol.for('react.context');

// Given element.props.children, or subtree during recursive traversal,
// return flattened array of children.
const getChildren = (arg: any[], children = []) => {
  if (Array.isArray(arg)) {
    arg.forEach(item => {
      getChildren(item, children);
    });
  } else if (arg != null && arg !== false) {
    children.push(arg);
  }
  return children;
};

const getType = (element: any) => {
  const type = element.type;
  if (typeof type === 'string') {
    return type;
  }
  if (typeof type === 'function') {
    return type.displayName || type.name || 'Unknown';
  }
  if (type === fragmentSymbol) {
    return 'React.Fragment';
  }
  if (typeof type === 'object' && type !== null) {
    if (type.$$typeof === providerSymbol) {
      return 'Context.Provider';
    }

    if (type.$$typeof === contextSymbol) {
      return 'Context.Consumer';
    }

    if (type.$$typeof === forwardRefSymbol) {
      const functionName = type.render.displayName || type.render.name || '';

      return functionName !== ''
        ? 'ForwardRef(' + functionName + ')'
        : 'ForwardRef';
    }
  }
  return 'UNDEFINED';
};

const getPropKeys = (element: any) => {
  const {props} = element;

  return Object.keys(props)
    .filter(key => key !== 'children' && props[key] !== undefined)
    .sort();
};

export const serialize = (
  element: any,
  config: Config,
  indentation: string,
  depth: number,
  refs: Refs,
  printer: Printer,
): string =>
  ++depth > config.maxDepth
    ? printElementAsLeaf(getType(element), config)
    : printElement(
        getType(element),
        printProps(
          getPropKeys(element),
          element.props,
          config,
          indentation + config.indent,
          depth,
          refs,
          printer,
        ),
        printChildren(
          getChildren(element.props.children),
          config,
          indentation + config.indent,
          depth,
          refs,
          printer,
        ),
        config,
        indentation,
      );

export const test = (val: any) => val && val.$$typeof === elementSymbol;

const plugin: NewPlugin = {serialize, test};

export default plugin;
