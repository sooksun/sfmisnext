'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { setAuthToken, clearAuthToken, getAccessToken } from '@/lib/auth-token'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/'

export function SessionSync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  // ── Synchronous token guard (runs inline, before children render) ──────────
  // แก้ปัญหา Fast Refresh ใน dev: HMR reset module-level _accessToken = null
  // แต่ React state (ready = true) ยังคงอยู่ → children render โดยไม่มี token
  // ตรวจสอบและ restore token ก่อน render ทุกครั้งที่ session พร้อม
  if (status === 'authenticated' && session?.user) {
    const _sa = session as unknown as Record<string, unknown>
    const _at = String(_sa.access_token ?? '')
    if (_at && !getAccessToken()) {
      const _u = session.user as Record<string, unknown>
      setAuthToken(
        _at,
        Number(_u.id ?? _u.admin_id ?? 0),
        Number(_u.sc_id ?? _u.scId ?? 0),
      )
    }
  }

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      clearAuthToken()
      router.push('/sign-in')
      return
    }

    if (!session?.user) return

    async function init() {
      const user = session!.user as Record<string, unknown>
      const sessionAny = session as unknown as Record<string, unknown>
      const scId = Number(user.sc_id ?? user.scId ?? 0)
      const userId = Number(user.id ?? user.admin_id ?? 0)
      const accessToken = String(sessionAny.access_token ?? '')

      // ถ้าไม่มี access_token → session เก่า (ก่อน JWT) → force re-login
      if (!accessToken) {
        clearAuthToken()
        await signOut({ redirect: false })
        router.push('/sign-in')
        return
      }

      // ✅ เก็บ token ใน memory module (ไม่ใช้ localStorage)
      setAuthToken(accessToken, userId, scId)

      // เก็บ user data (ไม่รวม access_token) ใน localStorage เพื่อให้หน้าต่าง ๆ อ่าน sc_id ได้
      // access_token ไม่เคยถูกเก็บที่นี่ตั้งแต่แรก (อยู่ใน memory เท่านั้น)
      const { access_token: _omitToken, ...userDataSafe } = user as Record<string, unknown>
      localStorage.setItem('data', JSON.stringify(userDataSafe))

      // ยังเก็บ years ใน localStorage (ข้อมูลปีการศึกษาไม่ sensitive)
      const cachedYears = localStorage.getItem('years')
      const needsYearData = !cachedYears || cachedYears === '{}' || cachedYears === 'null'
      if (needsYearData) {
        try {
          const yearsRes = await fetch(`${API_URL}school_year/loadScoolYearByYear/${scId}`, {
            headers: { 'Content-Type': 'application/json' },
          })
          const yearsList = await yearsRes.json()

          if (Array.isArray(yearsList) && yearsList.length > 0) {
            const latestYear = yearsList[0]
            const changeRes = await fetch(`${API_URL}school_year/change_year`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sy_id: latestYear.sy_id, sc_id: scId }),
            })
            const changeData = await changeRes.json()
            if (changeData.flag && changeData.sy_date) {
              localStorage.setItem(
                'years',
                JSON.stringify({
                  sy_date: changeData.sy_date,
                  budget_date: changeData.budget_date ?? changeData.sy_date,
                }),
              )
            }
          } else {
            const res = await fetch(`${API_URL}school_year/check_year`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            })
            const data = await res.json()
            if (data.flag && data.sy_date) {
              localStorage.setItem(
                'years',
                JSON.stringify({
                  sy_date: data.sy_date,
                  budget_date: data.budget_date ?? data.sy_date,
                }),
              )
            }
          }
        } catch {
          // Year data unavailable — pages will show empty state
        }
      }

      setReady(true)
    }

    init()
  }, [session, status, router])

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        กำลังโหลดข้อมูล...
      </div>
    )
  }

  return <>{children}</>
}
