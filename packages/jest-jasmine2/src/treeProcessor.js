/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

type Options = {
  nodeComplete: (suite: TreeNode) => void,
  nodeStart: (suite: TreeNode) => void,
  queueRunnerFactory: any,
  runnableIds: Array<string>,
  tree: TreeNode,
};

type TreeNode = {
  afterAllFns: Array<any>,
  beforeAllFns: Array<any>,
  disabled?: boolean,
  execute: (onComplete: () => void, enabled: boolean) => void,
  id: string,
  onException: (error: Error) => void,
  sharedUserContext: () => any,
  children?: Array<TreeNode>,
};

export default function treeProcessor(options: Options) {
  const {
    nodeComplete,
    nodeStart,
    queueRunnerFactory,
    runnableIds,
    tree,
  } = options;

  function isEnabled(node, parentEnabled) {
    return parentEnabled || runnableIds.indexOf(node.id) !== -1;
  }

  function getNodeHandler(node: TreeNode, parentEnabled: boolean) {
    const enabled = isEnabled(node, parentEnabled);
    return node.children
      ? getNodeWithChildrenHandler(node, enabled)
      : getNodeWithoutChildrenHandler(node, enabled);
  }

  function getNodeWithoutChildrenHandler(node: TreeNode, enabled: boolean) {
    return function fn(done: (error?: any) => void = () => {}) {
      node.execute(done, enabled);
    };
  }

  function getNodeWithChildrenHandler(node: TreeNode, enabled: boolean) {
    return async function fn(done: (error?: any) => void = () => {}) {
      nodeStart(node);
      await queueRunnerFactory({
        onException: error => node.onException(error),
        queueableFns: wrapChildren(node, enabled),
        userContext: node.sharedUserContext(),
      });
      nodeComplete(node);
      done();
    };
  }

  function hasEnabledTest(node: TreeNode) {
    if (node.children) {
      return node.children.some(hasEnabledTest);
    }
    return !node.disabled;
  }

  function wrapChildren(node: TreeNode, enabled: boolean) {
    if (!node.children) {
      throw new Error('`node.children` is not defined.');
    }
    const children = node.children.map(child => ({
      fn: getNodeHandler(child, enabled),
    }));
    if (!hasEnabledTest(node)) {
      return children;
    }
    return node.beforeAllFns.concat(children).concat(node.afterAllFns);
  }

  const treeHandler = getNodeHandler(tree, false);
  return treeHandler();
}
