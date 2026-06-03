// ทดสอบ 6 ฟีเจอร์อัตโนมัติ — รันหลัง: node q.js @testrun/setup.sql && node testrun/run.js
const L = require('./lib');
const { SC_ID, SY_ID, BUDGET_YEAR_CE: YEAR, UP_BY, post, get, db, m } = L;

const out = [];
function rec(step, ok, detail) { out.push({ ok: !!ok }); console.log(`${ok ? '✅' : '❌'} ${step}${detail ? '  — ' + detail : ''}`); }
const J = (b) => (typeof b === 'string' ? b : JSON.stringify(b)).slice(0, 200);

async function main() {
  await L.login();
  console.log('=== ทดสอบฟีเจอร์อัตโนมัติ (6 ตัว) ===\n');

  // ── Feature A: auto หักภาษี ณ ที่จ่าย + หนังสือรับรอง + ลงทะเบียนภาษี ──────
  console.log('── A) หักภาษี ณ ที่จ่ายอัตโนมัติ เมื่อออกเช็คให้ผู้ขายภายนอก ──');
  await db("DELETE FROM tb_partner WHERE sc_id=? AND p_name LIKE 'WHT-TEST%'", [SC_ID]);
  const ins = await db(
    "INSERT INTO tb_partner (p_type,p_name,pay_type,cal_vat,sc_id,del) VALUES (2,'WHT-TEST บ.ทดสอบหักภาษี',2,0,?,0)", [SC_ID]);
  const pId = ins.insertId;
  const noDoc = 'WHT-TEST-1';
  await post('Invoice/addInvoice', {
    sc_id: SC_ID, no_doc: noDoc, bg_type_id: 101, rw_type: 3, p_id: pId,
    detail: 'ทดสอบหักภาษี ณ ที่จ่าย', amount: 10000, certificate_payment: 2,
    date_request: '2012-12-30', user_request: UP_BY, sy_id: SY_ID, year: YEAR,
    status: 200, type_offer_check: 2, up_by: UP_BY,
  });
  const rw = (await db("SELECT rw_id FROM request_withdraw WHERE sc_id=? AND no_doc=? AND del=0 ORDER BY rw_id DESC LIMIT 1", [SC_ID, noDoc]))[0];
  await post('Check/saveCommittee', { rw_id: rw.rw_id, sc_id: SC_ID, member1_name: 'กก.', member1_position: 'ครู', up_by: UP_BY });
  const up = await post('Check/updateCheck', { rw_id: rw.rw_id, sc_id: SC_ID, status: 202, type_offer_check: 2, offer_check_date: '2012-12-30', check_no_doc: 9999001, up_by: UP_BY });
  rec('ออกเช็ค (updateCheck 202)', up.ok && up.body.flag !== false, J(up.body));

  const whtFt = (await db("SELECT bg_type_id, amount, type FROM financial_transactions WHERE rw_id=? AND bg_type_id=110 AND type=1 AND del=0", [rw.rw_id]))[0];
  rec('ลงเงินภาษีเข้าทะเบียนคุมภาษี (ft type=1, bg=110)', whtFt && Math.abs(whtFt.amount - 100) < 0.01, whtFt ? `amount=${m(whtFt.amount)} (คาดหวัง 100.00)` : 'ไม่พบ');
  const cert = (await db("SELECT wc_no, status FROM withholding_certificate WHERE of_id=? AND del=0", [rw.rw_id]))[0];
  rec('ออกหนังสือรับรองหักภาษีอัตโนมัติ (status=101)', cert && cert.status === 101, cert ? `wc_no=${cert.wc_no} status=${cert.status}` : 'ไม่พบ');
  const expFt = (await db("SELECT amount FROM financial_transactions WHERE rw_id=? AND bg_type_id=101 AND type=-1 AND del=0", [rw.rw_id]))[0];
  rec('ลงรายจ่ายเต็มจำนวนเข้าทะเบียนรายหัว (ft type=-1, 10,000)', expFt && Math.abs(expFt.amount - 10000) < 0.01, expFt ? `amount=${m(expFt.amount)}` : 'ไม่พบ');

  // ── Feature C: auto บันทึกการเก็บรักษาเงินสด เมื่อรับเงินสด ──────────────
  console.log('\n── C) บันทึกการเก็บรักษาเงินสดอัตโนมัติ เมื่อรับเงินสด ──');
  const before = (await db("SELECT COUNT(*) c FROM cash_keeping_record WHERE sc_id=? AND sy_id=? AND del=0", [SC_ID, SY_ID]))[0].c;
  await post('Receive/addReceive', {
    sc_id: SC_ID, sy_id: SY_ID, budget_year: YEAR, receive_money_type: 2,
    receive_date: '2012-12-29', receive_form: 'ทดสอบรับเงินสด', user_receive: 7, up_by: UP_BY,
    receiveList: [{ bg_type_id: 105, prd_detail: 'รับบริจาคเงินสด', prd_budget: 5000, up_by: UP_BY }],
  });
  const after = (await db("SELECT COUNT(*) c FROM cash_keeping_record WHERE sc_id=? AND sy_id=? AND del=0", [SC_ID, SY_ID]))[0].c;
  const ck = (await db("SELECT amount, sender_name, receiver_name, note FROM cash_keeping_record WHERE sc_id=? AND sy_id=? AND del=0 ORDER BY ckr_id DESC LIMIT 1", [SC_ID, SY_ID]))[0];
  rec('สร้างบันทึกเก็บรักษาเงินสดอัตโนมัติ', after === before + 1 && ck && Math.abs(ck.amount - 5000) < 0.01, ck ? `${m(ck.amount)} | ส่ง:${ck.sender_name} รับ:${ck.receiver_name}` : 'ไม่สร้าง');

  // ── Feature B: เตือนนำส่งภาษีก่อนวันที่ 7 ──────────────────────────────
  console.log('\n── B) เตือนนำส่งภาษีหัก ณ ที่จ่าย (ก่อนวันที่ 7 ของเดือนถัดไป) ──');
  const remit = await get(`Register_control_money_type/wht_remit_reminder/${SC_ID}/${SY_ID}/2556`);
  rec('endpoint wht_remit_reminder', remit.ok && Array.isArray(remit.body.data), `เดือนที่มีภาษี=${remit.body.count} ต้องดำเนินการ=${remit.body.need_action}`);
  if (remit.body.data) remit.body.data.forEach(r => console.log(`     ${r.month}: หัก ${m(r.collected)} นำส่ง ${m(r.remitted)} ค้าง ${m(r.outstanding)} กำหนด ${r.deadline} [${r.status}]`));

  // ── Feature F: เตือนเงินยืมใกล้/เลยกำหนดคืน ────────────────────────────
  console.log('\n── F) เตือนเงินยืมใกล้/เลยกำหนดคืน ──');
  const loan = await get(`LoanAgreement/dueReminder/${SC_ID}/${SY_ID}/2556`);
  rec('endpoint dueReminder', loan.ok && Array.isArray(loan.body.data), `ค้างชำระ=${loan.body.count} (เลยกำหนด=${loan.body.overdue} ใกล้กำหนด=${loan.body.due_soon})`);
  if (loan.body.data) loan.body.data.forEach(r => console.log(`     บย.${r.la_no} ${r.borrower_name} ${m(r.amount)} กำหนด ${r.due_date} [${r.flag}]`));

  // ── Feature E: เตือนเงินสดเกินวงเงินสำรอง (รวมยอดยกมา) ─────────────────
  console.log('\n── E) ตรวจเงินสดเกินวงเงินสำรอง (cashLimitCheck รวมยอดยกมา) ──');
  const cl = await get(`ReportDailyBalance/cashLimitCheck/${SC_ID}`);
  rec('endpoint cashLimitCheck', cl.ok && cl.body.limit_amount != null, `วงเงิน=${m(cl.body.limit_amount)} เงินสด=${m(cl.body.cash_balance)} ธนาคาร=${m(cl.body.bank_balance)} เกิน=${cl.body.exceeded}`);

  // ── Feature D: ปิดปีงบ → ยกยอด opening อัตโนมัติ ───────────────────────
  console.log('\n── D) ปิดปีงบ 2556 → ยกยอดคงเหลือเป็น opening ปี 2557 ──');
  await db("DELETE FROM school_year WHERE sc_id=? AND budget_year=2557", [SC_ID]);
  const sy57 = await db("INSERT INTO school_year (sy_year,semester,sy_date_s,sy_date_e,up_by,del,cre_date,up_date,sc_id,budget_year,budget_date_s,budget_date_e) VALUES (2557,1,'2013-10-01','2014-09-30',?,0,NOW(),NOW(),?,2557,'2013-10-01','2014-09-30')", [UP_BY, SC_ID]);
  const sy57Id = sy57.insertId;
  await db("DELETE FROM fiscal_year_balance WHERE sc_id=? AND budget_year='2556'", [SC_ID]);
  const bulk = await post('FiscalYearBalance/saveBulkBalances', {
    sc_id: SC_ID, budget_year: '2556', closing_date: '2013-09-30', closed_by: UP_BY,
    balances: [
      { money_type_id: 101, cash_balance: 0, bank_balance: 319692, smp_balance: 0 },
      { money_type_id: 104, cash_balance: 0, bank_balance: 193450, smp_balance: 0 },
      { money_type_id: 106, cash_balance: 0, bank_balance: 159315, smp_balance: 246395 },
    ],
  });
  rec('บันทึกยอดสิ้นปี (saveBulkBalances)', bulk.ok && bulk.body.flag !== false, J(bulk.body));
  const fin = await post('FiscalYearBalance/finalizeYear', { sc_id: SC_ID, budget_year: '2556', signed_by: UP_BY });
  rec('ปิดปีงบ (finalizeYear) + ยกยอด', fin.ok && fin.body.flag !== false, J(fin.body));
  const carried = await db("SELECT money_type_id, storage_type, amount FROM opening_balance WHERE sc_id=? AND sy_id=? AND remark LIKE '%auto-carry%' AND del=0 ORDER BY money_type_id, storage_type", [SC_ID, sy57Id]);
  rec('สร้าง opening ปี 2557 อัตโนมัติ', carried.length === 4, `สร้าง ${carried.length} รายการ (คาดหวัง 4: 101ธ.,104ธ.,106ธ.,106ฝากสพป.)`);
  carried.forEach(r => console.log(`     mt=${r.money_type_id} storage=${r.storage_type} = ${m(r.amount)}`));

  // ── Feature G: เตือนดอกเบี้ยรายได้แผ่นดิน (30 มิ.ย./30 ธ.ค.) ───────────────
  console.log('\n── G) เตือนรอบดอกเบี้ยเงินฝาก → นำส่งรายได้แผ่นดิน ──');
  const ir = await get(`GovRevenue/interestReminder/${SC_ID}/${SY_ID}/2556`);
  const okG = ir.ok && ir.body.next_interest_date && /(-06-30|-12-30)$/.test(ir.body.next_interest_date);
  rec('endpoint interestReminder (รอบ 30 มิ.ย./30 ธ.ค.)', okG, `รอบถัดไป=${ir.body.next_interest_date} (อีก ${ir.body.days_to_next} วัน) ค้างนำส่ง=${m(ir.body.total_outstanding)}`);
  (ir.body.alerts || []).forEach(a => console.log(`     [${a.level}] ${a.message}`));

  const pass = out.filter(r => r.ok).length;
  console.log(`\n========== AUTO SUMMARY: ${pass}/${out.length} OK ==========`);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
