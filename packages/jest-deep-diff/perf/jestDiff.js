/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// adapted from pretty-format/perf/test.js
const chalk = require('chalk');
const oldDiff = require('jest-diff').default;
const diff = require('../build').default;
const bigJSON = require('./world.geo.json');

const NANOSECONDS = 1000000000;
let TIMES_TO_RUN = 10000;
const LIMIT_EXECUTION_TIME = 40 * NANOSECONDS;

const deepClone = obj => JSON.parse(JSON.stringify(obj));

function testCase(name, fn) {
  let error, time, total, timeout;

  try {
    fn();
  } catch (err) {
    error = err;
  }

  if (!error) {
    const start = process.hrtime();

    let i = 0;
    let currentTotal;
    for (; i < TIMES_TO_RUN; i++) {
      const diff = process.hrtime(start);
      currentTotal = diff[0] * 1e9 + diff[1];
      if (currentTotal > LIMIT_EXECUTION_TIME) {
        timeout = true;
        break;
      }
      fn();
    }

    total = currentTotal;

    time = Math.round(total / TIMES_TO_RUN);
  }

  return {
    error,
    name,
    time,
    timeout,
    total,
  };
}

function test(name, a, b) {
  const oldDiffResult = testCase('Old diff', () => oldDiff(a, b));

  const diffResult = testCase('Deep diff', () => diff(a, b));

  const results = [oldDiffResult, diffResult].sort((a, b) => a.time - b.time);

  const winner = results[0];

  results.forEach((item, index) => {
    item.isWinner = index === 0;
    item.isLoser = index === results.length - 1;
  });

  function log(current) {
    let message = current.name;

    if (current.timeout) {
      message += `  Could not complete ${TIMES_TO_RUN} iterations under ${
        LIMIT_EXECUTION_TIME / NANOSECONDS
      }s`;
      // eslint-disable-next-line no-console
      console.log('  ' + chalk.bgRed.black(message));
      return;
    }

    if (current.time) {
      message += ' - ' + String(current.time).padStart(6) + 'ns';
    }
    if (current.total) {
      message +=
        ' - ' +
        current.total / NANOSECONDS +
        's total (' +
        TIMES_TO_RUN +
        ' runs)';
    }
    if (current.error) {
      message += ' - Error: ' + current.error.message;
    }

    message = ' ' + message + ' ';

    if (current.error) {
      message = chalk.dim(message);
    }

    const diff = current.time - winner.time;

    if (diff > winner.time * 0.85) {
      message = chalk.bgRed.black(message);
    } else if (diff > winner.time * 0.65) {
      message = chalk.bgYellow.black(message);
    } else if (!current.error) {
      message = chalk.bgGreen.black(message);
    } else {
      message = chalk.dim(message);
    }

    // eslint-disable-next-line no-console
    console.log('  ' + message);
  }

  // eslint-disable-next-line no-console
  console.log(name + ': ');
  results.forEach(log);
  // eslint-disable-next-line no-console
  console.log();
}

const equalPrimitives = [
  ['boolean', true, true],
  ['string', 'a', 'a'],
  ['number', 24, 24],
  ['null', null, null],
  ['undefined', undefined, null],
];

for (const [type, a, b] of equalPrimitives) {
  test(`equal ${type}`, a, b);
}

const unequalPrimitives = [
  ['boolean', true, false],
  ['string', 'a', 'A'],
  ['number', 24, 42],
  ['null and undefined', null, undefined],
];

for (const [type, a, b] of unequalPrimitives) {
  test(`unequal ${type}`, a, b);
}

const smallJSON = {
  features: {
    a: 1,
    b: 3,
    c: {
      key: 'string',
    },
  },
  topLevel: 3,
};

const smallJSONDeepEqual = deepClone(smallJSON);

test('deep equal small objects', smallJSON, smallJSONDeepEqual);

const smallJSONUpdated = {
  features: {
    a: 1,
    b: 4,
    c: {
      key2: 'string',
    },
  },
  topLevel: 4,
};

test('updated small objects', smallJSON, smallJSONUpdated);

TIMES_TO_RUN = 100;

const mediumJSON = {
  ...bigJSON,
  features: bigJSON.features.slice(10),
};

const changedMediumJSON = {
  ...bigJSON,
  features: deepClone(bigJSON.features.slice(4, 14)),
};
test('Medium object with diff', mediumJSON, changedMediumJSON);

const mediumJSONDeepEqual = deepClone(mediumJSON);

test('Medium object with deep equality', mediumJSON, mediumJSONDeepEqual);

const objectWithXKeys1 = {};
const objectWithXKeys2 = {};

const keyNumber = 20;

for (let i = 0; i < keyNumber; i++) {
  objectWithXKeys1['key' + i] = Math.round(Math.random());
  objectWithXKeys2['key' + i] = Math.round(Math.random());
  objectWithXKeys1[Math.random().toString(36)] = i;
  objectWithXKeys2[Math.random().toString(36)] = i;
}

test('Object with a lot of keys', objectWithXKeys1, objectWithXKeys2);
