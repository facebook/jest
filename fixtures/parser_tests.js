/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fixtures = __dirname;

function parserTests(parse: (file: string) => BabylonParserResult) {
  describe('File parsing without throwing', () => {
    it('Should not throw', () => {
      expect(() => {
        parse(`${fixtures}/declarationWithoutAssignment.example`);
      }).not.toThrow();
    });
  });

  describe('File Parsing for it blocks', () => {
    it('For the simplest it cases', () => {
      const data = parse(`${fixtures}/global_its.example`);

      expect(data.itBlocks.length).toEqual(8);

      const firstIt = data.itBlocks[0];
      expect(firstIt.name).toEqual('works with old functions');
      expect(firstIt.start).toEqual({column: 1, line: 2});
      expect(firstIt.end).toEqual({column: 3, line: 4});

      const secondIt = data.itBlocks[1];
      expect(secondIt.name).toEqual('works with new functions');
      expect(secondIt.start).toEqual({column: 1, line: 6});
      expect(secondIt.end).toEqual({column: 3, line: 8});

      const thirdIt = data.itBlocks[2];
      expect(thirdIt.name).toEqual('works with flow functions');
      expect(thirdIt.start).toEqual({column: 1, line: 10});
      expect(thirdIt.end).toEqual({column: 3, line: 12});

      const fourthIt = data.itBlocks[2];
      expect(fourthIt.name).toEqual('works with flow functions');
      expect(fourthIt.start).toEqual({column: 1, line: 10});
      expect(fourthIt.end).toEqual({column: 3, line: 12});

      const fifthIt = data.itBlocks[4];
      expect(fifthIt.name).toEqual('works with it.only');
      expect(fifthIt.start).toEqual({column: 1, line: 18});
      expect(fifthIt.end).toEqual({column: 3, line: 20});

      const sixthIt = data.itBlocks[5];
      expect(sixthIt.name).toEqual('works with fit');
      expect(sixthIt.start).toEqual({column: 1, line: 22});
      expect(sixthIt.end).toEqual({column: 3, line: 24});

      const seventhIt = data.itBlocks[6];
      expect(seventhIt.name).toEqual('works with test');
      expect(seventhIt.start).toEqual({column: 1, line: 26});
      expect(seventhIt.end).toEqual({column: 3, line: 28});

      const eigthIt = data.itBlocks[7];
      expect(eigthIt.name).toEqual('works with test.only');
      expect(eigthIt.start).toEqual({column: 1, line: 30});
      expect(eigthIt.end).toEqual({column: 3, line: 32});
    });

    it('For its inside describes', () => {
      const data = parse(`${fixtures}/nested_its.example`);

      expect(data.itBlocks.length).toEqual(6);

      const firstIt = data.itBlocks[0];
      expect(firstIt.name).toEqual('1');
      expect(firstIt.start).toEqual({column: 3, line: 2});
      expect(firstIt.end).toEqual({column: 5, line: 3});

      const secondIt = data.itBlocks[1];
      expect(secondIt.name).toEqual('2');
      expect(secondIt.start).toEqual({column: 3, line: 4});
      expect(secondIt.end).toEqual({column: 5, line: 5});

      const thirdIt = data.itBlocks[2];
      expect(thirdIt.name).toEqual('3');
      expect(thirdIt.start).toEqual({column: 3, line: 9});
      expect(thirdIt.end).toEqual({column: 5, line: 10});

      const fourthIt = data.itBlocks[3];
      expect(fourthIt.name).toEqual('4');
      expect(fourthIt.start).toEqual({column: 3, line: 14});
      expect(fourthIt.end).toEqual({column: 5, line: 15});

      const fifthIt = data.itBlocks[4];
      expect(fifthIt.name).toEqual('5');
      expect(fifthIt.start).toEqual({column: 3, line: 19});
      expect(fifthIt.end).toEqual({column: 5, line: 20});

      const sixthIt = data.itBlocks[5];
      expect(sixthIt.name).toEqual('6');
      expect(sixthIt.start).toEqual({column: 3, line: 24});
      expect(sixthIt.end).toEqual({column: 5, line: 25});
    });

    // These tests act more like linters that we don't raise on
    // non-trivial files taken from some Artsy codebases,
    // which are MIT licensed.

    it('For a danger test file (which has flow annotations)', () => {
      const data = parse(`${fixtures}/dangerjs/travis-ci.example`);
      expect(data.itBlocks.length).toEqual(8);
    });

    it('For a danger flow test file ', () => {
      const data = parse(`${fixtures}/dangerjs/github.example`);
      expect(data.itBlocks.length).toEqual(2);
    });

    it('For a metaphysics test file', () => {
      const data = parse(`${fixtures}/metaphysics/partner_show.example`);
      expect(data.itBlocks.length).toEqual(8);
    });

    it('For a call expression without text test file', () => {
      const data = parse(`${fixtures}/callExpressionWithoutText.example`);
      expect(data.itBlocks.length).toEqual(1);
    });
  });

  describe('File Parsing for expects', () => {
    it('finds Expects in a danger test file', () => {
      const data = parse(`${fixtures}/dangerjs/travis-ci.example`);
      expect(data.expects.length).toEqual(8);

      const firstExpect = data.expects[0];
      expect(firstExpect.start).toEqual({column: 5, line: 13});
      expect(firstExpect.end).toEqual({column: 37, line: 13});
    });

    it('finds Expects in a danger flow test file ', () => {
      const data = parse(`${fixtures}/dangerjs/github.example`);
      expect(data.expects.length).toEqual(3);

      const thirdExpect = data.expects[2];
      expect(thirdExpect.start).toEqual({column: 5, line: 33});
      expect(thirdExpect.end).toEqual({column: 40, line: 33});
    });

    it('finds Expects in a metaphysics test file', () => {
      const data = parse(`${fixtures}/metaphysics/partner_show.example`);
      expect(data.expects.length).toEqual(10);
    });

    it('finds Expects in a call expression without text test file', () => {
      const data = parse(`${fixtures}/callExpressionWithoutText.example`);
      expect(data.expects.length).toEqual(1);
    });
  });
}

module.exports = {
  parserTests,
};
