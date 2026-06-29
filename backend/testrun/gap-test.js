// ============================================================
// gap-test.js — เทสต์ส่วนที่ harness เดิมยังไม่ครอบคลุม (ตาม goal)
//   A) นักเรียน (จำนวน) → B) ประมาณงบรายหัว → C) ยกยอดเงินคงเหลือ
//   D) ประมาณการงบปี → E) เดินทางไปราชการ (8708)
//   F) บัญชีวัสดุ (รับเข้า) + เบิกจ่ายวัสดุออกไปใช้
//   G) รายงานเงินคงเหลือรายวัน → H) ปิดบัญชีสิ้นปี → I) งบเทียบยอดธนาคาร
//   J) รายงานสรุปสิ้นปี
// วิธีใช้ (จาก backend/): node testrun/gap-test.js
// ============================================================
process.env.SFMIS_TEST_SY_ID = '2';
process.env.SFMIS_TEST_BUDGET_YEAR_CE = '2026';
process.env.SFMIS_TEST_BUDGET_YEAR_BE = '2569';

const L = require('./lib');
const { SC_ID, SY_ID, BUDGET_YEAR_CE: YEAR, BUDGET_YEAR_BE: YEAR_BE, UP_BY, post, get, db, m } = L;

const results = [];
const bugs = [];
function rec(step, ok, detail) {
  results.push({ step, ok: !!ok });
  console.log(`${ok ? '✅' : '❌'} ${step}${detail ? '  — ' + detail : ''}`);
  if (!ok) bugs.push(`${step}: ${detail}`);
}
const short = (b) => (typeof b === 'string' ? b : JSON.stringify(b)).slice(0, 220);
async function safe(fn) { try { return await fn(); } catch (e) { return { __err: e.message }; } }

// ════════════ A) จำนวนนักเรียน ════════════
async function phaseStudent() {
  console.log('\n── A) ระบุจำนวนนักเรียน ──');
  const chk = await post('Student/checkClassOnYear', { sc_id: SC_ID, sy_id: SY_ID, budget_date: YEAR_BE, up_by: UP_BY });
  rec('checkClassOnYear (auto-init แถวทุกชั้น)', chk.ok && chk.status < 400, short(chk.body));

  const load = await get(`Student/loadStudent/${SY_ID}/${YEAR_BE}/${SC_ID}/1/100`);
  const rows = load.body?.data || (Array.isArray(load.body) ? load.body : []);
  rec('loadStudent คืนรายการชั้นเรียน', Array.isArray(rows) && rows.length > 0, `พบ ${rows.length} ชั้น`);

  // ตั้งจำนวนนักเรียน 3 ชั้น (ใช้ updateStudent บนแถวที่ checkClassOnYear สร้าง)
  const COUNTS = { 4: 30, 5: 28, 6: 32 }; // ป.1=30, ป.2=28, ป.3=32
  let setOk = 0;
  for (const r of rows) {
    const cid = r.class_id ?? r.classId;
    if (COUNTS[cid] != null) {
      const stId = r.st_id ?? r.stId;
      const up = stId
        ? await post('Student/updateStudent', { st_id: stId, st_count: COUNTS[cid], up_by: UP_BY })
        : await post('Student/addStudent', { sc_id: SC_ID, sy_id: SY_ID, budget_year: YEAR_BE, class_id: cid, st_count: COUNTS[cid], up_by: UP_BY });
      if (up.ok && up.body?.flag !== false) setOk++;
    }
  }
  rec('ตั้งจำนวนนักเรียน 3 ชั้น (ป.1-3 รวม 90 คน)', setOk === 3, `สำเร็จ ${setOk}/3`);

  const verify = await db('SELECT class_id, st_count FROM tb_student WHERE sc_id=? AND sy_id=? AND budget_year=? AND class_id IN (4,5,6) AND del=0 ORDER BY class_id', [SC_ID, SY_ID, YEAR_BE]);
  const total = verify.reduce((s, r) => s + Number(r.st_count), 0);
  rec('DB: tb_student บันทึกถูกต้อง (รวม 90)', total === 90, `รวม ${total} (${JSON.stringify(verify)})`);
}

