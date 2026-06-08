// E2E test: สร้าง 3 โครงการ → ไล่ workflow จัดซื้อจัดจ้างตั้งแต่ต้นจนจบ ผ่าน API จริง
// รายงานความถูกต้องและ bug ที่พบ
const BASE = 'http://localhost:3000/api'
let TOKEN = ''
const report = []
const bugs = []
function log(step, ok, detail) {
  report.push({ step, ok, detail })
  console.log(`${ok ? '✅' : '❌'} ${step}${detail ? ' — ' + detail : ''}`)
  if (!ok) bugs.push(`${step}: ${detail}`)
}
async function api(path, body, method = 'POST') {
  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
  })
  let json = null
  try { json = await res.json() } catch { json = null }
  return { status: res.status, json }
}

const SC = 1, SY = 2, YEAR = 2569, ADMIN = 1
const RUN = Date.now().toString().slice(-5) // suffix กันชื่อซ้ำในแต่ละรอบทดสอบ
const RECORDS = [
  { name: 'ทดสอบ E2E ซื้อวัสดุสำนักงาน #1', budget: 5000, type: 1, method: 3,
    mode: 'add',    items: [{ supp_id: 1, pc_total: 10 }, { supp_id: 2, pc_total: 20 }] },
  { name: 'ทดสอบ E2E ซื้อวัสดุคอมพิวเตอร์ #2', budget: 8000, type: 1, method: 3,
    mode: 'import', items: [{ supp_no:'', supp_name:'กระดาษ A4 70 แกรม', qty:5, price:110, unit:'รีม' },
                            { supp_no:'', supp_name:'หมึกพิมพ์ทดสอบใหม่ E2E', qty:2, price:900, unit:'กล่อง' }] },
  { name: 'ทดสอบ E2E จ้างเหมาบริการ #3', budget: 12000, type: 2, method: 3,
    mode: 'add',    items: [{ supp_id: 4, pc_total: 1 }] },
]

async function login() {
  const r = await api('B_admin/login', { email: 'admin_local', password: 'Admin@123' })
  TOKEN = r.json?.access_token || ''
  log('LOGIN', !!TOKEN, TOKEN ? `admin=${r.json.data.admin_id} sc=${r.json.data.sc_id}` : JSON.stringify(r.json))
}

async function findOrder(projName) {
  const r = await api(`Project_approve/loadProjectApprove/${SC}/${YEAR}`, null, 'GET')
  const list = Array.isArray(r.json) ? r.json : (r.json?.data || [])
  // เอา order ล่าสุดที่ details ตรงกับชื่อโครงการ
  const match = list.filter((o) => o.details === projName).sort((a, b) => b.order_id - a.order_id)
  return match[0] || null
}

