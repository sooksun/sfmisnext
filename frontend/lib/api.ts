import { getSession, signOut } from 'next-auth/react'
import { getAccessToken, setAuthToken, clearAuthToken, getUserId } from './auth-token'

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

interface RequestConfig {
  url: string
  method: 'GET' | 'POST'
  body?: string
}

/**
 * ตรวจสอบ response — ถ้า 401 ให้ refresh token แล้ว retry ด้วย request เดิม
 * (method + body ครบ — กัน bug retry POST เป็น GET หรือ body หาย)
 * ถ้า refresh ไม่สำเร็จ → signOut
 */
async function handleResponse<T>(
  res: Response,
  config: RequestConfig,
): Promise<T> {
  if (res.ok) return res.json()

  if (res.status === 401) {
    // Token expire หรือไม่ถูกต้อง → ลอง refresh จาก session ก่อน
    clearAuthToken()
    try {
      const session = await getSession()
      const newToken = (session as unknown as { access_token?: string } | null)?.access_token
      if (newToken) {
        // session ยังมี token ใหม่ → retry request เดิมพร้อม method + body ครบ
        const retryRes = await fetch(config.url, {
          method: config.method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${newToken}`,
          },
          body: config.body,
          cache: 'no-store',
        })
        if (retryRes.ok) return retryRes.json()
        // retry แล้วยัง fail → fallthrough ไป signOut
      }
    } catch {
      // session refresh ล้มเหลว
    }
    // ไม่สามารถ refresh ได้ → sign out แล้วไป login
    if (typeof window !== 'undefined') {
      await signOut({ redirectTo: '/sign-in' })
    }
    throw new Error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่')
  }

  if (res.status === 403) {
    throw new Error('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
  }

  throw new Error(`API error: ${res.status}`)
}

export async function apiGet<T>(segment: string): Promise<T> {
  const url = `${BASE_URL}${segment}`
  const res = await fetch(url, {
    headers: await getAuthHeaders(),
    cache: 'no-store',
  })
  return handleResponse<T>(res, { url, method: 'GET' })
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
  const url = `${BASE_URL}${segment}`
  const body = JSON.stringify(payload)
  const res = await fetch(url, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body,
  })
  return handleResponse<T>(res, { url, method: 'POST', body })
}
