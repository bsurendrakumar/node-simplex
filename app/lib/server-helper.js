/* global __CONFIG__ */
'use strict';

var bodyParser = require('body-parser');
var util = require('util');
var __ = require('underscore');
var fs = require('fs');
var path = require('path');
var compression = require('compression');;
var async = require('async');

var loadCustomApi = require(__CONFIG__.app_code_path + 'api.js');
var appStatus = require(__CONFIG__.app_base_path + 'lib/status');
var AppError = require(__CONFIG__.app_base_path + 'lib/app-error');
var getStatus = require(__CONFIG__.app_base_path + 'lib/status');
var Controller = require(__CONFIG__.app_base_path + 'lib/controller');

var internalExclusionApi = ['public_html'];
internalExclusionApi.concat(__CONFIG__.excludedControllers);
var cntrlOutput = '';

var serverHelper = function() {
  var app = null;
  var validMethodTypes = ['get', 'post', 'delete', 'put'];

  // The initialization method.
  // Binds a wrapper around the express app variable.
  var init = function(baseApp) {
    app = baseApp;
    app.httpPost = function(routeObj) {
      routeObj.method = 'post';
      bindRequest(routeObj);
    };

    app.httpGet = function(routeObj) {
      routeObj.method = 'get';
      bindRequest(routeObj);
    };

    app.httpDelete = function(routeObj) {
      routeObj.method = 'delete';
      bindRequest(routeObj);
    };

    app.httpPut = function(routeObj) {
      routeObj.method = 'put';
      bindRequest(routeObj);
    };
  };

  var bindRequest = function(routeObj) {
    routeObj.url = normalizeUrl(routeObj.url);
    routeObj.method = routeObj.method.toLowerCase();
    if (routeObj.isAdmin) {
      routeObj.isPublic = false;
    }
    routeObj = __.extend(getDefaultRouteObj(), routeObj);

    if (routeObj.enableCompression === false) {
      routeObj.enableCompression = false;
    } else {
      routeObj.enableCompression = true;
    }

    var modifiedRoute = function(request, response, next) {
      if (routeObj.route) {
        routeObj.route(request, response, next);
      }
    };

    if (validMethodTypes.indexOf(routeObj.method) !== -1) {
      routeObj.url = getFinalUrl(routeObj.url, routeObj.isPublic);
      routeObj.modifiedRoute = modifiedRoute;
      bindHttpRequest(routeObj);
    } else {
      console.log('Invalid method type for - ' + routeObj.url);
    }
  };

  var jsonParser = bodyParser.json();

  var loadRoutes = function(app) {
    // get all the folder names
    var files = fs.readdirSync(__CONFIG__.app_code_path);
    if (!files) {
      console.log('There was an error while reading the folders inside the \'code\' directory.');
      process.exit(1);
    }

    // We don't really care about speed, so doing a sync execution
    var statObj = null;
    var controllerName = '';
    var allControllers = [];
    for (var i = 0; i < files.length; ++i) {
      statObj = fs.statSync(__CONFIG__.app_code_path + files[i]);

      if (statObj && statObj.isDirectory() && isValidControllerFolder(files[i])) {
        controllerName = getControllerNameByFolder(files[i]);
        var controllerFileName = __CONFIG__.app_code_path + files[i] + '/' + controllerName;
        if (fs.existsSync(controllerFileName)) {
          allControllers.push(controllerFileName);
        }
      }
    }
    var loadedControllersObj;
    loadedControllersObj = [];

    for (i = 0; i < allControllers.length; ++i) {
      cntrlOutput += '\n\n';
      var cntrlObj = require(allControllers[i]);
      if (cntrlObj) {
        loadedControllersObj.push(cntrlObj);
        cntrlOutput += 'Controller Name |' + path.basename(allControllers[i] + '\n');
        new loadedControllersObj[loadedControllersObj.length - 1](app);
        cntrlOutput += '\n';
        continue;
      }
      cntrlOutput += 'Error while loading controller - ' + path.basename(allControllers[i]);
      cntrlOutput += '\n';
    }
    cntrlOutput += '\nDone.\n';
    cntrlOutput += '\n';
    loadedControllersObj.length = 0;
  };
  
  /**
   * Common method to bind different type of requests to the express app
   */
  
  var bindHttpRequest = function(routeObj) {
    handleDataParsing(routeObj);
    app[routeObj.method](routeObj.url, routeObj.modifiedRoute);
  };

  // Normalizes the URL passed, removes trailing slashes.
  var normalizeUrl = function(url) {
    if (url.indexOf('/') === 0 || url.lastIndexOf('/') === url.length - 1) {
      return url.replace(/^\/|\/$/g, '');
    }
    return url;
  };

  // Returns the final URL based on the config value
  var getFinalUrl = function(url) {
    return __CONFIG__.app_base_url + url;
  };

  // Not found handler.
  var notFound = function(request, response) {
    if (typeof loadCustomApi.notFound === 'function') {
      loadCustomApi.notFound(request, response);
    } else {
      response.status(appStatus('notFound')).json({
        'status': 'fail',
        'data': 'The requested url "' + request.originalUrl + '" is not supported by this service.'
      });
    }
  };

  var isValidControllerFolder = function(folderName) {
    if (!folderName || internalExclusionApi.indexOf(folderName) !== -1) {
      return false;
    }
    return true;
  };

  var getControllerNameByFolder = function(folderName) {
    var modifiedFolderName = [folderName[0].toUpperCase()];
    var nextCharIsAfterUnderscore = false;
    for (var i = 1; i < folderName.length; ++i) {
      if (folderName[i] === '_') {
        nextCharIsAfterUnderscore = true;
        continue;
      }
      if (nextCharIsAfterUnderscore) {
        modifiedFolderName.push(folderName[i].toUpperCase());
        nextCharIsAfterUnderscore = false;
      } else {
        modifiedFolderName.push(folderName[i]);
      }
    }
    return modifiedFolderName.join('') + 'Controller.js';
  };

  function getDefaultRouteObj() {
    var routeObj = {
      isAdmin: false,
      isPublic: false,
      enableCompression: true
    };
    return routeObj;
  }

  function handleDataParsing(routeObj) {
      app[routeObj.method](routeObj.url, jsonParser);
      app[routeObj.method](routeObj.url, checkJsonParsing);
  }

  function checkJsonParsing(err, req, res, next) {
    if (err) {
      res.set('Connection', 'close');
      res.status(getStatus('badRequest')).json({
        status: 'fail',
        message: 'JSON sent is invalid.'
      });
    } else {
      next();
    }
  }

  return {
    init: init,
    notFound: notFound,
    loadRoutes: loadRoutes
  };
  
};

module.exports = serverHelper();
