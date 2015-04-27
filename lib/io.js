var fs   = require('fs'),
    _   = require('lodash'),
    path = require('path');

module.exports = {
  writeTemplateFileSync : writeTemplateFileSync,
  templateSync          : templateSync,
  copyFileSync          : copyFileSync,
  copyFilesMatchSync    : copyFilesMatchSync,
  replaceMatchFilesSync : replaceMatchFilesSync,
  unlinkFilesMatchSync  : unlinkFilesMatchSync,
  existsDirectorySync   : existsDirectorySync,
  existsFileSync        : existsFileSync,
  validateDirectorySync : validateDirectorySync,
  validateFileSync      : validateFileSync,
  subdirectoriesWithFile: subDirectoriesWithFile,
  maximisePath          : maximisePath,
  resolveDirMatches     : resolveDirMatches,
  reduceDirectories     : reduceDirectories
};

/**
 * Shortcut to read a template file, apply a context and write it to a new file.
 * //todo refactor template utilities from ../util.js to lib/template.js
 * @param source
 * @param context
 * @param destination
 */
function writeTemplateFileSync(source, context, destination) {
  var templateContent = fs.readFileSync(source, 'utf8');
  var templateResult;
  try {
    templateResult = _.template(templateContent, context);
  } catch(error) {
    console.error('templateFileSync() error with source', source, ' and ', destination);
    console.error(error);
  }
  fs.writeFileSync(destination, templateResult);
}

/**
 * Shortcut to apply a template context and return the result
 * //todo refactor template utilities from ../util.js to lib/template.js
 * @param content
 * @param context
 */
function templateSync(content, context) {
  var templateResult;
  try {
    templateResult = _.template(content, context);
  } catch(error) {
    console.error('templateSync() error with source', content, 'or content', context);
    console.error(error);
  }
  return templateResult;
}

/**
 * Shortcut to copy a file Synchronously
 * @param source
 * @param destination
 */
function copyFileSync(source, destination) {
  if (validateFileSync(source)) {
    fs.writeFileSync(destination, fs.readFileSync(source));
  }
}

/**
 * If there are any files in the source folder that are a match copy them to the destination.
 * @param match
 * @param source
 * @param destination
 */
function copyFilesMatchSync(match, source, destination) {
  fs.readdirSync(source).forEach(function eachTemplate(filename) {
    var sourceFile = path.join(source, filename);
    var destinationFile = path.join(destination, filename);
    if (match.test(path.basename(filename))) {
      fs.writeFileSync(destinationFile, fs.readFileSync(sourceFile));
    }
  });
}

/**
 * Copy any number files that are a match to a regex to a given destination.
 * If there are any files in the destination that are also a match replace them.
 * @param match
 * @param source
 * @param destination
 */
function replaceMatchFilesSync(match, source, destination) {
  unlinkFilesMatchSync(match, destination);
  copyFilesMatchSync(match, source, destination);
}

/**
 * If there are any files in the location folder that are a match remove them.
 * @param match
 * @param location
 */
