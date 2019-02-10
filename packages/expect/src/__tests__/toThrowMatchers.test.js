/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const jestExpect = require('../');

// Custom Error class because node versions have different stack trace strings.
class customError extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.name = 'Error';
    this.stack =
      'Error\n' +
      '  at jestExpect' +
      ' (packages/expect/src/__tests__/toThrowMatchers-test.js:24:74)';
  }
}

['toThrowError', 'toThrow'].forEach(toThrow => {
  describe('.' + toThrow + '()', () => {
    class Err extends customError {}
    class Err2 extends customError {}

    test('to throw or not to throw', () => {
      jestExpect(() => {
        throw new customError('apple');
      })[toThrow]();
      jestExpect(() => {}).not[toThrow]();
    });

    describe('strings', () => {
      it('passes', () => {
        jestExpect(() => {
          throw new customError('apple');
        })[toThrow]('apple');
        jestExpect(() => {
          throw new customError('banana');
        }).not[toThrow]('apple');
        jestExpect(() => {}).not[toThrow]('apple');
      });

      test('did not throw at all', () => {
        expect(() =>
          jestExpect(() => {})[toThrow]('apple'),
        ).toThrowErrorMatchingSnapshot();
      });

      test('threw, but message did not match (error)', () => {
        expect(() => {
          jestExpect(() => {
            throw new customError('apple');
          })[toThrow]('banana');
        }).toThrowErrorMatchingSnapshot();
      });

      test('threw, but message did not match (non-error falsey)', () => {
        expect(() => {
          jestExpect(() => {
            // eslint-disable-next-line no-throw-literal
            throw '';
          })[toThrow]('Server Error');
        }).toThrowErrorMatchingSnapshot();
      });

      it('properly escapes strings when matching against errors', () => {
        jestExpect(() => {
          throw new TypeError('"this"? throws.');
        })[toThrow]('"this"? throws.');
      });

      test('threw, but message should not match (error)', () => {
        expect(() => {
          jestExpect(() => {
            throw new customError('apple');
          }).not[toThrow]('apple');
        }).toThrowErrorMatchingSnapshot();
      });

      test('threw, but message should not match (non-error truthy)', () => {
        expect(() => {
          jestExpect(() => {
            // eslint-disable-next-line no-throw-literal
            throw 'Internal Server Error';
          }).not[toThrow]('Server Error');
        }).toThrowErrorMatchingSnapshot();
      });
    });

    describe('regexp', () => {
      it('passes', () => {
        expect(() => {
          throw new customError('apple');
        })[toThrow](/apple/);
        expect(() => {
          throw new customError('banana');
        }).not[toThrow](/apple/);
        expect(() => {}).not[toThrow](/apple/);
      });

      test('did not throw at all', () => {
        expect(() =>
          jestExpect(() => {})[toThrow](/apple/),
        ).toThrowErrorMatchingSnapshot();
      });

      test('threw, but message did not match (error)', () => {
        expect(() => {
          jestExpect(() => {
            throw new customError('apple');
          })[toThrow](/banana/);
        }).toThrowErrorMatchingSnapshot();
      });

      test('threw, but message did not match (non-error falsey)', () => {
        expect(() => {
          jestExpect(() => {
            // eslint-disable-next-line no-throw-literal
            throw 0;
          })[toThrow](/^[123456789]\d*/);
        }).toThrowErrorMatchingSnapshot();
      });

      test('threw, but message should not match (error)', () => {
        expect(() => {
          jestExpect(() => {
            throw new customError('apple');
          }).not[toThrow](/apple/);
        }).toThrowErrorMatchingSnapshot();
      });

      test('threw, but message should not match (non-error truthy)', () => {
        expect(() => {
          jestExpect(() => {
            // eslint-disable-next-line no-throw-literal
            throw 404;
          }).not[toThrow](/^[123456789]\d*/);
        }).toThrowErrorMatchingSnapshot();
      });
    });

    describe('error class', () => {
      it('passes', () => {
        jestExpect(() => {
          throw new Err();
        })[toThrow](Err);
        jestExpect(() => {
          throw new Err();
        })[toThrow](customError);
        jestExpect(() => {
          throw new Err();
        }).not[toThrow](Err2);
        jestExpect(() => {}).not[toThrow](Err);
      });

      test('did not throw at all', () => {
        expect(() =>
          expect(() => {})[toThrow](Err),
        ).toThrowErrorMatchingSnapshot();
      });

      test('threw, but class did not match (error)', () => {
        expect(() => {
          jestExpect(() => {
            throw new Err('apple');
          })[toThrow](Err2);
        }).toThrowErrorMatchingSnapshot();
      });

      test('threw, but class did not match (non-error falsey)', () => {
        expect(() => {
          jestExpect(() => {
            // eslint-disable-next-line no-throw-literal
            throw undefined;
          })[toThrow](Err2);
        }).toThrowErrorMatchingSnapshot();
      });

      test('threw, but class should not match (error)', () => {
        expect(() => {
          jestExpect(() => {
            throw new Err('apple');
          }).not[toThrow](Err);
        }).toThrowErrorMatchingSnapshot();
      });
    });

    describe('error-message', () => {
      // Received message in report if object has message property.
      class ErrorMessage {
        // not extending Error!
        constructor(message) {
          this.message = message;
        }
      }
      const expected = new ErrorMessage('apple');

      describe('pass', () => {
        test('isNot false', () => {
          jestExpect(() => {
            throw new ErrorMessage('apple');
          })[toThrow](expected);
        });

        test('isNot true', () => {
          jestExpect(() => {
            throw new ErrorMessage('banana');
          }).not[toThrow](expected);
        });
      });

      describe('fail', () => {
        test('isNot false', () => {
          expect(() =>
            jestExpect(() => {
              throw new ErrorMessage('banana');
            })[toThrow](expected),
          ).toThrowErrorMatchingSnapshot();
        });

        test('isNot true', () => {
          expect(() =>
            jestExpect(() => {
              throw new ErrorMessage('apple');
            }).not[toThrow](expected),
          ).toThrowErrorMatchingSnapshot();
        });
      });
    });

    describe('asymmetric', () => {
      describe('any-Class', () => {
        describe('pass', () => {
          test('isNot false', () => {
            jestExpect(() => {
              throw new Err('apple');
            })[toThrow](expect.any(Err));
          });

          test('isNot true', () => {
            jestExpect(() => {
              throw new Err('apple');
            }).not[toThrow](expect.any(Err2));
          });
        });

        describe('fail', () => {
          test('isNot false', () => {
            expect(() =>
              jestExpect(() => {
                throw new Err('apple');
              })[toThrow](expect.any(Err2)),
            ).toThrowErrorMatchingSnapshot();
          });

          test('isNot true', () => {
            expect(() =>
              jestExpect(() => {
                throw new Err('apple');
              }).not[toThrow](expect.any(Err)),
            ).toThrowErrorMatchingSnapshot();
          });
        });
      });

      describe('anything', () => {
        describe('pass', () => {
          test('isNot false', () => {
            jestExpect(() => {
              throw new customError('apple');
            })[toThrow](expect.anything());
          });

          test('isNot true', () => {
            jestExpect(() => {}).not[toThrow](expect.anything());
            jestExpect(() => {
              // eslint-disable-next-line no-throw-literal
              throw null;
            }).not[toThrow](expect.anything());
          });
        });

        describe('fail', () => {
          test('isNot false', () => {
            expect(() =>
              jestExpect(() => {
                // eslint-disable-next-line no-throw-literal
                throw null;
              })[toThrow](expect.anything()),
            ).toThrowErrorMatchingSnapshot();
          });

          test('isNot true', () => {
            expect(() =>
              jestExpect(() => {
                throw new customError('apple');
              }).not[toThrow](expect.anything()),
            ).toThrowErrorMatchingSnapshot();
          });
        });
      });

      describe('no-symbol', () => {
        // Test serialization of asymmetric matcher which has no property:
        // this.$$typeof = Symbol.for('jest.asymmetricMatcher')
        const matchError = {
          asymmetricMatch(received) {
            return (
              received !== null &&
              received !== undefined &&
              received.name === 'Error'
            );
          },
        };
        const matchNotError = {
          asymmetricMatch(received) {
            return (
              received !== null &&
              received !== undefined &&
              received.name !== 'Error'
            );
          },
        };

        describe('pass', () => {
          test('isNot false', () => {
            jestExpect(() => {
              throw new customError('apple');
            })[toThrow](matchError);
          });

          test('isNot true', () => {
            jestExpect(() => {
              throw new customError('apple');
            }).not[toThrow](matchNotError);
          });
        });

        describe('fail', () => {
          test('isNot false', () => {
            expect(() =>
              jestExpect(() => {
                throw new customError('apple');
              })[toThrow](matchNotError),
            ).toThrowErrorMatchingSnapshot();
          });

          test('isNot true', () => {
            expect(() =>
              jestExpect(() => {
                throw new customError('apple');
              }).not[toThrow](matchError),
            ).toThrowErrorMatchingSnapshot();
          });
        });
      });

      describe('objectContaining', () => {
        const matchError = expect.objectContaining({
          name: 'Error',
        });
        const matchNotError = expect.objectContaining({
          name: 'NotError',
        });

        describe('pass', () => {
          test('isNot false', () => {
            jestExpect(() => {
              throw new customError('apple');
            })[toThrow](matchError);
          });

          test('isNot true', () => {
            jestExpect(() => {
              throw new customError('apple');
            }).not[toThrow](matchNotError);
          });
        });

        describe('fail', () => {
          test('isNot false', () => {
            expect(() =>
              jestExpect(() => {
                throw new customError('apple');
              })[toThrow](matchNotError),
            ).toThrowErrorMatchingSnapshot();
          });

          test('isNot true', () => {
            expect(() =>
              jestExpect(() => {
                throw new customError('apple');
              }).not[toThrow](matchError),
            ).toThrowErrorMatchingSnapshot();
          });
        });
      });
    });

    describe('promise/async throws if Error-like object is returned', () => {
      const asyncFn = async (shouldThrow?: boolean, resolve?: boolean) => {
        let err;
        if (shouldThrow) {
          err = new Err('async apple');
        }
        if (resolve) {
          return await Promise.resolve(err || 'apple');
        } else {
          return await Promise.reject(err || 'apple');
        }
      };

      test('passes', async () => {
        expect.assertions(24);
        await jestExpect(Promise.reject(new Error())).rejects[toThrow]();

        await jestExpect(asyncFn(true)).rejects[toThrow]();
        await jestExpect(asyncFn(true)).rejects[toThrow](Err);
        await jestExpect(asyncFn(true)).rejects[toThrow](Error);
        await jestExpect(asyncFn(true)).rejects[toThrow]('apple');
        await jestExpect(asyncFn(true)).rejects[toThrow](/app/);

        await jestExpect(asyncFn(true)).rejects.not[toThrow](Err2);
        await jestExpect(asyncFn(true)).rejects.not[toThrow]('banana');
        await jestExpect(asyncFn(true)).rejects.not[toThrow](/banana/);

        await jestExpect(asyncFn(true, true)).resolves[toThrow]();

        await jestExpect(asyncFn(false, true)).resolves.not[toThrow]();
        await jestExpect(asyncFn(false, true)).resolves.not[toThrow](Error);
        await jestExpect(asyncFn(false, true)).resolves.not[toThrow]('apple');
        await jestExpect(asyncFn(false, true)).resolves.not[toThrow](/apple/);
        await jestExpect(asyncFn(false, true)).resolves.not[toThrow]('banana');
        await jestExpect(asyncFn(false, true)).resolves.not[toThrow](/banana/);

        await jestExpect(asyncFn()).rejects.not[toThrow]();
        await jestExpect(asyncFn()).rejects.not[toThrow](Error);
        await jestExpect(asyncFn()).rejects.not[toThrow]('apple');
        await jestExpect(asyncFn()).rejects.not[toThrow](/apple/);
        await jestExpect(asyncFn()).rejects.not[toThrow]('banana');
        await jestExpect(asyncFn()).rejects.not[toThrow](/banana/);

        // Works with nested functions inside promises
        await jestExpect(
          Promise.reject(() => {
            throw new Error();
          }),
        ).rejects[toThrow]();
        await jestExpect(Promise.reject(() => {})).rejects.not[toThrow]();
      });

      test('did not throw at all', async () => {
        await expect(
          jestExpect(asyncFn()).rejects[toThrow](),
        ).rejects.toThrowErrorMatchingSnapshot();
      });

      test('threw, but class did not match', async () => {
        await expect(
          jestExpect(asyncFn(true)).rejects[toThrow](Err2),
        ).rejects.toThrowErrorMatchingSnapshot();
      });

      test('threw, but should not have', async () => {
        await expect(
          jestExpect(asyncFn(true)).rejects.not[toThrow](),
        ).rejects.toThrowErrorMatchingSnapshot();
      });
    });

    describe('expected is undefined', () => {
      test('threw, but should not have (non-error falsey)', () => {
        expect(() => {
          jestExpect(() => {
            // eslint-disable-next-line no-throw-literal
            throw null;
          }).not[toThrow]();
        }).toThrowErrorMatchingSnapshot();
      });
    });

    test('invalid arguments', () => {
      expect(() =>
        jestExpect(() => {}).not[toThrow](111),
      ).toThrowErrorMatchingSnapshot();
    });

    test('invalid actual', () => {
      expect(() =>
        jestExpect('a string')[toThrow](),
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
