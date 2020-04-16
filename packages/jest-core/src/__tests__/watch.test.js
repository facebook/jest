/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import chalk from 'chalk';
import TestWatcher from '../TestWatcher';
import {JestHook, KEYS} from 'jest-watcher';

const runJestMock = jest.fn();
const watchPluginPath = `${__dirname}/__fixtures__/watch_plugin`;
const watchPlugin2Path = `${__dirname}/__fixtures__/watch_plugin2`;
let results;

jest.mock(
  '../SearchSource',
  () =>
    class {
      constructor(context) {
        this._context = context;
      }

      findMatchingTests(pattern) {
        const paths = [
          './path/to/file1-test.js',
          './path/to/file2-test.js',
        ].filter(path => path.match(pattern));

        return {
          tests: paths.map(path => ({
            context: this._context,
            duration: null,
            path,
          })),
        };
      }
    },
);

jest.doMock('chalk', () => new chalk.Instance({level: 0}));
jest.doMock(
  '../runJest',
  () =>
    function () {
      const args = Array.from(arguments);
      const [{onComplete}] = args;
      runJestMock.apply(null, args);

      // Call the callback
      onComplete(results);

      return Promise.resolve();
    },
);

jest.doMock(
  watchPluginPath,
  () =>
    class WatchPlugin1 {
      getUsageInfo() {
        return {
          key: 's',
          prompt: 'do nothing',
        };
      }
    },
  {virtual: true},
);

jest.doMock(
  watchPlugin2Path,
  () =>
    class WatchPlugin2 {
      getUsageInfo() {
        return {
          key: 'r',
          prompt: 'do something else',
        };
      }
    },
  {virtual: true},
);

const regularUpdateGlobalConfig = require('../lib/update_global_config')
  .default;
const updateGlobalConfig = jest.fn(regularUpdateGlobalConfig);
jest.doMock('../lib/update_global_config', () => updateGlobalConfig);

const nextTick = () => new Promise(res => process.nextTick(res));

