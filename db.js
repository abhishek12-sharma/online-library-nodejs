const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Aman@15464",
  database: process.env.DB_NAME || "library_db"
});

module.exports = pool.promise();
