// ============================================================
// official-finance-forms.ts
// บันทึกข้อความ (memo) ราชการสำหรับงานการเงิน — ต้องพิมพ์ทุกครั้งที่:
//   • ยืมเงิน          → ขออนุมัติยืมเงิน        (คู่มือ ตย.22 / ตย.33)
//   • ส่งใช้เงินยืม     → ขออนุมัติส่งใช้เงินยืม    (คู่มือ ตย.35)
//   • จ่ายเงิน/เบิกจ่าย → ขออนุมัติเบิกจ่ายเงิน     (คู่มือ ตย.25)
// ใช้ helper จาก print-utils + ตราครุฑจาก krut-emblem
// ============================================================
import { KRUT_EMBLEM } from './krut-emblem'
import { esc, numberToThaiBaht, fmtBaht, thaiFullDate } from './print-utils'

export interface MemoResult {
  title: string
  body: string
}

const DOT = '.....................................'

/** เลขที่หนังสือรับรองหักภาษี: บก. 28/{N}/{ปีงบประมาณ พ.ศ.} */
export function withholdingCertNo(
  n: number | string,
  budgetYearBE: number | string,
): string {
  return `บก. 28/${n}/${budgetYearBE}`
}

/** หัวกระดาษบันทึกข้อความ (ส่วนราชการ / ที่ / วันที่ / เรื่อง / เรียน) */
function memoHead(args: {
  scName: string
  no?: string | null
  date?: string | null
  subject: string
}): string {
  const { scName, no, date, subject } = args
  return `
<div style="position:relative;min-height:15mm;margin:0 0 2pt 0">
  <img src="${KRUT_EMBLEM}" alt="ครุฑ" style="position:absolute;left:0;bottom:0;height:15mm;width:auto" />
  <h1 style="text-align:center;font-size:29pt;font-weight:bold;margin:0;padding-top:3mm;line-height:35pt">บันทึกข้อความ</h1>
</div>
<p style="margin:1pt 0;line-height:1.3"><b>ส่วนราชการ</b>&nbsp;&nbsp;${esc(scName || 'โรงเรียน')}</p>
<p style="margin:1pt 0;line-height:1.3;display:flex;justify-content:space-between">
  <span><b>ที่</b>&nbsp;&nbsp;${esc(no || DOT)}</span>
  <span><b>วันที่</b>&nbsp;&nbsp;${date ? esc(thaiFullDate(date)) : DOT}</span>
</p>
<p style="margin:1pt 0;line-height:1.3"><b>เรื่อง</b>&nbsp;&nbsp;${esc(subject)}</p>
<p style="margin:1pt 0 8pt 0;line-height:1.3"><b>เรียน</b>&nbsp;&nbsp;ผู้อำนวยการ${esc(scName || 'โรงเรียน')}</p>`
}

/** ช่องลงนาม 1 คน (มีชื่อในวงเล็บ + ตำแหน่ง) จัดกึ่งกลาง */
function signCenter(args: {
  role: string
  name?: string | null
  position?: string | null
  prefixLabel?: string // เช่น "(ลงชื่อ)"
}): string {
  const { role, name, position, prefixLabel } = args
  return `
<div class="center" style="margin-top:14pt;line-height:1.5">
  <div>${prefixLabel ? esc(prefixLabel) + '&nbsp;&nbsp;' : ''}${DOT}&nbsp;&nbsp;${esc(role)}</div>
  <div>(&nbsp;${esc(name || '..................................................')}&nbsp;)</div>
  ${position ? `<div>ตำแหน่ง&nbsp;&nbsp;${esc(position)}</div>` : ''}
</div>`
}

