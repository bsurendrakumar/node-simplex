A sample, created to demonstrate a 100% CPU usage issue using NodeJS clusters and mariasql.

## Directions for setup

1. Clone the repo - `git clone https://github.com/bsurendrakumar/node-simplex.git`
2. Run the SQL scripts under the sql folder - `db.sql`.
3. Set the database configuration in - `/app/db-config.js`.
4. Run `npm install`
5. Run `npm start`

## Reproducing the issue

Open the http://127.0.0.1:3002/api/v1/country/list in your browser. This URL will vary based on the where you're server is running.


