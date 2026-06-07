// จำ "วันที่ของรายการล่าสุดที่บันทึก" เพื่อให้ฟอร์มบันทึกครั้งถัดไป default วันที่เดิม
// (ลดการเลือกวันที่ซ้ำเมื่อลงหลายรายการในวันเดียวกัน — "วันที่ตามที่กำหนดไว้ก่อนหน้า")
// เก็บใน sessionStorage แยกตามชนิดงาน (key) ; ถ้าไม่มีค่า → ใช้วันนี้

const PREFIX = 'sfmis:lastDate:'

/** วันนี้ในรูป YYYY-MM-DD (ค.ศ.) */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * วันที่ default สำหรับฟอร์มบันทึก — ใช้วันที่ของรายการล่าสุด (ถ้ามี) ไม่งั้นวันนี้
 * @param key แยกตามชนิดงาน เช่น 'pay' | 'receive' | 'loan' (default 'global')
 */
export function getLastEntryDate(key = 'global'): string {
  if (typeof window === 'undefined') return todayISO()
  try {
    return sessionStorage.getItem(PREFIX + key) || todayISO()
  } catch {
    return todayISO()
  }
}

/** บันทึกวันที่ที่เพิ่งลง เพื่อใช้เป็น default ครั้งถัดไป */
export function setLastEntryDate(date: string | null | undefined, key = 'global'): void {
  if (typeof window === 'undefined' || !date) return
  try {
    sessionStorage.setItem(PREFIX + key, date)
  } catch {
    /* ignore quota/private-mode */
  }
}
