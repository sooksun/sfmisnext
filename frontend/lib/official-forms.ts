/**
 * official-forms.ts
 *
 * ตัวสร้าง HTML แบบฟอร์มเอกสารทางการ ให้ตรงตามแบบใน
 * "คู่มือแนวการประเมินผลการปฏิบัติงานด้านการเงิน การบัญชีของสถานศึกษา
 *  (กลุ่มตรวจสอบภายใน สพฐ. 2567)" หน้า 13-28
 *
 * ใช้ร่วมกับ openPrintWindow() ใน print-utils.ts
 * ทุก builder คืน body HTML (ส่งเข้า openPrintWindow ได้เลย)
 */
import { esc, fmtBaht, thaiFullDate, numberToThaiBaht } from './print-utils'

/** CSS เสริมเฉพาะแบบฟอร์มทางการ (แทรกใน body — เพิ่มจาก BASE_CSS) */
const FORM_CSS = `<style>
  .of-title { text-align:center; margin-bottom:6mm; }
  .of-title .of-h1 { font-size:18pt; font-weight:bold; margin-bottom:2pt; }
  .of-title .of-line { font-size:15pt; margin:1pt 0; }
  .of-dotted { border-bottom:1px dotted #000; display:inline-block; min-width:40mm; }
  table.of { width:100%; border-collapse:collapse; }
  table.of th, table.of td { border:1px solid #000; padding:3pt 5pt; font-size:13pt; vertical-align:middle; }
  table.of th { background:#fff; text-align:center; font-weight:bold; }
  table.of td.num { text-align:right; font-variant-numeric:tabular-nums; }
  table.of td.ctr { text-align:center; }
  table.of tfoot td { font-weight:bold; }
  .of-recon { width:100%; font-size:14pt; }
  .of-recon td { padding:2pt 4pt; vertical-align:top; }
  .of-recon td.amt { text-align:right; white-space:nowrap; border-bottom:1px solid #000; min-width:30mm; }
  .of-sign-wrap { margin-top:10mm; font-size:14pt; }
  .of-sign-c { text-align:center; }
  .of-sign-3 { display:flex; justify-content:space-around; margin:8mm 0; }
  .of-sign-3 .b { text-align:center; min-width:45mm; }
  .of-dots { letter-spacing:1px; }
</style>`

const DOTS = '....................'
const LONGDOTS = '..............................'

/** หัวเอกสารทางการ: ชื่อฟอร์ม + บรรทัดข้อมูล (โรงเรียน/ธนาคาร/วันที่) */
export function officialHeader(title: string, lines: string[]): string {
  return `<div class="of-title">
    <div class="of-h1">${esc(title)}</div>
    ${lines.map((l) => `<div class="of-line">${l}</div>`).join('')}
  </div>`
}

// ───────────────────────────────────────────────────────────────────────────
// 1) รายงานเงินคงเหลือประจำวัน (finance4 หน้า 22 / form-028)
// ───────────────────────────────────────────────────────────────────────────
export interface DailyBalanceFormRow {
  name: string
  cash: number
  bank: number
  smp: number
  total: number
  note?: string
  /** true = แถวหัวข้อกลุ่ม (ตัวหนา ไม่มีตัวเลข) */
  group?: boolean
}

export interface DailyBalanceFormOpts {
  scName?: string
  date: string
  rows: DailyBalanceFormRow[]
  totalCash: number
  totalBank: number
  totalSmp: number
  grandTotal: number
  /** ชื่อผู้ลงนาม (ถ้ามี เติมให้อัตโนมัติ) */
  preparerName?: string
  preparerPosition?: string
  directorName?: string
  committeeNames?: string[]
}