// ════════════ B) ประมาณงบรายหัวจากจำนวนนักเรียน ════════════
async function phasePerhead() {
  console.log('\n── B) ประมาณการงบประมาณรายหัว (จำนวน × อัตรา) ──');
  // อัตรารายหัว: ป.1-3 (class 4,5,6) เงินอุดหนุนรายหัว (bg_type_id=2) = 1,900 บ./คน
  const rates = [4, 5, 6].map((cid) => ({ class_id: cid, bg_type_id: 2, amount: 1900 }));
  const set = await post('Student/setPerheadRate', { sc_id: SC_ID, sy_id: SY_ID, rates, up_by: UP_BY });
  rec('setPerheadRate (อัตรา 1,900/คน ชั้น ป.1-3)', set.ok && set.body?.flag !== false, short(set.body));

  const calc = await get(`Student/loadCalculatePerhead/${SC_ID}/${SY_ID}`);
  const data = calc.body?.data || [];
  const tot = Number(calc.body?.totalprice ?? data.reduce((s, r) => s + Number(r.total ?? r.total_budget ?? 0), 0));
  // คาดหวัง 90 คน × 1,900 = 171,000 (เฉพาะ bg_type 2 ที่ตั้งอัตรา)
  const subset = data.filter((r) => (r.bg_type_id === 2) && [4, 5, 6].includes(r.class_id ?? r.classId));
  const subsetTot = subset.reduce((s, r) => s + Number(r.total ?? r.total_budget ?? 0), 0);
  rec('loadCalculatePerhead คำนวณงบรายหัว', calc.ok && data.length > 0, `รวมทั้งหมด=${m(tot)} | เฉพาะรายหัว ป.1-3=${m(subsetTot)} (คาด 171,000)`);
  rec('ประมาณงบรายหัว ป.1-3 = 171,000', Math.abs(subsetTot - 171000) < 0.5, `ได้ ${m(subsetTot)}`);
}

// ════════════ C) ยกยอดเงินคงเหลือปีก่อน → วางแผน ════════════
async function phasePrevBalance() {
  console.log('\n── C) ยกยอดเงินคงเหลือจากปีก่อน เข้าวงเงินวางแผน ──');
  const rows = [
    { money_type_id: 2, amount: 178590, source_budget_year: '2568', remark: 'gap-test ยกยอดรายหัว' },
    { money_type_id: 9, amount: 156500, source_budget_year: '2568', remark: 'gap-test ยกยอดรายได้สถานศึกษา' },
  ];
  const save = await post('PlanPrevBalance/save', { sc_id: SC_ID, sy_id: SY_ID, budget_year: YEAR_BE, up_by: UP_BY, rows });
  rec('PlanPrevBalance/save (ยกยอด 2 ประเภท)', save.ok && save.body?.flag !== false, short(save.body));

  const sum = await get(`PlanPrevBalance/summary/${SC_ID}/${SY_ID}/${YEAR_BE}`);
  const sBody = sum.body;
  rec('PlanPrevBalance/summary คืนยอดยกมา', sum.ok && sum.status < 400, short(sBody));

  const v = await db('SELECT COUNT(*) c, COALESCE(SUM(amount),0) t FROM pln_prev_balance WHERE sc_id=? AND sy_id=? AND budget_year=? AND del=0', [SC_ID, SY_ID, YEAR_BE]);
  rec('DB: pln_prev_balance บันทึก (รวม 335,090)', Number(v[0].c) >= 2 && Math.abs(Number(v[0].t) - 335090) < 0.5, `แถว ${v[0].c} รวม ${m(v[0].t)}`);
}

// ════════════ D) ประมาณการงบประมาณปี ════════════
async function phaseEstimate() {
  console.log('\n── D) ประมาณการงบประมาณรายปี ──');
  const r = await post('Budget/addEstimateAcadyear', { sc_id: SC_ID, sy_id: SY_ID, budget_year: YEAR_BE, ea_budget: 1850000, ea_status: 0, up_by: UP_BY });
  rec('Budget/addEstimateAcadyear', r.ok && r.body?.flag !== false, short(r.body));
  const v = await safe(() => db('SELECT ea_budget FROM tb_estimate_acadyear WHERE sc_id=? AND sy_id=? AND budget_year=? AND del=0 ORDER BY ea_id DESC LIMIT 1', [SC_ID, SY_ID, YEAR_BE]));
  if (v.__err) rec('DB: tb_estimate_acadyear', false, v.__err);
  else rec('DB: tb_estimate_acadyear บันทึก 1,850,000', v[0] && Math.abs(Number(v[0].ea_budget) - 1850000) < 0.5, v[0] ? m(v[0].ea_budget) : 'ไม่พบ');
}

