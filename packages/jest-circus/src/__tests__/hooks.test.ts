/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import wrap from 'jest-snapshot-serializer-raw';
import {runTest} from '../__mocks__/testUtils';

test('beforeEach is executed before each test in current/child describe blocks', () => {
  const {stdout} = runTest(`
    describe('describe', () => {
      beforeEach(() => console.log('> describe beforeEach'));
      test('one', () => {});
      test('two', () => {});
      describe('2nd level describe', () => {
        beforeEach(() => console.log('> 2nd level describe beforeEach'));
        test('2nd level test', () => {});

        describe('3rd level describe', () => {
          test('3rd level test', () => {});
          test('3rd level test#2', () => {});
        });
      });
    })

    describe('2nd describe', () => {
      beforeEach(() => {
        console.log('> 2nd describe beforeEach that throws')
        throw new Error('alabama');
      });
      test('2nd describe test', () => {});
    })
  `);

  expect(wrap(stdout)).toMatchSnapshot();
});

test('multiple before each hooks in one describe are executed in the right order', () => {
  const {stdout} = runTest(`
    describe('describe 1', () => {
      beforeEach(() => {
        console.log('before each 1');
      });
      beforeEach(() => {
        console.log('before each 2');
      });

      describe('2nd level describe', () => {
        test('test', () => {});
      });
    });
  `);

  expect(wrap(stdout)).toMatchSnapshot();
});

test('beforeAll is executed correctly', () => {
  const {stdout} = runTest(`
    describe('describe 1', () => {
      beforeAll(() => console.log('> beforeAll 1'));
      test('test 1', () => console.log('> test 1'));

      describe('2nd level describe', () => {
        beforeAll(() => console.log('> beforeAll 2'));
        test('test 2', () => console.log('> test 2'));
        test('test 3', () => console.log('> test 3'));
      });
    });
  `);

  expect(wrap(stdout)).toMatchSnapshot();
});

test('a failing beforeAll should skip other beforeAll hooks', () => {
  const {stdout} = runTest(`
    describe('test suite beforeAll', () => {

    beforeAll(() => {
        console.log('> beforeAll 1 runs')
        throw new Error('> beforeAll 1 error');
    });

    beforeAll(() => {
        console.log('> beforeAll 2 runs')
    });

    test('test 1', () => {
        console.log('> the test ran')
    });

});
  `);

  expect(wrap(stdout)).toMatchSnapshot();
});

test('a failing beforeAll should skip all beforeEach and afterEach hooks', () => {
  const {stdout} = runTest(`
    describe('test suite beforeAll', () => {

    beforeAll(() => {
        console.log('> beforeAll 1 runs')
        throw new Error('> beforeAll 1 error');
    });

    beforeEach(() => {
        console.log('> beforeEach 1 runs')
    });

    afterEach(() => {
        console.log('> afterEach 1 runs')
    });

    test('test 1', () => {
        console.log('> the test ran')
    });

});
  `);

  expect(wrap(stdout)).toMatchSnapshot();
});

test('all afterEach hooks should still be called even if an a beforeEach hook fails and an afterEach hook fails', () => {
  const {stdout} = runTest(`
    describe('test suite beforeAll', () => {

    beforeEach(() => {
        console.log('> beforeEach 1 runs')
        throw new Error('> beforeEach 1 error');
    });

    afterEach(() => {
        console.log('> afterEach 1 runs')
        throw new Error('> afterEach 1 error');
    });

    afterEach(() => {
        console.log('> afterEach 2 runs')
    });

    test('test 1', () => {
        console.log('> the test ran')
    });

});
  `);

  expect(wrap(stdout)).toMatchSnapshot();
});

test('a failing beforeAll should skip any nested describe blocks', () => {
  const {stdout} = runTest(`
    describe('test suite beforeAll', () => {

    beforeAll(() => {
        console.log('> beforeAll 1 runs')
        throw new Error('beforeAll 1 error');
    });

    describe('test suite nested', () => {

      beforeAll(() => {
          console.log('> beforeAll 2 runs')
          throw new Error('beforeAll 2 error');
      });

      test('test 1', () => {
          console.log('> test 1 ran')
      });
    })

    test('test 2', () => {
        console.log('> test 2 ran')
    });

});
  `);

  expect(wrap(stdout)).toMatchSnapshot();
});
