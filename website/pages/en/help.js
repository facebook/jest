/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');

const CompLibrary = require('../../core/CompLibrary.js');
const Container = CompLibrary.Container;
const GridBlock = CompLibrary.GridBlock;

const translate = require('../../server/translate.js').translate;

class Help extends React.Component {
  render() {
    const supportLinks = [
      {
        content: (
          <translate>
            Find what you're looking for in our detailed documentation and
            guides.\n\n- Learn how to [get
            started](/docs/en/getting-started.html) with Jest.\n-
            [Troubleshoot](/docs/en/troubleshooting.html) problems with Jest.\n-
            Learn how to [configure Jest](/docs/en/configuration.html).\n- Look
            at the full [API Reference](/docs/en/api.html).
          </translate>
        ),
        title: <translate>Browse the docs</translate>,
      },
      {
        content: (
          <translate>
            Ask questions and find answers from other Jest users like you.\n\n-
            Join the [#jest](https://discord.gg/MWRhKCj) channel on
            [Reactiflux](http://www.reactiflux.com/), a Discord community.\n-
            Many members of the community use Stack Overflow. Read through the
            [existing
            questions](https://stackoverflow.com/questions/tagged/jestjs) tagged
            with **jestjs** or [ask your
            own](https://stackoverflow.com/questions/ask)!
          </translate>
        ),
        title: <translate>Join the community</translate>,
      },
      {
        content: (
          <translate>
            Find out what's new with Jest.\n\n- Follow
            [Jest](https://twitter.com/fbjest) on Twitter.\n- Subscribe to the
            [Jest blog](/blog/).\n- Look at the
            [changelog](https://github.com/facebook/jest/blob/master/CHANGELOG.md).
          </translate>
        ),
        title: <translate>Stay up to date</translate>,
      },
    ];

    return (
      <div className="docMainWrapper wrapper">
        <Container className="mainContainer documentContainer postContainer">
          <div className="post">
            <header className="postHeader">
              <h2>
                <translate>Need help?</translate>
              </h2>
            </header>
            <p>
              <translate>
                Jest is worked on full-time by Facebook's JavaScript Foundation
                team. Team members are often around and available for questions.
              </translate>
            </p>
            <GridBlock contents={supportLinks} layout="threeColumn" />
          </div>
        </Container>
      </div>
    );
  }
}

Help.defaultProps = {
  language: 'en',
};

module.exports = Help;