// ════════════ E) เดินทางไปราชการ (แบบ 8708) ════════════
async function phaseTravel() {
  console.log('\n── E) ขอเบิกค่าเดินทางไปราชการ (8708) ──');
  const before = await db('SELECT COALESCE(SUM(amount),0) t FROM financial_transactions WHERE sc_id=? AND sy_id=? AND bg_type_id=9 AND type=-1 AND del=0', [SC_ID, SY_ID]);
  const add = await post('TravelReimbursement/add', {
    sc_id: SC_ID, sy_id: SY_ID, budget_year: YEAR_BE, requester_id: 101, requester_position: 'ครู',
    affiliation: 'โรงเรียนบ้านสุขสันต์', province: 'ขอนแก่น', purpose: 'ประชุมเชิงปฏิบัติการ',
    depart_date: '2026-02-10', return_date: '2026-02-12', total_days: 3, money_type_id: 9, evidence_count: 2,
    travelers: [{ name: 'นางนิภา ธันยพร', position: 'ครู', allowance: 1080, lodging: 1800, transport: 600, other: 0 }],
    note: 'gap-test', up_by: UP_BY,
  });
  rec('TravelReimbursement/add', add.ok && add.body?.flag !== false, short(add.body));
  const tr = await db('SELECT tr_id, status, total_amount FROM travel_reimbursement WHERE sc_id=? AND sy_id=? AND del=0 ORDER BY tr_id DESC LIMIT 1', [SC_ID, SY_ID]);
  const trId = tr[0]?.tr_id;
  rec('DB: travel_reimbursement สร้าง (ยอด 3,480)', !!trId, trId ? `tr_id=${trId} status=${tr[0].status} ยอด=${m(tr[0].total_amount)}` : 'ไม่พบ');
  if (!trId) return;

  const vf = await post('TravelReimbursement/verify', { tr_id: trId, verify_by: UP_BY, verify_name: 'การเงิน', verify_date: '2026-02-13', up_by: UP_BY });
  rec('TravelReimbursement/verify (การเงินตรวจ)', vf.ok && vf.body?.flag !== false, short(vf.body));
  const ap = await post('TravelReimbursement/approve', { tr_id: trId, approve_by: UP_BY, approve_name: 'ผอ.', approve_date: '2026-02-13', up_by: UP_BY });
  rec('TravelReimbursement/approve (ผอ.อนุมัติ)', ap.ok && ap.body?.flag !== false, short(ap.body));
  const ds = await post('TravelReimbursement/disburse', { tr_id: trId, receipt_date: '2026-02-14', type_offer_check: 1, up_by: UP_BY });
  rec('TravelReimbursement/disburse (จ่ายเงิน บค.)', ds.ok && ds.body?.flag !== false, short(ds.body));

  const after = await db('SELECT COALESCE(SUM(amount),0) t FROM financial_transactions WHERE sc_id=? AND sy_id=? AND bg_type_id=9 AND type=-1 AND del=0', [SC_ID, SY_ID]);
  const drop = Number(after[0].t) - Number(before[0].t);
  rec('จ่ายค่าเดินทางตัดยอดประเภทเงิน (FT type=-1)', drop > 0, `เพิ่มรายจ่าย ${m(drop)} (คาด 3,480)`);
}

