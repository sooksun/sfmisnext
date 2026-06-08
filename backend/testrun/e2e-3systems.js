// ============================================================
// e2e-3systems.js — ลงข้อมูลทดสอบ 10 รายการ ทะลุ 3 ระบบงาน ตั้งแต่ต้นจนจบ
//   1) งานนโยบายและแผน : สร้างโครงการ → อนุมัติ 4 ขั้น (แผน→การเงิน→พัสดุ→ผอ.)
//   2) งานพัสดุ        : ตั้งคณะกรรมการตรวจรับ + ผูกผู้ขาย/ผู้รับจ้าง
//   3) งานการเงินบัญชี : ขอเบิก (Invoice) → ออกเช็ค/ใบสำคัญ (Check) ผูก order_id
// ตรวจความถูกต้อง + หา bug
// วิธีใช้ (จาก backend/):  node testrun/e2e-3systems.js
// ============================================================
process.env.SFMIS_TEST_SY_ID = '2';
process.env.SFMIS_TEST_BUDGET_YEAR_CE = '2026';
process.env.SFMIS_TEST_BUDGET_YEAR_BE = '2569';

const L = require('./lib');
const { SC_ID, SY_ID, BUDGET_YEAR_CE: YEAR, BUDGET_YEAR_BE: YEAR_BE, UP_BY, post, get, db, m } = L;
// loadProjectApprove กรองด้วย acad_year = budget_year (พ.ศ. 2569) ส่วน addInvoice ใช้ปี ค.ศ. (2026)

const RUN = Date.now().toString().slice(-5);
const PAY_MT = 2; // เงินอุดหนุนรายหัว (มี balance ~178,590) ใช้เป็นแหล่งจ่ายค่าพัสดุ
const PAY_DATE = '2026-06-09';
const results = [];
const bugs = [];
function rec(step, ok, detail) {
  results.push({ step, ok: !!ok });
  console.log(`${ok ? '✅' : '❌'} ${step}${detail ? '  — ' + detail : ''}`);
  if (!ok) bugs.push(`${step}: ${detail}`);
}
const short = (b) => (typeof b === 'string' ? b : JSON.stringify(b)).slice(0, 180);

// 10 รายการ: สลับ ซื้อ/จ้าง, วงเงิน, ผู้ขาย, รายการพัสดุ (add vs import)
const RECS = Array.from({ length: 10 }, (_, i) => {
  const n = i + 1;
  const isHire = n % 3 === 0; // ทุกๆ 3 = งานจ้าง
  return {
    name: `E2E3 รายการที่ ${n} ${isHire ? 'จ้างเหมาบริการ' : 'จัดซื้อวัสดุ'} [${RUN}]`,
    budget: 3000 + n * 600, // 3,600 … 9,000
    type: isHire ? 2 : 1,
    method: 3, // เฉพาะเจาะจง (ผ่าน compliance วงเงินต่ำ)
    partner: ((i % 5) + 1), // p_id 1..5
    mode: n % 2 === 0 ? 'import' : 'add',
    items: n % 2 === 0
      ? [{ supp_no: '', supp_name: `วัสดุนำเข้า E2E #${n}`, qty: 2, price: 250, unit: 'ชุด' }]
      : [{ supp_id: 1, pc_total: n }, { supp_id: 2, pc_total: 2 }],
  };
});

async function findOrder(name) {
  const r = await get(`Project_approve/loadProjectApprove/${SC_ID}/${YEAR_BE}`);
  const list = Array.isArray(r.body) ? r.body : (r.body?.data || []);
  return list.filter((o) => o.details === name).sort((a, b) => b.order_id - a.order_id)[0] || null;
}

