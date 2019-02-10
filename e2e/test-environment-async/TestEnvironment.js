// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

'use strict';

const fs = require('fs');
const os = require('os');
const {createDirectory} = require('jest-util');
const JSDOMEnvironment = require('jest-environment-jsdom');

const DIR = os.tmpdir() + '/jest-test-environment';

class TestEnvironment extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context);
    this.context = context;
  }

  setup() {
    console.info('TestEnvironment.setup:', this.context.testPath);
    return super.setup().then(() => {
      this.global.setup = 'setup';
    });
  }

  teardown() {
    return super.teardown().then(() => {
      createDirectory(DIR);
      fs.writeFileSync(DIR + '/teardown', 'teardown');
    });
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = TestEnvironment;