// ════════════ F) บัญชีวัสดุ: รับเข้า + เบิกจ่ายออกไปใช้ ════════════
async function phaseSupplyStock() {
  console.log('\n── F) ลงทะเบียนบัญชีวัสดุ (รับเข้า) + เบิกจ่ายออกไปใช้ ──');
  // F1 รับเข้าสต็อก: editReceiveParcel → confirmWithDrawParcel(รับเข้า)
  const edit = await post('Supplie/editReceiveParcel', {
    receive_id: 0, order_id: 8, admin_id: 1, agent: 0, sc_id: SC_ID, title: 'gap-test รับวัสดุเข้าคลัง',
    sy_year: SY_ID, receive_date: '2026-06-15', cart: [{ supp_id: 1, receive: 100 }, { supp_id: 2, receive: 50 }], cart_receive_del: [],
  });
  rec('editReceiveParcel (สร้างใบรับพัสดุ)', edit.ok && edit.body?.flag === true, short(edit.body));
  const rcv = await db('SELECT receive_id FROM receive_parcel_order WHERE sc_id=? AND title LIKE ? AND del=0 ORDER BY receive_id DESC LIMIT 1', [SC_ID, 'gap-test%']);
  const receiveId = rcv[0]?.receive_id;
  const bal1Before = Number((await db('SELECT COALESCE(MAX(trans_id),0) mx, (SELECT trans_balance FROM tb_transaction_supplies WHERE supp_id=1 AND del=0 ORDER BY trans_id DESC LIMIT 1) bal', []))[0]?.bal || 0);

  const conf = await post('Supplie/confirmWithDrawParcel', {
    order: { receive_id: receiveId, receive_status: 2 },
    detail: [{ supp_id: 1, trans_in: 100, trans_out: 0 }, { supp_id: 2, trans_in: 50, trans_out: 0 }],
  });
  rec('confirmWithDrawParcel (ลงบัญชีวัสดุรับเข้า +100/+50)', conf.ok && conf.body?.flag === true, short(conf.body));
  const bal1After = Number((await db('SELECT trans_balance FROM tb_transaction_supplies WHERE supp_id=1 AND del=0 ORDER BY trans_id DESC LIMIT 1', []))[0]?.trans_balance || 0);
  rec('สต็อกวัสดุ#1 เพิ่มขึ้น 100', bal1After - bal1Before === 100, `ก่อน ${bal1Before} → หลัง ${bal1After}`);

  // F2 เบิกจ่ายออกไปใช้: SupplieRequest add → submit → approve → issue (trans_out)
  const req = await post('SupplieRequest/add', {
    sc_id: SC_ID, req_no: 'gap-เบิก/1', req_date: '2026-06-16', requester_id: 1, requester_name: 'ครูสมศรี',
    department: 'งานวิชาการ', purpose: 'ใช้ในการเรียนการสอน', up_by: UP_BY,
    details: [{ supp_id: 1, req_qty: 30 }, { supp_id: 2, req_qty: 20 }],
  });
  const reqId = req.body?.req_id;
  rec('SupplieRequest/add (ใบเบิกพัสดุ)', req.ok && !!reqId, short(req.body));
  if (!reqId) return;
  const sb = await post('SupplieRequest/submit', { req_id: reqId, up_by: UP_BY });
  rec('SupplieRequest/submit', sb.ok && sb.body?.flag !== false, short(sb.body));
  const apr = await post('SupplieRequest/approve', { req_id: reqId, up_by: UP_BY });
  rec('SupplieRequest/approve', apr.ok && apr.body?.flag !== false, short(apr.body));
  const dets = await db('SELECT rqd_id, supp_id, req_qty FROM supplie_request_detail WHERE req_id=? AND del=0 ORDER BY rqd_id', [reqId]);
  const issueDetails = dets.map((d) => ({ rqd_id: d.rqd_id, issued_qty: Number(d.req_qty) }));
  const iss = await post('SupplieRequest/issue', { req_id: reqId, up_by: UP_BY, details: issueDetails });
  rec('SupplieRequest/issue (จ่ายวัสดุออก trans_out)', iss.ok && iss.body?.flag !== false, short(iss.body));
  const bal1Issue = Number((await db('SELECT trans_balance FROM tb_transaction_supplies WHERE supp_id=1 AND del=0 ORDER BY trans_id DESC LIMIT 1', []))[0]?.trans_balance || 0);
  rec('สต็อกวัสดุ#1 ลดลง 30 หลังเบิก', bal1After - bal1Issue === 30, `หลังรับ ${bal1After} → หลังเบิก ${bal1Issue}`);
  const out = await db("SELECT trans_out FROM tb_transaction_supplies WHERE supp_id=1 AND trans_out>0 AND del=0 ORDER BY trans_id DESC LIMIT 1", []);
  rec('บันทึกรายการจ่ายวัสดุ (trans_out=30)', out[0] && Number(out[0].trans_out) === 30, out[0] ? `trans_out=${out[0].trans_out}` : 'ไม่พบ');
}

