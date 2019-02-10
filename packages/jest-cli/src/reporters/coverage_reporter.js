/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  AggregatedResult,
  CoverageMap,
  FileCoverage,
  CoverageSummary,
  TestResult,
} from 'types/TestResult';
import typeof {worker} from './coverage_worker';

import type {GlobalConfig, Path} from 'types/Config';
import type {Context} from 'types/Context';
import type {Test} from 'types/TestRunner';

import {clearLine, isInteractive} from 'jest-util';
import {createReporter} from 'istanbul-api';
import chalk from 'chalk';
import istanbulCoverage from 'istanbul-lib-coverage';
import libSourceMaps from 'istanbul-lib-source-maps';
import Worker from 'jest-worker';
import BaseReporter from './base_reporter';
import path from 'path';
import glob from 'glob';

const FAIL_COLOR = chalk.bold.red;
const RUNNING_TEST_COLOR = chalk.bold.dim;

type CoverageWorker = {worker: worker};

export type CoverageReporterOptions = {
  changedFiles?: Set<Path>,
};

export default class CoverageReporter extends BaseReporter {
  _coverageMap: CoverageMap;
  _globalConfig: GlobalConfig;
  _sourceMapStore: any;
  _options: CoverageReporterOptions;

  constructor(globalConfig: GlobalConfig, options?: CoverageReporterOptions) {
    super();
    this._coverageMap = istanbulCoverage.createCoverageMap({});
    this._globalConfig = globalConfig;
    this._sourceMapStore = libSourceMaps.createSourceMapStore();
    this._options = options || {};
  }

  onTestResult(
    test: Test,
    testResult: TestResult,
    aggregatedResults: AggregatedResult,
  ) {
    if (testResult.coverage) {
      this._coverageMap.merge(testResult.coverage);
      // Remove coverage data to free up some memory.
      delete testResult.coverage;

      Object.keys(testResult.sourceMaps).forEach(sourcePath => {
        let inputSourceMap: ?Object;
        try {
          const coverage: FileCoverage = this._coverageMap.fileCoverageFor(
            sourcePath,
          );
          ({inputSourceMap} = coverage.toJSON());
        } finally {
          if (inputSourceMap) {
            this._sourceMapStore.registerMap(sourcePath, inputSourceMap);
          } else {
            this._sourceMapStore.registerURL(
              sourcePath,
              testResult.sourceMaps[sourcePath],
            );
          }
        }
      });
    }
  }

  async onRunComplete(
    contexts: Set<Context>,
    aggregatedResults: AggregatedResult,
  ) {
    await this._addUntestedFiles(this._globalConfig, contexts);
    const {map, sourceFinder} = this._sourceMapStore.transformCoverage(
      this._coverageMap,
    );

    const reporter = createReporter();
    try {
      if (this._globalConfig.coverageDirectory) {
        reporter.dir = this._globalConfig.coverageDirectory;
      }

      const coverageReporters = this._globalConfig.coverageReporters || [];

      if (!this._globalConfig.useStderr && coverageReporters.length < 1) {
        coverageReporters.push('text-summary');
      }

      reporter.addAll(coverageReporters);
      reporter.write(map, sourceFinder && {sourceFinder});
      aggregatedResults.coverageMap = map;
    } catch (e) {
      console.error(
        chalk.red(`
        Failed to write coverage reports:
        ERROR: ${e.toString()}
        STACK: ${e.stack}
      `),
      );
    }

    this._checkThreshold(this._globalConfig, map);
  }

