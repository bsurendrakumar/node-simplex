var MariaDB = require(__CONFIG__.app_base_path + 'lib/db-connector/mariadb');
var dbConfig = require(__CONFIG__.app_base_path + 'db-config');
var AppError = require(__CONFIG__.app_base_path + 'lib/app-error');
var logger = require(__CONFIG__.app_base_path + 'logger');
var getStatus = require(__CONFIG__.app_base_path + 'lib/status');

var __ = require('underscore');
var async = require('async');
var util = require('util');

function Model(mProperties, objToBind, queryModifiers) {
  this.config = dbConfig['mariadb'];
  this.db = new MariaDB(this.config);
  this.getStatusCode = getStatus;
  this.queryModifiers = queryModifiers;
}

Model.prototype.getResults = function(objQuery) {
  var cbProcess = function(err, data) {
    processError(err, objQuery);
    if (objQuery.cb) {
      objQuery.cb(err, data);
    }
  };
  this.db.getResults(objQuery, cbProcess);
};

function processError(err, objQuery) {
  'use strict';
  if (err && err.isInternalErr) {
    err.writeToLog();
    if (objQuery) {
      var strError = 'Query Failed : ' + objQuery.query + ' \n';
      if (objQuery.hasOwnProperty('data')) {
        strError += 'Data : ' + util.inspect(objQuery.data, {
          depth: 4
        }) + '\n';
      }
      strError += '-----------\n\n';
      logger.writeLogErr(strError);
    }
  }
}

function runQuery(objQuery, self) {
  var cbProcess = function(err, data) {
    processError(err, objQuery);
    if (objQuery.cb) {
      objQuery.cb(err, data);
    }
  };
  if (objQuery.isMultiple) {
    self.db.queries(objQuery, cbProcess);
  } else {
    self.db.query(objQuery, cbProcess);
  }
}

module.exports = Model;
