'use strict';

var getStatus = require(__CONFIG__.app_base_path + 'lib/status');

var RedisDB = require(__CONFIG__.app_base_path +
  'lib/db-connector/redis');
var dbConfig = require(__CONFIG__.app_base_path + 'db-config');

function Service() {
  this.getStatusCode = getStatus;
  if(dbConfig['redis']) {
    this.redisDb = new RedisDB(dbConfig['redis']);
  }
}

Service.prototype.buildTransactionObj = function(transactionID, data) {
  return {
    transactionID: transactionID,
    data: data
  };
};

module.exports = Service;
