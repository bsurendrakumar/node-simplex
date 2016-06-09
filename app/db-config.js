var mariadbHost = '127.0.0.1';
var mariadbUser = 'root';
var mariadbPassword = 'B3stPr@c';
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
