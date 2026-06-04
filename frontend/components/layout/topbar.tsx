'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { LogOut, User, ChevronDown, CalendarDays, Search, KeyRound } from 'lucide-react'
import { ChangePasswordDialog } from '@/components/auth/change-password-dialog'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toBE } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

export function Topbar() {
  const { data: session } = useSession()
  const router = useRouter()
  const { syYear, budgetYear: budgetYearRaw } = useAppContext()
  const [mounted, setMounted] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Derive yearInfo from hook (client-only) to avoid hydration mismatch
  const yearInfo = mounted && (syYear > 0 || budgetYearRaw > 0)
    ? {
        sy_year: syYear,
        budget_year: budgetYearRaw,
      }
    : null

  const user = session?.user as
    | {
        name?: string | null
        sc_name?: string
        type?: number
      }
    | undefined

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      router.push(`/sfmis/financial-report/unified-register?q=${encodeURIComponent(searchValue.trim())}`)
      setSearchValue('')
      searchRef.current?.blur()
    }
  }

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

      {/* Center: Global search (desktop only) */}
      <div className="hidden md:flex flex-1 justify-center px-4">
        <div className="relative w-64 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="ค้นหาเอกสาร... เช่น บค.1/2568"
            className="h-8 w-full rounded-md border border-gray-200 bg-gray-50 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
          />
        </div>
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
            className="cursor-pointer"
            onClick={() => setPasswordOpen(true)}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            เปลี่ยนรหัสผ่าน
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            onClick={() => signOut({ callbackUrl: '/sign-in' })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            ออกจากระบบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </header>
  )
}
