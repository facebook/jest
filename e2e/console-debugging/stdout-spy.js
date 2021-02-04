const originalStdoutWrite = process.stdout.write;

const stdoutWrite = (...args) => {
  stdoutWrite.text = args[0];
  originalStdoutWrite(...args);
};

process.stdout.write = stdoutWrite;

module.exports = stdoutWrite;