export function officialDailyBalanceForm(o: DailyBalanceFormOpts): string {
  const header = officialHeader('รายงานเงินคงเหลือประจำวัน', [
    `โรงเรียน${o.scName ? esc(o.scName) : `<span class="of-dotted of-dots"></span>`}`,
    `ประจำวันที่ ${esc(thaiFullDate(o.date))}`,
  ])

  const body = o.rows
    .map((r) => {
      if (r.group) {
        return `<tr><td colspan="6"><b>${esc(r.name)}</b></td></tr>`
      }
      return `<tr>
        <td>${esc(r.name)}</td>
        <td class="num">${r.cash ? fmtBaht(r.cash) : ''}</td>
        <td class="num">${r.bank ? fmtBaht(r.bank) : ''}</td>
        <td class="num">${r.smp ? fmtBaht(r.smp) : ''}</td>
        <td class="num">${r.total ? fmtBaht(r.total) : ''}</td>
        <td>${r.note ? esc(r.note) : ''}</td>
      </tr>`
    })
    .join('')

  const table = `<table class="of">
    <thead><tr>
      <th>ประเภท</th>
      <th>เงินสด</th>
      <th>เงินฝากธนาคาร</th>
      <th>เงินฝากส่วนราชการผู้เบิก</th>
      <th>รวม</th>
      <th>หมายเหตุ</th>
    </tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr>
      <td class="ctr"><b>รวม</b></td>
      <td class="num">${fmtBaht(o.totalCash)}</td>
      <td class="num">${fmtBaht(o.totalBank)}</td>
      <td class="num">${fmtBaht(o.totalSmp)}</td>
      <td class="num">${fmtBaht(o.grandTotal)}</td>
      <td></td>
    </tr></tfoot>
  </table>`

  const nm = (v?: string) => (v ? esc(v) : DOTS)
  const committee = (o.committeeNames && o.committeeNames.length
    ? o.committeeNames
    : ['', '', '']
  ).slice(0, 3)

  const signatures = `<div class="of-sign-wrap">
    <div style="text-align:right; margin-right:20mm;">
      <div>ลงชื่อ${nm(o.preparerName)} ผู้จัดทำรายงาน</div>
      <div>(${o.preparerName ? esc(o.preparerName) : DOTS})</div>
      <div>ตำแหน่ง ${nm(o.preparerPosition)}</div>
    </div>
    <div style="margin-top:6mm;">
      กรรมการเก็บรักษาเงินได้ตรวจสอบนับเงินสดคงเหลือประจำวันถูกต้อง ตามรายการข้างต้นแล้ว
      และได้นำเงินสดเก็บรักษาไว้ในตู้นิรภัยเป็นที่เรียบร้อยแล้ว
    </div>
    <div class="of-sign-3">
      ${committee
        .map(
          (c) => `<div class="b"><div>${c ? esc(c) : LONGDOTS}</div><div>กรรมการ</div></div>`,
        )
        .join('')}
    </div>
    <div class="of-sign-c">
      <div>ลงชื่อ${nm(o.directorName)} หัวหน้าหน่วยงานย่อย</div>
      <div>(${o.directorName ? esc(o.directorName) : DOTS})</div>
      <div>ตำแหน่ง ${DOTS}</div>
    </div>
    <div style="margin-top:8mm;">
      ข้าพเจ้าผู้รับมอบหมายได้รับเงินสดตามรายการข้างต้นแล้ว เมื่อวันที่ ${DOTS} เดือน ${DOTS} พ.ศ. ${DOTS}
    </div>
    <div class="of-sign-c" style="margin-top:6mm;">
      <div>ลงชื่อ${DOTS} ผู้รับเงิน</div>
      <div>ลงชื่อ${DOTS} หัวหน้าหน่วยงานย่อย</div>
    </div>
  </div>`

  return FORM_CSS + header + table + signatures
}

// ───────────────────────────────────────────────────────────────────────────
// 2) งบเทียบยอดเงินฝากธนาคาร (finance4 หน้า 23 / form-029)
// ───────────────────────────────────────────────────────────────────────────
export interface ReconItem {
  label: string
  amount: number
}
export interface BankReconFormOpts {
  scName?: string
  bankName?: string
  accountNo?: string
  date: string
  bankStatementBalance: number
  /** หัก: เช็คสั่งจ่ายที่ยังไม่ขึ้นเงิน */
  outstandingChecks: ReconItem[]
  /** บวก/เพิ่ม: เงินโอนเข้าที่ยังไม่บันทึก ฯลฯ */
  depositsInTransit: ReconItem[]
  /** ยอดคงเหลือตามทะเบียนเงินฝากธนาคาร (ตามบัญชีโรงเรียน) */
  bookBalance: number
  preparerName?: string
  preparerPosition?: string
}

