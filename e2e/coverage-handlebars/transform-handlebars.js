/*
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const Handlebars = require('handlebars/dist/cjs/handlebars.js');
const {SourceMapConsumer, SourceNode} = require('source-map-sync');

exports.process = (code, filename) => {
  const pc = Handlebars.precompile(code, {srcName: filename});
  const consumer = new SourceMapConsumer(pc.map);
  const out = new SourceNode(null, null, null, [
    'const Handlebars = require("handlebars/dist/cjs/handlebars.runtime.js");\n',
    'module.exports = Handlebars.template(',
    SourceNode.fromStringWithSourceMap(pc.code, consumer),
    ');\n',
  ]).toStringWithSourceMap();
  consumer.destroy();
  return {code: out.code, map: out.map.toString()};
};
