/**
 * แบบฟอร์มเอกสารจัดซื้อจัดจ้าง (พ.ร.บ.การจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ.2560)
 * แทนชุด PDF เดิม (pdf01–pdf16) ที่เคยสร้างจาก PHP — ตอนนี้พิมพ์ฝั่ง frontend ด้วย openPrintWindow
 *
 * แต่ละฟอร์มรับข้อมูล OrderPrintData (จาก GET Project_approve/loadOrderForPrint/:order_id)
 * แล้วคืน { title, body } เพื่อส่งเข้า openPrintWindow()
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
  acadYear?: number | null
}

export interface OrderItem {
  pc_id: number
  supp_id: number | null
  supp_name: string
  pc_total: number
}

export interface OrderPrintData {
  order: OrderRaw
  items: OrderItem[]
  committee: string[]
  partner: { p_id: number; p_name: string } | null
  project_name: string
  school_name: string
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

// ── Helpers ────────────────────────────────────────────────────────────────────

const PROJECT_TYPE: Record<number, string> = { 1: 'จัดซื้อ', 2: 'จัดจ้าง' }
const METHOD_TYPE: Record<number, string> = {
  1: 'วิธีประกาศเชิญชวนทั่วไป (e-bidding)',
  2: 'วิธีคัดเลือก',
  3: 'วิธีเฉพาะเจาะจง',
  4: 'วิธีตลาดอิเล็กทรอนิกส์',
}
const PRB = '(ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560)'

const ptype = (d: OrderPrintData) => PROJECT_TYPE[Number(d.order.projectType) || 1] ?? 'จัดซื้อ'
const mtype = (d: OrderPrintData) =>
  METHOD_TYPE[Number(d.order.methodType) || 3] ?? METHOD_TYPE[3]
const amount = (d: OrderPrintData) => Number(d.order.budgets ?? 0)

/** หัวเอกสารมาตรฐาน */
function head(d: OrderPrintData, title: string, docNo?: string | null, docDate?: string | null) {
  return makeHeader({
    title,
    subtitle: PRB,
    scName: d.school_name,
    docNo: docNo ?? undefined,
    docDate: docDate ?? undefined,
  })
}

/** ตารางรายการพัสดุ (ลำดับ / รายการ / จำนวน) */
function itemsTable(d: OrderPrintData) {
  if (!d.items.length) {
    return `<p>รายการ: ${esc(d.project_name || d.order.details || '-')} จำนวนเงิน ${fmtBaht(amount(d))} บาท</p>`
  }
  const rows = d.items.map((it, i) => [
    String(i + 1),
    it.supp_name || `รายการ #${it.supp_id ?? ''}`,
    it.pc_total?.toLocaleString() ?? '',
  ])
  return makeTable(['ลำดับ', 'รายการพัสดุ', 'จำนวน'], rows, { numCols: [2] })
}

/** บล็อกข้อมูลโครงการ/วงเงิน */
function summaryTable(d: OrderPrintData) {
  return `<table>
  <tr><td style="width:35%">โครงการ</td><td>${esc(d.project_name || '-')}</td></tr>
  <tr><td>ประเภท</td><td>${esc(ptype(d))}</td></tr>
  <tr><td>วิธีจัดหา</td><td>${esc(mtype(d))}</td></tr>
  <tr><td>วงเงิน</td><td class="num">${fmtBaht(amount(d))} บาท</td></tr>
  <tr><td>(ตัวอักษร)</td><td>${esc(numberToThaiBaht(amount(d)))}</td></tr>
</table>`
}

/** รายชื่อกรรมการเป็นช่องลงนาม (อย่างน้อย 3 ช่อง) */
function committeeSignatures(d: OrderPrintData, prefix = 'กรรมการ') {
  const names = d.committee.length ? d.committee : ['', '', '']
  const roles = names.map((n, i) =>
    n ? `${prefix} (${n})` : `${prefix}คนที่ ${i + 1}`,
  )
  return makeSignatures(roles)
}

// ── ฟอร์มแต่ละชนิด ──────────────────────────────────────────────────────────────

