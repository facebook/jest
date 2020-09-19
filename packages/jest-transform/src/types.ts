/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {RawSourceMap} from 'source-map';
import type {Config, TransformTypes} from '@jest/types';

export type ShouldInstrumentOptions = Pick<
  Config.GlobalConfig,
  | 'collectCoverage'
  | 'collectCoverageFrom'
  | 'collectCoverageOnlyFrom'
  | 'coverageProvider'
> & {
  changedFiles?: Set<Config.Path>;
  sourcesRelatedToTestsInChangedFiles?: Set<Config.Path>;
};

export type Options = ShouldInstrumentOptions &
  Partial<{
    isCoreModule: boolean;
    isInternalModule: boolean;
    supportsDynamicImport: boolean;
    supportsStaticESM: boolean;
    filenameOverride?: string;
  }>;

// This is fixed in source-map@0.7.x, but we can't upgrade yet since it's async
interface FixedRawSourceMap extends Omit<RawSourceMap, 'version'> {
  version: number;
}

// TODO: For Jest 26 normalize this (always structured data, never a string)
export type TransformedSource =
  | {code: string; map?: FixedRawSourceMap | string | null}
  | string;

export type TransformResult = TransformTypes.TransformResult;

export interface TransformOptions {
  instrument: boolean;
  // names are copied from babel
  supportsDynamicImport?: boolean;
  supportsStaticESM?: boolean;
}

// TODO: For Jest 26 we should combine these into one options shape
export interface CacheKeyOptions extends TransformOptions {
  config: Config.ProjectConfig;
  rootDir: string;
}

export interface Transformer {
  canInstrument?: boolean;
  createTransformer?: (options?: any) => Transformer;

  getCacheKey?: (
    fileData: string,
    filePath: Config.Path,
    configStr: string,
    options: CacheKeyOptions,
  ) => string;

  process: (
    sourceText: string,
    sourcePath: Config.Path,
    config: Config.ProjectConfig,
    options?: TransformOptions,
  ) => TransformedSource;
}