export function officialBankReconciliationForm(o: BankReconFormOpts): string {
  const sumChecks = o.outstandingChecks.reduce((s, i) => s + Number(i.amount || 0), 0)
  const sumDeposits = o.depositsInTransit.reduce((s, i) => s + Number(i.amount || 0), 0)
  const adjusted = Number(o.bankStatementBalance) - sumChecks + sumDeposits

  const header = officialHeader('งบเทียบยอดเงินฝากธนาคาร', [
    `โรงเรียน${o.scName ? esc(o.scName) : `<span class="of-dotted of-dots"></span>`}`,
    `ธนาคาร${o.bankName ? esc(o.bankName) : `<span class="of-dotted of-dots"></span>`}`,
    `ประเภทกระแสรายวัน เลขที่บัญชี${o.accountNo ? esc(o.accountNo) : `<span class="of-dotted of-dots"></span>`}`,
    `ณ วันที่ ${esc(thaiFullDate(o.date))}`,
  ])

  const checkRows = o.outstandingChecks
    .map(
      (c, i) =>
        `<tr><td style="padding-left:14mm">1.${i + 1} ${esc(c.label)}</td><td class="amt">${fmtBaht(c.amount)}</td></tr>`,
    )
    .join('')
  const depRows = o.depositsInTransit
    .map(
      (c, i) =>
        `<tr><td style="padding-left:14mm">2.${i + 1} ${esc(c.label)}</td><td class="amt">${fmtBaht(c.amount)}</td></tr>`,
    )
    .join('')

  const table = `<table class="of-recon"><tbody>
    <tr><td></td><td style="text-align:right;font-weight:bold">บาท</td></tr>
    <tr><td>ยอดคงเหลือตามใบแจ้งยอดจากธนาคาร (Bank Statement)</td><td class="amt">${fmtBaht(o.bankStatementBalance)}</td></tr>
    <tr><td><b>หัก</b> 1. เช็คสั่งจ่ายที่ยังไม่ไปขึ้นเงินที่ธนาคาร</td><td></td></tr>
    ${checkRows || `<tr><td style="padding-left:14mm">1.1 ${LONGDOTS}</td><td class="amt"></td></tr>`}
    <tr><td style="text-align:right;font-style:italic">รวมหัก</td><td class="amt">${fmtBaht(sumChecks)}</td></tr>
    <tr><td>&nbsp;&nbsp;&nbsp;2. เงินที่ สพฐ./สพท. โอนเข้าบัญชีธนาคารแต่โรงเรียนยังไม่ได้บันทึกรับเงิน</td><td></td></tr>
    ${depRows || `<tr><td style="padding-left:14mm">2.1 ${LONGDOTS}</td><td class="amt"></td></tr>`}
    <tr><td style="text-align:right;font-style:italic"><b>บวก</b> รวมเพิ่ม</td><td class="amt">${fmtBaht(sumDeposits)}</td></tr>
    <tr><td style="padding-left:14mm"><b>ยอดคงเหลือตามบัญชีเงินฝากธนาคารหลังปรับปรุงแล้ว</b></td><td class="amt"><b>${fmtBaht(adjusted)}</b></td></tr>
    <tr><td style="padding-left:14mm"><b>ยอดคงเหลือในทะเบียนเงินฝากธนาคาร</b></td><td class="amt"><b>${fmtBaht(o.bookBalance)}</b></td></tr>
  </tbody></table>`

  const matched = Math.abs(adjusted - Number(o.bookBalance)) < 0.01
  const note = matched
    ? ''
    : `<div style="margin-top:4mm;color:#a00;font-size:12pt">* ยอดยังไม่ตรงกัน ผลต่าง ${fmtBaht(adjusted - Number(o.bookBalance))} บาท</div>`

  const nm = (v?: string) => (v ? esc(v) : DOTS)
  const signatures = `<div class="of-sign-wrap of-sign-c" style="margin-top:16mm">
    <div>ลงชื่อ${nm(o.preparerName)} ผู้จัดทำ</div>
    <div>(${o.preparerName ? esc(o.preparerName) : DOTS})</div>
    <div>ตำแหน่ง ${nm(o.preparerPosition)}</div>
  </div>`

  return FORM_CSS + header + table + note + signatures
}

// ───────────────────────────────────────────────────────────────────────────
// 3) ทะเบียนคุมเงินนอกงบประมาณ (finance4 หน้า 18 / form-024)
//    ใช้กับทะเบียนคุมเงินแยกประเภทได้ทั่วไป
// ───────────────────────────────────────────────────────────────────────────
export interface RegisterFormRow {
  date?: string | null
  docNo?: string | null
  detail?: string | null
  receive?: number | null
  pay?: number | null
  cash?: number | null
  bank?: number | null
  smp?: number | null
  note?: string | null
}

