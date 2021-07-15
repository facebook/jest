# Jest website

The Jest website is based on [Docusaurus 2](https://docusaurus.io).

## Run the dev server

You will need Node >=10.

The first time, get all the dependencies loaded via

```bash
yarn
```

Fetch `backers.json` file by running

```bash
yarn workspace jest-website fetchSupporters
```

Then, run the server via

```bash
yarn workspace jest-website start
```

## Publish the website

The site is deployed on each PR merged to master by Netlify:

- Netlify site: https://app.netlify.com/sites/jestjs
- Netlify url: https://jestjs.netlify.app
- Production url: https://jestjs.io

[![Netlify Status](https://api.netlify.com/api/v1/badges/4570042d-b147-40fd-84fc-3bfd63639af7/deploy-status)](https://app.netlify.com/sites/jestjs/deploys)

## Archive

An older Docusaurus v1 site exist for versions <= 25.x:

- Netlify site: https://app.netlify.com/sites/jest-archive
- Url: https://archive.jestjs.io
- GitHub branch: https://github.com/facebook/jest/tree/jest-website-v1
