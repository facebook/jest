/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, {Component} from 'react';
import logo from './logo.svg';

import styles from './App.css';

class App extends Component {
  render() {
    return (
      <div className={styles.root}>
        <div className={styles.header}>
          <img src={logo} className={styles.logo} alt="logo" />
          <h2 className={styles.thisIsUndefined}>Welcome to React</h2>
        </div>
        <p className={styles.intro}>
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
      </div>
    );
  }
}

export default App;
