// ============================================================
// e2e-3phases-2569.js — ทดลอง 3 ระบบใหญ่ แยก 3 เฟส (≥20 ทรานเซกชันต่อเฟส)
//   เฟส 1: งานนโยบายและแผน  — สร้างโครงการ + อนุมัติ 4 ขั้น
//   เฟส 2: งานพัสดุ         — ตั้งกรรมการตรวจรับ + ตรวจรับ/ลงสต็อก
//   เฟส 3: งานการเงินบัญชี  — รับเงิน + ขอเบิก/ออกเช็ค (หักภาษีอัตโนมัติ)
// ปีงบประมาณ 2569 (1 ต.ค. 2568 – ปัจจุบัน) · สุ่มรายการตามความเป็นไปได้
// วิธีใช้:  node testrun/e2e-3phases-2569.js
// ============================================================
process.env.SFMIS_TEST_SY_ID = '2';
process.env.SFMIS_TEST_BUDGET_YEAR_CE = '2026';
process.env.SFMIS_TEST_BUDGET_YEAR_BE = '2569';

const L = require('./lib');
const { SC_ID, SY_ID, BUDGET_YEAR_CE: YEAR, BUDGET_YEAR_BE: YEAR_BE, UP_BY, post, get, db, m } = L;

const RUN = Date.now().toString().slice(-5);
const N = Number(process.env.N_PER_PHASE || 22); // ≥20 ต่อเฟส

// ── random helpers ──
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const money = (a, b) => rint(a, b) * 5; // ลงท้าย 0/5 ดูสมจริง
// วันที่สุ่มในช่วง (ISO) — ปีงบ 2569 = 2025-10-01 .. วันนี้
function randDate(fromISO, toISO) {
  const a = new Date(fromISO).getTime(), b = new Date(toISO).getTime();
  const t = a + Math.floor(Math.random() * (b - a));
  return new Date(t).toISOString().slice(0, 10);
}
const TODAY = new Date().toISOString().slice(0, 10);

const VENDORS_TAX = [9001, 9002, 9003, 9004, 9005, 9006, 9007, 9008, 9009]; // หักภาษี
const PAY_MT = 9; // เงินรายได้สถานศึกษา (ผูกบัญชีธนาคาร) — ใช้จ่ายในเฟส 3
const RECV_MT = [2, 4, 8, 9, 13];
const PROJ_WORDS = ['จัดซื้อวัสดุการศึกษา', 'จัดซื้อวัสดุสำนักงาน', 'จ้างเหมาบริการ', 'จัดซื้อสื่อการเรียน',
  'จัดซื้ออุปกรณ์กีฬา', 'จัดซื้อวัสดุวิทยาศาสตร์', 'จ้างซ่อมแซมอาคาร', 'จัดซื้อหนังสือเรียน',
  'จัดซื้อครุภัณฑ์คอมพิวเตอร์', 'จัดซื้อวัสดุงานบ้านงานครัว', 'จ้างทำป้ายประชาสัมพันธ์', 'จัดซื้ออุปกรณ์ดนตรี'];

const results = { plan: [], parcel: [], finance: [] };
function rec(bucket, ok, label, detail) {
  results[bucket].push({ ok: !!ok, label });
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? '  — ' + detail : ''}`);
}
const short = (b) => (typeof b === 'string' ? b : JSON.stringify(b)).slice(0, 140);

async function findOrder(name) {
  const r = await get(`Project_approve/loadProjectApprove/${SC_ID}/${YEAR_BE}`);
  const list = Array.isArray(r.body) ? r.body : r.body?.data || [];
  return list.filter((o) => o.details === name).sort((a, b) => b.order_id - a.order_id)[0] || null;
}

// ════════════════ เฟส 1: นโยบายและแผน ════════════════
async function phase1() {
  console.log(`\n╔══════ เฟส 1: งานนโยบายและแผน (${N} โครงการ) ══════╗`);
  const orders = [];
  for (let i = 1; i <= N; i++) {
    const isHire = i % 3 === 0;
    const name = `[3P-${RUN}] ${pick(PROJ_WORDS)} ครั้งที่ ${i}`;
    const budget = money(700, 12000); // 3,500 – 60,000
    const planDate = randDate('2025-10-01', '2025-12-15');

    const add = await post('Project/addProject', { proj_name: name, proj_budget: budget, sc_id: SC_ID, sy_id: SY_ID, up_by: UP_BY });
    if (add.body?.flag !== true) { rec('plan', false, `โครงการ #${i}`, short(add.body)); continue; }
    const order = await findOrder(name);
    if (!order) { rec('plan', false, `โครงการ #${i} หา parcel_order ไม่เจอ`); continue; }
    const oid = order.order_id;

    await post('Project_approve/updateParcelOrder', { order_id: oid, project_type: isHire ? 2 : 1, method_type: 3, budgets: budget, up_by: UP_BY });
    await post('Project_approve/addParcelDetail', { order_id: oid, supp_id: pick([1, 2, 3]), pc_total: rint(1, 4) });

    let chainOk = true;
    for (const [ep, st] of [['approveParcelByPlan', 2], ['approveParcelByBusiness', 3], ['approveParcelBySupplie', 4], ['approveParcelByCeo', 5]]) {
      const r = await post(`Project_approve/${ep}`, { order_id: oid, order_status: st, remark: '3P', remark_cf: '' });
      if (r.body?.flag !== true) { chainOk = false; rec('plan', false, `โครงการ #${i} ติดที่ ${ep}`, short(r.body)); break; }
    }
    if (!chainOk) continue;
    orders.push({ oid, name, budget, type: isHire ? 2 : 1, planDate });
    rec('plan', true, `โครงการ #${i} "${name.slice(9, 40)}" งบ ${m(budget)}`, `order_id=${oid} อนุมัติครบ 4 ขั้น`);
  }
  return orders;
}

