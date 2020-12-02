/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import classNames from 'classnames';

export default class Container extends React.Component {
  render() {
    const containerClasses = classNames('containerV1', this.props.className, {
      darkBackground: this.props.background === 'dark',
      highlightBackground: this.props.background === 'highlight',
      lightBackground: this.props.background === 'light',
      paddingAll: this.props.padding.indexOf('all') >= 0,
      paddingBottom: this.props.padding.indexOf('bottom') >= 0,
      paddingLeft: this.props.padding.indexOf('left') >= 0,
      paddingRight: this.props.padding.indexOf('right') >= 0,
      paddingTop: this.props.padding.indexOf('top') >= 0,
    });
    let wrappedChildren;

    if (this.props.wrapper) {
      wrappedChildren = <div className="wrapperV1">{this.props.children}</div>;
    } else {
      wrappedChildren = this.props.children;
    }
    return (
      <div className={containerClasses} id={this.props.id}>
        {wrappedChildren}
      </div>
    );
  }
}

Container.defaultProps = {
  background: null,
  padding: [],
  wrapper: true,
};