async function runRecord(rec0, idx) {
  const tag = `R${idx + 1}`;
  console.log(`\n━━━━ ${tag}: ${rec0.name} (งบ ${m(rec0.budget)}, ${rec0.type === 2 ? 'จ้าง' : 'ซื้อ'}) ━━━━`);

  // ── ระบบ 1: นโยบายและแผน ──────────────────────────────────────────────
  const add = await post('Project/addProject', {
    proj_name: rec0.name, proj_budget: rec0.budget, sc_id: SC_ID, sy_id: SY_ID, up_by: UP_BY,
  });
  rec(`${tag} [แผน] สร้างโครงการ`, add.body?.flag === true, add.body?.ms || short(add.body));
  if (add.body?.flag !== true) return null;

  const order = await findOrder(rec0.name);
  rec(`${tag} [แผน] เกิด parcel_order`, !!order && order.order_status === 1,
    order ? `order_id=${order.order_id} status=${order.order_status}` : 'ไม่พบ');
  if (!order) return null;
  const oid = order.order_id;

  await post('Project_approve/updateParcelOrder', {
    order_id: oid, project_type: rec0.type, method_type: rec0.method, budgets: rec0.budget, up_by: UP_BY,
  });

  if (rec0.mode === 'add') {
    let ok = true;
    for (const it of rec0.items) {
      const r = await post('Project_approve/addParcelDetail', { order_id: oid, supp_id: it.supp_id, pc_total: it.pc_total });
      if (r.body?.flag !== true) ok = false;
    }
    rec(`${tag} [แผน] เพิ่มพัสดุ (add ×${rec0.items.length})`, ok, '');
  } else {
    const r = await post('Project_approve/importParcelDetails', { order_id: oid, up_by: UP_BY, items: rec0.items });
    rec(`${tag} [แผน] นำเข้าพัสดุ (import)`, r.body?.flag === true, `added=${r.body?.added} ใหม่=${r.body?.created_supplies}`);
  }

  const stages = [['approveParcelByPlan', 2], ['approveParcelByBusiness', 3], ['approveParcelBySupplie', 4], ['approveParcelByCeo', 5]];
  let chainOk = true, httpOk = true;
  for (const [ep, st] of stages) {
    const r = await post(`Project_approve/${ep}`, { order_id: oid, order_status: st, remark: 'E2E', remark_cf: '' });
    if (r.body?.flag !== true) { chainOk = false; rec(`${tag} [แผน] ${ep}`, false, `HTTP ${r.status} ${short(r.body)}`); break; }
    if (r.status !== 200) httpOk = false;
  }
  rec(`${tag} [แผน] อนุมัติครบ 4 ขั้น → ผ่าน ผอ.`, chainOk, chainOk ? (httpOk ? 'HTTP 200 ทุกขั้น' : 'flag=true แต่บาง HTTP≠200') : '');
  if (!chainOk) return null;

  // ── ระบบ 2: พัสดุ — ตั้งคณะกรรมการตรวจรับ + ผูกผู้ขาย ──────────────────
  const com = await post('Audit_committee/updateSetCommittee', {
    order_id: oid, committee1: 101, committee2: 102, committee3: 0,
    order_status: 5, p_id: rec0.partner, day_deadline: 15, date_deadline: '2026-07-15', remark: '',
  });
  rec(`${tag} [พัสดุ] ตั้งกรรมการตรวจรับ + ผู้ขาย p${rec0.partner}`, com.body?.flag === true, com.body?.ms || short(com.body));

  // ตรวจรับพัสดุ + ลงสต็อก (บังคับก่อนจ่ายเงิน: ตรวจรับ → ตั้งเบิก → จ่าย)
  const insp = await post('Supplie_inspection/save', {
    order_id: oid, sc_id: SC_ID, insp_result: 1, insp_date: PAY_DATE,
    committee1: 101, committee2: 102, committee3: 103, report_no: `ตร.${idx + 1}/${RUN}`, up_by: UP_BY,
  });
  rec(`${tag} [พัสดุ] ตรวจรับพัสดุ + ลงสต็อก`, insp.body?.flag === true, insp.body?.ms || short(insp.body));

  // ── ระบบ 3: การเงินบัญชี — ขอเบิก → ออกเช็ค/ใบสำคัญ ผูก order_id ───────
  const inv = await post('Invoice/addInvoice', {
    sc_id: SC_ID, no_doc: '(auto)', bg_type_id: PAY_MT, rw_type: 3, order_id: oid, p_id: rec0.partner,
    detail: `ค่า${rec0.type === 2 ? 'จ้าง' : 'จัดซื้อ'} ${rec0.name}`, amount: rec0.budget,
    certificate_payment: 2, date_request: PAY_DATE, user_request: UP_BY, sy_id: SY_ID, year: YEAR,
    status: 200, type_offer_check: 2, up_by: UP_BY,
  });
  rec(`${tag} [การเงิน] ขอเบิก (addInvoice)`, inv.body?.flag !== false && inv.status < 400, short(inv.body));
  const row = (await db(
    `SELECT rw_id FROM request_withdraw WHERE sc_id=? AND sy_id=? AND order_id=? AND del=0 ORDER BY rw_id DESC LIMIT 1`,
    [SC_ID, SY_ID, oid],
  ))[0];
  rec(`${tag} [การเงิน] request_withdraw ผูก order_id`, !!row, row ? `rw_id=${row.rw_id}` : 'ไม่พบ rw ที่ผูก order');
  if (!row) return oid;

  const auto = await get(`Check/loadAutoNoCheck/${SC_ID}/${SY_ID}`);
  const up = await post('Check/updateCheck', {
    rw_id: row.rw_id, sc_id: SC_ID, status: 202, type_offer_check: 2,
    offer_check_date: PAY_DATE, check_no_doc: auto.body?.check_no_doc ?? 1, up_by: UP_BY,
  });
  rec(`${tag} [การเงิน] ออกเช็ค/ใบสำคัญ (updateCheck)`, up.body?.flag !== false && up.status < 400, short(up.body));

  const issued = (await db('SELECT no_doc, check_no_doc, amount, status FROM request_withdraw WHERE rw_id=?', [row.rw_id]))[0];
  const beOk = /\/2569$/.test(issued?.no_doc || '');
  rec(`${tag} [การเงิน] ออกเลขใบสำคัญอัตโนมัติ (พ.ศ.)`, beOk && !!issued?.check_no_doc,
    `ใบสำคัญ=${issued?.no_doc} เช็ค=${issued?.check_no_doc} status=${issued?.status}`);
  return oid;
}

