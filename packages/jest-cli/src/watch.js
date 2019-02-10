/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig} from 'types/Config';
import type {Context} from 'types/Context';
import type {WatchPlugin} from './types';
import type {Options as UpdateGlobalConfigOptions} from './lib/update_global_config';

import ansiEscapes from 'ansi-escapes';
import chalk from 'chalk';
import getChangedFilesPromise from './getChangedFilesPromise';
import exit from 'exit';
import HasteMap from 'jest-haste-map';
import {formatExecError} from 'jest-message-util';
import isValidPath from './lib/is_valid_path';
import {isInteractive, specialChars} from 'jest-util';
import {print as preRunMessagePrint} from './preRunMessage';
import createContext from './lib/create_context';
import runJest from './runJest';
import updateGlobalConfig from './lib/update_global_config';
import SearchSource from './SearchSource';
import TestWatcher from './TestWatcher';
import FailedTestsCache from './FailedTestsCache';
import {KEYS, JestHook} from 'jest-watcher';
import TestPathPatternPlugin from './plugins/test_path_pattern';
import TestNamePatternPlugin from './plugins/test_name_pattern';
import UpdateSnapshotsPlugin from './plugins/update_snapshots';
import UpdateSnapshotsInteractivePlugin from './plugins/update_snapshots_interactive';
import QuitPlugin from './plugins/quit';
import {
  getSortedUsageRows,
  filterInteractivePlugins,
} from './lib/watch_plugins_helpers';
import {ValidationError} from 'jest-validate';
import activeFilters from './lib/active_filters_message';

let hasExitListener = false;

const INTERNAL_PLUGINS = [
  TestPathPatternPlugin,
  TestNamePatternPlugin,
  UpdateSnapshotsPlugin,
  UpdateSnapshotsInteractivePlugin,
  QuitPlugin,
];

const RESERVED_KEY_PLUGINS = new Map([
  [
    UpdateSnapshotsPlugin,
    {forbiddenOverwriteMessage: 'updating snapshots', key: 'u'},
  ],
  [
    UpdateSnapshotsInteractivePlugin,
    {forbiddenOverwriteMessage: 'updating snapshots interactively', key: 'i'},
  ],
  [QuitPlugin, {forbiddenOverwriteMessage: 'quitting watch mode'}],
]);

