'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Megaphone, List, Printer, BarChart2 } from 'lucide-react'
import { openPrintWindow, makeHeader, makeTable, makeSignatures, fmtBaht, esc } from '@/lib/print-utils'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ProcessFlow } from '@/components/shared/process-flow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import { fmtDateTH } from '@/lib/utils'

interface PlanRow {
  ppId: number
  ppNo: string | null
  ppTitle: string | null
  ppTotalBudget: number
  ppStatus: number
  announceDate: string | null
  announceUrl: string | null
  acadYear: number
  remark: string | null
}
interface ItemRow {
  ppiId: number
  ppId: number
  itemTitle: string | null
  itemBudget: number
  buyMonth: number | null
  methodType: number
  remark: string | null
}

const STATUS: Record<number, { text: string; color: string }> = {
  0: { text: 'ร่าง', color: 'text-gray-600' },
  1: { text: 'ประกาศแล้ว', color: 'text-green-600' },
  2: { text: 'ปรับปรุง', color: 'text-yellow-600' },
  9: { text: 'ยกเลิก', color: 'text-red-500' },
}
const METHOD: Record<number, string> = {
  1: 'e-bidding',
  2: 'คัดเลือก',
  3: 'เฉพาะเจาะจง',
  4: 'ตลาด',
}

const planSchema = z.object({
  pp_no: z.string().optional(),
  pp_title: z.string().min(1, 'กรอกชื่อแผน'),
  pp_total_budget: z.number().min(0),
  remark: z.string().optional(),
})
type PlanForm = z.infer<typeof planSchema>

const itemSchema = z.object({
  item_title: z.string().min(1, 'กรอกชื่อรายการ'),
  item_budget: z.number().min(0),
  buy_month: z.number().int().min(1).max(12).optional(),
  method_type: z.number().int().min(1).max(4),
  remark: z.string().optional(),
})
type ItemForm = z.infer<typeof itemSchema>

const fmt = (n: number) =>
  Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

