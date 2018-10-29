function promiseGame(callback) {
  console.log('Ready....go!');
  Promise.resolve(0).then(() => {
    console.log('Promise is fulfilled -- stop!');
    callback && callback();
  });
}

module.exports = promiseGame;
