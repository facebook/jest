// Copyright 2004-present Facebook. All Rights Reserved.

import React from 'react';

export default class Clock extends React.Component {
  constructor(props) {
    super(props);

    this.state = {seconds: Date.now() / 1000};
  }

  componentDidMount() {
    this.timerID = setInterval(() => this.tick(), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  tick() {
    this.setState({
      seconds: Date.now() / 1000,
    });
  }

  render() {
    return (
      <p>{this.state.seconds} seconds have elapsed since the UNIX epoch.</p>
    );
  }
}
