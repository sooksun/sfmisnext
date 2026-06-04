'use client'

import { useRef, useEffect } from 'react'
import { KRUT_EMBLEM } from '@/lib/krut-emblem'

export interface ReceiptDetail {
  prd_id: number
  bg_type_id: number
  bg_type_name: string
  prd_detail: string | null
  prd_budget: number
}

export interface ReceiptData {
  pr_id: number
  pr_no: string | null
  book_no?: string | null        // เล่มที่
  sc_id: number
  sc_name: string
  receive_form: string | null   // ได้รับเงินจาก
  receive_date: string | null
  receive_money_type: number    // 1=เช็ค 2=เงินสด 3=โอน
  details: ReceiptDetail[]
  total: number
  signer_name?: string
  signer_position?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

/** แปลง YYYY-MM-DD → "วันที่ 25 เดือน สิงหาคม พ.ศ.2562" */
function thaiFullDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr.replace(' ', 'T'))
  if (isNaN(d.getTime())) return '-'
  const day = d.getDate()
  const month = THAI_MONTHS[d.getMonth()]
  const year = d.getFullYear() + 543
  return `วันที่ ${day} เดือน ${month} พ.ศ.${year}`
}

/** แปลงตัวเลข → ตัวอักษรไทย */
function numberToThaiText(n: number): string {
  const units = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']

  if (n === 0) return 'ศูนย์บาทถ้วน'

  const intPart = Math.floor(n)
  const decPart = Math.round((n - intPart) * 100)

  function convert(num: number): string {
    if (num === 0) return ''
    if (num < 10) return units[num]
    const digits = String(num).split('').map(Number)
    let result = ''
    for (let i = 0; i < digits.length; i++) {
      const pos = digits.length - 1 - i
      const d = digits[i]
      if (d === 0) continue
      if (pos === 1 && d === 1) result += 'สิบ'
      else if (pos === 1 && d === 2) result += 'ยี่สิบ'
      else result += units[d] + positions[pos]
    }
    return result
  }

  const millions = Math.floor(intPart / 1_000_000)
  const remainder = intPart % 1_000_000
  let text = ''
  if (millions > 0) text += convert(millions) + 'ล้าน'
  text += convert(remainder)
  text += 'บาท'

  if (decPart === 0) {
    text += 'ถ้วน'
  } else {
    const tens = Math.floor(decPart / 10)
    const ones = decPart % 10
    if (tens > 0) {
      if (tens === 1) text += 'สิบ'
      else if (tens === 2) text += 'ยี่สิบ'
      else text += units[tens] + 'สิบ'
    }
    if (ones > 0) text += units[ones]
    text += 'สตางค์'
  }
  return text
}

/** จำนวนเงินแบบใบเสร็จ: 10,000.-  หรือ  10,000.50 */
function fmtMoney(n: number): string {
  const int = Math.floor(n)
  const dec = Math.round((n - int) * 100)
  const intStr = int.toLocaleString('th-TH')
  if (dec === 0) return `${intStr}.-`
  return `${intStr}.${String(dec).padStart(2, '0')}`
}

// ── Receipt HTML builder ──────────────────────────────────────────────────────

