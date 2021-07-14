---
id: ecmascript-modules
title: ECMAScript Modules
---

Jest ships with _experimental_ support for ECMAScript Modules (ESM).

> Note that due to its experimental nature there are many bugs and missing features in Jest's implementation, both known and unknown. You should check out the [tracking issue](https://github.com/facebook/jest/issues/9430) and the [label](https://github.com/facebook/jest/labels/ES%20Modules) on the issue tracker for the latest status.

> Also note that the APIs Jest uses to implement ESM support is still [considered experimental by Node](https://nodejs.org/api/vm.html#vm_class_vm_module) (as of version `14.13.1`).

With the warnings out of the way, this is how you activate ESM support in your tests.

1. Ensure you either disable [code transforms](./configuration#transform-objectstring-pathtotransformer--pathtotransformer-object) by passing `transform: {}` or otherwise configure your transformer to emit ESM rather than the default CommonJS (CJS).
1. Execute `node` with `--experimental-vm-modules`, e.g. `node --experimental-vm-modules node_modules/.bin/jest` or `NODE_OPTIONS=--experimental-vm-modules npx jest` etc.. On Windows, you can use [`cross-env`](https://github.com/kentcdodds/cross-env) to be able to set environment variables.
1. Beyond that, we attempt to follow `node`'s logic for activating "ESM mode" (such as looking at `type` in `package.json` or `.mjs` files), see [their docs](https://nodejs.org/api/esm.html#esm_enabling) for details.
1. If you want to treat other file extensions (such as `.jsx` or `.ts`) as ESM, please use the [`extensionsToTreatAsEsm` option](Configuration.md#extensionstotreatasesm-arraystring).

## Differences between ESM and CommonJS

Most of the differences are explained in [Node's documentation](https://nodejs.org/api/esm.html#esm_differences_between_es_modules_and_commonjs), but in addition to the things mentioned there, Jest injects a special variable into all executed files - the [`jest` object](JestObjectAPI.md). To access this object in ESM, you need to import it from the `@jest/globals` module.

```js
import {jest} from '@jest/globals';

jest.useFakeTimers();

// etc.
```

Please note that we currently don't support `jest.mock` in a clean way in ESM, but that is something we intend to add proper support for in the future. Follow [this issue](https://github.com/facebook/jest/issues/10025) for updates.
