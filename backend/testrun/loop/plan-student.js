// P1 — 1.2 เตรียมงบ/นักเรียน : Student/addStudent, updateStudent, checkClassOnYear
// happy insert (ปีงบบักเก็ตว่าง) + duplicate-guard + validation(-) + update + auto-init
const { login, get, post, db, SC_ID, SY_ID, UP_BY } = require('../lib.js');

const TEST_BY = '2027';   // budget bucket สำหรับ insert (ไม่ชน seed 2026)
const AUTO_BY = '2028';   // budget bucket สำหรับ checkClassOnYear auto-init

const results = [];
const bugs = [];
function rec(step, ok, detail) {
  results.push({ step, ok: !!ok });
  console.log(`${ok ? '✅' : '❌'} ${step}${detail ? '  — ' + detail : ''}`);
  if (!ok) bugs.push(`${step}: ${detail || ''}`);
}

(async () => {
  await login();

  // pre-clean (idempotent, scoped sc_id=2 + test buckets เท่านั้น)
  await db('DELETE FROM tb_student WHERE sc_id=? AND budget_year IN (?,?)', [SC_ID, TEST_BY, AUTO_BY]);
  await db('DELETE FROM submitting_student_records WHERE sc_id=? AND year IN (?,?)', [SC_ID, Number(TEST_BY), Number(AUTO_BY)]);

  // master classes
  const cls = await get('Student/loadClassroom');
  const classes = (cls.body || []).map((c) => c.class_id).slice(0, 5);
  rec('loadClassroom', cls.status === 200 && classes.length >= 3, `${classes.length} ชั้นใช้ทดสอบ [${classes.join(',')}]`);

  const counts = [8, 10, 12, 14, 13];

  // 1) happy insert 5 records
  let inserted = 0;
  for (let i = 0; i < classes.length; i++) {
    const r = await post('Student/addStudent', {
      sc_id: SC_ID, sy_id: SY_ID, budget_year: TEST_BY, class_id: classes[i], st_count: counts[i], up_by: UP_BY,
    });
    if (r.status === 200 && r.body?.flag) inserted++;
    else rec(`addStudent class=${classes[i]}`, false, `HTTP ${r.status} ${JSON.stringify(r.body)}`);
  }
  rec(`addStudent x${classes.length}`, inserted === classes.length, `insert สำเร็จ ${inserted}/${classes.length}`);

  // verify DB
  const [dbc] = await db('SELECT COUNT(*) c, SUM(st_count) s FROM tb_student WHERE sc_id=? AND sy_id=? AND budget_year=? AND del=0', [SC_ID, SY_ID, TEST_BY]);
  rec('verify DB rows', Number(dbc.c) === classes.length, `rows=${dbc.c}, sum=${dbc.s}`);

  // verify list endpoint
  const lst = await get(`Student/loadStudent/${SY_ID}/${TEST_BY}/${SC_ID}/0/50`);
  const listLen = lst.body?.data?.length ?? -1;
  rec('verify loadStudent', lst.status === 200 && listLen === classes.length, `data=${listLen}, total=${lst.body?.totalstudent}, edit=${lst.body?.edit}`);

  // 2) duplicate guard (negative) — ต้อง flag:false
  const dup = await post('Student/addStudent', {
    sc_id: SC_ID, sy_id: SY_ID, budget_year: TEST_BY, class_id: classes[0], st_count: 99, up_by: UP_BY,
  });
  rec('duplicate guard', dup.status === 200 && dup.body?.flag === false, `flag=${dup.body?.flag} ms="${dup.body?.ms}"`);

  // 3) validation (negative) — st_count < 0 ต้อง 400
  const bad = await post('Student/addStudent', {
    sc_id: SC_ID, sy_id: SY_ID, budget_year: TEST_BY, class_id: classes[0], st_count: -5, up_by: UP_BY,
  });
  rec('validation st_count<0 → 400', bad.status === 400, `HTTP ${bad.status}`);

  // 4) update st_count
  const row = lst.body?.data?.[0];
  if (row) {
    const newCount = 20;
    const upd = await post('Student/updateStudent', { st_id: row.st_id, st_count: newCount, up_by: UP_BY });
    const [chk] = await db('SELECT st_count FROM tb_student WHERE st_id=?', [row.st_id]);
    rec('updateStudent', upd.body?.flag === true && Number(chk.st_count) === newCount, `flag=${upd.body?.flag} db.st_count=${chk?.st_count}`);
  } else {
    rec('updateStudent', false, 'ไม่มีแถวให้ update');
  }

  // 5) checkClassOnYear auto-init (bucket ว่าง → สร้างครบทุกชั้น)
  const chk = await post('Student/checkClassOnYear', { sc_id: SC_ID, sy_id: SY_ID, budget_date: AUTO_BY, up_by: UP_BY });
  const aut = await get(`Student/loadStudent/${SY_ID}/${AUTO_BY}/${SC_ID}/0/50`);
  const autoLen = aut.body?.data?.length ?? 0;
  const [mc] = await db('SELECT COUNT(*) c FROM master_classroom');
  rec('checkClassOnYear auto-init', chk.status === 200 && autoLen > 0, `auto-created=${autoLen} (master classes=${mc.c})`);

  // summary
  console.log(`\n════════ P1 สรุป ════════`);
  console.log(`ผ่าน ${results.filter((r) => r.ok).length}/${results.length}`);
  if (bugs.length) { console.log('BUGS:'); bugs.forEach((b, i) => console.log(`  🐞 ${i + 1}. ${b}`)); }
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
