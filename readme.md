## IDE Template

Programatically create ide projects from configuration objects.

Supercharge shared your project scaffolding and workflow with dynamic ide configurations.
Also includes ability to open the ide programatically from your scaffolding tools.

Currently WebStorm support is provided.

Example of a project with common WebStorm configurations such as resourceRoots, libraries and
Javascript Run Configuration.

```
var webStorm = require('ide-template').webStorm;
var path = require('path');

var projectName = 'awesome';
var serverPort = 3233;
var destination = path.join(process.cwd(), projectName);

var projectContext = {
    projectName         : projectName,
    libraries           : ['jasmine-DefinitelyTyped', 'angular'],
    resourceRoots       : [
      'file://$PROJECT_DIR$/src/app',
      'file://$PROJECT_DIR$/src/target'
    ],
    jsDebugConfiguration: [
      {
        name   : project.projectName,
        uri    : 'http://localhost:' + serverPort + '/app',
        mapping: {
          url      : 'http://localhost:' + serverPort,
          localFile: '$PROJECT_DIR$'
        }
      }
    ]
}

webStorm.createProject(destination, projectContext);
webStorm.open(destination);
```