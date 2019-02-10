/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// eslint-disable-next-line import/no-extraneous-dependencies
const workerFarm = require('worker-farm');
const assert = require('assert');
const JestWorker = require('../../build').default;

// Typical tests: node --expose-gc test.js empty 100000
//                node --expose-gc test.js loadTest 10000
assert(process.argv[2], 'Pass a child method name');
assert(process.argv[3], 'Pass the number of iteratitons');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const method = process.argv[2];
const calls = +process.argv[3];
const threads = 6;

function testWorkerFarm() {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    let count = 0;

    async function countToFinish() {
      if (++count === calls) {
        workerFarm.end(api);
        const endTime = Date.now();

        // Let all workers go down.
        await sleep(2000);

        resolve({
          globalTime: endTime - startTime - 2000,
          processingTime: endTime - startProcess,
        });
      }
    }

    const api = workerFarm(
      {
        autoStart: true,
        maxConcurrentCallsPerWorker: 1,
        maxConcurrentWorkers: threads,
      },
      require.resolve('./workers/worker_farm'),
      [method],
    );

    // Let all workers come up.
    await sleep(2000);

    const startProcess = Date.now();

    for (let i = 0; i < calls; i++) {
      const promisified = new Promise((resolve, reject) => {
        api[method]((err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      promisified.then(countToFinish);
    }
  });
}

function testJestWorker() {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    let count = 0;

    async function countToFinish() {
      if (++count === calls) {
        farm.end();
        const endTime = Date.now();

        // Let all workers go down.
        await sleep(2000);

        resolve({
          globalTime: endTime - startTime - 2000,
          processingTime: endTime - startProcess,
        });
      }
    }

    const farm = new JestWorker(require.resolve('./workers/jest_worker'), {
      exposedMethods: [method],
      forkOptions: {execArgv: []},
      workers: threads,
    });

    farm.getStdout().pipe(process.stdout);
    farm.getStderr().pipe(process.stderr);

    // Let all workers come up.
    await sleep(2000);

    const startProcess = Date.now();

    for (let i = 0; i < calls; i++) {
      const promisified = farm[method]();

      promisified.then(countToFinish);
    }
  });
}

function profile(x) {
  console.profile(x);
}

function profileEnd(x) {
  console.profileEnd(x);
}

async function main() {
  if (!global.gc) {
    console.log('GC not present');
  }

  const wFResults = [];
  const jWResults = [];

  for (let i = 0; i < 10; i++) {
    console.log('-'.repeat(75));

    profile('worker farm');
    const wF = await testWorkerFarm();
    profileEnd('worker farm');
    await sleep(3000);
    // eslint-disable-next-line no-undef
    global.gc && gc();

    profile('jest worker');
    const jW = await testJestWorker();
    profileEnd('jest worker');
    await sleep(3000);
    // eslint-disable-next-line no-undef
    global.gc && gc();

    wFResults.push(wF);
    jWResults.push(jW);

    console.log('jest-worker:', jW);
    console.log('worker-farm:', wF);
  }

  let wFGT = 0;
  let wFPT = 0;
  let jWGT = 0;
  let jWPT = 0;

  for (let i = 0; i < 10; i++) {
    wFGT += wFResults[i].globalTime;
    wFPT += wFResults[i].processingTime;

    jWGT += jWResults[i].globalTime;
    jWPT += jWResults[i].processingTime;
  }

  console.log('-'.repeat(75));
  console.log('total worker-farm:', {wFGT, wFPT});
  console.log('total jest-worker:', {jWGT, jWPT});

  console.log('-'.repeat(75));
  console.log(
    `% improvement over ${calls} calls (global time):`,
    (100 * (wFGT - jWGT)) / wFGT,
  );

  console.log(
    `% improvement over ${calls} calls (processing time):`,
    (100 * (wFPT - jWPT)) / wFPT,
  );
}

main();
