/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
'use strict';

const CoverageInstrumentor = require('cover/instrument').Instrumentor;
const fs = require('graceful-fs');
const path = require('path');

const COVERAGE_TEMPLATE_PATH = path.join(__dirname, 'coverage.template');

let _memoizedCoverageTemplate = null;

function _getCoverageTemplate() {
  if (_memoizedCoverageTemplate === null) {
    _memoizedCoverageTemplate = require('lodash.template')(
      fs.readFileSync(COVERAGE_TEMPLATE_PATH, 'utf8'),
    );
  }
  return _memoizedCoverageTemplate;
}

class CoverageCollector {

  constructor(sourceText) {
    this._coverageDataStore = {};
    this._instrumentedSourceText = null;
    this._instrumentor = new CoverageInstrumentor();
    this._origSourceText = sourceText;
  }

  getCoverageDataStore() {
    return this._coverageDataStore;
  }

  getInstrumentedSource(storageVarName) {
    if (this._instrumentedSourceText === null) {
      this._instrumentedSourceText = _getCoverageTemplate()({
        instrumented: this._instrumentor,
        coverageStorageVar: storageVarName,
        source: this._instrumentor.instrument(this._origSourceText),
      });
    }
    return this._instrumentedSourceText;
  }

  extractRuntimeCoverageInfo() {
    const instrumentationInfo = this._instrumentor.objectify();
    const coverageInfo = {
      coveredSpans: [],
      uncoveredSpans: [],
      sourceText: this._origSourceText,
    };

    let nodeIndex;

    // Find all covered spans
    for (nodeIndex in this._coverageDataStore.nodes) {
      coverageInfo.coveredSpans.push(instrumentationInfo.nodes[nodeIndex].loc);
    }

    // Find all definitely uncovered spans
    for (nodeIndex in instrumentationInfo.nodes) {
      if (!this._coverageDataStore.nodes.hasOwnProperty(nodeIndex)) {
        coverageInfo.uncoveredSpans.push(
          instrumentationInfo.nodes[nodeIndex].loc,
        );
      }
    }

    return coverageInfo;
  }

}

module.exports = CoverageCollector;
