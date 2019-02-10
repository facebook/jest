/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {EnvironmentClass} from 'types/Environment';
import type {GlobalConfig, Path, ProjectConfig} from 'types/Config';
import type {Resolver} from 'types/Resolve';
import type {TestFramework, TestRunnerContext} from 'types/TestRunner';
import type {TestResult} from 'types/TestResult';
import type RuntimeClass from 'jest-runtime';

import fs from 'graceful-fs';
import {
  BufferedConsole,
  Console,
  ErrorWithStack,
  NullConsole,
  getConsoleOutput,
  setGlobal,
} from 'jest-util';
import LeakDetector from 'jest-leak-detector';
import {getTestEnvironment} from 'jest-config';
import * as docblock from 'jest-docblock';
import {formatExecError} from 'jest-message-util';
import sourcemapSupport from 'source-map-support';
import chalk from 'chalk';

type RunTestInternalResult = {
  leakDetector: ?LeakDetector,
  result: TestResult,
};

function freezeConsole(
  testConsole: BufferedConsole | Console | NullConsole,
  config: ProjectConfig,
) {
  testConsole._log = function fakeConsolePush(_type, message) {
    const error = new ErrorWithStack(
      `${chalk.red(
        `${chalk.bold(
          'Cannot log after tests are done.',
        )} Did you forget to wait for something async in your test?`,
      )}\nAttempted to log "${message}".`,
      fakeConsolePush,
    );

    const formattedError = formatExecError(
      error,
      config,
      {noStackTrace: false},
      undefined,
      true,
    );

    process.stderr.write('\n' + formattedError + '\n');
    // TODO: set exit code in Jest 25
    // process.exitCode = 1;
  };
}

