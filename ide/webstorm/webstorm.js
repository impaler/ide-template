(function () {
    'use strict';
    /* globals console, exec, mkdir, __dirname */

    /**
     * Jetbrains WebStorm 9 project generation.
     *
     * @type {ideTemplate|exports}
     */
    var util = require('util'),
    IDE = require('../IDE'),
    fs = require('fs'),
    path = require('path'),
    _ = require('lodash');

    require('shelljs/global');

    var templateUtil;

    function WebStorm(ide) {

        WebStorm.super_.apply(this, ['webstorm']);

        templateUtil = ide;

        if (templateUtil.platform === ('unix' || 'darwin')) {
            this.executable = 'wstorm';
        } else {
            // todo in windows check if webstorm.exe exists otherwise prompt for a path and save it to disk}
            var webStormPath = path.resolve('/', 'Program Files (x86)/JetBrains/WebStorm 8.0.1/bin/WebStorm.exe');

            this.executable = '"' + webStormPath + '"';

            if (!templateUtil.fileExists(this.executable))
                console.error('Error the WebStorm.exe is not present at', this.executable);
        }
    }

    util.inherits(WebStorm, IDE);

    /**
     * Use the WebStorm executable to open a project programatically.
     *
     * @param location
     */
    WebStorm.prototype.open = function (location)
    {
        if (!this.validatePath(location)) return;

        var openCommand = this.executable + ' "' + location + '"';
        console.log(openCommand);

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
     * Example template context
     {
            projectName         : project.projectName,
            jshintPath          : '$PROJECT_DIR$/.jshintrc',
            jsDebugPort         : 9000,
            contentPaths        : [
                {
                    content: 'file://' + project.destination
                }
            ],
            libraries           : ['jasmine-DefinitelyTyped', 'angular'],
            selectedDebugName   : 'JavaScript Debug.' + project.projectName,
            jsDebugConfiguration: [
                {
                    name     : project.projectName,
                    uri: 'http://localhost:8000/app',
                    mapping  : {
                        url      : 'http://localhost:8000',
                        localFile: '$PROJECT_DIR$'
                    }
                }
            ],
            plainText           : [
                'file://$PROJECT_DIR$/build/app/main.js'
            ],
            resourceRoots       : [
                'file://$PROJECT_DIR$/src/js-lib'
            ],
            projectPane: fs.readFileSync(__dirname + '/projectPane.xml')
        };
     *
     * @param override
     * @returns {Result|Object}
     */
    WebStorm.prototype.createContext = function (override)
    {
        var defaultContext = {
            projectName             : 'NewProject',
            jshintPath              : './.jshintrc',
            jsDebugPort             : '63343',
            projectFolder           : '',
            selectedDebugName       : '',
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

        return _.merge(defaultContext, override);
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

        var source = path.join(String(__dirname), 'template', 'project');
        destination = path.join(destination, '.idea');

        templateUtil.templateDirSync(source, destination, context);

        if (context.resourceRoots.length > 0)
            stubPlainTextFiles(context.plainText, destination);
    };

    /**
     * WebStorm will remove any plain text files specified on first open
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
    WebStorm.prototype.userPreferences = function ()
    {
        var location;

        if (templateUtil.platform === 'windows')
            location = path.join(templateUtil.HOME, '.WebStorm9', 'config');
        else
            location = path.join(templateUtil.HOME, 'Library', 'Preferences', 'WebStorm9');

        return location;
    };

    /**
     * Method for copying the WebStorm external tools configuration to the local
     * user preferences folders.
     *
     * http://www.jetbrains.com/webstorm/webhelp/external-tools.html
     *
     */
    WebStorm.prototype.copyExternalTools = function ()
    {
        var destination = path.join(this.userPreferences(), 'tools');
        var source = path.join(this.templateSource, 'idea', 'tools', '**', '*.*');

        templateUtil.cpRConflict(source, destination);
    };

    /**
     * Method for copying WebStorm file template configurations to the local
     * user preferences folders.
     *
     * http://www.jetbrains.com/webstorm/webhelp/file-and-code-templates.html
     *
     */
    WebStorm.prototype.copyFileTemplates = function ()
    {
        var destination = path.join(this.userPreferences(), 'fileTemplates');
        var source = path.join(this.templateSource, 'idea', 'fileTemplates', '**', '*.*');

        templateUtil.cpRConflict(source, destination);
    };

    module.exports = WebStorm;
}());
