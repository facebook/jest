/**
 * Copyright (c) 2016-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = {
  extends: [
    './packages/eslint-config-fb-strict/index.js',
    'plugin:import/errors',
    'plugin:import/typescript',
    'prettier',
    'prettier/flowtype',
    'plugin:eslint-comments/recommended',
  ],
  overrides: [
    {
      extends: ['plugin:@typescript-eslint/eslint-recommended'],
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint/eslint-plugin', 'local'],
      rules: {
        '@typescript-eslint/array-type': ['error', {default: 'generic'}],
        '@typescript-eslint/ban-types': 'error',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {argsIgnorePattern: '^_'},
        ],
        '@typescript-eslint/prefer-ts-expect-error': 'error',
        // Since we do `export =`. Remove for Jest 27
        'import/default': 'off',
        'import/order': 'error',
        'no-dupe-class-members': 'off',
        'no-unused-vars': 'off',
        // TODO: turn these on at some point
        'prefer-rest-params': 'off',
        'prefer-spread': 'off',
      },
    },
    {
      files: [
        'e2e/babel-plugin-jest-hoist/__tests__/typescript.test.ts',
        'e2e/coverage-remapping/covered.ts',
        'packages/expect/src/matchers.ts',
        'packages/expect/src/print.ts',
        'packages/expect/src/toThrowMatchers.ts',
        'packages/expect/src/types.ts',
        'packages/expect/src/utils.ts',
        'packages/jest-core/src/ReporterDispatcher.ts',
        'packages/jest-core/src/TestScheduler.ts',
        'packages/jest-core/src/collectHandles.ts',
        'packages/jest-core/src/plugins/update_snapshots_interactive.ts',
        'packages/jest-fake-timers/src/legacyFakeTimers.ts',
        'packages/jest-haste-map/src/index.ts',
        'packages/jest-haste-map/src/lib/FSEventsWatcher.ts',
        'packages/jest-jasmine2/src/jasmine/SpyStrategy.ts',
        'packages/jest-jasmine2/src/jasmine/Suite.ts',
        'packages/jest-leak-detector/src/index.ts',
        'packages/jest-matcher-utils/src/index.ts',
        'packages/jest-mock/src/__tests__/index.test.ts',
        'packages/jest-mock/src/index.ts',
        'packages/jest-snapshot/src/index.ts',
        'packages/jest-snapshot/src/printSnapshot.ts',
        'packages/jest-snapshot/src/types.ts',
        'packages/jest-util/src/convertDescriptorToString.ts',
        'packages/jest-worker/src/Farm.ts',
        'packages/jest-worker/src/index.ts',
        'packages/pretty-format/src/index.ts',
        'packages/pretty-format/src/plugins/DOMCollection.ts',
      ],
      rules: {
        '@typescript-eslint/ban-types': [
          'error',
          // TODO: remove these overrides: https://github.com/facebook/jest/issues/10177
          {types: {Function: false, object: false, '{}': false}},
        ],
        'local/ban-types-eventually': [
          'warn',
          {
            types: {
              // none of these types are in use, so can be errored on
              Boolean: false,
              Number: false,
              Object: false,
              String: false,
              Symbol: false,
            },
          },
        ],
      },
    },

    // to make it more suitable for running on code examples in docs/ folder
    {
      files: ['*.md'],
      rules: {
        'arrow-body-style': 0,
        'consistent-return': 0,
        'flowtype/require-valid-file-annotation': 0,
        'import/no-extraneous-dependencies': 0,
        'import/no-unresolved': 0,
        'jest/no-focused-tests': 0,
        'jest/no-identical-title': 0,
        'jest/valid-expect': 0,
        'no-undef': 0,
        'no-unused-vars': 0,
        'prettier/prettier': 0,
        'react/jsx-no-undef': 0,
        'react/react-in-jsx-scope': 0,
        'sort-keys': 0,
      },
    },
    {
      files: ['examples/**/*'],
      rules: {
        'babel/func-params-comma-dangle': 0,
        'import/no-unresolved': [2, {ignore: ['^react-native$']}],
        'import/order': 0,
      },
    },
    {
      files: ['scripts/**/*', 'e2e/**/*'],
      rules: {
        'babel/func-params-comma-dangle': 0,
      },
    },
    {
      files: 'packages/jest-types/**/*',
      rules: {
        'import/no-extraneous-dependencies': 0,
      },
    },
    {
      files: 'packages/**/*.ts',
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 2,
      },
    },
    {
      files: [
        '**/__tests__/**',
        '**/__mocks__/**',
        'packages/jest-jasmine2/src/jasmine/**/*',
        'packages/expect/src/jasmineUtils.ts',
        '**/vendor/**/*',
      ],
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 0,
      },
    },
    {
      files: [
        'packages/jest-jasmine2/src/jasmine/**/*',
        'packages/expect/src/jasmineUtils.ts',
        '**/vendor/**/*',
      ],
      rules: {
        'eslint-comments/disable-enable-pair': 0,
        'eslint-comments/no-unlimited-disable': 0,
      },
    },
    {
      files: [
        'e2e/error-on-deprecated/__tests__/*',
        'e2e/jasmine-async/__tests__/*',
      ],
      globals: {
        fail: true,
        jasmine: true,
        pending: true,
      },
    },
    {
      files: [
        'website/**',
        '**/__tests__/**',
        'e2e/**',
        '**/pretty-format/perf/**',
      ],
      rules: {
        'import/no-extraneous-dependencies': 0,
      },
    },
    {
      files: ['test-types/*.test.ts'],
      rules: {
        'jest/no-focused-tests': 0,
        'jest/no-identical-title': 0,
        'jest/valid-expect': 0,
      },
    },
  ],
  parser: 'babel-eslint',
  plugins: ['markdown', 'import', 'prettier', 'eslint-comments'],
  rules: {
    'arrow-body-style': 2,
    'eslint-comments/disable-enable-pair': [2, {allowWholeFile: true}],
    'eslint-comments/no-unused-disable': 2,
    'flowtype/boolean-style': 2,
    'flowtype/no-primitive-constructor-types': 2,
    'flowtype/require-valid-file-annotation': 2,
    'import/no-duplicates': 2,
    'import/no-extraneous-dependencies': [
      2,
      {
        devDependencies: [
          '/test-types/**',
          '**/__tests__/**',
          '**/__mocks__/**',
          '**/?(*.)(spec|test).js?(x)',
          'scripts/**',
          'babel.config.js',
          'testSetupFile.js',
        ],
      },
    ],
    'import/no-unresolved': [2, {ignore: ['fsevents']}],
    // This has to be disabled until all type and module imports are combined
    // https://github.com/benmosher/eslint-plugin-import/issues/645
    'import/order': 0,
    'no-console': 0,
    'no-restricted-imports': [
      2,
      {
        message: 'Please use graceful-fs instead.',
        name: 'fs',
      },
    ],
    'no-unused-vars': 2,
    'prettier/prettier': 2,
    'sort-imports': [2, {ignoreDeclarationSort: true}],
  },
  settings: {
    'import/ignore': ['react-native'],
  },
};
