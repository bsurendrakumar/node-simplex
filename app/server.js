// NodeJS includes
'use strict';

var isDraining = false;
var portNum = 3000;
var ipAddr = '127.0.0.1';

// define the database configuration
var dbConfig = {
  name: 'mysql',
  maxConn: 10,          // Max connections in pool
  minConn: 5,           // Min connections in pool
  idleTimeout: 240000,  // Time after which the conn will be cleared from pool.
  host: '127.0.0.1',    // DB Host
  user: 'root',         // DB User
  password: 'B3stPr@c',      // DB Password
  database: 'dev',            // DB Name
  connectTimeout: 15000,
  multipleStatements: true
};

var cluster = require('cluster');
var http = require('http');
var express = require('express');
var process = require('process');
var poolModule = require('generic-pool');
var mSQLClient = require('mysql');

var app = express();

// Creating the pool of connections
var pool = poolModule.Pool({
  name: 'mysql',
  create: function(callback) {
    var client = mSQLClient.createConnection(dbConfig);
    client.connect(function(err) {
      if(err) {
        callback(err, null);
      }
      callback(null, client);
    });
  },
  destroy: function(client) {
    if(cluster.isMaster) {
      console.log('Destroying / ending master thread ID -', client.threadId);
    }
    if(isDraining) {
      client.destroy();
    } else {
      client.end();
    }
  },
  max: dbConfig.maxConn,
  min: dbConfig.minConn,
  idleTimeoutMillis: dbConfig.idleTimeout
});


// Count the machine's CPUs
var cpuCount = require('os').cpus().length;
var httpServer = null;

// The master process - will only be used when on PROD
if (cluster.isMaster) {
  console.log('------------------------------------');
  console.log('Master Process ID:', process.pid);
  console.log('------------------------------------\n\n');

  console.log('Creating an extra DB connection on the master thread.\n\n');
  getCountries();

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
  bindRoutes(app);

  httpServer = http.createServer(app).listen(portNum, ipAddr, function (error) {
    if (error) {
      console.log(error);
      process.exit(10);
    }
    console.log('Express is listening on http://' + ipAddr + ':' + portNum);
  });
}

// Handle uncaught exceptions...
process.on('uncaughtException', function (err) {
  try {
    console.log('\n--------------');
    console.log(err);
    console.log('\n--------------');
    console.log('Encountered uncaught exception!');
    console.log('Performing clean up ...');
    // Call the cleanup function
    cleanUp(function() {
      console.log('Cleanup done!');
      // Stop the HTTP Server
      if(httpServer) {
        console.log('Stopping HTTP server ...');
        httpServer.close(function() {
          console.log('Stopped HTTP server, performing restart ...');
          // Exit!!
          restartProcess();
        });
      }
    });
  } catch (e) {
    console.log(e);
    restartProcess();
  }

  function restartProcess() {
    console.log('Restarting process ...');
    process.exit(1);
  }
});

function getCountries(cbMain) {
  var sqlQuery = 'SELECT country_recid AS countryID, country_name AS countryName FROM country_m';
  var response = [];
  pool.acquire(function(err, clientObj) {
    if(err) {
      // Don't care, stop execution.
      throw err;
    }
    try {
      clientObj.query(sqlQuery, null, function (err, results) {
        if(err) {
          pool.release(clientObj);
          if(cbMain) {
            return cbMain(err);
          }
          console.log(err);
          return;
        }
        pool.release(clientObj);
        if(cbMain) {
          return cbMain(null, results);
        }
      });
    } catch (e) {
      pool.release(clientObj);
      if(cbMain) {
        return cbMain(e);
      }
    }
  });
}

function bindRoutes(app) {
  app.get('/api/v1/country/list', function() {
    getCountries(function() {
      throw new Error('Custom uncaught exception');
    });
  });
}

function cleanUp(cbMain) {
  isDraining = true;
  if(pool.hasOwnProperty('_inUseObjects')
    && Array.isArray(pool._inUseObjects)
    && pool._inUseObjects.length > 0) {
      let inUseObjs = pool._inUseObjects;
      let inUseObjsLen = pool._inUseObjects.length;
    for(let i = 0; i !== inUseObjsLen; ++i) {
      inUseObjs[0].destroy();
      pool.release(inUseObjs[0]);
    }
  }
  pool.drain(function() {
    pool.destroyAllNow(function() {
      return cbMain();
    });
  });
}