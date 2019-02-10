---
id: version-22.x-tutorial-jquery
title: DOM Manipulation
original_id: tutorial-jquery
---

Another class of functions that is often considered difficult to test is code that directly manipulates the DOM. Let's see how we can test the following snippet of jQuery code that listens to a click event, fetches some data asynchronously and sets the content of a span.

```javascript
// displayUser.js
'use strict';

const $ = require('jquery');
const fetchCurrentUser = require('./fetchCurrentUser.js');

$('#button').click(() => {
  fetchCurrentUser(user => {
    const loggedText = 'Logged ' + (user.loggedIn ? 'In' : 'Out');
    $('#username').text(user.fullName + ' - ' + loggedText);
  });
});
```

Again, we create a test file in the `__tests__/` folder:

```javascript
// __tests__/displayUser-test.js
'use strict';

jest.mock('../fetchCurrentUser');

test('displays a user after a click', () => {
  // Set up our document body
  document.body.innerHTML =
    '<div>' +
    '  <span id="username" />' +
    '  <button id="button" />' +
    '</div>';

  // This module has a side-effect
  require('../displayUser');

  const $ = require('jquery');
  const fetchCurrentUser = require('../fetchCurrentUser');

  // Tell the fetchCurrentUser mock function to automatically invoke
  // its callback with some data
  fetchCurrentUser.mockImplementation(cb => {
    cb({
      fullName: 'Johnny Cash',
      loggedIn: true,
    });
  });

  // Use jquery to emulate a click on our button
  $('#button').click();

  // Assert that the fetchCurrentUser function was called, and that the
  // #username span's inner text was updated as we'd expect it to.
  expect(fetchCurrentUser).toBeCalled();
  expect($('#username').text()).toEqual('Johnny Cash - Logged In');
});
```

The function being tested adds an event listener on the `#button` DOM element, so we need to set up our DOM correctly for the test. Jest ships with `jsdom` which simulates a DOM environment as if you were in the browser. This means that every DOM API that we call can be observed in the same way it would be observed in a browser!

We are mocking `fetchCurrentUser.js` so that our test doesn't make a real network request but instead resolves to mock data locally. This ensures that our test can complete in milliseconds rather than seconds and guarantees a fast unit test iteration speed.

The code for this example is available at [examples/jquery](https://github.com/facebook/jest/tree/master/examples/jquery).