export default function watch(
  initialGlobalConfig: GlobalConfig,
  contexts: Array<Context>,
  outputStream: stream$Writable | tty$WriteStream,
  hasteMapInstances: Array<HasteMap>,
  stdin?: stream$Readable | tty$ReadStream = process.stdin,
  hooks?: JestHook = new JestHook(),
): Promise<void> {
  // `globalConfig` will be constantly updated and reassigned as a result of
  // watch mode interactions.
  let globalConfig = initialGlobalConfig;
  let activePlugin: ?WatchPlugin;

  globalConfig = updateGlobalConfig(globalConfig, {
    mode: globalConfig.watch ? 'watch' : 'watchAll',
    passWithNoTests: true,
  });

  const updateConfigAndRun = ({
    bail,
    changedSince,
    collectCoverage,
    collectCoverageFrom,
    collectCoverageOnlyFrom,
    coverageDirectory,
    coverageReporters,
    mode,
    notify,
    notifyMode,
    onlyFailures,
    reporters,
    testNamePattern,
    testPathPattern,
    updateSnapshot,
    verbose,
  }: UpdateGlobalConfigOptions = {}) => {
    const previousUpdateSnapshot = globalConfig.updateSnapshot;
    globalConfig = updateGlobalConfig(globalConfig, {
      bail,
      changedSince,
      collectCoverage,
      collectCoverageFrom,
      collectCoverageOnlyFrom,
      coverageDirectory,
      coverageReporters,
      mode,
      notify,
      notifyMode,
      onlyFailures,
      reporters,
      testNamePattern,
      testPathPattern,
      updateSnapshot,
      verbose,
    });

    startRun(globalConfig);
    globalConfig = updateGlobalConfig(globalConfig, {
      // updateSnapshot is not sticky after a run.
      updateSnapshot:
        previousUpdateSnapshot === 'all' ? 'none' : previousUpdateSnapshot,
    });
  };

  const watchPlugins: Array<WatchPlugin> = INTERNAL_PLUGINS.map(
    InternalPlugin => new InternalPlugin({stdin, stdout: outputStream}),
  );
  watchPlugins.forEach((plugin: WatchPlugin) => {
    const hookSubscriber = hooks.getSubscriber();
    if (plugin.apply) {
      plugin.apply(hookSubscriber);
    }
  });

  if (globalConfig.watchPlugins != null) {
    const watchPluginKeys = new Map();
    for (const plugin of watchPlugins) {
      const reservedInfo = RESERVED_KEY_PLUGINS.get(plugin.constructor) || {};
      const key = reservedInfo.key || getPluginKey(plugin, globalConfig);
      if (!key) {
        continue;
      }
      const {forbiddenOverwriteMessage} = reservedInfo;
      watchPluginKeys.set(key, {
        forbiddenOverwriteMessage,
        overwritable: forbiddenOverwriteMessage == null,
        plugin,
      });
    }

    for (const pluginWithConfig of globalConfig.watchPlugins) {
      // $FlowFixMe dynamic require
      const ThirdPartyPlugin = require(pluginWithConfig.path);
      const plugin: WatchPlugin = new ThirdPartyPlugin({
        config: pluginWithConfig.config,
        stdin,
        stdout: outputStream,
      });
      checkForConflicts(watchPluginKeys, plugin, globalConfig);

      const hookSubscriber = hooks.getSubscriber();
      if (plugin.apply) {
        plugin.apply(hookSubscriber);
      }
      watchPlugins.push(plugin);
    }
  }

  const failedTestsCache = new FailedTestsCache();
  let searchSources = contexts.map(context => ({
    context,
    searchSource: new SearchSource(context),
  }));
  let isRunning = false;
  let testWatcher;
  let shouldDisplayWatchUsage = true;
  let isWatchUsageDisplayed = false;

  const emitFileChange = () => {
    if (hooks.isUsed('onFileChange')) {
      const projects = searchSources.map(({context, searchSource}) => ({
        config: context.config,
        testPaths: searchSource.findMatchingTests('').tests.map(t => t.path),
      }));
      hooks.getEmitter().onFileChange({projects});
    }
  };

  emitFileChange();

  hasteMapInstances.forEach((hasteMapInstance, index) => {
    hasteMapInstance.on('change', ({eventsQueue, hasteFS, moduleMap}) => {
      const validPaths = eventsQueue.filter(({filePath}) =>
        isValidPath(globalConfig, filePath),
      );

      if (validPaths.length) {
        const context = (contexts[index] = createContext(
          contexts[index].config,
          {
            hasteFS,
            moduleMap,
          },
        ));

        activePlugin = null;

        searchSources = searchSources.slice();
        searchSources[index] = {
          context,
          searchSource: new SearchSource(context),
        };
        emitFileChange();
        startRun(globalConfig);
      }
    });
  });

  if (!hasExitListener) {
    hasExitListener = true;
    process.on('exit', () => {
      if (activePlugin) {
        outputStream.write(ansiEscapes.cursorDown());
        outputStream.write(ansiEscapes.eraseDown);
      }
    });
  }

  const startRun = (globalConfig: GlobalConfig) => {
    if (isRunning) {
      return null;
    }

    testWatcher = new TestWatcher({isWatchMode: true});
    isInteractive && outputStream.write(specialChars.CLEAR);
    preRunMessagePrint(outputStream);
    isRunning = true;
    const configs = contexts.map(context => context.config);
    const changedFilesPromise = getChangedFilesPromise(globalConfig, configs);
    return runJest({
      changedFilesPromise,
      contexts,
      failedTestsCache,
      globalConfig,
      jestHooks: hooks.getEmitter(),
      onComplete: results => {
        isRunning = false;
        hooks.getEmitter().onTestRunComplete(results);

        // Create a new testWatcher instance so that re-runs won't be blocked.
        // The old instance that was passed to Jest will still be interrupted
        // and prevent test runs from the previous run.
        testWatcher = new TestWatcher({isWatchMode: true});

        // Do not show any Watch Usage related stuff when running in a
        // non-interactive environment
        if (isInteractive) {
          if (shouldDisplayWatchUsage) {
            outputStream.write(usage(globalConfig, watchPlugins));
            shouldDisplayWatchUsage = false; // hide Watch Usage after first run
            isWatchUsageDisplayed = true;
          } else {
            outputStream.write(showToggleUsagePrompt());
            shouldDisplayWatchUsage = false;
            isWatchUsageDisplayed = false;
          }
        } else {
          outputStream.write('\n');
        }
        failedTestsCache.setTestResults(results.testResults);
      },
      outputStream,
      startRun,
      testWatcher,
    }).catch(error =>
      // Errors thrown inside `runJest`, e.g. by resolvers, are caught here for
      // continuous watch mode execution. We need to reprint them to the
      // terminal and give just a little bit of extra space so they fit below
      // `preRunMessagePrint` message nicely.
      console.error(
        '\n\n' +
          formatExecError(error, contexts[0].config, {noStackTrace: false}),
      ),
    );
  };

  const onKeypress = (key: string) => {
    if (key === KEYS.CONTROL_C || key === KEYS.CONTROL_D) {
      if (typeof stdin.setRawMode === 'function') {
        // $FlowFixMe
        stdin.setRawMode(false);
      }
      outputStream.write('\n');
      exit(0);
      return;
    }

    if (activePlugin != null && activePlugin.onKey) {
      // if a plugin is activate, Jest should let it handle keystrokes, so ignore
      // them here
      activePlugin.onKey(key);
      return;
    }

    // Abort test run
    const pluginKeys = getSortedUsageRows(watchPlugins, globalConfig).map(
      usage => Number(usage.key).toString(16),
    );
    if (
      isRunning &&
      testWatcher &&
      ['q', KEYS.ENTER, 'a', 'o', 'f'].concat(pluginKeys).includes(key)
    ) {
      testWatcher.setState({interrupted: true});
      return;
    }

    const matchingWatchPlugin = filterInteractivePlugins(
      watchPlugins,
      globalConfig,
    ).find(plugin => getPluginKey(plugin, globalConfig) === key);

    if (matchingWatchPlugin != null) {
      if (isRunning) {
        testWatcher.setState({interrupted: true});
        return;
      }
      // "activate" the plugin, which has jest ignore keystrokes so the plugin
      // can handle them
      activePlugin = matchingWatchPlugin;
      if (activePlugin.run) {
        activePlugin.run(globalConfig, updateConfigAndRun).then(
          shouldRerun => {
            activePlugin = null;
            if (shouldRerun) {
              updateConfigAndRun();
            }
          },
          () => {
            activePlugin = null;
            onCancelPatternPrompt();
          },
        );
      } else {
        activePlugin = null;
      }
    }

    switch (key) {
      case KEYS.ENTER:
        startRun(globalConfig);
        break;
      case 'a':
        globalConfig = updateGlobalConfig(globalConfig, {
          mode: 'watchAll',
          testNamePattern: '',
          testPathPattern: '',
        });
        startRun(globalConfig);
        break;
      case 'c':
        updateConfigAndRun({
          mode: 'watch',
          testNamePattern: '',
          testPathPattern: '',
        });
        break;
      case 'f':
        globalConfig = updateGlobalConfig(globalConfig, {
          onlyFailures: !globalConfig.onlyFailures,
        });
        startRun(globalConfig);
        break;
      case 'o':
        globalConfig = updateGlobalConfig(globalConfig, {
          mode: 'watch',
          testNamePattern: '',
          testPathPattern: '',
        });
        startRun(globalConfig);
        break;
      case '?':
        break;
      case 'w':
        if (!shouldDisplayWatchUsage && !isWatchUsageDisplayed) {
          outputStream.write(ansiEscapes.cursorUp());
          outputStream.write(ansiEscapes.eraseDown);
          outputStream.write(usage(globalConfig, watchPlugins));
          isWatchUsageDisplayed = true;
          shouldDisplayWatchUsage = false;
        }
        break;
    }
  };

  const onCancelPatternPrompt = () => {
    outputStream.write(ansiEscapes.cursorHide);
    outputStream.write(specialChars.CLEAR);
    outputStream.write(usage(globalConfig, watchPlugins));
    outputStream.write(ansiEscapes.cursorShow);
  };

  if (typeof stdin.setRawMode === 'function') {
    // $FlowFixMe
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', onKeypress);
  }

  startRun(globalConfig);
  return Promise.resolve();
}

