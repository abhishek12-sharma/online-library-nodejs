// test.js
const db = require("./db");

db.query("SELECT 1 + 1 AS result")
  .then(([rows]) => {
    console.log("✅ Database connected! Test result:", rows[0].result);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Database connection failed:\n", err);
    process.exit(1);
  });
