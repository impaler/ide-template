'use strict';

var WebStorm = require('./ide/webstorm/webstorm');
require('shelljs/global');

module.exports = {
  util    : require('./util'),
  webStorm: new WebStorm()
};