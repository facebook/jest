/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

import JasmineReporter from '../reporter';

describe('Jasmine2Reporter', () => {
  let reporter;

  beforeEach(() => {
    reporter = new JasmineReporter({});
  });

  it('reports nested suites', () => {
    const makeSpec = name => ({
      description: 'description',
      failedExpectations: [],
      fullName: name,
    });
    reporter.suiteStarted({description: 'parent'});
    reporter.suiteStarted({description: 'child'});
    reporter.specDone(makeSpec('spec 1'));
    reporter.suiteDone();
    reporter.suiteStarted({description: 'child 2'});
    reporter.specDone(makeSpec('spec 2'));
    reporter.jasmineDone();

    return reporter.getResults().then(runResults => {
      const firstResult = runResults.testResults[0];
      expect(firstResult.ancestorTitles[0]).toBe('parent');
      expect(firstResult.ancestorTitles[1]).toBe('child');
      const secondResult = runResults.testResults[1];
      expect(secondResult.ancestorTitles[1]).toBe('child 2');
    });
  });
});
