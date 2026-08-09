require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});


pool.on('error', (err) => {
  console.error('MySQL pool error:', err.message);
});


pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌  Could not connect to MySQL database:', err.message);
    console.error('    Check your .env DB_HOST / DB_USER / DB_PASSWORD / DB_NAME values and that MySQL is running.');
  } else {
    console.log('✅  Connected to MySQL database:', process.env.DB_NAME);
    connection.release();
  }
});

const db = pool.promise();
module.exports = db;
