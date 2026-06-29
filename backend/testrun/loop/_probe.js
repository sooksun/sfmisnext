// Bootstrap probe: check DB connectivity + sandbox school (sc_id=2) + its school_year rows
const { db } = require('../lib.js');

(async () => {
  try {
    const ping = await db('SELECT 1 AS ok');
    console.log('DB_OK', JSON.stringify(ping));
  } catch (e) {
    console.log('DB_DOWN', e.code || e.message);
    process.exit(0);
  }
  try {
    const schools = await db('SELECT sc_id, sc_name FROM school WHERE sc_id IN (1,2) ORDER BY sc_id');
    console.log('SCHOOLS', JSON.stringify(schools));
  } catch (e) { console.log('SCHOOL_ERR', e.message); }
  try {
    const sy = await db('SELECT sy_id, sy_year, budget_year FROM school_year WHERE sc_id=2 ORDER BY sy_id');
    console.log('SCHOOL_YEAR_SC2', JSON.stringify(sy));
  } catch (e) { console.log('SY_ERR', e.message); }
  try {
    const admins = await db("SELECT admin_id, username, type, sc_id FROM admin WHERE sc_id IN (1,2) ORDER BY sc_id, admin_id LIMIT 10");
    console.log('ADMINS', JSON.stringify(admins));
  } catch (e) { console.log('ADMIN_ERR', e.message); }
  process.exit(0);
})();
