/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';

// TODO
export default function MarkdownBlock({children}) {
  return (
    <div>
      <span>
        <p>{children}</p>
      </span>
    </div>
  );
}