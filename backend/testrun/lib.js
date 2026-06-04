// Shared lib for finance1 test-run harness
const mysql = require('mysql2/promise');

const BASE = 'http://127.0.0.1:3000/api';
const SC_ID = Number(process.env.SFMIS_TEST_SC_ID || 1);
const SY_ID = Number(process.env.SFMIS_TEST_SY_ID || 3); // sandbox school_year (FY 2556) by default
const BUDGET_YEAR_CE = process.env.SFMIS_TEST_BUDGET_YEAR_CE || '2013'; // transactional budget_year (CE)
const BUDGET_YEAR_BE = process.env.SFMIS_TEST_BUDGET_YEAR_BE || '2556';
const UP_BY = Number(process.env.SFMIS_TEST_UP_BY || 1);

let TOKEN = null;

async function login() {
  const r = await fetch(`${BASE}/B_admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin_local', password: 'Admin@123' }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('login failed: ' + JSON.stringify(j));
  TOKEN = j.access_token;
  return j;
}

async function api(method, path, body) {
  const r = await fetch(`${BASE}/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, ok: r.ok, body: json };
}
const post = (p, b) => api('POST', p, b);
const get = (p) => api('GET', p);

async function db(sql, params) {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root', password: '', database: 'sfmisystem',
    multipleStatements: true,
  });
  try { const [rows] = await conn.query(sql, params); return rows; }
  finally { await conn.end(); }
}

// pretty money
const m = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

module.exports = { BASE, SC_ID, SY_ID, BUDGET_YEAR_CE, BUDGET_YEAR_BE, UP_BY, login, api, post, get, db, m };
