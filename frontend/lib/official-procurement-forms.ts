/**
 * แบบฟอร์มเอกสารจัดซื้อจัดจ้าง (พ.ร.บ.การจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ.2560)
 * อ้างอิงแบบฟอร์มราชการจริง 2 ชุด: 01ซื้อ (16 ฉบับ) / 02จ้าง (14 ฉบับ)
 *
 * แต่ละฟอร์มรับ OrderPrintData (จาก GET Project_approve/loadOrderForPrint/:order_id)
 * แล้วคืน { title, body } เพื่อส่งเข้า openPrintWindow()
 *
 * - พิมพ์ทีละฉบับผ่าน PROCUREMENT_FORMS (ปุ่มในจอ procurement-docs)
 * - พิมพ์ทั้งชุดต่อหน้ากันด้วย buildAllForms() (ปุ่ม "พิมพ์ทั้งหมด")
 */
import {
  makeHeader,
  makeTable,
  makeSignatures,
  numberToThaiBaht,
  fmtBaht,
  thaiFullDate,
  esc,
} from './print-utils'
import { KRUT_EMBLEM } from './krut-emblem'

// ── ชนิดข้อมูล ────────────────────────────────────────────────────────────────

/** ParcelOrder (raw จาก backend, camelCase) — เก็บเฉพาะ field ที่ฟอร์มใช้ */
export interface OrderRaw {
  orderId: number
  projectType?: number | null
  methodType?: number | null
  methodReason?: string | null
  budgets?: number | null
  details?: string | null
  numbers?: number | null
  buyReason?: string | null
  buyDate?: string | null
  operateDate?: string | null
  bookOrderCommittee?: string | null
  dateOrderCommittee?: string | null
  bookReportNumber?: string | null
  dateBookReport?: string | null
  presentCost?: number | null
  dateWin?: string | null
  numberOrders?: string | null
  ordersDate?: string | null
  dueOrdersDate?: string | null
  acadYear?: number | null
}

export interface OrderItem {
  pc_id: number
  supp_id: number | null
  supp_name: string
  pc_total: number
  supp_price?: number
  amount?: number
}

export interface OrderPrintData {
  order: OrderRaw
  items: OrderItem[]
  committee: string[]
  partner: {
    p_id: number
    p_name: string
    p_address?: string
    p_tel?: string
    p_tax_id?: string
    /** 1 = คำนวณ VAT, 0 = ไม่คำนวณ (บุคคลธรรมดา/ไม่จด VAT), 2 = บุคคลภายใน */
    cal_vat?: number
  } | null
  project_name: string
  school_name: string
  school_address?: string
  school_tel?: string
  director_name?: string
}

export interface BuiltForm {
  title: string
  body: string
}

export interface ProcurementForm {
  key: string
  label: string
  build: (d: OrderPrintData) => BuiltForm
}

// ── Helpers พื้นฐาน ──────────────────────────────────────────────────────────────

const PROJECT_TYPE: Record<number, string> = { 1: 'ซื้อ', 2: 'จ้าง' }
const METHOD_TYPE: Record<number, string> = {
  1: 'วิธีประกาศเชิญชวนทั่วไป (e-bidding)',
  2: 'วิธีคัดเลือก',
  3: 'วิธีเฉพาะเจาะจง',
  4: 'วิธีตลาดอิเล็กทรอนิกส์',
}

/** ซื้อ/จ้าง (กริยาสั้น) */
const verb = (d: OrderPrintData) => PROJECT_TYPE[Number(d.order.projectType) || 1] ?? 'ซื้อ'
/** จัดซื้อ/จัดจ้าง */
const verbN = (d: OrderPrintData) => 'จัด' + verb(d)
/** ผู้ขาย/ผู้รับจ้าง */
const sellerWord = (d: OrderPrintData) => (verb(d) === 'จ้าง' ? 'ผู้รับจ้าง' : 'ผู้ขาย')
const methodWord = (d: OrderPrintData) => METHOD_TYPE[Number(d.order.methodType) || 3] ?? METHOD_TYPE[3]
const amount = (d: OrderPrintData) => Number(d.order.budgets ?? 0)
const sc = (d: OrderPrintData) => d.school_name || 'โรงเรียน'
const proj = (d: OrderPrintData) => d.project_name || d.order.details || '-'
const baht = (n: number) => `${fmtBaht(n)} บาท (${numberToThaiBaht(Number(n) || 0)})`

/** แยกยอดสุทธิ/ภาษี จากยอดรวม (รวม VAT 7%) */
function netVat(total: number) {
  const net = Math.round((total / 1.07) * 100) / 100
  const vat = Math.round((total - net) * 100) / 100
  return { net, vat, total }
}

/** ผู้ขาย/ผู้รับจ้างรายนี้ต้องแยก VAT หรือไม่ (cal_vat = 0 → ไม่จด VAT เช่น บุคคลธรรมดา) */
function hasVat(d: OrderPrintData): boolean {
  return d.partner?.cal_vat !== 0
}

/** จำนวนวันส่งมอบ คำนวณจากวันที่ใบสั่งซื้อ → วันครบกำหนด (ไม่มีข้อมูล → null) */
function deliveryDays(d: OrderPrintData): number | null {
  const a = d.order.ordersDate ? new Date(d.order.ordersDate) : null
  const b = d.order.dueOrdersDate ? new Date(d.order.dueOrdersDate) : null
  if (!a || !b || isNaN(+a) || isNaN(+b)) return null
  const days = Math.round((+b - +a) / 86_400_000)
  return days > 0 ? days : null
}

/** ข้อความจำนวนวันส่งมอบ (ตัวเลข หรือจุดไข่ปลาให้กรอกมือ) */
function deliveryDaysText(d: OrderPrintData): string {
  const n = deliveryDays(d)
  return n ? String(n) : DOT
}

/** บล็อกข้อมูลผู้ขาย/ผู้รับจ้าง (ชื่อ ที่อยู่ โทร เลขผู้เสียภาษี) */
function partnerInfo(d: OrderPrintData): string {
  const p = d.partner
  if (!p) return `${esc(sellerWord(d))} ${DOTLONG}`
  return (
    `<b>${esc(sellerWord(d))}</b> ${esc(p.p_name)}` +
    (p.p_address ? `<br/><b>ที่อยู่</b> ${esc(p.p_address)}` : '') +
    (p.p_tel ? `<br/><b>โทรศัพท์</b> ${esc(p.p_tel)}` : '') +
    (p.p_tax_id ? `<br/><b>เลขประจำตัวผู้เสียภาษี</b> ${esc(p.p_tax_id)}` : '')
  )
}

const DOT = '...................................'
const DOTLONG = '............................................................'

/** ตราครุฑกลางหน้า (heightMm = ความสูงเป็นมิลลิเมตร) */
function krut(heightMm = 14): string {
  return `<div class="center" style="margin:0 0 2pt 0"><img src="${KRUT_EMBLEM}" alt="ครุฑ" style="height:${heightMm}mm;width:auto" /></div>`
}

