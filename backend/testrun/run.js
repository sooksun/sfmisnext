// finance1 test-run harness — replays โจทย์ตัวอย่าง (ตย.2) ผ่าน API จริง
// ใช้: node q.js @testrun/setup.sql && node testrun/run.js
const L = require('./lib');
const { SC_ID, SY_ID, BUDGET_YEAR_CE: YEAR, UP_BY, post, get, db, m } = L;

const results = [];
function rec(step, ok, detail) {
  results.push({ step, ok: !!ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${step}${detail ? '  ' + detail : ''}`);
}
const short = (b) => (typeof b === 'string' ? b : JSON.stringify(b)).slice(0, 140);

// ── Recorders ────────────────────────────────────────────────────────────
const CH_RCV = { cash: 2, bank: 3, check: 1 };  // receive_money_type
const CH_PAY = { cash: 1, bank: 2 };            // type_offer_check (บค/บจ)

async function income(date, mt, amount, detail, channel = 'bank') {
  return incomeMulti(date, [{ bg_type_id: mt, prd_detail: detail, prd_budget: amount }], channel, detail);
}
async function incomeMulti(date, lines, channel, label) {
  const r = await post('Receive/addReceive', {
    sc_id: SC_ID, sy_id: SY_ID, budget_year: YEAR,
    receive_money_type: CH_RCV[channel] ?? 3,
    receive_date: date, receive_form: label || lines[0]?.prd_detail || '',
    user_receive: UP_BY, up_by: UP_BY, cf_transaction: 0,
    receiveList: lines.map(l => ({ bg_type_id: l.bg_type_id, prd_detail: l.prd_detail, prd_budget: l.prd_budget, up_by: UP_BY })),
  });
  const total = lines.reduce((s, l) => s + l.prd_budget, 0);
  rec(`[รับ ${date}] ${label || lines[0].prd_detail} = ${m(total)} (${channel})`, r.ok && r.body.flag !== false, short(r.body));
}

let chequeNo = 1345781; // เลขเช็คเริ่มต้น (ตย.6)
async function expense(date, no_doc, mt, amount, detail, channel = 'bank') {
  const toc = CH_PAY[channel] ?? 2;
  const add = await post('Invoice/addInvoice', {
    sc_id: SC_ID, no_doc, bg_type_id: mt, rw_type: 3, p_id: 0,
    detail, amount, certificate_payment: toc, date_request: date,
    user_request: UP_BY, sy_id: SY_ID, year: YEAR, status: 200,
    type_offer_check: toc, up_by: UP_BY,
  });
  if (!add.ok || add.body.flag === false) { rec(`[จ่าย ${date}] ${detail} = ${m(amount)}`, false, 'addInvoice: ' + short(add.body)); return; }
  const row = (await db('SELECT rw_id FROM request_withdraw WHERE sc_id=? AND year=? AND no_doc=? AND del=0 ORDER BY rw_id DESC LIMIT 1', [SC_ID, YEAR, no_doc]))[0];
  if (!row) { rec(`[จ่าย ${date}] ${detail}`, false, 'rw_id not found'); return; }
  if (amount >= 5000) {
    await post('Check/saveCommittee', { rw_id: row.rw_id, sc_id: SC_ID, member1_name: 'นายตรวจรับ หนึ่ง', member1_position: 'ครู', up_by: UP_BY });
  }
  // จ่ายผ่านธนาคาร (บจ) → ออกเช็คเลขตัวเลข ; จ่ายเงินสด (บค) → ไม่มีเลขเช็ค
  const payload = {
    rw_id: row.rw_id, sc_id: SC_ID, status: 202, type_offer_check: toc,
    offer_check_date: date, up_by: UP_BY,
  };
  if (channel === 'bank') payload.check_no_doc = chequeNo++;
  const up = await post('Check/updateCheck', payload);
  rec(`[จ่าย ${date}] ${detail} = ${m(amount)} (${channel} ${no_doc})`, up.ok && up.body.flag !== false, short(up.body));
}

async function taxReceive(date, amount, detail) {
  return income(date, 110, amount, 'ภาษีหัก ณ ที่จ่าย: ' + detail, 'cash');
}

async function loanBorrow(date, borrowerId, mt, amount, purpose, category = 3) {
  const r = await post('LoanAgreement/addLoanAgreement', {
    sc_id: SC_ID, sy_id: SY_ID, budget_year: '2556',
    borrower_id: borrowerId, money_type_id: mt, purpose, amount,
    borrow_date: date, loan_category: category, up_by: UP_BY,
  });
  rec(`[ยืม ${date}] borrower#${borrowerId} ${purpose} = ${m(amount)}`, r.ok && r.body.flag !== false, short(r.body));
}
async function loanReturn(date, borrowerId, cash, voucher, evNo) {
  const row = (await db("SELECT la_id, amount FROM loan_agreement WHERE sc_id=? AND borrower_id=? AND status=1 AND del=0 ORDER BY la_id ASC LIMIT 1", [SC_ID, borrowerId]))[0];
  if (!row) { rec(`[ส่งใช้ ${date}] borrower#${borrowerId}`, false, 'ไม่พบสัญญายืมค้าง'); return; }
  const r = await post('LoanAgreement/returnLoan', {
    la_id: row.la_id, returned_date: date, return_cash: cash, return_voucher_amount: voucher,
    evidence_no: evNo, up_by: UP_BY,
  });
  rec(`[ส่งใช้ ${date}] borrower#${borrowerId} เงินสด ${m(cash)}+ใบสำคัญ ${m(voucher)}`, r.ok && r.body.flag !== false, short(r.body));
}

async function govRev(date, revenue_type, entry_type, amount, detail) {
  const r = await post('GovRevenue/addEntry', {
    sc_id: SC_ID, sy_id: SY_ID, budget_year: '2556',
    revenue_type, entry_type, doc_date: date, detail, amount, up_by: UP_BY,
  });
  rec(`[รายได้แผ่นดิน ${date}] ${entry_type === 1 ? 'รับ' : 'นำส่ง'} ${detail} = ${m(amount)}`, r.ok && r.body.flag !== false, short(r.body));
}
async function smp(date, mt, entry_type, amount, detail) {
  const r = await post('SmpDeposit/addEntry', {
    sc_id: SC_ID, sy_id: SY_ID, budget_year: '2556',
    entry_type, doc_date: date, detail, amount, money_type_id: mt, up_by: UP_BY,
  });
  rec(`[ฝากส่วนราชการ ${date}] ${entry_type === 1 ? 'ฝาก' : 'ถอน'} ${detail} = ${m(amount)}`, r.ok && r.body.flag !== false, short(r.body));
}
async function bankLedger(date, ba_id, entry_type, amount, detail) {
  const r = await post('BankLedger/addEntry', {
    sc_id: SC_ID, sy_id: SY_ID, ba_id, entry_type, entry_date: date, detail, amount, up_by: UP_BY,
  });
  rec(`[ธนาคาร ${date}] ${entry_type === 1 ? 'ฝาก' : 'ถอน'} ${detail} = ${m(amount)}`, r.ok && r.body.flag !== false, short(r.body));
}

// ── Opening balances (ตย.1) ────────────────────────────────────────────────
const OPENING = [
  [101, 2, 178590], [102, 2, 1500], [103, 2, 15400], [104, 2, 141500], [105, 2, 156500],
  [106, 2, 200000], [106, 3, 150500], [107, 2, 30000], [108, 2, 50000], [109, 3, 14500],
  [110, 2, 600], [10, 2, 2632],
];
async function phaseOpening() {
  console.log('\n── Phase 1: ยอดยกมา (ตย.1) ──');
  for (const [mt, st, amt] of OPENING) {
    const r = await post('OpeningBalance/add', {
      sc_id: SC_ID, sy_id: SY_ID, budget_year: '2556', balance_date: '2012-09-30',
      money_type_id: mt, storage_type: st, amount: amt, up_by: UP_BY,
    });
    rec(`opening mt=${mt} st=${st} ${m(amt)}`, r.ok && r.body.flag !== false, short(r.body));
  }
}

// ── Transactions (ตย.2) ────────────────────────────────────────────────────
async function phaseTx() {
  console.log('\n── Phase 2: รายการรับ-จ่าย (ตย.2) ──');
  // 3 ต.ค.
  await expense('2012-10-03', 'บจ.1/56', 101, 4058, 'ค่าไฟฟ้า ส.ค.-ก.ย.', 'bank');
  await expense('2012-10-03', 'บจ.2/56', 110, 600, 'นำส่งภาษีหัก ณ ที่จ่าย', 'bank');
  // 4 ต.ค.
  await income('2012-10-04', 105, 30000, 'นายประชา นามศรี บริจาคเพื่อการเรียนการสอน', 'cash');
  // 5 ต.ค.
  await income('2012-10-05', 105, 10000, 'มูลนิธิพระยาธรรมรักษ์ บริจาคทุนการศึกษา', 'cash');
  await expense('2012-10-05', 'บจ.3/56', 101, 13500, 'ค่าวัสดุการศึกษา ร้านกุมภาภัณฑ์', 'bank');
  await taxReceive('2012-10-05', 135, 'ร้านกุมภาภัณฑ์');
  await expense('2012-10-05', 'บค.1-5/56', 106, 13975, 'เบิกชดเชยอาหารกลางวัน 1-5 ต.ค.', 'cash');
  // 8 ต.ค.
  await expense('2012-10-08', 'บจ.4/56', 107, 30000, 'ค่าวัสดุโครงการประชาธิปไตย บ.นภิส', 'bank');
  await taxReceive('2012-10-08', 280.37, 'บ.นภิส จำกัด');
  // 12 ต.ค. — นางนิภา ส่งใช้เงินยืม (opening loan)
  await loanReturn('2012-10-12', 101, 2795, 11180, 'บร 8ก 56789');
  // 15 ต.ค.
  await expense('2012-10-15', 'บจ.5/56', 108, 10500, 'ค่าวัสดุวงดุริยางค์ ร้านนลมิวสิค', 'bank');
  await taxReceive('2012-10-15', 105, 'ร้านนลมิวสิค');
  await bankLedger('2012-10-15', 1, 1, 2795, 'นำเงินสดฝากธนาคาร');
  // 31 ต.ค.
  await expense('2012-10-31', 'บค.6/56', 108, 5000, 'ค่าจ้างสอนดุริยางค์ นายไมตรี', 'cash');
  await expense('2012-10-31', 'บค.7/56', 103, 6625, 'ค่าจ้างเหมาอาหารเช้า-เย็น พักนอน', 'cash');
  // 1 พ.ย. — นางนิภา ยืมใหม่
  await loanBorrow('2012-11-01', 101, 106, 13975, 'ยืมจัดทำอาหารกลางวัน 1-7 พ.ย.', 3);
  // 5 พ.ย.
  await income('2012-11-05', 101, 204250, 'สพฐ.โอนค่าใช้จ่ายรายหัว', 'bank');
  await incomeMulti('2012-11-05', [
    { bg_type_id: 104, prd_detail: 'ค่าเครื่องแบบนักเรียน', prd_budget: 77400 },
    { bg_type_id: 104, prd_detail: 'ค่าอุปกรณ์การเรียน', prd_budget: 41925 },
    { bg_type_id: 104, prd_detail: 'ค่าหนังสือแบบเรียน', prd_budget: 85000 },
    { bg_type_id: 104, prd_detail: 'ค่ากิจกรรมพัฒนาคุณภาพผู้เรียน', prd_budget: 124320 },
  ], 'bank', 'สพฐ.โอนเรียนฟรี 15 ปี');
  // 6 พ.ย.
  await expense('2012-11-06', 'บจ.6/56', 110, 520.37, 'นำส่งภาษีสรรพากร', 'bank');
  await expense('2012-11-06', 'บจ.7/56', 101, 2850, 'ค่าไฟฟ้า ต.ค.', 'bank');
  // 8 พ.ย.
  await expense('2012-11-08', 'บค.8-12/56', 106, 13975, 'เบิกชดเชยอาหารกลางวัน 1,2,5-7 พ.ย.', 'cash');
  // 9 พ.ย.
  await expense('2012-11-09', 'บจ.8/56', 101, 7280, 'ค่าวัสดุก่อนประถม ร้านกุมภาภัณฑ์', 'bank');
  // 12 พ.ย.
  await expense('2012-11-12', 'บจ.9/56', 101, 1500, 'ค่าลงทะเบียนอบรมครูอนุบาล', 'bank');
  // 14 พ.ย.
  await income('2012-11-14', 103, 66250, 'สพป.โอนค่าอาหารนักเรียนพักนอน 25 คน', 'bank');
  // 15 พ.ย.
  await income('2012-11-15', 102, 43000, 'สพฐ.โอนปัจจัยพื้นฐานนักเรียนยากจน 86 คน', 'bank');
  await expense('2012-11-15', 'บค.13-17/56', 106, 13975, 'เบิกชดเชยอาหารกลางวัน 8-9,12-14 พ.ย.', 'cash');
  // 20 พ.ย.
  await expense('2012-11-20', 'บค.18-25/56', 104, 76320, 'ค่าเครื่องแบบนักเรียน', 'cash');
  await expense('2012-11-20', 'บค.26-33/56', 104, 41625, 'ค่าอุปกรณ์การเรียน', 'cash');
  // 21 พ.ย.
  await income('2012-11-21', 106, 279500, 'รับเงินสนับสนุนอาหารกลางวัน จากเทศบาล', 'bank');
  // 22 พ.ย.
  await expense('2012-11-22', 'บจ.10/56', 104, 83250, 'ค่าหนังสือเรียน บ.นกน้อยการเรียน', 'bank');
  await expense('2012-11-22', 'บค.34-38/56', 106, 13975, 'เบิกชดเชยอาหารกลางวัน 15-16,19-21 พ.ย.', 'cash');
  await loanBorrow('2012-11-22', 102, 101, 4110, 'นายสุชาติ ยืมไปราชการประชุมครูแกนนำวิทย์', 1);
  await smp('2012-11-22', 106, 1, 226395, 'นำเงินอาหารกลางวัน (เกินอำนาจเก็บ) ฝาก สพป.');
  // 23 พ.ย.
  await income('2012-11-23', 109, 10000, 'รับเงินประกันสัญญา บ.โชคพัฒนา', 'cash');
  await smp('2012-11-23', 109, 1, 10000, 'นำเงินประกันสัญญา บ.โชคพัฒนา ฝาก สพป.');
  await expense('2012-11-23', 'บจ.11/56', 102, 25000, 'ค่าจัดซื้อเครื่องแต่งกาย 50 คน', 'bank');
  await taxReceive('2012-11-23', 250, 'ร้านกีฬาบูติก');
  await expense('2012-11-23', 'บค.39/56', 102, 10000, 'ค่าจ้างเหมาพาหนะรับส่งนักเรียน 20 คน', 'cash');
  await expense('2012-11-23', 'บจ.12/56', 102, 8000, 'ค่าอุปกรณ์การเรียนเพิ่มเติม 16 คน', 'bank');
  // 24 พ.ย.
  await govRev('2012-11-24', 1, 2, 2632, 'นำเงินดอกเบี้ยส่ง สพป.');
  await smp('2012-11-24', 109, 1, 10000, 'นำเงินประกันสัญญา ฝาก สพป.');
  // 25 พ.ย.
  await expense('2012-11-25', 'บจ.13/56', 109, 4500, 'คืนเงินประกันสัญญา หจก.มัทนา', 'bank');
  // 29 พ.ย.
  await expense('2012-11-29', 'บค.40-44/56', 106, 13975, 'เบิกชดเชยอาหารกลางวัน 22-23,26-28 พ.ย.', 'cash');
  // 30 พ.ย.
  await expense('2012-11-30', 'บค.45/56', 108, 5000, 'ค่าจ้างครูวงดุริยางค์', 'cash');
  await expense('2012-11-30', 'บค.46/56', 103, 66250, 'ค่าจ้างเหมาอาหารเช้า-เย็น พักนอน', 'cash');
  // 3 ธ.ค.
  await expense('2012-12-03', 'บค.47/56', 104, 9000, 'ค่าจ้างเหมารถไปพิพิธภัณฑ์ไดโนเสาร์', 'cash');
  // 6 ธ.ค.
  await expense('2012-12-06', 'บค.48-51/56', 106, 11180, 'เบิกชดเชยอาหารกลางวัน 29-30 พ.ย.,3-4 ธ.ค.', 'cash');
  // 7 ธ.ค.
  await expense('2012-12-07', 'บค.52/56', 101, 5000, 'ค่าจ้างทาสีอาคาร นายชัยบาล', 'cash');
  await expense('2012-12-07', 'บจ.18/56', 101, 500, 'ค่าน้ำมันรถตัดหญ้า', 'bank');
  await expense('2012-12-07', 'บจ.19/56', 105, 27600, 'ค่าวัสดุการศึกษา บ.นกน้อย (รายได้สถานศึกษา)', 'bank');
  await taxReceive('2012-12-07', 257.94, 'บ.นกน้อยการเรียน');
  await expense('2012-12-07', 'บจ.20/56', 110, 250, 'นำส่งภาษีหัก ณ ที่จ่าย', 'bank');
  // 11 ธ.ค.
  await expense('2012-12-11', 'บจ.21/56', 101, 3580, 'ค่าไฟฟ้า พ.ย.', 'bank');
  await expense('2012-12-11', 'บจ.22/56', 101, 6450, 'ค่าอุปกรณ์วิทยาศาสตร์ บ.มานิตย์', 'bank');
  await taxReceive('2012-12-11', 60.28, 'บ.มานิตย์เคมีคอล');
  await loanReturn('2012-12-11', 102, 4110, 0, 'นายสุชาติ ส่งใช้เงินยืมราชการ');
  // 13 ธ.ค.
  await expense('2012-12-13', 'บจ.23/56', 101, 18430, 'ค่าวัสดุการศึกษา บ.โยธา', 'bank');
  await taxReceive('2012-12-13', 172.24, 'บ.โยธา จำกัด');
  await expense('2012-12-13', 'บค.53-56/56', 106, 11180, 'เบิกชดเชยอาหารกลางวัน 6-7,11-12 ธ.ค.', 'cash');
  // 17 ธ.ค.
  await expense('2012-12-17', 'บจ.24/56', 109, 3850, 'คืนเงินประกันสัญญา หจก.เพลินจิต', 'bank');
  await income('2012-12-17', 105, 3000, 'รับค่าบำรุงสถานที่ บ.สยามยามาฮ่า', 'cash');
  // 18 ธ.ค.
  await expense('2012-12-18', 'บค.57-58/56', 104, 8500, 'ค่าจัดซื้อวัสดุกิจกรรมวิชาการ ร้านเอกชัย', 'cash');
  await expense('2012-12-18', 'บค.59-60/56', 104, 10000, 'ค่าอาหารเช้า-เย็น ค่ายลูกเสือ-ยุวกาชาด', 'cash');
  // 20 ธ.ค.
  await expense('2012-12-20', 'บค.61-65/56', 106, 13975, 'เบิกชดเชยอาหารกลางวัน 13-14,17-19 ธ.ค.', 'cash');
  // 21 ธ.ค.
  await expense('2012-12-21', 'บจ.26/56', 104, 48000, 'ค่าอุปกรณ์คอมพิวเตอร์ หจก.โจคอมพิวเตอร์', 'bank');
  await taxReceive('2012-12-21', 448.60, 'หจก.โจคอมพิวเตอร์');
  // 24 ธ.ค.
  await loanBorrow('2012-12-24', 103, 101, 29500, 'นางสุดสวย ยืมไปราชการแข่งทักษะวิชาการ', 1);
  // 27 ธ.ค.
  await expense('2012-12-27', 'บค.66-70/56', 106, 13975, 'เบิกชดเชยอาหารกลางวัน 20-21,24-26 ธ.ค.', 'cash');
  await income('2012-12-27', 105, 15000, 'เทศบาลสนับสนุนโครงการคุณหนูแสนดี', 'cash');
  await loanBorrow('2012-12-27', 104, 101, 17000, 'นายทองดี ยืมจัดกิจกรรมเข้าค่ายคุณธรรม', 3);
  // 28 ธ.ค.
  await expense('2012-12-28', 'บค.71/56', 108, 5000, 'ค่าจ้างครูวงดุริยางค์', 'cash');
  await govRev('2012-12-28', 2, 1, 530, 'รับดอกเบี้ยบัญชีอุดหนุนอาหารกลางวัน');
  await govRev('2012-12-28', 1, 1, 1245, 'รับดอกเบี้ยบัญชีอุดหนุนทั่วไป');
  await govRev('2012-12-28', 4, 1, 1568, 'รับดอกเบี้ยบัญชีรายได้สถานศึกษา');
  await loanReturn('2012-12-28', 103, 850, 28650, 'นางสุดสวย ส่งใช้เงินยืมราชการ');
  await expense('2012-12-28', 'บจ.27/56', 103, 25500, 'จัดซื้ออุปกรณ์เครื่องครัว ร้านสุภา', 'bank');
  await taxReceive('2012-12-28', 255, 'ร้านสุภาเครื่องครัว');
}

// ── Verification ───────────────────────────────────────────────────────────
async function phaseVerify() {
  console.log('\n── Phase 3: ตรวจสอบผล ──');
  const ft = await db("SELECT type, COUNT(*) c, SUM(amount) amt FROM financial_transactions WHERE sc_id=? AND bg_type_id BETWEEN 101 AND 120 AND del=0 GROUP BY type", [SC_ID]);
  console.log('financial_transactions:', JSON.stringify(ft));
  const byType = await db("SELECT bg_type_id, SUM(CASE WHEN type=1 THEN amount ELSE -amount END) net, COUNT(*) c FROM financial_transactions WHERE sc_id=? AND bg_type_id BETWEEN 101 AND 120 AND del=0 GROUP BY bg_type_id ORDER BY bg_type_id", [SC_ID]);
  console.table(byType.map(r => ({ bg_type_id: r.bg_type_id, net: m(r.net), entries: r.c })));
  const loans = await db("SELECT borrower_name, amount, status FROM loan_agreement WHERE sc_id=? AND sy_id=? AND del=0 ORDER BY la_id", [SC_ID, SY_ID]);
  console.log('loans:', JSON.stringify(loans));
  const gov = await db("SELECT revenue_type, entry_type, SUM(amount) amt FROM gov_revenue_entry WHERE sc_id=? AND budget_year='2556' AND del=0 GROUP BY revenue_type, entry_type", [SC_ID]);
  console.log('gov_revenue:', JSON.stringify(gov));
  const smpRows = await db("SELECT entry_type, SUM(amount) amt FROM smp_deposit_entry WHERE sc_id=? AND budget_year='2556' AND del=0 GROUP BY entry_type", [SC_ID]);
  console.log('smp_deposit:', JSON.stringify(smpRows));

  // ── ทะเบียนคุมเงินนอกงบประมาณ ทุกประเภท (ผ่าน read API จริง รวมยอดยกมา) ──
  console.log('\nทะเบียนคุมเงินนอกงบประมาณ (read API: ยอดยกมา + รับ - จ่าย = คงเหลือ):');
  const rowsOut = [];
  for (const t of [101, 102, 103, 104, 105, 106, 107, 108, 109, 110]) {
    const r = await get(`Register_control_money_type/load_register_control_money_type/${t}/${SC_ID}/${SY_ID}/${YEAR}`);
    const j = r.body;
    const tx = j.data?.[0]?.transaction || [];
    const last = tx[tx.length - 1];
    rowsOut.push({
      ประเภท: (j.data?.[0]?.budget_type || '').slice(0, 30),
      ยกมา: m(j.carry_forward || 0), รับ: m(j.revenue || 0), จ่าย: m(j.expenses || 0),
      คงเหลือ: m(last ? last.balance : (j.carry_forward || 0)),
    });
  }
  console.table(rowsOut);
}

async function main() {
  await L.login();
  console.log('logged in. SC=%d SY=%d YEAR(CE)=%s', SC_ID, SY_ID, YEAR);
  await phaseOpening();
  await phaseTx();
  await phaseVerify();
  const pass = results.filter(r => r.ok).length;
  const fails = results.filter(r => !r.ok);
  console.log(`\n========== SUMMARY: ${pass}/${results.length} steps OK ==========`);
  if (fails.length) {
    console.log('FAILED STEPS:');
    fails.forEach(f => console.log(`  ❌ ${f.step} :: ${f.detail}`));
  }
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
