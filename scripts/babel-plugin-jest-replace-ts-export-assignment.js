/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// Replace `export =` with `module.exports` which allows us to keep CJS semantics

module.exports = ({template}) => {
  const moduleExportsDeclaration = template(`
    module.exports = ASSIGNMENT;
  `);
  return {
    name: 'jest-replace-ts-export-assignment',
    visitor: {
      TSExportAssignment(path) {
        path.replaceWith(
          moduleExportsDeclaration({ASSIGNMENT: path.node.expression})
        );
      },
    },
  };
};