// ════════════════ เฟส 2: พัสดุ ════════════════
async function phase2(orders) {
  console.log(`\n╔══════ เฟส 2: งานพัสดุ (${orders.length} รายการ ตั้งกรรมการ+ตรวจรับ) ══════╗`);
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    const vendor = pick(VENDORS_TAX);
    const inspDate = randDate('2025-12-01', '2026-03-31');
    o.vendor = vendor; o.inspDate = inspDate;

    const com = await post('Audit_committee/updateSetCommittee', {
      order_id: o.oid, committee1: 101, committee2: 102, committee3: 103, order_status: 5,
      p_id: vendor, day_deadline: 15, date_deadline: '2026-07-15', remark: '',
    });
    const comOk = com.body?.flag === true;

    const insp = await post('Supplie_inspection/save', {
      order_id: o.oid, sc_id: SC_ID, insp_result: 1, insp_date: inspDate,
      committee1: 101, committee2: 102, committee3: 103, report_no: `ตร.${i + 1}/${RUN}`, up_by: UP_BY,
    });
    const inspOk = insp.body?.flag === true;
    o.ready = comOk && inspOk;
    rec('parcel', comOk && inspOk, `พัสดุ #${i + 1} order ${o.oid} ผู้ขาย ${vendor}`,
      `กรรมการ:${comOk ? 'ok' : 'X'} ตรวจรับ:${inspOk ? 'ok' : 'X'} (${inspDate})`);
  }
}