  async _addUntestedFiles(
    globalConfig: GlobalConfig,
    contexts: Set<Context>,
  ): Promise<void> {
    const files = [];

    contexts.forEach(context => {
      const config = context.config;
      if (
        globalConfig.collectCoverageFrom &&
        globalConfig.collectCoverageFrom.length
      ) {
        context.hasteFS
          .matchFilesWithGlob(globalConfig.collectCoverageFrom, config.rootDir)
          .forEach(filePath =>
            files.push({
              config,
              path: filePath,
            }),
          );
      }
    });

    if (!files.length) {
      return;
    }

    if (isInteractive) {
      process.stderr.write(
        RUNNING_TEST_COLOR('Running coverage on untested files...'),
      );
    }

    let worker: CoverageWorker;

    if (this._globalConfig.maxWorkers <= 1) {
      worker = require('./coverage_worker');
    } else {
      // $FlowFixMe: assignment of a worker with custom properties.
      worker = new Worker(require.resolve('./coverage_worker'), {
        exposedMethods: ['worker'],
        maxRetries: 2,
        numWorkers: this._globalConfig.maxWorkers,
      });
    }

    const instrumentation = files.map(async fileObj => {
      const filename = fileObj.path;
      const config = fileObj.config;

      if (!this._coverageMap.data[filename]) {
        try {
          const result = await worker.worker({
            config,
            globalConfig,
            options: this._options,
            path: filename,
          });

          if (result) {
            this._coverageMap.addFileCoverage(result.coverage);

            if (result.sourceMapPath) {
              this._sourceMapStore.registerURL(filename, result.sourceMapPath);
            }
          }
        } catch (error) {
          console.error(
            chalk.red(
              [
                `Failed to collect coverage from ${filename}`,
                `ERROR: ${error.message}`,
                `STACK: ${error.stack}`,
              ].join('\n'),
            ),
          );
        }
      }
    });

    try {
      await Promise.all(instrumentation);
    } catch (err) {
      // Do nothing; errors were reported earlier to the console.
    }

    if (isInteractive) {
      clearLine(process.stderr);
    }

    if (worker && typeof worker.end === 'function') {
      worker.end();
    }
  }

