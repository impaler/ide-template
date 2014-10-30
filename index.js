/* jshint -W097 */
/* globals console, cp, mkdir, process */
(function () {
    'use strict';

    var gulp = require('gulp'),
        fs = require('fs'),
        _ = require('lodash'),
        path = require('path'),
        WebStorm = require('./ide/webstorm/webstorm'),
        conflict = require('gulp-conflict');

    require('shelljs/global');

    function IDETemplate() {

        var platform = (process.platform === 'win32' || process.platform === 'win64') ? 'windows' : 'unix';

        return {

            platform: platform,

            HOME: function () {
                if (this.platform === 'windows')
                    return process.env.USERPROFILE;
                else
                    return process.env.HOME;
            },

            /**
             * Recursivley copy a folder to a given destination, if there are conflicts prompt the user.
             * @param source
             * @param destination
             */
            cpRConflict: function (source, destination)
            {
                gulp.src(source)
                    .pipe(conflict(destination))
                    .pipe(gulp.dest(destination));
            },

            /**
             * Recursively copy a template folder to a given destination and
             * apply a template context object for using <%= token %> delimiters
             * and {{= token }} for filename delimiters (windows restri).
             *
             * @param source
             * @param destination
             * @param context
             * @param opts
             */
            templateDirSync: function (source, destination, context, opts)
            {
                if (!opts) opts = {force: true};
                this.mkdirP(destination);

                var files = fs.readdirSync(source);

                for (var i = 0; i < files.length; i++) {
                    var sourceFile = path.join(source, files[i]);
                    var destinationFile = path.join(destination, files[i]);

                    if (this.isDirectory(sourceFile)) {
                        this.templateDirSync(sourceFile, destinationFile, context, opts);
                    } else {
                        if (fs.existsSync(destinationFile) && !opts.force) {
                            console.log('skipping existing file: ' + files[i]);
                        } else {
                            this.templateFileSync(sourceFile, destinationFile, context);
                        }
                    }
                }
            },

            templateFileSync: function (source, destination, context)
            {
                // To avoid issues with windows use a custom delimiter for file names
                if (destination.indexOf('{{-') !== -1) {
                    _.templateSettings.escape = /\{\{-(.*?)\}\}/g;
                    destination = _.template(destination, context);
                }

                var content = fs.readFileSync(source, 'utf8').toString();

                var indexContent = _.template(content, context);

                fs.writeFileSync(destination, indexContent, 'utf8');
            },

            mkdirP: function (destination)
            {
                if (!fs.existsSync(destination))
                    mkdir('-p', destination);
            },

            cpR: function (source, destination)
            {
                if (!fs.existsSync(destination))
                    mkdir('-p', destination);

                cp('-R', source, destination);
            },

            cp: function (source, destination)
            {
                if (!fs.existsSync(destination))
                    mkdir('-p', destination);

                cp(source, destination);
            },

            isDirectory: function (source)
            {
                if (!fs.existsSync(source))
                    return false;

                return fs.statSync(source).isDirectory();
            },

            fileExists: function (filePath) {
                try {
                    fs.statSync(filePath);
                } catch (err) {
                    if (err.code === 'ENOENT') return false;
                }
                return true;
            }
        };
    }

    var ideTemplate = new IDETemplate();
    ideTemplate.webStorm = new WebStorm(ideTemplate);

    module.exports = ideTemplate;
}());