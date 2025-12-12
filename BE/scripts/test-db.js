require("dotenv").config({ path: "./.env" });
const mysql = require("mysql2/promise");

(async () => {
  let pool;
  try {
    console.log("Testing DB connection...");
    pool = await mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      waitForConnections: true,
      connectionLimit: 1,
    });

    const [ping] = await pool.query("SELECT 1 AS ok");
    console.log("Ping result:", ping[0]);

    const [users] = await pool.query(
      "SELECT id, email FROM users ORDER BY created_at DESC LIMIT 1"
    );
    if (users.length > 0) {
      console.log("Sample user:", users[0]);
    } else {
      console.warn("No users found in database.");
    }
  } catch (error) {
    console.error("DB test failed:", error.message);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
})();

