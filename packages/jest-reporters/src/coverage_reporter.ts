/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import {Config} from '@jest/types';
import {AggregatedResult, TestResult} from '@jest/test-result';
import {clearLine, isInteractive} from 'jest-util';
import istanbulReport from 'istanbul-lib-report';
import istanbulReports from 'istanbul-reports';
import chalk from 'chalk';
import istanbulCoverage, {
  CoverageMap,
  FileCoverage,
  CoverageSummary,
  CoverageSummaryData,
} from 'istanbul-lib-coverage';
import libSourceMaps, {MapStore} from 'istanbul-lib-source-maps';
import Worker from 'jest-worker';
import glob from 'glob';
import {RawSourceMap} from 'source-map';
import BaseReporter from './base_reporter';
import {Context, Test, CoverageWorker, CoverageReporterOptions} from './types';

const FAIL_COLOR = chalk.bold.red;
const RUNNING_TEST_COLOR = chalk.bold.dim;

export default class CoverageReporter extends BaseReporter {
  private _coverageMap: CoverageMap;
  private _globalConfig: Config.GlobalConfig;
  private _sourceMapStore: MapStore;
  private _options: CoverageReporterOptions;

  constructor(
    globalConfig: Config.GlobalConfig,
    options?: CoverageReporterOptions,
  ) {
    super(globalConfig);
    this._coverageMap = istanbulCoverage.createCoverageMap({});
    this._globalConfig = globalConfig;
    this._sourceMapStore = libSourceMaps.createSourceMapStore();
    this._options = options || {};
  }

  onTestResult(
    _test: Test,
    testResult: TestResult,
    _aggregatedResults: AggregatedResult,
  ) {
    if (testResult.coverage) {
      this._coverageMap.merge(testResult.coverage);
    }

    const sourceMaps = testResult.sourceMaps;
    if (sourceMaps) {
      Object.keys(sourceMaps).forEach(sourcePath => {
        let inputSourceMap: RawSourceMap | undefined;
        try {
          const coverage: FileCoverage = this._coverageMap.fileCoverageFor(
            sourcePath,
          );
          inputSourceMap = (coverage.toJSON() as any).inputSourceMap;
        } finally {
          if (inputSourceMap) {
            this._sourceMapStore.registerMap(sourcePath, inputSourceMap);
          } else {
            this._sourceMapStore.registerURL(
              sourcePath,
              sourceMaps[sourcePath],
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

    try {
      const reportContext = istanbulReport.createContext({
        dir: this._globalConfig.coverageDirectory,
        sourceFinder,
      });
      const coverageReporters = this._globalConfig.coverageReporters || [];

      if (!this._globalConfig.useStderr && coverageReporters.length < 1) {
        coverageReporters.push('text-summary');
      }

      const tree = istanbulReport.summarizers.pkg(map);
      coverageReporters.forEach(reporter => {
        tree.visit(istanbulReports.create(reporter, {}), reportContext);
      });
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

  private async _addUntestedFiles(
    globalConfig: Config.GlobalConfig,
    contexts: Set<Context>,
  ): Promise<void> {
    const files: Array<{config: Config.ProjectConfig; path: string}> = [];

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
      const message = RUNNING_TEST_COLOR(
        'Running coverage on untested files...',
      );
      if (this._globalConfig.useStderr) {
        process.stderr.write(message);
      } else {
        process.stdout.write(message);
      }
    }

    let worker: CoverageWorker | Worker;

    if (this._globalConfig.maxWorkers <= 1) {
      worker = require('./coverage_worker');
    } else {
      worker = new Worker(require.resolve('./coverage_worker'), {
        exposedMethods: ['worker'],
        maxRetries: 2,
        numWorkers: this._globalConfig.maxWorkers,
      });
    }

    const instrumentation = files.map(async fileObj => {
      const filename = fileObj.path;
      const config = fileObj.config;

      if (!this._coverageMap.data[filename] && 'worker' in worker) {
        try {
          const result = await worker.worker({
            config,
            globalConfig,
            options: {
              ...this._options,
              changedFiles:
                this._options.changedFiles &&
                Array.from(this._options.changedFiles),
            },
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

    if (worker && 'end' in worker && typeof worker.end === 'function') {
      worker.end();
    }
  }

  private _checkThreshold(globalConfig: Config.GlobalConfig, map: CoverageMap) {
    if (globalConfig.coverageThreshold) {
      function check(
        name: string,
        thresholds: {[index: string]: number},
        actuals: CoverageSummaryData,
      ) {
        return (['statements', 'branches', 'lines', 'functions'] as Array<
          keyof CoverageSummaryData
        >).reduce<Array<string>>((errors, key) => {
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
        }, []);
      }

      const THRESHOLD_GROUP_TYPES = {
        GLOB: 'glob',
        GLOBAL: 'global',
        PATH: 'path',
      };
      const coveredFiles = map.files();
      const thresholdGroups = Object.keys(globalConfig.coverageThreshold);
      const groupTypeByThresholdGroup: {[index: string]: string} = {};
      const filesByGlob: {[index: string]: Array<string>} = {};

      const coveredFilesSortedIntoThresholdGroup = coveredFiles.reduce<
        Array<[string, string | undefined]>
      >((files, file) => {
        const pathOrGlobMatches = thresholdGroups.reduce<
          Array<[string, string]>
        >((agg, thresholdGroup) => {
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
        }, []);

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
      }, []);

      const getFilesInThresholdGroup = (thresholdGroup: string) =>
        coveredFilesSortedIntoThresholdGroup
          .filter(fileAndGroup => fileAndGroup[1] === thresholdGroup)
          .map(fileAndGroup => fileAndGroup[0]);

      function combineCoverage(filePaths: Array<string>) {
        return filePaths
          .map(filePath => map.fileCoverageFor(filePath))
          .reduce(
            (
              combinedCoverage: CoverageSummary | null | undefined,
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

      let errors: Array<string> = [];

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
