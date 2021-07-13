/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export type Colors = {
  comment: {close: string; open: string};
  content: {close: string; open: string};
  prop: {close: string; open: string};
  tag: {close: string; open: string};
  value: {close: string; open: string};
};
type Indent = (arg0: string) => string;
export type Refs = Array<unknown>;
type Print = (arg0: unknown) => string;

export type Theme = {
  comment: string;
  content: string;
  prop: string;
  tag: string;
  value: string;
};

type ThemeReceived = {
  comment?: string;
  content?: string;
  prop?: string;
  tag?: string;
  value?: string;
};

export type Options = {
  callToJSON: boolean;
  escapeRegex: boolean;
  escapeString: boolean;
  highlight: boolean;
  indent: number;
  maxDepth: number;
  min: boolean;
  plugins: Plugins;
  printBasicPrototype: boolean;
  printFunctionName: boolean;
  theme: Theme;
};

export interface PrettyFormatOptions {
  callToJSON?: boolean;
  escapeRegex?: boolean;
  escapeString?: boolean;
  highlight?: boolean;
  indent?: number;
  maxDepth?: number;
  min?: boolean;
  plugins?: Plugins;
  printBasicPrototype?: boolean;
  printFunctionName?: boolean;
  theme?: ThemeReceived;
}

export type OptionsReceived = PrettyFormatOptions;

export type Config = {
  callToJSON: boolean;
  colors: Colors;
  escapeRegex: boolean;
  escapeString: boolean;
  indent: string;
  maxDepth: number;
  min: boolean;
  plugins: Plugins;
  printBasicPrototype: boolean;
  printFunctionName: boolean;
  spacingInner: string;
  spacingOuter: string;
};

export type Printer = (
  val: unknown,
  config: Config,
  indentation: string,
  depth: number,
  refs: Refs,
  hasCalledToJSON?: boolean,
) => string;

type Test = (arg0: any) => boolean;

export type NewPlugin = {
  serialize: (
    val: any,
    config: Config,
    indentation: string,
    depth: number,
    refs: Refs,
    printer: Printer,
  ) => string;
  test: Test;
};

type PluginOptions = {
  edgeSpacing: string;
  min: boolean;
  spacing: string;
};

export type OldPlugin = {
  print: (
    val: unknown,
    print: Print,
    indent: Indent,
    options: PluginOptions,
    colors: Colors,
  ) => string;
  test: Test;
};

export type Plugin = NewPlugin | OldPlugin;

export type Plugins = Array<Plugin>;
