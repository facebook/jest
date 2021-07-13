/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const mock = require('../util');

class Test {
  testMethod() {
    return false;
  }
}

describe('test mock', () => {
  const testMock = mock(Test);

  it('should reset mocks', () => {
    testMock.testMethod();
    testMock.testMethod.mockReset(); // <--- works as expected
    expect(testMock.testMethod).not.toHaveBeenCalled(); // <---- passes

    testMock.testMethod();
    jest.resetAllMocks(); // <--- does not reset the mock
    expect(testMock.testMethod).not.toHaveBeenCalled(); // <--- fails
  });
});
