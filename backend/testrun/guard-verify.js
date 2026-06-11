// ============================================================
// guard-verify.js — พิสูจน์ว่า cross-domain guard (Goal 2/3) บล็อกได้จริงเมื่อควรบล็อก
//   G1: ตั้งวงเงินคำสั่งซื้อ > งบโครงการ → ต้องบล็อก
//   G3: ตั้งเบิกคำสั่งซื้อที่ยังไม่ตรวจรับ → ต้องบล็อก
//   AI: /ai/validate/alerts คืน alert ความสัมพันธ์ข้ามงาน
// วิธีใช้ (จาก backend/): node testrun/guard-verify.js
// ============================================================
process.env.SFMIS_TEST_SY_ID = '2';
process.env.SFMIS_TEST_BUDGET_YEAR_CE = '2026';
process.env.SFMIS_TEST_BUDGET_YEAR_BE = '2569';

const L = require('./lib');
const { SC_ID, SY_ID, BUDGET_YEAR_BE: YEAR_BE, UP_BY, post, get, db } = L;
const RUN = Date.now().toString().slice(-5);
const short = (b) => (typeof b === 'string' ? b : JSON.stringify(b)).slice(0, 200);
let pass = 0, fail = 0;
function rec(name, ok, detail) {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
}
async function findOrder(name) {
  const r = await get(`Project_approve/loadProjectApprove/${SC_ID}/${YEAR_BE}`);
  const list = Array.isArray(r.body) ? r.body : (r.body?.data || []);
  return list.filter((o) => o.details === name).sort((a, b) => b.order_id - a.order_id)[0] || null;
}

(async () => {
  await L.login();
  console.log(`logged in. RUN=${RUN}\n`);

  // ── G1: คำสั่งซื้อเกินงบโครงการ ──────────────────────────────────────────
  const g1name = `GUARD-G1 งบ5000 [${RUN}]`;
  await post('Project/addProject', { proj_name: g1name, proj_budget: 5000, sc_id: SC_ID, sy_id: SY_ID, up_by: UP_BY });
  const o1 = await findOrder(g1name);
  rec('G1 setup: สร้างโครงการงบ 5,000', !!o1, o1 ? `order_id=${o1.order_id}` : 'ไม่พบ order');
  if (o1) {
    // ตั้งวงเงินคำสั่งซื้อ = 6,000 > งบโครงการ 5,000 → ต้องบล็อก (HTTP 400)
    const over = await post('Project_approve/updateParcelOrder', { order_id: o1.order_id, budgets: 6000, up_by: UP_BY });
    rec('G1 บล็อกคำสั่งซื้อ 6,000 > งบ 5,000', over.status === 400 || over.body?.flag === false,
      `HTTP ${over.status} ${short(over.body)}`);
    // ตั้งวงเงิน = 5,000 (พอดีงบ) → ต้องผ่าน
    const okSet = await post('Project_approve/updateParcelOrder', { order_id: o1.order_id, budgets: 5000, up_by: UP_BY });
    rec('G1 อนุญาตคำสั่งซื้อ 5,000 = งบ 5,000', okSet.body?.flag === true, short(okSet.body));
  }

  // ── G3: ตั้งเบิกก่อนตรวจรับ ───────────────────────────────────────────────
  const g3name = `GUARD-G3 ยังไม่ตรวจรับ [${RUN}]`;
  await post('Project/addProject', { proj_name: g3name, proj_budget: 4000, sc_id: SC_ID, sy_id: SY_ID, up_by: UP_BY });
  const o3 = await findOrder(g3name);
  rec('G3 setup: สร้างโครงการ/คำสั่งซื้อ (ยังไม่ตรวจรับ)', !!o3, o3 ? `order_id=${o3.order_id}` : 'ไม่พบ');
  if (o3) {
    await post('Project_approve/updateParcelOrder', { order_id: o3.order_id, budgets: 4000, method_type: 3, up_by: UP_BY });
    // ตั้งเบิกทันที (ยังไม่ตรวจรับ) → ต้องบล็อกด้วย G3
    const inv = await post('Invoice/addInvoice', {
      sc_id: SC_ID, no_doc: '(auto)', bg_type_id: 2, rw_type: 3, order_id: o3.order_id, p_id: 1,
      detail: 'G3 test', amount: 4000, certificate_payment: 2, date_request: '2026-06-09',
      user_request: UP_BY, sy_id: SY_ID, year: '2026', status: 200, type_offer_check: 2, up_by: UP_BY,
    });
    const blocked = inv.body?.flag === false && /ตรวจรับ/.test(inv.body?.ms || '');
    rec('G3 บล็อกตั้งเบิกก่อนตรวจรับ', blocked, short(inv.body));
  }

  // ── AI: relationship/anomaly alerts ──────────────────────────────────────
  const alerts = await get(`ai/validate/alerts/${SC_ID}/2569`);
  const data = alerts.body?.data || [];
  rec('AI alerts endpoint ตอบกลับ', alerts.status === 200 && Array.isArray(data),
    `count=${alerts.body?.count} status=${alerts.status}`);
  // โชว์ตัวอย่าง alert ความสัมพันธ์ข้ามงาน (ถ้ามี)
  const xtypes = ['project_overcommit', 'received_not_invoiced', 'committed_without_budget', 'contract_over_order', 'year_mismatch'];
  const xfound = data.filter((a) => xtypes.includes(a.type));
  console.log(`   • cross-domain/relationship alerts: ${xfound.length} รายการ`);
  xfound.slice(0, 5).forEach((a) => console.log(`     - [${a.severity}] ${a.title}${a.suggestedFix ? ' → ' + a.suggestedFix : ''}`));

  // ── /ai/validate/entry (inline preview) ──────────────────────────────────
  const entry = await post('ai/validate/entry', { context: 'order', sc_id: SC_ID, project_id: o1?.order_id ? undefined : undefined, amount: 0 });
  rec('AI validate/entry endpoint ตอบกลับ', entry.status === 200, `status=${entry.status} ${short(entry.body)}`);

  console.log(`\n════════ สรุป guard-verify: ${pass} ผ่าน / ${fail} ไม่ผ่าน ════════`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('\n💥', e.message); process.exit(1); });