function unlinkFilesMatchSync(match, location) {
  fs.readdirSync(location).forEach(function eachTemplate(filename) {
    if (match.test(path.basename(filename))) {
      var filePath = path.join(location, filename);
      if (validateFileSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });
}

/**
 * Shortcut to validate the existence of a directory path.
 * @param location
 */
function existsDirectorySync(path) {
  return fs.existsSync(path) && fs.statSync(path).isDirectory();
}

/**
 * Shortcut to validate the existence of a file path.
 * @param location
 */
function existsFileSync(path) {
  return fs.existsSync(path) && fs.statSync(path).isFile();
}

/**
 * Validate if a given path has a valid directory, is it doesn't console.error with an optional custom message.
 * @param path
 * @param errorMessage
 * @returns {Boolean}
 */
function validateDirectorySync(path, errorMessage) {
  errorMessage = errorMessage || 'Error validateDirectorySync() the directory path is not valid ' + path;
  var isValid = existsDirectorySync(path);
  if (!isValid) {
    console.error(errorMessage);
  }
  return isValid;
}

/**
 * Validate if a given path has a valid file, is it doesn't console.error with an optional custom message.
 * @param path
 * @param errorMessage
 * @returns {Boolean}
 */
function validateFileSync(path, errorMessage) {
  errorMessage = errorMessage || 'Error validateFileSync() the file path is not valid ' + path;
  var isValid = existsFileSync(path);
  if (!isValid) {
    console.error(errorMessage);
  }
  return isValid;
}

/**
 * Find all subdirectories of the base, recursively.
 * @param base The base directory to start in
 * @param filename A filename that needs to be found for the path to be added
 * @return all subdirectories of the base, split by path separator
 */
function subDirectoriesWithFile(base, filename) {
  var result = [];
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    if (fs.existsSync(path.join(base, filename))) {
      result.push(base);
    }
    fs.readdirSync(base)
      .forEach(function (subdir) {
        result.push.apply(result, subDirectoriesWithFile(path.join(base, subdir), filename));
      });
  }
  return result;
}

/**
 * Match the path defined by path elements, where some may be RegExp.
 * When there is more than one candidate, prefer the one with greatest interger value.
 * @param {...string|RegExp} elements Any number of path elements
 * @returns {string|boolean} A true concatenated path where found, else false
 */
function maximisePath() {
  // Ensure each element in the path exists,
  // where it is a regex, match it and replace the element with a string
  var elements = Array.prototype.slice.call(arguments);

  for (var i = 1; i < elements.length; i++) {
    // the directory is elements 0 .. i-1 joined
    var directory = path.resolve(path.join.apply(path, elements.slice(0, i)));

    // no directory implies failure
    if (!fs.existsSync(directory)) {
      return null;
    }
    // regex element is matched
    else if ((typeof elements[i] !== 'string') && ('test' in elements[i])) {

      var matches = resolveDirMatches(directory, elements[i]);

      // no match implies failure, else use the item with the highest numeric index
      if (matches.length === 0) {
        return null;
      } else {
        elements[i] = matches[0];
      }
    }
    // anything else is cast to string
    else {
      elements[i] = String(elements[i]);
    }
  }

  // now join them all together
  // do a final check to make sure it exists
  var result = path.resolve(elements.join(path.sep));
  return fs.existsSync(result) && result;
}

/**
 * For a given directory find all files that match, the result will be sorted with highest numeric index first.
 * @param directory
 * @param match
 * @returns {T[]}
 */
function resolveDirMatches(directory, match) {
  if (validateDirectorySync(directory)) {
    return fs.readdirSync(directory)
      .filter(function eachDirectoryItem(item) {
        var resolved = path.resolve(path.join(directory, item));
        return match.test(item) && fs.statSync(resolved).isDirectory();
      })
      .sort(compareHigher);
  } else {
    return [];
  }
}

/**
 * Rank a vs b based on any numeric component in their string.
 */
function compareHigher(a, b) {
  var numA = parseFloat(/[\d\.]+$/.exec(a)[0]);
  var numB = parseFloat(/[\d\.]+$/.exec(b)[0]);
  if (isNaN(numA) || (numB > numA)) {
    return +1;
  } else if (isNaN(numB) || (numA > numB)) {
    return -1;
  } else {
    return 0;
  }
}

/**
 * Pick the first existing directory from any of the given arguments.
 * @param {...string} candidates Any number of possible directories
 * @returns {string} The first valid directory or else undefined
 */
function reduceDirectories() {
  return Array.prototype.slice.call(arguments)
    .map(function (candidate) {
      return path.normalize(candidate);
    })
    .filter(function (candidate) {
      return fs.existsSync(candidate) && fs.statSync(candidate).isDirectory();
    })
    .shift();
}