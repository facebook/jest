jest.unmock('../sum');

const sum = require('../sum');

describe('sum', () => {
  it('adds numbers', () => {
    expect(sum(1, 2)).toEqual(3);
  });
});
