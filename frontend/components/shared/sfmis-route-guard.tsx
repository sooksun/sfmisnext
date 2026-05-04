'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAppContext } from '@/hooks/use-app-context'
import { ShieldAlert } from 'lucide-react'

// ─── Role presets ──────────────────────────────────────────────────────────────
const ALL     = [1, 2, 3, 4, 5, 6, 7, 8]
const ADMIN   = [1, 2]
const PLAN    = [1, 2, 3, 6]
const SUPPLY  = [1, 2, 4, 7]
const FINANCE = [1, 2, 5, 8]
const SUPER   = [1]

/**
 * แผนที่ prefix ของ path → roles ที่อนุญาต
 * ตรวจสอบจาก path ที่ยาวที่สุดก่อน (specific → general)
 */
const PATH_ROLES: Array<{ prefix: string; roles: number[] }> = [
  // งานนโยบายและแผน
  { prefix: '/sfmis/student',               roles: PLAN },
  { prefix: '/sfmis/perhead-rate-setting',  roles: PLAN },
  { prefix: '/sfmis/calculate-perhead',     roles: PLAN },
  { prefix: '/sfmis/budget-allocation',     roles: PLAN },
  { prefix: '/sfmis/budget-category',       roles: PLAN },
  { prefix: '/sfmis/real-budget',           roles: PLAN },
  { prefix: '/sfmis/expenses',              roles: PLAN },
  { prefix: '/sfmis/estimate-acadyear',     roles: PLAN },
  { prefix: '/sfmis/plan-menu',             roles: [...PLAN, 4, 7] },

  // งานการเงิน
  { prefix: '/sfmis/receive-menu',          roles: FINANCE },
  { prefix: '/sfmis/pay-menu',              roles: FINANCE },
  { prefix: '/sfmis/confirm-invoice',       roles: FINANCE },
  { prefix: '/sfmis/financial-report',      roles: FINANCE },
  { prefix: '/sfmis/report',               roles: FINANCE },

  // งานพัสดุ
  { prefix: '/sfmis/supplies',             roles: SUPPLY },
  { prefix: '/sfmis/receive-parcel',       roles: SUPPLY },
  { prefix: '/sfmis/supplie-setting',      roles: SUPPLY },
  { prefix: '/sfmis/setting-committee',    roles: SUPPLY },

  // ตั้งค่าโรงเรียน
  { prefix: '/sfmis/user',                 roles: ADMIN },
  { prefix: '/sfmis/year',                 roles: ADMIN },
  { prefix: '/sfmis/school-policy',        roles: ADMIN },
  { prefix: '/sfmis/business-setting',     roles: ADMIN },

  // ระบบแอดมิน
  { prefix: '/sfmis/school',              roles: SUPER },
  { prefix: '/sfmis/admin',              roles: SUPER },
  { prefix: '/sfmis/obec-policy',         roles: SUPER },
  { prefix: '/sfmis/moe-policy',          roles: SUPER },
  { prefix: '/sfmis/quick-win',           roles: SUPER },
  { prefix: '/sfmis/budget-income-type',  roles: SUPER },
  { prefix: '/sfmis/classroom-budget',    roles: SUPER },
  { prefix: '/sfmis/sao-policy',          roles: SUPER },
  { prefix: '/sfmis/sao',                roles: SUPER },
  { prefix: '/sfmis/receipt',            roles: SUPER },

  // AI + รายงานทั่วไป — ทุก role
  { prefix: '/sfmis/ai-',                 roles: ALL },
]

function getRequiredRoles(pathname: string): number[] | null {
  // เรียงตามความยาว prefix จากมากไปน้อย (specific first)
  const sorted = [...PATH_ROLES].sort((a, b) => b.prefix.length - a.prefix.length)
  for (const { prefix, roles } of sorted) {
    if (pathname.startsWith(prefix)) return roles
  }
  return null // ไม่ระบุ = ทุก role เข้าได้
}

export function SfmisRouteGuard({ children }: { children: React.ReactNode }) {
  const { userType } = useAppContext()
  const pathname = usePathname()
  const router = useRouter()

  const requiredRoles = getRequiredRoles(pathname)
  const allowed = userType === 0 || !requiredRoles || requiredRoles.includes(userType)

  useEffect(() => {
    if (userType !== 0 && !allowed) {
      router.replace('/dashboard')
    }
  }, [allowed, userType, router])

  // ยังโหลด session (userType=0) — SessionSync จัดการอยู่แล้ว
  if (userType === 0) return <>{children}</>

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 py-24">
        <ShieldAlert className="h-12 w-12 text-red-400" />
        <p className="text-lg font-medium text-red-400">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        <p className="text-sm">บัญชีของคุณไม่ได้รับอนุญาตให้เข้าถึงเส้นทางนี้</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-2 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
        >
          กลับหน้าแดชบอร์ด
        </button>
      </div>
    )
  }

  return <>{children}</>
}
