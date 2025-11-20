// db.js
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",        // change if needed
  password: "Aman@15464",        // put your MySQL password
  database: "library_db"
});

module.exports = pool.promise();
