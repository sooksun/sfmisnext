// ============================================================
// run-2569.js — จำลองการลงข้อมูลการเงินปี 2569 ทีละรายการ (เหมือนลงผ่านหน้าจอจริง)
// โจทย์: finance1.pdf (โรงเรียนบ้านสุขสันต์) แต่ลงในปีงบ 2569 (sy_id=2)
//
// เน้น 2 เรื่องตามที่ผู้ใช้ต้องการ:
//   1) AUTO-FILL — ไม่ส่งเลขที่ใบสำคัญ/เลขเช็คเอง ให้ระบบออกเลขอัตโนมัติ (พ.ศ.)
//   2) AUTO-WHT  — ไม่ลงภาษีหัก ณ ที่จ่ายเอง ให้ระบบหักอัตโนมัติตอน "จ่ายเงิน"
//                  ให้ผู้ขายที่ต้องหักภาษี (cal_vat 0/1) → ลงทะเบียนคุมภาษี + ออก
//                  หนังสือรับรอง โดยไม่ออกใบเสร็จรับเงินใหม่
//
// วิธีใช้ (จาก backend/):
//   node q.js @testrun/reset-2569.sql
//   node testrun/run-2569.js              # หยุดทันทีเมื่อเจอ error (one-by-one)
// ============================================================
process.env.SFMIS_TEST_SY_ID = process.env.SFMIS_TEST_SY_ID || '2';
process.env.SFMIS_TEST_BUDGET_YEAR_CE = process.env.SFMIS_TEST_BUDGET_YEAR_CE || '2026';
process.env.SFMIS_TEST_BUDGET_YEAR_BE = process.env.SFMIS_TEST_BUDGET_YEAR_BE || '2569';

const L = require('./lib');
const { SC_ID, SY_ID, BUDGET_YEAR_CE: YEAR, BUDGET_YEAR_BE: YEAR_BE, UP_BY, post, get, db, m } = L;

const TAG = '[finance1-2569]';
const STOP_ON_FAIL = process.env.SFMIS_TEST_STOP_ON_FAIL !== '0'; // default หยุดเมื่อ fail
const DATE_SHIFT = 13; // 2012/2013 → 2025/2026

const results = [];
let stepNo = 0;
function rec(step, ok, detail) {
  stepNo++;
  results.push({ step, ok: !!ok, detail });
  console.log(`${ok ? '✅' : '❌'} #${stepNo} ${step}${detail ? '  ' + detail : ''}`);
  if (!ok && STOP_ON_FAIL) throw new Error(`STOP: ${step} :: ${detail}`);
}
const short = (b) => (typeof b === 'string' ? b : JSON.stringify(b)).slice(0, 160);
const tagged = (s) => `${TAG} ${s}`;
const d = (date) => {
  const x = new Date(`${date}T00:00:00Z`);
  x.setUTCFullYear(x.getUTCFullYear() + DATE_SHIFT);
  return x.toISOString().slice(0, 10);
};

// ── ผู้ขายที่ต้องหักภาษี ณ ที่จ่าย (ตรงกับ reset-2569.sql p_id 9001–9009) ──────
const V = {
  kumpa: 9001,   // ร้านกุมภาภัณฑ์ (cal_vat 0)
  naphit: 9002,  // บ.นภิส (cal_vat 1)
  nonmusic: 9003,// ร้านนลมิวสิค (cal_vat 0)
  sport: 9004,   // ร้านกีฬาบูติก (cal_vat 0)
  noknoi: 9005,  // บ.นกน้อย (cal_vat 1)
  manit: 9006,   // บ.มานิตย์ (cal_vat 1)
  yotha: 9007,   // บ.โยธา (cal_vat 1)
  jocom: 9008,   // หจก.โจคอมพิวเตอร์ (cal_vat 1)
  supha: 9009,   // ร้านสุภาเครื่องครัว (cal_vat 0)
};

const CH_RCV = { cash: 2, bank: 3, check: 1 };

