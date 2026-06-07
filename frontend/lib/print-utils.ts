/**
 * Print utility — open a new window with A4-formatted HTML and trigger browser print dialog.
 * ใช้สำหรับสร้างเอกสารราชการแบบ print-to-PDF (ไม่พึ่ง library นอก)
 */

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

/** YYYY-MM-DD → "25 สิงหาคม 2569" */
export function thaiFullDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const raw = String(dateStr).replace(' ', 'T')
  const d = new Date(raw)
  if (isNaN(d.getTime())) return '-'
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}

/** ตัวเลข → "หนึ่งพันห้าร้อยบาทถ้วน" */
export function numberToThaiBaht(n: number): string {
  if (!isFinite(n)) return '-'
  const units = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']
  if (n === 0) return 'ศูนย์บาทถ้วน'
  const int = Math.floor(Math.abs(n))
  const dec = Math.round((Math.abs(n) - int) * 100)
  const conv = (num: number): string => {
    if (num === 0) return ''
    if (num < 10) return units[num]
    const digits = String(num).split('').map(Number)
    let s = ''
    for (let i = 0; i < digits.length; i++) {
      const d = digits[i]
      const pos = digits.length - 1 - i
      if (d === 0) continue
      if (pos === 0 && d === 1 && digits.length > 1) s += 'เอ็ด'
      else if (pos === 1 && d === 2) s += 'ยี่'
      else if (pos === 1 && d === 1) s += ''
      else s += units[d]
      s += positions[pos]
    }
    return s
  }
  let result = conv(int) + 'บาท'
  result += dec === 0 ? 'ถ้วน' : conv(dec) + 'สตางค์'
  return (n < 0 ? 'ลบ' : '') + result
}

export function fmtBaht(n: number | null | undefined): string {
  const v = Number(n ?? 0)
  return v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export interface PrintOpts {
  /** ชื่อเอกสาร (ใช้เป็น document.title ตอน print → filename) */
  title: string
  /** HTML body content (ไม่ต้อง <html> wrapper) */
  body: string
  /** auto-trigger print dialog (default: true) */
  autoPrint?: boolean
  /** ขนาด/แนวกระดาษ (default: A4) — landscape = แนวนอน */
  paper?: 'A4' | 'A5' | 'A4 landscape' | 'A5 landscape'
}

const BASE_CSS = `
@page { size: {PAPER}; margin: 15mm 15mm 15mm 15mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: 'TH SarabunPSK', 'Sarabun', 'Tahoma', sans-serif; font-size: 16pt; color: #000; line-height: 1.5; }
.page { padding: 0; max-width: 100%; }
.header { text-align: center; margin-bottom: 10mm; }
.header h1 { font-size: 20pt; margin: 0 0 4pt 0; }
.header .sub { font-size: 14pt; color: #333; }
.meta { display: flex; justify-content: space-between; font-size: 14pt; margin-bottom: 8pt; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0; }
th, td { border: 1px solid #000; padding: 4pt 6pt; text-align: left; font-size: 14pt; vertical-align: top; }
th { background: #f0f0f0; text-align: center; font-weight: bold; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.center { text-align: center; }
.right { text-align: right; }
.no-border { border: none !important; }
.mt-6 { margin-top: 6mm; }
.mt-10 { margin-top: 10mm; }
.mt-15 { margin-top: 15mm; }
.sign-row { display: flex; justify-content: space-around; margin-top: 18mm; }
.sign-box { text-align: center; min-width: 60mm; }
.sign-line { border-bottom: 1px dotted #000; min-width: 50mm; height: 20mm; }
.sign-label { margin-top: 4pt; font-size: 14pt; }
.footer-note { font-size: 12pt; color: #555; margin-top: 8mm; }
@media print {
  .no-print { display: none !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
.toolbar { position: fixed; top: 8px; right: 8px; z-index: 9999; }
.toolbar button { font-family: inherit; font-size: 14pt; padding: 6px 14px; margin-left: 4px; cursor: pointer; border: 1px solid #888; background: #fff; border-radius: 4px; }
.toolbar button:hover { background: #eef; }
`

/** เปิดหน้าต่างใหม่พร้อม HTML สำหรับพิมพ์เป็นไฟล์ PDF */
export function openPrintWindow(opts: PrintOpts) {
  const paper = opts.paper ?? 'A4'
  const css = BASE_CSS.replace('{PAPER}', paper)
  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.title)}</title>
<style>${css}</style>
</head>
<body>
<div class="toolbar no-print">
  <button onclick="window.print()">พิมพ์ / บันทึก PDF</button>
  <button onclick="window.close()">ปิด</button>
</div>
<div class="page">${opts.body}</div>
${opts.autoPrint !== false ? '<script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>' : ''}
</body>
</html>`
  const w = window.open('', '_blank', 'width=900,height=1100')
  if (!w) {
    alert('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาต popup')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** HTML-safe helper ส่งออกให้หน้าอื่นใช้ */
export const esc = escapeHtml

/** helper สร้างตาราง header/body ข้อความธรรมดา */
export function makeTable(
  headers: string[],
  rows: (string | number)[][],
  opts?: { numCols?: number[] },
): string {
  const numCols = new Set(opts?.numCols ?? [])
  const thead = headers.map((h) => `<th>${esc(h)}</th>`).join('')
  const tbody = rows
    .map(
      (r) =>
        `<tr>${r
          .map((c, i) => `<td class="${numCols.has(i) ? 'num' : ''}">${esc(String(c ?? ''))}</td>`)
          .join('')}</tr>`,
    )
    .join('')
  return `<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`
}

/** header มาตรฐานราชการ: ชื่อเอกสาร + ชื่อโรงเรียน + เลขที่/วันที่ */
export function makeHeader(args: {
  title: string
  subtitle?: string
  scName?: string
  docNo?: string
  docDate?: string
}): string {
  return `
<div class="header">
  ${args.scName ? `<div class="sub">${esc(args.scName)}</div>` : ''}
  <h1>${esc(args.title)}</h1>
  ${args.subtitle ? `<div class="sub">${esc(args.subtitle)}</div>` : ''}
</div>
<div class="meta">
  <div>${args.docNo ? `เลขที่: ${esc(args.docNo)}` : ''}</div>
  <div>${args.docDate ? `วันที่: ${esc(thaiFullDate(args.docDate))}` : ''}</div>
</div>`
}

/** ช่องลงนาม 2-3 คน */
export function makeSignatures(roles: string[]): string {
  return `
<div class="sign-row">
  ${roles
    .map(
      (r) => `
    <div class="sign-box">
      <div class="sign-line"></div>
      <div class="sign-label">(..................................................)</div>
      <div class="sign-label">${esc(r)}</div>
    </div>`,
    )
    .join('')}
</div>`
}
