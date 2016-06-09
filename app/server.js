// NodeJS includes
'use strict';

var cluster = require('cluster');
var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');
var process = require('process');

// Osm Includes
var config = require('./config');
var logger = require('./logger');
var cleanUp = require('./lib/clean-up');

var app = express();
var Country = require(__dirname + '/code/country/Country');

// Count the machine's CPUs
var cpuCount = require('os').cpus().length;
var httpServer = null;

// The master process - will only be used when on PROD
if (config.express.isProduction && cluster.isMaster && !__CONFIG__.isClusterDisabled) {
  console.log('------------------------------------');
  console.log('Master Process ID:', process.pid);
  console.log('------------------------------------\n\n');

  // Create a worker for each CPU
  for (var i = 0; i < cpuCount; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', function () {
    cluster.fork();
  });

} else {
  console.log('Child Process ID:', process.pid);
  console.log('------------------------------------');

  // Bind the api routes.
  app.get('/api/v1/country/list', function(req, res) {
    var objCountry = new Country(null, null);
    objCountry.getCountries(function(err, data) {
      if(data.length === 0) {
        // empty..
      }
      res.send('Pew Pew');
    });
  });

  httpServer = http.createServer(app).listen(config.express.port, config.express.ip, function (error) {
    if (error) {
      logger.logAppErrors(error);
      process.exit(10);
    }
    logger.logAppInfo('Express is listening on http://' + config.express.ip + ':' + config.express.port);
  });
}

process.on('uncaughtException', function (err) {
  try {
    // Stop the HTTP Server
    if(httpServer) {
      httpServer.close();
    }
    // Call the cleanup function
    cleanUp(function() {
      // Exit!!
      console.log('Cleanup done!!');
      logger.logUncaughtError(err);
      logger.closeAll();
      restartProcess();
    });
  } catch (e) {
    console.log(e);
    restartProcess();
  }

  function restartProcess() {
    process.exit(1);
  }
});