// ── รับเงิน (ออกใบเสร็จ บร. อัตโนมัติจากเล่มที่ใช้งานอยู่) ─────────────────────
async function income(date, mt, amount, detail, channel = 'bank') {
  return incomeMulti(date, [{ bg_type_id: mt, prd_detail: detail, prd_budget: amount }], channel, detail);
}
async function incomeMulti(date, lines, channel, label) {
  const actualDate = d(date);
  const actualLabel = tagged(label || lines[0]?.prd_detail || '');
  const r = await post('Receive/addReceive', {
    sc_id: SC_ID, sy_id: SY_ID, budget_year: YEAR,
    receive_money_type: CH_RCV[channel] ?? 3,
    receive_date: actualDate, receive_form: actualLabel,
    user_receive: UP_BY, up_by: UP_BY, cf_transaction: 0,
    receiveList: lines.map((l) => ({ bg_type_id: l.bg_type_id, prd_detail: tagged(l.prd_detail), prd_budget: l.prd_budget, up_by: UP_BY })),
  });
  const total = lines.reduce((s, l) => s + l.prd_budget, 0);
  rec(`[รับ ${actualDate}] ${actualLabel} = ${m(total)} (${channel})`, r.ok && r.body.flag !== false, short(r.body));
}

// ── จ่ายเงิน: ขอเบิก → ออกเช็ค/ใบสำคัญ (ระบบออกเลข บค./บจ. + เลขเช็คอัตโนมัติ) ──
//    ถ้าใส่ pId ผู้ขายที่ต้องหักภาษี → ระบบหักภาษี ณ ที่จ่ายให้อัตโนมัติตอนจ่าย
async function expense(date, mt, amount, detail, channel = 'bank', pId = 0) {
  const toc = channel === 'cash' ? 1 : 2; // 1=บค (เงินสด), 2=บจ (เช็ค/ธนาคาร)
  const actualDate = d(date);
  const actualDetail = tagged(detail);

  // 1) ขอเบิก (เลขที่จริงระบบจะออกให้ตอนออกเช็ค — ที่นี่ใส่ค่าร่างชั่วคราว)
  const add = await post('Invoice/addInvoice', {
    sc_id: SC_ID, no_doc: '(รออกเลขอัตโนมัติ)', bg_type_id: mt, rw_type: 3, p_id: pId,
    detail: actualDetail, amount, certificate_payment: toc, date_request: actualDate,
    user_request: UP_BY, sy_id: SY_ID, year: YEAR, status: 200,
    type_offer_check: toc, up_by: UP_BY,
  });
  if (!add.ok || add.body.flag === false) {
    rec(`[จ่าย ${actualDate}] ${actualDetail} = ${m(amount)}`, false, 'addInvoice: ' + short(add.body));
    return;
  }
  const row = (await db(
    `SELECT rw_id FROM request_withdraw WHERE sc_id=? AND sy_id=? AND year=? AND del=0
       AND detail=? AND ABS(amount - ?) < 0.005 AND DATE(date_request)=?
     ORDER BY rw_id DESC LIMIT 1`,
    [SC_ID, SY_ID, YEAR, actualDetail, amount, actualDate],
  ))[0];
  if (!row) { rec(`[จ่าย ${actualDate}] ${actualDetail}`, false, 'rw_id not found'); return; }

  // 2) ออกเช็ค (status=202) — เลขเช็ค auto-fill จาก Check/loadAutoNoCheck (เฉพาะจ่ายผ่านธนาคาร)
  const payload = {
    rw_id: row.rw_id, sc_id: SC_ID, status: 202, type_offer_check: toc,
    offer_check_date: actualDate, up_by: UP_BY,
  };
  if (channel === 'bank') {
    const auto = await get(`Check/loadAutoNoCheck/${SC_ID}/${SY_ID}`);
    payload.check_no_doc = auto.body?.check_no_doc ?? 1;
  }
  const up = await post('Check/updateCheck', payload);
  if (!up.ok || up.body.flag === false) {
    rec(`[จ่าย ${actualDate}] ${actualDetail} = ${m(amount)} (${channel})`, false, 'updateCheck: ' + short(up.body));
    return;
  }
  // อ่านเลขที่ใบสำคัญที่ระบบออกให้กลับมา (ตรวจ auto-fill)
  const issued = (await db('SELECT no_doc, check_no_doc FROM request_withdraw WHERE rw_id=?', [row.rw_id]))[0];
  const whtNote = pId ? ' +หักภาษีอัตโนมัติ' : '';
  rec(`[จ่าย ${actualDate}] ${actualDetail} = ${m(amount)} (${channel} → ${issued?.no_doc}${channel === 'bank' ? ' เช็ค ' + issued?.check_no_doc : ''})${whtNote}`,
    true, '');
}