// pdf01 — หนังสือแต่งตั้งคณะกรรมการ
function committeeAppointmentForm(d: OrderPrintData): BuiltForm {
  const body =
    head(d, 'คำสั่งแต่งตั้งคณะกรรมการ' + ptype(d), d.order.bookOrderCommittee, d.order.dateOrderCommittee) +
    `<p>ด้วยโรงเรียน${esc(d.school_name)} มีความประสงค์จะ${esc(ptype(d))} ${esc(d.project_name)}
     วงเงิน ${fmtBaht(amount(d))} บาท (${esc(numberToThaiBaht(amount(d)))})
     จึงขอแต่งตั้งบุคคลดังต่อไปนี้เป็นคณะกรรมการ ${esc(ptype(d))}</p>` +
    `<table><tr><th style="width:10%">ลำดับ</th><th>รายชื่อ</th><th style="width:30%">ตำแหน่งในคณะกรรมการ</th></tr>
     ${(d.committee.length ? d.committee : ['', '', '']).map((n, i) =>
       `<tr><td class="center">${i + 1}</td><td>${esc(n || '.................................')}</td>
        <td class="center">${i === 0 ? 'ประธานกรรมการ' : 'กรรมการ'}</td></tr>`).join('')}
     </table>` +
    makeSignatures(['ผู้สั่ง / ผู้อำนวยการ'])
  return { title: `คำสั่งแต่งตั้งกรรมการ_${d.order.orderId}`, body }
}

// pdf02 — รายงานผลการกำหนดคุณลักษณะเฉพาะ
function specForm(d: OrderPrintData): BuiltForm {
  const body =
    head(d, 'รายงานผลการกำหนดรายละเอียดคุณลักษณะเฉพาะ') +
    summaryTable(d) +
    `<p class="mt-6">รายการพัสดุที่กำหนดคุณลักษณะ</p>` +
    itemsTable(d) +
    committeeSignatures(d, 'กรรมการกำหนดคุณลักษณะ')
  return { title: `กำหนดคุณลักษณะ_${d.order.orderId}`, body }
}

// pdf03 / pdf05 / pdf10 — รายละเอียดของพัสดุที่ขอ
function itemsDetailForm(d: OrderPrintData): BuiltForm {
  const body =
    head(d, 'รายละเอียดของพัสดุที่ขอ' + ptype(d)) +
    itemsTable(d) +
    `<p class="mt-6 right">รวมเป็นเงินทั้งสิ้น ${fmtBaht(amount(d))} บาท</p>
     <p class="right">(${esc(numberToThaiBaht(amount(d)))})</p>` +
    makeSignatures(['เจ้าหน้าที่พัสดุ', 'หัวหน้าเจ้าหน้าที่พัสดุ'])
  return { title: `รายละเอียดพัสดุ_${d.order.orderId}`, body }
}

// pdf04 — รายงานขอซื้อขอจ้าง
function purchaseRequestForm(d: OrderPrintData): BuiltForm {
  const body =
    head(d, 'รายงานขอ' + ptype(d), d.order.bookReportNumber, d.order.dateBookReport) +
    `<p>ด้วยโรงเรียน${esc(d.school_name)} มีความจำเป็นต้อง${esc(ptype(d))} ${esc(d.project_name)}
     โดยมีเหตุผลความจำเป็นว่า ${esc(d.order.buyReason || '-')}</p>` +
    summaryTable(d) +
    itemsTable(d) +
    makeSignatures(['เจ้าหน้าที่พัสดุ', 'หัวหน้าเจ้าหน้าที่พัสดุ', 'ผู้อำนวยการ (อนุมัติ)'])
  return { title: `รายงานขอ${ptype(d)}_${d.order.orderId}`, body }
}

// pdf06 — แต่งตั้งผู้ตรวจรับพัสดุ
function inspectorAppointmentForm(d: OrderPrintData): BuiltForm {
  const body =
    head(d, 'คำสั่งแต่งตั้งคณะกรรมการตรวจรับพัสดุ', d.order.bookOrderCommittee, d.order.dateOrderCommittee) +
    `<p>ขอแต่งตั้งบุคคลดังต่อไปนี้เป็นคณะกรรมการตรวจรับพัสดุ สำหรับการ${esc(ptype(d))} ${esc(d.project_name)}</p>` +
    `<table><tr><th style="width:10%">ลำดับ</th><th>รายชื่อ</th><th style="width:30%">ตำแหน่ง</th></tr>
     ${(d.committee.length ? d.committee : ['', '', '']).map((n, i) =>
       `<tr><td class="center">${i + 1}</td><td>${esc(n || '.................................')}</td>
        <td class="center">${i === 0 ? 'ประธานกรรมการ' : 'กรรมการ'}</td></tr>`).join('')}
     </table>` +
    makeSignatures(['ผู้อำนวยการ'])
  return { title: `แต่งตั้งผู้ตรวจรับ_${d.order.orderId}`, body }
}

