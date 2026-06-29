// Sanity: login + read sandbox sc_id=2 via API (confirms cross-tenant read works end-to-end)
const { login, get, SC_ID, SY_ID, BUDGET_YEAR_CE } = require('../lib.js');

(async () => {
  const out = [];
  try {
    const j = await login();
    out.push(`LOGIN ok token=${j.access_token ? 'yes' : 'no'} admin=${j.admin_id ?? j.user?.admin_id ?? '?'}`);
  } catch (e) { out.push('LOGIN FAIL ' + e.message); console.log(out.join('\n')); process.exit(1); }

  // 1) load students for sc_id=2 (pagination 0-indexed)
  const st = await get(`Student/loadStudent/${SY_ID}/${BUDGET_YEAR_CE}/${SC_ID}/0/50`);
  out.push(`Student/loadStudent → HTTP ${st.status} · rows=${Array.isArray(st.body?.data) ? st.body.data.length : JSON.stringify(st.body).slice(0,120)}`);

  // 2) load receive for sc_id=2
  const rc = await get(`Receive/loadReceive/${SC_ID}/${SY_ID}/${BUDGET_YEAR_CE}`);
  out.push(`Receive/loadReceive → HTTP ${rc.status} · rows=${Array.isArray(rc.body?.data) ? rc.body.data.length : (Array.isArray(rc.body) ? rc.body.length : JSON.stringify(rc.body).slice(0,120))}`);

  // 3) load projects for sc_id=2
  const pj = await get(`Project/load_project/${SC_ID}/1/0/50/${SY_ID}`);
  out.push(`Project/load_project → HTTP ${pj.status} · rows=${Array.isArray(pj.body?.data) ? pj.body.data.length : JSON.stringify(pj.body).slice(0,120)}`);

  console.log(out.join('\n'));
  process.exit(0);
})();
