// importing the mysql2 library with proise for concurrent connections and async/await syntax.
const mysql = require('mysql2/promise'); 
require('dotenv').config();

// Creating the connection pool using env variables.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // The DB stores/returns times in UTC. Without this, mysql2 defaults to the
  // Node process's LOCAL timezone and mislabels every DATETIME/TIMESTAMP —
  // shifting every time the app shows (last seen, scheduled times, etc.).
  // 'Z' tells mysql2 to read/write server times as UTC, matching reality.
  timezone: 'Z'
});

module.exports = pool;