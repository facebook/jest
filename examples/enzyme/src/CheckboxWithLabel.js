// Copyright 2004-present Facebook. All Rights Reserved.

import React from 'react';

export default function CheckboxWithLabel(props) {
  const [isChecked, setIsChecked] = React.useState(false);

  const onChange = () => {
    setIsChecked(!isChecked);
  };

  return (
    <label>
      <input type="checkbox" checked={isChecked} onChange={onChange} />
      {isChecked ? props.labelOn : props.labelOff}
    </label>
  );
}