// ── เงินยืม / ส่งใช้เงินยืม ───────────────────────────────────────────────────
async function loanBorrow(date, borrowerId, mt, amount, purpose, category = 3) {
  const actualDate = d(date);
  const r = await post('LoanAgreement/addLoanAgreement', {
    sc_id: SC_ID, sy_id: SY_ID, budget_year: YEAR_BE,
    borrower_id: borrowerId, money_type_id: mt, purpose: tagged(purpose), amount,
    borrow_date: actualDate, loan_category: category, up_by: UP_BY,
  });
  rec(`[ยืม ${actualDate}] borrower#${borrowerId} ${tagged(purpose)} = ${m(amount)}`, r.ok && r.body.flag !== false, short(r.body));
}
async function loanReturn(date, borrowerId, cash, voucher, evNo) {
  const actualDate = d(date);
  const row = (await db('SELECT la_id FROM loan_agreement WHERE sc_id=? AND sy_id=? AND borrower_id=? AND status=1 AND del=0 ORDER BY la_id ASC LIMIT 1', [SC_ID, SY_ID, borrowerId]))[0];
  if (!row) { rec(`[ส่งใช้ ${actualDate}] borrower#${borrowerId}`, false, 'ไม่พบสัญญายืมค้าง'); return; }
  const r = await post('LoanAgreement/returnLoan', {
    la_id: row.la_id, returned_date: actualDate, return_cash: cash, return_voucher_amount: voucher,
    evidence_no: tagged(evNo), up_by: UP_BY,
  });
  rec(`[ส่งใช้ ${actualDate}] borrower#${borrowerId} เงินสด ${m(cash)}+ใบสำคัญ ${m(voucher)}`, r.ok && r.body.flag !== false, short(r.body));
}

// ── รายได้แผ่นดิน / ฝากส่วนราชการ / ธนาคาร (ระบบออกเลข บง./บฝ./บถ. อัตโนมัติ) ──
async function govRev(date, revenue_type, entry_type, amount, detail) {
  const actualDate = d(date);
  const r = await post('GovRevenue/addEntry', {
    sc_id: SC_ID, sy_id: SY_ID, budget_year: YEAR_BE,
    revenue_type, entry_type, doc_date: actualDate, detail: tagged(detail), amount, up_by: UP_BY,
  });
  rec(`[รายได้แผ่นดิน ${actualDate}] ${entry_type === 1 ? 'รับ' : 'นำส่ง'} ${tagged(detail)} = ${m(amount)}`, r.ok && r.body.flag !== false, short(r.body));
}
async function smp(date, mt, entry_type, amount, detail) {
  const actualDate = d(date);
  const r = await post('SmpDeposit/addEntry', {
    sc_id: SC_ID, sy_id: SY_ID, budget_year: YEAR_BE,
    entry_type, doc_date: actualDate, detail: tagged(detail), amount, money_type_id: mt, up_by: UP_BY,
  });
  rec(`[ฝากส่วนราชการ ${actualDate}] ${entry_type === 1 ? 'ฝาก' : 'ถอน'} ${tagged(detail)} = ${m(amount)}`, r.ok && r.body.flag !== false, short(r.body));
}
async function bankLedger(date, ba_id, entry_type, amount, detail) {
  const actualDate = d(date);
  const r = await post('BankLedger/addEntry', {
    sc_id: SC_ID, sy_id: SY_ID, ba_id, entry_type, entry_date: actualDate, detail: tagged(detail), amount, up_by: UP_BY,
  });
  rec(`[ธนาคาร ${actualDate}] ${entry_type === 1 ? 'ฝาก' : 'ถอน'} ${tagged(detail)} = ${m(amount)}`, r.ok && r.body.flag !== false, short(r.body));
}

