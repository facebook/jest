// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.

const React = require('react');

const {Container, MarkdownBlock} = require('../../core/CompLibrary.js');
const {translate} = require('../../server/translate.js');
const siteConfig = require(process.cwd() + '/siteConfig.js');

class Video extends React.PureComponent {
  render() {
    const {url, type} = this.props;

    switch (type) {
      case siteConfig.videoTypes.YOUTUBE: {
        return (
          <iframe
            width="560"
            height="315"
            src={url}
            frameBorder="0"
            allowFullScreen
          />
        );
      }
      case siteConfig.videoTypes.IFRAME: {
        return <iframe src={url} />;
      }
      default: {
        return <iframe src={url} />;
      }
    }
  }
}

class Videos extends React.Component {
  render() {
    const showcase = siteConfig.videos.map(
      ({title, description, type, url}, index) => {
        const textMarkup = (
          <div className="blockContent">
            <h2>
              <a href={url}>{title}</a>
            </h2>
            <div>
              <MarkdownBlock>{description}</MarkdownBlock>
            </div>
          </div>
        );
        const videoMarkup = (
          <div className="video">
            <Video url={url} type={type} />
          </div>
        );

        return (
          <Container key={url} padding={['bottom', 'top']}>
            <a className="hash-link" href={`#${title}`} />
            {index % 2 === 0 ? (
              <div className="blockElement imageAlignSide threeByGridBlock">
                {videoMarkup}
                {textMarkup}
              </div>
            ) : (
              <div className="blockElement imageAlignSide threeByGridBlock">
                {textMarkup}
                {videoMarkup}
              </div>
            )}
          </Container>
        );
      }
    );

    return (
      <div className="mainContainer">
        <Container padding={['bottom', 'top']}>
          <div className="showcaseSection">
            <div className="prose">
              <h1>
                <translate>Talks & Videos</translate>
              </h1>
              <p>
                <translate>
                  We understand that reading through docs can be boring
                  sometimes. Here is a community curated list of talks & videos
                  around Jest.
                </translate>
              </p>
            </div>
          </div>
          {showcase}
          <div style={{textAlign: 'center'}}>
            <a href={siteConfig.siteConfigUrl} className="button">
              <translate>Add your favorite talk</translate>
            </a>
          </div>
        </Container>
      </div>
    );
  }
}

module.exports = Videos;
