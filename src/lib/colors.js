'use strict';

var BOLD = '\x1B[1m';
var GRAY = '\x1B[30m';
var GREEN_BG = '\x1B[42m';
var MAGENTA_BG = '\x1B[45m';
var RED = '\x1B[31m';
var RED_BG = '\x1B[41m';
var RESET = '\x1B[0m';
var UNDERLINE = '\x1B[4m';

function colorize(str, color) {
  //return str;
  return color + str.toString().split(RESET).join(RESET + color) + RESET;
}

exports.BOLD = BOLD;
exports.GRAY = GRAY;
exports.GREEN_BG = GREEN_BG;
exports.MAGENTA_BG = MAGENTA_BG;
exports.RED = RED;
exports.RED_BG = RED_BG;
exports.RESET = RESET;
exports.UNDERLINE = UNDERLINE;

exports.colorize = colorize;
