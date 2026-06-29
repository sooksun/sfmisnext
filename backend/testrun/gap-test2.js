// gap-test2.js — แก้ query + ขับ workflow ที่ harness รอบแรก crash ให้จบ + verify ผลจริง
process.env.SFMIS_TEST_SY_ID = '2';
process.env.SFMIS_TEST_BUDGET_YEAR_CE = '2026';
process.env.SFMIS_TEST_BUDGET_YEAR_BE = '2569';
const L = require('./lib');
const { SC_ID, SY_ID, BUDGET_YEAR_CE: YEAR, BUDGET_YEAR_BE: YEAR_BE, UP_BY, post, get, db, m } = L;
const results = [], bugs = [];
function rec(s, ok, d) { results.push({ ok: !!ok }); console.log(`${ok ? '✅' : '❌'} ${s}${d ? '  — ' + d : ''}`); if (!ok) bugs.push(`${s}: ${d}`); }
const short = (b) => (typeof b === 'string' ? b : JSON.stringify(b)).slice(0, 200);

async function student() {
  console.log('\n── A2) นักเรียน: loadStudent page=0 + ตั้งจำนวนบนแถว BE 2569 ──');
  const load = await get(`Student/loadStudent/${SY_ID}/${YEAR_BE}/${SC_ID}/0/100`); // page=0 (0-indexed)
  const rows = load.body?.data || (Array.isArray(load.body) ? load.body : []);
  rec('loadStudent (page=0) คืนรายการ', rows.length > 0, `พบ ${rows.length} ชั้น (edit=${load.body?.edit ?? load.body?.editable})`);
  const COUNTS = { 4: 30, 5: 28, 6: 32 };
  let ok = 0;
  for (const r of rows) {
    const cid = r.class_id ?? r.classId; const stId = r.st_id ?? r.stId;
    if (COUNTS[cid] != null && stId) { const u = await post('Student/updateStudent', { st_id: stId, st_count: COUNTS[cid], up_by: UP_BY }); if (u.ok && u.body?.flag !== false) ok++; }
  }
  rec('ตั้งจำนวนนักเรียน ป.1-3 (90 คน)', ok === 3, `สำเร็จ ${ok}/3`);
  const v = await db("SELECT COALESCE(SUM(st_count),0) t FROM tb_student WHERE sc_id=? AND sy_id=? AND budget_year='2569' AND class_id IN (4,5,6) AND del=0", [SC_ID, SY_ID]);
  rec('DB: tb_student(2569) รวม 90', Number(v[0].t) === 90, `รวม ${v[0].t}`);
}

async function travel() {
  console.log('\n── E2) เดินทางไปราชการ: ขับ workflow add→verify→approve→disburse + FT ──');
  const tr = await db("SELECT tr_id,status,grand_total,money_type_id FROM travel_reimbursement WHERE sc_id=? AND sy_id=? AND del=0 ORDER BY tr_id DESC LIMIT 1", [SC_ID, SY_ID]);
  const t = tr[0];
  rec('travel_reimbursement ล่าสุด (รอบแรกสร้างไว้)', !!t, t ? `tr_id=${t.tr_id} status=${t.status} ยอด=${m(t.grand_total)} mt=${t.money_type_id}` : 'ไม่พบ');
  if (!t) return;
  const mt = t.money_type_id;
  const before = Number((await db('SELECT COALESCE(SUM(amount),0) s FROM financial_transactions WHERE sc_id=? AND sy_id=? AND bg_type_id=? AND type=-1 AND del=0', [SC_ID, SY_ID, mt]))[0].s);
  // ถ้ายัง status รอตรวจ ให้เดิน workflow; ถ้าจ่ายแล้วข้าม
  if (Number(t.status) < 3) {
    const vf = await post('TravelReimbursement/verify', { tr_id: t.tr_id, verify_by: UP_BY, verify_name: 'การเงิน', verify_date: '2026-02-13', up_by: UP_BY });
    rec('verify (การเงินตรวจ)', vf.ok && vf.body?.flag !== false, short(vf.body));
    const ap = await post('TravelReimbursement/approve', { tr_id: t.tr_id, approve_by: UP_BY, approve_name: 'ผอ.', approve_date: '2026-02-13', up_by: UP_BY });
    rec('approve (ผอ.อนุมัติ)', ap.ok && ap.body?.flag !== false, short(ap.body));
    const ds = await post('TravelReimbursement/disburse', { tr_id: t.tr_id, receipt_date: '2026-02-14', type_offer_check: 1, up_by: UP_BY });
    rec('disburse (จ่ายเงิน)', ds.ok && ds.body?.flag !== false, short(ds.body));
  }
  const after = Number((await db('SELECT COALESCE(SUM(amount),0) s FROM financial_transactions WHERE sc_id=? AND sy_id=? AND bg_type_id=? AND type=-1 AND del=0', [SC_ID, SY_ID, mt]))[0].s);
  const st = await db('SELECT status, ft_pay_id FROM travel_reimbursement WHERE tr_id=?', [t.tr_id]);
  rec('จ่ายค่าเดินทางตัดยอดประเภทเงิน (FT type=-1)', after - before >= Number(t.grand_total) - 0.01, `รายจ่ายเพิ่ม ${m(after - before)} (ยอด ${m(t.grand_total)}) status=${st[0]?.status} ft_pay_id=${st[0]?.ft_pay_id}`);
}