/** หัวกระดาษบันทึกข้อความ (ส่วนราชการ / ที่ / วันที่ / เรื่อง / เรียน) */
function memoHead(args: {
  d: OrderPrintData
  no?: string | null
  date?: string | null
  subject: string
}): string {
  const { d, no, date, subject } = args
  return `
<div style="position:relative;min-height:15mm;margin:0 0 2pt 0">
  <img src="${KRUT_EMBLEM}" alt="ครุฑ" style="position:absolute;left:0;bottom:0;height:15mm;width:auto" />
  <h1 style="text-align:center;font-size:29pt;font-weight:bold;margin:0;padding-top:3mm;line-height:35pt">บันทึกข้อความ</h1>
</div>
<p style="margin:1pt 0;line-height:1.25"><b>ส่วนราชการ</b>&nbsp;&nbsp;${esc(sc(d))}</p>
<p style="margin:1pt 0;line-height:1.25;display:flex;justify-content:space-between">
  <span><b>ที่</b>&nbsp;&nbsp;${esc(no || DOT)}</span>
  <span><b>วัน เดือนปี</b>&nbsp;&nbsp;${date ? esc(thaiFullDate(date)) : DOT}</span>
</p>
<p style="margin:1pt 0;line-height:1.25"><b>เรื่อง</b>&nbsp;&nbsp;${esc(subject)}</p>
<p style="margin:1pt 0 6pt 0;line-height:1.25"><b>เรียน</b>&nbsp;&nbsp;ผู้อำนวยการ${esc(sc(d))}</p>`
}

/** หัวกระดาษคำสั่งโรงเรียน */
function orderHead(args: { d: OrderPrintData; no?: string | null; subject: string }): string {
  const { d, no, subject } = args
  return `
${krut(20)}
<div class="center" style="margin-bottom:4pt;line-height:1.25">
  <h1 style="font-size:18pt;margin:0">คำสั่ง${esc(sc(d))}</h1>
  <div>ที่&nbsp;&nbsp;${esc(no || DOT)}</div>
  <div style="margin-top:2pt">เรื่อง&nbsp;&nbsp;${esc(subject)}</div>
</div>
<hr style="border:none;border-top:1px solid #000;width:40%;margin:3pt auto 6pt auto" />`
}

/** หัวกระดาษประกาศโรงเรียน */
function announceHead(args: { d: OrderPrintData; subject: string }): string {
  const { d, subject } = args
  return `
${krut(20)}
<div class="center" style="margin-bottom:4pt;line-height:1.25">
  <h1 style="font-size:18pt;margin:0">ประกาศ${esc(sc(d))}</h1>
  <div style="margin-top:2pt">เรื่อง&nbsp;&nbsp;${esc(subject)}</div>
  <div style="margin-top:2pt">----------------------------------------</div>
</div>`
}

