/**
 * Copyright (c) 2014, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

const fs = require('graceful-fs');
const formatMessages = require('./lib/formatMessages');
const path = require('path');

// general functions

function readFile(filePath) {
  return new Promise(function(resolve, reject) {
    fs.readFile(filePath, 'utf8', function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

function escapeStrForRegex(str) {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function replacePathSepForRegex(str) {
  if (path.sep === '\\') {
    return str.replace(/(\/|\\)/g, '\\\\');
  }
  return str;
}

exports.readFile = readFile;
exports.escapeStrForRegex = escapeStrForRegex;
exports.replacePathSepForRegex = replacePathSepForRegex;
exports.cleanStackTrace = formatMessages.cleanStackTrace;
exports.formatFailureMessage = formatMessages.formatFailureMessage;

/**
 * Formats milliseconds into a greater
 * time signature.
 *
 * @param {number} time - the time in ms
 * @returns {string}
 */

function formatTime(time) {
  if (time < 1000) {
    return round(time, 2) + 'ms';
  }
  time /= 1000;
  if (time < 60) {
    return round(time, 2) + 's';
  }
  time /= 60;
  if (time < 60) {
    return round(time, 2) + 'm';
  }
  time /= 60;
  return round(time, 2) + 'hrs';
}

function round(num, places) {
  return +(Math.round(num + 'e+' + places) + 'e-' + places);
}

exports.formatTime = formatTime;

// lodash exports

const _ = require('lodash');

exports.deepCopy = _.cloneDeep;

function isDefined(o) {
  return !_.isUndefined(o);
}

exports._ = _;
exports.isEmpty = _.isEmpty;
exports.isDefined = isDefined;
exports.isUndefined = _.isUndefined;
exports.isFunction = _.isFunction;
exports.isString = _.isString;
exports.isObject = _.isObject;
exports.isArray = _.isArray;
exports.defaults = _.defaults;
exports.uniqWith = _.uniqWith;
exports.uniq = _.uniq;
exports.flatten = _.flatten;
exports.isEqual = _.isEqual;