const checkForConflicts = (watchPluginKeys, plugin, globalConfig) => {
  const key = getPluginKey(plugin, globalConfig);
  if (!key) {
    return;
  }

  const conflictor = watchPluginKeys.get(key);
  if (!conflictor || conflictor.overwritable) {
    watchPluginKeys.set(key, {
      overwritable: false,
      plugin,
    });
    return;
  }

  let error;
  if (conflictor.forbiddenOverwriteMessage) {
    error = `
  Watch plugin ${chalk.bold.red(
    getPluginIdentifier(plugin),
  )} attempted to register key ${chalk.bold.red(`<${key}>`)},
  that is reserved internally for ${chalk.bold.red(
    conflictor.forbiddenOverwriteMessage,
  )}.
  Please change the configuration key for this plugin.`.trim();
  } else {
    const plugins = [conflictor.plugin, plugin]
      .map(p => chalk.bold.red(getPluginIdentifier(p)))
      .join(' and ');
    error = `
  Watch plugins ${plugins} both attempted to register key ${chalk.bold.red(
      `<${key}>`,
    )}.
  Please change the key configuration for one of the conflicting plugins to avoid overlap.`.trim();
  }

  throw new ValidationError('Watch plugin configuration error', error);
};

const getPluginIdentifier = plugin =>
  // This breaks as `displayName` is not defined as a static, but since
  // WatchPlugin is an interface, and it is my understanding interface
  // static fields are not definable anymore, no idea how to circumvent
  // this :-(
  // $FlowFixMe: leave `displayName` be.
  plugin.constructor.displayName || plugin.constructor.name;

