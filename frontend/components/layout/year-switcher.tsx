'use client'
import { useEffect, useState } from 'react'
import { CalendarDays, Check, ChevronDown, History, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiGet, apiPost } from '@/lib/api'
import { toBE } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'
import { useUserStore } from '@/stores/user-store'
import type { YearData } from '@/lib/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface YearOption {
  sy_id: number
  sy_year: number
  semester: number
  budget_year: number
}

interface ChangeYearResponse {
  flag: boolean
  ms?: string
  sy_date?: YearData['sy_date']
  budget_date?: YearData['budget_date']
}

/**
 * ตัวสลับปีการศึกษา/ปีงบประมาณบน topbar
 * เลือกปีย้อนหลังได้สำหรับงานตรวจสอบ — แสดงป้าย "ข้อมูลย้อนหลัง" เมื่อไม่ใช่ปีล่าสุด
 */
export function YearSwitcher() {
  const { scId, syId, syYear, budgetYear } = useAppContext()
  const setYearData = useUserStore((s) => s.setYearData)
  const [mounted, setMounted] = useState(false)
  const [years, setYears] = useState<YearOption[]>([])
  const [changing, setChanging] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !scId) return
    apiGet<YearOption[]>(`school_year/loadScoolYearByYear/${scId}`)
      .then((list) => setYears(Array.isArray(list) ? list : []))
      .catch(() => {
        // โหลดรายการปีไม่ได้ — แสดงปีปัจจุบันแบบ read-only ไปก่อน
      })
  }, [mounted, scId])

  // Derive from hook client-side only — กัน hydration mismatch
  const hasYear = mounted && (syYear > 0 || budgetYear > 0)
  const latestSyId = years[0]?.sy_id ?? 0
  const isPastYear = hasYear && latestSyId > 0 && syId !== latestSyId

  const handleSelect = async (y: YearOption) => {
    if (y.sy_id === syId || changing) return
    setChanging(true)
    try {
      const res = await apiPost<ChangeYearResponse>('school_year/change_year', {
        sy_id: y.sy_id,
        sc_id: scId,
      })
      if (res.flag && res.sy_date) {
        const yd: YearData = {
          sy_date: res.sy_date,
          budget_date: res.budget_date ?? (res.sy_date as unknown as YearData['budget_date']),
        }
        setYearData(yd)
        // backward compat: component ที่ยังอ่าน localStorage.years โดยตรง
        try {
          localStorage.setItem('years', JSON.stringify(yd))
        } catch {
          /* ignore */
        }
        toast.success(`เปลี่ยนเป็นปีการศึกษา ${toBE(y.sy_year)} แล้ว`)
        // reload ทั้งหน้า — หลายหน้า cache ข้อมูลใน state จึงต้อง refetch ด้วยปีใหม่ทั้งหมด
        setTimeout(() => window.location.reload(), 400)
      } else {
        toast.error(res.ms || 'เปลี่ยนปีไม่สำเร็จ')
        setChanging(false)
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนปี')
      setChanging(false)
    }
  }

  if (!hasYear) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <CalendarDays className="h-4 w-4 text-indigo-600" />
        <span>ยังไม่ได้เลือกปีการศึกษา</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={changing}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-60"
          >
            {changing ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            ) : (
              <CalendarDays className="h-4 w-4 text-indigo-600" />
            )}
            <span>
              ปีการศึกษา <strong>{toBE(syYear)}</strong>
              {' · '}
              ปีงบประมาณ <strong>{toBE(budgetYear)}</strong>
            </span>
            {years.length > 0 && <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
        </DropdownMenuTrigger>
        {years.length > 0 && (
          <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
            <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
              เลือกปีเพื่อดูข้อมูล (ย้อนหลังได้สำหรับงานตรวจสอบ)
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {years.map((y) => (
              <DropdownMenuItem
                key={y.sy_id}
                className="cursor-pointer"
                onClick={() => handleSelect(y)}
              >
                <span className="flex-1">
                  ปีการศึกษา {toBE(y.sy_year)}
                  <span className="text-xs text-gray-500"> · งบประมาณ {toBE(y.budget_year)}</span>
                </span>
                {y.sy_id === syId && <Check className="h-4 w-4 text-indigo-600" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        )}
      </DropdownMenu>
      {isPastYear && (
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          <History className="h-3 w-3" />
          ข้อมูลย้อนหลัง
        </span>
      )}
    </div>
  )
}
