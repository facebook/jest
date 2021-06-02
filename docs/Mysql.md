---
id: mysql
title: Using with MySQL
---

With the [Global Setup/Teardown](Configuration.md#globalsetup-string), Jest can work smoothly with **MySQ**.

## Use jest-mysql Preset

[Jest MySQL](https://github.com/Daniel-Yonkov/jest-mysql) provides an easy setup for testing your app using MySQL.

## Prerequisites

**MySQL** must be present in your development environment.

## Resume

- Allows MySQL schema import for testing database before tests are run - See [option definition](#option-definitions)
- Allows custom action hooks after [globalSetup](Configuration.md#globalsetup-string) - See [Setup Hooks](#setup-hooks)
- Allows database truncation after tests have finished ([globalTeardown](Configuration#globalteardown-string)) - See [option definition](#option-definitions)

## Install `jest-mysql` preset

```
yarn add jest-mysql --dev
```

or

```
npm install jest-mysql --save-dev
```

## Specify preset in your Jest configuration:

Within `package.json`:

```json
{
  "preset": "jest-mysql"
}
```

Within `jest.config.js`:

```js
module.exports = {
  preset: 'jest-mysql',
  //any other config
};
```

## Create `jest-mysql-config.js`

Within the root directory of your project, create jest-mysql-config.js. I.E.

```js
module.exports = {
  databaseOptions: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'test',
  },
  createDatabase: true,
  dbSchema: 'DB_creation.sql',
  truncateDatabase: false,
};
```

## Option definitions:

- `databaseOptions` - **Required** {Object} Connection options used to be used by the MySQL client For further info regarding what parameters are supported, check [this reference](https://github.com/mysqljs/mysql#connection-options)
- `createDatabase` - **Optional** {Boolean} If this is set to true, a database will be created if database with such name does not exist in your MySQL instance
- `dbSchema` - **Optional** {String} Path to the MySQL dump schema for the database (this can be any database dump; regardless if data is exported or only the tables structure).
- `truncateDatabase`: **Optional** {Boolean} If this is set to true, the database will be truncated upon tests finishing, see [globalTeardown](Configuration.md#globalsetup-string) for further reference

## Database connection

For utility purposes, the connection to the database has been made available within the global context and it can be accessed as follows:

```js
globa.db;
```

## Setup Hooks

If you need further customization after the database has been created and schema imported, you could provide a custom hooks file which will be exectuted after the initial setup has been completed ( if [createDatabase](#option-definitions) - the database has been created and the connection has been established to the database).

- Create in the root directory of your project `setupHooks.js`
- The provided functions must be `async` or `Promise` based Example structure:

```js
const {setupDummyUsers} = require('tests/fixtures/dummyUser');

async function postSetup() {
  await setupDummyUsers();
}

module.exports = {
  postSetup,
};
```

## Write tests

You should be able to access the connection to the database and query if needed. Enjoy!

```js
it('should have created a database with User table and 3 dummy user records', done => {
  const users = global.db.query(
    'SELECT * FROM users',
    (error, results, fields) => {
      if (error) {
        throw error;
      }
      expect(results).toHaveLength(3);
      done();
    },
  );
});
```

You can enable debug logs by setting environment variable `DEBUG=jest-mysql:*`

See [documentation](https://github.com/Daniel-Yonkov/jest-mysql) for details.
