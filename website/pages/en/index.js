/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');

const CompLibrary = require('../../core/CompLibrary.js');
const MarkdownBlock = CompLibrary.MarkdownBlock; /* Used to read markdown */
const Container = CompLibrary.Container;
const GridBlock = CompLibrary.GridBlock;

const translate = require('../../server/translate.js').translate;
const translation = require('../../server/translation.js');
const backers = require(process.cwd() + '/backers.json');

const siteConfig = require(process.cwd() + '/siteConfig.js');
const idx = (target, path) =>
  path.reduce((obj, key) => (obj && obj[key] ? obj[key] : null), target);

class Button extends React.Component {
  render() {
    return (
      <div className="pluginWrapper buttonWrapper">
        <a className="button" href={this.props.href} target={this.props.target}>
          {this.props.children}
        </a>
      </div>
    );
  }
}

Button.defaultProps = {
  target: '_self',
};

class Contributors extends React.Component {
  render() {
    return (
      <div className="opencollective">
        <h3 className="rotate-left">
          <translate>Sponsors</translate>
        </h3>
        <p>
          <translate>
            Sponsors are those who contribute $100 or more per month to Jest
          </translate>
        </p>
        <div>
          {backers
            .filter(b => b.tier === 'sponsor')
            .map(b => (
              <a
                key={b.id}
                className="sponsor-item"
                title={`$${b.totalDonations / 100} by ${b.name || b.slug}`}
                target="_blank"
                href={b.website || `https://opencollective.com/${b.slug}`}
              >
                {
                  <img
                    className="sponsor-avatar"
                    src={b.avatar}
                    alt={
                      b.name || b.slug
                        ? `${b.name || b.slug}'s avatar`
                        : 'avatar'
                    }
                  />
                }
              </a>
            ))}
        </div>
        <h3 className="rotate-left">
          <translate>Backers</translate>
        </h3>
        <p>
          <translate>
            Backers are those who contribute $2 or more per month to Jest
          </translate>
        </p>
        <div>
          {backers
            .filter(b => b.tier === 'backer')
            .map(b => (
              <a
                key={b.id}
                className="backer-item"
                title={`$${b.totalDonations / 100} by ${b.name || b.slug}`}
                target="_blank"
                href={b.website || `https://opencollective.com/${b.slug}`}
              >
                {
                  <img
                    className="backer-avatar"
                    src={b.avatar}
                    alt={
                      b.name || b.slug
                        ? `${b.name || b.slug}'s avatar`
                        : 'avatar'
                    }
                  />
                }
              </a>
            ))}
        </div>
      </div>
    );
  }
}

