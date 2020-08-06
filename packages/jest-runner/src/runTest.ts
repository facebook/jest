/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Config} from '@jest/types';
import type {TestResult} from '@jest/test-result';
import {
  BufferedConsole,
  ConsoleBuffer,
  CustomConsole,
  LogApi,
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
import type {ResolverType} from 'jest-resolve';
import {getTestEnvironment} from 'jest-config';
import * as docblock from 'jest-docblock';
import {formatExecError} from 'jest-message-util';
import sourcemapSupport = require('source-map-support');
import chalk = require('chalk');
import {Transform} from 'readable-stream';
import type {TestFileEvent, TestFramework, TestRunnerContext} from './types';

type RunTestInternalResult = {
  leakDetector: LeakDetector | null;
  result: TestResult;
};

function freezeConsole(
  testConsole: BufferedConsole | CustomConsole | NullConsole,
  config: Config.ProjectConfig,
) {
  // @ts-expect-error: `_log` is `private` - we should figure out some proper API here
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
  resolver: ResolverType,
  context?: TestRunnerContext,
  sendMessageToJest?: TestFileEvent,
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
  const consoleFormatter = (
    type: LogType,
    message: LogMessage,
    api: LogApi = 'console',
    level = 4,
  ) =>
    getConsoleOutput(
      config.cwd,
      !!globalConfig.verbose,
      // 4 = the console call is buried 4 stack frames deep
      BufferedConsole.write([], type, message, level, api),
      config,
      globalConfig,
    );

  let testConsole;
  let testStdOut: NodeJS.WriteStream;
  let testStdErr: NodeJS.WriteStream;
  let buffer: ConsoleBuffer;

  if (globalConfig.silent) {
    testConsole = new NullConsole(consoleOut, consoleOut, consoleFormatter);
    testStdOut = new Transform({
      transform(_chunk, _encoding, callback) {
        callback();
      },
    });
    testStdErr = new Transform({
      transform(_chunk, _encoding, callback) {
        callback();
      },
    });
  } else if (globalConfig.verbose) {
    testConsole = new CustomConsole(consoleOut, consoleOut, consoleFormatter);
    testStdOut = new Transform({
      transform(chunk, _encoding, callback) {
        callback(undefined, chunk);
      },
    });
    testStdErr = new Transform({
      transform(chunk, _encoding, callback) {
        callback(undefined, chunk);
      },
    });
  } else {
    buffer = [];
    testConsole = new BufferedConsole(buffer);
    testStdOut = new Transform({
      transform(chunk, _encoding, callback) {
        callback(undefined, chunk);
      },
    });
    testStdErr = new Transform({
      transform(chunk, _encoding, callback) {
        callback(undefined, chunk);
      },
    });
  }

  const originalStdOutWrite = testStdOut.write;
  const originalStdErrWrite = testStdErr.write;

  testStdOut.write = (chunk: string, ...rest: Array<any>) => {
    const type = 'write';
    const message = chunk.toString() + '\n';
    const api = 'process.stdout';

    if (buffer) {
      BufferedConsole.write(buffer, type, message, 2, api);
    } else if (globalConfig.verbose) {
      consoleOut.write(consoleFormatter(type, message, api, 3));
    }

    return originalStdOutWrite.call(testStdOut, chunk, ...rest);
  };

  testStdErr.write = (chunk: string, ...rest: Array<any>) => {
    const type = 'write';
    const message = chunk.toString() + '\n';
    const api = 'process.stderr';

    if (buffer) {
      BufferedConsole.write(buffer, type, message, 2, api);
    } else if (globalConfig.verbose) {
      consoleOut.write(consoleFormatter(type, message, api, 3));
    }

    return originalStdErrWrite.call(testStdErr, chunk, ...rest);
  };

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

  testStdOut.isTTY = environment.global.process.stdout.isTTY;
  testStdErr.isTTY = environment.global.process.stderr.isTTY;

  Object.defineProperty(environment.global.process, 'stdout', {
    value: testStdOut,
    writable: false,
  });
  Object.defineProperty(environment.global.process, 'stderr', {
    value: testStdErr,
    writable: false,
  });

  const runtime = new Runtime(config, environment, resolver, cacheFS, {
    changedFiles: context?.changedFiles,
    collectCoverage: globalConfig.collectCoverage,
    collectCoverageFrom: globalConfig.collectCoverageFrom,
    collectCoverageOnlyFrom: globalConfig.collectCoverageOnlyFrom,
    coverageProvider: globalConfig.coverageProvider,
    sourcesRelatedToTestsInChangedFiles:
      context?.sourcesRelatedToTestsInChangedFiles,
  });

  const start = Date.now();

  for (const path of config.setupFiles) {
    // TODO: remove ? in Jest 26
    const esm = runtime.unstable_shouldLoadAsEsm?.(path);

    if (esm) {
      await runtime.unstable_importModule(path);
    } else {
      runtime.requireModule(path);
    }
  }

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
        } catch {}
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

  // if we don't have `getVmContext` on the env skip coverage
  const collectV8Coverage =
    globalConfig.coverageProvider === 'v8' &&
    typeof environment.getVmContext === 'function';

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
        sendMessageToJest,
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

    const end = Date.now();
    const testRuntime = end - start;
    result.perfStats = {
      end,
      runtime: testRuntime,
      slow: testRuntime / 1000 > config.slowTestThreshold,
      start,
    };
    result.testFilePath = path;
    result.console = testConsole.getBuffer();
    result.skipped = testCount === result.numPendingTests;
    result.displayName = config.displayName;

    const coverage = runtime.getAllCoverageInfoCopy();
    if (coverage) {
      const coverageKeys = Object.keys(coverage);
      if (coverageKeys.length) {
        result.coverage = coverage;
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
    // TODO: this function might be missing, remove ? in Jest 26
    runtime.teardown?.();

    sourcemapSupport.resetRetrieveHandlers();
  }
}

export default async function runTest(
  path: Config.Path,
  globalConfig: Config.GlobalConfig,
  config: Config.ProjectConfig,
  resolver: ResolverType,
  context?: TestRunnerContext,
  sendMessageToJest?: TestFileEvent,
): Promise<TestResult> {
  const {leakDetector, result} = await runTestInternal(
    path,
    globalConfig,
    config,
    resolver,
    context,
    sendMessageToJest,
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
