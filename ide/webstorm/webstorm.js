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
  if (this.customExecutable !== null) {
    return this.customExecutable;

  } else if (platform.isWindows()) {
    return resolveWindowsExe();

  } else if (platform.isMacOS()) {
    var expectedPaths = [
      '/usr/local/bin/wstorm',
      '/Applications/WebStorm.app/Contents/MacOS/webide', //WebStorm 9
      '/Applications/WebStorm.app/Contents/MacOS/webstorm' //WebStorm 10
    ];

    for (var i = 0; i < expectedPaths.length; i++) {
      var execPath = expectedPaths[i];
      if (io.existsFileSync(execPath)) {
        return execPath;
      }
    }

  } else if (platform.isUnix()) {
    var selectedExecPath = null;
    [
      '/usr/local/bin/wstorm',
      '/opt/webstorm/bin/webstorm.sh'
    ].forEach(function(execPath) {
      if (io.existsFileSync(execPath)) {
        selectedExecPath = execPath;
      }
    });
    return selectedExecPath;
    
  } else {
    return null;
  }
};

/**
 * Utility to validate the executable path that will be used to open WebStorm
 * @returns {boolean}
 */
WebStorm.prototype.validateExecutable = function () {
  var executablePath = this.executable();
  var isValid = false;

  if (executablePath !== null) {
    isValid = io.existsFileSync(executablePath, 'The path to WebStorm is not valid ' + executablePath +
    'you can assign a custom one with `ideTemplate.webStorm.customExecutable = <path to webstorm>`');
  }

  return isValid;
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
  var destination = userPreferencesDirectory('fileTemplates');
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
    JsKarmaPackageDirSetting: undefined,
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
    projectView             : undefined,
    libraries               : [],
    vcs                     : [],
    jsDebugConfiguration    : [],
    karmaDebugConfiguration : [],
    nodejsDebugConfiguration: []
  };
  if(override.projectView) {
    override.projectView = writeProjectViewTemplate(override.projectView);
  }

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
WebStorm.prototype.copyCodeStyle = function (codeStyleFile, styleName, projectLocation) {
  if (!fs.existsSync(codeStyleFile)) {
    console.error('WebStorm.copyCodeStyle() the provided path for the codestyle xml does not exist at', codeStyleFile);
  }
  if (!fs.existsSync(projectLocation)) {
    console.error('WebStorm.copyCodeStyle() the provided projectLocation does not exist at', projectLocation);
  }

  // copy the actual code stlye configuration to the user preferences folder
  var basename = path.basename(codeStyleFile);
  var codeStyleDestination = path.join(userPreferencesDirectory('codestyles'), basename);
  io.copyFileSync(codeStyleFile, codeStyleDestination);

  // The .idea project requires a codeStyleSettings.xml with the default code style name
  var codeStyleTemplateName = 'codeStyleSettings.xml';
  var codeStyleSettingsSource = path.join(String(__dirname), 'template', codeStyleTemplateName);
  var codeStyleSettingsDestination = path.join(projectLocation, '.idea', codeStyleTemplateName);
  io.writeTemplateFileSync(codeStyleSettingsSource, {codeStyleName: styleName}, codeStyleSettingsDestination);
};

/**
 * Method for copying the WebStorm external tools configuration to the local
 * user preferences folders.
 *
 * @see http://www.jetbrains.com/webstorm/webhelp/external-tools.html
 */
WebStorm.prototype.copyExternalTools = function (source) {
  var destination = userPreferencesDirectory('tools');
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

  var toolsPath = userPreferencesDirectory('tools');
  io.validateDirectorySync(toolsPath);
  var destination = path.join(toolsPath, fileName);

  fs.writeFileSync(destination, content, 'utf8');
};

/**
 * When generating the .idea project WebStorm will remove any plain text files specified
 * on first open if they do not exist.
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
 * The user preferences directory for WebStorm on the current platform.
 * https://www.jetbrains.com/webstorm/help/project-and-ide-settings.html
 * @returns {string} an absolute path to the .Webstorm xxx preferences folder.
 */
function userPreferencesDirectory(configDirectory) {
  var home = platform.userHomeDirectory();
  var webStormPreferences = io.maximisePath(home, /^\.WebStorm\s*[.\d]+$/, 'config') ||   // windows|unix
    io.maximisePath(home, 'Library', 'Preferences', /^WebStorm\s*[.\d]+$/);               // darwin

  // If the config directory does not previously exist, create it.
  // Eg the tools directory wont exist unless External Tools were previously used.
  if(webStormPreferences) {
    webStormPreferences = path.join(webStormPreferences, configDirectory);
    if(!fs.existsSync(webStormPreferences)) {
      fs.mkdirSync(webStormPreferences);
    }
  }

  return webStormPreferences;
}

/**
 * Utility to write the ProjectView node require for project pane default in the .idea/workspace.xml.
 * @param rootPath (the name of the project root so tree node will be open in the project)
 * @returns {string}
 */
function writeProjectViewTemplate(rootPath) {
  var context = {
    rootPath: rootPath
  };

  var templateSource = path.join(String(__dirname), 'template', 'projectView.xml');
  var toolTemplate = fs.readFileSync(templateSource);
  return io.templateSync (toolTemplate, context);
}
/**
 * Check if a Webstorm.exe exists in the default install location for windows.
 * @return {boolean} A true concatenated path where found, else false.
 */
function resolveWindowsExe() {
  var jetbrainsDirectory = io.reduceDirectories('C:/Program Files/JetBrains', 'C:/Program Files (x86)/JetBrains');
  return resolveJetbrainsExe(jetbrainsDirectory);
}

/**
 * Check if a Webstorm.exe exists in a given windows program files directory.
 * @param {string} Jetbrains install directory eg, C:/Program Files/JetBrains.
 * @returns {string|boolean} A true concatenated path where found, else false.
 */
function resolveJetbrainsExe(jetbrainsDirectory) {
  var exists = false;
  var webstormInstallPaths = io.resolveDirMatches(jetbrainsDirectory, /^WebStorm\s*[.\d]+$/);

  // Check that the Webstorm folder have a bin folder, empty folders are a known issue.
  for (var j = 0; j < webstormInstallPaths.length; j++) {
    var webstormPath = [jetbrainsDirectory, webstormInstallPaths[j], 'bin'];
    var resolvedWebstorm = resolveMaxedPath(webstormPath);
    if(resolvedWebstorm === null) break;

    exists = path.resolve(resolvedWebstorm.join(path.sep), 'Webstorm.exe');
    if(fs.existsSync(exists)) {
      return exists;
    }
  }

  return exists;
}

function resolveMaxedPath(elements) {
  for (var i = 1; i < elements.length; i++) {
    // the directory is elements 0 .. i-1 joined
    var directory = path.resolve(path.join.apply(path, elements.slice(0, i)));

    // no directory implies failure
    if (!fs.existsSync(directory)) {
      return null;
    }
    // anything else is cast to string
    else {
      elements[i] = String(elements[i]);
    }
  }

  return elements;
}


