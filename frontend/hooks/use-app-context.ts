'use client'

import { useUserStore } from '@/stores/user-store'

/**
 * Hook สำหรับอ่าน sc_id, admin_id, sy_id, budget_year จาก Zustand store
 * ใช้แทน localStorage.getItem('data') / localStorage.getItem('years')
 *
 * ข้อมูลถูก populate โดย SessionSync หลัง login
 */
export function useAppContext() {
  const user = useUserStore((s) => s.user)
  const yearData = useUserStore((s) => s.yearData)

  return {
    scId: user?.sc_id ?? 0,
    adminId: user?.admin_id ?? 0,
    userName: user?.name ?? '',
    userType: user?.type ?? 0,
    scName: user?.sc_name ?? '',

    syId: yearData?.sy_date?.sy_id ?? 0,
    syYear: yearData?.sy_date?.sy_year ?? 0,
    budgetYear: yearData?.budget_date?.budget_year ?? 0,
    budgetSyId: yearData?.budget_date?.sy_id ?? 0,

    user,
    yearData,
  }
}
