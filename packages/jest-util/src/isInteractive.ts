// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

import isCI from 'is-ci';

export default !!process.stdout.isTTY && process.env.TERM !== 'dumb' && !isCI;