async function supply() {
  console.log('\n── F2) บัญชีวัสดุ: รับเข้า (confirm) + เบิกจ่ายออก (issue) + ตรวจสต็อก ──');
  const rcv = await db("SELECT receive_id FROM receive_parcel_order WHERE sc_id=? AND title LIKE 'gap-test%' AND del=0 ORDER BY receive_id DESC LIMIT 1", [SC_ID]);
  const receiveId = rcv[0]?.receive_id;
  rec('ใบรับพัสดุ (รอบแรกสร้างไว้)', !!receiveId, `receive_id=${receiveId}`);
  const bal = async (sid) => Number((await db('SELECT trans_balance FROM tb_transaction_supplies WHERE supp_id=? AND del=0 ORDER BY trans_id DESC LIMIT 1', [sid]))[0]?.trans_balance || 0);
  const b1Before = await bal(1);
  const conf = await post('Supplie/confirmWithDrawParcel', { order: { receive_id: receiveId, receive_status: 2 }, detail: [{ supp_id: 1, trans_in: 100, trans_out: 0 }, { supp_id: 2, trans_in: 50, trans_out: 0 }] });
  rec('confirmWithDrawParcel (รับเข้าสต็อก +100)', conf.ok && conf.body?.flag === true, short(conf.body));
  const b1AfterIn = await bal(1);
  rec('สต็อกวัสดุ#1 เพิ่ม +100', b1AfterIn - b1Before === 100, `${b1Before} → ${b1AfterIn}`);

  const req = await post('SupplieRequest/add', { sc_id: SC_ID, req_no: 'gap2-เบิก/1', req_date: '2026-06-16', requester_id: 1, requester_name: 'ครูสมศรี', department: 'วิชาการ', purpose: 'ใช้สอน', up_by: UP_BY, details: [{ supp_id: 1, req_qty: 30 }, { supp_id: 2, req_qty: 20 }] });
  const reqId = req.body?.req_id;
  rec('SupplieRequest/add', req.ok && !!reqId, short(req.body));
  if (!reqId) return;
  await post('SupplieRequest/submit', { req_id: reqId, up_by: UP_BY });
  await post('SupplieRequest/approve', { req_id: reqId, up_by: UP_BY });
  const dets = await db('SELECT rqd_id, req_qty FROM supplie_request_detail WHERE req_id=? AND del=0 ORDER BY rqd_id', [reqId]);
  const iss = await post('SupplieRequest/issue', { req_id: reqId, up_by: UP_BY, details: dets.map((d) => ({ rqd_id: d.rqd_id, issued_qty: Number(d.req_qty) })) });
  rec('SupplieRequest/issue (จ่ายวัสดุออก)', iss.ok && iss.body?.flag !== false, short(iss.body));
  const b1AfterOut = await bal(1);
  rec('สต็อกวัสดุ#1 ลด -30 หลังเบิก', b1AfterIn - b1AfterOut === 30, `${b1AfterIn} → ${b1AfterOut}`);
  const out = await db("SELECT trans_out, trans_comment FROM tb_transaction_supplies WHERE supp_id=1 AND trans_out>0 AND del=0 ORDER BY trans_id DESC LIMIT 1", []);
  rec('รายการจ่ายวัสดุ trans_out=30', out[0] && Number(out[0].trans_out) === 30, out[0] ? `trans_out=${out[0].trans_out} (${out[0].trans_comment})` : 'ไม่พบ');
}

async function prevBalanceClean() {
  console.log('\n── C2) ยกยอด: ตรวจเฉพาะแถว gap-test (ตาม remark) ──');
  const v = await db("SELECT COUNT(*) c, COALESCE(SUM(amount),0) t FROM pln_prev_balance WHERE sc_id=? AND sy_id=? AND budget_year='2569' AND remark LIKE 'gap-test%' AND del=0", [SC_ID, SY_ID]);
  rec('pln_prev_balance เฉพาะ gap-test = 335,090', Number(v[0].t) === 335090, `แถว ${v[0].c} รวม ${m(v[0].t)}`);
}

(async () => {
  await L.login();
  console.log(`gap-test2 · SC=${SC_ID} SY=${SY_ID}`);
  for (const p of [student, travel, supply, prevBalanceClean]) { try { await p(); } catch (e) { rec(`${p.name} CRASH`, false, e.message); } }
  console.log('\n════════ สรุป gap-test2 ════════');
  console.log(`ผ่าน ${results.filter(r => r.ok).length}/${results.length}`);
  console.log(`🐞 (${bugs.length}):`); bugs.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
})().catch((e) => { console.error('💥', e); process.exit(1); });
