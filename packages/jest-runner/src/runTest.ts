/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {compileFunction} from 'vm';
import type {Config} from '@jest/types';
import type {TestResult} from '@jest/test-result';
import {
  BufferedConsole,
  CustomConsole,
  LogMessage,
  LogType,
  NullConsole,
  getConsoleOutput,
} from '@jest/console';
import type {JestEnvironment} from '@jest/environment';
import RuntimeClass = require('jest-runtime');
import * as fs from 'graceful-fs';
import {ErrorWithStack, interopRequireDefault, setGlobal} from 'jest-util';
import LeakDetector from 'jest-leak-detector';
import Resolver = require('jest-resolve');
import {getTestEnvironment} from 'jest-config';
import * as docblock from 'jest-docblock';
import {formatExecError} from 'jest-message-util';
import sourcemapSupport = require('source-map-support');
import chalk = require('chalk');
import type {TestFramework, TestRunnerContext} from './types';

type RunTestInternalResult = {
  leakDetector: LeakDetector | null;
  result: TestResult;
};

function freezeConsole(
  testConsole: BufferedConsole | CustomConsole | NullConsole,
  config: Config.ProjectConfig,
) {
  // @ts-ignore: `_log` is `private` - we should figure out some proper API here
  testConsole._log = function fakeConsolePush(
    _type: LogType,
    message: LogMessage,
  ) {
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
  path: Config.Path,
  globalConfig: Config.GlobalConfig,
  config: Config.ProjectConfig,
  resolver: Resolver,
  context?: TestRunnerContext,
): Promise<RunTestInternalResult> {
  const testSource = fs.readFileSync(path, 'utf8');
  const docblockPragmas = docblock.parse(docblock.extract(testSource));
  const customEnvironment = docblockPragmas['jest-environment'];

  let testEnvironment = config.testEnvironment;

  if (customEnvironment) {
    if (Array.isArray(customEnvironment)) {
      throw new Error(
        `You can only define a single test environment through docblocks, got "${customEnvironment.join(
          ', ',
        )}"`,
      );
    }
    testEnvironment = getTestEnvironment({
      ...config,
      testEnvironment: customEnvironment,
    });
  }

  const TestEnvironment: typeof JestEnvironment = interopRequireDefault(
    require(testEnvironment),
  ).default;
  const testFramework: TestFramework =
    process.env.JEST_CIRCUS === '1'
      ? require('jest-circus/runner') // eslint-disable-line import/no-extraneous-dependencies
      : require(config.testRunner);
  const Runtime: typeof RuntimeClass = config.moduleLoader
    ? require(config.moduleLoader)
    : require('jest-runtime');

  const consoleOut = globalConfig.useStderr ? process.stderr : process.stdout;
  const consoleFormatter = (type: LogType, message: LogMessage) =>
    getConsoleOutput(
      config.cwd,
      !!globalConfig.verbose,
      // 4 = the console call is buried 4 stack frames deep
      BufferedConsole.write([], type, message, 4),
      config,
    );

  let testConsole;

  if (globalConfig.silent) {
    testConsole = new NullConsole(consoleOut, consoleOut, consoleFormatter);
  } else if (globalConfig.verbose) {
    testConsole = new CustomConsole(consoleOut, consoleOut, consoleFormatter);
  } else {
    testConsole = new BufferedConsole();
  }

  const environment = new TestEnvironment(config, {
    console: testConsole,
    docblockPragmas,
    testPath: path,
  });
  const leakDetector = config.detectLeaks
    ? new LeakDetector(environment)
    : null;

  const cacheFS = {[path]: testSource};
  setGlobal(environment.global, 'console', testConsole);

  const runtime = new Runtime(config, environment, resolver, cacheFS, {
    changedFiles: context && context.changedFiles,
    collectCoverage: globalConfig.collectCoverage,
    coverageProvider: globalConfig.coverageProvider,
  });

  const start = Date.now();

  config.setupFiles.forEach(path => runtime.requireModule(path));

  const sourcemapOptions: sourcemapSupport.Options = {
    environment: 'node',
    handleUncaughtExceptions: false,
    retrieveSourceMap: source => {
      const sourceMaps = runtime.getSourceMaps();
      const sourceMapSource = sourceMaps && sourceMaps[source];

      if (sourceMapSource) {
        try {
          return {
            map: JSON.parse(fs.readFileSync(sourceMapSource, 'utf8')),
            url: source,
          };
        } catch (e) {}
      }
      return null;
    },
  };

  // For tests
  runtime
    .requireInternalModule<typeof import('source-map-support')>(
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

    environment.global.process.exit = function exit(...args: Array<any>) {
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

  // if we don't have `getVmContext` on the env,or `compileFunction` available skip coverage
  const collectV8Coverage =
    globalConfig.coverageProvider === 'v8' &&
    typeof environment.getVmContext === 'function' &&
    typeof compileFunction === 'function';

  try {
    await environment.setup();

    let result: TestResult;

    try {
      if (collectV8Coverage) {
        await runtime.collectV8Coverage();
      }
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
    } finally {
      if (collectV8Coverage) {
        await runtime.stopCollectingV8Coverage();
      }
    }

    freezeConsole(testConsole, config);

    const testCount =
      result.numPassingTests +
      result.numFailingTests +
      result.numPendingTests +
      result.numTodoTests;

    result.perfStats = {end: Date.now(), start};
    result.testFilePath = path;
    result.console = testConsole.getBuffer();
    result.skipped = testCount === result.numPendingTests;
    result.displayName = config.displayName;

    const coverage = runtime.getAllCoverageInfoCopy();
    if (coverage) {
      const coverageKeys = Object.keys(coverage);
      if (coverageKeys.length) {
        result.coverage = coverage;
        result.sourceMaps = runtime.getSourceMapInfo(new Set(coverageKeys));
      }
    }

    if (collectV8Coverage) {
      const v8Coverage = runtime.getAllV8CoverageInfoCopy();
      if (v8Coverage && v8Coverage.length > 0) {
        result.v8Coverage = v8Coverage;
      }
    }

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
  path: Config.Path,
  globalConfig: Config.GlobalConfig,
  config: Config.ProjectConfig,
  resolver: Resolver,
  context?: TestRunnerContext,
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
    result.leaks = await leakDetector.isLeaking();
  } else {
    result.leaks = false;
  }

  return result;
}
