/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
'use strict';

const fs = require('fs');

class Snapshot {

  constructor(filename) {
    this._filename = filename;
    this._loaded = null;
  }

  _getLoaded() {
    if (this._loaded) {
      return this._loaded;
    }
    return this.load();
  }

  load() {
    this._loaded = JSON.parse(fs.readFileSync(this._filename));
    return this._loaded;
  }

  exists() {
    return fs.existsSync(this._filename);
  }

  save(object) {
    fs.writeFileSync(this._filename, JSON.stringify(object));
    this._loaded = null;
  }

  has(key) {
    return this.exists() && key in this._getLoaded();
  }

  get(key) {
    return this.has(key) && this._getLoaded()[key];
  }

  is(key, value) {
    return this._getLoaded()[key] === value;
  }

  replace(key, value) {
    const obj = this.load();
    obj[key] = value;
    this.save(obj);
  }

  add(key, value) {
    const check = this.get(key);
    if (check === false) {
      const obj = this.load();
      obj[key] = value;
      this.save(obj);
    } else {
      throw new Error('Trying to add a snapshot that already exists');
    }
  }
}

module.exports = Snapshot;