// ════════════ G) รายงานเงินคงเหลือประจำวัน ════════════
async function phaseDaily() {
  console.log('\n── G) รายงานเงินคงเหลือประจำวัน ──');
  const date = '2025-11-23';
  const r = await get(`ReportDailyBalance/loadDailyBalance/${SC_ID}/${date}/${SY_ID}`);
  const body = r.body;
  const rows = Array.isArray(body) ? body : (body?.data || []);
  rec('loadDailyBalance คืนข้อมูล', r.ok && Array.isArray(rows) && rows.length > 0, `วันที่ ${date} พบ ${rows.length} ประเภท`);
  // ตรวจว่ายอดคงเหลือรวมยอดยกมา (carry_forward) ไม่เป็น 0/ติดลบทั้งหมด
  const withCarry = rows.filter((x) => Number(x.carry_forward ?? x.carryForward ?? 0) > 0);
  rec('ยอดยกมา (carry_forward) ถูกนำมารวม', withCarry.length > 0, `ประเภทที่มียอดยกมา > 0: ${withCarry.length}`);
  const totalBal = rows.reduce((s, x) => s + Number(x.balance ?? x.total_balance ?? 0), 0);
  rec('ยอดคงเหลือรวมเป็นบวก/สมเหตุผล', totalBal > 0, `คงเหลือรวม ≈ ${m(totalBal)}`);
  // โชว์ 3 แถวแรก
  rows.slice(0, 4).forEach((x) => console.log(`     ${(x.budget_type || x.budget_type_name || x.bg_type_id)}: ยกมา ${m(x.carry_forward ?? x.carryForward ?? 0)} รับ ${m(x.income ?? 0)} จ่าย ${m(x.expense ?? 0)} คงเหลือ ${m(x.balance ?? x.total_balance ?? 0)}`));

  const print = await get(`ReportDailyBalance/printDailyBalanceReport/${SC_ID}/${date}/${SY_ID}`);
  rec('printDailyBalanceReport (พิมพ์รายงาน)', print.ok && print.status < 400, `status=${print.status}`);
}

// ════════════ H) ปิดบัญชีสิ้นปี ════════════
async function phaseYearEndClose() {
  console.log('\n── H) ปิดบัญชีสิ้นปีงบประมาณ 2569 ──');
  // ดึงยอดคงเหลือแต่ละประเภทจากทะเบียนคุม มาเป็นยอดปิดปี
  const balances = [];
  for (const t of [2, 4, 9, 13, 8]) {
    const r = await get(`Register_control_money_type/load_register_control_money_type/${t}/${SC_ID}/${SY_ID}/${YEAR}`);
    const tx = r.body?.data?.[0]?.transaction || [];
    const bal = tx.length ? Number(tx[tx.length - 1].balance) : Number(r.body?.carry_forward || 0);
    balances.push({ money_type_id: t, cash_balance: 0, bank_balance: bal, smp_balance: 0 });
  }
  const bulk = await post('FiscalYearBalance/saveBulkBalances', {
    sc_id: SC_ID, budget_year: YEAR_BE, closing_date: '2026-09-30', closed_by: UP_BY,
    balances, note: 'gap-test ปิดปี 2569', up_by: UP_BY,
  });
  rec('FiscalYearBalance/saveBulkBalances (บันทึกยอดสิ้นปี 5 ประเภท)', bulk.ok && bulk.body?.flag !== false, short(bulk.body));
  const v = await db("SELECT COUNT(*) c FROM fiscal_year_balance WHERE sc_id=? AND budget_year=? AND del=0", [SC_ID, YEAR_BE]);
  rec('DB: fiscal_year_balance บันทึก', Number(v[0].c) >= 5, `แถว ${v[0].c}`);

  const fin = await post('FiscalYearBalance/finalizeYear', { sc_id: SC_ID, budget_year: YEAR_BE, signed_by: UP_BY, note: 'gap-test ลงนามปิดปี' });
  // finalizeYear อาจถูกบล็อกถ้ายังมีเงินยืม/ยืมค้าง (status=1) — ทดสอบทั้งสองกรณี
  const openLoans = await db('SELECT COUNT(*) c FROM loan_agreement WHERE sc_id=? AND sy_id=? AND status=1 AND del=0', [SC_ID, SY_ID]);
  if (fin.body?.flag === false || fin.status >= 400) {
    rec('finalizeYear บล็อกเมื่อมีเงินยืมค้าง (ถูกต้องตามหลัก)', Number(openLoans[0].c) > 0, `ยืมค้าง ${openLoans[0].c} รายการ → ${short(fin.body)}`);
  } else {
    rec('finalizeYear ปิดปีสำเร็จ', fin.ok, short(fin.body));
    const isFinal = await db("SELECT COUNT(*) c FROM fiscal_year_balance WHERE sc_id=? AND budget_year=? AND is_final=1 AND del=0", [SC_ID, YEAR_BE]);
    rec('ยอดสิ้นปีถูกล็อก is_final=1', Number(isFinal[0].c) >= 5, `is_final ${isFinal[0].c}`);
  }
}

