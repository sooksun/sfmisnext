// gap-test3.js — verify หลังแก้ bug: travel เต็ม workflow + รับวัสดุเข้าสต็อก (confirm)
process.env.SFMIS_TEST_SY_ID = '2';
process.env.SFMIS_TEST_BUDGET_YEAR_CE = '2026';
process.env.SFMIS_TEST_BUDGET_YEAR_BE = '2569';
const L = require('./lib');
const { SC_ID, SY_ID, BUDGET_YEAR_BE: YEAR_BE, UP_BY, post, get, db, m } = L;
const results = [], bugs = [];
function rec(s, ok, d) { results.push({ ok: !!ok }); console.log(`${ok ? '✅' : '❌'} ${s}${d ? '  — ' + d : ''}`); if (!ok) bugs.push(`${s}: ${d}`); }
const short = (b) => (typeof b === 'string' ? b : JSON.stringify(b)).slice(0, 200);

async function travel() {
  console.log('\n── E3) เดินทางไปราชการ: ขับ workflow 10→11→12→2 + FT ──');
  // สร้างใบใหม่เพื่อความชัดเจน (จ่ายด้วยเงินรายได้สถานศึกษา mt=9)
  const mt = 9;
  const before = Number((await db('SELECT COALESCE(SUM(amount),0) s FROM financial_transactions WHERE sc_id=? AND sy_id=? AND bg_type_id=? AND type=-1 AND del=0', [SC_ID, SY_ID, mt]))[0].s);
  const add = await post('TravelReimbursement/add', {
    sc_id: SC_ID, sy_id: SY_ID, budget_year: YEAR_BE, requester_id: 102, requester_position: 'ครู',
    affiliation: 'รร.บ้านสุขสันต์', province: 'อุดรธานี', purpose: 'อบรมหลักสูตร', depart_date: '2026-03-01', return_date: '2026-03-02',
    total_days: 2, money_type_id: mt, evidence_count: 1,
    travelers: [{ name: 'นายสุชาติ', position: 'ครู', allowance: 720, lodging: 800, transport: 500, other: 0 }], up_by: UP_BY,
  });
  rec('add (ยอด 2,020)', add.ok && add.body?.flag !== false, short(add.body));
  const t = (await db("SELECT tr_id,status,grand_total FROM travel_reimbursement WHERE sc_id=? AND sy_id=? AND del=0 ORDER BY tr_id DESC LIMIT 1", [SC_ID, SY_ID]))[0];
  const vf = await post('TravelReimbursement/verify', { tr_id: t.tr_id, verify_by: UP_BY, verify_date: '2026-03-03', up_by: UP_BY });
  rec('verify → status 11', vf.ok && vf.body?.flag !== false, short(vf.body));
  const ap = await post('TravelReimbursement/approve', { tr_id: t.tr_id, approve_by: UP_BY, approve_date: '2026-03-03', up_by: UP_BY });
  rec('approve → status 12', ap.ok && ap.body?.flag !== false, short(ap.body));
  const ds = await post('TravelReimbursement/disburse', { tr_id: t.tr_id, receipt_date: '2026-03-04', type_offer_check: 1, up_by: UP_BY });
  rec('disburse → จ่ายเงิน บค.', ds.ok && ds.body?.flag !== false, short(ds.body));
  const after = Number((await db('SELECT COALESCE(SUM(amount),0) s FROM financial_transactions WHERE sc_id=? AND sy_id=? AND bg_type_id=? AND type=-1 AND del=0', [SC_ID, SY_ID, mt]))[0].s);
  const st = (await db('SELECT status, bc_no, ft_pay_id FROM travel_reimbursement WHERE tr_id=?', [t.tr_id]))[0];
  rec('จ่ายแล้ว status=2 + FT type=-1 ตัดยอด 2,020', Number(st.status) === 2 && Math.abs((after - before) - Number(t.grand_total)) < 0.01,
    `รายจ่ายเพิ่ม ${m(after - before)} (ยอด ${m(t.grand_total)}) status=${st.status} บค=${st.bc_no} ft=${st.ft_pay_id}`);
}

async function supplyReceive() {
  console.log('\n── F3) รับวัสดุเข้าสต็อก (confirm) หลังแก้ bug sc_id ──');
  const edit = await post('Supplie/editReceiveParcel', {
    receive_id: 0, order_id: 9, admin_id: 1, agent: 0, sc_id: SC_ID, title: 'gap3 รับวัสดุเข้าคลัง',
    sy_year: SY_ID, receive_date: '2026-06-18', cart: [{ supp_id: 3, receive: 200 }], cart_receive_del: [],
  });
  rec('editReceiveParcel', edit.ok && edit.body?.flag === true, short(edit.body));
  const receiveId = (await db("SELECT receive_id FROM receive_parcel_order WHERE sc_id=? AND title='gap3 รับวัสดุเข้าคลัง' AND del=0 ORDER BY receive_id DESC LIMIT 1", [SC_ID]))[0]?.receive_id;
  const bal = async (sid) => Number((await db('SELECT trans_balance FROM tb_transaction_supplies WHERE supp_id=? AND del=0 ORDER BY trans_id DESC LIMIT 1', [sid]))[0]?.trans_balance || 0);
  const before = await bal(3);
  const conf = await post('Supplie/confirmWithDrawParcel', { order: { receive_id: receiveId, receive_status: 2 }, detail: [{ supp_id: 3, trans_in: 200, trans_out: 0 }] });
  rec('confirmWithDrawParcel (หลังแก้ → ไม่ 500)', conf.ok && conf.body?.flag === true, short(conf.body));
  const after = await bal(3);
  rec('สต็อกวัสดุ#3 เพิ่ม +200', after - before === 200, `${before} → ${after}`);
}

(async () => {
  await L.login();
  for (const p of [travel, supplyReceive]) { try { await p(); } catch (e) { rec(`${p.name} CRASH`, false, e.message); } }
  console.log('\n════════ สรุป gap-test3 ════════');
  console.log(`ผ่าน ${results.filter(r => r.ok).length}/${results.length}`);
  bugs.forEach((b, i) => console.log(`  🐞 ${i + 1}. ${b}`));
})().catch((e) => { console.error('💥', e); process.exit(1); });
