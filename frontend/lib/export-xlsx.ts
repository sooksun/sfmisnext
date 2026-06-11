import * as XLSX from 'xlsx'

export function exportToXlsx(
  rows: Record<string, unknown>[],
  sheetName: string,
  filename: string
) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/** ส่งออกไฟล์เดียวหลายชีต (เช่น แบบ 2544-2 + แบบ 2544-3) */
export function exportSheets(
  sheets: { name: string; rows: Record<string, unknown>[] }[],
  filename: string
) {
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows)
    // ชื่อชีตยาวเกิน 31 อักขระจะ error — ตัดให้พอดี
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31))
  }
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
