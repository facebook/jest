---
id: testcontainers
title: Using with Testcontainers
---

With the [Global Setup/Teardown](Configuration.md#globalsetup-string) and [Async Test Environment](Configuration.md#testenvironment-string) APIs, Jest can work smoothly with [Testcontainers](https://www.testcontainers.org/).

## Use jest-testcontainers Preset

[Jest Testcontainers](https://github.com/Trendyol/jest-testcontainers) provides a declarative way to start a list of Docker containers and wait for them to be available before running your test suites.

1.  First install `@trendyol/jest-testcontainers`

```
yarn add --dev @trendyol/jest-testcontainers
```

2.  Specify preset in your Jest configuration:

```json
{
  "preset": "@trendyol/jest-testcontainers"
}
```

3.  Declare containers to run

Create a configuration file called `jest-testcontainers-config.js` at the root of your project folder. In this configuration file, you can declare any Docker container you want to have run before your tests.

```js
module.exports = {
  redis: {
    image: 'redis',
    tag: 'alpine3.12',
    ports: [6379],
    env: {
      EXAMPLE: 'env',
    },
    wait: {
      type: 'text',
      text: 'Ready to accept connections',
    },
  },
  // more: {
  //   image: 'any-docker-image', // postgresql, mongodb, neo4j etc.
  //   ports: [1234, 4567], // ports to make accessible in tests
  // },
};
```

Jest Testcontainers will start the declared Docker containers before your tests, wait for them to be available, and make their IP/Port information accessible as such; `global.__TESTCONTAINERS_${CONFIG_KEY}_IP__`, `global.__TESTCONTAINERS_${CONFIG_KEY}_PORT_${CONFIG_PORT}__`

4.  Write your test

```js
const {promisify} = require('util');
const redis = require('redis');

describe('testcontainers example suite', () => {
  let redisClient;

  beforeAll(() => {
    const redisConnectionURI = `redis://${global.__TESTCONTAINERS_REDIS_IP__}:${global.__TESTCONTAINERS_REDIS_PORT_6379__}`;
    redisClient = redis.createClient(redisConnectionURI);

    // if you have declared multiple containers, they will be available to access as well. e.g.
    // `global.__TESTCONTAINERS_${CONFIG_KEY}_IP__`
    // `global.__TESTCONTAINERS_${CONFIG_KEY}_PORT_${CONFIG_PORT}__`
  });

  afterAll(() => {
    redisClient.quit();
  });

  it('write should be ok', async () => {
    // Arrange
    const setAsync = promisify(redisClient.set).bind(redisClient);

    // Act
    const setResult = await setAsync('test', 73);

    // Assert
    expect(setResult).toEqual('OK');
  });
});
```

There's no need to load any dependencies.

See the [documentation](https://github.com/Trendyol/jest-testcontainers) for details (further configuration, watch mode support, working examples etc).