class HomeSplash extends React.Component {
  render() {
    return (
      <div className="homeContainer">
        <div className="homeSplashFade">
          <div className="wrapper homeWrapper">
            <div className="inner">
              <h2 className="projectTitle">
                {siteConfig.title}
                <small>
                  {idx(translation, [
                    this.props.language,
                    'localized-strings',
                    'tagline',
                  ]) || siteConfig.tagline}
                </small>
              </h2>
              <div className="section promoSection">
                <div className="promoRow">
                  <div className="pluginRowBlock">
                    <Button href="#use">
                      <translate>Try Out Jest</translate>
                    </Button>
                    <Button
                      href={
                        siteConfig.baseUrl +
                        'docs/' +
                        this.props.language +
                        '/getting-started.html'
                      }
                    >
                      <translate>Get Started</translate>
                    </Button>
                    <Button href={'#watch'}>
                      <translate>Watch Talks</translate>
                    </Button>
                    <Button
                      href={
                        siteConfig.baseUrl +
                        'docs/' +
                        this.props.language +
                        '/snapshot-testing.html'
                      }
                    >
                      <translate>Learn More</translate>
                    </Button>
                  </div>
                </div>
              </div>
              <div className="githubButton" style={{minHeight: '20px'}}>
                <a
                  className="github-button"
                  href={this.props.config.repoUrl}
                  data-icon="octicon-star"
                  data-count-href="/facebook/jest/stargazers"
                  data-show-count={true}
                  data-count-aria-label="# stargazers on GitHub"
                  aria-label="Star facebook/jest on GitHub"
                >
                  Star
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class Index extends React.Component {
  render() {
    const showcase = siteConfig.users.map((user, i) => (
      <a href={user.infoLink} key={i}>
        <img src={user.image} title={user.caption} />
      </a>
    ));

    return (
      <div>
        <HomeSplash language={this.props.language} config={siteConfig} />
        <div className="mainContainer">
          {/* <Container padding={['bottom', 'top']} background="light">
            <GridBlock
              align="center"
              contents={[
                {
                  content: (
                    <translate>
                      Complete and ready to set-up JavaScript testing solution.
                      Works out of the box for any React project.
                    </translate>
                  ),
                  image: '/img/content/female-technologist.png',
                  imageAlign: 'top',
                  title: <translate>Developer Ready</translate>,
                },
                {
                  content: (
                    <translate>
                      Fast interactive watch mode runs only test files related
                      to changed files and is optimized to give signal quickly.
                    </translate>
                  ),
                  image: '/img/content/runner.png',
                  imageAlign: 'top',
                  title: <translate>Instant Feedback</translate>,
                },
                {
                  content: (
                    <translate>
                      Capture snapshots of React trees or other serializable
                      values to simplify testing and to analyze how state
                      changes over time.
                    </translate>
                  ),
                  image: '/img/content/camera-with-flash.png',
                  imageAlign: 'top',
                  title: <translate>Snapshot Testing</translate>,
                },
              ]}
              layout="fourColumn"
            />
          </Container>
          <Container padding={['bottom', 'top']}>
            <div
              className="productShowcaseSection paddingBottom"
              style={{textAlign: 'center'}}
            >
              <h2>
                <translate>Zero configuration testing platform</translate>
              </h2>
              <MarkdownBlock>
                <translate>
                  Jest is used by Facebook to test all JavaScript code including
                  React applications. One of Jest's philosophies is to provide
                  an integrated \"zero-configuration\" experience. We observed
                  that when engineers are provided with ready-to-use tools, they
                  end up writing more tests, which in turn results in more
                  stable and healthy code bases.
                </translate>
              </MarkdownBlock>
            </div>
          </Container> */}
          {/* <Container padding={['bottom', 'top']} className="section-container">
            <GridBlock
              className="rotate-right"
              contents={[
                {
                  content: (
                    <translate>
                      By ensuring your tests have unique global state, Jest can
                      reliably run tests in parallel. To make things quick, Jest
                      runs previously failed tests first and re-organizes runs
                      based on how long test files take.
                    </translate>
                  ),
                  image: '/img/content/feature-fast.png',
                  imageAlign: 'left',
                  title: <translate>Fast and safe</translate>,
                },
              ]}
            />
          </Container>
          <Container
            padding={['bottom', 'top']}
            background="light"
            className="section-container"
          >
            <GridBlock
              className="rotate-left"
              contents={[
                {
                  content: (
                    <translate>
                      Generate code coverage by adding the flag
                      [`--coverage`](https://jestjs.io/docs/en/cli.html#coverage).
                      No additional setup needed. Jest can collect code coverage
                      information from entire projects, including untested
                      files.
                    </translate>
                  ),
                  image: '/img/content/feature-coverage.png',
                  imageAlign: 'right',
                  title: <translate>Code coverage</translate>,
                },
              ]}
            />
          </Container>
          <Container padding={['bottom', 'top']} className="section-container">
            <GridBlock
              className="rotate-right"
              contents={[
                {
                  content: (
                    <translate>
                      Jest uses a custom resolver for imports in your tests
                      making it simple to mock any object outsided of your
                      test’s scope. You can use mocked imports with the rich
                      [Mock
                      Functions](https://jestjs.io/docs/en/mock-functions.html)
                      API to spy on function calls with readable test syntax.
                    </translate>
                  ),
                  image: '/img/content/feature-config-react.png',
                  imageAlign: 'left',
                  title: <translate>Mocking with ease</translate>,
                },
              ]}
            />
          </Container>
          <Container
            padding={['bottom', 'top']}
            background="light"
            className="section-container"
          >
            <GridBlock
              className="rotate-right"
              contents={[
                {
                  content: (
                    <translate>
                      When a test has failed, Jest puts in a lot of effort to
                      give you as much context as possible. here’s some examples
                    </translate>
                  ),
                  image: '/img/content/feature-mocking.png',
                  imageAlign: 'right',
                  title: <translate>Excellent exceptions</translate>,
                },
              ]}
            />
          </Container>
          <Container padding={['bottom', 'top']} className="debu">
            <a className="anchor" name="watch" />
            <a className="hash-link" href="#watch" />
            <GridBlock
              className="rotate-left"
              contents={[
                {
                  image: true,
                  imageAlign: 'right',
                  title: <translate>Docs and talks</translate>,
                },
              ]}
            />
            <div className="blockElement imageAlignSide gridBlock threeByGridBlock">
              <div className="video">
                <iframe
                  width="560"
                  height="315"
                  src="https://www.youtube.com/embed/cAKYQpTC7MA"
                  frameBorder="0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
              <div className="blockContent">
                <MarkdownBlock>
                  <translate>
                    The Jest core team and contributors regularly speak about
                    [Jest and Delightful JavaScript
                    Testing](https://www.youtube.com/watch?v=cAKYQpTC7MA). Check
                    out our talk about [Building High-Quality JavaScript
                    Tools](https://www.youtube.com/watch?v=PvabBs_utr8) at
                    jsconf.eu 2017 and our talk about [Jest as a
                    Platform](https://www.youtube.com/watch?v=NtjyeojAOBs) at
                    ReactiveConf 2017.
                  </translate>
                </MarkdownBlock>
              </div>
              <div className="blockContent">
                <div>
                  Cupiditate repellendus sit rerum est minus nam. Velit placeat
                  reiciendis placeat cumque. Sint et voluptatibus neque ad
                  dolore sunt. Esse est odio possimus nulla. Ipsam voluptate
                  maiores quo sed maiores excepturi. Quisquam sed sint incidunt
                  placeat est.
                </div>
              </div>
            </div>
          </Container> */}
          <div className="container section-container imageAlignSide lightBackground twoByGridBlock">
            <div className="wrapper">
              <div className="gridBlock">
                <div className="blockContent rotate-right">
                  <h2>
                    <translate>Open Collective</translate>
                  </h2>
                  <MarkdownBlock>
                    <translate>
                      With so many users, the core team of Jest uses an [Open
                      Collective](https://opencollective.com/jest) for
                      non-Facebook contributors.
                    </translate>
                  </MarkdownBlock>
                  <Contributors />
                </div>
                <div className="blockContent rotate-left">
                  <h2>
                    <translate>Who uses Jest?</translate>
                  </h2>
                  <MarkdownBlock>
                    <translate>
                      A lot of people! With
                      [8.5m](https://www.npmjs.com/package/jest) downloads in
                      the last 30 days, and used on over
                      [500,000](https://github.com/facebook/jest/network/dependents)
                      public repos on GitHub. Jest is used extensively at these
                      companies:
                    </translate>
                  </MarkdownBlock>
                  <div className="gridBlock logos">
                    {showcase}
                    <p>And many others</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

module.exports = Index;
