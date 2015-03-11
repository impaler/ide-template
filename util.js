/* globals mkdir, cp */
'use strict';

var gulp     = require('gulp'),
    fs       = require('fs'),
    _        = require('lodash'),
    path     = require('path'),
    conflict = require('gulp-conflict');

function Util() {

  return {

    /**
     * Determine the current platform based on the nodejs process property.
     * @type {string}
     */
    platform: (process.platform === 'win32' || process.platform === 'win64') ? 'windows' : 'unix',

    /**
     * Based on the current platform return the current user's HOME directory or User Documents directory.
     * @returns {*}
     * @constructor
     */
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
     * and {{= token }} for filename delimiters (windows restriction).
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

    /**
     * Copy a and apply a lodash template to a file based on a given context.
     * The filename can include a {{= token }} for template delimiters (windows restriction).
     * @param source
     * @param destination
     * @param context
     */
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

    /**
     * Shortcut creating a folder recursively in any given destination,
     * if the destination already exists, it will do nothing.
     * @param destination
     */
    mkdirP: function (destination)
    {
      if (!fs.existsSync(destination))
        mkdir('-p', destination);
    },

    /**
     * Shortcut for copying a folder and it's contents recursively to a given destination,
     * if the source does not exist, it will do nothing.
     * @param source
     * @param destination
     */
    cpR: function (source, destination)
    {
      if (!fs.existsSync(destination))
        mkdir('-p', destination);

      cp('-R', source, destination);
    },

    /**
     * Shortcut for copying a file to a given destination,
     * if the source does not exist, it will do nothing.
     * @param source
     * @param destination
     */
    cp: function (source, destination)
    {
      if (!fs.existsSync(destination))
        mkdir('-p', destination);

      cp(source, destination);
    },

    /**
     * Lazy check if a given source path is a directory that exists.
     * @param source
     * @returns {*}
     */
    isDirectory: function (source)
    {
      if (!fs.existsSync(source))
        return false;

      return fs.statSync(source).isDirectory();
    },

    /**
     * Lazy check to see if a given file exists.
     * @param source
     * @returns {boolean}
     */
    fileExists: function (source)
    {
      try {
        fs.statSync(source);
      } catch (err) {
        if (err.code === 'ENOENT') return false;
      }
      return true;
    }
  };
}

module.exports = new Util();