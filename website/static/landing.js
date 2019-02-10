/* Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved. */

/* global document, window, localStorage */

// Allow taking a bit longer on the first run
const firstRun = localStorage.getItem('firstRun');
localStorage.setItem('firstRun', 'true');
const baseMinimalTime = firstRun ? 3000 : 1500;

document.addEventListener('DOMContentLoaded', () => {
  const hand = document.querySelector('.jest-hand');
  const cards = hand.querySelectorAll('.jest-card');

  function cardTransform(offset, handWidth) {
    const transform =
      'rotate(' +
      offset * 4 +
      'deg) translateX(' +
      (offset - (Math.abs(offset) * offset) / 7) *
        Math.min(140, handWidth / 8) +
      'px)';
    return transform;
  }

  function positionCards() {
    const handWidth = hand.offsetWidth;
    cards.forEach(card => {
      const offset = parseInt(card.dataset.index, 10) - 2;
      card.parentElement.style.transform = cardTransform(offset, handWidth);
    });
  }

  const results = [];
  const timeouts = [];

  function resolveRun(card, index, minTime) {
    minTime = minTime || 500;
    setTimeout(() => {
      if (index === 2) {
        results[index] = null;
        card.classList.add('jest-card-run');
      } else if (results[index]) {
        card.classList.remove('jest-card-fail');
        card.classList.add('jest-card-pass');
        card.querySelectorAll('.jest-card-label').forEach(el => {
          el.innerHTML = 'PASS';
        });
      } else {
        card.classList.remove('jest-card-pass');
        card.classList.add('jest-card-fail');
        card.querySelectorAll('.jest-card-label').forEach(el => {
          el.innerHTML = 'FAIL';
        });
      }
    }, minTime);

    if (timeouts[index]) {
      clearTimeout(timeouts[index]);
    }

    timeouts[index] = setTimeout(
      () => {
        card.classList.remove('jest-card-running');
        card.classList.add('jest-card-popping');
        setTimeout(() => {
          results[index] = results[index] || null;
          card.classList.remove('jest-card-popping');
        }, 400);
      },
      index === 2
        ? baseMinimalTime + minTime
        : Math.random() * baseMinimalTime + minTime
    );
  }

  function forceRun(minTime) {
    let fails = 0;
    cards.forEach((card, index) => {
      card.classList.add('jest-card-running');
      const result = index === 2 || fails > 1 || Math.random() > 0.25;
      if (!result) {
        fails += 1;
      }
      results[index] = result;
      resolveRun(card, index, minTime);
    });
  }

  function runTest(card, index) {
    if (!card.classList.contains('jest-card-running') && !results[index]) {
      if (index === 2) {
        return forceRun(1000);
      }
      card.classList.add('jest-card-running');
      if (results[index] == null) {
        results[index] = Math.random() > 0.2;
        resolveRun(card, index);
      }
    }
    return undefined;
  }

  hand.addEventListener('click', ev => {
    let card;
    if (ev.target.classList.contains('jest-card-hitslop')) {
      card = ev.target.firstChild;
    } else if (ev.target.classList.contains('jest-card')) {
      card = ev.target;
    } else if (ev.target.classList.contains('jest-card-front')) {
      card = ev.target.parentElement;
    }
    if (card) {
      const index = parseInt(card.dataset.index, 10);
      runTest(card, index);
    }
  });

  let resizeTimeout;

  window.addEventListener('resize', () => {
    if (!resizeTimeout) {
      resizeTimeout = setTimeout(() => {
        resizeTimeout = null;
        positionCards();
      }, 500);
    }
  });

  function setUpMatcherButtons() {
    const matcherSection = document.querySelector('.matchers .blockContent');
    const screenshotImg = document.querySelector('.matchers img');
    const buttonWrapper = document.createElement('p');
    buttonWrapper.className = 'buttons-wrapper';

    const buttons = [
      {
        title: 'Equals',
        url: '/img/content/matchers/equals.png',
      },
      {
        title: 'Mocks',
        url: '/img/content/matchers/mocks.png',
      },
      {
        title: 'Types',
        url: '/img/content/matchers/different-types.png',
      },
      {
        title: 'Properties',
        url: '/img/content/matchers/missing-properties.png',
      },
      {
        title: 'Snapshots',
        url: '/img/content/matchers/snapshot.png',
      },
      {
        title: 'Inline Snapshots',
        url: '/img/content/matchers/inline-snapshot.png',
      },
      {
        title: 'Functions',
        url: '/img/content/matchers/functions.png',
      },
    ];

    screenshotImg.onload = () => {
      screenshotImg.style.opacity = 1;
    };

    for (const button of buttons) {
      const clickButton = document.createElement('a');
      clickButton.text = button.title;
      clickButton.className = 'button landing';
      clickButton.onclick = () => {
        document
          .querySelectorAll('.matchers .button.landing')
          .forEach(b => (b.className = 'button landing'));
        clickButton.className = 'button landing active';
        screenshotImg.style.opacity = 0.5;
        screenshotImg.src = button.url;
      };
      buttonWrapper.appendChild(clickButton);
    }

    matcherSection.appendChild(buttonWrapper);

    const firstButton = document.querySelector(
      '.matchers .blockContent .button'
    );
    firstButton.onclick();
  }

  // Without forking Docusaurus which is on route to a breaking major semver,
  // we can't make the screenshots clickable. This fixes that with client-side
  // JS. Let's call it progressive enhancement, sure.
  function makeScreenshotsClickable() {
    document.querySelectorAll('.blockImage img').forEach(img => {
      console.log('-');
      img.style.cursor = 'pointer';
      img.onclick = () => {
        document.location = img.src;
      };
    });
  }

  forceRun(2000);
  positionCards();
  setUpMatcherButtons();
  makeScreenshotsClickable();
});