// ── Phase 0: ตรวจความพร้อม ───────────────────────────────────────────────────
async function phasePrereq() {
  console.log('\n── Phase 0: ตรวจความพร้อมปี 2569 ──');
  const year = (await db('SELECT sy_id, budget_year FROM school_year WHERE sc_id=? AND sy_id=? AND del=0 LIMIT 1', [SC_ID, SY_ID]))[0];
  rec(`ตรวจปีงบ SY=${SY_ID} budget_year=${YEAR_BE}`, !!year && String(year.budget_year) === YEAR_BE, year ? `sy_year/budget_year=${year.budget_year}` : 'ไม่พบปีงบ');
  const loan = (await db('SELECT la_id FROM loan_agreement WHERE sc_id=? AND sy_id=? AND borrower_id=101 AND status=1 AND del=0 LIMIT 1', [SC_ID, SY_ID]))[0];
  rec('เงินยืมค้างต้นปี: นางนิภา 13,975', !!loan, loan ? 'พบ' : 'ไม่พบ (รัน reset-2569.sql ก่อน)');
  const book = (await db("SELECT book_code, current_no, to_no FROM receipt_book WHERE sc_id=? AND sy_id=? AND status=1 AND del=0 ORDER BY rb_id DESC LIMIT 1", [SC_ID, SY_ID]))[0];
  rec('ตรวจสมุดใบเสร็จ active', !!book, book ? `${book.book_code} เลขถัดไป ${book.current_no}/${book.to_no}` : 'ไม่พบสมุด active');
}

// ── Phase 1: ยอดยกมาต้นปี (ตย.1) ─────────────────────────────────────────────
const OPENING = [
  [101, 2, 178590], [102, 2, 1500], [103, 2, 15400], [104, 2, 141500], [105, 2, 156500],
  [106, 2, 200000], [106, 3, 150500], [107, 2, 30000], [108, 2, 50000], [109, 3, 14500],
  [110, 2, 600], [10, 2, 2632],
];
async function phaseOpening() {
  console.log('\n── Phase 1: ยอดยกมาต้นปี (ตย.1) ──');
  for (const [mt, st, amt] of OPENING) {
    const r = await post('OpeningBalance/add', {
      sc_id: SC_ID, sy_id: SY_ID, budget_year: YEAR_BE, balance_date: d('2012-09-30'),
      money_type_id: mt, storage_type: st, amount: amt, up_by: UP_BY,
    });
    rec(`opening mt=${mt} st=${st} ${m(amt)}`, r.ok && r.body.flag !== false, short(r.body));
  }
}