// ════════════ I) งบเทียบยอดธนาคาร ════════════
async function phaseReconcile() {
  console.log('\n── I) งบเทียบยอดธนาคาร (reconciliation) ──');
  const co = await post('BankReconciliation/createOrUpdate', {
    sc_id: SC_ID, ba_id: 1, recon_month: '2026-06', book_balance: 100000, bank_statement_balance: 105000, note: 'gap-test', up_by: UP_BY,
  });
  rec('BankReconciliation/createOrUpdate', co.ok && co.body?.flag !== false, short(co.body));
  const br = await db("SELECT br_id, difference, is_balanced FROM bank_reconciliation WHERE sc_id=? AND ba_id=1 AND recon_month='2026-06' AND del=0 ORDER BY br_id DESC LIMIT 1", [SC_ID]);
  const brId = br[0]?.br_id;
  rec('สร้างงบเทียบยอด (ผลต่าง 5,000 ก่อนปรับ)', !!brId, brId ? `br_id=${brId} ผลต่าง=${m(br[0].difference)} balanced=${br[0].is_balanced}` : 'ไม่พบ');
  if (!brId) return;
  // เพิ่มรายการเช็คค้างจ่าย 5,000 (item_type=1 หัก) → ปรับให้ตรง
  const item = await post('BankReconciliation/addItem', { br_id: brId, item_type: 1, doc_ref: 'บจ.20/2569', detail: 'เช็คค้างจ่ายยังไม่ขึ้นเงิน', amount: 5000, up_by: UP_BY });
  rec('addItem เช็คค้างจ่าย 5,000', item.ok && item.body?.flag !== false, short(item.body));
  const br2 = await db("SELECT difference, is_balanced FROM bank_reconciliation WHERE br_id=?", [brId]);
  rec('หลังปรับรายการ → ยอดตรง (is_balanced=1)', br2[0] && Number(br2[0].is_balanced) === 1 && Math.abs(Number(br2[0].difference)) < 0.01, `ผลต่าง=${m(br2[0].difference)} balanced=${br2[0].is_balanced}`);
  const so = await post('BankReconciliation/signOff', { br_id: brId, signed_by: UP_BY, note: 'ผอ.ลงนาม' });
  rec('signOff (ลงนามล็อกงบเทียบยอด)', so.ok && so.body?.flag !== false, short(so.body));
}

// ════════════ J) รายงานสรุปสิ้นปี ════════════
async function phaseYearEndReport() {
  console.log('\n── J) รายงานสรุปสิ้นปี ──');
  const ru = await get(`YearEndReport/receiptUsage/${SC_ID}/${SY_ID}/${YEAR_BE}`);
  rec('YearEndReport/receiptUsage', ru.ok && ru.status < 400, short(ru.body));
  const sr = await get(`YearEndReport/schoolRevenue/${SC_ID}/${SY_ID}/${YEAR_BE}`);
  rec('YearEndReport/schoolRevenue', sr.ok && sr.status < 400, short(sr.body));
}

(async () => {
  await L.login();
  console.log(`gap-test เริ่ม · SC=${SC_ID} SY=${SY_ID} YEAR=${YEAR}/${YEAR_BE}`);
  for (const p of [phaseStudent, phasePerhead, phasePrevBalance, phaseEstimate, phaseTravel, phaseSupplyStock, phaseDaily, phaseYearEndClose, phaseReconcile, phaseYearEndReport]) {
    try { await p(); } catch (e) { rec(`${p.name} CRASH`, false, e.message); }
  }
  console.log('\n════════ สรุป gap-test ════════');
  const pass = results.filter((r) => r.ok).length;
  console.log(`ผ่าน ${pass}/${results.length} ขั้นตอน`);
  console.log(`\n🐞 ไม่ผ่าน/ข้อสังเกต (${bugs.length}):`);
  bugs.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
  if (!bugs.length) console.log('  — ไม่พบ —');
})().catch((e) => { console.error('💥', e); process.exit(1); });
