/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {PluginObj, types as babelTypes} from '@babel/core';
import type {Identifier} from '@babel/types';

export default ({
  types: t,
}: {
  types: typeof babelTypes;
}): PluginObj<{
  ourExpect: Identifier;
}> => ({
  pre({path: program}) {
    this.ourExpect = program.scope.generateUidIdentifier('expect');

    // const _expect = require("@jest/globals").expect;
    const decl = t.variableDeclaration('const', [
      t.variableDeclarator(
        this.ourExpect,
        t.memberExpression(
          t.callExpression(t.identifier('require'), [
            t.stringLiteral('@jest/globals'),
          ]),
          t.identifier('expect'),
        ),
      ),
    ]);

    program.unshiftContainer('body', decl);
  },
  visitor: {
    AwaitExpression(path) {
      const original = path.node.argument;

      if (!t.isCallExpression(original)) {
        return;
      }

      if (t.isMemberExpression(original.callee)) {
        const member = original.callee;
        if (
          t.isIdentifier(member.object, this.ourExpect) &&
          t.isIdentifier(member.property, {name: 'withinDeadline'})
        ) {
          return;
        }
      }

      path.replaceWith(
        t.awaitExpression(
          t.callExpression(
            t.memberExpression(this.ourExpect, t.identifier('withinDeadline')),
            [path.node.argument],
          ),
        ),
      );
    },
  },
});
