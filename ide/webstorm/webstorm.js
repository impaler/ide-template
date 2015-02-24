'use strict';
/* globals console, mkdir, __dirname */

/**
 * Jetbrains WebStorm IDE project generation.
 *  http://www.jetbrains.com/webstorm
 *  @type {IDE}
 */
require('shelljs/global');

var util = require('util'),
    IDE  = require('../IDE'),
    fs   = require('fs'),
    path = require('path'),
    _    = require('lodash');

var platform = require('../../lib/platform');
var io = require('../../lib/io');
var templateUtil = require('../../util');

module.exports = WebStorm;

function WebStorm() {
  WebStorm.super_.apply(this, ['webstorm']);
}

util.inherits(WebStorm, IDE);

/**
 * Use the WebStorm executable to open a project programatically.
 * @param location
 */
WebStorm.prototype.open = function (location) {
  console.log('Please give WebStorm a chance to complete indexing your project.');
  WebStorm.super_.prototype.open.apply(this, [location]);
};

WebStorm.prototype.executable = function () {
  if (platform.isWindows()) {
    return path.join(
      io.maximisePath(
        io.reduceDirectories('C:/Program Files/JetBrains', 'C:/Program Files (x86)/JetBrains'),
        /^WebStorm\s*[.\d]+$/, 'bin'),
      'Webstorm.exe');

  } else if (platform.isMacOS()) {
    return '/Applications/WebStorm.app/Contents/MacOS/webide';

  } else if (platform.isUnix()) {
    return path.join('opt/webstorm/bin/webstorm.sh');

  } else {
    return null;
  }
};

/**
 * Create a new WebStorm .idea project at a given destination with
 * a specific template context.
 *
 * @param destination
 * @param context
 */
WebStorm.prototype.createProject = function (destination, context) {
  context = this.createContext(context);

  var source = path.join(String(__dirname), 'template', 'project');
  destination = path.join(destination, '.idea');

  templateUtil.templateDirSync(source, destination, context);

  if (context.resourceRoots.length > 0) {
    stubPlainTextFiles(context.plainText, destination);
  }
};

/**
 * Method for copying WebStorm file template configurations to the local
 * user preferences folders.
 *
 * http://www.jetbrains.com/webstorm/webhelp/file-and-code-templates.html
 *
 */
WebStorm.prototype.copyFileTemplates = function (source) {
  var destination = path.join(userPreferencesDirectory(), 'fileTemplates');
  var isValid = io.existsDirectorySync(destination);

  if (!isValid) {
    console.log('Failed to locate Webstorm templates. Expected directory:');
    console.log('  ' + destination);
  } else {
    io.replaceMatchFilesSync(/^angularity/, source, destination);
  }
};

/**
 * Create a new template context for an idea project.
 * if a custom context is provided it will override any default values of the resulting object.
 *
 * @param override
 * @returns {Object}
 */
WebStorm.prototype.createContext = function (override) {
  var context = {
    projectName             : 'NewProject',
    jshintPath              : './.jshintrc',
    jsDebugPort             : '63343',
    javascriptVersion       : 'ES5',
    projectFolder           : '',
    selectedDebugName       : '',
    resourceRoots           : [],
    watcherSuppressedTasks  : [],
    plainText               : '',
    contentPaths            : [
      {
        content : 'file://$MODULE_DIR$',
        excluded: []
      }
    ],
    projectPane             : [],
    libraries               : [],
    vcs                     : [],
    jsDebugConfiguration    : [],
    nodejsDebugConfiguration: []
  };
  return _.merge(context, override);
};

/**
 * Shortcut to create a project context with the default values
 * This prevents an error in lodash template with undefined template tokens.
 *
 * @param projectName
 * @param contentPaths
 * @param jsDebugPort
 * @param jshintPath
 */
WebStorm.prototype.createProjectContext = function (projectName, contentPaths, jsDebugPort, jshintPath) {
  return {
    projectName : projectName,
    jshintPath  : jshintPath,
    jsDebugPort : jsDebugPort,
    contentPaths: contentPaths
  };
};

/**
 * Method for copying WebStorm configuration to the local
 * user preferences folders.
 * @see http://www.jetbrains.com/webstorm/webhelp/external-tools.html
 */
WebStorm.prototype.copyCodeStyle = function (source) {
  if (!fs.existsSync(source)) {
    console.error('WebStorm.copyCodeStyle() the provided path for the codestyle xml does not exist at', source);
  }

  var basename = path.basename(source);
  var destination = path.join(userPreferencesDirectory(), 'codestyles', basename);
  io.copyFileSync(source, destination);
};

/**
 * Method for copying the WebStorm external tools configuration to the local
 * user preferences folders.
 *
 * @see http://www.jetbrains.com/webstorm/webhelp/external-tools.html
 */
WebStorm.prototype.copyExternalTools = function (source) {
  var destination = path.join(userPreferencesDirectory(), 'tools');
  io.copyFileSync(source, destination);
};

/**
 * Create an external tool template xml file with a given context object.
 * @param override
 * @returns {*} plain text of the xml
 */
WebStorm.prototype.createExternalTool = function (context, fileName) {
  var baseContext = {
    name : '',
    tools: [
      {
        name               : 'default',
        showInMainMenu     : 'true',
        showInEditor       : 'true',
        showInProject      : 'true',
        showInSearchPopup  : 'true',
        disabled           : 'false',
        useConsole         : 'true',
        showConsoleOnStdOut: 'false',
        showConsoleOnStdErr: 'false',
        synchronizeAfterRun: 'true',
        exec               : [
          {
            name : '',
            value: ''
          }
        ],
        filter             : [
          {
            name : '',
            value: ''
          }
        ]
      }
    ]
  };
  // Use the base context to create a new tool template
  context = _.merge(baseContext, context);

  var templateSource = path.join(String(__dirname), 'template', 'externalTool.xml');
  var toolTemplate = fs.readFileSync(templateSource);
  var content = _.template(toolTemplate, context);

  var toolsPath = path.join(userPreferencesDirectory(), 'tools');
  io.validateDirectorySync(toolsPath);
  var destination = path.join(toolsPath, fileName);

  fs.writeFileSync(destination, content, 'utf8');
};

/**
 * webStorm will remove any plain text files specified on first open
 * if they do not exists.
 *
 * For example this lets files from a build be marked as plain text before they exist
 * by stubbing an empty file at their expected position.
 * @param resourceRoots
 * @param destination
 */
function stubPlainTextFiles(resourceRoots, destination) {
  _.forEach(resourceRoots, function (resource) {
    // Replace the webstorm file:// scheme with an absolute file path
    var filePath = resource.replace('file://$PROJECT_DIR$', destination);
    filePath = filePath.replace('.idea/', '');
    // Extract the location from the file path to recursively create it if it doesn't exist.
    var location = filePath.replace(/[^\/]*$/, '');

    if (!fs.existsSync(location))
      mkdir('-p', location);

    if (!fs.existsSync(filePath))
      fs.writeFileSync(filePath, ' ', 'utf8');
  });
}

/**
 * The user preferences directory for webstorm on the current platform
 * @returns {string}
 */
function userPreferencesDirectory() {
  var home = platform.userHomeDirectory();
  return io.maximisePath(home, /^\.WebStorm\s*[.\d]+$/, 'config') ||         // windows|unix
    io.maximisePath(home, 'Library', 'Preferences', /^WebStorm\s*[.\d]+$/);  // darwin
}