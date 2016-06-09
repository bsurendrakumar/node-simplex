'use strict';

var dbConfig = require(__CONFIG__.app_base_path + 'db-config');
var MariaDB = require(__CONFIG__.app_base_path + 'lib/db-connector/mariadb');

function cleanUp(cbMain) {
  var mObj = new MariaDB(dbConfig['mariadb']);
  mObj.destroy(cbMain);
};

module.exports = cleanUp;