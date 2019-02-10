/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type Colors = {
  comment: {close: string, open: string},
  content: {close: string, open: string},
  prop: {close: string, open: string},
  tag: {close: string, open: string},
  value: {close: string, open: string},
};
export type Indent = string => string;
export type Refs = Array<any>;
export type Print = any => string;
export type StringOrNull = string | null;

export type Theme = {|
  comment: string,
  content: string,
  prop: string,
  tag: string,
  value: string,
|};

export type ThemeReceived = {|
  comment?: string,
  content?: string,
  prop?: string,
  tag?: string,
  value?: string,
|};

export type Options = {|
  callToJSON: boolean,
  escapeRegex: boolean,
  escapeString: boolean,
  highlight: boolean,
  indent: number,
  maxDepth: number,
  min: boolean,
  plugins: Plugins,
  printFunctionName: boolean,
  theme: Theme,
|};

export type OptionsReceived = {|
  callToJSON?: boolean,
  escapeRegex?: boolean,
  escapeString?: boolean,
  highlight?: boolean,
  indent?: number,
  maxDepth?: number,
  min?: boolean,
  plugins?: Plugins,
  printFunctionName?: boolean,
  theme?: ThemeReceived,
|};

export type Config = {|
  callToJSON: boolean,
  colors: Colors,
  escapeRegex: boolean,
  escapeString: boolean,
  indent: string,
  maxDepth: number,
  min: boolean,
  plugins: Plugins,
  printFunctionName: boolean,
  spacingInner: string,
  spacingOuter: string,
|};

export type Printer = (
  val: any,
  config: Config,
  indentation: string,
  depth: number,
  refs: Refs,
  hasCalledToJSON?: boolean,
) => string;

export type Test = any => boolean;

export type NewPlugin = {|
  serialize: (
    val: any,
    config: Config,
    indentation: string,
    depth: number,
    refs: Refs,
    printer: Printer,
  ) => string,
  test: Test,
|};

export type PluginOptions = {|
  edgeSpacing: string,
  min: boolean,
  spacing: string,
|};

export type OldPlugin = {|
  print: (
    val: any,
    print: Print,
    indent: Indent,
    options: PluginOptions,
    colors: Colors,
  ) => string,
  test: Test,
|};

export type Plugin = NewPlugin | OldPlugin;

export type Plugins = Array<Plugin>;

export type ReactTestObject = {|
  $$typeof: Symbol,
  type: string,
  props?: Object,
  children?: null | Array<ReactTestChild>,
|};

// Child can be `number` in Stack renderer but not in Fiber renderer.
export type ReactTestChild = ReactTestObject | string | number;
