/**
 * Jetbrains Webstorm 8 project generation.
 *
 * @type {ideTemplate|exports}
 */
var util = require('util'),
IDE = require('../IDE'),
gutil = require('gulp-util'),
fs = require('fs'),
argv = require('yargs').argv,
_ = require('lodash'),
templateUtil = require('../../index'),
path = require('path');

require('shelljs/global');

function WebStorm() {
    WebStorm.super_.apply(this, ['webstorm']);

    // we loose scope of this require in this closure?
    this.templateUtil = require('../../index');

    if (this.templateUtil.platform === ('unix' || 'darwin')) {
        this.executable = 'wstorm';
    } else {
        //  todo in windows check if this webstorm.exe exists otherwise prompt for a path and save it to disk}
        var webstormPath = path.resolve('/', 'Program Files (x86)/JetBrains/WebStorm 8.0.1/bin/WebStorm.exe');

        this.executable = '"' + webstormPath + '"';

        if (!this.templateUtil.fileExists(this.executable))
            console.error('Error the WebStorm.exe is not present at', this.executable);
    }
}

util.inherits(WebStorm, IDE);

WebStorm.prototype.open = function (location)
{
    if (!this.validatePath(location)) return;
    if(argv.noopen) return;

    this.templateSource = path.join(this.templateSource, 'project');

    if (this.templateUtil.platform === ('unix' || 'darwin'))
        exec(this.executable + ' "' + location + '"');
    else
        exec(this.executable + ' "' + location + '"');

    gutil.log('Please give WebStorm a chance to complete it\'s indexing before opening.');
};

/**
 * Create a new template context for an idea project.
 * if a custom context is provided it will override any default values of the resulting object.
 *
 *
 vcs          : [
 {
     type: 'git',
     path: 'file://$MODULE_DIR$'
 },
 ],
 jsDebugConfiguration:[
 {
     name: 'test0',
     indexPath: 'index.html'
 }
 ]
 *
 * @param custom
 * @returns {Result|Object}
 */
WebStorm.prototype.createContext = function (custom)
{
    var defaultContext = {
        projectName         : 'NewProject',
        jshintPath          : './.jshintrc',
        jsDebugPort         : '63343',
        projectFolder       : '',
        selectedDebugName : '',
        contentPaths        : [
            {
                content : 'file://$MODULE_DIR$',
                excluded: []
            }
        ],
        libraries           : [],
        vcs                 : [],
        jsDebugConfiguration: [],
        nodejsDebugConfiguration: []
    };

    return _.merge(defaultContext, custom);
};

/**
 * Shortcut to create a project context
 * @param projectName
 * @param contentPaths
 * @param jsDebugPort
 * @param jshintPath
 */
WebStorm.prototype.createProjectContext = function (projectName, contentPaths, jsDebugPort, jshintPath)
{
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
WebStorm.prototype.createProject = function (destination, context)
{
    context = this.createContext(context);

    var source = path.join(__dirname, this.templateSource, 'project');
    destination = path.join(destination, '.idea');

    this.templateUtil.templateDirSync(source, destination, context);
};

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
WebStorm.prototype.userPreferences = function ()
{
    var location;

    if (templateUtil.platform === 'windows')
        location = path.join(templateUtil.HOME, '.WebStorm8', 'config');
    else
        location = path.join(templateUtil.HOME, 'Library', 'Preferences', 'WebStorm8');

    return location;
};

WebStorm.prototype.copyExternalTools = function ()
{
    var destination = path.join(this.userPreferences(), 'tools');
    var source = path.join(this.templateSource, 'idea', 'tools', '**', '*.*');

    templateUtil.cpRConflict(source, destination);
};

WebStorm.prototype.copyFileTemplates = function ()
{
    var destination = path.join(this.userPreferences(), 'fileTemplates');
    var source = path.join(this.templateSource, 'idea', 'fileTemplates', '**', '*.*');

    templateUtil.cpRConflict(source, destination);
};

module.exports = WebStorm;