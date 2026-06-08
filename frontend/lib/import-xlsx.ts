import * as XLSX from 'xlsx'

/**
 * อ่านไฟล์ Excel/CSV → array ของ object โดยใช้แถวแรกเป็นหัวคอลัมน์
 * ใช้ชีตแรกของไฟล์ และเติมค่าว่าง ('') ให้ช่องที่ไม่มีข้อมูล
 */
export async function readXlsxRows(
  file: File,
): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
}