/** ตารางรายการพัสดุพร้อมราคา + ยอดรวม/ภาษี/สุทธิ */
function itemsPriceTable(d: OrderPrintData): string {
  const total = amount(d)
  const vatOn = hasVat(d)
  const { net, vat } = vatOn ? netVat(total) : { net: total, vat: 0 }
  if (!d.items.length) {
    return `<table>
  <thead><tr><th style="width:8%">ลำดับ</th><th>รายการ</th><th style="width:30%" class="num">จำนวนเงิน (บาท)</th></tr></thead>
  <tbody>
    <tr><td class="center">1</td><td>${esc(proj(d))}</td><td class="num">${fmtBaht(total)}</td></tr>
    <tr><td colspan="2" class="right">รวมจำนวนเงินทั้งสิ้น (${esc(numberToThaiBaht(total))})</td><td class="num">${fmtBaht(total)}</td></tr>
  </tbody>
</table>`
  }
  const rows = d.items
    .map(
      (it, i) => `<tr>
    <td class="center">${i + 1}</td>
    <td>${esc(it.supp_name || `รายการ #${it.supp_id ?? ''}`)}</td>
    <td class="center">${it.pc_total?.toLocaleString() ?? ''}</td>
    <td class="num">${it.supp_price ? fmtBaht(it.supp_price) : ''}</td>
    <td class="num">${it.amount ? fmtBaht(it.amount) : ''}</td>
  </tr>`,
    )
    .join('')
  return `<table>
  <thead><tr>
    <th style="width:8%">ลำดับ</th><th>รายการ</th>
    <th style="width:12%">จำนวน</th>
    <th style="width:18%" class="num">ราคา/หน่วย</th>
    <th style="width:20%" class="num">จำนวนเงิน</th>
  </tr></thead>
  <tbody>
    ${rows}
    <tr><td colspan="4" class="right">รวมเงิน</td><td class="num">${fmtBaht(net)}</td></tr>
    <tr><td colspan="4" class="right">ภาษีมูลค่าเพิ่ม${vatOn ? ' 7%' : ''}</td><td class="num">${vatOn ? fmtBaht(vat) : '-'}</td></tr>
    <tr><td colspan="4" class="right"><b>รวมจำนวนเงินทั้งสิ้น</b> (${esc(numberToThaiBaht(total))})</td><td class="num"><b>${fmtBaht(total)}</b></td></tr>
  </tbody>
</table>`
}

/** ตารางรายชื่อคณะกรรมการ (ลำดับ / ชื่อ / ตำแหน่งในคณะกรรมการ) */
function committeeListTable(d: OrderPrintData): string {
  const names = d.committee.length ? d.committee : ['', '', '']
  const rows = names
    .map(
      (n, i) => `<tr>
    <td class="center">${i + 1}</td>
    <td>${esc(n || DOT)}</td>
    <td class="center">${i === 0 ? 'ประธานกรรมการ' : 'กรรมการ'}</td>
  </tr>`,
    )
    .join('')
  return `<table>
  <thead><tr><th style="width:10%">ลำดับ</th><th>รายชื่อ</th><th style="width:35%">ตำแหน่งในคณะกรรมการ</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`
}

/** ช่องลงนามคณะกรรมการแบบเรียงแนวตั้ง พร้อมชื่อในวงเล็บ */
function committeeSignColumn(d: OrderPrintData, prefix = 'กรรมการ'): string {
  const names = d.committee.length ? d.committee : ['', '', '']
  return names
    .map((n, i) => {
      const role = i === 0 ? 'ประธานกรรมการ' : prefix
      return `<p style="margin-top:14mm">(ลงชื่อ)${DOT}${esc(role)}<br/>
      <span style="display:inline-block;margin-left:40mm">( ${esc(n || DOT)} )</span></p>`
    })
    .join('')
}

/** ช่องลงนามเจ้าหน้าที่พัสดุ / หัวหน้าเจ้าหน้าที่พัสดุ */
function officerSignRow(): string {
  return makeSignatures(['เจ้าหน้าที่พัสดุ', 'หัวหน้าเจ้าหน้าที่พัสดุ'])
}

/** ช่องลงนามผู้อำนวยการ (มีชื่อถ้ามี) */
function directorSign(d: OrderPrintData, role = 'ผู้อำนวยการ' ): string {
  const name = d.director_name || ''
  return `
<div class="sign-row">
  <div class="sign-box">
    <div class="sign-line"></div>
    <div class="sign-label">( ${esc(name || DOT)} )</div>
    <div class="sign-label">${esc(role)}${esc(sc(d))}</div>
  </div>
</div>`
}

// ── เอกสารแต่ละฉบับ (เรียงตามลำดับแบบฟอร์มจริง) ─────────────────────────────────

// 1) บันทึกข้อความ — ขออนุมัติแต่งตั้งคณะกรรมการกำหนดคุณลักษณะเฉพาะพัสดุและราคากลาง
function specCommitteeRequestMemo(d: OrderPrintData): BuiltForm {
  const body =
    memoHead({
      d,
      no: d.order.bookReportNumber,
      date: d.order.buyDate,
      subject: `ขออนุมัติแต่งตั้งคณะกรรมการจัดทำรายละเอียดคุณลักษณะเฉพาะพัสดุและกำหนดราคากลาง สำหรับการ${verbN(d)} ${proj(d)}`,
    }) +
    `<p>ด้วย${esc(sc(d))} จะดำเนินการ${esc(verb(d))} ${esc(proj(d))} วงเงินงบประมาณ ${baht(amount(d))}
     ซึ่งได้รับการจัดสรรงบประมาณประจำปีงบประมาณ พ.ศ. ${esc(String(d.order.acadYear ? Number(d.order.acadYear) + 543 : ''))}
     ดังนั้น เพื่อให้การกำหนดรายละเอียดคุณลักษณะเฉพาะพัสดุและราคากลาง เป็นไปตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560
     จึงขอแต่งตั้งคณะกรรมการจัดทำรายละเอียดคุณลักษณะเฉพาะพัสดุ ดังนี้</p>` +
    committeeListTable(d) +
    `<p class="mt-6">จึงเรียนมาเพื่อโปรดพิจารณา หากเห็นชอบโปรดลงนามในคำสั่งแต่งตั้งที่เสนอมาพร้อมนี้</p>` +
    officerSignRow() +
    `<p class="mt-6 center">เห็นชอบ</p>` +
    directorSign(d)
  return { title: `1_ขออนุมัติแต่งตั้งกรรมการกำหนดคุณลักษณะ_${d.order.orderId}`, body }
}

// 2) คำสั่ง — แต่งตั้งคณะกรรมการกำหนดคุณลักษณะเฉพาะพัสดุและราคากลาง
function specCommitteeOrder(d: OrderPrintData): BuiltForm {
  const body =
    orderHead({
      d,
      no: d.order.bookOrderCommittee,
      subject: `แต่งตั้งคณะกรรมการจัดทำรายละเอียดคุณลักษณะเฉพาะพัสดุและกำหนดราคากลาง สำหรับการ${verbN(d)} ${proj(d)}`,
    }) +
    `<p>ด้วย ${esc(sc(d))} มีความประสงค์จะ${esc(verb(d))} ${esc(proj(d))} วงเงินงบประมาณ ${baht(amount(d))}
     เพื่อให้เป็นไปตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 21
     และพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 จึงขอแต่งตั้ง</p>` +
    committeeListTable(d) +
    `<p class="mt-6">เป็นคณะกรรมการจัดทำรายละเอียดคุณลักษณะเฉพาะพัสดุและกำหนดราคากลาง โดยให้มีอำนาจหน้าที่
     กำหนดรายละเอียดคุณลักษณะเฉพาะพัสดุและจัดทำราคากลาง รวมทั้งกำหนดหลักเกณฑ์การพิจารณาคัดเลือกข้อเสนอ
     และรายงานผลต่อผู้อำนวยการ${esc(sc(d))}</p>
     <p>ทั้งนี้ ตั้งแต่บัดนี้เป็นต้นไป</p>
     <p class="right mt-6">สั่ง ณ วันที่ ${d.order.dateOrderCommittee ? esc(thaiFullDate(d.order.dateOrderCommittee)) : DOT}</p>` +
    directorSign(d)
  return { title: `2_คำสั่งแต่งตั้งกรรมการกำหนดคุณลักษณะ_${d.order.orderId}`, body }
}

// 3) บันทึกข้อความ — รายงานผลการกำหนดคุณลักษณะเฉพาะพัสดุและราคากลาง
function specResultReportMemo(d: OrderPrintData): BuiltForm {
  const body =
    memoHead({
      d,
      no: d.order.bookReportNumber,
      date: d.order.dateBookReport,
      subject: `รายงานผลการกำหนดรายละเอียดคุณลักษณะเฉพาะพัสดุและราคากลาง สำหรับการ${verbN(d)} ${proj(d)}`,
    }) +
    `<p>ตามคำสั่ง${esc(sc(d))} ที่ ${esc(d.order.bookOrderCommittee || DOT)} ได้แต่งตั้งคณะกรรมการจัดทำรายละเอียด
     คุณลักษณะเฉพาะพัสดุและกำหนดราคากลางสำหรับการ${esc(verbN(d))} ${esc(proj(d))} งบประมาณ ${baht(amount(d))} นั้น</p>
     <p>บัดนี้ คณะกรรมการได้กำหนดคุณลักษณะเฉพาะพัสดุและราคากลางเรียบร้อยแล้ว ราคากลางเป็นเงิน ${baht(amount(d))}
     ซึ่งได้ใช้ราคาอ้างอิงจากการสืบราคาจากท้องตลาด โดยมีรายละเอียดตามเอกสารแนบ</p>
     <p>จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</p>` +
    committeeSignColumn(d) +
    `<p class="mt-6">- ทราบ&nbsp;&nbsp;&nbsp;- อนุมัติ</p>` +
    directorSign(d)
  return { title: `3_รายงานผลกำหนดคุณลักษณะ_${d.order.orderId}`, body }
}

// 4) รายละเอียดคุณลักษณะและขอบเขตงาน (TOR)
function torForm(d: OrderPrintData): BuiltForm {
  const body =
    `<div class="center"><h1 style="margin:0">รายละเอียดคุณลักษณะและขอบเขตงาน (Terms of References : TOR)</h1>
     <div>${esc(proj(d))} ${esc(sc(d))}</div></div>
     <p class="mt-6"><b>1. หลักการและเหตุผล</b><br/>${esc(d.order.buyReason || DOTLONG)}</p>
     <p><b>2. วัตถุประสงค์</b><br/>เพื่อให้การ${esc(verbN(d))} ${esc(proj(d))} เป็นไปอย่างมีประสิทธิภาพ คุ้มค่า โปร่งใส</p>
     <p><b>3. คุณสมบัติของผู้เสนอราคา</b><br/>เป็นไปตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560</p>
     <p><b>4. ขอบเขตของงาน${esc(verb(d))}</b></p>` +
    itemsPriceTable(d) +
    `<p class="mt-6"><b>5. งบประมาณ</b> ${baht(amount(d))}</p>
     <p><b>6. หลักเกณฑ์การพิจารณา</b> โดย${esc(methodWord(d))}</p>
     <p><b>7. สถานที่ส่งมอบ</b> ${esc(sc(d))}</p>
     <p><b>8. กำหนดการส่งมอบ</b> ${esc(deliveryDaysText(d))} วัน นับถัดจากวันที่ลงนามในใบสั่ง${esc(verb(d))}</p>
     <p><b>9. คณะกรรมการกำหนดราคากลาง</b><br/>${esc((d.committee.filter(Boolean).join(', ')) || DOTLONG)}</p>`
  return { title: `4_TOR_${d.order.orderId}`, body }
}

// 5) แบบ บก.06 — ตารางแสดงวงเงินงบประมาณที่ได้รับจัดสรร
function bk06Form(d: OrderPrintData): BuiltForm {
  const body =
    `<div class="right">แบบ บก.06</div>
     <div class="center"><h1 style="margin:0">ตารางแสดงวงเงินงบประมาณที่ได้รับจัดสรรและรายละเอียดค่าใช้จ่าย</h1>
     <div>การจัดซื้อจัดจ้างที่มิใช่งานก่อสร้าง</div></div>
     <p class="mt-6"><b>1. ชื่อโครงการ</b> ${esc(verb(d))}${esc(proj(d))} จำนวน ${d.items.length || 1} รายการ</p>
     <p><b>2. หน่วยงานเจ้าของโครงการ</b> ${esc(sc(d))}</p>
     <p><b>3. วงเงินงบประมาณที่ได้รับจัดสรร</b> ${baht(amount(d))}</p>
     <p><b>4. วันที่กำหนดราคากลาง (ราคาอ้างอิง)</b> ${d.order.dateBookReport ? esc(thaiFullDate(d.order.dateBookReport)) : DOT} เป็นเงิน ${baht(amount(d))}</p>
     <p><b>5. แหล่งที่มาของราคากลาง (ราคาอ้างอิง)</b><br/>5.1 สืบราคาจากท้องตลาด${d.partner ? ' จากร้าน ' + esc(d.partner.p_name) : ''}</p>
     <p><b>6. รายชื่อคณะกรรมการกำหนดราคากลาง (ราคาอ้างอิง)</b><br/>${esc((d.committee.filter(Boolean).join(', ')) || DOTLONG)}</p>`
  return { title: `5_บก06_${d.order.orderId}`, body }
}

/** รายละเอียดของพัสดุที่จะขอ (ตารางราคา) — ใช้ซ้ำหลายฉบับ ต่างที่ส่วนลงนามท้าย */
function itemDetailDoc(d: OrderPrintData, footer: string, titlePrefix: string): BuiltForm {
  const purchaseMark = verb(d) === 'ซื้อ' ? '⁄' : ''
  const hireMark = verb(d) === 'จ้าง' ? '⁄' : ''
  const body =
    `<div class="center"><h1 style="margin:0">รายละเอียดของพัสดุที่จะขอ ( ${purchaseMark} ) ซื้อ ( ${hireMark} ) จ้าง</h1>
     <div class="sub">ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ.2560</div></div>` +
    itemsPriceTable(d) +
    footer
  return { title: `${titlePrefix}_${d.order.orderId}`, body }
}

// 6) รายละเอียดของพัสดุ (กรรมการกำหนดราคากลางลงนาม)
function itemDetailByCommittee(d: OrderPrintData): BuiltForm {
  return itemDetailDoc(
    d,
    `<p class="mt-6">( ⁄ ) เห็นชอบ ดำเนินการ${verb(d)}ได้</p>` + committeeSignColumn(d),
    '6_รายละเอียดพัสดุ-กรรมการ',
  )
}

// 7) บันทึกข้อความ — รายงานขอซื้อ/ขอจ้าง
function purchaseRequestMemo(d: OrderPrintData): BuiltForm {
  const body =
    memoHead({
      d,
      no: d.order.bookReportNumber,
      date: d.order.buyDate,
      subject: `รายงานขอ${verb(d)} ${proj(d)}`,
    }) +
    `<p>ด้วย ${esc(sc(d))} มีความประสงค์จะ${esc(verb(d))} ${esc(proj(d))} โดย${esc(methodWord(d))} ซึ่งมีรายละเอียดดังต่อไปนี้</p>
     <p>๑. เหตุผลความจำเป็นที่ต้อง${esc(verb(d))} : ${esc(d.order.buyReason || 'ใช้ดำเนินงานตามโครงการ')}</p>
     <p>๒. รายละเอียดของพัสดุ : รายละเอียดตามเอกสารแนบ</p>
     <p>๓. ราคากลางของพัสดุที่จะ${esc(verb(d))} จำนวน ${baht(amount(d))}</p>
     <p>๔. วงเงินที่จะ${esc(verb(d))} : เงินงบประมาณรายจ่ายประจำปี จำนวน ${baht(amount(d))}</p>
     <p>๕. กำหนดเวลาที่ต้องการใช้พัสดุ หรือให้งานแล้วเสร็จ : ภายใน ${esc(deliveryDaysText(d))} วัน นับถัดจากวันลงนามในสัญญา</p>
     <p>๖. วิธีที่จะ${esc(verb(d))} : ดำเนินการโดย${esc(methodWord(d))}</p>
     <p>๗. หลักเกณฑ์การพิจารณาคัดเลือกข้อเสนอ : ใช้เกณฑ์ราคา</p>
     <p>๘. การขออนุมัติแต่งตั้งคณะกรรมการ : แต่งตั้งคณะกรรมการตรวจรับพัสดุ</p>
     <p class="mt-6">จึงเรียนมาเพื่อโปรดพิจารณา หากเห็นชอบขอได้โปรด<br/>
     ๑. อนุมัติให้ดำเนินการตามรายงานขอ${esc(verb(d))}ดังกล่าวข้างต้น<br/>
     ๒. ลงนามในคำสั่งแต่งตั้งคณะกรรมการตรวจรับพัสดุ</p>` +
    officerSignRow() +
    `<p class="mt-6">ความเห็นผู้อำนวยการ${esc(sc(d))} ${esc(DOTLONG)}</p>` +
    directorSign(d)
  return { title: `7_รายงานขอ${verb(d)}_${d.order.orderId}`, body }
}

// 8) รายละเอียดของพัสดุ (เจ้าหน้าที่พัสดุลงนาม)
function itemDetailByOfficer(d: OrderPrintData): BuiltForm {
  return itemDetailDoc(d, officerSignRow(), '8_รายละเอียดพัสดุ-เจ้าหน้าที่')
}

// 9) คำสั่ง — แต่งตั้งคณะกรรมการตรวจรับพัสดุ
function inspectionCommitteeOrder(d: OrderPrintData): BuiltForm {
  const body =
    orderHead({
      d,
      no: d.order.bookOrderCommittee,
      subject: `แต่งตั้งคณะกรรมการตรวจรับพัสดุ สำหรับการ${verbN(d)} ${proj(d)} โดย${methodWord(d)}`,
    }) +
    `<p>ด้วย ${esc(sc(d))} มีความประสงค์จะ${esc(verb(d))} ${esc(proj(d))} โดย${esc(methodWord(d))}
     เพื่อให้เป็นไปตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560
     จึงขอแต่งตั้งบุคคลต่อไปนี้เป็น <b>คณะกรรมการตรวจรับพัสดุ</b></p>` +
    committeeListTable(d) +
    `<p class="mt-6"><b>อำนาจและหน้าที่</b> ทำการตรวจรับพัสดุให้เป็นไปตามเงื่อนไขของสัญญาหรือข้อตกลงนั้น</p>
     <p class="right mt-6">สั่ง ณ วันที่ ${d.order.dateOrderCommittee ? esc(thaiFullDate(d.order.dateOrderCommittee)) : DOT}</p>` +
    directorSign(d)
  return { title: `9_คำสั่งแต่งตั้งกรรมการตรวจรับ_${d.order.orderId}`, body }
}

// 10) บันทึกข้อความ — รายงานผลการพิจารณาและขออนุมัติสั่งซื้อ/สั่งจ้าง
function considerationReportMemo(d: OrderPrintData): BuiltForm {
  const price = Number(d.order.presentCost ?? amount(d))
  const body =
    memoHead({
      d,
      no: d.order.bookReportNumber,
      date: d.order.dateBookReport,
      subject: `รายงานผลการพิจารณาและขออนุมัติสั่ง${verb(d)} ${proj(d)}`,
    }) +
    `<p>ขอรายงานผลการพิจารณา${esc(verb(d))} ${esc(proj(d))} โดย${esc(methodWord(d))} ดังนี้</p>
     <table>
       <thead><tr><th>รายการพิจารณา</th><th>รายชื่อผู้ยื่นข้อเสนอ</th><th class="num">ราคาที่เสนอ</th><th class="num">ราคาที่ตกลง${esc(verb(d))}</th></tr></thead>
       <tbody>
         <tr><td>${esc(proj(d))}</td><td>${esc(d.partner?.p_name || DOT)}</td><td class="num">${fmtBaht(price)}</td><td class="num">${fmtBaht(price)}</td></tr>
         <tr><td colspan="3" class="right">รวม</td><td class="num">${fmtBaht(price)}</td></tr>
       </tbody>
     </table>
     <p>* ราคาที่เสนอและราคาที่ตกลง${esc(verb(d))} เป็นราคารวมภาษีมูลค่าเพิ่มและภาษีอื่น ค่าขนส่ง และค่าใช้จ่ายอื่น ๆ ทั้งปวง</p>
     <p>โดยเกณฑ์การพิจารณาผลการยื่นข้อเสนอครั้งนี้ จะพิจารณาตัดสินโดยใช้หลักเกณฑ์ราคา</p>
     <p>${esc(sc(d))}พิจารณาแล้ว เห็นสมควร${esc(verbN(d))}จากผู้เสนอราคาดังกล่าว
     จึงเรียนมาเพื่อโปรดพิจารณา หากเห็นชอบขอได้โปรดอนุมัติให้สั่ง${esc(verb(d))}จากผู้เสนอราคาดังกล่าว</p>` +
    officerSignRow() +
    `<p class="mt-6">- ทราบ , อนุมัติ , ลงนามแล้ว</p>` +
    directorSign(d)
  return { title: `10_รายงานผลพิจารณา_${d.order.orderId}`, body }
}

// 11) รายละเอียดของพัสดุ (ประกอบรายงานผลพิจารณา)
function itemDetailPlain(d: OrderPrintData): BuiltForm {
  return itemDetailDoc(d, officerSignRow(), '11_รายละเอียดพัสดุ')
}

// 12) ประกาศผู้ชนะการเสนอราคา
function winnerAnnouncement(d: OrderPrintData): BuiltForm {
  const price = Number(d.order.presentCost ?? amount(d))
  const body =
    announceHead({
      d,
      subject: `ประกาศผู้ชนะการเสนอราคา ${verb(d)} ${proj(d)} โดย${methodWord(d)}`,
    }) +
    `<p>ตามที่ ${esc(sc(d))} ได้มีโครงการ ${esc(verb(d))} ${esc(proj(d))} โดย${esc(methodWord(d))} นั้น</p>
     <p>ผู้ได้รับการคัดเลือก ได้แก่ <b>${esc(d.partner?.p_name || DOT)}</b> โดยเสนอราคาเป็นเงินทั้งสิ้น ${baht(price)}
     รวมภาษีมูลค่าเพิ่มและภาษีอื่น ค่าขนส่ง ค่าจดทะเบียน และค่าใช้จ่ายอื่น ๆ ทั้งปวง</p>
     <p class="right mt-10">ประกาศ ณ วันที่ ${d.order.dateWin ? esc(thaiFullDate(d.order.dateWin)) : DOT}</p>` +
    directorSign(d)
  return { title: `12_ประกาศผู้ชนะ_${d.order.orderId}`, body }
}

// 13) ใบสั่งซื้อ / ใบสั่งจ้าง
function purchaseOrderForm(d: OrderPrintData): BuiltForm {
  const total = amount(d)
  const vatOn = hasVat(d)
  const { net, vat } = vatOn ? netVat(total) : { net: total, vat: 0 }
  const isHire = verb(d) === 'จ้าง'
  // เงื่อนไขจ้าง: ค่าปรับขั้นต่ำ 100 บาท/วัน + ข้อห้ามจ้างช่วง (ตามแบบฟอร์มราชการ)
  const penaltyClause = isHire
    ? `<p>๕. สงวนสิทธิ์ค่าปรับกรณีส่งมอบเกินกำหนด โดยคิดค่าปรับเป็นรายวันในอัตราร้อยละ ๐.๒๐ ของราคางานจ้าง แต่ต้องไม่ต่ำกว่าวันละ ๑๐๐.๐๐ บาท</p>`
    : `<p>๕. สงวนสิทธิ์ค่าปรับกรณีส่งมอบเกินกำหนด โดยคิดค่าปรับเป็นรายวันในอัตราร้อยละ ๐.๒๐ ของราคาสิ่งของที่ยังไม่ได้รับมอบ</p>`
  const subcontractClause = isHire
    ? `<p>๗. การจ้างช่วง ผู้รับจ้างจะต้องไม่เอางานทั้งหมดหรือแต่บางส่วนไปจ้างช่วงอีกทอดหนึ่ง
       เว้นแต่การจ้างช่วงงานแต่บางส่วนที่ได้รับอนุญาตเป็นหนังสือจากผู้ว่าจ้างแล้ว
       การที่ผู้ว่าจ้างได้อนุญาตให้จ้างช่วงงานแต่บางส่วนดังกล่าวนั้น ไม่เป็นเหตุให้ผู้รับจ้างหลุดพ้นจากความรับผิดหรือพันธะหน้าที่
       กรณีผู้รับจ้างไปจ้างช่วงงานแต่บางส่วนโดยฝ่าฝืน ผู้รับจ้างต้องชำระค่าปรับให้แก่ผู้ว่าจ้างเป็นจำนวนเงินในอัตราร้อยละ ๑๐ (สิบ)
       ของวงเงินของงานที่จ้างช่วง ทั้งนี้ ไม่ตัดสิทธิผู้ว่าจ้างในการบอกเลิกสัญญา</p>
       <p>๘. การประเมินผลการปฏิบัติงานของผู้ประกอบการ หน่วยงานของรัฐสามารถนำผลการปฏิบัติงานแล้วเสร็จตามสัญญาหรือข้อตกลงของคู่สัญญา
       เพื่อนำมาประเมินผลการปฏิบัติงานของผู้ประกอบการ</p>`
    : `<p>๗. การประเมินผลการปฏิบัติงานของผู้ประกอบการ หน่วยงานของรัฐสามารถนำผลการปฏิบัติงานแล้วเสร็จตามสัญญาหรือข้อตกลงของคู่สัญญา
       เพื่อนำมาประเมินผลการปฏิบัติงานของผู้ประกอบการ</p>`
  const body =
    `<div class="center"><h1 style="margin:0">ใบสั่ง${esc(verb(d))}</h1></div>
     <table class="no-border" style="margin-top:6pt">
       <tr><td class="no-border" style="width:50%">
         ${partnerInfo(d)}
       </td><td class="no-border">
         <b>ใบสั่ง${esc(verb(d))}เลขที่</b> ${esc(d.order.numberOrders || DOT)}<br/>
         <b>วันที่</b> ${d.order.ordersDate ? esc(thaiFullDate(d.order.ordersDate)) : DOT}<br/>
         <b>ส่วนราชการ</b> ${esc(sc(d))}<br/>
         <b>ที่อยู่</b> ${esc(d.school_address || '-')}<br/>
         <b>โทรศัพท์</b> ${esc(d.school_tel || '-')}
       </td></tr>
     </table>
     <p>ตามที่ ${esc(d.partner?.p_name || sellerWord(d))} ได้เสนอราคาไว้ต่อ ${esc(sc(d))} ซึ่งได้รับราคาและตกลง${esc(verb(d))}
     ตามรายการดังต่อไปนี้</p>` +
    itemsPriceTable(d) +
    `<p class="mt-6"><b>การ${esc(isHire ? 'สั่งจ้าง' : 'ซื้อ')} อยู่ภายใต้เงื่อนไขต่อไปนี้</b></p>
     <p>๑. กำหนดส่งมอบภายใน ${esc(deliveryDaysText(d))} วัน นับถัดจากวันที่${esc(sellerWord(d))}ได้รับใบสั่ง${esc(verb(d))}</p>
     <p>๒. ครบกำหนดส่งมอบวันที่ ${d.order.dueOrdersDate ? esc(thaiFullDate(d.order.dueOrdersDate)) : DOT}</p>
     <p>๓. สถานที่ส่งมอบ ${esc(sc(d))} ${esc(d.school_address || '')}</p>
     <p>๔. ระยะเวลารับประกัน ${esc(DOT)}</p>` +
    penaltyClause +
    `<p>๖. ส่วนราชการสงวนสิทธิ์ที่จะไม่รับมอบ ถ้าปรากฏว่าสินค้า/งานนั้นมีลักษณะไม่ตรงตามรายการที่ระบุไว้ในใบสั่ง${esc(verb(d))}
     กรณีนี้${esc(sellerWord(d))}จะต้องดำเนินการเปลี่ยนใหม่ให้ถูกต้องตามใบสั่ง${esc(verb(d))}ทุกประการ</p>` +
    subcontractClause +
    `<p><b>หมายเหตุ :</b><br/>
     ๑. การติดอากรแสตมป์ให้เป็นไปตามประมวลกฎหมายรัษฎากร หากต้องการให้ใบสั่ง${esc(verb(d))}มีผลตามกฎหมาย<br/>
     ๒. ใบสั่ง${esc(verb(d))}นี้อ้างอิงตามเลขที่โครงการ (e-GP) ${esc(DOT)} ${esc(verb(d))}${esc(proj(d))} โดย${esc(methodWord(d))}</p>
     <p style="font-size:13pt;color:#555">รวมเงิน ${fmtBaht(net)} | ภาษีมูลค่าเพิ่ม ${vatOn ? fmtBaht(vat) : '-'} | รวมทั้งสิ้น ${fmtBaht(total)} (${esc(numberToThaiBaht(total))})</p>` +
    makeSignatures([`ผู้สั่ง${verb(d)}`, `ผู้รับใบสั่ง${verb(d)} / ${sellerWord(d)}`]) +
    `<p class="mt-6" style="font-size:13pt">เลขที่โครงการ ${esc(DOT)}<br/>เลขคุมสัญญา ${esc(DOT)}</p>`
  return { title: `13_ใบสั่ง${verb(d)}_${d.order.orderId}`, body }
}

// 14) รายละเอียดของพัสดุ (ผู้รับผิดชอบงาน/โครงการลงนาม)
function itemDetailByResponsible(d: OrderPrintData): BuiltForm {
  const footer =
    `<p class="mt-6">ลงชื่อ${DOT}<br/>
     <span style="display:inline-block;margin-left:30mm">( ${esc(d.committee[0] || DOT)} )</span><br/>
     <span style="display:inline-block;margin-left:30mm">ผู้รับผิดชอบงาน/โครงการ</span></p>` +
    officerSignRow()
  return itemDetailDoc(d, footer, '14_รายละเอียดพัสดุ-ผู้รับผิดชอบ')
}

// 15) ใบตรวจรับพัสดุ
function inspectionReceiptForm(d: OrderPrintData): BuiltForm {
  const body =
    `<div class="center"><h1 style="margin:0">ใบตรวจรับพัสดุ</h1>
     <div class="sub">ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ.2560 ข้อ 175</div></div>
     <p class="right mt-6">วันที่ ${d.order.dueOrdersDate ? esc(thaiFullDate(d.order.dueOrdersDate)) : DOT}</p>
     <p>ตามใบสั่ง${esc(verb(d))} เลขที่ ${esc(d.order.numberOrders || DOT)} ลงวันที่ ${d.order.ordersDate ? esc(thaiFullDate(d.order.ordersDate)) : DOT}
     ${esc(sc(d))} ได้ตกลง${esc(verb(d))}กับ ${esc(d.partner?.p_name || DOT)} สำหรับโครงการ ${esc(proj(d))}
     โดย${esc(methodWord(d))} เป็นจำนวนเงินทั้งสิ้น ${baht(amount(d))}</p>
     <p>คณะกรรมการตรวจรับพัสดุ ได้ตรวจรับงานแล้ว ผลปรากฏดังนี้</p>
     <p>๑. ผลการตรวจรับ : &nbsp;☑ ถูกต้องครบถ้วนตามสัญญา&nbsp;&nbsp;☐ ไม่ครบถ้วนตามสัญญา</p>
     <p>๒. ค่าปรับ : &nbsp;☐ มีค่าปรับ&nbsp;&nbsp;☑ ไม่มีค่าปรับ</p>
     <p>๓. การเบิกจ่ายเงิน : เบิกจ่ายเงินเป็นจำนวนเงินทั้งสิ้น ${baht(amount(d))}</p>` +
    committeeSignColumn(d, 'กรรมการ') +
    `<p class="mt-6" style="font-size:13pt"><b>หมายเหตุ :</b> เลขที่โครงการ ${esc(DOT)}<br/>
     เลขคุมสัญญา ${esc(DOT)}<br/>เลขคุมตรวจรับ ${esc(DOT)}</p>`
  return { title: `15_ใบตรวจรับพัสดุ_${d.order.orderId}`, body }
}

// 16) บันทึกข้อความ — รายงานผลการตรวจรับพัสดุ (ส่งเบิกจ่าย)
function inspectionResultMemo(d: OrderPrintData): BuiltForm {
  const body =
    memoHead({
      d,
      no: d.order.bookReportNumber,
      date: d.order.dueOrdersDate,
      subject: 'รายงานผลการตรวจรับพัสดุ',
    }) +
    `<p>ตามที่ ${esc(sc(d))} ได้ดำเนินการ${esc(verb(d))} ${esc(proj(d))} โดย${esc(methodWord(d))}
     ตามใบสั่ง${esc(verb(d))}เลขที่ ${esc(d.order.numberOrders || DOT)} ลงวันที่ ${d.order.ordersDate ? esc(thaiFullDate(d.order.ordersDate)) : DOT} นั้น</p>
     <p>บัดนี้ ${esc(d.partner?.p_name || sellerWord(d))} ได้ส่งมอบพัสดุดังกล่าว และขอเบิกเงินจำนวน ${baht(amount(d))}
     คณะกรรมการตรวจรับพัสดุได้ทำการตรวจรับไว้เป็นที่ถูกต้องเรียบร้อยแล้ว</p>
     <p>จึงเรียนมาเพื่อโปรดทราบผลการตรวจรับพัสดุดังกล่าว และดำเนินการเบิกจ่ายเงินต่อไป</p>` +
    committeeSignColumn(d, 'กรรมการ') +
    `<p class="mt-6">- ทราบ&nbsp;&nbsp;&nbsp;- ดำเนินการเบิกจ่ายเงิน</p>` +
    directorSign(d)
  return { title: `16_รายงานผลตรวจรับ_${d.order.orderId}`, body }
}

// 17) ใบเสนอราคา (ผู้ขาย/ผู้รับจ้างยื่น — ตามแบบฟอร์มชุดจ้าง)
function quotationForm(d: OrderPrintData): BuiltForm {
  const total = amount(d)
  const body =
    `<div class="center"><h1 style="margin:0">ใบเสนอราคา</h1></div>
     <p style="display:flex;justify-content:space-between"><span>เล่มที่ ${esc(DOT)}</span><span>เลขที่ ${esc(DOT)}</span></p>
     <p><b>เรียน</b> ผู้อำนวยการ${esc(sc(d))}</p>
     <p>๑. ข้าพเจ้า ${esc(d.partner?.p_name || DOTLONG)}
     ${d.partner?.p_address ? 'อยู่เลขที่ ' + esc(d.partner.p_address) : ''}
     ${d.partner?.p_tel ? 'โทรศัพท์ ' + esc(d.partner.p_tel) : ''}
     ${d.partner?.p_tax_id ? 'เลขประจำตัวผู้เสียภาษี ' + esc(d.partner.p_tax_id) : ''}<br/>
     ข้าพเจ้าเป็นผู้มีคุณสมบัติครบถ้วนตามที่กำหนด และไม่เป็นผู้ทิ้งงานของทางราชการ</p>
     <p>๒. ข้าพเจ้าขอเสนอราคา${esc(verb(d) === 'จ้าง' ? 'งานจ้างเหมา รวมทั้งบริการและกำหนดเวลาส่งมอบ' : 'พัสดุ')} สำหรับ ${esc(proj(d))} ดังต่อไปนี้</p>` +
    itemsPriceTable(d) +
    `<p>ซึ่งเป็นราคาที่รวมภาษีมูลค่าเพิ่ม รวมทั้งภาษีอากรอื่น และค่าใช้จ่ายทั้งปวงไว้ด้วยแล้ว</p>
     <p>๓. คำเสนอนี้จะยืนอยู่ในระยะเวลา ๗ วัน นับตั้งแต่วันที่ได้ยื่นใบเสนอราคา</p>
     <p>๔. กำหนดส่งมอบพัสดุตามรายละเอียดรายการข้างต้น ภายใน ${esc(deliveryDaysText(d))} วัน นับถัดจากวันลงนามในใบสั่ง${esc(verb(d))}</p>
     <p class="right">เสนอมา ณ วันที่ ${d.order.dateBookReport ? esc(thaiFullDate(d.order.dateBookReport)) : DOT}</p>` +
    makeSignatures(['ผู้ต่อรองราคา / เจ้าหน้าที่', `ผู้เสนอราคา / ${sellerWord(d)}`]) +
    `<p class="right" style="font-size:13pt;color:#555">รวมเป็นเงินทั้งสิ้น ${fmtBaht(total)} บาท (${esc(numberToThaiBaht(total))})</p>`
  return { title: `17_ใบเสนอราคา_${d.order.orderId}`, body }
}

// 18) ใบส่งมอบงานจ้าง (ผู้รับจ้างส่งมอบงาน — เฉพาะชุดจ้าง)
function jobDeliveryForm(d: OrderPrintData): BuiltForm {
  const body =
    `<div class="center"><h1 style="margin:0">ใบส่งมอบงานจ้าง</h1></div>
     <p class="right">วันที่ ${d.order.dueOrdersDate ? esc(thaiFullDate(d.order.dueOrdersDate)) : DOT}</p>
     <p style="display:flex;justify-content:space-between"><span>เล่มที่ ${esc(DOT)}</span><span>เลขที่ ${esc(DOT)}</span></p>
     <p>๑. ข้าพเจ้า ${esc(d.partner?.p_name || DOTLONG)}
     ${d.partner?.p_address ? 'อยู่เลขที่ ' + esc(d.partner.p_address) : ''}
     ${d.partner?.p_tel ? 'โทรศัพท์ ' + esc(d.partner.p_tel) : ''}
     ${d.partner?.p_tax_id ? 'เลขประจำตัวผู้เสียภาษี ' + esc(d.partner.p_tax_id) : ''}</p>
     <p>๒. ข้าพเจ้าขอส่งมอบงาน${esc(verb(d))} ${esc(proj(d))} ตามใบสั่ง${esc(verb(d))}เลขที่ ${esc(d.order.numberOrders || DOT)}
     ลงวันที่ ${d.order.ordersDate ? esc(thaiFullDate(d.order.ordersDate)) : DOT} ดังต่อไปนี้</p>` +
    itemsPriceTable(d) +
    `<p>ซึ่งเป็นราคาที่รวมภาษีมูลค่าเพิ่ม รวมทั้งภาษีอากรอื่น และค่าใช้จ่ายทั้งปวงไว้ด้วยแล้ว</p>` +
    makeSignatures(['ผู้รับมอบงาน / เจ้าหน้าที่', `ผู้ส่งมอบงาน / ${sellerWord(d)}`])
  return { title: `18_ใบส่งมอบงานจ้าง_${d.order.orderId}`, body }
}

// ── ทะเบียนฟอร์มที่ผูกกับคำสั่งซื้อ (เรียงตามลำดับแบบฟอร์มราชการ) ──────────────────

export const PROCUREMENT_FORMS: ProcurementForm[] = [
  { key: 'd01', label: '1. ขออนุมัติแต่งตั้งกรรมการกำหนดคุณลักษณะ', build: specCommitteeRequestMemo },
  { key: 'd02', label: '2. คำสั่งแต่งตั้งกรรมการกำหนดคุณลักษณะ', build: specCommitteeOrder },
  { key: 'd03', label: '3. รายงานผลกำหนดคุณลักษณะ/ราคากลาง', build: specResultReportMemo },
  { key: 'd04', label: '4. รายละเอียดคุณลักษณะ/ขอบเขตงาน (TOR)', build: torForm },
  { key: 'd05', label: '5. แบบ บก.06 ตารางวงเงินงบประมาณ', build: bk06Form },
  { key: 'd06', label: '6. รายละเอียดพัสดุ (กรรมการ)', build: itemDetailByCommittee },
  { key: 'd07', label: '7. รายงานขอซื้อ/ขอจ้าง', build: purchaseRequestMemo },
  { key: 'd08', label: '8. รายละเอียดพัสดุ (เจ้าหน้าที่)', build: itemDetailByOfficer },
  { key: 'd09', label: '9. คำสั่งแต่งตั้งกรรมการตรวจรับพัสดุ', build: inspectionCommitteeOrder },
  { key: 'd10', label: '10. รายงานผลพิจารณา+ขออนุมัติสั่งซื้อ/จ้าง', build: considerationReportMemo },
  { key: 'd11', label: '11. รายละเอียดพัสดุ (แนบรายงานผล)', build: itemDetailPlain },
  { key: 'd12', label: '12. ประกาศผู้ชนะการเสนอราคา', build: winnerAnnouncement },
  { key: 'd13', label: '13. ใบสั่งซื้อ/สั่งจ้าง', build: purchaseOrderForm },
  { key: 'd14', label: '14. รายละเอียดพัสดุ (ผู้รับผิดชอบ)', build: itemDetailByResponsible },
  { key: 'd15', label: '15. ใบตรวจรับพัสดุ', build: inspectionReceiptForm },
  { key: 'd16', label: '16. รายงานผลการตรวจรับพัสดุ (ส่งเบิก)', build: inspectionResultMemo },
  { key: 'd17', label: '17. ใบเสนอราคา', build: quotationForm },
  { key: 'd18', label: '18. ใบส่งมอบงานจ้าง', build: jobDeliveryForm },
]

const byKey = (k: string) => PROCUREMENT_FORMS.find((f) => f.key === k)!

/** ชุดเอกสาร "ซื้อ" — อ้างอิงแบบฟอร์มราชการ 01ซื้อ (16 ฉบับ + ใบเสนอราคา) */
const BUY_SEQUENCE: ProcurementForm[] = [
  'd01', 'd02', 'd03', 'd04', 'd05', 'd06', 'd07', 'd08', 'd09',
  'd17', 'd10', 'd11', 'd12', 'd13', 'd14', 'd15', 'd16',
].map(byKey)

/** ชุดเอกสาร "จ้าง" — อ้างอิงแบบฟอร์มราชการ 02จ้าง
 *  (วิธีเฉพาะเจาะจงวงเงินน้อย ไม่มีขั้นกรรมการกำหนดคุณลักษณะ ฉบับ 1–3
 *   แต่เพิ่มใบเสนอราคา + ใบส่งมอบงานจ้าง) */
const HIRE_SEQUENCE: ProcurementForm[] = [
  'd07', 'd04', 'd05', 'd09', 'd17', 'd10', 'd12', 'd13', 'd18', 'd15', 'd16',
].map(byKey)

/** ชุดเอกสารตามประเภทของคำสั่ง (1 = ซื้อ, 2 = จ้าง) */
export function formsForOrder(d: OrderPrintData): ProcurementForm[] {
  return Number(d.order.projectType) === 2 ? HIRE_SEQUENCE : BUY_SEQUENCE
}

/** ลำดับเอกสารสำหรับ "พิมพ์ทั้งหมด" (คงไว้เพื่อ backward-compat) */
export const PROCUREMENT_SEQUENCE = PROCUREMENT_FORMS

const PAGE_BREAK =
  '<div style="break-before:page;page-break-before:always"></div>'

/** รวมทุกฉบับเป็นเอกสารเดียว ต่อหน้ากันจนจบ (ขึ้นหน้าใหม่ทุกฉบับ)
 *  เลือกชุดเอกสารตามประเภทซื้อ/จ้างอัตโนมัติ */
export function buildAllForms(d: OrderPrintData): BuiltForm {
  const body = formsForOrder(d)
    .map((f) => `<section class="doc-page">${f.build(d).body}</section>`)
    .join(PAGE_BREAK)
  return {
    title: `เอกสาร${verbN(d)}_เลขที่${d.order.orderId}`,
    body,
  }
}

// ── ทะเบียน (ไม่ผูก order เดียว) — คงไว้ตามเดิม ────────────────────────────────

/** บัญชีวัสดุ (รับจาก rows ภายนอก) */
export function materialsRegisterForm(args: {
  scName: string
  rows: { supp_name: string; unit?: string; qty?: number; balance?: number }[]
}): BuiltForm {
  const body =
    makeHeader({ title: 'บัญชีวัสดุ', scName: args.scName }) +
    makeTable(
      ['ลำดับ', 'รายการวัสดุ', 'หน่วยนับ', 'จำนวน', 'คงเหลือ'],
      args.rows.map((r, i) => [
        String(i + 1),
        r.supp_name,
        r.unit ?? '',
        r.qty?.toLocaleString() ?? '',
        r.balance?.toLocaleString() ?? '',
      ]),
      { numCols: [3, 4] },
    ) +
    makeSignatures(['เจ้าหน้าที่พัสดุ', 'หัวหน้าเจ้าหน้าที่พัสดุ'])
  return { title: 'บัญชีวัสดุ', body }
}

/** ใบรับพัสดุ (รับจากข้อมูลการรับพัสดุภายนอก) */
export function receiveParcelForm(args: {
  scName: string
  receiveNo?: string
  receiveDate?: string | null
  partnerName?: string
  rows: { supp_name: string; qty?: number; price?: number }[]
}): BuiltForm {
  const total = args.rows.reduce((s, r) => s + Number(r.price ?? 0), 0)
  const body =
    makeHeader({ title: 'ใบรับพัสดุ', scName: args.scName, docNo: args.receiveNo, docDate: args.receiveDate ?? undefined }) +
    `<p>รับพัสดุจากผู้ขาย/ผู้รับจ้าง ${esc(args.partnerName || '-')}</p>` +
    makeTable(
      ['ลำดับ', 'รายการ', 'จำนวน', 'มูลค่า (บาท)'],
      args.rows.map((r, i) => [
        String(i + 1),
        r.supp_name,
        r.qty?.toLocaleString() ?? '',
        fmtBaht(r.price),
      ]),
      { numCols: [2, 3] },
    ) +
    `<p class="mt-6 right">รวมมูลค่าทั้งสิ้น ${fmtBaht(total)} บาท</p>` +
    makeSignatures(['ผู้ส่งมอบ', 'ผู้รับพัสดุ'])
  return { title: `ใบรับพัสดุ_${args.receiveNo ?? ''}`, body }
}