// ── Phase 2: รายการรับ-จ่าย (ตย.2) — ทีละรายการ ──────────────────────────────
async function phaseTx() {
  console.log('\n── Phase 2: รายการรับ-จ่าย (ตย.2) ──');
  // 3 ต.ค.
  await expense('2012-10-03', 101, 4058, 'ค่าไฟฟ้า ส.ค.-ก.ย.', 'bank');
  await expense('2012-10-03', 110, 600, 'นำส่งภาษีหัก ณ ที่จ่าย', 'bank');
  // 4 ต.ค.
  await income('2012-10-04', 105, 30000, 'นายประชา นามศรี บริจาคเพื่อการเรียนการสอน', 'cash');
  // 5 ต.ค.
  await income('2012-10-05', 105, 10000, 'มูลนิธิพระยาธรรมรักษ์ บริจาคทุนการศึกษา', 'cash');
  await expense('2012-10-05', 101, 13500, 'ค่าวัสดุการศึกษา ร้านกุมภาภัณฑ์', 'bank', V.kumpa); // auto WHT 135
  await expense('2012-10-05', 106, 13975, 'เบิกชดเชยอาหารกลางวัน 1-5 ต.ค.', 'cash');
  // 8 ต.ค.
  await expense('2012-10-08', 107, 30000, 'ค่าวัสดุโครงการประชาธิปไตย บ.นภิส', 'bank', V.naphit); // auto WHT 280.37
  // 12 ต.ค. — นางนิภา ส่งใช้เงินยืม (ยกมา)
  await loanReturn('2012-10-12', 101, 2795, 11180, 'บร 8ก 56789');
  // 15 ต.ค.
  await expense('2012-10-15', 108, 10500, 'ค่าวัสดุวงดุริยางค์ ร้านนลมิวสิค', 'bank', V.nonmusic); // auto WHT 105
  await bankLedger('2012-10-15', 1, 1, 2795, 'นำเงินสดฝากธนาคาร');
  // 31 ต.ค.
  await expense('2012-10-31', 108, 5000, 'ค่าจ้างสอนดุริยางค์ นายไมตรี', 'cash');
  await expense('2012-10-31', 103, 6625, 'ค่าจ้างเหมาอาหารเช้า-เย็น พักนอน', 'cash');
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
  await expense('2012-11-06', 110, 520.37, 'นำส่งภาษีสรรพากร', 'bank');
  await expense('2012-11-06', 101, 2850, 'ค่าไฟฟ้า ต.ค.', 'bank');
  // 8 พ.ย.
  await expense('2012-11-08', 106, 13975, 'เบิกชดเชยอาหารกลางวัน 1,2,5-7 พ.ย.', 'cash');
  // 9 พ.ย.
  await expense('2012-11-09', 101, 7280, 'ค่าวัสดุก่อนประถม ร้านกุมภาภัณฑ์', 'bank');
  // 12 พ.ย.
  await expense('2012-11-12', 101, 1500, 'ค่าลงทะเบียนอบรมครูอนุบาล', 'bank');
  // 14 พ.ย.
  await income('2012-11-14', 103, 66250, 'สพป.โอนค่าอาหารนักเรียนพักนอน 25 คน', 'bank');
  // 15 พ.ย.
  await income('2012-11-15', 102, 43000, 'สพฐ.โอนปัจจัยพื้นฐานนักเรียนยากจน 86 คน', 'bank');
  await expense('2012-11-15', 106, 13975, 'เบิกชดเชยอาหารกลางวัน 8-9,12-14 พ.ย.', 'cash');
  // 20 พ.ย.
  await expense('2012-11-20', 104, 76320, 'ค่าเครื่องแบบนักเรียน', 'cash');
  await expense('2012-11-20', 104, 41625, 'ค่าอุปกรณ์การเรียน', 'cash');
  // 21 พ.ย.
  await income('2012-11-21', 106, 279500, 'รับเงินสนับสนุนอาหารกลางวัน จากเทศบาล', 'bank');
  // 22 พ.ย.
  await expense('2012-11-22', 104, 83250, 'ค่าหนังสือเรียน บ.นกน้อยการเรียน', 'bank');
  await expense('2012-11-22', 106, 13975, 'เบิกชดเชยอาหารกลางวัน 15-16,19-21 พ.ย.', 'cash');
  await loanBorrow('2012-11-22', 102, 101, 4110, 'นายสุชาติ ยืมไปราชการประชุมครูแกนนำวิทย์', 1);
  await smp('2012-11-22', 106, 1, 226395, 'นำเงินอาหารกลางวัน (เกินอำนาจเก็บ) ฝาก สพป.');
  // 23 พ.ย.
  await income('2012-11-23', 109, 10000, 'รับเงินประกันสัญญา บ.โชคพัฒนา', 'cash');
  await smp('2012-11-23', 109, 1, 10000, 'นำเงินประกันสัญญา บ.โชคพัฒนา ฝาก สพป.');
  await expense('2012-11-23', 102, 25000, 'ค่าจัดซื้อเครื่องแต่งกาย 50 คน', 'bank', V.sport); // auto WHT 250
  await expense('2012-11-23', 102, 10000, 'ค่าจ้างเหมาพาหนะรับส่งนักเรียน 20 คน', 'cash');
  await expense('2012-11-23', 102, 8000, 'ค่าอุปกรณ์การเรียนเพิ่มเติม 16 คน', 'bank');
  // 24 พ.ย.
  await govRev('2012-11-24', 1, 2, 2632, 'นำเงินดอกเบี้ยส่ง สพป.');
  await smp('2012-11-24', 109, 1, 10000, 'นำเงินประกันสัญญา ฝาก สพป.');
  // 25 พ.ย.
  await expense('2012-11-25', 109, 4500, 'คืนเงินประกันสัญญา หจก.มัทนา', 'bank');
  // 29 พ.ย.
  await expense('2012-11-29', 106, 13975, 'เบิกชดเชยอาหารกลางวัน 22-23,26-28 พ.ย.', 'cash');
  // 30 พ.ย.
  await expense('2012-11-30', 108, 5000, 'ค่าจ้างครูวงดุริยางค์', 'cash');
  await expense('2012-11-30', 103, 66250, 'ค่าจ้างเหมาอาหารเช้า-เย็น พักนอน', 'cash');
  // 3 ธ.ค.
  await expense('2012-12-03', 104, 9000, 'ค่าจ้างเหมารถไปพิพิธภัณฑ์ไดโนเสาร์', 'cash');
  // 6 ธ.ค.
  await expense('2012-12-06', 106, 11180, 'เบิกชดเชยอาหารกลางวัน 29-30 พ.ย.,3-4 ธ.ค.', 'cash');
  // 7 ธ.ค.
  await expense('2012-12-07', 101, 5000, 'ค่าจ้างทาสีอาคาร นายชัยบาล', 'cash');
  await expense('2012-12-07', 101, 500, 'ค่าน้ำมันรถตัดหญ้า', 'bank');
  await expense('2012-12-07', 105, 27600, 'ค่าวัสดุการศึกษา บ.นกน้อย (รายได้สถานศึกษา)', 'bank', V.noknoi); // auto WHT 257.94
  await expense('2012-12-07', 110, 250, 'นำส่งภาษีหัก ณ ที่จ่าย', 'bank');
  // 11 ธ.ค.
  await expense('2012-12-11', 101, 3580, 'ค่าไฟฟ้า พ.ย.', 'bank');
  await expense('2012-12-11', 101, 6450, 'ค่าอุปกรณ์วิทยาศาสตร์ บ.มานิตย์', 'bank', V.manit); // auto WHT 60.28
  await loanReturn('2012-12-11', 102, 4110, 0, 'นายสุชาติ ส่งใช้เงินยืมราชการ');
  // 13 ธ.ค.
  await expense('2012-12-13', 101, 18430, 'ค่าวัสดุการศึกษา บ.โยธา', 'bank', V.yotha); // auto WHT 172.24
  await expense('2012-12-13', 106, 11180, 'เบิกชดเชยอาหารกลางวัน 6-7,11-12 ธ.ค.', 'cash');
  // 17 ธ.ค.
  await expense('2012-12-17', 109, 3850, 'คืนเงินประกันสัญญา หจก.เพลินจิต', 'bank');
  await income('2012-12-17', 105, 3000, 'รับค่าบำรุงสถานที่ บ.สยามยามาฮ่า', 'cash');
  // 18 ธ.ค.
  await expense('2012-12-18', 104, 8500, 'ค่าจัดซื้อวัสดุกิจกรรมวิชาการ ร้านเอกชัย', 'cash');
  await expense('2012-12-18', 104, 10000, 'ค่าอาหารเช้า-เย็น ค่ายลูกเสือ-ยุวกาชาด', 'cash');
  // 20 ธ.ค.
  await expense('2012-12-20', 106, 13975, 'เบิกชดเชยอาหารกลางวัน 13-14,17-19 ธ.ค.', 'cash');
  // 21 ธ.ค.
  await expense('2012-12-21', 104, 48000, 'ค่าอุปกรณ์คอมพิวเตอร์ หจก.โจคอมพิวเตอร์', 'bank', V.jocom); // auto WHT 448.60
  // 24 ธ.ค.
  await loanBorrow('2012-12-24', 103, 101, 29500, 'นางสุดสวย ยืมไปราชการแข่งทักษะวิชาการ', 1);
  // 27 ธ.ค.
  await expense('2012-12-27', 106, 13975, 'เบิกชดเชยอาหารกลางวัน 20-21,24-26 ธ.ค.', 'cash');
  await income('2012-12-27', 105, 15000, 'เทศบาลสนับสนุนโครงการคุณหนูแสนดี', 'cash');
  await loanBorrow('2012-12-27', 104, 104, 17000, 'นายทองดี ยืมจัดกิจกรรมเข้าค่ายคุณธรรม', 3);
  // 28 ธ.ค.
  await expense('2012-12-28', 108, 5000, 'ค่าจ้างครูวงดุริยางค์', 'cash');
  await govRev('2012-12-28', 2, 1, 530, 'รับดอกเบี้ยบัญชีอุดหนุนอาหารกลางวัน');
  await govRev('2012-12-28', 1, 1, 1245, 'รับดอกเบี้ยบัญชีอุดหนุนทั่วไป');
  await govRev('2012-12-28', 4, 1, 1568, 'รับดอกเบี้ยบัญชีรายได้สถานศึกษา');
  await loanReturn('2012-12-28', 103, 850, 28650, 'นางสุดสวย ส่งใช้เงินยืมราชการ');
  await expense('2012-12-28', 106, 25500, 'จัดซื้ออุปกรณ์เครื่องครัว ร้านสุภา', 'bank', V.supha); // auto WHT 255
}

