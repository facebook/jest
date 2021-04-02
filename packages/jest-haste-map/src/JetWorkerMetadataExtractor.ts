/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {
  ExtractMetadataDefinition,
  ExtractedFileMetaData,
  MetadataExtractor,
  MetadataExtractorOptions,
} from './types';
import {extractMetadata, getSha1} from './worker';

interface WorkerInterface {
  extractMetadata: typeof extractMetadata;
  getSha1: typeof getSha1;
  end?: () => void;
}

export default class JestWorkerMetadataExtractor implements MetadataExtractor {
  private _forceInBand: boolean = false;
  private _worker: WorkerInterface | null = null;

  constructor(private options: {maxWorkers: number}) {}

  setup({forceInBand}: MetadataExtractorOptions): void {
    this._forceInBand = forceInBand;
  }

  extractMetadata(
    data: ExtractMetadataDefinition,
  ): Promise<ExtractedFileMetaData> {
    return this._getWorker().extractMetadata(data);
  }

  getSha1(data: ExtractMetadataDefinition): Promise<ExtractedFileMetaData> {
    return this._getWorker().getSha1(data);
  }

  end(): void {
    const worker = this._worker;

    if (worker?.end != null) {
      worker.end();
    }

    this._worker = null;
  }

  private _getWorker(): WorkerInterface {
    if (this._worker == null) {
      this._worker = this._createWorker();
    }

    return this._worker;
  }

  private _createWorker(): WorkerInterface {
    if (this._forceInBand || this.options.maxWorkers <= 1) {
      return {extractMetadata, getSha1};
    }
    const {Worker} = require('jest-worker') as typeof import('jest-worker');

    return (new Worker(require.resolve('./worker'), {
      exposedMethods: ['extractMetadata', 'getSha1'],
      maxRetries: 3,
      numWorkers: this.options.maxWorkers,
    }) as unknown) as WorkerInterface;
  }
}
