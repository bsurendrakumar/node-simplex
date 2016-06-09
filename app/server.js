// NodeJS includes
'use strict';

var cluster = require('cluster');
var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');

// Osm Includes
var config = require('./config');
var logger = require('./logger');
var helper = require('./lib/server-helper');
var cleanUp = require('./lib/clean-up');

var app = express();

helper.init(app);

// Count the machine's CPUs
var cpuCount = require('os').cpus().length;
var httpServer = null;

// The master process - will only be used when on PROD
if (config.express.isProduction && cluster.isMaster && !__CONFIG__.isClusterDisabled) {

  // Create a worker for each CPU
  for (var i = 0; i < cpuCount; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', function () {
    cluster.fork();
  });

} else {

  // Bind the api routes.
  helper.loadRoutes(app);

  // 404 error
  app.use('/api', helper.notFound);

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