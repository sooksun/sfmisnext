'use client'
import { useEffect, useState } from 'react'
import { School, CalendarDays, User } from 'lucide-react'

interface UserData {
  name?: string
  sc_name?: string
}

interface YearInfo {
  sy_year?: number
  budget_year?: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [yearInfo, setYearInfo] = useState<YearInfo | null>(null)

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('data') || '{}')
      if (data?.name) setUser(data)
    } catch {
      // ignore
    }

    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date || years?.budget_date) {
        setYearInfo({
          sy_year: years?.sy_date?.sy_year,
          budget_year: years?.budget_date?.budget_year
            ? years.budget_date.budget_year + 543
            : undefined,
        })
      }
    } catch {
      // ignore
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome banner */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 p-6 text-white shadow">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          ยินดีต้อนรับสู่ระบบ SFMIS
        </h1>
        <p className="mt-1 text-indigo-100 text-sm md:text-base">
          ระบบบริหารจัดการการเงินโรงเรียน (School Finance Management Information System)
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* User card */}
        <div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 shrink-0">
            <User className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">ผู้ใช้งาน</p>
            <p className="font-semibold text-gray-900 truncate">
              {user?.name ?? '—'}
            </p>
          </div>
        </div>

        {/* School card */}
        <div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 shrink-0">
            <School className="h-5 w-5 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">โรงเรียน</p>
            <p className="font-semibold text-gray-900 truncate">
              {user?.sc_name ?? '—'}
            </p>
          </div>
        </div>

        {/* School year card */}
        <div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 shrink-0">
            <CalendarDays className="h-5 w-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">ปีการศึกษา / ปีงบประมาณ</p>
            <p className="font-semibold text-gray-900">
              {yearInfo?.sy_year ?? '—'}{' '}
              <span className="text-gray-400 font-normal">/</span>{' '}
              {yearInfo?.budget_year ?? '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
