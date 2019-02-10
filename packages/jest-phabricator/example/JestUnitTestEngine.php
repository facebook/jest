<?php
// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

/**
 * JestUnitTestEngine
 */
class JestUnitTestEngine extends ArcanistBaseUnitTestEngine {
  const PROCESSOR = 'jest/packages/jest-phabricator/build/index.js';
  const JEST_PATH = 'jest/packages/jest/bin/jest.js';
  const TOO_MANY_FILES_TO_COVER = 100;
  const GIGANTIC_DIFF_THRESHOLD = 200;

  private function getRoot() {
    return $this->getWorkingCopy()->getProjectRoot();
  }

  private function getOutputJSON() {
    return $this->getRoot() . '/output.json';
  }

  private function getFutureResults($future) {
    list($stdout, $stderr) = $future->resolvex();
    $output_JSON = $this->getOutputJSON();
    $report_path_exists = file_exists($output_JSON);
    $raw_results = null;

    if ($report_path_exists) {
      $raw_results = json_decode(
        Filesystem::readFile($output_JSON),
        true
      )['coverageMap'];
      Filesystem::remove($output_JSON);
    } else {
      $raw_results = json_decode($stdout, true);
    }

    if (!is_array($raw_results)) {
      throw new Exception("Unit test script emitted invalid JSON: {$stdout}");
    }

    $results = array();
    foreach ($raw_results as $result) {
      $test_result = new ArcanistUnitTestResult();
      $test_result->setName($result['name']);
      $succeed = isset($result['status']) && $result['status'] == 'passed';
      $test_result->setResult(
        $succeed ?
        ArcanistUnitTestResult::RESULT_PASS :
        ArcanistUnitTestResult::RESULT_FAIL
      );

      if (isset($result['coverage'])) {
        $coverage = array();
        $root = $this->getRoot() . '/';
        foreach ($result['coverage'] as $file_path => $coverage_data) {
          if (substr($file_path, 0, strlen($root)) == $root) {
            $file_path = substr($file_path, strlen($root));
          }
          $coverage[$file_path] = $coverage_data;
       }
       $test_result->setCoverage($coverage);
     }
     $test_result->setUserData($result['message']);
     $results[] = $test_result;
   }

    return $results;
  }

  private function runCommands($commands) {
    $futures = array();
    foreach ($commands as $command) {
      $bin = $command['bin'];
      $options = implode(' ', $command['options']);
      $paths = $command['paths'];
      $futures[] = new ExecFuture("{$bin} {$options} %Ls", $paths);
    }

    $console = PhutilConsole::getConsole();

    // Pass stderr through so we can give the user updates on test
    // status as tests run.
    $completed = array();
    $iterator = new FutureIterator($futures);
    foreach ($iterator->setUpdateInterval(0.2) as $_) {
      foreach ($futures as $key => $future) {
        if (isset($completed[$key])) {
          continue;
        }
        if ($future->isReady()) {
          $completed[$key] = true;
        }
        list(, $stderr) = $future->read();
        $console->writeErr('%s', $stderr);
        break;
      }
    }
    // Finish printing output for remaining futures
    foreach ($futures as $key => $future) {
      if (!isset($completed[$key])) {
        list(, $stderr) = $future->read();
        $console->writeErr('%s', $stderr);
      }
    }
    $results = array();
    foreach ($futures as $future) {
      $results[] = $this->getFutureResults($future);
    }

    return call_user_func_array('array_merge', $results);
  }

  private function runJSTests() {
    $console = PhutilConsole::getConsole();
    $root = $this->getRoot();

    $result_arrays = [];
    $paths = $this->getPaths();
    $jest_paths = array();
    foreach ($paths as $path) {
      $ext = idx(pathinfo($path), 'extension');
      if ($ext === 'js' || $ext === 'json') {
        // Filter deleted modules because Jest can't do anything with them.
        if (file_exists("$root/$path")) {
          $jest_paths[] = "$root/$path";
        }
      }
    }

    $commands = [];
    if (count($jest_paths) > self::GIGANTIC_DIFF_THRESHOLD) {
      $console->writeOut("Too many files, skipping JavaScript tests.\n");
      $result_arrays[] = array();
    } else {
      if (count($jest_paths) > 0) {
        $console->writeOut("Running JavaScript tests.\n");
        $commands[] = array(
          'bin' => self::JEST_PATH,
          'options' => $this->getJestOptions($jest_paths),
          'paths' => $jest_paths,
        );
      }

      try {
        $result_arrays[] = $this->runCommands($commands);
      } catch (Exception $e) {
        // Ignore the exception in case of failing tests
        // As Jest should have already printed the results.
        $result = new ArcanistUnitTestResult();
        $result->setName('JavaScript tests');
        $result->setResult(ArcanistUnitTestResult::RESULT_FAIL);
        $result->setDuration(0);
        $result_arrays[] = array($result);
      }
    }

    $console->writeOut("Finished tests.\n");
    return call_user_func_array('array_merge', $result_arrays);
  }

  private function getJestOptions($paths) {
    $output_JSON = $this->getOutputJSON();
    $options = array(
      '--colors',
      '--findRelatedTests',
      '--json',
      '--outputFile=' . $output_JSON,
      '--testResultsProcessor=' . self::PROCESSOR
    );

    // Checks for the number of files to cover, in case it's too big skips coverage
    // A better solution would involve knowing what's the machine buffer size limit
    // for exec and check if the command can stay within it.
    if (count($paths) < self::TOO_MANY_FILES_TO_COVER) {
      $options[] = '--coverage';
      $options[] = '--collectCoverageOnlyFrom '. join(' ', $paths);
    }

    return $options;
  }

  /** @Override */
  public function run() {
    return self::runJSTests();
  }
}
