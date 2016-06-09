/* global __CONFIG__ */
'use strict';
var async = require('async');

var getStatus = require(__CONFIG__.app_base_path + 'lib/status');
var Controller = require(__CONFIG__.app_base_path + 'lib/controller');

var AppError = require(__CONFIG__.app_base_path + 'lib/app-error');
var __ = require('underscore');

var api = function(app) {

};

/**
 * Triggered whenever an API that does not exist is called.
 */
api.notFound = function(request, response) {
  response.status(getStatus('notFound')).json({
    'status': 'fail',
    'data': 'The requested url "' + request.originalUrl + '" is not supported by this service.'
  });
};

var Country = require(__CONFIG__.app_code_path + 'country/Country');
var mCountry = new Country(null, null);
mCountry.getCountries(function(err) {
  if(err) {
    console.log(err);
  }
});

module.exports = api;
