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
// 3) ทะเบียนคุมเงินนอกงบประมาณ (คู่มือ ตย.8 มาตรฐาน / ตย.15 เงินรายได้สถานศึกษา)
//    - แยกช่อง "จ่าย" เป็น ลูกหนี้ | ใบสำคัญ
//    - คงเหลือแยก เงินสด | เงินฝากธนาคาร | เงินฝากส่วนราชการผู้เบิก (running balance)
//    - มีแถว ยอดยกมา / รวมเดือนนี้ / รวมแต่ต้นปี ทุกเดือน
//    - variant 'school_revenue' แยกหมวด รายรับ/รายจ่าย ตาม ตย.15
// ───────────────────────────────────────────────────────────────────────────
export interface RegisterTxnRow {
  date: string // YYYY-MM-DD (ค.ศ.)
  docNo?: string | null
  detail?: string | null
  // ── variant 'standard' ──
  receive?: number | null
  payDebtor?: number | null // จ่าย: ลูกหนี้ (เงินยืม)
  payVoucher?: number | null // จ่าย: ใบสำคัญ (จ่ายปกติ)
  // ── variant 'school_revenue' : รายรับ ──
  inLgo?: number | null // โครงการจาก อปท.
  inDonation?: number | null // เงินบริจาค
  inOther?: number | null // รายได้อื่น ๆ
  // ── variant 'school_revenue' : รายจ่าย ──
  outTeacher?: number | null // ค่าจ้างครู
  outOperate?: number | null // ค่าตอบแทน ใช้สอย และวัสดุ
  outUtility?: number | null // ค่าสาธารณูปโภค
  /** ช่องที่ยอดคงเหลือเปลี่ยน (running balance) — default 'bank' */
  storage?: 'cash' | 'bank' | 'smp'
  note?: string | null
}

export interface RegisterFormOpts {
  scName?: string
  fundTypeName?: string
  budgetYear?: string | number
  variant?: 'standard' | 'school_revenue'
  /** ยอดยกมาต้นปี แยกตามที่เก็บเงิน */
  opening?: { cash?: number; bank?: number; smp?: number }
  rows: RegisterTxnRow[]
}