// pdf07 — รายงานผลการพิจารณาและขออนุมัติสั่งซื้อสั่งจ้าง
function considerationReportForm(d: OrderPrintData): BuiltForm {
  const body =
    head(d, 'รายงานผลการพิจารณาและขออนุมัติสั่ง' + ptype(d), d.order.bookReportNumber, d.order.dateBookReport) +
    `<table>
      <tr><td style="width:35%">โครงการ</td><td>${esc(d.project_name || '-')}</td></tr>
      <tr><td>วิธีจัดหา</td><td>${esc(mtype(d))}</td></tr>
      <tr><td>ผู้เสนอราคาที่ได้รับการคัดเลือก</td><td>${esc(d.partner?.p_name || '-')}</td></tr>
      <tr><td>ราคาที่เสนอ</td><td class="num">${fmtBaht(d.order.presentCost ?? amount(d))} บาท</td></tr>
      <tr><td>(ตัวอักษร)</td><td>${esc(numberToThaiBaht(Number(d.order.presentCost ?? amount(d))))}</td></tr>
    </table>` +
    makeSignatures(['เจ้าหน้าที่พัสดุ', 'หัวหน้าเจ้าหน้าที่พัสดุ', 'ผู้อำนวยการ (อนุมัติ)'])
  return { title: `รายงานผลพิจารณา_${d.order.orderId}`, body }
}

// pdf08 — ประกาศผู้ชนะการเสนอราคา
function winnerAnnouncementForm(d: OrderPrintData): BuiltForm {
  const body =
    head(d, 'ประกาศผู้ชนะการเสนอราคา', undefined, d.order.dateWin) +
    `<p>ตามที่โรงเรียน${esc(d.school_name)} ได้มีโครงการ${esc(ptype(d))} ${esc(d.project_name)}
     โดย${esc(mtype(d))} นั้น</p>
     <p>ผู้ชนะการเสนอราคา ได้แก่ <b>${esc(d.partner?.p_name || '-')}</b>
     เป็นเงินทั้งสิ้น ${fmtBaht(d.order.presentCost ?? amount(d))} บาท
     (${esc(numberToThaiBaht(Number(d.order.presentCost ?? amount(d))))})</p>` +
    makeSignatures(['ผู้อำนวยการ'])
  return { title: `ประกาศผู้ชนะ_${d.order.orderId}`, body }
}

// pdf09 — ใบสั่งซื้อ/สั่งจ้าง
function purchaseOrderForm(d: OrderPrintData): BuiltForm {
  const body =
    head(d, 'ใบสั่ง' + ptype(d), d.order.numberOrders, d.order.ordersDate) +
    `<table>
      <tr><td style="width:35%">ผู้ขาย/ผู้รับจ้าง</td><td>${esc(d.partner?.p_name || '-')}</td></tr>
      <tr><td>โครงการ</td><td>${esc(d.project_name || '-')}</td></tr>
    </table>` +
    itemsTable(d) +
    `<p class="mt-6 right">รวมเป็นเงินทั้งสิ้น ${fmtBaht(amount(d))} บาท (${esc(numberToThaiBaht(amount(d)))})</p>` +
    makeSignatures(['ผู้ขาย/ผู้รับจ้าง', 'ผู้สั่งซื้อ/สั่งจ้าง', 'ผู้อำนวยการ'])
  return { title: `ใบสั่ง${ptype(d)}_${d.order.orderId}`, body }
}

// pdf11 — ใบตรวจรับพัสดุ
function inspectionReceiptForm(d: OrderPrintData): BuiltForm {
  const body =
    head(d, 'ใบตรวจรับพัสดุ', d.order.numberOrders, d.order.ordersDate) +
    `<p>คณะกรรมการตรวจรับพัสดุ ได้ตรวจรับพัสดุตามใบสั่ง${esc(ptype(d))} เลขที่ ${esc(d.order.numberOrders || '-')}
     จากผู้ขาย/ผู้รับจ้าง ${esc(d.partner?.p_name || '-')} ดังนี้</p>` +
    itemsTable(d) +
    `<p class="mt-6">ผลการตรวจรับ: ถูกต้องครบถ้วนตามใบสั่ง ฯ รวมเป็นเงิน ${fmtBaht(amount(d))} บาท</p>` +
    committeeSignatures(d, 'กรรมการตรวจรับ')
  return { title: `ใบตรวจรับพัสดุ_${d.order.orderId}`, body }
}