// ─────────────────────────────────────────────────────────────────────────
// 1) ขออนุมัติยืมเงิน (ตย.22 / ตย.33)
// ─────────────────────────────────────────────────────────────────────────
export function loanRequestMemo(a: {
  scName: string
  loanNo?: string | null
  borrowDate?: string | null
  borrowerName?: string | null
  borrowerPosition?: string | null
  moneyType?: string | null
  purpose?: string | null
  budgetYear?: string | number
  amount: number
  financeOfficer?: string | null
  director?: string | null
}): MemoResult {
  const subject = `ขออนุมัติยืมเงิน${a.moneyType ? esc(a.moneyType) : ''}${a.purpose ? ' โครงการ ' + esc(a.purpose) : ''}`
  const body =
    memoHead({ scName: a.scName, no: a.loanNo, date: a.borrowDate, subject }) +
    `<p style="text-indent:2.5em;line-height:1.6;margin-top:6pt">ด้วยข้าพเจ้า <b>${esc(a.borrowerName || DOT)}</b>` +
    ` ตำแหน่ง ${esc(a.borrowerPosition || '-')} ขออนุมัติยืมเงิน${esc(a.moneyType || '')}` +
    `${a.purpose ? ' โครงการ ' + esc(a.purpose) : ''} ตามแผนปฏิบัติราชการของสถานศึกษา` +
    `${a.budgetYear ? ' ประจำปี ' + esc(String(a.budgetYear)) : ''} เป็นเงิน <b>${fmtBaht(a.amount)}</b> บาท` +
    ` (${esc(numberToThaiBaht(a.amount))}) รายละเอียดตามสัญญายืมเงิน และเอกสารที่เกี่ยวข้องดังแนบ</p>` +
    `<p style="text-indent:2.5em;margin-top:6pt">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</p>` +
    signCenter({ role: 'ผู้ยืม', name: a.borrowerName, position: a.borrowerPosition, prefixLabel: '(ลงชื่อ)' }) +
    `<div style="margin-top:22pt;border-top:1px dashed #999;padding-top:10pt">
      <p><b>เรียน ผู้อำนวยการ${esc(a.scName || 'โรงเรียน')}</b></p>
      <p style="text-indent:2.5em;line-height:1.6">ได้ตรวจสอบเอกสารหลักฐานการขอยืมเงินแล้วถูกต้อง มีงบประมาณเพียงพอ และไม่มีเงินยืมค้างชำระ จึงเห็นควร</p>
      <p style="margin-left:2.5em">๑. อนุมัติให้ยืมเงิน</p>
      <p style="margin-left:2.5em">๒. อนุมัติจ่ายเงินให้ผู้ยืม เป็นเงิน <b>${fmtBaht(a.amount)}</b> บาท</p>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:6pt">
      <div style="flex:1">${signCenter({ role: 'เจ้าหน้าที่การเงิน', name: a.financeOfficer, prefixLabel: '(ลงชื่อ)' })}</div>
      <div style="flex:1">
        <p class="center" style="margin-top:14pt">อนุมัติตามข้อ ๑ และข้อ ๒</p>
        ${signCenter({ role: `ผู้อำนวยการ${a.scName || 'โรงเรียน'}`, name: a.director, prefixLabel: '(ลงชื่อ)' })}
      </div>
    </div>`
  return { title: `บันทึกขออนุมัติยืมเงิน_${a.loanNo ?? ''}`, body }
}

// ─────────────────────────────────────────────────────────────────────────
// 2) ขออนุมัติส่งใช้เงินยืม (ตย.35)
// ─────────────────────────────────────────────────────────────────────────
export function loanReturnMemo(a: {
  scName: string
  returnNo?: string | null
  returnDate?: string | null
  borrowerName?: string | null
  moneyType?: string | null
  purpose?: string | null
  loanNo?: string | null
  loanAmount: number
  dueDate?: string | null
  returnVoucher: number
  returnCash: number
  returnTotal: number
  financeOfficer?: string | null
  director?: string | null
}): MemoResult {
  const subject = `ขออนุมัติส่งใช้เงินยืม${a.moneyType ? esc(a.moneyType) : ''}${a.purpose ? ' โครงการ ' + esc(a.purpose) : ''}`
  const body =
    memoHead({ scName: a.scName, no: a.returnNo, date: a.returnDate, subject }) +
    `<p style="text-indent:2.5em;line-height:1.6;margin-top:6pt">ตามที่ ${esc(a.scName || 'โรงเรียน')} ได้อนุมัติให้ข้าพเจ้ายืมเงิน${esc(a.moneyType || '')}` +
    `${a.purpose ? ' โครงการ ' + esc(a.purpose) : ''} ตามสัญญายืมเงินเลขที่ <b>${esc(a.loanNo || DOT)}</b>` +
    ` เป็นเงิน <b>${fmtBaht(a.loanAmount)}</b> บาท (${esc(numberToThaiBaht(a.loanAmount))})` +
    ` และกำหนดส่งใช้คืนภายในวันที่ ${a.dueDate ? esc(thaiFullDate(a.dueDate)) : DOT} นั้น</p>` +
    `<p style="text-indent:2.5em;line-height:1.6">ข้าพเจ้าขอส่งใช้เงินยืมตามสัญญายืมเงินดังกล่าว พร้อมเอกสารที่เกี่ยวข้อง ดังนี้</p>` +
    `<table style="width:80%;margin:6pt auto">
      <tr><td>๑. หลักฐานการจ่ายเงิน</td><td class="num">${fmtBaht(a.returnVoucher)} บาท</td></tr>
      <tr><td>๒. เงินสด</td><td class="num">${fmtBaht(a.returnCash)} บาท</td></tr>
      <tr><td class="right"><b>รวมเป็นเงิน</b></td><td class="num"><b>${fmtBaht(a.returnTotal)} บาท</b></td></tr>
    </table>` +
    `<p style="text-indent:2.5em;margin-top:6pt">จึงเรียนมาเพื่อโปรดพิจารณา</p>` +
    signCenter({ role: 'ผู้ยืม', name: a.borrowerName, prefixLabel: '(ลงชื่อ)' }) +
    `<div style="display:flex;justify-content:space-between;margin-top:22pt">
      <div style="flex:1">${signCenter({ role: 'เจ้าหน้าที่การเงิน', name: a.financeOfficer, prefixLabel: '(ลงชื่อ)' })}</div>
      <div style="flex:1">
        <p class="center" style="margin-top:14pt">อนุมัติ</p>
        ${signCenter({ role: `ผู้อำนวยการ${a.scName || 'โรงเรียน'}`, name: a.director, prefixLabel: '(ลงชื่อ)' })}
      </div>
    </div>`
  return { title: `บันทึกส่งใช้เงินยืม_${a.loanNo ?? ''}`, body }
}