export function officialNonBudgetRegisterForm(o: RegisterFormOpts): string {
  const isSR = (o.variant ?? 'standard') === 'school_revenue'
  const header = officialHeader('ทะเบียนคุมเงินนอกงบประมาณ', [
    `ประเภท ${o.fundTypeName ? esc(o.fundTypeName) : `<span class="of-dotted of-dots"></span>`}`,
    `โรงเรียน${o.scName ? esc(o.scName) : ''}${o.budgetYear ? ` ปีงบประมาณ ${esc(String(o.budgetYear))}` : ''}`,
  ])

  const n = (v: number) => (v ? fmtBaht(v) : '')
  const colCount = isSR ? 15 : 10

  // running balance แยกที่เก็บเงิน + ยอดสะสมแต่ต้นปี
  let rCash = Number(o.opening?.cash || 0)
  let rBank = Number(o.opening?.bank || 0)
  let rSmp = Number(o.opening?.smp || 0)
  const openTotal = rCash + rBank + rSmp
  let cRcv = 0, cDebtor = 0, cVoucher = 0 // standard cumulative
  let cLgo = 0, cDon = 0, cOther = 0, cTea = 0, cOpe = 0, cUti = 0 // SR cumulative

  const balCells = () =>
    `<td class="num">${n(rCash)}</td><td class="num">${n(rBank)}</td><td class="num">${n(rSmp)}</td>`
  const emptyBal = `<td></td><td></td><td></td>`

  // แถวมาตรฐาน (standard)
  const stdRow = (
    date: string, docNo: string, detail: string,
    rcv: number, debtor: number, voucher: number,
    bal: string, note = '', bold = false,
  ) => {
    const b = (s: string) => (bold && s ? `<b>${s}</b>` : s)
    return `<tr>
      <td class="ctr">${esc(date)}</td><td class="ctr">${esc(docNo)}</td>
      <td>${b(esc(detail))}</td>
      <td class="num">${b(n(rcv))}</td><td class="num">${b(n(debtor))}</td><td class="num">${b(n(voucher))}</td>
      ${bal}<td>${esc(note)}</td>
    </tr>`
  }
  // แถวเงินรายได้สถานศึกษา (school_revenue)
  const srRow = (
    date: string, docNo: string, detail: string,
    lgo: number, don: number, other: number,
    tea: number, ope: number, uti: number,
    bal: string, note = '', bold = false,
  ) => {
    const b = (s: string) => (bold && s ? `<b>${s}</b>` : s)
    const inSum = lgo + don + other
    const outSum = tea + ope + uti
    return `<tr>
      <td class="ctr">${esc(date)}</td><td class="ctr">${esc(docNo)}</td>
      <td>${b(esc(detail))}</td>
      <td class="num">${b(n(lgo))}</td><td class="num">${b(n(don))}</td><td class="num">${b(n(other))}</td><td class="num">${b(n(inSum))}</td>
      <td class="num">${b(n(tea))}</td><td class="num">${b(n(ope))}</td><td class="num">${b(n(uti))}</td><td class="num">${b(n(outSum))}</td>
      ${bal}<td>${esc(note)}</td>
    </tr>`
  }

  // จัดกลุ่มรายการตามเดือน (YYYY-MM) เรียงตามลำดับเดิม
  const groups: { ym: string; rows: RegisterTxnRow[] }[] = []
  for (const r of o.rows) {
    const ym = (r.date || '').slice(0, 7)
    const g = groups[groups.length - 1]
    if (g && g.ym === ym) g.rows.push(r)
    else groups.push({ ym, rows: [r] })
  }

  const parts: string[] = []
  for (const g of groups) {
    // ยอดยกมา (คงเหลือ ณ ต้นเดือน = running balance ปัจจุบัน)
    parts.push(isSR
      ? srRow('', '', 'ยอดยกมา', 0, 0, 0, 0, 0, 0, balCells())
      : stdRow('', '', 'ยอดยกมา', 0, 0, 0, balCells()))
    let mRcv = 0, mDebtor = 0, mVoucher = 0
    let mLgo = 0, mDon = 0, mOther = 0, mTea = 0, mOpe = 0, mUti = 0
    for (const r of g.rows) {
      const date = r.date ? thaiFullDate(r.date) : ''
      const store = r.storage ?? 'bank'
      if (isSR) {
        const lgo = Number(r.inLgo || 0), don = Number(r.inDonation || 0), other = Number(r.inOther || 0)
        const tea = Number(r.outTeacher || 0), ope = Number(r.outOperate || 0), uti = Number(r.outUtility || 0)
        const net = lgo + don + other - tea - ope - uti
        if (store === 'cash') rCash += net; else if (store === 'smp') rSmp += net; else rBank += net
        mLgo += lgo; mDon += don; mOther += other; mTea += tea; mOpe += ope; mUti += uti
        cLgo += lgo; cDon += don; cOther += other; cTea += tea; cOpe += ope; cUti += uti
        parts.push(srRow(date, r.docNo || '', r.detail || '', lgo, don, other, tea, ope, uti, balCells(), r.note || ''))
      } else {
        const rcv = Number(r.receive || 0), debtor = Number(r.payDebtor || 0), voucher = Number(r.payVoucher || 0)
        const net = rcv - debtor - voucher
        if (store === 'cash') rCash += net; else if (store === 'smp') rSmp += net; else rBank += net
        mRcv += rcv; mDebtor += debtor; mVoucher += voucher
        cRcv += rcv; cDebtor += debtor; cVoucher += voucher
        parts.push(stdRow(date, r.docNo || '', r.detail || '', rcv, debtor, voucher, balCells(), r.note || ''))
      }
    }
    // รวมเดือนนี้ (ไม่แสดงคงเหลือ) + รวมแต่ต้นปี (แสดงคงเหลือ ; รับ = ยอดยกมา + รับสะสม)
    if (isSR) {
      parts.push(srRow('', '', 'รวมเดือนนี้', mLgo, mDon, mOther, mTea, mOpe, mUti, emptyBal, '', true))
      parts.push(srRow('', '', 'รวมแต่ต้นปี', cLgo, cDon, cOther + openTotal, cTea, cOpe, cUti, balCells(), '', true))
    } else {
      parts.push(stdRow('', '', 'รวมเดือนนี้', mRcv, mDebtor, mVoucher, emptyBal, '', true))
      parts.push(stdRow('', '', 'รวมแต่ต้นปี', openTotal + cRcv, cDebtor, cVoucher, balCells(), '', true))
    }
  }

  const headRow2 = isSR
    ? `<th>โครงการจาก อปท.</th><th>เงินบริจาค</th><th>รายได้อื่น ๆ</th><th>รวม</th>
       <th>ค่าจ้างครู</th><th>ค่าตอบแทน ใช้สอย และวัสดุ</th><th>ค่าสาธารณูปโภค</th><th>รวม</th>
       <th>เงินสด</th><th>เงินฝากธนาคาร</th><th>เงินฝากส่วนราชการผู้เบิก</th>`
    : `<th>จำนวนเงิน</th><th>ลูกหนี้</th><th>ใบสำคัญ</th>
       <th>เงินสด</th><th>เงินฝากธนาคาร</th><th>เงินฝากส่วนราชการผู้เบิก</th>`
  const headRow1 = isSR
    ? `<th colspan="4">รายรับ</th><th colspan="4">รายจ่าย</th><th colspan="3">คงเหลือ</th>`
    : `<th rowspan="2">รับ</th><th colspan="2">จ่าย</th><th colspan="3">คงเหลือ</th>`

  const table = `<table class="of">
    <thead>
      <tr>
        <th rowspan="2">วัน เดือน ปี</th>
        <th rowspan="2">ที่เอกสาร</th>
        <th rowspan="2">รายการ</th>
        ${headRow1}
        <th rowspan="2">หมายเหตุ</th>
      </tr>
      <tr>${headRow2}</tr>
    </thead>
    <tbody>${parts.join('') || `<tr><td colspan="${colCount}" class="ctr">— ไม่มีรายการ —</td></tr>`}</tbody>
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

// ───────────────────────────────────────────────────────────────────────────
// 8) สัญญาการยืมเงิน (ตัวอย่างที่ 34) — ด้านหน้า (สัญญา+ลงนาม) + ด้านหลัง (รายการส่งใช้)
// ───────────────────────────────────────────────────────────────────────────
export interface LoanSettlementRow {
  date?: string | null
  /** ประเภทการส่งใช้: 'เงินสด' | 'ใบสำคัญ' */
  type?: string | null
  amount?: number | null
  /** ยอดคงค้างหลังส่งใช้รายการนี้ */
  outstanding?: number | null
  receiver?: string | null
  receiptNo?: string | null
}

export interface LoanAgreementFormOpts {
  laNo?: string | null
  scName?: string
  /** วันรับรองการเงิน (ปกติใช้วันตรวจสอบ/อนุมัติ) */
  financeDate?: string | null
  // ผู้ยืม
  borrowerName?: string | null
  borrowerPosition?: string | null
  affiliation?: string | null
  province?: string | null
  // รายละเอียดการยืม
  moneyTypeName?: string | null
  purpose?: string | null
  expenseDetail?: string | null
  amount: number
  dueDays?: number | null
  borrowDate?: string | null
  // workflow อนุมัติ
  verifyName?: string | null
  verifyDate?: string | null
  approveName?: string | null
  approveDate?: string | null
  approveAmount?: number | null
  receiptDate?: string | null
  // ด้านหลัง — รายการส่งใช้
  settlements?: LoanSettlementRow[]
}

/** CSS เฉพาะสัญญายืมเงิน (กรอบ + ช่องลงนาม) */
const LOAN_CSS = `<style>
  .la-frame { border:1.5px solid #000; padding:5mm 6mm; }
  .la-corner { text-align:right; font-size:12pt; margin-bottom:1mm; }
  .la-title { text-align:center; font-size:17pt; font-weight:bold; margin:1mm 0 4mm; }
  .la-row { font-size:13.5pt; line-height:1.9; }
  .la-fill { border-bottom:1px dotted #000; padding:0 3mm; }
  .la-amount-box { border:1px solid #000; padding:1mm 3mm; font-weight:bold; white-space:nowrap; }
  .la-sec { border-top:1px solid #000; margin-top:4mm; padding-top:3mm; font-size:13pt; }
  .la-sec-h { font-weight:bold; }
  .la-sign { margin-top:7mm; text-align:center; font-size:13pt; }
  .la-pagebreak { page-break-before: always; }
</style>`

function laFill(v?: string | null, min = '40mm'): string {
  return `<span class="la-fill" style="min-width:${min}">${v ? esc(v) : ''}</span>`
}

/** ด้านหน้า: ตัวสัญญา + เสนอตรวจสอบ + คำอนุมัติ + ใบรับเงิน */
function loanAgreementFront(o: LoanAgreementFormOpts): string {
  const amount = Number(o.amount || 0)
  const approveAmount = o.approveAmount != null ? Number(o.approveAmount) : amount
  const dueDays = o.dueDays && o.dueDays > 0 ? o.dueDays : null

  const head = `<div class="la-corner">ตัวอย่างที่ 34</div>
  <div class="la-title">สัญญาการยืมเงิน</div>
  <div class="la-row" style="display:flex;justify-content:space-between">
    <span>เลขที่ ${laFill(o.laNo, '30mm')}</span>
    <span>วันรับรองการเงิน ${laFill(o.financeDate ? thaiFullDate(o.financeDate) : '', '45mm')}</span>
  </div>
  <div class="la-row">ยื่นต่อ เจ้าหน้าที่การเงินโรงเรียน${laFill(o.scName, '60mm')}</div>`

  const body = `<div class="la-row" style="margin-top:3mm">
    ข้าพเจ้า ${laFill(o.borrowerName, '55mm')} ตำแหน่ง ${laFill(o.borrowerPosition, '45mm')}<br/>
    สังกัด ${laFill(o.affiliation || (o.scName ? `โรงเรียน${o.scName}` : ''), '90mm')} จังหวัด ${laFill(o.province, '40mm')}<br/>
    มีความประสงค์ขอยืมเงินจาก ${laFill(o.moneyTypeName, '90mm')}<br/>
    เพื่อเป็นค่าใช้จ่ายในการ ${laFill(o.purpose, '90mm')} ดังรายละเอียดต่อไปนี้<br/>
    <span style="display:inline-block;min-height:14mm;width:100%" class="la-fill">${o.expenseDetail ? esc(o.expenseDetail) : ''}</span>
  </div>
  <div class="la-row" style="display:flex;justify-content:space-between;align-items:center;margin-top:3mm">
    <span>ตัวอักษร (<b>${esc(numberToThaiBaht(amount))}</b>)</span>
    <span>รวมเงิน <span class="la-amount-box">${fmtBaht(amount)}</span> บาท</span>
  </div>
  <div class="la-row" style="margin-top:3mm;text-indent:12mm">
    ข้าพเจ้าสัญญาว่าจะปฏิบัติตามระเบียบของทางราชการทุกประการ และจะนำใบสำคัญคู่จ่ายที่ถูกต้อง
    พร้อมทั้งเงินเหลือจ่าย (ถ้ามี) ส่งใช้ภายใน ${dueDays ? `<b>${dueDays}</b>` : laFill('', '15mm')} วัน นับแต่วันที่ได้รับเงิน
    ถ้าข้าพเจ้าไม่ส่งตามกำหนด ข้าพเจ้ายินยอมให้หักเงินเดือน ค่าจ้าง เบี้ยหวัด บำเหน็จ บำนาญ
    หรือเงินอื่นใดที่ข้าพเจ้าจะพึงได้รับจากทางราชการ ชดใช้จำนวนเงินที่ยืมไปจนครบถ้วนได้ทันที
  </div>
  <div class="la-sign">
    ลงชื่อ ${laFill(o.borrowerName, '45mm')} ผู้ยืม<br/>
    วันที่ ${laFill(o.borrowDate ? thaiFullDate(o.borrowDate) : '', '45mm')}
  </div>`

  const verify = `<div class="la-sec">
    <div class="la-sec-h">เสนอ ผู้อำนวยการโรงเรียน${o.scName ? esc(o.scName) : ''}</div>
    <div style="margin-top:1mm">ได้ตรวจสอบแล้ว เห็นสมควรอนุมัติให้ยืมตามใบยืมฉบับนี้ได้ จำนวน ${fmtBaht(amount)} บาท
    (<b>${esc(numberToThaiBaht(amount))}</b>)</div>
    <div class="la-sign">
      ลงชื่อ ${laFill(o.verifyName, '45mm')} ผู้ตรวจสอบ<br/>
      วันที่ ${laFill(o.verifyDate ? thaiFullDate(o.verifyDate) : '', '45mm')}
    </div>
  </div>`

  const approve = `<div class="la-sec">
    <div class="la-sec-h">คำอนุมัติ</div>
    <div style="margin-top:1mm">อนุมัติให้ยืมตามเงื่อนไขข้างต้นได้ จำนวน ${fmtBaht(approveAmount)} บาท
    (<b>${esc(numberToThaiBaht(approveAmount))}</b>)</div>
    <div class="la-sign">
      ลงชื่อผู้อนุมัติ ${laFill(o.approveName, '45mm')}<br/>
      ผู้อำนวยการโรงเรียน${o.scName ? esc(o.scName) : ''}<br/>
      วันที่ ${laFill(o.approveDate ? thaiFullDate(o.approveDate) : '', '45mm')}
    </div>
  </div>`

  const receipt = `<div class="la-sec">
    <div class="la-sec-h">ใบรับเงิน</div>
    <div style="margin-top:1mm">ได้รับเงินยืมจำนวน ${fmtBaht(amount)} บาท (<b>${esc(numberToThaiBaht(amount))}</b>)
    เป็นการถูกต้องแล้ว</div>
    <div class="la-sign">
      ลงชื่อ ${laFill(o.borrowerName, '45mm')} ผู้รับเงิน<br/>
      วันที่ ${laFill(o.receiptDate ? thaiFullDate(o.receiptDate) : '', '45mm')}
    </div>
  </div>`

  return `<div class="la-frame">${head}${body}${verify}${approve}${receipt}</div>`
}

/** ด้านหลัง: ตารางรายการส่งใช้เงินยืม */
function loanAgreementBack(o: LoanAgreementFormOpts): string {
  const rows = o.settlements ?? []
  const body = rows
    .map(
      (r, i) => `<tr>
      <td class="ctr">${i + 1}</td>
      <td class="ctr">${r.date ? esc(thaiFullDate(r.date)) : ''}</td>
      <td>${r.type ? esc(r.type) : ''}</td>
      <td class="num">${r.amount != null ? fmtBaht(r.amount) : ''}</td>
      <td class="num">${r.outstanding != null ? fmtBaht(r.outstanding) : ''}</td>
      <td class="ctr">${r.receiver ? esc(r.receiver) : ''}</td>
      <td class="ctr">${r.receiptNo ? esc(r.receiptNo) : ''}</td>
    </tr>`,
    )
    .join('')
  // เติมแถวว่างให้ครบหน้า (อย่างน้อย 12 แถว)
  const pad = Math.max(0, 12 - rows.length)
  const padRows = Array.from({ length: pad })
    .map(
      () =>
        `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`,
    )
    .join('')

  const table = `<table class="of">
    <thead>
      <tr>
        <th rowspan="2" style="width:14mm">ครั้งที่</th>
        <th rowspan="2" style="width:30mm">วัน เดือน ปี</th>
        <th colspan="2">รายการส่งใช้</th>
        <th rowspan="2" style="width:28mm">คงค้าง</th>
        <th rowspan="2" style="width:30mm">ลายมือชื่อผู้รับ</th>
        <th rowspan="2" style="width:25mm">ใบรับเลขที่</th>
      </tr>
      <tr>
        <th>เงินสด หรือใบสำคัญ</th>
        <th style="width:28mm">จำนวนเงิน</th>
      </tr>
    </thead>
    <tbody>${body}${padRows}</tbody>
  </table>`

  return `<div class="la-pagebreak"><div class="la-corner">(ด้านหลังสัญญายืมเงิน)</div>${table}</div>`
}

export function officialLoanAgreement(o: LoanAgreementFormOpts): string {
  return FORM_CSS + LOAN_CSS + loanAgreementFront(o) + loanAgreementBack(o)
}

// ───────────────────────────────────────────────────────────────────────────
// 9) ใบเบิกค่าใช้จ่ายในการเดินทางไปราชการ (แบบ 8708) — ส่วนที่ 1 + ส่วนที่ 2
// ───────────────────────────────────────────────────────────────────────────
export interface Travel8708TravelerRow {
  seq?: number
  name?: string | null
  position?: string | null
  allowance?: number | null
  lodging?: number | null
  transport?: number | null
  other?: number | null
  total?: number | null
  note?: string | null
}

export interface Travel8708Opts {
  scName?: string
  atOffice?: string | null
  docDate?: string | null // วันที่ของใบเบิก (3)
  to?: string | null // เรียน (4)
  // สัญญาเงินยืม (ถ้ามี)
  loanNo?: string | null
  loanDate?: string | null
  loanAmount?: number | null
  // ผู้ขอเบิก/เดินทาง
  requesterName?: string | null
  requesterPosition?: string | null
  affiliation?: string | null
  province?: string | null
  companions?: string | null
  orderRef?: string | null
  orderDate?: string | null
  // การเดินทาง
  purpose?: string | null
  departFrom?: number | null // 1=บ้านพัก 2=สำนักงาน 3=ประเทศไทย
  departDate?: string | null
  departTime?: string | null
  returnDate?: string | null
  returnTime?: string | null
  totalDays?: number | null
  totalHours?: number | null
  // ยอดเบิก
  allowanceTotal?: number | null
  lodgingTotal?: number | null
  transportTotal?: number | null
  otherTotal?: number | null
  grandTotal: number
  evidenceCount?: number | null
  // อนุมัติ/จ่าย
  verifyName?: string | null
  verifyDate?: string | null
  approveName?: string | null
  approveDate?: string | null
  receiptDate?: string | null
  payerName?: string | null
  bcNo?: string | null
  travelers: Travel8708TravelerRow[]
}

const TRAVEL_CSS = `<style>
  .tv-corner { text-align:right; font-size:12pt; }
  .tv-title { text-align:center; font-size:16pt; font-weight:bold; margin:1mm 0 3mm; }
  .tv-row { font-size:13.5pt; line-height:1.95; }
  .tv-fill { border-bottom:1px dotted #000; padding:0 2mm; }
  .tv-2col { display:flex; gap:6mm; margin-top:4mm; }
  .tv-2col > div { flex:1; border:1px solid #000; padding:3mm; font-size:12.5pt; min-height:30mm; }
  .tv-sign { text-align:center; font-size:12.5pt; margin-top:6mm; }
  .tv-amount-box { border:1px solid #000; padding:1mm 3mm; font-weight:bold; white-space:nowrap; }
  .tv-pagebreak { page-break-before: always; }
</style>`

function tvFill(v?: string | null, min = '35mm'): string {
  return `<span class="tv-fill" style="min-width:${min}">${v ? esc(v) : ''}</span>`
}
function tvRadio(label: string, on: boolean): string {
  return `<span style="white-space:nowrap">${on ? '☑' : '☐'} ${esc(label)}</span>`
}

function travel8708Part1(o: Travel8708Opts): string {
  const amount = Number(o.grandTotal || 0)
  const head = `<div class="tv-corner">ส่วนที่ 1 แบบ 8708</div>
  <div class="tv-title">ใบเบิกค่าใช้จ่ายในการเดินทางไปราชการ</div>
  <div class="tv-row">
    สัญญาเงินยืมเลขที่ ${tvFill(o.loanNo, '30mm')} วันที่ ${tvFill(o.loanDate ? thaiFullDate(o.loanDate) : '', '35mm')}<br/>
    ชื่อผู้ยืม ${tvFill(o.loanNo ? o.requesterName : '', '45mm')} จำนวนเงิน ${tvFill(o.loanAmount != null ? fmtBaht(o.loanAmount) : '', '30mm')} บาท
  </div>
  <div class="tv-row" style="text-align:center">
    ที่ทำการ ${tvFill(o.atOffice || (o.scName ? `โรงเรียน${o.scName}` : ''), '70mm')}<br/>
    วันที่ ${tvFill(o.docDate ? thaiFullDate(o.docDate) : '', '55mm')}
  </div>`

  const departFrom = Number(o.departFrom ?? 2)
  const body = `<div class="tv-row" style="margin-top:2mm">
    เรื่อง&nbsp;&nbsp;ขออนุมัติเบิกค่าใช้จ่ายในการเดินทางไปราชการ<br/>
    เรียน&nbsp;&nbsp;${tvFill(o.to || (o.scName ? `ผู้อำนวยการโรงเรียน${o.scName}` : ''), '80mm')}
  </div>
  <div class="tv-row" style="margin-top:1mm;text-indent:12mm">
    ตามคำสั่ง/บันทึก ที่ ${tvFill(o.orderRef, '35mm')} ลงวันที่ ${tvFill(o.orderDate ? thaiFullDate(o.orderDate) : '', '35mm')} ได้อนุมัติให้<br/>
    ข้าพเจ้า ${tvFill(o.requesterName, '50mm')} ตำแหน่ง ${tvFill(o.requesterPosition, '40mm')}<br/>
    สังกัด ${tvFill(o.affiliation || (o.scName ? `โรงเรียน${o.scName}` : ''), '70mm')} จังหวัด ${tvFill(o.province, '30mm')}<br/>
    พร้อมด้วย ${tvFill(o.companions, '120mm')}<br/>
    เดินทางไปปฏิบัติราชการ ${tvFill(o.purpose, '110mm')}<br/>
    โดยออกเดินทางจาก ${tvRadio('บ้านพัก', departFrom === 1)} ${tvRadio('สำนักงาน', departFrom === 2)} ${tvRadio('ประเทศไทย', departFrom === 3)}
    ตั้งแต่วันที่ ${tvFill(o.departDate ? thaiFullDate(o.departDate) : '', '35mm')} เวลา ${tvFill(o.departTime, '15mm')} น.<br/>
    และกลับถึง ${tvRadio('บ้านพัก', departFrom === 1)} ${tvRadio('สำนักงาน', departFrom === 2)} ${tvRadio('ประเทศไทย', departFrom === 3)}
    วันที่ ${tvFill(o.returnDate ? thaiFullDate(o.returnDate) : '', '35mm')} เวลา ${tvFill(o.returnTime, '15mm')} น.<br/>
    รวมเวลาไปราชการครั้งนี้ ${tvFill(o.totalDays != null ? String(o.totalDays) : '', '20mm')} วัน ${tvFill(o.totalHours != null ? String(o.totalHours) : '', '20mm')} ชั่วโมง
  </div>
  <div class="tv-row" style="margin-top:2mm;text-indent:12mm">ข้าพเจ้าขอเบิกค่าใช้จ่ายในการเดินทางไปราชการ ดังนี้</div>
  <table class="of" style="margin-top:2mm">
    <tbody>
      <tr><td>ค่าเบี้ยเลี้ยงเดินทาง</td><td class="num" style="width:40mm">${o.allowanceTotal ? fmtBaht(o.allowanceTotal) : '-'}</td><td style="width:15mm">บาท</td></tr>
      <tr><td>ค่าเช่าที่พัก</td><td class="num">${o.lodgingTotal ? fmtBaht(o.lodgingTotal) : '-'}</td><td>บาท</td></tr>
      <tr><td>ค่าพาหนะ</td><td class="num">${o.transportTotal ? fmtBaht(o.transportTotal) : '-'}</td><td>บาท</td></tr>
      <tr><td>ค่าใช้จ่ายอื่น</td><td class="num">${o.otherTotal ? fmtBaht(o.otherTotal) : '-'}</td><td>บาท</td></tr>
      <tr><td class="ctr"><b>รวมทั้งสิ้น</b></td><td class="num"><b>${fmtBaht(amount)}</b></td><td><b>บาท</b></td></tr>
    </tbody>
  </table>
  <div class="tv-row" style="margin-top:2mm">จำนวนเงิน (ตัวอักษร) (<b>${esc(numberToThaiBaht(amount))}</b>)</div>
  <div class="tv-row" style="text-indent:12mm">ข้าพเจ้าขอรับรองว่ารายการที่กล่าวมาข้างต้นเป็นความจริง และหลักฐานการจ่ายที่ส่งมาด้วย
    จำนวน ${tvFill(o.evidenceCount != null ? String(o.evidenceCount) : '', '15mm')} ฉบับ รวมทั้งจำนวนเงินที่ขอเบิกถูกต้องตามกฎหมายทุกประการ</div>
  <div class="tv-sign">
    ลงชื่อ ${tvFill(o.requesterName, '45mm')} ผู้ขอรับเงิน<br/>
    ตำแหน่ง ${tvFill(o.requesterPosition, '45mm')}
  </div>`

  const approvals = `<div class="tv-2col">
    <div>
      ได้ตรวจสอบหลักฐานการเบิกจ่ายเงินที่แนบถูกต้องแล้ว เห็นควรอนุมัติให้เบิกจ่ายได้
      <div class="tv-sign">
        ลงชื่อ ${tvFill(o.verifyName, '35mm')}<br/>
        (เจ้าหน้าที่การเงิน)<br/>
        วันที่ ${tvFill(o.verifyDate ? thaiFullDate(o.verifyDate) : '', '35mm')}
      </div>
    </div>
    <div>
      อนุมัติให้จ่ายได้
      <div class="tv-sign">
        ลงชื่อ ${tvFill(o.approveName, '35mm')}<br/>
        ผู้อำนวยการโรงเรียน${o.scName ? esc(o.scName) : ''}<br/>
        วันที่ ${tvFill(o.approveDate ? thaiFullDate(o.approveDate) : '', '35mm')}
      </div>
    </div>
  </div>
  <div class="tv-row" style="margin-top:4mm;text-align:center">
    ได้รับเงินค่าใช้จ่ายในการเดินทางไปราชการ จำนวน ${fmtBaht(amount)} บาท
    (<b>${esc(numberToThaiBaht(amount))}</b>) ไว้เป็นการถูกต้องแล้ว
  </div>
  <div class="tv-2col" style="border:0">
    <div style="border:0;text-align:center">
      ลงชื่อ ${tvFill(o.requesterName, '30mm')} ผู้รับเงิน<br/>
      วันที่ ${tvFill(o.receiptDate ? thaiFullDate(o.receiptDate) : '', '30mm')}
    </div>
    <div style="border:0;text-align:center">
      ลงชื่อ ${tvFill(o.payerName, '30mm')} ผู้จ่ายเงิน<br/>
      วันที่ ${tvFill(o.receiptDate ? thaiFullDate(o.receiptDate) : '', '30mm')}
    </div>
  </div>
  <div class="tv-row">จากเงินยืมตามสัญญาเลขที่ ${tvFill(o.loanNo, '30mm')} วันที่ ${tvFill(o.loanDate ? thaiFullDate(o.loanDate) : '', '30mm')}
    ${o.bcNo ? `&nbsp;&nbsp;ใบสำคัญจ่ายเลขที่ <b>${esc(o.bcNo)}</b>` : ''}</div>`

  return `<div>${head}${body}${approvals}</div>`
}

function travel8708Part2(o: Travel8708Opts): string {
  const rows = o.travelers ?? []
  const body = rows
    .map(
      (t, i) => `<tr>
      <td class="ctr">${t.seq ?? i + 1}</td>
      <td>${t.name ? esc(t.name) : ''}</td>
      <td>${t.position ? esc(t.position) : ''}</td>
      <td class="num">${t.allowance ? fmtBaht(t.allowance) : ''}</td>
      <td class="num">${t.lodging ? fmtBaht(t.lodging) : ''}</td>
      <td class="num">${t.transport ? fmtBaht(t.transport) : ''}</td>
      <td class="num">${t.other ? fmtBaht(t.other) : ''}</td>
      <td class="num">${t.total ? fmtBaht(t.total) : ''}</td>
      <td></td><td class="ctr"></td><td></td>
    </tr>`,
    )
    .join('')
  const pad = Math.max(0, 6 - rows.length)
  const padRows = Array.from({ length: pad })
    .map(() => `<tr>${'<td>&nbsp;</td>'}${'<td></td>'.repeat(10)}</tr>`)
    .join('')
  const amount = Number(o.grandTotal || 0)

  const table = `<table class="of" style="font-size:11pt">
    <thead>
      <tr>
        <th rowspan="2" style="width:10mm">ลำดับ</th>
        <th rowspan="2">ชื่อ</th>
        <th rowspan="2">ตำแหน่ง</th>
        <th colspan="4">ค่าใช้จ่าย</th>
        <th rowspan="2" style="width:22mm">รวม</th>
        <th rowspan="2" style="width:25mm">ลายมือชื่อผู้รับเงิน</th>
        <th rowspan="2" style="width:20mm">วันที่รับเงิน</th>
        <th rowspan="2" style="width:18mm">หมายเหตุ</th>
      </tr>
      <tr>
        <th style="width:18mm">ค่าเบี้ยเลี้ยง</th>
        <th style="width:18mm">ค่าเช่าที่พัก</th>
        <th style="width:18mm">ค่าพาหนะ</th>
        <th style="width:18mm">ค่าใช้จ่ายอื่น</th>
      </tr>
    </thead>
    <tbody>${body}${padRows}
      <tr>
        <td class="ctr" colspan="3"><b>รวมเงิน</b></td>
        <td class="num">${o.allowanceTotal ? fmtBaht(o.allowanceTotal) : ''}</td>
        <td class="num">${o.lodgingTotal ? fmtBaht(o.lodgingTotal) : ''}</td>
        <td class="num">${o.transportTotal ? fmtBaht(o.transportTotal) : ''}</td>
        <td class="num">${o.otherTotal ? fmtBaht(o.otherTotal) : ''}</td>
        <td class="num"><b>${fmtBaht(amount)}</b></td>
        <td></td><td></td><td></td>
      </tr>
    </tbody>
  </table>
  <div class="tv-row" style="margin-top:2mm">จำนวนเงินรวมทั้งสิ้น (ตัวอักษร) (<b>${esc(numberToThaiBaht(amount))}</b>)</div>
  <div class="tv-row">ตามสัญญาเงินยืมเลขที่ ${tvFill(o.loanNo, '30mm')} วันที่ ${tvFill(o.loanDate ? thaiFullDate(o.loanDate) : '', '30mm')}</div>
  <div class="tv-sign" style="text-align:right;margin-right:10mm">
    ลงชื่อ ${tvFill(o.payerName, '35mm')} ผู้จ่ายเงิน
  </div>`

  return `<div class="tv-pagebreak"><div class="tv-corner">ส่วนที่ 2 แบบ 8708</div>
    <div class="tv-title" style="font-size:14pt">หลักฐานการจ่ายเงินค่าใช้จ่ายในการเดินทางไปราชการ</div>
    ${table}</div>`
}

export function officialTravel8708(o: Travel8708Opts): string {
  return FORM_CSS + TRAVEL_CSS + travel8708Part1(o) + travel8708Part2(o)
}

// ═══════════════════════════════════════════════════════════════════════════
// ทะเบียนคุมเพิ่มเติม (คู่มือ ตย.4,5,6,17,18) — แบบฟอร์มที่ขาด
// ═══════════════════════════════════════════════════════════════════════════

/** แยกจำนวนเงินเป็น บาท | สตางค์ (สตางค์ = '-' เมื่อเป็น .00 ตามแบบทะเบียนคุมเช็ค) */
function bahtSatang(v?: number | null): { baht: string; sat: string } {
  if (!v) return { baht: '', sat: '' }
  const abs = Math.abs(Number(v))
  const baht = Math.floor(abs)
  const sat = Math.round((abs - baht) * 100)
  return { baht: baht.toLocaleString('en-US'), sat: sat === 0 ? '-' : String(sat).padStart(2, '0') }
}

const regHead = (o: { scName?: string; budgetYear?: string | number }) =>
  `โรงเรียน${o.scName ? esc(o.scName) : ''}${o.budgetYear ? ` ปีงบประมาณ ${esc(String(o.budgetYear))}` : ''}`

// ── 7) ทะเบียนคุมเช็ค (ตย.6) ────────────────────────────────────────────────
export interface ChequeRegisterRow {
  date?: string | null
  chequeNo?: string | null
  payee?: string | null
  amount?: number | null
  receiverSign?: string | null
  approverSign?: string | null
  note?: string | null
}
export interface ChequeRegisterOpts { scName?: string; budgetYear?: string | number; rows: ChequeRegisterRow[] }
export function officialChequeRegister(o: ChequeRegisterOpts): string {
  const header = officialHeader('ทะเบียนคุมเช็ค', [regHead(o)])
  const body = o.rows.map((r) => {
    const { baht, sat } = bahtSatang(r.amount)
    return `<tr>
      <td class="ctr">${r.date ? esc(thaiFullDate(r.date)) : ''}</td>
      <td class="ctr">${r.chequeNo ? esc(r.chequeNo) : ''}</td>
      <td>${r.payee ? esc(r.payee) : ''}</td>
      <td class="num">${baht}</td><td class="ctr">${sat}</td>
      <td>${r.receiverSign ? esc(r.receiverSign) : ''}</td>
      <td>${r.approverSign ? esc(r.approverSign) : ''}</td>
      <td>${r.note ? esc(r.note) : ''}</td>
    </tr>`
  }).join('')
  const table = `<table class="of">
    <thead>
      <tr>
        <th rowspan="2">วัน เดือน ปี</th><th rowspan="2">เลขที่เช็ค</th><th rowspan="2">จ่ายให้</th>
        <th colspan="2">จำนวนเงิน</th>
        <th rowspan="2">ลงชื่อผู้รับเช็ค</th><th rowspan="2">ลงชื่อผู้อนุมัติจ่ายเช็ค</th><th rowspan="2">หมายเหตุ</th>
      </tr>
      <tr><th>บาท</th><th>สต.</th></tr>
    </thead>
    <tbody>${body || `<tr><td colspan="8" class="ctr">— ไม่มีรายการ —</td></tr>`}</tbody>
  </table>`
  return FORM_CSS + header + table
}

// ── 8) ทะเบียนคุมเงินฝากธนาคาร (ตย.5) ───────────────────────────────────────
export interface BankDepositRow {
  date?: string | null; docNo?: string | null; detail?: string | null
  deposit?: number | null; withdraw?: number | null; signerName?: string | null; note?: string | null
}
export interface BankDepositRegisterOpts {
  scName?: string; bankName?: string; accountNo?: string; budgetYear?: string | number
  opening?: number; rows: BankDepositRow[]
}
export function officialBankDepositRegister(o: BankDepositRegisterOpts): string {
  const header = officialHeader('ทะเบียนคุมเงินฝากธนาคาร', [
    `ธนาคาร ${o.bankName ? esc(o.bankName) : `<span class="of-dotted of-dots"></span>`} ประเภท กระแสรายวัน เลขที่บัญชีเงินฝาก ${o.accountNo ? esc(o.accountNo) : `<span class="of-dotted of-dots"></span>`}`,
    regHead(o),
  ])
  let bal = Number(o.opening || 0)
  const open = `<tr><td></td><td></td><td>ยอดยกมา</td><td></td><td></td><td class="num">${fmtBaht(bal)}</td><td></td><td></td></tr>`
  const body = o.rows.map((r) => {
    bal += Number(r.deposit || 0) - Number(r.withdraw || 0)
    return `<tr>
      <td class="ctr">${r.date ? esc(thaiFullDate(r.date)) : ''}</td>
      <td class="ctr">${r.docNo ? esc(r.docNo) : ''}</td>
      <td>${r.detail ? esc(r.detail) : ''}</td>
      <td class="num">${r.deposit ? fmtBaht(r.deposit) : ''}</td>
      <td class="num">${r.withdraw ? fmtBaht(r.withdraw) : ''}</td>
      <td class="num">${fmtBaht(bal)}</td>
      <td>${r.signerName ? esc(r.signerName) : ''}</td>
      <td>${r.note ? esc(r.note) : ''}</td>
    </tr>`
  }).join('')
  const table = `<table class="of">
    <thead>
      <tr>
        <th rowspan="2">วัน เดือน ปี</th><th rowspan="2">ที่เอกสาร</th><th rowspan="2">รายการ</th>
        <th colspan="3">จำนวนเงิน</th>
        <th rowspan="2">ลายมือชื่อหัวหน้า<br/>หน่วยงานย่อย</th><th rowspan="2">หมายเหตุ</th>
      </tr>
      <tr><th>ฝาก</th><th>ถอน</th><th>คงเหลือ</th></tr>
    </thead>
    <tbody>${open}${body}</tbody>
  </table>`
  return FORM_CSS + header + table
}

// ── 9) ทะเบียนคุมการรับและนำส่งเงินรายได้แผ่นดิน (ตย.17) ─────────────────────
export interface TreasuryRevenueRow {
  date?: string | null; docNo?: string | null; detail?: string | null
  intReceive?: number | null; intRemit?: number | null // ดอกเบี้ยเงินฝากธนาคาร
  subReceive?: number | null; subRemit?: number | null // เงินอุดหนุนเหลือจ่ายเกิน 2 ปีงบประมาณ
  note?: string | null
}
export interface TreasuryRevenueOpts {
  scName?: string; budgetYear?: string | number
  opening?: { interest?: number; subsidy?: number }; rows: TreasuryRevenueRow[]
}
export function officialTreasuryRevenueRegister(o: TreasuryRevenueOpts): string {
  const header = officialHeader('ทะเบียนคุมการรับและนำส่งเงินรายได้แผ่นดิน', [regHead(o)])
  const n = (v: number) => (v ? fmtBaht(v) : '')
  let intBal = Number(o.opening?.interest || 0)
  let subBal = Number(o.opening?.subsidy || 0)
  const openInt = intBal, openSub = subBal
  const parts: string[] = []
  const row = (date: string, docNo: string, detail: string, iR: number, iS: number, sR: number, sS: number, showBal: boolean, note: string, bold = false) => {
    const b = (s: string) => (bold && s ? `<b>${s}</b>` : s)
    return `<tr>
      <td class="ctr">${esc(date)}</td><td class="ctr">${esc(docNo)}</td><td>${b(esc(detail))}</td>
      <td class="num">${b(n(iR))}</td><td class="num">${b(n(iS))}</td><td class="num">${showBal ? b(n(intBal)) : ''}</td>
      <td class="num">${b(n(sR))}</td><td class="num">${b(n(sS))}</td><td class="num">${showBal ? b(n(subBal)) : ''}</td>
      <td class="num">${showBal ? b(n(intBal + subBal)) : ''}</td><td>${esc(note)}</td>
    </tr>`
  }
  parts.push(row('', '', 'ยอดยกมา', 0, 0, 0, 0, true, ''))
  const groups: { ym: string; rows: TreasuryRevenueRow[] }[] = []
  for (const r of o.rows) {
    const ym = (r.date || '').slice(0, 7)
    const g = groups[groups.length - 1]
    if (g && g.ym === ym) g.rows.push(r); else groups.push({ ym, rows: [r] })
  }
  let cIR = 0, cIS = 0, cSR = 0, cSS = 0
  for (const g of groups) {
    let mIR = 0, mIS = 0, mSR = 0, mSS = 0
    for (const r of g.rows) {
      const iR = Number(r.intReceive || 0), iS = Number(r.intRemit || 0), sR = Number(r.subReceive || 0), sS = Number(r.subRemit || 0)
      intBal += iR - iS; subBal += sR - sS
      mIR += iR; mIS += iS; mSR += sR; mSS += sS
      cIR += iR; cIS += iS; cSR += sR; cSS += sS
      parts.push(row(r.date ? thaiFullDate(r.date) : '', r.docNo || '', r.detail || '', iR, iS, sR, sS, true, r.note || ''))
    }
    parts.push(row('', '', 'รวมเดือนนี้', mIR, mIS, mSR, mSS, false, '', true))
    parts.push(`<tr><td></td><td></td><td><b>รวมแต่ต้นปี</b></td>
      <td class="num"><b>${n(openInt + cIR)}</b></td><td class="num"><b>${n(cIS)}</b></td><td class="num"><b>${n(intBal)}</b></td>
      <td class="num"><b>${n(openSub + cSR)}</b></td><td class="num"><b>${n(cSS)}</b></td><td class="num"><b>${n(subBal)}</b></td>
      <td class="num"><b>${n(intBal + subBal)}</b></td><td></td></tr>`)
  }
  const table = `<table class="of">
    <thead>
      <tr>
        <th rowspan="2">วัน เดือน ปี</th><th rowspan="2">ที่เอกสาร</th><th rowspan="2">รายการ</th>
        <th colspan="3">ดอกเบี้ยเงินฝากธนาคาร</th>
        <th colspan="3">เงินอุดหนุนเหลือจ่ายเกิน 2 ปีงบประมาณ</th>
        <th rowspan="2">รวมเงินคงเหลือ<br/>ทุกประเภท</th><th rowspan="2">หมายเหตุ</th>
      </tr>
      <tr><th>รับ</th><th>นำส่ง</th><th>คงเหลือ</th><th>รับ</th><th>นำส่ง</th><th>คงเหลือ</th></tr>
    </thead>
    <tbody>${parts.join('')}</tbody>
  </table>`
  return FORM_CSS + header + table
}

// ── 10) ทะเบียนคุมเอกสารแทนตัวเงิน (ตย.4) ──────────────────────────────────
export interface CashEquivalentRow {
  date?: string | null; kind?: string | null; docNo?: string | null
  amount?: number | null; convertedDate?: string | null; note?: string | null
}
export interface CashEquivalentOpts { scName?: string; budgetYear?: string | number; rows: CashEquivalentRow[] }
export function officialCashEquivalentRegister(o: CashEquivalentOpts): string {
  const header = officialHeader('ทะเบียนคุมเอกสารแทนตัวเงิน', [regHead(o)])
  const body = o.rows.map((r) => `<tr>
    <td class="ctr">${r.date ? esc(thaiFullDate(r.date)) : ''}</td>
    <td>${r.kind ? esc(r.kind) : ''}</td>
    <td class="ctr">${r.docNo ? esc(r.docNo) : ''}</td>
    <td class="num">${r.amount ? fmtBaht(r.amount) : ''}</td>
    <td class="ctr">${r.convertedDate ? esc(thaiFullDate(r.convertedDate)) : ''}</td>
    <td>${r.note ? esc(r.note) : ''}</td>
  </tr>`).join('')
  const table = `<table class="of">
    <thead><tr>
      <th>วัน เดือน ปี</th><th>ประเภท</th><th>เลขที่</th><th>จำนวนเงิน</th><th>วันที่เปลี่ยนสภาพ</th><th>หมายเหตุ</th>
    </tr></thead>
    <tbody>${body || `<tr><td colspan="6" class="ctr">— ไม่มีรายการ —</td></tr>`}</tbody>
  </table>`
  return FORM_CSS + header + table
}

// ── 11) ทะเบียนคุมใบสำคัญคู่จ่าย (ตย.) ─────────────────────────────────────
export interface PaymentVoucherRow {
  date?: string | null; bcNo?: string | null; bjNo?: string | null
  detail?: string | null; amount?: number | null; note?: string | null
}
export interface PaymentVoucherOpts { scName?: string; budgetYear?: string | number; rows: PaymentVoucherRow[] }
export function officialPaymentVoucherRegister(o: PaymentVoucherOpts): string {
  const header = officialHeader('ทะเบียนคุมใบสำคัญคู่จ่าย', [regHead(o)])
  const total = o.rows.reduce((s, r) => s + Number(r.amount || 0), 0)
  const body = o.rows.map((r) => `<tr>
    <td class="ctr">${r.date ? esc(thaiFullDate(r.date)) : ''}</td>
    <td class="ctr">${r.bcNo ? esc(r.bcNo) : ''}</td>
    <td class="ctr">${r.bjNo ? esc(r.bjNo) : ''}</td>
    <td>${r.detail ? esc(r.detail) : ''}</td>
    <td class="num">${r.amount ? fmtBaht(r.amount) : ''}</td>
    <td>${r.note ? esc(r.note) : ''}</td>
  </tr>`).join('')
  const table = `<table class="of">
    <thead>
      <tr><th rowspan="2">วัน เดือน ปี</th><th colspan="2">ใบสำคัญคู่จ่าย</th><th rowspan="2">รายการ</th><th rowspan="2">จำนวนเงิน</th><th rowspan="2">หมายเหตุ</th></tr>
      <tr><th>บค.</th><th>บจ.</th></tr>
    </thead>
    <tbody>${body || `<tr><td colspan="6" class="ctr">— ไม่มีรายการ —</td></tr>`}</tbody>
    <tfoot><tr><td colspan="4" class="ctr"><b>รวม</b></td><td class="num"><b>${fmtBaht(total)}</b></td><td></td></tr></tfoot>
  </table>`
  return FORM_CSS + header + table
}

// ── 12) สมุดคู่ฝาก ส่วนราชการผู้เบิก — ทะเบียนคุมเงินฝาก สพป. (ตย.18) ────────
export interface SmpPassbookRow {
  date?: string | null; docNo?: string | null
  deposit?: number | null; withdraw?: number | null
  receiverSign?: string | null; depositorSign?: string | null; note?: string | null
}
export interface SmpPassbookOpts { scName?: string; budgetYear?: string | number; opening?: number; rows: SmpPassbookRow[] }
export function officialSmpPassbookRegister(o: SmpPassbookOpts): string {
  const header = officialHeader('สมุดคู่ฝาก (ส่วนราชการผู้เบิก)', [regHead(o)])
  let bal = Number(o.opening || 0)
  const openRow = o.opening ? `<tr><td></td><td>ยอดยกมา</td><td></td><td></td><td class="num">${fmtBaht(bal)}</td><td></td><td></td><td></td></tr>` : ''
  const body = o.rows.map((r) => {
    bal += Number(r.deposit || 0) - Number(r.withdraw || 0)
    return `<tr>
      <td class="ctr">${r.date ? esc(thaiFullDate(r.date)) : ''}</td>
      <td class="ctr">${r.docNo ? esc(r.docNo) : ''}</td>
      <td class="num">${r.deposit ? fmtBaht(r.deposit) : ''}</td>
      <td class="num">${r.withdraw ? fmtBaht(r.withdraw) : ''}</td>
      <td class="num">${fmtBaht(bal)}</td>
      <td class="ctr">${r.receiverSign ? esc(r.receiverSign) : ''}</td>
      <td class="ctr">${r.depositorSign ? esc(r.depositorSign) : ''}</td>
      <td>${r.note ? esc(r.note) : ''}</td>
    </tr>`
  }).join('')
  const table = `<table class="of">
    <thead>
      <tr><th rowspan="2">วัน เดือน ปี</th><th rowspan="2">ที่เอกสาร</th><th colspan="3">จำนวนเงิน</th><th rowspan="2">ลายมือชื่อ<br/>ผู้รับฝาก</th><th rowspan="2">ลายมือชื่อ<br/>ผู้นำฝาก/ผู้เบิกถอน</th><th rowspan="2">หมายเหตุ</th></tr>
      <tr><th>ฝาก</th><th>ถอน</th><th>คงเหลือ</th></tr>
    </thead>
    <tbody>${openRow}${body || `<tr><td colspan="8" class="ctr">— ไม่มีรายการ —</td></tr>`}</tbody>
  </table>`
  return FORM_CSS + header + table
}
