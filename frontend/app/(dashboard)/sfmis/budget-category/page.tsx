'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiGet, apiPost } from '@/lib/api'

interface BudgetCategory {
  pbc_id: number
  bg_cate_id: number
  bg_cate_name: string
  budget_income: number
  _percents?: string
  up_by: string
  up_date: string
}

interface MasterCategory {
  bg_cate_id: number
  bg_cate_name: string
}

export default function BudgetCategoryPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCateId, setSelectedCateId] = useState('')
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)
  const [budgetYear, setBudgetYear] = useState('')
  const [totalBudget, setTotalBudget] = useState(0)
  const [hasEstimate, setHasEstimate] = useState(false)
  const [checkLoading, setCheckLoading] = useState(false)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.budget_date?.sy_id) setSyId(Number(years.budget_date.sy_id))
      else if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
      if (years?.budget_date?.budget_year) setBudgetYear(String(years.budget_date.budget_year))
    } catch {}
  }, [])

  // Check budget on year before loading categories
  useEffect(() => {
    if (scId > 0 && syId > 0 && budgetYear) {
      setCheckLoading(true)
      apiPost('Budget/checkBudgetCategoryOnYear', { sc_id: scId, sy_id: syId, budget_date: budgetYear })
        .then((res: any) => {
          if (res.valid) {
            setTotalBudget(Math.ceil(res.budget - 0))
            setHasEstimate(res.budget > 0)
          } else {
            setHasEstimate(false)
          }
        })
        .finally(() => setCheckLoading(false))
    }
  }, [scId, syId, budgetYear])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['budget-category', scId, syId, budgetYear],
    queryFn: async () => {
      const res = await apiGet<BudgetCategory[]>(`Budget/loadPLNBudgetCategory/${scId}/${syId}/${budgetYear}`)
      let budgetReceive = 0
      const items = res.map((el) => {
        budgetReceive += Number(el.budget_income)
        return {
          ...el,
          _percents: totalBudget > 0
            ? ((Number(el.budget_income) * 100) / totalBudget).toFixed(2)
            : '0.00',
        }
      })
      return items
    },
    enabled: scId > 0 && syId > 0 && budgetYear !== '' && hasEstimate,
  })

  const { data: masterCats } = useQuery({
    queryKey: ['master-budget-categories'],
    queryFn: () => apiGet<MasterCategory[]>('Budget/loadMasterBudgetCategories'),
    enabled: dialogOpen,
  })

  const addedCateIds = new Set((data ?? []).map((d) => d.bg_cate_id))
  const availableCats = (masterCats ?? []).filter((c) => !addedCateIds.has(c.bg_cate_id))

  const addMutation = useMutation({
    mutationFn: () => {
      const cat = availableCats.find((c) => String(c.bg_cate_id) === selectedCateId)
      if (!cat) throw new Error('No category selected')
      return apiPost('Budget/addPLNBudgetCategory', {
        pbc_id: cat.bg_cate_id,
        bit_group: [],
        up_by: 0,
      })
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('เพิ่มหมวดงบประมาณเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['budget-category'] })
        setDialogOpen(false)
        setSelectedCateId('')
      } else {
        toast.error(res.ms || 'มีปัญหาในการเพิ่ม')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data) ? data : []
  const totalReceive = rows.reduce((s, r) => s + Number(r.budget_income), 0)

  const columns = [
    { header: 'หมวดงบประมาณ', key: 'bg_cate_name' as keyof BudgetCategory },
    {
      header: 'งบที่ได้รับ (บาท)',
      render: (item: BudgetCategory) => (
        <span className="text-right block">{fmt(Number(item.budget_income))}</span>
      ),
    },
    {
      header: 'สัดส่วน (%)',
      render: (item: BudgetCategory) => (
        <span className="text-right block">{item._percents ?? '0.00'} %</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="หมวดงบประมาณ"
        actions={
          hasEstimate ? (
            <Button onClick={() => setDialogOpen(true)} disabled={isLoading}>
              <Plus className="h-4 w-4" />
              เพิ่มหมวดงบ
            </Button>
          ) : undefined
        }
      />
      <div className="p-4 space-y-4">
        {!hasEstimate && !checkLoading && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-4 text-sm text-yellow-800">
            ยังไม่มีข้อมูลประมาณการงบประมาณปีนี้ กรุณาไปตั้งค่าที่หน้า &quot;ประมาณการปีการศึกษา&quot; ก่อน
          </div>
        )}

        {hasEstimate && (
          <div className="grid grid-cols-3 gap-4 mb-2">
            <div className="bg-blue-50 rounded p-3 text-center">
              <div className="text-xs text-blue-600">งบประมาณทั้งหมด</div>
              <div className="font-bold text-blue-700">{fmt(totalBudget)} บาท</div>
            </div>
            <div className="bg-green-50 rounded p-3 text-center">
              <div className="text-xs text-green-600">งบที่กระจายแล้ว</div>
              <div className="font-bold text-green-700">{fmt(totalReceive)} บาท</div>
            </div>
            <div className="bg-orange-50 rounded p-3 text-center">
              <div className="text-xs text-orange-600">คงเหลือ</div>
              <div className="font-bold text-orange-700">{fmt(totalBudget - totalReceive)} บาท</div>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          data={rows}
          total={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading || checkLoading}
        />
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedCateId('') }}
        title="เพิ่มหมวดงบประมาณ"
        onSubmit={() => addMutation.mutate()}
        loading={addMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>เลือกหมวดงบประมาณ *</Label>
            <Select value={selectedCateId} onValueChange={setSelectedCateId}>
              <SelectTrigger><SelectValue placeholder="เลือกหมวดงบประมาณ" /></SelectTrigger>
              <SelectContent>
                {availableCats.length === 0 ? (
                  <SelectItem value="none" disabled>ไม่มีหมวดที่สามารถเพิ่มได้แล้ว</SelectItem>
                ) : (
                  availableCats.map((c) => (
                    <SelectItem key={c.bg_cate_id} value={String(c.bg_cate_id)}>
                      {c.bg_cate_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-gray-500">
            สามารถแก้ไขงบประมาณในแต่ละหมวดได้ภายหลังจากหน้ารายละเอียด
          </p>
        </div>
      </FormDialog>
    </div>
  )
}