beforeAll(() => {
  jest.spyOn(process, 'on').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

afterEach(runJestMock.mockReset);

describe('Watch mode flows', () => {
  let watch;
  let isInteractive;
  let pipe;
  let hasteMapInstances;
  let globalConfig;
  let contexts;
  let stdin;

  beforeEach(() => {
    isInteractive = true;
    jest.doMock('jest-util/build/isInteractive', () => isInteractive);
    watch = require('../watch').default;
    const config = {
      rootDir: __dirname,
      roots: [],
      testPathIgnorePatterns: [],
      testRegex: [],
    };
    pipe = {write: jest.fn()};
    globalConfig = {watch: true};
    hasteMapInstances = [{on: () => {}}];
    contexts = [{config}];
    stdin = new MockStdin();
    results = {snapshot: {}};
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('Correctly passing test path pattern', () => {
    globalConfig.testPathPattern = 'test-*';

    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin);

    expect(runJestMock.mock.calls[0][0]).toMatchObject({
      contexts,
      globalConfig,
      onComplete: expect.any(Function),
      outputStream: pipe,
      testWatcher: new TestWatcher({isWatchMode: true}),
    });
  });

  it('Correctly passing test name pattern', () => {
    globalConfig.testNamePattern = 'test-*';

    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin);

    expect(runJestMock.mock.calls[0][0]).toMatchObject({
      contexts,
      globalConfig,
      onComplete: expect.any(Function),
      outputStream: pipe,
      testWatcher: new TestWatcher({isWatchMode: true}),
    });
  });

  it('Runs Jest once by default and shows usage', () => {
    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin);
    expect(runJestMock.mock.calls[0][0]).toMatchObject({
      contexts,
      globalConfig,
      onComplete: expect.any(Function),
      outputStream: pipe,
      testWatcher: new TestWatcher({isWatchMode: true}),
    });
    expect(pipe.write.mock.calls.reverse()[0]).toMatchSnapshot();
  });

  it('Runs Jest in a non-interactive environment not showing usage', () => {
    jest.resetModules();
    isInteractive = false;

    watch = require('../watch').default;
    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin);
    expect(runJestMock.mock.calls[0][0]).toMatchObject({
      contexts,
      globalConfig,
      onComplete: expect.any(Function),
      outputStream: pipe,
      testWatcher: new TestWatcher({isWatchMode: true}),
    });
    expect(pipe.write.mock.calls.reverse()[0]).toMatchSnapshot();
  });

  it('resolves relative to the package root', () => {
    expect(async () => {
      await watch(
        {
          ...globalConfig,
          rootDir: __dirname,
          watchPlugins: [{config: {}, path: watchPluginPath}],
        },
        contexts,
        pipe,
        hasteMapInstances,
        stdin,
      );
    }).not.toThrow();
  });

  it('shows prompts for WatchPlugins in alphabetical order', async () => {
    watch(
      {
        ...globalConfig,
        rootDir: __dirname,
        watchPlugins: [
          {config: {}, path: watchPluginPath},
          {config: {}, path: watchPlugin2Path},
        ],
      },
      contexts,
      pipe,
      hasteMapInstances,
      stdin,
    );

    const pipeMockCalls = pipe.write.mock.calls;

    const determiningTestsToRun = pipeMockCalls.findIndex(
      ([c]) => c === 'Determining test suites to run...',
    );

    expect(pipeMockCalls.slice(determiningTestsToRun + 1)).toMatchSnapshot();
  });

  it('shows update snapshot prompt (without interactive)', async () => {
    results = {snapshot: {failure: true}};

    watch(
      {
        ...globalConfig,
        rootDir: __dirname,
        watchPlugins: [],
      },
      contexts,
      pipe,
      hasteMapInstances,
      stdin,
    );

    const pipeMockCalls = pipe.write.mock.calls;

    const determiningTestsToRun = pipeMockCalls.findIndex(
      ([c]) => c === 'Determining test suites to run...',
    );

    expect(pipeMockCalls.slice(determiningTestsToRun + 1)).toMatchSnapshot();
  });

  it('shows update snapshot prompt (with interactive)', async () => {
    results = {
      numFailedTests: 1,
      snapshot: {
        failure: true,
      },
      testPath: 'test.js',
      testResults: [
        {
          snapshot: {
            unmatched: true,
          },
          testResults: [
            {
              status: 'failed',
              title: 'test a',
            },
          ],
        },
      ],
    };

    watch(
      {
        ...globalConfig,
        rootDir: __dirname,
        watchPlugins: [],
      },
      contexts,
      pipe,
      hasteMapInstances,
      stdin,
    );

    const pipeMockCalls = pipe.write.mock.calls;

    const determiningTestsToRun = pipeMockCalls.findIndex(
      ([c]) => c === 'Determining test suites to run...',
    );

    expect(pipeMockCalls.slice(determiningTestsToRun + 1)).toMatchSnapshot();
  });

  it('allows WatchPlugins to hook into JestHook', async () => {
    const apply = jest.fn();
    const pluginPath = `${__dirname}/__fixtures__/plugin_path_register`;
    jest.doMock(
      pluginPath,
      () =>
        class WatchPlugin {
          constructor() {
            this.apply = apply;
          }
        },
      {virtual: true},
    );

    watch(
      {
        ...globalConfig,
        rootDir: __dirname,
        watchPlugins: [{config: {}, path: pluginPath}],
      },
      contexts,
      pipe,
      hasteMapInstances,
      stdin,
    );

    await nextTick();

    expect(apply).toHaveBeenCalled();
  });

  it('allows WatchPlugins to override eligible internal plugins', async () => {
    const run = jest.fn(() => Promise.resolve());
    const pluginPath = `${__dirname}/__fixtures__/plugin_path_override`;
    jest.doMock(
      pluginPath,
      () =>
        class WatchPlugin {
          constructor() {
            this.run = run;
          }
          getUsageInfo() {
            return {
              key: 'p',
              prompt: 'custom "P" plugin',
            };
          }
        },
      {virtual: true},
    );

    watch(
      {
        ...globalConfig,
        rootDir: __dirname,
        watchPlugins: [{config: {}, path: pluginPath}],
      },
      contexts,
      pipe,
      hasteMapInstances,
      stdin,
    );

    await nextTick();

    expect(pipe.write.mock.calls.reverse()[0]).toMatchSnapshot();

    stdin.emit('p');
    await nextTick();

    expect(run).toHaveBeenCalled();
  });

  describe('when dealing with potential watch plugin key conflicts', () => {
    it.each`
      key    | plugin
      ${'q'} | ${'Quit'}
      ${'u'} | ${'UpdateSnapshots'}
      ${'i'} | ${'UpdateSnapshotsInteractive'}
    `(
      'forbids WatchPlugins overriding reserved internal plugins',
      ({key, plugin}) => {
        const run = jest.fn(() => Promise.resolve());
        const pluginPath = `${__dirname}/__fixtures__/plugin_bad_override_${key}`;
        jest.doMock(
          pluginPath,
          () =>
            class OffendingWatchPlugin {
              constructor() {
                this.run = run;
              }
              getUsageInfo() {
                return {
                  key,
                  prompt: `custom "${key.toUpperCase()}" plugin`,
                };
              }
            },
          {virtual: true},
        );

        expect(() => {
          watch(
            {
              ...globalConfig,
              rootDir: __dirname,
              watchPlugins: [{config: {}, path: pluginPath}],
            },
            contexts,
            pipe,
            hasteMapInstances,
            stdin,
          );
        }).toThrowError(
          new RegExp(
            `Watch plugin OffendingWatchPlugin attempted to register key <${key}>,\\s+that is reserved internally for .+\\.\\s+Please change the configuration key for this plugin\\.`,
            'm',
          ),
        );
      },
    );

    // The jury's still out on 'a', 'c', 'f', 'o', 'w' and '?'…
    // See https://github.com/facebook/jest/issues/6693
    it.each`
      key    | plugin
      ${'t'} | ${'TestNamePattern'}
      ${'p'} | ${'TestPathPattern'}
    `(
      'allows WatchPlugins to override non-reserved internal plugins',
      ({key, plugin}) => {
        const run = jest.fn(() => Promise.resolve());
        const pluginPath = `${__dirname}/__fixtures__/plugin_valid_override_${key}`;
        jest.doMock(
          pluginPath,
          () =>
            class ValidWatchPlugin {
              constructor() {
                this.run = run;
              }
              getUsageInfo() {
                return {
                  key,
                  prompt: `custom "${key.toUpperCase()}" plugin`,
                };
              }
            },
          {virtual: true},
        );

        watch(
          {
            ...globalConfig,
            rootDir: __dirname,
            watchPlugins: [{config: {}, path: pluginPath}],
          },
          contexts,
          pipe,
          hasteMapInstances,
          stdin,
        );
      },
    );

    it('forbids third-party WatchPlugins overriding each other', () => {
      const pluginPaths = ['Foo', 'Bar'].map(ident => {
        const run = jest.fn(() => Promise.resolve());
        const pluginPath = `${__dirname}/__fixtures__/plugin_bad_override_${ident.toLowerCase()}`;
        jest.doMock(
          pluginPath,
          () => {
            class OffendingThirdPartyWatchPlugin {
              constructor() {
                this.run = run;
              }
              getUsageInfo() {
                return {
                  key: '!',
                  prompt: `custom "!" plugin ${ident}`,
                };
              }
            }
            OffendingThirdPartyWatchPlugin.displayName = `Offending${ident}ThirdPartyWatchPlugin`;
            return OffendingThirdPartyWatchPlugin;
          },
          {virtual: true},
        );
        return pluginPath;
      });

      expect(() => {
        watch(
          {
            ...globalConfig,
            rootDir: __dirname,
            watchPlugins: pluginPaths.map(path => ({config: {}, path})),
          },
          contexts,
          pipe,
          hasteMapInstances,
          stdin,
        );
      }).toThrowError(
        /Watch plugins OffendingFooThirdPartyWatchPlugin and OffendingBarThirdPartyWatchPlugin both attempted to register key <!>\.\s+Please change the key configuration for one of the conflicting plugins to avoid overlap\./m,
      );
    });
  });

  it('allows WatchPlugins to be configured', async () => {
    const pluginPath = `${__dirname}/__fixtures__/plugin_path_with_config`;
    jest.doMock(
      pluginPath,
      () =>
        class WatchPlugin {
          constructor({config}) {
            this._key = config.key;
            this._prompt = config.prompt;
          }
          onKey() {}
          run() {}
          getUsageInfo() {
            return {
              key: this._key || 'z',
              prompt: this._prompt || 'default prompt',
            };
          }
        },
      {virtual: true},
    );

    watch(
      {
        ...globalConfig,
        rootDir: __dirname,
        watchPlugins: [
          {
            config: {key: 'k', prompt: 'filter with a custom prompt'},
            path: pluginPath,
          },
        ],
      },
      contexts,
      pipe,
      hasteMapInstances,
      stdin,
    );

    expect(pipe.write.mock.calls.reverse()[0]).toMatchSnapshot();
  });

  it('allows WatchPlugins to hook into file system changes', async () => {
    const onFileChange = jest.fn();
    const pluginPath = `${__dirname}/__fixtures__/plugin_path_fs_change`;
    jest.doMock(
      pluginPath,
      () =>
        class WatchPlugin {
          apply(jestHooks) {
            jestHooks.onFileChange(onFileChange);
          }
        },
      {virtual: true},
    );

    watch(
      {
        ...globalConfig,
        rootDir: __dirname,
        watchPlugins: [{config: {}, path: pluginPath}],
      },
      contexts,
      pipe,
      hasteMapInstances,
      stdin,
    );

    expect(onFileChange).toHaveBeenCalledWith({
      projects: [
        {
          config: contexts[0].config,
          testPaths: ['./path/to/file1-test.js', './path/to/file2-test.js'],
        },
      ],
    });
  });

  it('makes watch plugin initialization errors look nice', async () => {
    const pluginPath = `${__dirname}/__fixtures__/watch_plugin_throws`;

    await expect(
      watch(
        {
          ...globalConfig,
          rootDir: __dirname,
          watchPlugins: [{config: {}, path: pluginPath}],
        },
        contexts,
        pipe,
        hasteMapInstances,
        stdin,
      ),
    ).rejects.toMatchSnapshot();
  });

  it.each`
    ok      | option
    ${'✔︎'} | ${'bail'}
    ${'✖︎'} | ${'changedFilesWithAncestor'}
    ${'✔︎'} | ${'changedSince'}
    ${'✔︎'} | ${'collectCoverage'}
    ${'✔︎'} | ${'coverageDirectory'}
    ${'✔︎'} | ${'coverageReporters'}
    ${'✖︎'} | ${'detectLeaks'}
    ${'✖︎'} | ${'detectOpenHandles'}
    ${'✖︎'} | ${'enabledTestsMap'}
    ${'✖︎'} | ${'errorOnDeprecated'}
    ${'✖︎'} | ${'expand'}
    ${'✖︎'} | ${'filter'}
    ${'✖︎'} | ${'findRelatedTests'}
    ${'✖︎'} | ${'forceExit'}
    ${'✖︎'} | ${'globalSetup'}
    ${'✖︎'} | ${'globalTeardown'}
    ${'✖︎'} | ${'json'}
    ${'✖︎'} | ${'lastCommit'}
    ${'✖︎'} | ${'listTests'}
    ${'✖︎'} | ${'logHeapUsage'}
    ${'✖︎'} | ${'maxWorkers'}
    ${'✖︎'} | ${'nonFlagArgs'}
    ${'✖︎'} | ${'noSCM'}
    ${'✖︎'} | ${'noStackTrace'}
    ${'✔︎'} | ${'notify'}
    ${'✔︎'} | ${'notifyMode'}
    ${'✖︎'} | ${'onlyChanged'}
    ${'✔︎'} | ${'onlyFailures'}
    ${'✖︎'} | ${'outputFile'}
    ${'✖︎'} | ${'passWithNoTests'}
    ${'✖︎'} | ${'projects'}
    ${'✖︎'} | ${'replname'}
    ${'✔︎'} | ${'reporters'}
    ${'✖︎'} | ${'rootDir'}
    ${'✖︎'} | ${'runTestsByPath'}
    ${'✖︎'} | ${'silent'}
    ${'✖︎'} | ${'skipFilter'}
    ${'✖︎'} | ${'testFailureExitCode'}
    ${'✔︎'} | ${'testNamePattern'}
    ${'✔︎'} | ${'testPathPattern'}
    ${'✖︎'} | ${'testResultsProcessor'}
    ${'✔︎'} | ${'updateSnapshot'}
    ${'✖︎'} | ${'useStderr'}
    ${'✔︎'} | ${'verbose'}
    ${'✖︎'} | ${'watch'}
    ${'✖︎'} | ${'watchAll'}
    ${'✖︎'} | ${'watchman'}
    ${'✖︎'} | ${'watchPlugins'}
  `(
    'allows WatchPlugins to modify only white-listed global config keys',
    async ({ok, option}) => {
      ok = ok === '✔︎';
      const pluginPath = `${__dirname}/__fixtures__/plugin_path_config_updater_${option}`;

      jest.doMock(
        pluginPath,
        () =>
          class WatchPlugin {
            getUsageInfo() {
              return {key: 'x', prompt: 'test option white-listing'};
            }

            run(globalConfig, updateConfigAndRun) {
              updateConfigAndRun({[option]: '__JUST_TRYING__'});
              return Promise.resolve();
            }
          },
        {virtual: true},
      );

      const config = {
        ...globalConfig,
        rootDir: __dirname,
        watchPlugins: [{config: {}, path: pluginPath}],
      };

      watch(config, contexts, pipe, hasteMapInstances, stdin);
      await nextTick();

      stdin.emit('x');
      await nextTick();

      // We need the penultimate call as Jest forces a final call to restore
      // updateSnapshot because it's not sticky after a run…?
      const lastCall = updateGlobalConfig.mock.calls.slice(-2)[0];
      let expector = expect(lastCall[1]);
      if (!ok) {
        expector = expector.not;
      }
      expector.toHaveProperty(option, '__JUST_TRYING__');
    },
  );

  it('triggers enter on a WatchPlugin when its key is pressed', async () => {
    const run = jest.fn(() => Promise.resolve());
    const pluginPath = `${__dirname}/__fixtures__/plugin_path`;
    jest.doMock(
      pluginPath,
      () =>
        class WatchPlugin1 {
          constructor() {
            this.run = run;
          }
          getUsageInfo() {
            return {
              key: 's',
              prompt: 'do nothing',
            };
          }
        },
      {virtual: true},
    );

    watch(
      {
        ...globalConfig,
        rootDir: __dirname,
        watchPlugins: [{config: {}, path: pluginPath}],
      },
      contexts,
      pipe,
      hasteMapInstances,
      stdin,
    );

    stdin.emit('s');

    await nextTick();

    expect(run).toHaveBeenCalled();
  });

  it('prevents Jest from handling keys when active and returns control when end is called', async () => {
    let resolveShowPrompt;
    const run = jest.fn(() => new Promise(res => (resolveShowPrompt = res)));
    const pluginPath = `${__dirname}/__fixtures__/plugin_path_1`;
    jest.doMock(
      pluginPath,
      () =>
        class WatchPlugin1 {
          constructor() {
            this.run = run;
          }
          onKey() {}
          getUsageInfo() {
            return {
              key: 's',
              prompt: 'do nothing',
            };
          }
        },
      {virtual: true},
    );

    const showPrompt2 = jest.fn(() => Promise.resolve());
    const pluginPath2 = `${__dirname}/__fixtures__/plugin_path_2`;
    jest.doMock(
      pluginPath2,
      () =>
        class WatchPlugin1 {
          constructor() {
            this.run = showPrompt2;
          }
          onKey() {}
          getUsageInfo() {
            return {
              key: 'z',
              prompt: 'also do nothing',
            };
          }
        },
      {virtual: true},
    );

    watch(
      {
        ...globalConfig,
        rootDir: __dirname,
        watchPlugins: [
          {config: {}, path: pluginPath},
          {config: {}, path: pluginPath2},
        ],
      },
      contexts,
      pipe,
      hasteMapInstances,
      stdin,
    );

    stdin.emit('s');
    await nextTick();
    expect(run).toHaveBeenCalled();
    stdin.emit('z');
    await nextTick();
    expect(showPrompt2).not.toHaveBeenCalled();
    await resolveShowPrompt();
    stdin.emit('z');
    expect(showPrompt2).toHaveBeenCalled();
  });

  it('Pressing "o" runs test in "only changed files" mode', () => {
    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin);
    runJestMock.mockReset();

    stdin.emit('o');

    expect(runJestMock).toBeCalled();
    expect(runJestMock.mock.calls[0][0].globalConfig).toMatchObject({
      onlyChanged: true,
      watch: true,
      watchAll: false,
    });
  });

  it('Pressing "a" runs test in "watch all" mode', () => {
    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin);
    runJestMock.mockReset();

    stdin.emit('a');

    expect(runJestMock).toBeCalled();
    expect(runJestMock.mock.calls[0][0].globalConfig).toMatchObject({
      onlyChanged: false,
      watch: false,
      watchAll: true,
    });
  });

  it('Pressing "ENTER" reruns the tests', () => {
    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin);
    expect(runJestMock).toHaveBeenCalledTimes(1);
    stdin.emit(KEYS.ENTER);
    expect(runJestMock).toHaveBeenCalledTimes(2);
  });

  it('Pressing "t" reruns the tests in "test name pattern" mode', async () => {
    const hooks = new JestHook();

    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin, hooks);
    runJestMock.mockReset();

    stdin.emit('t');
    ['t', 'e', 's', 't'].forEach(key => stdin.emit(key));
    stdin.emit(KEYS.ENTER);
    await nextTick();

    expect(runJestMock.mock.calls[0][0].globalConfig).toMatchObject({
      testNamePattern: 'test',
      watch: true,
      watchAll: false,
    });
  });

  it('Pressing "p" reruns the tests in "filename pattern" mode', async () => {
    const hooks = new JestHook();

    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin, hooks);
    runJestMock.mockReset();

    stdin.emit('p');
    ['f', 'i', 'l', 'e'].forEach(key => stdin.emit(key));
    stdin.emit(KEYS.ENTER);
    await nextTick();

    expect(runJestMock.mock.calls[0][0].globalConfig).toMatchObject({
      testPathPattern: 'file',
      watch: true,
      watchAll: false,
    });
  });

  it('Can combine "p" and "t" filters', async () => {
    const hooks = new JestHook();

    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin, hooks);
    runJestMock.mockReset();

    stdin.emit('p');
    ['f', 'i', 'l', 'e'].forEach(key => stdin.emit(key));
    stdin.emit(KEYS.ENTER);
    await nextTick();

    stdin.emit('t');
    ['t', 'e', 's', 't'].forEach(key => stdin.emit(key));
    stdin.emit(KEYS.ENTER);
    await nextTick();

    expect(runJestMock.mock.calls[1][0].globalConfig).toMatchObject({
      testNamePattern: 'test',
      testPathPattern: 'file',
      watch: true,
      watchAll: false,
    });
  });

  it('Pressing "u" reruns the tests in "update snapshot" mode', async () => {
    const hooks = new JestHook();

    globalConfig.updateSnapshot = 'new';

    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin, hooks);
    runJestMock.mockReset();

    hooks.getEmitter().onTestRunComplete({snapshot: {failure: true}});

    stdin.emit('u');
    await nextTick();

    expect(runJestMock.mock.calls[0][0].globalConfig).toMatchObject({
      updateSnapshot: 'all',
      watch: true,
      watchAll: false,
    });

    stdin.emit('a');

    await nextTick();
    // updateSnapshot is not sticky after a run.
    expect(runJestMock.mock.calls[1][0].globalConfig).toMatchObject({
      updateSnapshot: 'new',
      watch: false,
      watchAll: true,
    });

    results = {snapshot: {failure: true}};

    stdin.emit('a');
    await nextTick();

    runJestMock.mockReset();
    stdin.emit('u');
    await nextTick();

    expect(runJestMock.mock.calls[0][0].globalConfig).toMatchObject({
      updateSnapshot: 'all',
      watch: false,
      watchAll: true,
    });
  });

  it('passWithNoTest should be set to true in watch mode', () => {
    globalConfig.passWithNoTests = false;
    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin);
    globalConfig.passWithNoTests = true;
    expect(runJestMock.mock.calls[0][0]).toMatchObject({
      globalConfig,
    });
  });

  it('shows the correct usage for the f key in "only failed tests" mode', () => {
    watch(globalConfig, contexts, pipe, hasteMapInstances, stdin);

    stdin.emit('f');
    stdin.emit('w');

    const lastWatchDisplay = pipe.write.mock.calls.reverse()[0][0];
    expect(lastWatchDisplay).toMatch('Press a to run all tests.');
    expect(lastWatchDisplay).toMatch(
      'Press f to quit "only failed tests" mode',
    );
  });
});

class MockStdin {
  constructor() {
    this._callbacks = [];
  }

  setRawMode() {}

  resume() {}

  setEncoding() {}

  on(evt, callback) {
    this._callbacks.push(callback);
  }

  emit(key) {
    this._callbacks.forEach(cb => cb(key));
  }
}
