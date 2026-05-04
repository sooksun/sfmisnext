'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAppContext } from '@/hooks/use-app-context'
import { ShieldAlert } from 'lucide-react'

interface RoleGuardProps {
  /** รายการ type ที่อนุญาต เช่น [1, 2, 3, 6] */
  allowedRoles: number[]
  children: React.ReactNode
  /** ถ้า true → redirect ไป /dashboard แทน แสดงหน้า Unauthorized */
  redirect?: boolean
}

/**
 * ห่อ children ด้วย role check ตาม user.type
 *
 * ใช้งาน:
 * ```tsx
 * <RoleGuard allowedRoles={PLAN_ROLES}>
 *   <PageContent />
 * </RoleGuard>
 * ```
 *
 * Role constants (ดูได้ใน sidebar.tsx):
 *   1=SuperAdmin 2=SchoolAdmin 3=PlanStaff 4=SupplyStaff
 *   5=FinanceStaff 6=PlanHead 7=SupplyHead 8=FinanceHead
 */
export function RoleGuard({ allowedRoles, children, redirect = false }: RoleGuardProps) {
  const { userType } = useAppContext()
  const router = useRouter()

  const allowed = userType === 0 || allowedRoles.includes(userType)

  useEffect(() => {
    if (!allowed && redirect) {
      router.replace('/dashboard')
    }
  }, [allowed, redirect, router])

  if (userType === 0) {
    // ยังโหลด session ไม่เสร็จ — รอก่อน
    return null
  }

  if (!allowed) {
    if (redirect) return null
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 py-24">
        <ShieldAlert className="h-12 w-12 text-red-400" />
        <p className="text-lg font-medium text-red-400">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        <p className="text-sm">บัญชีของคุณ (ประเภท {userType}) ไม่ได้รับอนุญาตให้เข้าถึงหน้านี้</p>
        <button
          onClick={() => router.back()}
          className="mt-2 px-4 py-2 rounded-md bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors"
        >
          ย้อนกลับ
        </button>
      </div>
    )
  }

  return <>{children}</>
}

// ─── Role preset constants (ใช้ร่วมกันระหว่าง sidebar + RoleGuard) ─────────────
export const ROLES_ALL     = [1, 2, 3, 4, 5, 6, 7, 8]
export const ROLES_ADMIN   = [1, 2]
export const ROLES_PLAN    = [1, 2, 3, 6]
export const ROLES_SUPPLY  = [1, 2, 4, 7]
export const ROLES_FINANCE = [1, 2, 5, 8]
export const ROLES_SUPER   = [1]
