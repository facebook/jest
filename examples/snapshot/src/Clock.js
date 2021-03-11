// Copyright 2004-present Facebook. All Rights Reserved.

import React from 'react';

export default function Clock() {
  const [seconds, setSeconds] = React.useState(Date.now() / 1000);

  const tick = () => {
    setSeconds(Date.now() / 1000);
  };

  React.useEffect(() => {
    const timerID = setInterval(() => tick(), 1000);

    return () => {
      clearInterval(timerID);
    };
  }, []);

  return <p>{seconds} seconds have elapsed since the UNIX epoch.</p>;
}