export interface RegisterFormOpts {
  scName?: string
  fundTypeName?: string
  budgetYear?: string | number
  rows: RegisterFormRow[]
}

export function officialNonBudgetRegisterForm(o: RegisterFormOpts): string {
  const header = officialHeader('ทะเบียนคุมเงินนอกงบประมาณ', [
    `ประเภท ${o.fundTypeName ? esc(o.fundTypeName) : `<span class="of-dotted of-dots"></span>`}`,
    `โรงเรียน${o.scName ? esc(o.scName) : ''}${o.budgetYear ? ` ปีงบประมาณ ${esc(String(o.budgetYear))}` : ''}`,
  ])

  const body = o.rows
    .map(
      (r) => `<tr>
      <td class="ctr">${r.date ? esc(thaiFullDate(r.date)) : ''}</td>
      <td class="ctr">${r.docNo ? esc(r.docNo) : ''}</td>
      <td>${r.detail ? esc(r.detail) : ''}</td>
      <td class="num">${r.receive ? fmtBaht(r.receive) : ''}</td>
      <td class="num">${r.pay ? fmtBaht(r.pay) : ''}</td>
      <td class="num">${r.cash != null ? fmtBaht(r.cash) : ''}</td>
      <td class="num">${r.bank != null ? fmtBaht(r.bank) : ''}</td>
      <td class="num">${r.smp != null ? fmtBaht(r.smp) : ''}</td>
      <td>${r.note ? esc(r.note) : ''}</td>
    </tr>`,
    )
    .join('')

  const table = `<table class="of">
    <thead>
      <tr>
        <th rowspan="2">วัน เดือน ปี</th>
        <th rowspan="2">ที่เอกสาร</th>
        <th rowspan="2">รายการ</th>
        <th>รับ</th>
        <th>จ่าย</th>
        <th colspan="3">คงเหลือ</th>
        <th rowspan="2">หมายเหตุ</th>
      </tr>
      <tr>
        <th>จำนวนเงิน</th>
        <th>จำนวนเงิน</th>
        <th>เงินสด</th>
        <th>เงินฝากธนาคาร</th>
        <th>เงินฝากส่วนราชการผู้เบิก</th>
      </tr>
    </thead>
    <tbody>${body || `<tr><td colspan="9" class="ctr">— ไม่มีรายการ —</td></tr>`}</tbody>
  </table>`

  return FORM_CSS + header + table
}

// ───────────────────────────────────────────────────────────────────────────
// 4) ทะเบียนคุมหลักฐานขอเบิก (finance4 หน้า 14 / form-020)
// ───────────────────────────────────────────────────────────────────────────
export interface EvidenceRegisterRow {
  date?: string | null
  creditor?: string | null
  expenseType?: string | null
  amount?: number | null
  receiverSign?: string | null
  sendDate?: string | null
  note?: string | null
}
export interface EvidenceRegisterOpts {
  scName?: string
  budgetYear?: string | number
  rows: EvidenceRegisterRow[]
}

export function officialDisbursementEvidenceRegister(o: EvidenceRegisterOpts): string {
  const header = officialHeader('ทะเบียนคุมหลักฐานขอเบิก', [
    o.scName ? `โรงเรียน${esc(o.scName)}${o.budgetYear ? ` ปีงบประมาณ ${esc(String(o.budgetYear))}` : ''}` : '',
  ].filter(Boolean))

  const total = o.rows.reduce((s, r) => s + Number(r.amount || 0), 0)
  const body = o.rows
    .map(
      (r) => `<tr>
      <td class="ctr">${r.date ? esc(thaiFullDate(r.date)) : ''}</td>
      <td>${r.creditor ? esc(r.creditor) : ''}</td>
      <td>${r.expenseType ? esc(r.expenseType) : ''}</td>
      <td class="num">${r.amount ? fmtBaht(r.amount) : ''}</td>
      <td>${r.receiverSign ? esc(r.receiverSign) : ''}</td>
      <td class="ctr">${r.sendDate ? esc(thaiFullDate(r.sendDate)) : ''}</td>
      <td>${r.note ? esc(r.note) : ''}</td>
    </tr>`,
    )
    .join('')

  const table = `<table class="of">
    <thead><tr>
      <th>วัน เดือน ปี</th>
      <th>เจ้าหนี้หรือผู้ขอเบิก</th>
      <th>ประเภทรายจ่าย</th>
      <th>จำนวนเงิน</th>
      <th>ลายมือชื่อผู้รับหลักฐาน</th>
      <th>วัน เดือน ปี<br/>ที่ส่งส่วนราชการผู้เบิก</th>
      <th>หมายเหตุ</th>
    </tr></thead>
    <tbody>${body || `<tr><td colspan="7" class="ctr">— ไม่มีรายการ —</td></tr>`}</tbody>
    <tfoot><tr>
      <td colspan="3" class="ctr"><b>รวม</b></td>
      <td class="num">${fmtBaht(total)}</td>
      <td colspan="3"></td>
    </tr></tfoot>
  </table>`

  return FORM_CSS + header + table
}

