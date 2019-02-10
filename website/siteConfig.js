/*eslint sort-keys: 0*/
/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 * All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* List of talks & videos */

const videoTypes = {
  YOUTUBE: 'youtube',
  IFRAME: 'iframe',
};

const videos = [
  {
    title: 'Rogelio Guzman - Jest Snapshots and Beyond - React Conf 2017',
    type: videoTypes.YOUTUBE,
    url: 'https://www.youtube.com/embed/HAuXJVI_bUs',
    description:
      '[Rogelio](https://twitter.com/rogeliog) shows how Jest might help you overcome the inertia to write & maintain tests with the help of a simple React Application.',
  },
  {
    title:
      'Aaron Abramov – Establishing Testing Patterns with Software Design Principles',
    type: videoTypes.YOUTUBE,
    url: 'https://www.youtube.com/embed/_pnW-JjmyXE',
    description:
      '[Aaron](https://twitter.com/aaronabramov_) shows how the lack of clarity about testing applications leads engineers to write low-quality tests that don’t catch bugs, break unnecessarily, and are hard to write.',
  },
  {
    title: 'Snapshot testing - Anna Doubkova, React London 2017',
    type: videoTypes.YOUTUBE,
    url: 'https://www.youtube.com/embed/sCbGfi40IWk',
    description:
      'In this talk, [Anna Doubkova](https://twitter.com/lithinn) explains Snapshot Testing in brief while also highlighting testing pitfalls.',
  },
  {
    title: 'Test React applications using Enzyme & Jest',
    type: videoTypes.YOUTUBE,
    url: 'https://www.youtube.com/embed/8Ww2QBVIw0I',
    description:
      'This talk by [Ryan Walsh](https://twitter.com/_rtwalsh) gives an introduction to testing [React](https://facebook.github.io/react/) components using [Enzyme](http://airbnb.io/enzyme/) and Jest.',
  },
];

/* List of projects/orgs using your project for the users page */
const users = [
  {
    caption: 'Facebook',
    image: '/img/logos/facebook.png',
    infoLink: 'https://code.facebook.com',
  },
  {
    caption: 'Twitter',
    image: '/img/logos/twitter.png',
    infoLink: 'https://www.twitter.com',
  },
  {
    caption: 'The New York Times',
    image: '/img/logos/nyt.png',
    infoLink: 'http://www.nytimes.com/',
  },
  {
    caption: 'Spotify',
    image: '/img/logos/spotify.png',
    infoLink: 'https://www.spotify.com',
  },
  {
    caption: 'Airbnb',
    image: '/img/logos/airbnb.png',
    infoLink: 'https://www.airbnb.com/',
  },
  {
    caption: 'Instagram',
    image: '/img/logos/instagram.png',
    infoLink: 'https://www.instagram.com/',
  },
];

const repoUrl = 'https://github.com/facebook/jest';

const siteConfig = {
  title: 'Jest',
  tagline: '🃏 Delightful JavaScript Testing',
  url: 'https://jestjs.io',
  cname: 'jestjs.io',
  baseUrl: '/',
  projectName: 'jest',
  repo: 'facebook/jest',
  users,
  videos,
  videoTypes,
  editUrl: repoUrl + '/edit/master/docs/',
  headerLinks: [
    {doc: 'getting-started', label: 'Docs'},
    {doc: 'api', label: 'API'},
    {page: 'help', label: 'Help'},
    {blog: true, label: 'Blog'},
    {languages: true},
    {search: true},
    {href: repoUrl, label: 'GitHub'},
  ],
  headerIcon: 'img/jest.svg',
  footerIcon: 'img/jest-outline.svg',
  favicon: 'img/favicon/favicon.ico',
  ogImage: 'img/opengraph.png',
  onPageNav: 'separate',
  recruitingLink: 'https://crowdin.com/project/jest',
  algolia: {
    apiKey: process.env.ALGOLIA_JEST_API_KEY,
    indexName: 'jest',
    algoliaOptions: {
      facetFilters: ['language:LANGUAGE', 'version:VERSION'],
    },
  },
  gaTrackingId: 'UA-44373548-17',
  colors: {
    primaryColor: '#10910e',
    secondaryColor: '#095708',
    prismColor: 'rgba(153, 66, 79, 0.03)',
  },
  scripts: ['https://buttons.github.io/buttons.js'],
  repoUrl,
  siteConfigUrl:
    'https://github.com/facebook/jest/edit/master/website/siteConfig.js',
  cleanUrl: true,
  twitter: true,
  twitterUsername: 'fbjest',
  twitterImage: 'img/jest.png',
};

module.exports = siteConfig;