// pdf12 — ส่งเบิกเงิน (ส่งต่อการเงิน)
function disbursementSubmitForm(d: OrderPrintData): BuiltForm {
  const body =
    head(d, 'บันทึกข้อความ ขอส่งเบิกเงิน') +
    `<p>ขอส่งเบิกเงินค่า${esc(ptype(d))} ${esc(d.project_name)} ตามใบสั่ง ฯ เลขที่ ${esc(d.order.numberOrders || '-')}
     ผู้รับเงิน ${esc(d.partner?.p_name || '-')}</p>` +
    `<table>
      <tr><td style="width:35%">จำนวนเงินที่ขอเบิก</td><td class="num">${fmtBaht(amount(d))} บาท</td></tr>
      <tr><td>(ตัวอักษร)</td><td>${esc(numberToThaiBaht(amount(d)))}</td></tr>
    </table>` +
    `<p class="footer-note">หมายเหตุ: ส่งต่อให้งานการเงินตั้งเรื่องจ่ายในระบบ (เมนูจ่ายเงิน)</p>` +
    makeSignatures(['เจ้าหน้าที่พัสดุ', 'หัวหน้าเจ้าหน้าที่พัสดุ'])
  return { title: `ส่งเบิกเงิน_${d.order.orderId}`, body }
}

// pdf13 — ขออนุมัติงบประมาณดำเนินงานตามแผนงาน
function budgetApprovalForm(d: OrderPrintData): BuiltForm {
  const body =
    head(d, 'บันทึกข้อความ ขออนุมัติงบประมาณดำเนินงานตามแผนงาน') +
    `<p>ขออนุมัติใช้งบประมาณเพื่อดำเนินงานตามแผนงาน/โครงการ ${esc(d.project_name)}</p>` +
    summaryTable(d) +
    makeSignatures(['เจ้าหน้าที่แผนงาน', 'หัวหน้าแผนงาน', 'ผู้อำนวยการ (อนุมัติ)'])
  return { title: `ขออนุมัติงบประมาณ_${d.order.orderId}`, body }
}

// ── ทะเบียน (ไม่ผูก order เดียว) ───────────────────────────────────────────────

/** pdf14 — บัญชีวัสดุ (รับจาก rows ภายนอก) */
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

/** pdf16 — ใบรับพัสดุ (รับจากข้อมูลการรับพัสดุภายนอก) */
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

// ── ทะเบียนฟอร์มที่ผูกกับคำสั่งซื้อ (ใช้ในจอ procurement-docs) ──────────────────

export const PROCUREMENT_FORMS: ProcurementForm[] = [
  { key: 'pdf04', label: 'รายงานขอซื้อ/ขอจ้าง', build: purchaseRequestForm },
  { key: 'pdf01', label: 'คำสั่งแต่งตั้งคณะกรรมการ', build: committeeAppointmentForm },
  { key: 'pdf02', label: 'รายงานผลกำหนดคุณลักษณะ', build: specForm },
  { key: 'pdf03', label: 'รายละเอียดพัสดุที่ขอ', build: itemsDetailForm },
  { key: 'pdf06', label: 'แต่งตั้งผู้ตรวจรับพัสดุ', build: inspectorAppointmentForm },
  { key: 'pdf07', label: 'รายงานผลพิจารณา+ขออนุมัติสั่งซื้อ/จ้าง', build: considerationReportForm },
  { key: 'pdf08', label: 'ประกาศผู้ชนะการเสนอราคา', build: winnerAnnouncementForm },
  { key: 'pdf09', label: 'ใบสั่งซื้อ/สั่งจ้าง', build: purchaseOrderForm },
  { key: 'pdf11', label: 'ใบตรวจรับพัสดุ', build: inspectionReceiptForm },
  { key: 'pdf12', label: 'ส่งเบิกเงิน', build: disbursementSubmitForm },
  { key: 'pdf13', label: 'ขออนุมัติงบประมาณตามแผน', build: budgetApprovalForm },
]
