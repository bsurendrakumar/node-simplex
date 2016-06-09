/* global __CONFIG__ */
var dbConfig = require(__dirname + '/db-config.js');
var networkUtils = require('./network-utils');

var config = module.exports;

// get the environment variables
var isProduction =  true;
var logDir = __dirname + '/../logs/';
var networkInterfaceName = 'eth0';
var port = 3002;
var httpsPort = 443;
var isClusterDisabled = false;
// get the ip-address associated with the configured network interface name
var ipAddress = networkUtils.getIpAddressForNetworkInterface(networkInterfaceName) || '127.0.0.1';

// set the api base url's for the http and https interfaces
var app_http_base_url = 'http://' + ipAddress + ':' + port;
var app_https_base_url = 'https://' + ipAddress + ':' + httpsPort;

// validate and format the environment variable settings if needed
if (logDir.slice(-1) != "/") {
  logDir = logDir + "/";
}

// chop any trailing slash
if (app_http_base_url.slice(-1) === "/") {
  app_http_base_url = app_http_base_url.slice(0, -1);
}
if (app_https_base_url.slice(-1) === "/") {
  app_https_base_url = app_https_base_url.slice(0, -1);
}

global.__CONFIG__ = {
  'app_base_path': __dirname + '/',
  'app_code_path': __dirname + '/code/',
  'app_base_url': '/api/v1/',
  'app_base_url_token': '/api/v1/:token/',
  'app_http_base_url': app_http_base_url,
  'app_https_base_url': app_https_base_url,
  'app_transaction_prop': 'transactionID',
  'enable_compression': true,
  'httpProtocol': 'http://',
  'log_folder_path': logDir,
  'isClusterDisabled': isClusterDisabled,
  'ipAddress': ipAddress,
  'excludedControllers': [],
  'mariaDB': {
    'deadlockErrCode': 1213,
    'retryTransactionCnt': 3
  }
};

__CONFIG__.isProduction = isProduction;
__CONFIG__.app_api_url = __CONFIG__.app_http_base_url + __CONFIG__.app_base_url;

__CONFIG__.getLogsFolderPath = function() {
  return __CONFIG__.app_base_path + '../logs/';
};

config.express = {
  port: port,
  ip: ipAddress,
  isProduction: isProduction,
  httpsPort: httpsPort
};