// Keeping the core of "runTest" as a separate function (as "runTestInternal")
// is key to be able to detect memory leaks. Since all variables are local to
// the function, when "runTestInternal" finishes its execution, they can all be
// freed, UNLESS something else is leaking them (and that's why we can detect
// the leak!).
//
// If we had all the code in a single function, we should manually nullify all
// references to verify if there is a leak, which is not maintainable and error
// prone. That's why "runTestInternal" CANNOT be inlined inside "runTest".
async function runTestInternal(
  path: Path,
  globalConfig: GlobalConfig,
  config: ProjectConfig,
  resolver: Resolver,
  context: ?TestRunnerContext,
): Promise<RunTestInternalResult> {
  const testSource = fs.readFileSync(path, 'utf8');
  const parsedDocblock = docblock.parse(docblock.extract(testSource));
  const customEnvironment = parsedDocblock['jest-environment'];

  let testEnvironment = config.testEnvironment;

  if (customEnvironment) {
    testEnvironment = getTestEnvironment({
      ...config,
      testEnvironment: customEnvironment,
    });
  }

  /* $FlowFixMe */
  const TestEnvironment = (require(testEnvironment): EnvironmentClass);
  const testFramework = ((process.env.JEST_CIRCUS === '1'
    ? require('jest-circus/runner') // eslint-disable-line import/no-extraneous-dependencies
    : /* $FlowFixMe */
      require(config.testRunner)): TestFramework);
  const Runtime = ((config.moduleLoader
    ? /* $FlowFixMe */
      require(config.moduleLoader)
    : require('jest-runtime')): Class<RuntimeClass>);

  let runtime = undefined;

  const consoleOut = globalConfig.useStderr ? process.stderr : process.stdout;
  const consoleFormatter = (type, message) =>
    getConsoleOutput(
      config.cwd,
      !!globalConfig.verbose,
      // 4 = the console call is buried 4 stack frames deep
      BufferedConsole.write(
        [],
        type,
        message,
        4,
        runtime && runtime.getSourceMaps(),
      ),
    );

  let testConsole;

  if (globalConfig.silent) {
    testConsole = new NullConsole(consoleOut, process.stderr, consoleFormatter);
  } else if (globalConfig.verbose) {
    testConsole = new Console(consoleOut, process.stderr, consoleFormatter);
  } else {
    testConsole = new BufferedConsole(() => runtime && runtime.getSourceMaps());
  }

  const environment = new TestEnvironment(config, {
    console: testConsole,
    testPath: path,
  });
  const leakDetector = config.detectLeaks
    ? new LeakDetector(environment)
    : null;

  const cacheFS = {[path]: testSource};
  setGlobal(environment.global, 'console', testConsole);

  runtime = new Runtime(config, environment, resolver, cacheFS, {
    changedFiles: context && context.changedFiles,
    collectCoverage: globalConfig.collectCoverage,
    collectCoverageFrom: globalConfig.collectCoverageFrom,
    collectCoverageOnlyFrom: globalConfig.collectCoverageOnlyFrom,
  });

  const start = Date.now();

  const sourcemapOptions = {
    environment: 'node',
    handleUncaughtExceptions: false,
    retrieveSourceMap: source => {
      const sourceMaps = runtime && runtime.getSourceMaps();
      const sourceMapSource = sourceMaps && sourceMaps[source];

      if (sourceMapSource) {
        try {
          return {
            map: JSON.parse(fs.readFileSync(sourceMapSource)),
            url: source,
          };
        } catch (e) {}
      }
      return null;
    },
  };

  // For tests
  runtime
    .requireInternalModule(
      require.resolve('source-map-support'),
      'source-map-support',
    )
    .install(sourcemapOptions);

  // For runtime errors
  sourcemapSupport.install(sourcemapOptions);

  if (
    environment.global &&
    environment.global.process &&
    environment.global.process.exit
  ) {
    const realExit = environment.global.process.exit;

    environment.global.process.exit = function exit(...args) {
      const error = new ErrorWithStack(
        `process.exit called with "${args.join(', ')}"`,
        exit,
      );

      const formattedError = formatExecError(
        error,
        config,
        {noStackTrace: false},
        undefined,
        true,
      );

      process.stderr.write(formattedError);

      return realExit(...args);
    };
  }

  try {
    await environment.setup();

    let result: TestResult;

    try {
      result = await testFramework(
        globalConfig,
        config,
        environment,
        runtime,
        path,
      );
    } catch (err) {
      // Access stack before uninstalling sourcemaps
      err.stack;

      throw err;
    }

    freezeConsole(testConsole, config);

    const testCount =
      result.numPassingTests +
      result.numFailingTests +
      result.numPendingTests +
      result.numTodoTests;

    result.perfStats = {end: Date.now(), start};
    result.testFilePath = path;
    result.coverage = runtime.getAllCoverageInfoCopy();
    result.sourceMaps = runtime.getSourceMapInfo(
      new Set(Object.keys(result.coverage || {})),
    );
    result.console = testConsole.getBuffer();
    result.skipped = testCount === result.numPendingTests;
    result.displayName = config.displayName;

    if (globalConfig.logHeapUsage) {
      if (global.gc) {
        global.gc();
      }
      result.memoryUsage = process.memoryUsage().heapUsed;
    }

    // Delay the resolution to allow log messages to be output.
    return new Promise(resolve => {
      setImmediate(() => resolve({leakDetector, result}));
    });
  } finally {
    await environment.teardown();

    sourcemapSupport.resetRetrieveHandlers();
  }
}

export default async function runTest(
  path: Path,
  globalConfig: GlobalConfig,
  config: ProjectConfig,
  resolver: Resolver,
  context: ?TestRunnerContext,
): Promise<TestResult> {
  const {leakDetector, result} = await runTestInternal(
    path,
    globalConfig,
    config,
    resolver,
    context,
  );

  if (leakDetector) {
    // We wanna allow a tiny but time to pass to allow last-minute cleanup
    await new Promise(resolve => setTimeout(resolve, 100));

    // Resolve leak detector, outside the "runTestInternal" closure.
    result.leaks = leakDetector.isLeaking();
  } else {
    result.leaks = false;
  }

  return result;
}