// ───────────────────────────────────────────────────────────────────────────
// 5) รายงานการรับ - จ่ายเงินรายได้สถานศึกษา ประจำปีงบประมาณ (finance4 หน้า 24 / form-030)
//    โครงสร้างหัวข้อคงที่ตามแบบ ; เติมจำนวนเงินจาก amounts (key) ถ้ามี
// ───────────────────────────────────────────────────────────────────────────
export interface SchoolRevenueIncome {
  raachapasadu?: number
  fine_study?: number
  fine_contract?: number
  donation_clear?: number
  donation_unclear?: number
  edu_support?: number
  other?: number
}
export interface SchoolRevenueExpense {
  personnel_wage?: number
  operate_remuneration?: number
  operate_service?: number
  operate_material?: number
  operate_utility?: number
  invest_durable?: number
  invest_land?: number
  subsidy?: number
  other?: number
}
export interface SchoolRevenueReportOpts {
  scName?: string
  areaName?: string
  fiscalYear?: string | number
  date?: string
  opening?: number
  totalReceive: number
  totalPay: number
  carryForward: number
  /** ยอดแยกหมวด (ถ้ามี — เติมในแต่ละบรรทัด) */
  income?: SchoolRevenueIncome
  expense?: SchoolRevenueExpense
}

export function officialSchoolRevenueReport(o: SchoolRevenueReportOpts): string {
  const header = officialHeader(
    `รายงานการรับ - จ่ายเงินรายได้สถานศึกษา ประจำปีงบประมาณ ${o.fiscalYear ? esc(String(o.fiscalYear)) : '..............'}`,
    [
      `โรงเรียน${o.scName ? esc(o.scName) : '<span class="of-dotted of-dots"></span>'} สังกัด${o.areaName ? esc(o.areaName) : 'สำนักงานเขตพื้นที่การศึกษา<span class="of-dotted of-dots"></span>'}`,
      `ณ วันที่ ${o.date ? esc(thaiFullDate(o.date)) : '..............'}`,
    ],
  )

  const inc = o.income ?? {}
  const exp = o.expense ?? {}
  // แสดงเฉพาะค่าที่ > 0 ; ค่า 0/undefined ปล่อยว่างให้กรอกมือ
  const amt = (v?: number) => (v != null && v !== 0 ? fmtBaht(v) : '')
  const r = (label: string, val?: number, indent = 0, bold = false) =>
    `<tr><td style="padding-left:${4 + indent * 8}mm">${bold ? `<b>${esc(label)}</b>` : esc(label)}</td><td class="num">${bold ? `<b>${amt(val)}</b>` : amt(val)}</td></tr>`

  const table = `<table class="of" style="width:90%;margin:0 auto">
    <thead><tr><th>รายการ</th><th style="width:30mm">จำนวนเงิน</th></tr></thead>
    <tbody>
      ${r('ยอดยกมาจากปีงบประมาณที่ผ่านมา', o.opening)}
      ${r('รายรับ', undefined, 0, true)}
      ${r('1. ผลประโยชน์จากที่ราชพัสดุ', inc.raachapasadu, 1)}
      ${r('2. เบี้ยปรับจากการผิดสัญญาลาศึกษา', inc.fine_study, 1)}
      ${r('3. เบี้ยปรับจากการผิดสัญญาการซื้อทรัพย์สินหรือจ้างทำของด้วยเงินงบประมาณ', inc.fine_contract, 1)}
      ${r('4. เงินที่มีผู้มอบให้ โดย', undefined, 1)}
      ${r('4.1 ระบุวัตถุประสงค์ชัดแจ้ง', inc.donation_clear, 2)}
      ${r('4.2 ระบุวัตถุประสงค์ไม่ชัดแจ้ง', inc.donation_unclear, 2)}
      ${r('5. เงินบำรุงการศึกษา', inc.edu_support, 1)}
      ${r('6. ผลประโยชน์อื่น ๆ', inc.other, 1)}
      ${r('รวมรายรับ', o.totalReceive, 0, true)}
      ${r('รายจ่าย', undefined, 0, true)}
      ${r('1. งบบุคลากร รายการค่าจ้างชั่วคราว', exp.personnel_wage, 1)}
      ${r('2. งบดำเนินงาน', undefined, 1)}
      ${r('2.1 ค่าตอบแทน', exp.operate_remuneration, 2)}
      ${r('2.2 ค่าใช้สอย', exp.operate_service, 2)}
      ${r('2.3 ค่าวัสดุ', exp.operate_material, 2)}
      ${r('2.4 ค่าสาธารณูปโภค', exp.operate_utility, 2)}
      ${r('3. งบลงทุน', undefined, 1)}
      ${r('3.1 ค่าครุภัณฑ์', exp.invest_durable, 2)}
      ${r('3.2 ค่าที่ดินและสิ่งก่อสร้าง', exp.invest_land, 2)}
      ${r('4. งบเงินอุดหนุน', exp.subsidy, 1)}
      ${r('5. อื่น ๆ', exp.other, 1)}
      ${r('รวมรายจ่าย', o.totalPay, 0, true)}
      <tr><td class="ctr"><b>ยอดยกไป</b></td><td class="num"><b>${amt(o.carryForward)}</b></td></tr>
    </tbody>
  </table>`

  const signatures = `<div class="of-sign-wrap of-sign-c" style="margin-top:14mm">
    <div>ลงชื่อ${DOTS} ผู้จัดทำ</div>
    <div>ลงชื่อ${DOTS} ผู้อำนวยการสถานศึกษา</div>
  </div>`

  return FORM_CSS + header + table + signatures
}

