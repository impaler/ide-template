'use strict';
/* globals console, exec, mkdir, cp, __dirname */

/**
 * Jetbrains WebStorm 9 project generation.
 *
 * @type {ideTemplate|exports}
 */
var util = require('util'),
IDE      = require('../IDE'),
fs       = require('fs'),
path     = require('path'),
_        = require('lodash');

require('shelljs/global');

var templateUtil = require('../../util');

function WebStorm() {
  WebStorm.super_.apply(this, ['webstorm']);
}

util.inherits(WebStorm, IDE);

WebStorm.prototype.getExecutable = function (override) {
  if (override) {
    this.executable = override;
    return this.executable;
  }

  if (templateUtil.platform === ('unix' || 'darwin')) {
    this.executable = 'wstorm';

  } else {
    var webStormPath = this.webstormExecutablePath();

    if(webStormPath.length) {
      this.executable = '"' + webStormPath[0] + '"';

      if (!templateUtil.fileExists(this.executable))
        console.error('Error the WebStorm.exe is not present at', this.executable);
    }
  }

  return this.executable;
};

/**
 * Use the WebStorm executable to open a project programatically.
 *
 * @param location
 */
WebStorm.prototype.open = function (location, webstorm) {
  if (!this.validatePath(location)) return;

  var openCommand = this.getExecutable(webstorm) + ' "' + location + '"';

  if (templateUtil.platform === ('unix' || 'darwin'))
    exec(openCommand);
  else
    exec(openCommand);

  console.log('Please give WebStorm a chance to complete it\'s indexing before opening.');
};

/**
 * Create a new template context for an idea project.
 * if a custom context is provided it will override any default values of the resulting object.
 *
 * @param override
 * @returns {Object}
 */
WebStorm.prototype.createContext = function (override)
{
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
 * WebStorm IDE settings path.
 *
 * Returns the IDE settings path based on the current platform.
 *
 * See more info from the jetbrains docs.
 * http://www.jetbrains.com/webstorm/webhelp/project-and-ide-settings.html
 *
 * @returns {*}
 */
WebStorm.prototype.userPreferences = function () {
  var location;

  if (templateUtil.platform === 'windows')
    location = path.join(templateUtil.HOME(), '.WebStorm9', 'config');
  else
    location = path.join(templateUtil.HOME(), 'Library', 'Preferences', 'WebStorm9');

  return location;
};

/**
 * Method for copying the WebStorm external tools configuration to the local
 * user preferences folders.
 *
 * http://www.jetbrains.com/webstorm/webhelp/external-tools.html
 *
 */
WebStorm.prototype.copyExternalTools = function (source) {
  var destination = path.join(this.userPreferences(), 'tools');
  cp(source, destination);
};

/**
 * Write an external tool file to the user's local system.
 * @param content
 * @param fileName
 */
WebStorm.prototype.writeExternalTool = function (content, fileName) {
  var destination = path.join(this.userPreferences(), 'tools', fileName);
  fs.writeFileSync(destination, content, 'utf8');
};

/**
 * Create an external tool template xml file with a given context object.
 * @param override
 * @returns {*} plain text of the xml
 */
WebStorm.prototype.createExternalTool = function (override) {
  var context = {
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

  context = _.merge(context, override);

  var source = path.join(String(__dirname), 'template', 'externalTool.xml');
  var toolTemplate = fs.readFileSync(source);

  return _.template(toolTemplate, context);
};

/**
 * Method for copying WebStorm file template configurations to the local
 * user preferences folders.
 *
 * http://www.jetbrains.com/webstorm/webhelp/file-and-code-templates.html
 *
 */
WebStorm.prototype.copyFileTemplates = function (source) {
  var destination = path.join(this.userPreferences(), 'fileTemplates');
  templateUtil.cpR(path.join(source, '*'), destination);
};

/**
 * Resolve the WebStorm executable path based on the environment.
 * For windows it will search through the 'Program Files' directory
 * and return an Array of paths containing the installs.
 *
 * @returns {*}
 */
WebStorm.prototype.webstormExecutablePath = function () {
  if (this.platform === 'windows') {
    var jetBrainsFolder = 'C:/Program Files/JetBrains/';
    var jetBrainsFolder86 = 'C:/Program Files (x86)/JetBrains/';

    if (!fs.existsSync(jetBrainsFolder) && !fs.existsSync(jetBrainsFolder86)) {
      console.error('Are you sure you have WebStorm installed?');
      return null;
    }

    var webStormFolders = locateWebStormInstall(jetBrainsFolder);
    webStormFolders = webStormFolders.concat(locateWebStormInstall(jetBrainsFolder));

    return webStormFolders;
  } else
    return 'wstorm';
};

function locateWebStormInstall(path) {
  var executableBinPath = '/bin/WebStorm.exe"';
  var rootFolders = fs.readdirSync(path);

  _.forEach(rootFolders, function (folder) {
    if (folder.indexOf('WebStorm') !== -1) {
      var executablePath = path + folder + executableBinPath;

      if (fs.existsSync(executablePath))
        rootFolders.push(executablePath);
    }
  });

  return rootFolders;
}

module.exports = WebStorm;