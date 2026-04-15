'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { LogOut, User, ChevronDown, CalendarDays } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { YearData } from '@/lib/types'
import { toBE } from '@/lib/utils'

export function Topbar() {
  const { data: session } = useSession()
  const [yearData, setYearData] = useState<YearData | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const raw = localStorage.getItem('years')
    if (raw) {
      try {
        setYearData(JSON.parse(raw))
      } catch {}
    }
  }, [])

  // Derive yearInfo from yearData (client-only) to avoid hydration mismatch
  const yearInfo = mounted && yearData
    ? {
        sy_year: yearData.sy_date?.sy_year,
        budget_year: yearData.budget_date?.budget_year,
      }
    : null

  const user = session?.user as
    | {
        name?: string | null
        sc_name?: string
        type?: number
      }
    | undefined

  const roleLabel = (type?: number) => {
    switch (type) {
      case 1: return 'ผู้ดูแลระบบสูงสุด'
      case 2: return 'ผู้ดูแลโรงเรียน'
      case 3: return 'เจ้าหน้าที่แผน'
      case 4: return 'เจ้าหน้าที่พัสดุ'
      case 5: return 'เจ้าหน้าที่การเงิน'
      case 6: return 'หัวหน้าแผน'
      case 7: return 'หัวหน้าพัสดุ'
      case 8: return 'หัวหน้าการเงิน'
      default: return 'ผู้ใช้งาน'
    }
  }

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 shrink-0">
      {/* Left: Year info */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <CalendarDays className="h-4 w-4 text-indigo-600" />
        {yearInfo ? (
          <span>
            ปีการศึกษา <strong>{toBE(yearInfo.sy_year)}</strong>
            {' · '}
            ปีงบประมาณ <strong>{toBE(yearInfo.budget_year)}</strong>
          </span>
        ) : (
          <span className="text-gray-400">ยังไม่ได้เลือกปีการศึกษา</span>
        )}
      </div>

      {/* Right: User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100">
              <User className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">{user?.name ?? 'ผู้ใช้งาน'}</p>
              <p className="text-xs text-gray-500 mt-0.5">{roleLabel(user?.type)}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <p className="font-medium">{user?.name ?? 'ผู้ใช้งาน'}</p>
            {user?.sc_name && <p className="text-xs text-gray-500 font-normal mt-0.5">{user.sc_name}</p>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            onClick={() => signOut({ callbackUrl: '/sign-in' })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            ออกจากระบบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
