var Country = require(__CONFIG__.app_code_path + 'country/Country');
var Controller = require(__CONFIG__.app_base_path + 'lib/controller');
var util = require('util');

function CountryController(app) {
  Controller.call(this);
  app.httpGet({
    url: 'country/list',
    route: this.getCountries.bind(this),
    isPublic: true
  });
}

util.inherits(CountryController, Controller);

CountryController.prototype.getCountries = function(request, response) {
  var that = this;
  this.Country = new Country(null, null);
  this.Country.getCountries(function(err, data) {
    if(data.length !== 0) {
      that.sendResponse(err, data, response);
    }
  });
};

module.exports = CountryController;