(async () => {
  await L.login();
  console.log(`logged in. SC=${SC_ID} SY=${SY_ID} YEAR=${YEAR} RUN=${RUN}`);

  // balance ต้นทางก่อนจ่าย
  const before = (await get(`Register_control_money_type/load_register_control_money_type/${PAY_MT}/${SC_ID}/${SY_ID}/${YEAR}`)).body;
  const balBefore = (() => { const tx = before.data?.[0]?.transaction || []; return tx.length ? tx[tx.length - 1].balance : (before.carry_forward || 0); })();
  console.log(`ยอดเงินประเภท ${PAY_MT} ก่อนทดสอบ ≈ ${m(balBefore)}`);

  const ids = [];
  for (let i = 0; i < RECS.length; i++) ids.push(await runRecord(RECS[i], i));

  // ── ตรวจบัญชี/การเงินรวม ───────────────────────────────────────────────
  console.log('\n── ตรวจความถูกต้องระบบบัญชี ──');
  const okIds = ids.filter(Boolean);
  const totalPaid = RECS.reduce((s, r, i) => s + (ids[i] ? r.budget : 0), 0);
  const after = (await get(`Register_control_money_type/load_register_control_money_type/${PAY_MT}/${SC_ID}/${SY_ID}/${YEAR}`)).body;
  const balAfter = (() => { const tx = after.data?.[0]?.transaction || []; return tx.length ? tx[tx.length - 1].balance : (after.carry_forward || 0); })();
  const drop = balBefore - balAfter;
  // หมายเหตุ: มีหักภาษี ณ ที่จ่ายอัตโนมัติ → เงินออกจริงอาจน้อยกว่ายอดเบิกเล็กน้อย (ภาษีถูกกันไว้)
  rec(`ยอดเงินลดลงสมเหตุผล (เบิก ${m(totalPaid)} ≈ ลดลง ${m(drop)})`, drop > 0 && drop <= totalPaid + 0.5,
    `ก่อน ${m(balBefore)} → หลัง ${m(balAfter)} (ลดลง ${m(drop)})`);

  const linked = okIds.length
    ? (await db('SELECT COUNT(*) c FROM request_withdraw WHERE sc_id=? AND sy_id=? AND order_id IN (?) AND status=202 AND del=0', [SC_ID, SY_ID, okIds]))[0]
    : { c: 0 };
  rec(`ใบสำคัญจ่ายผูก order ครบ ${okIds.length} ใบ`, Number(linked.c) === okIds.length, `พบ ${linked.c}/${okIds.length}`);

  const dupCheck = (await db("SELECT no_doc, COUNT(*) c FROM request_withdraw WHERE sc_id=? AND sy_id=? AND status=202 AND del=0 AND no_doc LIKE '%/2569' GROUP BY no_doc HAVING c>1", [SC_ID, SY_ID]));
  rec('เลขที่ใบสำคัญไม่ซ้ำ', dupCheck.length === 0, dupCheck.length ? `ซ้ำ: ${JSON.stringify(dupCheck)}` : 'ไม่ซ้ำ');

  console.log('\n════════ สรุปผล ════════');
  const pass = results.filter((r) => r.ok).length;
  console.log(`ผ่าน ${pass}/${results.length} ขั้นตอน | สำเร็จครบ 3 ระบบ ${okIds.length}/10 รายการ | order_ids=${JSON.stringify(okIds)}`);
  console.log(`\n🐞 BUG/ข้อสังเกต (${bugs.length}):`);
  bugs.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
  if (!bugs.length) console.log('  — ไม่พบ bug —');
})().catch((e) => { console.error('\n💥', e.message); process.exit(1); });
