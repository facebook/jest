jest.unmock('../runJest');

const runJest = require('../runJest');
const fs = require('fs');
const path = require('path');

describe('coverage_report', () => {
  it('outputs coverage report', () => {
    const result = runJest('coverage_report', ['--coverage']);
    const coverageDir = path.resolve(__dirname, '../coverage_report/coverage');

    expect(result.stdout.toString()).toMatch(/All files.*100.*100.*100.*100/);
    // this will throw if the coverage directory is not there
    fs.accessSync(coverageDir, fs.F_OK);
    expect(result.status).toBe(0);
  });
});