export function buildReceiptHtml(receipt: ReceiptData): string {
  const MIN_ROWS = 4
  const dateStr = thaiFullDate(receipt.receive_date)
  const totalText = numberToThaiText(receipt.total)

  // รายการ
  const detailRows = receipt.details.map((d) => {
    const label = d.prd_detail
      ? d.prd_detail
      : d.bg_type_name
    return `<tr>
      <td>${label}</td>
      <td class="money">${fmtMoney(d.prd_budget)}</td>
    </tr>`
  }).join('')

  // เติมแถวว่างให้ครบ MIN_ROWS
  const emptyCount = Math.max(0, MIN_ROWS - receipt.details.length)
  const emptyRows = Array.from({ length: emptyCount }).map(() =>
    `<tr><td>&nbsp;</td><td class="money">&nbsp;</td></tr>`
  ).join('')

  const signerBlock = receipt.signer_name
    ? `<div class="sign-name">(${receipt.signer_name})</div>`
    : ''
  const positionBlock = receipt.signer_position
    ? `<div class="sign-pos">(ตำแหน่ง ${receipt.signer_position})</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8"/>
  <title>ใบเสร็จรับเงิน เลขที่ ${receipt.pr_no ?? ''}</title>
  <style>
    @page { size: A5; margin: 9mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: auto; }
    body {
      font-family: 'TH SarabunNew', 'Sarabun', 'TH Sarabun New', serif;
      font-size: 15pt;
      color: #000;
    }
    .receipt { width: 100%; }

    /* หัวกระดาษ */
    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 14pt;
      margin-bottom: 1mm;
    }
    .top-left { text-align: left; padding-top: 3mm; }
    .top-right { text-align: right; padding-top: 3mm; }
    .emblem { text-align: center; line-height: 1; }
    .emblem img { height: 15mm; width: auto; }

    .title {
      text-align: center;
      font-size: 21pt;
      font-weight: bold;
      margin: 1mm 0 1mm;
    }
    .subtitle { text-align: center; font-size: 14pt; margin-bottom: 0.5mm; }
    .school { text-align: center; font-size: 14pt; margin-bottom: 1mm; }
    .date { text-align: center; font-size: 14pt; margin-bottom: 2mm; }

    .payer {
      font-size: 15pt;
      border-bottom: 1px solid #000;
      padding-bottom: 1mm;
      margin-bottom: 1mm;
    }
    .payer-label { margin-bottom: 0.5mm; }

    /* ตาราง */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 2mm;
      margin-bottom: 3mm;
    }
    th {
      border: 1px solid #000;
      padding: 1.5mm 3mm;
      text-align: center;
      font-size: 15pt;
      background: #f0f0f0;
    }
    td {
      border: 1px solid #000;
      padding: 1.5mm 3mm;
      font-size: 15pt;
      min-height: 8mm;
    }
    td.money {
      text-align: right;
      white-space: nowrap;
      width: 28%;
    }
    .total-row td {
      font-weight: bold;
      background: #f8f8f8;
    }

    /* ตัวอักษร + ลายเซ็น */
    .baht-text { font-size: 14pt; margin-bottom: 2mm; }
    .confirm { font-size: 14pt; margin-bottom: 3mm; }
    .sign-area { margin-top: 5mm; text-align: center; }
    .sign-line {
      display: inline-block;
      width: 55mm;
      border-bottom: 1px solid #000;
      margin-bottom: 1mm;
    }
    .sign-row { font-size: 14pt; }
    .sign-name { font-size: 14pt; margin-top: 0.5mm; }
    .sign-pos { font-size: 14pt; }
  </style>
</head>
<body>
<div class="receipt">

  <div class="top-row">
    <div class="top-left">เล่มที่ <strong>${receipt.book_no ?? '............'}</strong></div>
    <div class="emblem"><img src="${KRUT_EMBLEM}" alt="ครุฑ"/></div>
    <div class="top-right">เลขที่ <strong>${receipt.pr_no ?? '............'}</strong></div>
  </div>

  <div class="title">ใบเสร็จรับเงิน</div>
  <div class="subtitle">ในราชการสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน</div>
  <div class="school">ที่ทำการ${receipt.sc_name}</div>
  <div class="date">${dateStr}</div>

  <div class="payer">
    <div class="payer-label">ได้รับเงินจาก ${receipt.receive_form || '-'}</div>
    <div>ตามรายละเอียดดังนี้</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>รายการ</th>
        <th style="width:28%">จำนวนเงิน</th>
      </tr>
    </thead>
    <tbody>
      ${detailRows}
      ${emptyRows}
      <tr class="total-row">
        <td style="text-align:right">รวมบาท</td>
        <td class="money">${fmtMoney(receipt.total)}</td>
      </tr>
    </tbody>
  </table>

  <div class="baht-text">(ตัวอักษร ${totalText})</div>
  <div class="confirm">ไว้เป็นการถูกต้องแล้ว</div>

  <div class="sign-area">
    <div><span class="sign-line">&nbsp;</span></div>
    <div class="sign-row">(ลงชื่อ)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ผู้รับเงิน</div>
    ${signerBlock}
    ${positionBlock}
  </div>

</div>

<script>
  // fallback: ถ้า onload ไม่ fire จาก parent ให้ print เอง
  window.onload = function() {
    window.focus();
    window.print();
    window.onafterprint = function() { window.close(); };
  };
</script>
</body>
</html>`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ReceiptPrintProps {
  receipt: ReceiptData
  autoprint?: boolean
  onAfterPrint?: () => void
}

export function ReceiptPrint({ receipt, autoprint, onAfterPrint }: ReceiptPrintProps) {
  const didPrint = useRef(false)

  function openPrint() {
    const win = window.open('', '_blank')
    if (!win) {
      alert('กรุณาอนุญาต Popup สำหรับเว็บไซต์นี้แล้วลองใหม่')
      onAfterPrint?.()
      return
    }
    win.document.open()
    win.document.write(buildReceiptHtml(receipt))
    win.document.close()

    // รอ fonts + layout render แล้วค่อย print
    win.onload = () => {
      win.focus()
      win.print()
      // ปิด window อัตโนมัติหลัง print dialog ปิด
      win.onafterprint = () => win.close()
    }

    onAfterPrint?.()
  }

  useEffect(() => {
    if (autoprint && !didPrint.current) {
      didPrint.current = true
      // delay เล็กน้อยให้ React flush state ก่อน
      const t = setTimeout(openPrint, 50)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoprint])

  // autoprint mode: render nothing visible
  if (autoprint) return null

  return null  // ปุ่มพิมพ์อยู่ที่ table row แล้ว ไม่ต้องแสดง
}
