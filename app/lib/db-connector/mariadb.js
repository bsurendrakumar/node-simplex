/**
 * A db class to be used by other models. Uses the following -
 * https://github.com/mscdex/node-mariasql DEPENDENCIES - node-mariasql -
 * app-error.js
 */
'use strict';

var mSQLClient = require('mariasql');
var AppError = require(__CONFIG__.app_base_path + 'lib/app-error');
var uuid = require('node-uuid');
var transactionPool = {};
var getPool = require(__CONFIG__.app_base_path + 'lib/db-connector/pools/mariadb-pool');
var logger = require(__CONFIG__.app_base_path + 'logger');
var cluster = require('cluster');

var defaultMsg = {
  errorDbConn: 'There was an error while communicating with the database.',
  queryExecution: 'There was an error while executing the query.'
};
var retryTransactionCnt = 0;
var isDraining = false;
/**
 * The base MariaDb constructor.
 *
 * @param dbConfig
 *          Database configurations
 * @param customMsgs
 *          Use this parameter to override the custom messages used.
 */
function MariaDB(dbConfig, customMsgs) {
  this.config = modifyConfigObj(dbConfig);
  this.pool = getPool(this.config);
  this.msgStrings = defaultMsg;
  if (customMsgs !== undefined && customMsgs.errorDbConn && customMsgs.queryExecution) {
    this.msgStrings = customMsgs;
  }
}

/**
 * Use this for INSERT, UPDATE, DELETE queries
 *
 * @param objQuery
 *          Contains the following the properties - query - The SQL Query. data -
 *          Data to be sent for the query. cb - Callback method. closeConn -
 *          Close the connection automatically. useArray - Respond with an array
 *          rather than an object.
 */
MariaDB.prototype.query = function (objQuery, cb) {
  objQuery = getDefaultValues(objQuery);
  runQuery(this, false, objQuery.query, objQuery.data, cb, objQuery.closeConn,
    objQuery.useArray, objQuery.transactionID, objQuery.isMultiple);
};

MariaDB.prototype.getResult = function (objQuery, cb) {
  objQuery = getDefaultValues(objQuery);
  runQuery(this, true, objQuery.query, objQuery.data, function (err, data) {
    if (err) {
      cb(err, null);
      return;
    }
    var response = {};
    if (data.length !== 0) {
      response = data[0];
    }
    cb(null, response);
  }, objQuery.closeConn, objQuery.useArray, objQuery.transactionID, objQuery.isMultiple);
};

MariaDB.prototype.getResults = function (objQuery, cb) {
  objQuery = getDefaultValues(objQuery);
  runQuery(this, true, objQuery.query, objQuery.data, cb, objQuery.closeConn,
    objQuery.useArray, objQuery.transactionID, objQuery.isMultiple);
};

MariaDB.prototype.queries = function (objQuery, cb) {
  objQuery = getDefaultValues(objQuery);
  runQuery(this, true, objQuery.query, objQuery.data, cb, objQuery.closeConn,
    objQuery.useArray, objQuery.transactionID, objQuery.isMultiple);
};

MariaDB.prototype.destroy = function(cbMain) {
  isDraining = true;
  var that = this;
  if(that.pool.hasOwnProperty('_inUseObjects')
    && Array.isArray(that.pool._inUseObjects)
    && that.pool._inUseObjects.length > 0) {
      let inUseObjs = that.pool._inUseObjects;
      let inUseObjsLen = that.pool._inUseObjects.length;
    for(let i = 0; i !== inUseObjsLen; ++i) {
      inUseObjs[0].destroy();
      that.pool.release(inUseObjs[0]);
    }
  }
  that.pool.drain(function() {
    that.pool.destroyAllNow(function() {
      return cbMain();
    });
  });
};

function getDefaultValues(objQuery) {
  if (objQuery.closeConn === undefined) {
    objQuery.closeConn = true;
  }
  if (objQuery.useArray === undefined) {
    objQuery.useArray = false;
  }
  if (objQuery.isMultiple === undefined) {
    objQuery.isMultiple = false;
  }
  return objQuery;
}

