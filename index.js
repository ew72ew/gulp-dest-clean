/*jslint node:true, white:true */
'use strict';

var path = require('path')
, through = require('through2')
, chalk = require('chalk')
, objectAssign = require('object-assign')
, PluginError = require('gulp-util').PluginError
, del = require('del')
;

module.exports = function (destPath, exclude, exclOpts) {
  var parentsToExclude = {}
  , srcPath
  , PLUGIN_NAME = "gulp-dest-clean"
  , win32 = process.platform === "win32"
  , verbose
  ;

  exclOpts = objectAssign({}, exclOpts);

  verbose = exclOpts.verbose;
  delete exclOpts.verbose;

  if(!destPath || typeof destPath !== "string") {
    return through.obj(function (file, enc, cb) { cb(null, file); }, function(cb){
      console.log(chalk.bold.red(PLUGIN_NAME) + ": " + chalk.blue("destPath") + ' parameter required!');
      this.emit('error', new PluginError(PLUGIN_NAME,'"destPath" parameter required!'));
      cb();
    });
  }

  srcPath = destPath;
  destPath = srcPath.replace(/\/?[\x00-.0-\uffff]*\*[\d\D]*/, ""); //  "[\d\D]" = ".",  "[\x00-.0-\uffff]" = "[^\/]"
  if(srcPath !== destPath){
    return through.obj(function (file, enc, cb) { cb(null, file); }, function(cb){
      console.log(chalk.bold.red(PLUGIN_NAME) + ": " + chalk.blue("destPath") + ' parameter must not contain ' + chalk.red("*") + '!');
      this.emit('error', new PluginError(PLUGIN_NAME, '"destPath" parameter must not contain "*"!'));
      cb();
    });
  }
  srcPath = path.join(srcPath, "/**");

  function excludeParents(file){
    var parent = path.dirname(file);
    while(!parentsToExclude[parent]){
      parentsToExclude[parent] = 1;
      parent = path.dirname(parent);
    }
  }

  if(typeof exclude === "string") {
    exclude = [exclude];
  }
  if(!Array.isArray(exclude)){
    exclude = [];
  }

  exclude = exclude.map(function(v){
    if(v.slice(0, 1) === "!") {
      return path.join(destPath, v.slice(1));
    }

    excludeParents(v);
    return "!" + path.join(destPath, v);
  });

  exclude = [].concat(srcPath, exclude);

  return through.obj(function (file, enc, cb) {
    var p = file.relative;

    p = win32 ? p.replace(/\\/g, "/") : p;

    excludeParents(p);

    exclude.push("!" + path.join(destPath, p));

    cb(0, file);

  }, function (cb){
    Object.keys(parentsToExclude).forEach(function(dir){
      exclude.push("!" + path.join(destPath, dir));
    });

    if (verbose) {
      console.log(chalk.cyan(PLUGIN_NAME) + ": patterns for `del`:", "\n" + exclude.join("\n"));
    }

    del(exclude, exclOpts).then(function(deleted){

      if (verbose) {
        if(deleted.length) {
          console.log(chalk.cyan(PLUGIN_NAME) + ": deleted:", "\n" + deleted.join("\n"));
        } else {
          console.log(chalk.cyan(PLUGIN_NAME) + ": nothing to delete");
        }
      }

      cb();
    });
  });

};
