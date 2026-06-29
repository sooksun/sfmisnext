'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, FileJson, Calendar, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { apiGet } from '@/lib/api'
import { getAccessToken } from '@/lib/auth-token'
import { useAppContext } from '@/hooks/use-app-context'

interface YearRow {
  sy_id: number
  school_year: number
}

interface BackupMeta {
  sc_id: number
  budget_year: number | null
  exported_at: string
  row_counts: Record<string, number>
  total_rows: number
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/'

export default function BackupPage() {
  const { scId } = useAppContext()
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [lastMeta, setLastMeta] = useState<BackupMeta | null>(null)

  const { data: years } = useQuery({
    queryKey: ['backup-years', scId],
    queryFn: () => apiGet<YearRow[]>('SchoolBackup/years'),
    enabled: scId > 0,
  })

  const yearList = Array.isArray(years) ? years : []

  const handleDownload = async () => {
    setLoading(true)
    try {
      const token = getAccessToken()
      const yearParam =
        selectedYear !== 'all' ? `?budget_year=${selectedYear}` : ''
      const url = `${BASE_URL}SchoolBackup/export${yearParam}`

      const res = await fetch(url, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.message || `HTTP ${res.status}`)
      }

      // อ่าน JSON แล้วสร้าง blob เพื่อดาวน์โหลด
      const payload = await res.json()
      setLastMeta((payload as { meta: BackupMeta }).meta)

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const cd = res.headers.get('Content-Disposition') ?? ''
      const fnMatch = cd.match(/filename="([^"]+)"/)
      const yearLabel = selectedYear !== 'all' ? `_${selectedYear}` : '_all'
      const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      a.download = fnMatch?.[1] ?? `backup_sc${scId}${yearLabel}_${ts}.json`
      a.href = objUrl
      a.click()
      URL.revokeObjectURL(objUrl)
      toast.success('ดาวน์โหลดไฟล์สำรองข้อมูลเรียบร้อยแล้ว')
    } catch (err: any) {
      toast.error(err?.message || 'เกิดข้อผิดพลาดในการสำรองข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const topTables = lastMeta
    ? Object.entries(lastMeta.row_counts)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    : []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="สำรองข้อมูล"
        subtitle="Export ข้อมูลโรงเรียนเป็นไฟล์ JSON สำหรับเก็บสำรองหรือส่งให้ผู้ดูแลระบบ"
      />

      {/* การ์ดตั้งค่า */}
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-base font-semibold text-gray-800">
          <FileJson className="h-5 w-5 text-blue-500" />
          ตั้งค่าการสำรองข้อมูล
        </div>

        {/* เลือกปีงบประมาณ */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-gray-400" />
            ปีงบประมาณ
          </Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกปี (ทั้งหมด)</SelectItem>
              {yearList.map((y) => (
                <SelectItem key={y.sy_id} value={String(y.school_year)}>
                  ปีงบประมาณ {y.school_year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400">
            เลือก "ทุกปี" เพื่อ export ข้อมูลทุกปีงบประมาณ รวมถึงค่าตั้งค่าและผู้ใช้
          </p>
        </div>

        {/* รายการที่จะ export */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-1">
          <p className="font-medium">ไฟล์สำรองประกอบด้วย:</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li>ข้อมูลธุรกรรมการเงิน (รับ/จ่าย/ธนาคาร)</li>
            <li>ข้อมูลพัสดุและการจัดซื้อจัดจ้าง</li>
            <li>ค่าตั้งค่าโรงเรียน (ประเภทเงิน, ห้องเรียน, ฯลฯ)</li>
            <li>บัญชีผู้ใช้และ audit log</li>
          </ul>
        </div>

        <Button
          onClick={handleDownload}
          disabled={loading || scId === 0}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          <Download className="h-4 w-4 mr-2" />
          {loading ? 'กำลังเตรียมไฟล์…' : 'ดาวน์โหลดไฟล์สำรองข้อมูล (.json)'}
        </Button>
      </div>

      {/* ผลลัพธ์การสำรองล่าสุด */}
      {lastMeta && (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-base font-semibold text-gray-800">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            ผลการสำรองข้อมูลล่าสุด
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-2xl font-bold text-blue-600">
                {lastMeta.total_rows.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">แถวทั้งหมด</p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-2xl font-bold text-blue-600">
                {Object.values(lastMeta.row_counts).filter((n) => n > 0).length}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">ตารางที่มีข้อมูล</p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-2xl font-bold text-blue-600">
                {lastMeta.budget_year ?? 'ทุกปี'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">ปีงบประมาณ</p>
            </div>
          </div>

          {topTables.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                ตาราง 10 อันดับแรก (จำนวนแถว)
              </p>
              <div className="space-y-1">
                {topTables.map(([tbl, n]) => (
                  <div
                    key={tbl}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-mono text-gray-600 text-xs">{tbl}</span>
                    <span className="text-gray-800 font-medium">
                      {n.toLocaleString()} แถว
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400">
            Export เมื่อ: {new Date(lastMeta.exported_at).toLocaleString('th-TH')}
          </p>
        </div>
      )}
    </div>
  )
}