// ─────────────────────────────────────────────────────────────────────────
// 3) ขออนุมัติเบิกจ่ายเงิน (ตย.25)
// ─────────────────────────────────────────────────────────────────────────
export function paymentRequestMemo(a: {
  scName: string
  docNo?: string | null
  date?: string | null
  detail: string
  partnerName?: string | null
  projectName?: string | null
  budgetTypeName?: string | null
  amount: number
  requesterName?: string | null
  director?: string | null
}): MemoResult {
  const subject = `ขออนุมัติเบิกจ่ายเงิน${a.budgetTypeName ? ' (' + esc(a.budgetTypeName) + ')' : ''}`
  const body =
    memoHead({ scName: a.scName, no: a.docNo, date: a.date, subject }) +
    `<p style="text-indent:2.5em;line-height:1.6;margin-top:6pt">ด้วย ${esc(a.scName || 'โรงเรียน')} มีความประสงค์ขออนุมัติเบิกจ่ายเงิน` +
    `${a.projectName ? ' โครงการ ' + esc(a.projectName) : ''}` +
    `${a.partnerName ? ' ให้แก่ ' + esc(a.partnerName) : ''} เป็นเงิน <b>${fmtBaht(a.amount)}</b> บาท` +
    ` (${esc(numberToThaiBaht(a.amount))}) รายละเอียดดังนี้</p>` +
    `<table style="width:90%;margin:6pt auto">
      <tr><th style="width:75%">รายการ</th><th>จำนวนเงิน (บาท)</th></tr>
      <tr><td>${esc(a.detail || '-')}</td><td class="num">${fmtBaht(a.amount)}</td></tr>
      <tr><td class="right"><b>รวมเป็นเงิน</b></td><td class="num"><b>${fmtBaht(a.amount)}</b></td></tr>
    </table>` +
    `<p style="text-indent:2.5em;margin-top:6pt">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติเบิกจ่าย</p>` +
    signCenter({ role: 'เจ้าหน้าที่การเงิน', name: a.requesterName, prefixLabel: '(ลงชื่อ)' }) +
    `<div style="margin-top:22pt">
      <p class="center">อนุมัติ</p>
      ${signCenter({ role: `ผู้อำนวยการ${a.scName || 'โรงเรียน'}`, name: a.director, prefixLabel: '(ลงชื่อ)' })}
    </div>`
  return { title: `บันทึกขออนุมัติเบิกจ่าย_${a.docNo ?? ''}`, body }
}