  _checkThreshold(globalConfig: GlobalConfig, map: CoverageMap) {
    if (globalConfig.coverageThreshold) {
      function check(name, thresholds, actuals) {
        return ['statements', 'branches', 'lines', 'functions'].reduce(
          (errors, key) => {
            const actual = actuals[key].pct;
            const actualUncovered = actuals[key].total - actuals[key].covered;
            const threshold = thresholds[key];

            if (threshold != null) {
              if (threshold < 0) {
                if (threshold * -1 < actualUncovered) {
                  errors.push(
                    `Jest: Uncovered count for ${key} (${actualUncovered})` +
                      `exceeds ${name} threshold (${-1 * threshold})`,
                  );
                }
              } else if (actual < threshold) {
                errors.push(
                  `Jest: "${name}" coverage threshold for ${key} (${threshold}%) not met: ${actual}%`,
                );
              }
            }
            return errors;
          },
          [],
        );
      }

      const THRESHOLD_GROUP_TYPES = {
        GLOB: 'glob',
        GLOBAL: 'global',
        PATH: 'path',
      };
      const coveredFiles = map.files();
      const thresholdGroups = Object.keys(globalConfig.coverageThreshold);
      const groupTypeByThresholdGroup = {};
      const filesByGlob = {};

      const coveredFilesSortedIntoThresholdGroup = coveredFiles.reduce(
        (files, file) => {
          const pathOrGlobMatches = thresholdGroups.reduce(
            (agg, thresholdGroup) => {
              const absoluteThresholdGroup = path.resolve(thresholdGroup);

              // The threshold group might be a path:

              if (file.indexOf(absoluteThresholdGroup) === 0) {
                groupTypeByThresholdGroup[thresholdGroup] =
                  THRESHOLD_GROUP_TYPES.PATH;
                return agg.concat([[file, thresholdGroup]]);
              }

              // If the threshold group is not a path it might be a glob:

              // Note: glob.sync is slow. By memoizing the files matching each glob
              // (rather than recalculating it for each covered file) we save a tonne
              // of execution time.
              if (filesByGlob[absoluteThresholdGroup] === undefined) {
                filesByGlob[absoluteThresholdGroup] = glob
                  .sync(absoluteThresholdGroup)
                  .map(filePath => path.resolve(filePath));
              }

              if (filesByGlob[absoluteThresholdGroup].indexOf(file) > -1) {
                groupTypeByThresholdGroup[thresholdGroup] =
                  THRESHOLD_GROUP_TYPES.GLOB;
                return agg.concat([[file, thresholdGroup]]);
              }

              return agg;
            },
            [],
          );

          if (pathOrGlobMatches.length > 0) {
            return files.concat(pathOrGlobMatches);
          }

          // Neither a glob or a path? Toss it in global if there's a global threshold:
          if (thresholdGroups.indexOf(THRESHOLD_GROUP_TYPES.GLOBAL) > -1) {
            groupTypeByThresholdGroup[THRESHOLD_GROUP_TYPES.GLOBAL] =
              THRESHOLD_GROUP_TYPES.GLOBAL;
            return files.concat([[file, THRESHOLD_GROUP_TYPES.GLOBAL]]);
          }

          // A covered file that doesn't have a threshold:
          return files.concat([[file, undefined]]);
        },
        [],
      );

      const getFilesInThresholdGroup = thresholdGroup =>
        coveredFilesSortedIntoThresholdGroup
          .filter(fileAndGroup => fileAndGroup[1] === thresholdGroup)
          .map(fileAndGroup => fileAndGroup[0]);

      function combineCoverage(filePaths) {
        return filePaths
          .map(filePath => map.fileCoverageFor(filePath))
          .reduce(
            (
              combinedCoverage: ?CoverageSummary,
              nextFileCoverage: FileCoverage,
            ) => {
              if (combinedCoverage === undefined || combinedCoverage === null) {
                return nextFileCoverage.toSummary();
              }
              return combinedCoverage.merge(nextFileCoverage.toSummary());
            },
            undefined,
          );
      }

      let errors = [];

      thresholdGroups.forEach(thresholdGroup => {
        switch (groupTypeByThresholdGroup[thresholdGroup]) {
          case THRESHOLD_GROUP_TYPES.GLOBAL: {
            const coverage = combineCoverage(
              getFilesInThresholdGroup(THRESHOLD_GROUP_TYPES.GLOBAL),
            );
            if (coverage) {
              errors = errors.concat(
                check(
                  thresholdGroup,
                  globalConfig.coverageThreshold[thresholdGroup],
                  coverage,
                ),
              );
            }
            break;
          }
          case THRESHOLD_GROUP_TYPES.PATH: {
            const coverage = combineCoverage(
              getFilesInThresholdGroup(thresholdGroup),
            );
            if (coverage) {
              errors = errors.concat(
                check(
                  thresholdGroup,
                  globalConfig.coverageThreshold[thresholdGroup],
                  coverage,
                ),
              );
            }
            break;
          }
          case THRESHOLD_GROUP_TYPES.GLOB:
            getFilesInThresholdGroup(thresholdGroup).forEach(
              fileMatchingGlob => {
                errors = errors.concat(
                  check(
                    fileMatchingGlob,
                    globalConfig.coverageThreshold[thresholdGroup],
                    map.fileCoverageFor(fileMatchingGlob).toSummary(),
                  ),
                );
              },
            );
            break;
          default:
            // If the file specified by path is not found, error is returned.
            if (thresholdGroup !== THRESHOLD_GROUP_TYPES.GLOBAL) {
              errors = errors.concat(
                `Jest: Coverage data for ${thresholdGroup} was not found.`,
              );
            }
          // Sometimes all files in the coverage data are matched by
          // PATH and GLOB threshold groups in which case, don't error when
          // the global threshold group doesn't match any files.
        }
      });

      errors = errors.filter(
        err => err !== undefined && err !== null && err.length > 0,
      );

      if (errors.length > 0) {
        this.log(`${FAIL_COLOR(errors.join('\n'))}`);
        this._setError(new Error(errors.join('\n')));
      }
    }
  }

  // Only exposed for the internal runner. Should not be used
  getCoverageMap(): CoverageMap {
    return this._coverageMap;
  }
}
