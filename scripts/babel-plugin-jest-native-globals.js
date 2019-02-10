/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// This plugin exists to make sure that we use a `Promise` that has not been messed with by user code.
// Might consider extending this to other globals as well in the future

module.exports = ({template}) => {
  const promiseDeclaration = template(`
    var Promise = global[Symbol.for('jest-native-promise')] || global.Promise;
  `);
  const symbolDeclaration = template(`
    var Symbol = global['jest-symbol-do-not-touch'] || global.Symbol;
  `);
  const nowDeclaration = template(`
    var jestNow = global[Symbol.for('jest-native-now')] || global.Date.now;
  `);
  const fsReadFileDeclaration = template(`
    var jestReadFile = global[Symbol.for('jest-native-read-file')] || fs.readFileSync;
  `);
  const fsWriteFileDeclaration = template(`
    var jestWriteFile = global[Symbol.for('jest-native-write-file')] || fs.writeFileSync;
  `);
  const fsExistsFileDeclaration = template(`
    var jestExistsFile = global[Symbol.for('jest-native-exists-file')] || fs.existsSync;
  `);

  return {
    name: 'jest-native-globals',
    visitor: {
      ReferencedIdentifier(path, state) {
        if (path.node.name === 'Promise' && !state.jestInjectedPromise) {
          state.jestInjectedPromise = true;
          path
            .findParent(p => p.isProgram())
            .unshiftContainer('body', promiseDeclaration());
          path
            .findParent(p => p.isProgram())
            .unshiftContainer('body', symbolDeclaration());
        }
        if (path.node.name === 'Symbol' && !state.jestInjectedSymbol) {
          state.jestInjectedSymbol = true;
          path
            .findParent(p => p.isProgram())
            .unshiftContainer('body', symbolDeclaration());
        }
        if (
          path.node.name === 'Date' &&
          path.parent.property &&
          path.parent.property.name === 'now'
        ) {
          if (!state.jestInjectedNow) {
            state.jestInjectedNow = true;
            path
              .findParent(p => p.isProgram())
              .unshiftContainer('body', nowDeclaration());
            path
              .findParent(p => p.isProgram())
              .unshiftContainer('body', symbolDeclaration());
          }

          path.parentPath.replaceWithSourceString('jestNow');
        }
        if (
          path.node.name === 'fs' &&
          path.parent.property &&
          ['readFileSync', 'writeFileSync', 'existsSync'].includes(
            path.parent.property.name
          )
        ) {
          if (
            !state.jestInjectedRead &&
            path.parent.property.name === 'readFileSync'
          ) {
            state.jestInjectedRead = true;
            path
              .findParent(p => p.isProgram())
              .unshiftContainer('body', fsReadFileDeclaration());
            path
              .findParent(p => p.isProgram())
              .unshiftContainer('body', symbolDeclaration());

            path.parentPath.replaceWithSourceString('jestReadFile');
          }
          if (
            !state.jestInjectedWrite &&
            path.parent.property.name === 'writeFileSync'
          ) {
            state.jestInjectedWrite = true;
            path
              .findParent(p => p.isProgram())
              .unshiftContainer('body', fsWriteFileDeclaration());
            path
              .findParent(p => p.isProgram())
              .unshiftContainer('body', symbolDeclaration());

            path.parentPath.replaceWithSourceString('jestWriteFile');
          }
          if (
            !state.jestInjectedExists &&
            path.parent.property.name === 'existsSync'
          ) {
            state.jestInjectedExists = true;
            path
              .findParent(p => p.isProgram())
              .unshiftContainer('body', fsExistsFileDeclaration());
            path
              .findParent(p => p.isProgram())
              .unshiftContainer('body', symbolDeclaration());

            path.parentPath.replaceWithSourceString('jestExistsFile');
          }
        }
      },
    },
  };
};