// ───────────────────────────────────────────────────────────────────────────
// 6) ใบเสร็จรับเงิน (ระเบียบกระทรวงการคลัง พ.ศ. 2562 ข้อ 46/69)
// ───────────────────────────────────────────────────────────────────────────
export interface ReceiptOpts {
  scName?: string
  receiptNo?: string
  bookNo?: string
  date?: string
  payer?: string
  payerAddress?: string
  items: { detail: string; amount: number }[]
  receiverName?: string
  receiverPosition?: string
}

export function officialReceipt(o: ReceiptOpts): string {
  const total = o.items.reduce((s, i) => s + Number(i.amount || 0), 0)
  const itemRows = o.items
    .map(
      (i) =>
        `<tr><td>${esc(i.detail)}</td><td class="num">${fmtBaht(i.amount)}</td></tr>`,
    )
    .join('')

  const header = `<div class="of-title">
    <div class="of-h1">ใบเสร็จรับเงิน</div>
    <div class="of-line">โรงเรียน${o.scName ? esc(o.scName) : '<span class="of-dotted of-dots"></span>'}</div>
  </div>
  <table class="of-recon" style="margin-bottom:4mm"><tbody><tr>
    <td>เล่มที่ ${o.bookNo ? esc(o.bookNo) : '............'}</td>
    <td style="text-align:right">เลขที่ ${o.receiptNo ? esc(o.receiptNo) : '............'}</td>
  </tr><tr>
    <td colspan="2" style="text-align:right">วันที่ ${o.date ? esc(thaiFullDate(o.date)) : '..............'}</td>
  </tr></tbody></table>
  <div style="margin:3mm 0">ได้รับเงินจาก ${o.payer ? esc(o.payer) : '<span class="of-dotted of-dots" style="min-width:80mm"></span>'}</div>
  <div style="margin:3mm 0">ที่อยู่ ${o.payerAddress ? esc(o.payerAddress) : '<span class="of-dotted of-dots" style="min-width:90mm"></span>'}</div>`

  const table = `<table class="of">
    <thead><tr><th>รายการ</th><th style="width:35mm">จำนวนเงิน</th></tr></thead>
    <tbody>${itemRows || '<tr><td>&nbsp;</td><td></td></tr>'}</tbody>
    <tfoot>
      <tr><td class="ctr"><b>รวมเงิน (ตัวอักษร) ${esc(numberToThaiBaht(total))}</b></td><td class="num"><b>${fmtBaht(total)}</b></td></tr>
    </tfoot>
  </table>`

  const nm = (v?: string) => (v ? esc(v) : DOTS)
  const signatures = `<div class="of-sign-wrap of-sign-c" style="margin-top:14mm">
    <div>ลงชื่อ${nm(o.receiverName)} ผู้รับเงิน</div>
    <div>(${o.receiverName ? esc(o.receiverName) : DOTS})</div>
    <div>ตำแหน่ง ${nm(o.receiverPosition)}</div>
  </div>`

  return FORM_CSS + header + table + signatures
}

