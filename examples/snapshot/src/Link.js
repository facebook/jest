// Copyright 2004-present Facebook. All Rights Reserved.

import React from 'react';

const STATUS = {
  HOVERED: 'hovered',
  NORMAL: 'normal',
};

export default function Link(props) {
  const [cssClass, setCssClass] = React.useState(STATUS.NORMAL);

  const _onMouseEnter = () => {
    setCssClass(STATUS.HOVERED);
  };

  const _onMouseLeave = () => {
    setCssClass(STATUS.NORMAL);
  };

  return (
    <a
      className={cssClass}
      href={props.page || '#'}
      onMouseEnter={_onMouseEnter}
      onMouseLeave={_onMouseLeave}
    >
      {props.children}
    </a>
  );
}