// ── Phase 3: ตรวจสอบผล (auto-fill + auto-WHT) ────────────────────────────────
async function phaseVerify() {
  console.log('\n── Phase 3: ตรวจสอบผล ──');
  // 3.1 เลขที่ใบสำคัญต้องเป็น พ.ศ. (บค./บจ. .../2569) และเรียงลำดับ
  const vouchers = await db("SELECT no_doc FROM request_withdraw WHERE sc_id=? AND sy_id=? AND del=0 AND status=202 AND no_doc LIKE 'บ%' ORDER BY rw_id", [SC_ID, SY_ID]);
  const ceCount = vouchers.filter((v) => /\/2026$/.test(v.no_doc || '')).length;
  const beCount = vouchers.filter((v) => /\/2569$/.test(v.no_doc || '')).length;
  rec(`เลขใบสำคัญเป็น พ.ศ. (บค./บจ. .../2569)`, ceCount === 0 && beCount > 0, `พ.ศ.=${beCount} ค.ศ.=${ceCount} ตัวอย่าง: ${vouchers.slice(0, 3).map((v) => v.no_doc).join(', ')}`);

  // 3.2 ภาษีหัก ณ ที่จ่าย: ลงทะเบียนคุมเงินภาษี (type 110) อัตโนมัติ
  const whtFt = (await db("SELECT COUNT(*) c, COALESCE(SUM(amount),0) amt FROM financial_transactions WHERE sc_id=? AND sy_id=? AND bg_type_id=110 AND type=1 AND del=0", [SC_ID, SY_ID]))[0];
  rec(`หักภาษีอัตโนมัติเข้าทะเบียนคุมภาษี 9 รายการ`, Number(whtFt.c) === 9, `พบ ${whtFt.c} รายการ รวม ${m(whtFt.amt)} (คาดหวัง 1,964.43)`);

  // 3.3 ออกหนังสือรับรองหักภาษีอัตโนมัติ (ไม่ใช่ใบเสร็จ)
  const cert = (await db("SELECT COUNT(*) c FROM withholding_certificate WHERE sc_id=? AND sy_id=? AND del=0", [SC_ID, SY_ID]))[0];
  rec(`ออกหนังสือรับรองหักภาษีอัตโนมัติ 9 ฉบับ`, Number(cert.c) === 9, `พบ ${cert.c} ฉบับ`);

  // 3.4 ต้องไม่มีการออกใบเสร็จรับเงิน (บร.) จากการหักภาษี — receipt มาจากการ "รับเงิน" เท่านั้น
  const taxReceipts = (await db("SELECT COUNT(*) c FROM pln_receive WHERE sc_id=? AND sy_id=? AND del=0 AND receive_form LIKE '%ภาษีหัก%'", [SC_ID, SY_ID]))[0];
  rec(`ไม่ออกใบเสร็จรับเงินซ้ำจากการหักภาษี`, Number(taxReceipts.c) === 0, `พบใบเสร็จภาษี ${taxReceipts.c} (ต้องเป็น 0)`);

  // 3.5 ทะเบียนคุมเงินภาษี (type 110) คงเหลือ = 1,194.06 (ตย.12)
  const r110 = await get(`Register_control_money_type/load_register_control_money_type/110/${SC_ID}/${SY_ID}/${YEAR}`);
  const tx110 = r110.body.data?.[0]?.transaction || [];
  const bal110 = tx110.length ? tx110[tx110.length - 1].balance : (r110.body.carry_forward || 0);
  rec(`ทะเบียนคุมเงินภาษีคงเหลือ = 1,194.06 (ตย.12)`, Math.abs(Number(bal110) - 1194.06) < 0.05, `ระบบ = ${m(bal110)}`);

  // 3.6 สรุปทะเบียนคุมเงินทุกประเภท
  console.log('\nทะเบียนคุมเงินนอกงบประมาณ (ยอดยกมา + รับ − จ่าย = คงเหลือ):');
  const rowsOut = [];
  for (const t of [101, 102, 103, 104, 105, 106, 107, 108, 109, 110]) {
    const r = await get(`Register_control_money_type/load_register_control_money_type/${t}/${SC_ID}/${SY_ID}/${YEAR}`);
    const j = r.body;
    const tx = j.data?.[0]?.transaction || [];
    const last = tx[tx.length - 1];
    rowsOut.push({
      ประเภท: (j.data?.[0]?.budget_type || '').slice(0, 28),
      ยกมา: m(j.carry_forward || 0), รับ: m(j.revenue || 0), จ่าย: m(j.expenses || 0),
      คงเหลือ: m(last ? last.balance : (j.carry_forward || 0)),
    });
  }
  console.table(rowsOut);

  // เลขที่ใบสำคัญที่ระบบออก (ตัวอย่าง auto-fill)
  console.log('\nเลขที่ใบสำคัญที่ระบบออกอัตโนมัติ (พ.ศ.) ตัวอย่าง:');
  console.log('  ' + vouchers.slice(0, 8).map((v) => v.no_doc).join('  |  '));
}

async function main() {
  await L.login();
  console.log('logged in. SC=%d SY=%d YEAR(CE)=%s YEAR(BE)=%s  STOP_ON_FAIL=%s', SC_ID, SY_ID, YEAR, YEAR_BE, STOP_ON_FAIL);
  await phasePrereq();
  await phaseOpening();
  await phaseTx();
  await phaseVerify();
  const pass = results.filter((r) => r.ok).length;
  const fails = results.filter((r) => !r.ok);
  console.log(`\n========== SUMMARY: ${pass}/${results.length} steps OK ==========`);
  if (fails.length) {
    console.log('FAILED STEPS:');
    fails.forEach((f) => console.log(`  ❌ ${f.step} :: ${f.detail}`));
  }
}
main().catch((e) => { console.error('\n💥 ', e.message); process.exit(1); });
