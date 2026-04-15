import { getSession } from 'next-auth/react'
import { getAccessToken, setAuthToken, getUserId } from './auth-token'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/'

/**
 * สร้าง headers สำหรับ API call
 *
 * Strategy:
 *  1. Fast path: อ่าน token จาก in-memory (auth-token.ts)
 *  2. Fallback: ถ้าไม่มี → ดึงจาก NextAuth session โดยตรง (handle HMR / timing issues)
 *     แล้ว restore กลับเข้า memory เพื่อให้ครั้งต่อไปเร็ว
 *
 * ไม่พึ่ง localStorage.access_token → ลด XSS surface
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (typeof window === 'undefined') return headers

  // 1) fast path: in-memory (หรือ sessionStorage fallback)
  let token = getAccessToken()

  // 2) slow path: ถาม NextAuth session โดยตรง (แก้ปัญหา HMR reset / timing race)
  if (!token) {
    try {
      const session = await getSession()
      const sessionTokenRaw = (session as unknown as { access_token?: string } | null)?.access_token
      if (sessionTokenRaw) {
        token = sessionTokenRaw
        // restore เข้า memory เพื่อให้ call ต่อไปเร็ว
        const user = session?.user as unknown as Record<string, unknown> | undefined
        if (user) {
          setAuthToken(
            sessionTokenRaw,
            Number(user.id ?? user.admin_id ?? 0),
            Number(user.sc_id ?? user.scId ?? 0),
          )
        }
      }
    } catch {
      // session unavailable — call จะไปต่อแบบไม่มี header (backend จะ reject 401)
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export async function apiGet<T>(segment: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${segment}`, {
    headers: await getAuthHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function apiPost<T>(
  segment: string,
  data: Record<string, unknown>,
): Promise<T> {
  // ดึง up_by จาก in-memory store แทน localStorage
  const payload: Record<string, unknown> = { ...data }
  if (typeof window !== 'undefined') {
    const uid = getUserId()
    if (uid && !payload.up_by) {
      payload.up_by = uid
    }
  }
  const res = await fetch(`${BASE_URL}${segment}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}
