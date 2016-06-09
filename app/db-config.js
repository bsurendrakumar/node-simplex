var mariadbHost = '10.0.0.99';
var mariadbUser = 'root';
var mariadbPassword = '123456';
var mariadbDatabase = 'dev';

// define the database configuration
var dbConfig = {
  'mariadb': {
    name: 'mariadb',
    maxConn: 10,
    minConn: 5,
    idleTimeout: 30000,
    host: mariadbHost,
    user: mariadbUser,
    password: mariadbPassword,
    db: mariadbDatabase,
    connTimeout: 15,
    multiStatements: true
  }
};

module.exports = dbConfig;