// ─────────────────────────────────────────────────────────────────────────
// 4) หนังสือรับรองการหักภาษี ณ ที่จ่าย — แบบ บก.28
// ─────────────────────────────────────────────────────────────────────────
export function withholdingCertificateForm(a: {
  scName: string
  certNo: string // เช่น "บก. 28/2/2569"
  certDate?: string | null
  payDate?: string | null
  withdrawDocNo?: string | null // เอกสารขอเบิกเลขที่
  partnerName?: string | null
  payTypeName?: string | null // ประเภทเงินที่ได้จ่าย (เช่น เงินรายได้สถานศึกษา)
  incomeAmount: number // จำนวนเงินได้
  taxAmount: number // ภาษีหัก ณ ที่จ่าย
  director?: string | null
}): MemoResult {
  const cell = 'border:1px solid #000;padding:4pt 6pt;vertical-align:top'
  const body =
    `<p class="right" style="margin:0 0 4pt 0"><b>แบบ ${esc(a.certNo)}</b></p>
    <h1 style="text-align:center;font-size:18pt;font-weight:bold;margin:0 0 8pt 0">หนังสือรับรองการหักภาษี ณ ที่จ่าย</h1>
    <div style="border:1px solid #000;padding:8pt;line-height:1.6">
      <p style="margin:0"><b>ผู้มีหน้าที่หักภาษี ณ ที่จ่าย :</b></p>
      <p style="margin:2pt 0">ส่วนราชการ <b>${esc(a.scName || 'โรงเรียน')}</b>&nbsp;&nbsp;เลขประจำตัวผู้เสียภาษี ${DOT}</p>
      <p style="margin:2pt 0">ขอรับรองว่าได้หักภาษีเงิน ณ ที่จ่าย ตามเอกสารขอเบิกเลขที่ ${esc(a.withdrawDocNo || DOT)}` +
    ` ลงวันที่ ${a.payDate ? esc(thaiFullDate(a.payDate)) : DOT}</p>
      <p style="margin:6pt 0 2pt 0"><b>ผู้ถูกหักภาษี ณ ที่จ่าย :</b></p>
      <p style="margin:2pt 0">ชื่อ <b>${esc(a.partnerName || DOT)}</b>&nbsp;&nbsp;เลขประจำตัวประชาชน/ผู้เสียภาษี ${DOT}</p>
      <p style="margin:2pt 0">ที่อยู่ ${DOT}</p>
      <p style="margin:2pt 0">และได้โอนสิทธิเรียกร้องในเงินดังกล่าวให้แก่ ${DOT}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:8pt;font-size:14pt">
        <thead>
          <tr>
            <th style="${cell};text-align:center;width:26%">ประเภทภาษี</th>
            <th style="${cell};text-align:center">ประเภทเงินที่ได้จ่าย</th>
            <th style="${cell};text-align:center">วันเดือนปีที่จ่าย</th>
            <th style="${cell};text-align:center">จำนวนเงินได้</th>
            <th style="${cell};text-align:center">ภาษี</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="${cell}">ภาษีเงินได้นิติบุคคล<br/>ภาษีเงินได้บุคคลธรรมดา<br/>ค่าปรับ</td>
            <td style="${cell}">${esc(a.payTypeName || '-')}</td>
            <td style="${cell};text-align:center">${a.payDate ? esc(thaiFullDate(a.payDate)) : '-'}</td>
            <td style="${cell};text-align:right">${fmtBaht(a.incomeAmount)}</td>
            <td style="${cell};text-align:right">${fmtBaht(a.taxAmount)}</td>
          </tr>
          <tr>
            <td style="${cell};text-align:center" colspan="3"><b>รวมเงินภาษี</b> (${esc(numberToThaiBaht(a.taxAmount))})</td>
            <td style="${cell};text-align:right"><b>${fmtBaht(a.incomeAmount)}</b></td>
            <td style="${cell};text-align:right"><b>${fmtBaht(a.taxAmount)}</b></td>
          </tr>
        </tbody>
      </table>
    </div>` +
    signCenter({
      role: `ผู้อำนวยการ${a.scName || 'โรงเรียน'}`,
      name: a.director,
      prefixLabel: '(ลงชื่อ)',
    }) +
    `<p style="margin-top:18pt;font-size:12pt;color:#444"><b>หมายเหตุ</b> ให้สถานศึกษาจัดทำหนังสือรับรองการหักภาษี ณ ที่จ่าย (บก.28) 2 ฉบับ` +
    ` (ฉบับจริง) ให้ผู้ขาย/ผู้รับจ้าง (ฉบับสำเนา) ให้สถานศึกษาเก็บเป็นหลักฐานในการบันทึกรายการทางบัญชี</p>`
  return { title: `หนังสือรับรองหักภาษี_${a.certNo}`, body }
}
