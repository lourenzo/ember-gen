var exec = require('child_process').exec;
var fs = require('fs');
var handlebars = require('handlebars');
var jsdom = require('jsdom');
var message = require('../util/message');
var UglifyJS = require("uglify-js");
var appDirs = require('../util/appDirs');
var template = require('../util/template');
var inflector = require('../util/inflector');
var walk = require('walk').walkSync;
var precompile = require('../util/precompile');
var parseBuildCommand = require('../util/parseBuildCommand');
var root;

module.exports = function(program) {
  root = require('../util/config')().appDir;

  env = parseBuildCommand([].slice.call(arguments, 0));

  isMinify = env['args'][0].minify

  precompile(rootify('templates'), rootify('templates.js'), function() {
    createIndex().then(build);
  });
};

function createIndex() {
  var modules = [];
  appDirs.forEach(function(dirName) {
    if (dirName == 'templates') return;
    var dirPath = rootify(dirName);
    var walker = walk(dirPath);
    walker.on('file', function(dir, stats, next) {
      if (stats.name.charAt(0) !== '.') {
        var path = unroot(dir + '/' + stats.name).replace(/\.js$/, '');
        var name = inflector.objectify(path.replace(dirName, ''));
        modules.push({
          objectName: name,
          path: path
        });
      }
      next();
    });
  });

  return template.write(
    'build/index.js',
    rootify('index.js'),
    {modules: modules},
    true
  );
}

function build() {
  var command = __dirname + '/../../node_modules/browserbuild/bin/browserbuild ' +
                "-m index -b " + root + "/ `find "+ root + " -name '*.js'` > " +
                rootify('javascripts/application.js');
                
  exec(command, function (error, stdout, stderr) {
    if(stdout) console.log(stdout);
    if(stderr) console.log(stderr);
    if (error) throw new Error(error);

    if(isMinify){
      message.notify("-> Minify: remove and create application.min.js");
      message.removeFile("javascripts/application.min.js");
      fs.unlink(rootify('javascripts/application.min.js'), function (error) {
        // if (error) throw error;
        minify = UglifyJS.minify(rootify('javascripts/application.js')).code;
        fs.writeFile(rootify('javascripts/application.min.js'), minify, function (error) {
          if (error) throw new Error(error);
          message.fileCreated("javascripts/application.js");
        });
      });
    }
    cleanup();
  });
}

function cleanup() {
  // fs.unlink(rootify('index.js'));
  // fs.unlink(rootify('templates.js'));
}

function rootify(path) {
  return root + '/' + path;
}

function unroot(path) {
  return path.replace(root + '/', '');
}
