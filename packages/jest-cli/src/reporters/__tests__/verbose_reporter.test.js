/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const wrap = obj => ({suites: obj, tests: [], title: ''});

let groupTestsBySuites;

beforeEach(() => {
  const VerboseReporter = require('../verbose_reporter').default;
  groupTestsBySuites = VerboseReporter.groupTestsBySuites;
});

describe('groupTestsBySuites', () => {
  it('should handle empty results', () => {
    expect(groupTestsBySuites([])).toEqual(wrap([]));
  });

  it('should group A1 in A', () => {
    expect(
      groupTestsBySuites([
        {
          ancestorTitles: ['A'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'A1',
        },
      ]),
    ).toEqual(
      wrap([
        {
          suites: [],
          tests: [
            {
              ancestorTitles: ['A'],
              failureMessages: [],
              numPassingAsserts: 1,
              title: 'A1',
            },
          ],
          title: 'A',
        },
      ]),
    );
  });

  it('should group A1 in A; B1 in B', () => {
    expect(
      groupTestsBySuites([
        {
          ancestorTitles: ['A'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'A1',
        },
        {
          ancestorTitles: ['B'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'B1',
        },
      ]),
    ).toEqual(
      wrap([
        {
          suites: [],
          tests: [
            {
              ancestorTitles: ['A'],
              failureMessages: [],
              numPassingAsserts: 1,
              title: 'A1',
            },
          ],
          title: 'A',
        },
        {
          suites: [],
          tests: [
            {
              ancestorTitles: ['B'],
              failureMessages: [],
              numPassingAsserts: 1,
              title: 'B1',
            },
          ],
          title: 'B',
        },
      ]),
    );
  });

  it('should group A1, A2 in A', () => {
    expect(
      groupTestsBySuites([
        {
          ancestorTitles: ['A'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'A1',
        },
        {
          ancestorTitles: ['A'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'A2',
        },
      ]),
    ).toEqual(
      wrap([
        {
          suites: [],
          tests: [
            {
              ancestorTitles: ['A'],
              failureMessages: [],
              numPassingAsserts: 1,
              title: 'A1',
            },
            {
              ancestorTitles: ['A'],
              failureMessages: [],
              numPassingAsserts: 1,
              title: 'A2',
            },
          ],
          title: 'A',
        },
      ]),
    );
  });

  it('should group A1, A2 in A; B1, B2 in B', () => {
    expect(
      groupTestsBySuites([
        {
          ancestorTitles: ['A'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'A1',
        },
        {
          ancestorTitles: ['A'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'A2',
        },
        {
          ancestorTitles: ['B'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'B1',
        },
        {
          ancestorTitles: ['B'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'B2',
        },
      ]),
    ).toEqual(
      wrap([
        {
          suites: [],
          tests: [
            {
              ancestorTitles: ['A'],
              failureMessages: [],
              numPassingAsserts: 1,
              title: 'A1',
            },
            {
              ancestorTitles: ['A'],
              failureMessages: [],
              numPassingAsserts: 1,
              title: 'A2',
            },
          ],
          title: 'A',
        },
        {
          suites: [],
          tests: [
            {
              ancestorTitles: ['B'],
              failureMessages: [],
              numPassingAsserts: 1,
              title: 'B1',
            },
            {
              ancestorTitles: ['B'],
              failureMessages: [],
              numPassingAsserts: 1,
              title: 'B2',
            },
          ],
          title: 'B',
        },
      ]),
    );
  });

  it('should group AB1 in AB', () => {
    expect(
      groupTestsBySuites([
        {
          ancestorTitles: ['A', 'B'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'AB1',
        },
      ]),
    ).toEqual(
      wrap([
        {
          suites: [
            {
              suites: [],
              tests: [
                {
                  ancestorTitles: ['A', 'B'],
                  failureMessages: [],
                  numPassingAsserts: 1,
                  title: 'AB1',
                },
              ],
              title: 'B',
            },
          ],
          tests: [],
          title: 'A',
        },
      ]),
    );
  });

  it('should group AB1, AB2 in AB', () => {
    expect(
      groupTestsBySuites([
        {
          ancestorTitles: ['A', 'B'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'AB1',
        },
        {
          ancestorTitles: ['A', 'B'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'AB2',
        },
      ]),
    ).toEqual(
      wrap([
        {
          suites: [
            {
              suites: [],
              tests: [
                {
                  ancestorTitles: ['A', 'B'],
                  failureMessages: [],
                  numPassingAsserts: 1,
                  title: 'AB1',
                },
                {
                  ancestorTitles: ['A', 'B'],
                  failureMessages: [],
                  numPassingAsserts: 1,
                  title: 'AB2',
                },
              ],
              title: 'B',
            },
          ],
          tests: [],
          title: 'A',
        },
      ]),
    );
  });

  it('should group A1 in A; AB1 in AB', () => {
    expect(
      groupTestsBySuites([
        {
          ancestorTitles: ['A'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'A1',
        },
        {
          ancestorTitles: ['A', 'B'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'AB1',
        },
      ]),
    ).toEqual(
      wrap([
        {
          suites: [
            {
              suites: [],
              tests: [
                {
                  ancestorTitles: ['A', 'B'],
                  failureMessages: [],
                  numPassingAsserts: 1,
                  title: 'AB1',
                },
              ],
              title: 'B',
            },
          ],
          tests: [
            {
              ancestorTitles: ['A'],
              failureMessages: [],
              numPassingAsserts: 1,
              title: 'A1',
            },
          ],
          title: 'A',
        },
      ]),
    );
  });

  it('should group AB1 in AB; A1 in A', () => {
    expect(
      groupTestsBySuites([
        {
          ancestorTitles: ['A', 'B'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'AB1',
        },
        {
          ancestorTitles: ['A'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'A1',
        },
      ]),
    ).toEqual(
      wrap([
        {
          suites: [
            {
              suites: [],
              tests: [
                {
                  ancestorTitles: ['A', 'B'],
                  failureMessages: [],
                  numPassingAsserts: 1,
                  title: 'AB1',
                },
              ],
              title: 'B',
            },
          ],
          tests: [
            {
              ancestorTitles: ['A'],
              failureMessages: [],
              numPassingAsserts: 1,
              title: 'A1',
            },
          ],
          title: 'A',
        },
      ]),
    );
  });

  it('should group AB1 in AB; CD1 in CD', () => {
    expect(
      groupTestsBySuites([
        {
          ancestorTitles: ['A', 'B'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'AB1',
        },
        {
          ancestorTitles: ['C', 'D'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'CD1',
        },
      ]),
    ).toEqual(
      wrap([
        {
          suites: [
            {
              suites: [],
              tests: [
                {
                  ancestorTitles: ['A', 'B'],
                  failureMessages: [],
                  numPassingAsserts: 1,
                  title: 'AB1',
                },
              ],
              title: 'B',
            },
          ],
          tests: [],
          title: 'A',
        },
        {
          suites: [
            {
              suites: [],
              tests: [
                {
                  ancestorTitles: ['C', 'D'],
                  failureMessages: [],
                  numPassingAsserts: 1,
                  title: 'CD1',
                },
              ],
              title: 'D',
            },
          ],
          tests: [],
          title: 'C',
        },
      ]),
    );
  });

  it('should group ABC1 in ABC; BC1 in BC; D1 in D; A1 in A', () => {
    expect(
      groupTestsBySuites([
        {
          ancestorTitles: ['A', 'B', 'C'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'ABC1',
        },
        {
          ancestorTitles: ['B', 'C'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'BC1',
        },
        {
          ancestorTitles: ['D'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'D1',
        },
        {
          ancestorTitles: ['A'],
          failureMessages: [],
          numPassingAsserts: 1,
          title: 'A1',
        },
      ]),
    ).toEqual(
      wrap([
        {
          suites: [
            {
              suites: [
                {
                  suites: [],
                  tests: [
                    {
                      ancestorTitles: ['A', 'B', 'C'],
                      failureMessages: [],
                      numPassingAsserts: 1,
                      title: 'ABC1',
                    },
                  ],
                  title: 'C',
                },
              ],
              tests: [],
              title: 'B',
            },
          ],
          tests: [
            {
              ancestorTitles: ['A'],
              failureMessages: [],
              numPassingAsserts: 1,
              title: 'A1',
            },
          ],
          title: 'A',
        },
        {
          suites: [
            {
              suites: [],
              tests: [
                {
                  ancestorTitles: ['B', 'C'],
                  failureMessages: [],
                  numPassingAsserts: 1,
                  title: 'BC1',
                },
              ],
              title: 'C',
            },
          ],
          tests: [],
          title: 'B',
        },
        {
          suites: [],
          tests: [
            {
              ancestorTitles: ['D'],
              failureMessages: [],
              numPassingAsserts: 1,
              title: 'D1',
            },
          ],
          title: 'D',
        },
      ]),
    );
  });
});