// ───────────────────────────────────────────────────────────────────────────
// 6.1) บันทึกการรับเงินเพื่อเก็บรักษา (กลุ่มตรวจสอบภายใน สพฐ.)
//      ออกเมื่อรับเงินสด — ผอ. รับเก็บรักษา แล้วส่งคืนเจ้าหน้าที่การเงินวันถัดไป
// ───────────────────────────────────────────────────────────────────────────
export interface CashKeepingFormOpts {
  scName?: string
  date?: string
  rows: { detail: string; amount: number; note?: string }[]
  /** ผู้อำนวยการ (ผู้รับเก็บรักษา) */
  directorName?: string
  /** เจ้าหน้าที่การเงิน (ผู้ส่งมอบ / ผู้รับเงินคืน) */
  financeOfficerName?: string
  returnedDate?: string | null
  returnedAmount?: number | null
  /** ครุฑ (data URI) — ถ้าส่งมาจะแสดงหัวกระดาษราชการ */
  emblemSrc?: string
}

export function officialCashKeepingForm(o: CashKeepingFormOpts): string {
  const total = o.rows.reduce((s, r) => s + Number(r.amount || 0), 0)
  const emblem = o.emblemSrc
    ? `<div style="text-align:center;margin-bottom:2mm"><img src="${o.emblemSrc}" alt="ครุฑ" style="height:15mm;width:auto"/></div>`
    : ''

  const header = officialHeader('บันทึกการรับเงินเพื่อเก็บรักษา', [
    `โรงเรียน${o.scName ? esc(o.scName) : '<span class="of-dotted of-dots"></span>'}`,
    `วันที่ ${o.date ? esc(thaiFullDate(o.date)) : '<span class="of-dotted of-dots"></span>'}`,
  ])

  const dataRows = o.rows.length ? o.rows : [{ detail: '', amount: 0 }]
  const bodyRows = dataRows
    .map(
      (r) =>
        `<tr><td>${esc(r.detail || '')}</td><td class="num">${r.amount ? fmtBaht(r.amount) : ''}</td><td>${r.note ? esc(r.note) : ''}</td></tr>`,
    )
    .join('')
  const pad = Math.max(0, 4 - dataRows.length)
  const padRows = Array.from({ length: pad })
    .map(() => `<tr><td>&nbsp;</td><td></td><td></td></tr>`)
    .join('')

  const table = `<table class="of">
    <thead><tr><th>รายการ</th><th style="width:35mm">จำนวนเงิน</th><th style="width:30mm">หมายเหตุ</th></tr></thead>
    <tbody>${bodyRows}${padRows}</tbody>
    <tfoot><tr><td class="ctr"><b>รวมทั้งสิ้น</b></td><td class="num"><b>${fmtBaht(total)}</b></td><td></td></tr></tfoot>
  </table>`

  const amountText = `<div style="margin:3mm 0">จำนวนเงิน (<b>${esc(numberToThaiBaht(total))}</b>)</div>`

  const director = o.directorName ? esc(o.directorName) : DOTS
  const finance = o.financeOfficerName ? esc(o.financeOfficerName) : DOTS

  const keepBlock = `<div style="margin:3mm 0">ข้าพเจ้าจะรับผิดชอบในการเก็บรักษาเงินดังกล่าว และจะส่งคืนให้เจ้าหน้าที่การเงิน เพื่อจ่ายในวันทำการถัดไป</div>
  <div class="of-sign-wrap of-sign-c">
    <div>ลงชื่อ ${director}</div>
    <div>(${director})</div>
    <div>ผู้อำนวยการโรงเรียน${o.scName ? esc(o.scName) : ''}</div>
  </div>`

  const returnAmt =
    o.returnedAmount != null ? fmtBaht(o.returnedAmount) : DOTS
  const returnDate = o.returnedDate ? esc(thaiFullDate(o.returnedDate)) : DOTS
  const returnBlock = `<div style="margin:8mm 0 0">ข้าพเจ้าได้รับเงิน จำนวน ${returnAmt} บาท คืนจากผู้อำนวยการโรงเรียน${o.scName ? esc(o.scName) : ''} ในวันที่ ${returnDate} เพื่อจะนำไปจ่ายตามระเบียบของทางราชการ</div>
  <div class="of-sign-wrap of-sign-c">
    <div>ลงชื่อ ${finance}</div>
    <div>(${finance})</div>
    <div>เจ้าหน้าที่การเงิน</div>
  </div>`

  const note = `<div style="margin-top:8mm;font-size:12pt"><u>หมายเหตุ</u> บันทึกการรับเงินเพื่อเก็บรักษา ให้ถือเป็นหลักฐานแทนตัวเงิน ซึ่งจะต้องบันทึกไว้ทุกวันในวันที่เก็บรักษาเงินสด และจะต้องนำมาบันทึกไว้ในรายงานเงินคงเหลือประจำวัน</div>`

  const intro = `<div style="margin:3mm 0">ข้าพเจ้าได้รับเงินคงเหลือตามรายการ ดังต่อไปนี้</div>`

  return (
    FORM_CSS +
    emblem +
    header +
    intro +
    table +
    amountText +
    keepBlock +
    returnBlock +
    note
  )
}