// ════════════════ เฟส 3: การเงินบัญชี ════════════════
async function phase3(orders) {
  console.log(`\n╔══════ เฟส 3: งานการเงินบัญชี (รับเงิน + จ่าย ≥${N} รายการ) ══════╗`);

  // 3.1 รับเงินเข้าหลายประเภท (8 รายการ) — ให้มียอดพอจ่าย
  const recvPlan = [
    { mt: 9, amount: 900000, label: 'รับเงินรายได้สถานศึกษา (ยอดตั้งต้น)' },
    ...Array.from({ length: 7 }, (_, k) => ({ mt: pick(RECV_MT), amount: money(4000, 30000), label: `รับเงินอุดหนุน/บริจาค งวด ${k + 1}` })),
  ];
  for (let i = 0; i < recvPlan.length; i++) {
    const p = recvPlan[i];
    const date = randDate('2025-10-05', '2026-02-28');
    const r = await post('Receive/addReceive', {
      sc_id: SC_ID, sy_id: SY_ID, budget_year: YEAR, receive_money_type: 3, receive_date: date,
      receive_form: `[3P-${RUN}] ${p.label}`, user_receive: UP_BY, up_by: UP_BY, cf_transaction: 0,
      receiveList: [{ bg_type_id: p.mt, prd_detail: `[3P-${RUN}] ${p.label}`, prd_budget: p.amount, up_by: UP_BY }],
    });
    rec('finance', r.ok && r.body?.flag !== false, `รับเงิน #${i + 1} ประเภท ${p.mt} = ${m(p.amount)}`, `${date} ${short(r.body)}`);
  }

  // 3.2 จ่าย: ขอเบิก → ออกเช็ค สำหรับ order ที่ตรวจรับแล้ว (หักภาษีอัตโนมัติ)
  const payable = orders.filter((o) => o.ready);
  let paid = 0;
  for (let i = 0; i < payable.length; i++) {
    const o = payable[i];
    const payDate = randDate(o.inspDate, TODAY);
    const inv = await post('Invoice/addInvoice', {
      sc_id: SC_ID, no_doc: '(auto)', bg_type_id: PAY_MT, rw_type: 3, order_id: o.oid, p_id: o.vendor,
      detail: `ค่า${o.type === 2 ? 'จ้าง' : 'จัดซื้อ'} ${o.name}`, amount: o.budget, certificate_payment: 2,
      date_request: payDate, user_request: UP_BY, sy_id: SY_ID, year: YEAR, status: 200, type_offer_check: 2, up_by: UP_BY,
    });
    if (inv.body?.flag === false || inv.status >= 400) { rec('finance', false, `จ่าย order ${o.oid} ขอเบิกไม่ผ่าน`, short(inv.body)); continue; }
    const row = (await db(`SELECT rw_id FROM request_withdraw WHERE sc_id=? AND sy_id=? AND order_id=? AND del=0 ORDER BY rw_id DESC LIMIT 1`, [SC_ID, SY_ID, o.oid]))[0];
    if (!row) { rec('finance', false, `จ่าย order ${o.oid} ไม่พบ rw`); continue; }
    const auto = await get(`Check/loadAutoNoCheck/${SC_ID}/${SY_ID}`);
    const up = await post('Check/updateCheck', {
      rw_id: row.rw_id, sc_id: SC_ID, status: 202, type_offer_check: 2, offer_check_date: payDate,
      check_no_doc: auto.body?.check_no_doc ?? 1, up_by: UP_BY,
    });
    const issued = (await db('SELECT no_doc, check_no_doc, status FROM request_withdraw WHERE rw_id=?', [row.rw_id]))[0];
    const okPay = up.body?.flag !== false && up.status < 400 && issued?.status === 202;
    if (okPay) paid++;
    rec('finance', okPay, `จ่าย #${i + 1} order ${o.oid} = ${m(o.budget)} → ผู้ขาย ${o.vendor}`,
      `บจ=${issued?.no_doc} เช็ค=${issued?.check_no_doc} (${payDate})`);
  }
  return paid;
}

(async () => {
  await L.login();
  console.log(`เข้าระบบแล้ว · โรงเรียน ${SC_ID} · ปีงบ ${YEAR_BE} (CE ${YEAR}) · RUN=${RUN} · วันนี้ ${TODAY}`);

  const orders = await phase1();
  await phase2(orders);
  const paid = await phase3(orders);

  // ── สรุป ──
  const sum = (b) => { const ok = results[b].filter((r) => r.ok).length; return `${ok}/${results[b].length}`; };
  console.log(`\n╔════════════════ สรุปผลการทดสอบ 3 เฟส (ปีงบ ${YEAR_BE}) ════════════════╗`);
  console.log(`  เฟส 1 นโยบายและแผน : ${sum('plan')} โครงการอนุมัติครบ`);
  console.log(`  เฟส 2 พัสดุ        : ${sum('parcel')} รายการตรวจรับ`);
  console.log(`  เฟส 3 การเงินบัญชี  : ${sum('finance')} ทรานเซกชัน (จ่ายสำเร็จ ${paid})`);

  // ตรวจยอดในฐานข้อมูล
  const ft = (await db('SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN type=1 THEN amount ELSE 0 END),0) inc, COALESCE(SUM(CASE WHEN type=-1 THEN amount ELSE 0 END),0) exp FROM financial_transactions WHERE sc_id=? AND sy_id=?', [SC_ID, SY_ID]))[0];
  const wht = (await db('SELECT COUNT(*) n FROM withholding_certificate WHERE sc_id=? AND sy_id=?', [SC_ID, SY_ID]))[0];
  const proj = (await db("SELECT COUNT(*) n FROM pln_project WHERE sc_id=? AND sy_id=? AND proj_name LIKE ?", [SC_ID, SY_ID, `%3P-${RUN}%`]))[0];
  console.log(`\n  ── ตรวจฐานข้อมูล ──`);
  console.log(`  โครงการที่สร้าง: ${proj.n} | financial_transactions: ${ft.n} แถว (รับ ${m(ft.inc)} / จ่าย ${m(ft.exp)})`);
  console.log(`  หนังสือรับรองหักภาษี ณ ที่จ่าย (อัตโนมัติ): ${wht.n} ฉบับ`);

  const allOk = results.plan.filter(r=>r.ok).length + results.parcel.filter(r=>r.ok).length + results.finance.filter(r=>r.ok).length;
  const allTot = results.plan.length + results.parcel.length + results.finance.length;
  console.log(`\n  รวม: ${allOk}/${allTot} ขั้นตอนสำเร็จ`);
  process.exit(allOk === allTot ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
