// Copyright (c) 2014-present, Facebook, Inc. All rights reserved.

/// <reference path="./typings/react/react.d.ts" />

import * as React from 'react';

interface CheckboxWithLabelProps {
  labelOff: string;
  labelOn: string;
}

interface CheckboxWithLabelState {
  isChecked: boolean;
}

class CheckboxWithLabel extends React.Component<
  CheckboxWithLabelProps,
  CheckboxWithLabelState
> {
  constructor(props: CheckboxWithLabelProps) {
    super(props);
    this.state = {isChecked: false};
  }

  render() {
    return (
      <label>
        <input
          type="checkbox"
          checked={this.state.isChecked}
          onChange={() =>
            this.setState(current => ({isChecked: !current.isChecked}))
          }
        />
        {this.state.isChecked ? this.props.labelOn : this.props.labelOff}
      </label>
    );
  }
}

export default CheckboxWithLabel;