// ───────────────────────────────────────────────────────────────────────────
// 7) ทะเบียนคุมลูกหนี้เงินยืม (ระบบควบคุมเงินหน่วยงานย่อย 2544)
// ───────────────────────────────────────────────────────────────────────────
export interface LoanRegisterRow {
  no?: number | string
  borrower?: string | null
  contractNo?: string | null
  borrowDate?: string | null
  amount?: number | null
  purpose?: string | null
  dueDate?: string | null
  returnDate?: string | null
  outstanding?: number | null
  note?: string | null
}
export interface LoanRegisterOpts {
  scName?: string
  budgetYear?: string | number
  rows: LoanRegisterRow[]
}

export function officialLoanDebtorRegister(o: LoanRegisterOpts): string {
  const header = officialHeader('ทะเบียนคุมลูกหนี้เงินยืม', [
    o.scName ? `โรงเรียน${esc(o.scName)}${o.budgetYear ? ` ปีงบประมาณ ${esc(String(o.budgetYear))}` : ''}` : '',
  ].filter(Boolean))

  const body = o.rows
    .map(
      (r) => `<tr>
      <td class="ctr">${r.no ?? ''}</td>
      <td>${r.borrower ? esc(r.borrower) : ''}</td>
      <td class="ctr">${r.contractNo ? esc(r.contractNo) : ''}</td>
      <td class="ctr">${r.borrowDate ? esc(thaiFullDate(r.borrowDate)) : ''}</td>
      <td class="num">${r.amount ? fmtBaht(r.amount) : ''}</td>
      <td>${r.purpose ? esc(r.purpose) : ''}</td>
      <td class="ctr">${r.dueDate ? esc(thaiFullDate(r.dueDate)) : ''}</td>
      <td class="ctr">${r.returnDate ? esc(thaiFullDate(r.returnDate)) : ''}</td>
      <td class="num">${r.outstanding != null ? fmtBaht(r.outstanding) : ''}</td>
      <td>${r.note ? esc(r.note) : ''}</td>
    </tr>`,
    )
    .join('')

  const table = `<table class="of">
    <thead><tr>
      <th>ลำดับ</th>
      <th>ชื่อ-สกุลผู้ยืม</th>
      <th>เลขที่สัญญา (บย.)</th>
      <th>วันที่ยืม</th>
      <th>จำนวนเงินยืม</th>
      <th>วัตถุประสงค์</th>
      <th>กำหนดส่งใช้</th>
      <th>วันที่ส่งใช้</th>
      <th>คงค้าง</th>
      <th>หมายเหตุ</th>
    </tr></thead>
    <tbody>${body || `<tr><td colspan="10" class="ctr">— ไม่มีรายการ —</td></tr>`}</tbody>
  </table>`

  return FORM_CSS + header + table
}
