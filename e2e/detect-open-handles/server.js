// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

'use strict';

import {Server} from 'http';

const app = new Server();

app.listen({host: 'localhost', port: 0});
