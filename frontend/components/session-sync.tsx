'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { setAuthToken, clearAuthToken, getAccessToken } from '@/lib/auth-token'
import { useUserStore } from '@/stores/user-store'
import type { User, YearData } from '@/lib/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/'

export function SessionSync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const setUser = useUserStore((s) => s.setUser)
  const setYearData = useUserStore((s) => s.setYearData)
  const clearUser = useUserStore((s) => s.clearUser)

  // ── Synchronous token guard (runs inline, before children render) ──────────
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
      clearUser()
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

      if (!accessToken) {
        clearAuthToken()
        clearUser()
        await signOut({ redirect: false })
        router.push('/sign-in')
        return
      }

      // เก็บ token ใน memory module (ไม่ใช้ localStorage)
      setAuthToken(accessToken, userId, scId)

      // เก็บ user data ใน Zustand store (persist ใน sessionStorage)
      const { access_token: _omitToken, ...userDataSafe } = user
      setUser(userDataSafe as unknown as User)

      // ── backward compat: เขียน localStorage ชั่วคราวสำหรับ component ที่ยังไม่ได้ migrate ──
      try {
        localStorage.setItem('data', JSON.stringify(userDataSafe))
      } catch { /* ignore */ }

      // ดึง year data → เก็บใน Zustand
      const existingYearData = useUserStore.getState().yearData
      if (!existingYearData) {
        try {
          const authHeader = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }

          const yearsRes = await fetch(`${API_URL}school_year/loadScoolYearByYear/${scId}`, {
            headers: authHeader,
          })
          const yearsList = await yearsRes.json()

          let yd: YearData | null = null

          if (Array.isArray(yearsList) && yearsList.length > 0) {
            const latestYear = yearsList[0]
            const changeRes = await fetch(`${API_URL}school_year/change_year`, {
              method: 'POST',
              headers: authHeader,
              body: JSON.stringify({ sy_id: latestYear.sy_id, sc_id: scId }),
            })
            const changeData = await changeRes.json()
            if (changeData.flag && changeData.sy_date) {
              yd = {
                sy_date: changeData.sy_date,
                budget_date: changeData.budget_date ?? changeData.sy_date,
              }
            }
          } else {
            const res = await fetch(`${API_URL}school_year/check_year`, {
              method: 'POST',
              headers: authHeader,
            })
            const data = await res.json()
            if (data.flag && data.sy_date) {
              yd = {
                sy_date: data.sy_date,
                budget_date: data.budget_date ?? data.sy_date,
              }
            }
          }

          if (yd) {
            setYearData(yd)
            // backward compat
            try { localStorage.setItem('years', JSON.stringify(yd)) } catch { /* ignore */ }
          }
        } catch {
          // Year data unavailable — pages will show empty state
        }
      }

      setReady(true)
    }

    init()
  }, [session, status, router, setUser, setYearData, clearUser])

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        กำลังโหลดข้อมูล...
      </div>
    )
  }

  return <>{children}</>
}