function runQuery(objMaria, isSelect, query, data, cb, closeConn, useArray, transactionID, isMultiple) {
  var hadError = false;
  var response = [];
  var clientObj = null;
  var qCnt = 0;
  retryTransactionCnt = 0;
  if(isDraining) {
    return cb(new AppError(new Error('Draining pool...'), 'The pool is being drained!', {}));
  }
  objMaria.pool.acquire(function (err, client) {
    if (err) {
      return cb(new AppError(err, 'There was an error while acquiring the connection', {}));

    }
    clientObj = client;
    runQueryWithClient();
  });


  function runQueryWithClient() {
    try {
      clientObj.query(query, data, useArray).on('result', function (res) {
        if (isMultiple) {
          cbMultipleResultQuery(res);
        } else {
          cbResultQuery(res);
        }
      }).on('end', cbEndQuery).on('error', function (err) {
        if (!isMultiple) {
          return;
        }
        response = initMultipleResObj(response, qCnt);
        response[qCnt].err = err;
        return cb(new AppError(err, objMaria.msgStrings.queryExecution));
      });
    } catch (e) {
      objMaria.pool.release(clientObj);
      cb(new AppError(e, objMaria.msgStrings.queryExecution, {}));
    }
  }

  // Processes single query.
  function cbResultQuery(res) {
    if (isSelect) {
      res.on('data', function(row) {
        response.push(row);
      });
    }
    res.on('end', function(info) {
      if (!isSelect && !hadError) {
        // Not a select statement;
        cb(null, res.info);
      }
    });
    res.on('error', function (err) {
      handleError(err);
    });
  }

  // Processes multiple result query.
  function cbMultipleResultQuery(res) {
    response = initMultipleResObj(response, qCnt);
    res.on('data', function (row) {
      response[qCnt].data.push(row);
    });

    res.on('error', function (err) {
      res.abort();
      handleError(err);
    });

    res.on('end', function (info) {
      if (!hadError) {
        if(!response[qCnt]) {
          response = initMultipleResObj(response, qCnt);
        }
        response[qCnt].info = info;
      }
      ++qCnt;
    });
  }

  // Called at the end of the query...
  function cbEndQuery() {
    if (closeConn) {
      objMaria.pool.release(clientObj);
    }
    if (!hadError) {
      if (isMultiple) {
        return cb(null, response);
      } else {
        if (isSelect) {
          cb(null, response);
        }
      }
    }
  }

  function handleError(err) {
    hadError = true;
    if (err && err.hasOwnProperty('code')
      && err.code === __CONFIG__.mariaDB.deadlockErrCode
      && retryTransactionCnt !== __CONFIG__.mariaDB.retryTransactionCnt) {
      ++retryTransactionCnt;
      logger.logDeadlockInfo('WARNING : Dead lock found. Retrying the transaction (Count : ' + retryTransactionCnt
        + ').\nSQLQuery : ' + query);
      runQueryWithClient();
    } else {
      if (retryTransactionCnt !== 0) {
        logger.logDeadlockInfo('\n\n>>=======================<<\nWARNING : Dead lock. Tried restarting - '
          + retryTransactionCnt + ' times. Giving up!'
          + '\nSQLQuery : ' + query + '>>=====<<\n\n');
      }
      retryTransactionCnt = 0;
      if (closeConn) {
        objMaria.pool.release(clientObj);
      }
      cb(new AppError(err, objMaria.msgStrings.queryExecution, {}));
    }
  }
}

function initMultipleResObj(response, qCnt) {
  if (response[qCnt]) {
    return response;
  }
  response[qCnt] = {};
  response[qCnt].data = [];
  response[qCnt].info = {};
  response[qCnt].err = false;
  return response;
}


/***
 * This method is called by the Pooling handler.
 */
function modifyConfigObj(dbConfig) {
  dbConfig.create = function(callback) {
    var client = new mSQLClient();
    client.connect(dbConfig);
    client.on('error', function(err) {
      callback(err, null);
    });
    client.on('ready', function() {
      callback(null, client);
    });
  };

  dbConfig.destroy = function(client) {
    if(cluster.isMaster) {
      console.log('Destroying / ending master thread ID - ', client.threadId);
    }
    if(isDraining) {
      client.destroy();
    } else {
      client.end();
    }
  };

  return dbConfig;
}

module.exports = MariaDB;
