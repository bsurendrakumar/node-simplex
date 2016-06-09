var Model = require(__CONFIG__.app_base_path + 'lib/model');
var AppError = require(__CONFIG__.app_base_path + 'lib/app-error');
var util = require('util');

function Country(objToBind, requestParameters) {
  Model.call(this, this.properties, objToBind, requestParameters);
}

util.inherits(Country, Model);

/**
 * Fetches all active countries
 *
 * @param cb
 *          Callback method. Will be passed the error and the data.
 */
Country.prototype.getCountries = function(cb) {
  var that = this;
  var sqlQuery = 'SELECT country_recid AS countryID, country_name AS countryName FROM country_m';
  this.getResults({
    query: sqlQuery,
    cb: function(err, data) {
      cb(err, undefined);
    }
  });
};

module.exports = Country;