const getPluginKey = (plugin, globalConfig) => {
  if (typeof plugin.getUsageInfo === 'function') {
    return (plugin.getUsageInfo(globalConfig) || {}).key;
  }

  return null;
};

const usage = (
  globalConfig,
  watchPlugins: Array<WatchPlugin>,
  delimiter = '\n',
) => {
  const messages = [
    activeFilters(globalConfig),

    globalConfig.testPathPattern || globalConfig.testNamePattern
      ? chalk.dim(' \u203A Press ') + 'c' + chalk.dim(' to clear filters.')
      : null,
    '\n' + chalk.bold('Watch Usage'),

    globalConfig.watch
      ? chalk.dim(' \u203A Press ') + 'a' + chalk.dim(' to run all tests.')
      : null,

    globalConfig.onlyFailures
      ? chalk.dim(' \u203A Press ') +
        'f' +
        chalk.dim(' to quit "only failed tests" mode.')
      : chalk.dim(' \u203A Press ') +
        'f' +
        chalk.dim(' to run only failed tests.'),

    (globalConfig.watchAll ||
      globalConfig.testPathPattern ||
      globalConfig.testNamePattern) &&
    !globalConfig.noSCM
      ? chalk.dim(' \u203A Press ') +
        'o' +
        chalk.dim(' to only run tests related to changed files.')
      : null,

    ...getSortedUsageRows(watchPlugins, globalConfig).map(
      plugin =>
        chalk.dim(' \u203A Press') +
        ' ' +
        plugin.key +
        ' ' +
        chalk.dim(`to ${plugin.prompt}.`),
    ),

    chalk.dim(' \u203A Press ') +
      'Enter' +
      chalk.dim(' to trigger a test run.'),
  ];

  return messages.filter(message => !!message).join(delimiter) + '\n';
};

const showToggleUsagePrompt = () =>
  '\n' +
  chalk.bold('Watch Usage: ') +
  chalk.dim('Press ') +
  'w' +
  chalk.dim(' to show more.');
