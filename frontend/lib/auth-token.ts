/**
 * Module-level in-memory token store + sessionStorage fallback
 *
 * เหตุผลที่ไม่ใช้ localStorage:
 * - localStorage อยู่บน disk → XSS attack สามารถอ่านได้แม้หลัง session หมด
 * - memory variable หายเมื่อ tab ปิด / reload → ลด attack surface
 *
 * sessionStorage fallback:
 * - ใช้รับมือ Next.js Fast Refresh (HMR reset module vars แต่ sessionStorage ยังอยู่)
 * - clear อัตโนมัติเมื่อปิด tab → ไม่ persist ข้ามวัน
 * - ยังอ่านได้ด้วย JS (ถ้า XSS) แต่ดีกว่า localStorage เพราะ lifetime สั้นกว่า
 *
 * Token ถูก set โดย SessionSync หลัง NextAuth session พร้อม
 */

const SS_KEY = '__sfmis_tk'

let _accessToken: string | null = null
let _userId: number | null = null
let _scId: number | null = null

export function setAuthToken(token: string, userId: number, scId: number) {
  _accessToken = token
  _userId = userId
  _scId = scId
  // backup ใน sessionStorage สำหรับ Fast Refresh recovery
  if (typeof window !== 'undefined') {
    try { sessionStorage.setItem(SS_KEY, token) } catch { /* ignore */ }
  }
}

export function clearAuthToken() {
  _accessToken = null
  _userId = null
  _scId = null
  if (typeof window !== 'undefined') {
    try { sessionStorage.removeItem(SS_KEY) } catch { /* ignore */ }
  }
}

export function getAccessToken(): string | null {
  if (_accessToken) return _accessToken
  // Fast Refresh recovery: module var ถูก reset แต่ sessionStorage ยังอยู่
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(SS_KEY)
      if (stored) {
        _accessToken = stored // restore กลับมาใน module var
        return stored
      }
    } catch { /* ignore */ }
  }
  return null
}

export function getUserId(): number | null {
  return _userId
}

export function getScId(): number | null {
  return _scId
}
