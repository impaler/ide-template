var gulp     = require('gulp'),
    fs       = require('fs'),
    _        = require('lodash'),
    WebStorm = require('./ide/webstorm/webstorm'),
    conflict = require('gulp-conflict');

require('shelljs/global');

var ideTemplate = {};

ideTemplate.platform = (process.platform == 'win32' || process.platform == 'win64') ? 'windows' : 'unix';
ideTemplate.platform == 'windows' ?
    ideTemplate.HOME = process.env['USERPROFILE'] :
    ideTemplate.HOME = process.env['HOME'];

ideTemplate.ide = require('./ide/IDE');
ideTemplate.webstorm = WebStorm;

/**
 * Recursivley copy a folder to a given destination, if there are conflicts prompt the user.
 * @param source
 * @param destination
 */
ideTemplate.cpRConflict = function (source, destination)
{
    gulp.src(source)
        .pipe(conflict(destination))
        .pipe(gulp.dest(destination));
};

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
ideTemplate.templateDirSync = function (source, destination, context, opts) {
    if (!opts) opts = {force: true};
    ideTemplate.mkdirP(destination);

    var files = fs.readdirSync(source);

    for (var i = 0; i < files.length; i++) {
        var sourceFile = source + "/" + files[i];
        var destinationFile = destination + "/" + files[i];

        if (ideTemplate.isDirectory(sourceFile))
            ideTemplate.templateDirSync(sourceFile, destinationFile, context, opts);
        else {
            if (fs.existsSync(destinationFile) && !opts.force)
                console.log('skipping existing file: ' + files[i]);
            else
                ideTemplate.templateFileSync(sourceFile, destinationFile, context);
        }
    }
};

ideTemplate.templateFileSync = function (source, destination, context)
{
    // To avoid issues with windows use a custom delimiter for file names
    if (destination.indexOf('{{-') !== -1) {
        _.templateSettings.escape = /\{\{-(.*?)\}\}/g;
        destination = _.template(destination, context);
    }

    var content = fs.readFileSync(source, 'utf8').toString();

    var indexContent = _.template(content, context);

    fs.writeFileSync(destination, indexContent, 'utf8');
};

ideTemplate.mkdirP = function (destination)
{
    if (!fs.existsSync(destination))
        mkdir('-p', destination);
};

ideTemplate.cpR = function (source, destination)
{
    if (!fs.existsSync(destination))
        mkdir('-p', destination);

    cp('-R', source, destination);
};

ideTemplate.cp = function (source, destination)
{
    if (!fs.existsSync(destination))
        mkdir('-p', destination);

    cp(source, destination);
};

ideTemplate.isDirectory = function (source)
{
    if (!fs.existsSync(source))
        return false;
    return fs.statSync(source).isDirectory();
};

module.exports = ideTemplate;