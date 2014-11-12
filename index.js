/* jshint -W097 */
/* globals console, cp, mkdir, process */
'use strict';

var WebStorm = require('./ide/webstorm/webstorm');

require('shelljs/global');

var ideTemplate = {};
ideTemplate.webStorm = new WebStorm();
ideTemplate.util = require('./util');

module.exports = ideTemplate;
