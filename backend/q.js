// Quick DB query helper for test-run. Usage: node q.js "SELECT ..."
const mysql = require('mysql2/promise');
(async () => {
  let sql = process.argv[2];
  if (!sql) { console.error('no sql'); process.exit(1); }
  if (sql.startsWith('@')) { sql = require('fs').readFileSync(sql.slice(1), 'utf8'); }
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root', password: '', database: 'sfmisystem',
    multipleStatements: true,
  });
  try {
    const [rows] = await conn.query(sql);
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('SQL_ERROR:', e.message);
    process.exit(2);
  } finally {
    await conn.end();
  }
})();