export default function ProcurementPlanPage() {
  const { scId, adminId, budgetYear } = useAppContext()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PlanRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlanRow | null>(null)
  const [announcing, setAnnouncing] = useState<PlanRow | null>(null)
  const [announceDate, setAnnounceDate] = useState('')
  const [announceUrl, setAnnounceUrl] = useState('')

  const [selectedPlan, setSelectedPlan] = useState<PlanRow | null>(null)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemRow | null>(null)
  const [deleteItemTarget, setDeleteItemTarget] = useState<ItemRow | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

  const { data: resp, isLoading } = useQuery({
    queryKey: ['procurement-plan', scId, budgetYear],
    queryFn: () =>
      apiGet<{ data: PlanRow[] }>(`Procurement_plan/loadPlan/${scId}/${budgetYear}`),
    enabled: scId > 0 && budgetYear > 0,
  })
  const plans = resp?.data ?? []

  const { data: detailResp } = useQuery({
    queryKey: ['procurement-plan-detail', selectedPlan?.ppId],
    queryFn: () =>
      apiGet<{ data: { plan: PlanRow; items: ItemRow[] } }>(
        `Procurement_plan/loadPlanDetail/${selectedPlan!.ppId}`,
      ),
    enabled: !!selectedPlan?.ppId,
  })
  const items = detailResp?.data?.items ?? []

  // โครงการที่ผ่านการอนุมัติแล้ว (สถานะ ≥ 5 = ผอ.อนุมัติ) — เลือกมาเติมในแผนจัดซื้อ
  interface ApprovedOrder {
    order_id: number
    details: string
    budgets: number
    order_status: number
    ppi_id: number | null
  }
  const { data: approvedResp } = useQuery({
    queryKey: ['approved-orders', scId, budgetYear],
    queryFn: () =>
      apiGet<{ data: ApprovedOrder[] }>(
        `Project_approve/loadProjectApprove/${scId}/${budgetYear}/0/200`,
      ),
    enabled: scId > 0 && budgetYear > 0,
  })
  // โครงการที่อยู่ใน workflow และยังไม่ผูกแผน — ใช้สำหรับเลือกมาทำแผนจัดซื้อ
  // (พ.ร.บ. ม.11 กำหนดให้ประกาศแผนก่อนหัวหน้าพัสดุอนุมัติ จึงรับตั้งแต่สถานะ 1)
  const approvedOrders = (approvedResp?.data ?? []).filter(
    (o) => o.order_status >= 1 && o.order_status < 9 && !o.ppi_id,
  )

  const {
    register, handleSubmit, reset, setValue, formState: { errors },
  } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: { pp_no: '', pp_title: '', pp_total_budget: 0, remark: '' },
  })

  const itemForm = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: { item_title: '', item_budget: 0, method_type: 3 },
  })

  const savePlan = useMutation({
    mutationFn: (form: PlanForm) => {
      const payload = { ...form, sc_id: scId, acad_year: budgetYear, up_by: adminId }
      return editing
        ? apiPost('Procurement_plan/updatePlan', { ...payload, pp_id: editing.ppId })
        : apiPost('Procurement_plan/addPlan', {
            ...payload,
            order_id: selectedOrderId ?? undefined,
          })
    },
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['procurement-plan'] })
        qc.invalidateQueries({ queryKey: ['approved-orders'] })
        qc.invalidateQueries({ queryKey: ['proj-approve'] })
        setDialogOpen(false); reset(); setSelectedOrderId(null)
      } else toast.error(res?.ms || 'มีปัญหา')
    },
    onError: (e: any) => toast.error(e?.message || 'เกิดข้อผิดพลาด'),
  })

  const removePlan = useMutation({
    mutationFn: (p: PlanRow) => apiPost('Procurement_plan/removePlan', { pp_id: p.ppId }),
    onSuccess: (res: any) => {
      if (res?.flag) { toast.success('ลบแล้ว'); qc.invalidateQueries({ queryKey: ['procurement-plan'] }) }
      else toast.error(res?.ms)
      setDeleteTarget(null)
    },
    onError: (e: any) => toast.error(e?.message),
  })

  const announcePlan = useMutation({
    mutationFn: () =>
      apiPost('Procurement_plan/announcePlan', {
        pp_id: announcing!.ppId,
        announce_date: announceDate || undefined,
        announce_url: announceUrl || undefined,
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('ประกาศแผนแล้ว')
        qc.invalidateQueries({ queryKey: ['procurement-plan'] })
        setAnnouncing(null); setAnnounceDate(''); setAnnounceUrl('')
      } else toast.error(res?.ms)
    },
    onError: (e: any) => toast.error(e?.message),
  })

  const saveItem = useMutation({
    mutationFn: (form: ItemForm) => {
      const payload = { ...form, pp_id: selectedPlan!.ppId, up_by: adminId }
      return editingItem
        ? apiPost('Procurement_plan/updatePlanItem', { ...payload, ppi_id: editingItem.ppiId })
        : apiPost('Procurement_plan/addPlanItem', payload)
    },
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('บันทึกรายการแล้ว')
        qc.invalidateQueries({ queryKey: ['procurement-plan-detail'] })
        setItemDialogOpen(false); itemForm.reset()
      } else toast.error(res?.ms)
    },
    onError: (e: any) => toast.error(e?.message),
  })

  const removeItem = useMutation({
    mutationFn: (it: ItemRow) => apiPost('Procurement_plan/removePlanItem', { ppi_id: it.ppiId }),
    onSuccess: (res: any) => {
      if (res?.flag) { toast.success('ลบรายการแล้ว'); qc.invalidateQueries({ queryKey: ['procurement-plan-detail'] }) }
      else toast.error(res?.ms)
      setDeleteItemTarget(null)
    },
    onError: (e: any) => toast.error(e?.message),
  })

  function openAdd() {
    setEditing(null)
    setSelectedOrderId(null)
    reset({ pp_no: '', pp_title: '', pp_total_budget: 0, remark: '' })
    setDialogOpen(true)
  }

  function printPlan(p: PlanRow, items: ItemRow[]) {
    const rows = items.map((it, i) => [
      i + 1,
      it.itemTitle ?? '-',
      it.buyMonth ? `เดือนที่ ${it.buyMonth}` : '-',
      METHOD[it.methodType] ?? '-',
      fmtBaht(it.itemBudget),
    ])
    const sum = items.reduce((a, b) => a + Number(b.itemBudget || 0), 0)
    rows.push(['', 'รวม', '', '', fmtBaht(sum)])
    const header = makeHeader({
      title: 'ประกาศเผยแพร่แผนการจัดซื้อจัดจ้าง ประจำปีงบประมาณ ' + (p.acadYear ?? ''),
      subtitle: '(ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 มาตรา 11)',
      docNo: p.ppNo ?? undefined,
      docDate: p.announceDate ?? undefined,
    })
    const info = `
<p>ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 มาตรา 11
ให้หน่วยงานของรัฐจัดทำแผนการจัดซื้อจัดจ้างประจำปี และประกาศเผยแพร่ในระบบเครือข่ายสารสนเทศ
ของกรมบัญชีกลางและของหน่วยงานของรัฐ</p>
<p><b>ชื่อแผน:</b> ${esc(p.ppTitle ?? '-')}</p>
<p><b>วงเงินรวม:</b> ${fmtBaht(p.ppTotalBudget)} บาท</p>
`
    const table = makeTable(
      ['ลำดับ', 'รายการ', 'ช่วงเวลาคาดการณ์', 'วิธีจัดซื้อ', 'วงเงิน (บาท)'],
      rows,
      { numCols: [0, 4] },
    )
    openPrintWindow({
      title: `ประกาศแผนจัดซื้อจัดจ้าง_${p.ppNo || p.ppId}`,
      body: header + info + table + makeSignatures(['ผู้จัดทำ', 'หัวหน้าเจ้าหน้าที่พัสดุ', 'ผู้อำนวยการสถานศึกษา']),
    })
  }
  function openEdit(p: PlanRow) {
    setEditing(p)
    reset({
      pp_no: p.ppNo ?? '',
      pp_title: p.ppTitle ?? '',
      pp_total_budget: Number(p.ppTotalBudget),
      remark: p.remark ?? '',
    })
    setDialogOpen(true)
  }
  function openAddItem() {
    setEditingItem(null)
    itemForm.reset({ item_title: '', item_budget: 0, method_type: 3 })
    setItemDialogOpen(true)
  }
  function openEditItem(it: ItemRow) {
    setEditingItem(it)
    itemForm.reset({
      item_title: it.itemTitle ?? '',
      item_budget: Number(it.itemBudget),
      buy_month: it.buyMonth ?? undefined,
      method_type: it.methodType,
      remark: it.remark ?? '',
    })
    setItemDialogOpen(true)
  }

  const columns = useMemo(() => [
    {
      header: 'จัดการ',
      render: (p: PlanRow) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setSelectedPlan(p)} title="รายการ">
            <List className="h-3 w-3" />
          </Button>
          {p.ppStatus === 1 && (
            <Button size="sm" variant="outline" onClick={async () => {
              const res: any = await apiGet(`Procurement_plan/loadPlanDetail/${p.ppId}`)
              printPlan(p, res?.data?.items ?? [])
            }} title="พิมพ์ประกาศ">
              <Printer className="h-3 w-3" />
            </Button>
          )}
          {p.ppStatus === 0 && (
            <>
              <Button size="sm" variant="warning" onClick={() => openEdit(p)} title="แก้ไข">
                <Pencil className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(p)} title="ลบ">
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button size="sm" onClick={() => setAnnouncing(p)} title="ประกาศ">
                <Megaphone className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ),
      headerClassName: 'w-44',
    },
    { header: 'เลขที่แผน', render: (p: PlanRow) => p.ppNo || '-' },
    { header: 'ชื่อแผน', render: (p: PlanRow) => p.ppTitle },
    { header: 'วงเงิน', render: (p: PlanRow) => <span className="font-mono">{fmt(p.ppTotalBudget)}</span> },
    {
      header: 'สถานะ',
      render: (p: PlanRow) => {
        const s = STATUS[p.ppStatus] ?? STATUS[0]
        return <span className={s.color}>{s.text}</span>
      },
    },
    { header: 'วันประกาศ', render: (p: PlanRow) => fmtDateTH(p.announceDate) },
  ], [])

  const itemColumns = useMemo(() => [
    {
      header: 'จัดการ',
      render: (it: ItemRow) => (
        selectedPlan?.ppStatus === 0 ? (
          <div className="flex gap-1">
            <Button size="sm" variant="warning" onClick={() => openEditItem(it)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setDeleteItemTarget(it)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ) : <span className="text-xs text-gray-400">ล็อก</span>
      ),
      headerClassName: 'w-28',
    },
    { header: 'รายการ', render: (it: ItemRow) => it.itemTitle },
    { header: 'วงเงิน', render: (it: ItemRow) => <span className="font-mono">{fmt(it.itemBudget)}</span> },
    { header: 'เดือน', render: (it: ItemRow) => it.buyMonth || '-' },
    { header: 'วิธีจัดซื้อ', render: (it: ItemRow) => METHOD[it.methodType] ?? '-' },
    { header: 'หมายเหตุ', render: (it: ItemRow) => it.remark || '-' },
  ], [selectedPlan])

  const itemSum = items.reduce((a, b) => a + Number(b.itemBudget || 0), 0)

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['procurement-progress', scId, budgetYear],
    queryFn: () => apiGet<any>(`Procurement_plan/progress/${scId}/${budgetYear}`),
    enabled: showProgress && scId > 0 && budgetYear > 0,
  })

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title={`แผนการจัดซื้อจัดจ้างประจำปี ${budgetYear || '-'}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowProgress(!showProgress)}>
              <BarChart2 className="h-4 w-4 mr-1" />
              {showProgress ? 'ซ่อนรายงาน' : 'รายงานเทียบแผน-ผล'}
            </Button>
            <Button onClick={openAdd} disabled={scId === 0}>
              <Plus className="h-4 w-4" />เพิ่มแผน
            </Button>
          </div>
        }
      />
      <ProcessFlow flow="plan" />
      <div className="p-4 space-y-4">
        <DataTable
          columns={columns}
          data={plans}
          total={plans.length}
          page={0}
          pageSize={plans.length || 25}
          onPageChange={() => {}}
          loading={isLoading}
        />

        {selectedPlan && (
          <div className="border rounded-md p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">
                  รายการในแผน: {selectedPlan.ppTitle}
                </h3>
                <p className="text-xs text-gray-500">
                  วงเงินแผน {fmt(selectedPlan.ppTotalBudget)} • รวมรายการ {fmt(itemSum)} •
                  คงเหลือ {fmt(Number(selectedPlan.ppTotalBudget) - itemSum)}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedPlan.ppStatus === 0 && (
                  <Button size="sm" onClick={openAddItem}>
                    <Plus className="h-3 w-3" /> เพิ่มรายการ
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setSelectedPlan(null)}>ปิด</Button>
              </div>
            </div>
            <DataTable
              columns={itemColumns}
              data={items}
              total={items.length}
              page={0}
              pageSize={items.length || 25}
              onPageChange={() => {}}
              loading={false}
            />
          </div>
        )}
        {showProgress && (
          <div className="border rounded-md p-4 bg-gray-50">
            <h3 className="text-sm font-semibold mb-3">รายงานเทียบแผน-ผลการจัดซื้อจัดจ้าง ปี {budgetYear}</h3>
            {progressLoading ? (
              <div className="text-sm text-gray-500 py-4 text-center">กำลังโหลด...</div>
            ) : progressData?.data?.length === 0 ? (
              <div className="text-sm text-gray-400 py-4 text-center">ไม่มีข้อมูลแผน</div>
            ) : (
              <div className="space-y-4">
                {/* Grand summary */}
                {progressData?.summary && (
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="rounded border bg-white p-2">
                      <div className="text-xs text-gray-500">วงเงินรวมตามแผน</div>
                      <div className="font-mono font-semibold text-sm">{fmt(progressData.summary.grand_plan)}</div>
                    </div>
                    <div className="rounded border bg-white p-2">
                      <div className="text-xs text-gray-500">วงเงินจัดซื้อจริง</div>
                      <div className="font-mono font-semibold text-sm text-blue-700">{fmt(progressData.summary.grand_actual)}</div>
                    </div>
                    <div className="rounded border bg-white p-2">
                      <div className="text-xs text-gray-500">ส่วนต่าง</div>
                      <div className={`font-mono font-semibold text-sm ${progressData.summary.grand_variance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {fmt(progressData.summary.grand_variance)}
                      </div>
                    </div>
                    <div className="rounded border bg-white p-2">
                      <div className="text-xs text-gray-500">รายการสำเร็จ</div>
                      <div className="font-semibold text-sm text-emerald-700">
                        {progressData.summary.completed_items}/{progressData.summary.total_items}
                      </div>
                    </div>
                  </div>
                )}

                {/* Per-plan breakdown */}
                {(progressData?.data ?? []).map((plan: any) => (
                  <div key={plan.pp_id} className="bg-white rounded border overflow-hidden">
                    <div className="px-3 py-2 bg-gray-100 flex items-center justify-between">
                      <span className="text-sm font-medium">{plan.pp_title ?? `แผน #${plan.pp_id}`}</span>
                      <div className="flex gap-4 text-xs">
                        <span>แผน <span className="font-mono font-semibold">{fmt(plan.plan_subtotal)}</span></span>
                        <span>จริง <span className="font-mono font-semibold text-blue-700">{fmt(plan.actual_subtotal)}</span></span>
                        <span className="font-semibold text-emerald-700">{plan.completion_rate}% เสร็จ</span>
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left px-3 py-1.5">รายการ</th>
                          <th className="text-right px-3 py-1.5">วงเงินแผน</th>
                          <th className="text-right px-3 py-1.5">วงเงินจริง</th>
                          <th className="text-right px-3 py-1.5">ส่วนต่าง</th>
                          <th className="text-center px-3 py-1.5">สถานะคำขอ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.items.map((item: any) => (
                          <tr key={item.ppi_id} className="border-b last:border-0">
                            <td className="px-3 py-1.5">{item.item_title ?? '-'}</td>
                            <td className="px-3 py-1.5 text-right font-mono">{fmt(item.item_budget)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-blue-700">
                              {item.actual_budget > 0 ? fmt(item.actual_budget) : '-'}
                            </td>
                            <td className={`px-3 py-1.5 text-right font-mono ${item.variance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                              {item.order_count > 0 ? fmt(item.variance) : '-'}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              {item.order_count === 0 ? (
                                <span className="text-gray-400">ยังไม่ดำเนินการ</span>
                              ) : (
                                <span className={`px-1.5 py-0.5 rounded text-xs ${item.completed ? 'bg-emerald-100 text-emerald-700' : item.cancelled ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                                  {item.order_status_name} ({item.order_count})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plan form */}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขแผน' : 'เพิ่มแผนจัดซื้อจัดจ้าง'}
        onSubmit={handleSubmit((d) => savePlan.mutate(d))}
        loading={savePlan.isPending}
      >
        <div className="space-y-3">
          {!editing && (
            <div>
              <Label>เลือกจากโครงการที่อนุมัติแล้ว</Label>
              <select
                className="w-full border rounded-md h-9 px-2 text-sm"
                value={selectedOrderId ?? ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null
                  setSelectedOrderId(id)
                  const o = id ? approvedOrders.find((x) => x.order_id === id) : null
                  if (o) {
                    setValue('pp_title', o.details || '', { shouldValidate: true })
                    setValue('pp_total_budget', Number(o.budgets || 0), { shouldValidate: true })
                  }
                }}
              >
                <option value="">— ไม่เลือก (กรอกเอง) —</option>
                {approvedOrders.map((o) => (
                  <option key={o.order_id} value={o.order_id}>
                    #{o.order_id} · {o.details} · {fmt(o.budgets)} บาท
                  </option>
                ))}
              </select>
              {approvedOrders.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  ยังไม่มีโครงการในระบบ — ไปสร้างที่ 1.2 ก่อน
                </p>
              )}
            </div>
          )}
          <div><Label>เลขที่แผน</Label><Input {...register('pp_no')} /></div>
          <div>
            <Label>ชื่อแผน *</Label>
            <Input {...register('pp_title')} />
            {errors.pp_title && <p className="text-red-500 text-xs mt-1">{errors.pp_title.message}</p>}
          </div>
          <div>
            <Label>วงเงินรวม (บาท) *</Label>
            <Input type="number" step="0.01" min="0" {...register('pp_total_budget', { valueAsNumber: true })} />
          </div>
          <div><Label>หมายเหตุ</Label><Input {...register('remark')} /></div>
        </div>
      </FormDialog>

      {/* Announce dialog */}
      <FormDialog
        open={!!announcing}
        onClose={() => setAnnouncing(null)}
        title="ประกาศแผนจัดซื้อจัดจ้าง"
        onSubmit={() => announcePlan.mutate()}
        loading={announcePlan.isPending}
      >
        <div className="space-y-3">
          <p className="text-sm">
            ประกาศแผน: <b>{announcing?.ppTitle}</b>
          </p>
          <div>
            <Label>วันที่ประกาศ</Label>
            <ThaiDatePicker value={announceDate} onChange={setAnnounceDate} />
          </div>
          <div>
            <Label>URL ประกาศ (e-GP)</Label>
            <Input value={announceUrl} onChange={(e) => setAnnounceUrl(e.target.value)} placeholder="https://..." />
          </div>
          <p className="text-xs text-yellow-700">หมายเหตุ: เมื่อประกาศแล้ว จะแก้ไข/ลบแผนและรายการไม่ได้ (พ.ร.บ. ม.11)</p>
        </div>
      </FormDialog>

      {/* Item form */}
      <FormDialog
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        title={editingItem ? 'แก้ไขรายการ' : 'เพิ่มรายการในแผน'}
        onSubmit={itemForm.handleSubmit((d) => saveItem.mutate(d))}
        loading={saveItem.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ชื่อรายการ *</Label>
            <Input {...itemForm.register('item_title')} />
            {itemForm.formState.errors.item_title && (
              <p className="text-red-500 text-xs mt-1">{itemForm.formState.errors.item_title.message}</p>
            )}
          </div>
          <div>
            <Label>วงเงิน *</Label>
            <Input type="number" step="0.01" min="0" {...itemForm.register('item_budget', { valueAsNumber: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>เดือนคาดการณ์ (1-12)</Label>
              <Input type="number" min="1" max="12" {...itemForm.register('buy_month', { valueAsNumber: true })} />
            </div>
            <div>
              <Label>วิธีจัดซื้อ *</Label>
              <select
                className="w-full border rounded-md h-9 px-2"
                {...itemForm.register('method_type', { valueAsNumber: true })}
              >
                <option value={1}>e-bidding</option>
                <option value={2}>คัดเลือก</option>
                <option value={3}>เฉพาะเจาะจง</option>
                <option value={4}>ตลาด</option>
              </select>
            </div>
          </div>
          <div><Label>หมายเหตุ</Label><Input {...itemForm.register('remark')} /></div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removePlan.mutate(deleteTarget)}
        title="ยืนยันการลบ"
        description={`ต้องการลบแผน "${deleteTarget?.ppTitle}" หรือไม่?`}
      />
      <ConfirmDialog
        open={!!deleteItemTarget}
        onCancel={() => setDeleteItemTarget(null)}
        onConfirm={() => deleteItemTarget && removeItem.mutate(deleteItemTarget)}
        title="ยืนยันการลบรายการ"
        description={`ต้องการลบรายการ "${deleteItemTarget?.itemTitle}" หรือไม่?`}
      />
    </div>
  )
}
