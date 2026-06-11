'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { apiGet, apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'

interface BudgetCategory {
  pbc_id: number
  bg_cate_id: number
  budget_cate: string
  budget_income: number
  percents: number
  total: number
  budget_year: string | number
}

interface MasterCategory {
  bg_cate_id: number
  bg_cate_name: string
}

interface IncomeType {
  bg_type_id: number
  budget_type: string
  estimated_amount: number   // ยอดประมาณการแยกตามประเภท (จากการคำนวณรายหัว หน้า 1.5)
}

interface BudgetDetail {
  pbcd_id: number
  bg_type_id: number
  budget_type: string
  budget: number
  budget_year: string
}

interface BitGroupItem {
  pbcd_id: number
  bg_type_id: number
  budget_type: string
  budget: number             // ที่กรอกในหมวดนี้
  other_allocated: number    // หมวดอื่นกรอกแล้ว
  estimated_amount: number   // ยอดประมาณการของประเภทนี้
}

interface TypeSummary {
  bg_type_id: number
  budget_type: string
  total_allocated: number
}

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

export default function BudgetCategoryPage() {
  const { scId, adminId, budgetYear: budgetYearRaw, syId: _syId, budgetSyId } = useAppContext()
  const syId = budgetSyId || _syId
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const qc = useQueryClient()

  // ── state: add dialog ──────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false)
  const [selectedCateId, setSelectedCateId] = useState('')

  // ── state: delete confirm ──────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<BudgetCategory | null>(null)

  // ── state: edit dialog ─────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<BudgetCategory | null>(null)
  const [bitGroup, setBitGroup] = useState<BitGroupItem[]>([])
  const [pendingDetails, setPendingDetails] = useState<BudgetDetail[]>([])
  const [typeSummary, setTypeSummary] = useState<TypeSummary[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  // ── state: estimate budget ─────────────────────────────────────────────────
  const [totalBudget, setTotalBudget] = useState(0)
  const [hasEstimate, setHasEstimate] = useState(false)
  const [checkLoading, setCheckLoading] = useState(false)

  // ── check estimate ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (scId > 0 && syId > 0 && apiYear) {
      setCheckLoading(true)
      apiPost('Budget/checkBudgetCategoryOnYear', { sc_id: scId, sy_id: syId, budget_date: apiYear })
        .then((res: any) => {
          if (res.valid) {
            // ใช้ยอดประมาณการจริง (ผลรวมเพดานต่อประเภท) — ไม่ปัดขึ้น
            // เพื่อให้ "งบทั้งหมด" = ผลรวมที่กรอกได้ → กรอกครบแล้วคงเหลือ = 0 พอดี
            setTotalBudget(res.budget)
            setHasEstimate(res.budget > 0)
          } else {
            setHasEstimate(false)
          }
        })
        .finally(() => setCheckLoading(false))
    }
  }, [scId, syId, apiYear])

  // ── load categories ────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['budget-category', scId, syId, apiYear],
    queryFn: () => apiGet<BudgetCategory[]>(`Budget/loadPLNBudgetCategory/${scId}/${syId}/${apiYear}`),
    enabled: scId > 0 && syId > 0 && !!apiYear && hasEstimate,
  })
  const rows = Array.isArray(data) ? data : []
  const totalReceive = rows.reduce((s, r) => s + Number(r.budget_income ?? r.total ?? 0), 0)

  // ── load master categories (for add dialog) ────────────────────────────────
  const { data: masterCats } = useQuery({
    queryKey: ['master-budget-categories'],
    queryFn: () => apiGet<MasterCategory[]>('Budget/loadMasterBudgetCategories'),
    enabled: addOpen,
  })

  // ── load income types (เฉพาะที่มียอดประมาณการ > 0 — ดึงสดจากการคำนวณรายหัว) ──
  const { data: incomeTypes } = useQuery({
    queryKey: ['estimated-income-by-type', scId, syId],
    queryFn: () =>
      apiGet<IncomeType[]>(`Budget/loadEstimatedIncomeByType/${scId}/${syId}`),
    enabled: editOpen && scId > 0 && syId > 0,
  })

  // ── open edit dialog → load existing details ──────────────────────────────
  async function openEdit(cat: BudgetCategory) {
    setEditTarget(cat)
    setBitGroup([])
    setPendingDetails([])
    setTypeSummary([])
    setLoadingDetails(true)
    setEditOpen(true)
    try {
      const [details, summary] = await Promise.all([
        apiGet<BudgetDetail[]>(`Budget/loadBudgetIncome/${cat.pbc_id}/${syId}`),
        apiGet<TypeSummary[]>(`Budget/loadBudgetIncomeTypeSummary/${scId}/${syId}/${apiYear}`),
      ])
      setPendingDetails(details ?? [])
      setTypeSummary(summary ?? [])
    } catch {
      setPendingDetails([])
      setTypeSummary([])
    } finally {
      setLoadingDetails(false)
    }
  }

  // merge incomeTypes + pendingDetails + typeSummary → bitGroup
  useEffect(() => {
    if (!editOpen || !incomeTypes) return
    const summaryMap = new Map(typeSummary.map((s) => [s.bg_type_id, s.total_allocated]))
    const rows = incomeTypes.map((it) => {
      const existing = pendingDetails.find((d) => d.bg_type_id === it.bg_type_id)
      const thisAmount = existing?.budget ?? 0
      const totalAllocated = summaryMap.get(it.bg_type_id) ?? 0
      return {
        pbcd_id: existing?.pbcd_id ?? 0,
        bg_type_id: it.bg_type_id,
        budget_type: it.budget_type,
        budget: thisAmount,
        other_allocated: totalAllocated - thisAmount,
        estimated_amount: it.estimated_amount,
      }
    })
    // เพิ่มประเภทที่ "เคยจัดสรรไว้" แต่ไม่มีในรายการรายหัวปัจจุบัน (estimated_amount=0)
    // เพื่อไม่ให้ยอดที่บันทึกไว้หายไปจาก dialog (แก้/ลบได้)
    const incomeIds = new Set(incomeTypes.map((it) => it.bg_type_id))
    for (const d of pendingDetails) {
      if (!incomeIds.has(d.bg_type_id) && (d.budget ?? 0) > 0) {
        const totalAllocated = summaryMap.get(d.bg_type_id) ?? 0
        rows.push({
          pbcd_id: d.pbcd_id ?? 0,
          bg_type_id: d.bg_type_id,
          budget_type: d.budget_type || `#${d.bg_type_id}`,
          budget: d.budget ?? 0,
          other_allocated: totalAllocated - (d.budget ?? 0),
          estimated_amount: 0,
        })
      }
    }
    setBitGroup(rows)
  }, [incomeTypes, pendingDetails, typeSummary, editOpen])

  function setBitAmount(bg_type_id: number, value: string) {
    setBitGroup((prev) =>
      prev.map((b) => b.bg_type_id === bg_type_id ? { ...b, budget: Number(value) || 0 } : b)
    )
  }

  const addedCateIds = new Set(rows.map((r) => r.bg_cate_id))
  const availableCats = (masterCats ?? []).filter((c) => !addedCateIds.has(c.bg_cate_id))

  // ── mutation: เพิ่มหมวดใหม่ ────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: () => {
      const cat = availableCats.find((c) => String(c.bg_cate_id) === selectedCateId)
      if (!cat) throw new Error('ยังไม่ได้เลือกหมวดงบประมาณ')
      return apiPost('Budget/addNewBudgetCategory', {
        sc_id: scId,
        sy_id: syId,
        bg_cate_id: cat.bg_cate_id,
        budget_year: apiYear,
        up_by: adminId,
      })
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('เพิ่มหมวดงบประมาณสำเร็จ')
        qc.invalidateQueries({ queryKey: ['budget-category'] })
        setAddOpen(false)
        setSelectedCateId('')
      } else {
        toast.error(res.ms || 'ไม่สามารถเพิ่มได้')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  // ── mutation: ลบหมวดงบ ─────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (pbcId: number) =>
      apiPost('Budget/removeBudgetCategory', { pbc_id: pbcId }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ลบหมวดงบประมาณเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['budget-category'] })
      } else {
        toast.error(res.ms || 'ไม่สามารถลบได้')
      }
      setDeleteTarget(null)
    },
    onError: () => {
      toast.error('เกิดข้อผิดพลาด')
      setDeleteTarget(null)
    },
  })

  // ── mutation: บันทึกยอดเงินในหมวด ─────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!editTarget) throw new Error('ไม่มีข้อมูลหมวดที่เลือก')
      // ส่งเฉพาะ type ที่มียอด > 0 หรือมี pbcd_id (กรณีต้องการอัปเดตเป็น 0)
      const bit_group = bitGroup
        .filter((b) => b.budget > 0 || b.pbcd_id > 0)
        .map((b) => ({
          pbcd_id: b.pbcd_id > 0 ? b.pbcd_id : undefined,
          bg_type_id: b.bg_type_id,
          budget: b.budget,
          budget_year: apiYear,
        }))
      return apiPost('Budget/addPLNBudgetCategory', {
        pbc_id: editTarget.pbc_id,
        bit_group,
        up_by: adminId,
      })
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกสำเร็จ')
        qc.invalidateQueries({ queryKey: ['budget-category'] })
        setEditOpen(false)
        setEditTarget(null)
      } else {
        toast.error(res.ms || 'ไม่สามารถบันทึกได้')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="หมวดงบประมาณ"
        actions={
          hasEstimate ? (
            <Button onClick={() => setAddOpen(true)} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-1" />
              เพิ่มหมวดงบ
            </Button>
          ) : undefined
        }
      />

      <div className="p-4 space-y-4">
        {/* คำเตือนถ้ายังไม่มีประมาณการ */}
        {!hasEstimate && !checkLoading && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-4 text-sm text-yellow-800">
            ยังไม่มียอดประมาณการงบประมาณปีนี้ — ยอดนี้คำนวณสดจากหน้า <strong>คำนวณงบจากรายหัว</strong>{' '}
            กรุณาตรวจสอบ <strong>ชั้นที่เปิดสอน</strong> · <strong>ประเภทเงินรายหัว</strong> และ{' '}
            <strong>อัตราเงินต่อหัว</strong> ให้ครบก่อน
          </div>
        )}

        {/* สรุปยอด — งบทั้งหมด = ยอดที่กระจายจริง (ปัดให้พอดี) → คงเหลือ 0 เสมอ
            (เพดานกรอกต่อหมวด/ประเภทยังคุมด้วยยอดประมาณการจริงไว้ในหน้ากรอก) */}
        {hasEstimate && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
              <div className="text-xs text-green-600 mb-1">งบประมาณทั้งหมด (กระจายแล้ว)</div>
              <div className="font-bold text-green-700 text-lg">{fmt(totalReceive)} บาท</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-100">
              <div className="text-xs text-orange-600 mb-1">คงเหลือ</div>
              <div className="font-bold text-orange-700 text-lg">{fmt(0)} บาท</div>
            </div>
          </div>
        )}

        {/* ตารางหมวดงบประมาณ */}
        {(isLoading || checkLoading) ? (
          <div className="text-center text-gray-400 py-12">กำลังโหลด...</div>
        ) : rows.length === 0 && hasEstimate ? (
          <div className="text-center text-gray-400 py-12">ยังไม่มีหมวดงบประมาณ กดปุ่ม &quot;เพิ่มหมวดงบ&quot; เพื่อเริ่มต้น</div>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">หมวดงบประมาณ</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">งบที่ได้รับ (บาท)</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">สัดส่วน (%)</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 w-24">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => {
                  const income = Number(row.budget_income ?? row.total ?? 0)
                  // สัดส่วน = เทียบกับยอดที่กระจายจริง (= งบทั้งหมด) → รวมเป็น 100% เป๊ะ
                  const pct = totalReceive > 0 ? ((income * 100) / totalReceive).toFixed(2) : '0.00'
                  return (
                    <tr key={row.pbc_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">{row.budget_cate}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(income)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{pct} %</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(row)}
                            className="h-7 px-2"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            กรอก
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteTarget(row)}
                            className="h-7 px-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            title="ลบหมวดงบประมาณ"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200 font-semibold">
                <tr>
                  <td className="px-4 py-3">รวมทั้งหมด</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(totalReceive)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {totalReceive > 0 ? '100.00' : '0.00'} %
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Dialog: เพิ่มหมวดงบใหม่ ─────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={(v) => { if (!v) { setAddOpen(false); setSelectedCateId('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มหมวดงบประมาณ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>เลือกหมวดงบประมาณ *</Label>
              <Select value={selectedCateId} onValueChange={setSelectedCateId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="เลือกหมวดงบประมาณ" />
                </SelectTrigger>
                <SelectContent>
                  {availableCats.length === 0 ? (
                    <SelectItem value="__none__" disabled>ไม่มีหมวดที่สามารถเพิ่มได้แล้ว</SelectItem>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setSelectedCateId('') }}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!selectedCateId || addMutation.isPending}
            >
              {addMutation.isPending ? 'กำลังบันทึก...' : 'เพิ่มหมวดงบ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: กรอกยอดเงินต่อประเภทรายรับ ──────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={(v) => { if (!v) { setEditOpen(false); setEditTarget(null) } }}>
        <DialogContent className="!max-w-[1024px] w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              กำหนดงบประมาณ
              {editTarget && <span className="ml-2 text-indigo-600">— {editTarget.budget_cate}</span>}
            </DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <div className="text-center text-gray-400 py-8">กำลังโหลดข้อมูล...</div>
          ) : !incomeTypes || incomeTypes.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              ยังไม่มีประเภทรายรับที่มียอดประมาณการ
              <br />
              <span className="text-xs">กรุณากำหนดยอดประมาณการในหน้า "งบประมาณที่ได้รับจริง" ก่อน</span>
            </div>
          ) : (() => {
            // ── คำนวณค่าหลัก ─────────────────────────────────────────
            const overallRemaining = Math.max(0, totalBudget - totalReceive)
            const currentSaved = Number(editTarget?.budget_income ?? editTarget?.total ?? 0)
            // วงเงินที่หมวดนี้ใช้ได้ = ที่ยังเหลือทั้งหมด + ที่หมวดนี้เคยจองไว้แล้ว
            const categoryAvailable = Math.max(0, overallRemaining + currentSaved)
            const currentTotal = bitGroup.reduce((s, b) => s + b.budget, 0)
            const dynamicRemaining = categoryAvailable - currentTotal
            const overBudget = dynamicRemaining < 0
            // แสดงประเภทที่มียอดประมาณการ > 0 หรือมียอดที่จัดสรรไว้แล้ว (> 0)
            // กันยอดที่บันทึกไว้ในประเภทที่ไม่มีประมาณการแล้ว หายไปจากตาราง
            const visibleRows = bitGroup.filter(
              (b) => b.estimated_amount > 0 || b.budget > 0,
            )
            const hiddenCount = bitGroup.length - visibleRows.length

            return (
              <div className="space-y-3">
                {/* ── Header summary — ตัวเลขชัด ตรงประเด็น ─────────────── */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-blue-50 border border-blue-100 rounded p-2 text-center">
                    <div className="text-blue-600">วงเงินหมวดนี้ใช้ได้</div>
                    <div className="font-bold text-blue-700 text-sm">{fmt(categoryAvailable)} บาท</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 rounded p-2 text-center">
                    <div className="text-indigo-600">กรอกแล้ว</div>
                    <div className="font-bold text-indigo-700 text-sm">{fmt(currentTotal)} บาท</div>
                  </div>
                  <div className={`border rounded p-2 text-center ${overBudget ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-100'}`}>
                    <div className={overBudget ? 'text-red-600' : 'text-green-600'}>
                      {overBudget ? 'เกินวงเงิน' : 'เหลือกรอก'}
                    </div>
                    <div className={`font-bold text-sm ${overBudget ? 'text-red-700' : 'text-green-700'}`}>
                      {fmt(Math.abs(dynamicRemaining))} บาท
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  กรอกยอดเงินตามประเภทรายรับ ยอดรวมต้องไม่เกินวงเงินหมวดนี้ ({fmt(categoryAvailable)} บาท)
                </p>

                {/* ── ตารางกรอกยอด ─────────────────────────────────────── */}
                <div className="rounded-md border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-600">ประเภทรายรับ</th>
                        <th className="text-right px-3 py-2 text-gray-600 w-32">ยอดประมาณการ</th>
                        <th className="text-right px-3 py-2 text-gray-600 w-32">คงเหลือกรอกได้</th>
                        <th className="text-right px-3 py-2 text-gray-600 w-40">จำนวนเงิน (บาท)</th>
                        <th className="text-right px-3 py-2 text-gray-600 w-20">สัดส่วน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {visibleRows.map((b) => {
                        // คงเหลือต่อประเภท = ยอดประมาณการ - หมวดอื่นจองแล้ว
                        const rowAvailable = Math.max(0, b.estimated_amount - b.other_allocated)
                        const rowOver = b.budget > rowAvailable
                        // สัดส่วน = เทียบกับยอดที่กระจายจริง (ตัวหารเดียวกับตารางหลัก) ให้ % ตรงกันทุกที่
                        const pct = totalReceive > 0 ? (b.budget * 100 / totalReceive) : 0
                        return (
                          <tr key={b.bg_type_id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{b.budget_type}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                              {fmt(b.estimated_amount)}
                            </td>
                            <td className={`px-3 py-2 text-right tabular-nums ${rowOver ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                              {fmt(rowAvailable)}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min={0}
                                max={rowAvailable}
                                value={b.budget || ''}
                                onChange={(e) => setBitAmount(b.bg_type_id, e.target.value)}
                                className={`h-7 text-right tabular-nums text-sm ${rowOver || overBudget ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                                placeholder="0"
                                title={rowOver ? `เกินยอดประมาณการที่กรอกได้ (${fmt(rowAvailable)} บาท)` : ''}
                              />
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                              {pct > 0 ? `${pct.toFixed(2)}%` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                      {visibleRows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                            ยังไม่มีประเภทรายรับที่มีงบประมาณการในปีนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t font-semibold text-sm">
                      <tr>
                        <td className="px-3 py-2" colSpan={3}>
                          รวม
                          {hiddenCount > 0 && (
                            <span className="ml-2 text-xs font-normal text-gray-400">
                              (ซ่อน {hiddenCount} ประเภทที่ยอดประมาณการ = 0)
                            </span>
                          )}
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums ${overBudget ? 'text-red-600' : 'text-indigo-700'}`}>
                          {fmt(currentTotal)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                          {totalReceive > 0 ? `${(currentTotal * 100 / totalReceive).toFixed(2)}%` : '—'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )
          })()}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditTarget(null) }}>
              ยกเลิก
            </Button>
            {(() => {
              const avail = Math.max(0,
                (totalBudget - totalReceive) + Number(editTarget?.budget_income ?? editTarget?.total ?? 0)
              )
              const total = bitGroup.reduce((s, b) => s + b.budget, 0)
              const overCategory = total > avail
              // ตรวจว่ามีแถวใดกรอกเกินยอดประมาณการของประเภทนั้นหรือไม่
              const overRow = bitGroup.some((b) => b.budget > Math.max(0, b.estimated_amount - b.other_allocated))
              const disabled = saveMutation.isPending || loadingDetails || overCategory || overRow
              return (
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={disabled}
                  title={
                    overRow ? 'มีแถวที่กรอกเกินยอดประมาณการของประเภทรายรับ' :
                    overCategory ? 'ยอดรวมเกินวงเงินหมวดนี้' : ''
                  }
                >
                  {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              )
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm: ลบหมวดงบประมาณ ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="ลบหมวดงบประมาณ"
        description={
          deleteTarget
            ? `ต้องการลบหมวด "${deleteTarget.budget_cate}" และยอดเงินที่กรอกไว้ทั้งหมดในหมวดนี้หรือไม่? การลบไม่สามารถย้อนกลับได้`
            : ''
        }
        confirmLabel="ลบ"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.pbc_id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
