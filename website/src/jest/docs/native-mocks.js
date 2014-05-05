/**
 * @generated
 * @jsx React.DOM
 */
var React = require("React");
var layout = require("DocsLayout");
module.exports = React.createClass({
  render: function() {
    return layout({metadata: {"filename":"NativeMocks.js","id":"native-mocks","title":"Native Mocks","layout":"docs","category":"Deep Dive","permalink":"native-mocks.html","previous":"mock-functions","next":"api","href":"/jest/docs/native-mocks.html"}}, `---

Timers
------

The native timer functions, i.e., \`setTimeout\`, \`setInterval\`, \`clearTimeout\`, \`clearInterval\` are not suitable for the test environment since they depend on real time to elapse. Fake timer functions are provided to make assertions about behaviors with respect to these timers.

\`\`\`javascript
// Assume module 'PlayerGames' called
//   setTimeout(callback, 1000);
require('PlayGames');
expect(setTimeout.mock.calls.length).toEqual(1);
expect(setTimeout.mock.calls[0][1]).toEqual(1000);
\`\`\`

Further, it provides you the ability to make fake time elapse in your code:
\`\`\`javascript
// This will run the timer callbacks within the next 2000 milliseconds
// iteratively. Note: 2000 is specifying a relative time from 'now'
// instead of from the time test start running
mockRunTimersToTime(2000);
// Assert the result of callback()
\`\`\`

Or if the time elapse is not really important, you just need to run the timer callbacks once:
\`\`\`javascript
// Every timer function callback will be executed once
mockRunTimersOnce();
\`\`\`

Or if you may have timers that may register other timers and don't want to manage the number of times to run or choose an arbitrary large length of time to run, you can run timers repeatedly:
\`\`\`javascript
// Every timer function callback will be executed in time order until there
// are no more.
mockRunTimersRepeatedly();
\`\`\`

To clear all timers:
\`\`\`javascript
mockClearTimers();
\`\`\`

To get current timers count:
\`\`\`javascript
expect(mockGetTimersCount()).toEqual(4);
\`\`\`
`);
  }
});
