/**
 * Base class for IDE projects to implement.
 * @param name
 * @constructor
 */
'use strict';
/* jshint unused:false*/
/* globals console, cp, mkdir, process */

var fs           = require('fs'),
    pathNode     = require('path'),
    childProcess = require('child_process');

module.exports = IDE;

function IDE(name) {
  this.name = name;
  this.templateSource = 'template';
}

IDE.prototype = {
  constructor       : IDE,
  open              : function (location) {
    if (platform.isWindows()) {
      location = '"' + location + '"';
    }
    console.log('opening,', this.executable(), ' at ', location);
    childProcess.spawn(this.executable(), [location], {detached: true});
  },
  executable        : function () {
    console.error('Error executable() is not implemented for this IDE', this.name);
    process.exit(1);
  },
  customExecutable  : null,
  validateExecutable: function () {
    console.error('Error validateExecutable() is not implemented for this IDE', this.name);
    process.exit(1);
  },
  createProject     : function (destination, context) {
    console.error('Error createProject() is not implemented for this IDE', this.name);
    process.exit(1);
  }
};