async function runRecord(rec, idx) {
  console.log(`\n━━━━━━ รายการที่ ${idx + 1}: ${rec.name} (งบ ${rec.budget}) ━━━━━━`)
  const tag = `R${idx + 1}`

  // 1) สร้างโครงการ (auto สร้าง parcel_order status=1)
  rec.name = `${rec.name} [${RUN}]`
  const add = await api('Project/addProject', {
    proj_name: rec.name, proj_budget: rec.budget, sc_id: SC, sy_id: SY, up_by: ADMIN,
  })
  log(`${tag} 1.สร้างโครงการ`, add.json?.flag === true, add.json?.ms || JSON.stringify(add.json))
  if (!add.json?.flag) return

  // 2) หา order_id ที่เพิ่งสร้าง
  const order = await findOrder(rec.name)
  log(`${tag} 2.พบ parcel_order`, !!order, order ? `order_id=${order.order_id} status=${order.order_status} acad=${order.acad_year}` : 'ไม่พบ order')
  if (!order) return
  const oid = order.order_id
  if (order.order_status !== 1) bugs.push(`${tag}: order เริ่มต้นสถานะ ${order.order_status} (คาดหวัง 1)`)
  if (Number(order.acad_year) !== YEAR) bugs.push(`${tag}: acad_year=${order.acad_year} ไม่ตรงปีงบ ${YEAR}`)

  // 3) ตั้งประเภท/วิธี/วงเงิน
  const upd = await api('Project_approve/updateParcelOrder', {
    order_id: oid, project_type: rec.type, method_type: rec.method, budgets: rec.budget, up_by: ADMIN,
  })
  log(`${tag} 3.ตั้งประเภท/วิธีจัดหา`, upd.json?.flag === true, upd.json?.ms || '')

  // 4) เพิ่มรายการพัสดุ
  if (rec.mode === 'add') {
    let okAll = true, msg = []
    for (const it of rec.items) {
      const r = await api('Project_approve/addParcelDetail', { order_id: oid, supp_id: it.supp_id, pc_total: it.pc_total })
      if (r.json?.flag !== true) { okAll = false; msg.push(JSON.stringify(r.json)) }
    }
    log(`${tag} 4.เพิ่มพัสดุ (addParcelDetail ×${rec.items.length})`, okAll, msg.join('; '))
  } else {
    const r = await api('Project_approve/importParcelDetails', { order_id: oid, up_by: ADMIN, items: rec.items })
    const j = r.json || {}
    log(`${tag} 4.นำเข้าพัสดุ (importParcelDetails)`, j.flag === true,
      `added=${j.added} สร้างพัสดุใหม่=${j.created_supplies} สร้างหน่วย=${j.created_units} errors=${JSON.stringify(j.errors||[])}`)
  }

  // 5) ไล่อนุมัติ 4 ขั้น: แผน(2) → การเงิน(3) → พัสดุ(4) → ผอ.(5)
  const stages = [
    ['approveParcelByPlan', 2, '5.1 อนุมัติแผนงาน'],
    ['approveParcelByBusiness', 3, '5.2 อนุมัติการเงิน'],
    ['approveParcelBySupplie', 4, '5.3 อนุมัติพัสดุ (ตรวจ compliance)'],
    ['approveParcelByCeo', 5, '5.4 อนุมัติ ผอ.'],
  ]
  for (const [ep, st, label] of stages) {
    const r = await api(`Project_approve/${ep}`, { order_id: oid, order_status: st, remark: 'E2E test', remark_cf: '' })
    const ok = r.json?.flag === true
    if (r.status !== 200 && ok) bugs.push(`${tag} ${ep}: คืน HTTP ${r.status} (ควรเป็น 200 ตาม convention)`)
    log(`${tag} ${label}`, ok, ok ? `HTTP ${r.status} → status ${st}` : `HTTP ${r.status} ${JSON.stringify(r.json)}`)
    if (!ok) break
  }

  // ตรวจสถานะสุดท้ายว่าไปถึง 5 (ผ่าน ผอ.) จริง
  const after = await findOrder(rec.name)
  log(`${tag} 5.x สถานะหลังอนุมัติครบ`, after?.order_status >= 5, `order_status=${after?.order_status} (คาดหวัง ≥5)`)

  // 6) ตั้งคณะกรรมการตรวจรับ
  const com = await api('Audit_committee/updateSetCommittee', {
    order_id: oid, committee1: 101, committee2: 102, committee3: 0,
    order_status: 5, p_id: 1, day_deadline: 15, date_deadline: '2026-07-01', remark: '',
  })
  log(`${tag} 6.ตั้งกรรมการตรวจรับ`, com.json?.flag === true, com.json?.ms || JSON.stringify(com.json))

  // 7) โหลดข้อมูลพิมพ์เอกสาร + ตรวจความถูกต้อง
  const pr = await api(`Project_approve/loadOrderForPrint/${oid}`, null, 'GET')
  const d = pr.json
  if (!d) { log(`${tag} 7.โหลดเอกสารพิมพ์`, false, 'null'); return }
  const itemsOk = Array.isArray(d.items) && d.items.length > 0
  const priceOk = d.items?.every((it) => typeof it.supp_price === 'number' && typeof it.amount === 'number')
  const comOk = Array.isArray(d.committee) && d.committee.length >= 1
  const partnerOk = !!d.partner
  log(`${tag} 7.ข้อมูลพิมพ์เอกสาร`, itemsOk && priceOk,
    `items=${d.items?.length} ราคาครบ=${priceOk} committee=${JSON.stringify(d.committee)} partner=${d.partner?.p_name||'-'} ผอ=${d.director_name||'-'} school=${d.school_name||'-'}`)
  if (!comOk) bugs.push(`${tag}: committee ว่างใน loadOrderForPrint`)
  if (!partnerOk) bugs.push(`${tag}: partner ไม่ผูกใน loadOrderForPrint (suppliers ไม่ถูกตั้งตอนตั้งกรรมการ?)`)

  return oid
}

;(async () => {
  await login()
  if (!TOKEN) { console.log('หยุด: login ไม่สำเร็จ'); return }
  const ids = []
  for (let i = 0; i < RECORDS.length; i++) ids.push(await runRecord(RECORDS[i], i))

  console.log('\n════════════ สรุปผล ════════════')
  const pass = report.filter((r) => r.ok).length
  console.log(`ผ่าน ${pass}/${report.length} ขั้นตอน | order_ids=${JSON.stringify(ids.filter(Boolean))}`)
  console.log(`\n🐞 BUG/ข้อสังเกต (${bugs.length}):`)
  bugs.forEach((b, i) => console.log(`  ${i + 1}. ${b}`))
  if (!bugs.length) console.log('  — ไม่พบ bug —')
})()
