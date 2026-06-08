'use client'
import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Settings2, Plus, Trash2, Lock, Upload, FileDown } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ProcessFlow } from '@/components/shared/process-flow'
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
import { apiGet, apiPost } from '@/lib/api'
import { exportToXlsx } from '@/lib/export-xlsx'
import { readXlsxRows } from '@/lib/import-xlsx'
import { useAppContext } from '@/hooks/use-app-context'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectRow {
  proj_id: number
  project_code: string
  proj_name: string
  proj_detail: string | null
  proj_budget: number
  proj_status: number
}
interface ProjectResponse {
  data: ProjectRow[]
  count: number
}

interface ParcelOrder {
  order_id: number
  order_status: number
  details: string
  budgets: number
  project_id: number | null
}

interface SupplieLine {
  pc_id: number
  order_id: number
  supp_id: number
  pc_total: number
}

interface SupplieMaster {
  supp_id: number
  supp_name: string
}

interface ImportItem {
  supp_no: string
  supp_name: string
  qty: number
  price: number
  unit: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** ดึงค่าจาก row ตามชื่อคอลัมน์ที่เป็นไปได้ (รองรับชื่อหัวตารางหลายแบบ) แล้ว trim */
const pick = (row: Record<string, unknown>, keys: string[]): string => {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && String(v).trim() !== '')
      return String(v).trim()
  }
  return ''
}

const PROJECT_TYPE: Record<number, string> = { 1: 'จัดซื้อ', 2: 'จัดจ้าง' }
const METHOD_TYPE: Record<number, string> = {
  1: 'e-bidding',
  2: 'คัดเลือก',
  3: 'เฉพาะเจาะจง',
  4: 'ตลาด',
}
const ORDER_STATUS: Record<number, { text: string; color: string }> = {
  0: { text: 'ทบทวนใหม่', color: 'text-orange-600' },
  1: { text: 'รออนุมัติ', color: 'text-blue-600' },
  2: { text: 'ผ่านแผนงาน', color: 'text-indigo-600' },
  3: { text: 'ผ่านการเงิน', color: 'text-purple-600' },
  4: { text: 'ผ่านพัสดุ', color: 'text-teal-600' },
  5: { text: 'ผ่าน ผอ.', color: 'text-green-600' },
  6: { text: 'ตั้งกรรมการ', color: 'text-green-700' },
  7: { text: 'จัดซื้อ/จัดจ้าง', color: 'text-green-800' },
  8: { text: 'สำเร็จ', color: 'text-gray-500' },
  9: { text: 'ยกเลิก', color: 'text-red-500' },
}
const EDITABLE = (s: number) => s === 0 || s === 1
const fmt = (n: number) =>
  Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ManageProjectPage() {
  const { scId, adminId, syId, budgetYear } = useAppContext()
  const userId = adminId
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25

  // คำสั่งซื้อที่กำลังบริหาร
  const [activeOrder, setActiveOrder] = useState<ParcelOrder | null>(null)
  const [activeProject, setActiveProject] = useState<ProjectRow | null>(null)
  // ฟอร์มแก้คำสั่งซื้อ
  const [projectType, setProjectType] = useState(1)
  const [methodType, setMethodType] = useState(3)
  const [budgets, setBudgets] = useState(0)
  // ฟอร์มเพิ่มพัสดุ
  const [newSuppId, setNewSuppId] = useState(0)
  const [newQty, setNewQty] = useState(1)
  const [deleteLine, setDeleteLine] = useState<SupplieLine | null>(null)
  // นำเข้า Excel
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: projResp, isLoading } = useQuery({
    queryKey: ['mp-projects', scId, userId, syId, page, pageSize],
    queryFn: () =>
      apiGet<ProjectResponse>(
        `project/load_project/${scId}/${userId}/${page}/${pageSize}/${syId}`,
      ),
    enabled: scId > 0 && syId > 0,
  })

  // คำสั่งซื้อทั้งหมดของปี (ใช้ map กับโครงการด้วย project_id)
  const { data: orders } = useQuery({
    queryKey: ['mp-orders', scId, budgetYear],
    queryFn: () =>
      apiGet<ParcelOrder[]>(
        `Project_approve/loadProjectApprove/${scId}/${budgetYear}`,
      ),
    enabled: scId > 0 && budgetYear > 0,
  })

  // รายการพัสดุ (master) สำหรับ dropdown
  const { data: supplieMaster } = useQuery({
    queryKey: ['mp-supplie-master', scId],
    queryFn: () =>
      apiGet<SupplieMaster[]>(`Supplie/loadStockSupplie?sc_id=${scId}`),
    enabled: scId > 0,
  })

  // รายการพัสดุของคำสั่งซื้อที่กำลังบริหาร
  const { data: lines } = useQuery({
    queryKey: ['mp-lines', activeOrder?.order_id],
    queryFn: () =>
      apiGet<SupplieLine[]>(
        `Project_approve/loadSuppilesByOrderID/${activeOrder!.order_id}`,
      ),
    enabled: !!activeOrder,
  })

  const projects = projResp?.data ?? []
  const orderList = Array.isArray(orders) ? orders : []
  const supplieList = Array.isArray(supplieMaster) ? supplieMaster : []
  const lineList = Array.isArray(lines) ? lines : []
  const supplieName = (id: number) =>
    supplieList.find((s) => s.supp_id === id)?.supp_name ?? `#${id}`

  const ordersByProject = useMemo(() => {
    const m = new Map<number, ParcelOrder>()
    for (const o of orderList) {
      if (o.project_id != null && !m.has(o.project_id)) m.set(o.project_id, o)
    }
    return m
  }, [orderList])

  const locked = activeOrder ? !EDITABLE(activeOrder.order_status) : true

  // ── Mutations ─────────────────────────────────────────────────────────────

  const saveOrder = useMutation({
    mutationFn: () =>
      apiPost('Project_approve/updateParcelOrder', {
        order_id: activeOrder!.order_id,
        project_type: projectType,
        method_type: methodType,
        budgets,
        up_by: userId,
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('บันทึกคำสั่งซื้อเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['mp-orders'] })
      } else {
        toast.error(res?.ms || 'บันทึกไม่สำเร็จ')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const addLine = useMutation({
    mutationFn: () =>
      apiPost('Project_approve/addParcelDetail', {
        order_id: activeOrder!.order_id,
        supp_id: newSuppId,
        pc_total: newQty,
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('เพิ่มพัสดุเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['mp-lines', activeOrder?.order_id] })
        setNewSuppId(0)
        setNewQty(1)
      } else {
        toast.error(res?.ms || 'เพิ่มไม่สำเร็จ')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const removeLine = useMutation({
    mutationFn: (line: SupplieLine) =>
      apiPost('Project_approve/removeParcelDetail', { pc_id: line.pc_id }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('ลบพัสดุเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['mp-lines', activeOrder?.order_id] })
      } else {
        toast.error(res?.ms || 'ลบไม่สำเร็จ')
      }
      setDeleteLine(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const importLines = useMutation({
    mutationFn: (items: ImportItem[]) =>
      apiPost('Project_approve/importParcelDetails', {
        order_id: activeOrder!.order_id,
        up_by: userId,
        items,
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'นำเข้าเรียบร้อยแล้ว')
        if (Array.isArray(res.errors) && res.errors.length) {
          toast.warning(
            `ข้ามบางแถว:\n${res.errors.slice(0, 5).join('\n')}` +
              (res.errors.length > 5 ? `\n…และอีก ${res.errors.length - 5} แถว` : ''),
          )
        }
        qc.invalidateQueries({ queryKey: ['mp-lines', activeOrder?.order_id] })
        qc.invalidateQueries({ queryKey: ['mp-supplie-master', scId] })
      } else {
        toast.error(res?.ms || 'นำเข้าไม่สำเร็จ')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาดขณะนำเข้า'),
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  function downloadTemplate() {
    exportToXlsx(
      [
        {
          รหัสพัสดุ: '',
          'ชื่อพัสดุ/บริการ': 'ตัวอย่าง: กระดาษ A4 80 แกรม',
          จำนวน: 10,
          ราคาต่อหน่วย: 120,
          หน่วย: 'รีม',
        },
      ],
      'รายการพัสดุ',
      'เทมเพลตนำเข้าพัสดุ',
    )
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // เคลียร์เพื่อให้เลือกไฟล์เดิมซ้ำได้
    if (!file || !activeOrder) return
    try {
      const rows = await readXlsxRows(file)
      const items: ImportItem[] = rows
        .map((r) => ({
          supp_no: pick(r, ['รหัสพัสดุ', 'รหัส']),
          supp_name: pick(r, ['ชื่อพัสดุ/บริการ', 'ชื่อพัสดุ', 'ชื่อ', 'รายการ']),
          qty: Number(pick(r, ['จำนวน']) || 0),
          price: Number(pick(r, ['ราคาต่อหน่วย', 'ราคา']) || 0),
          unit: pick(r, ['หน่วย']),
        }))
        .filter((it) => it.supp_name)
      if (items.length === 0) {
        toast.error('ไม่พบรายการในไฟล์ — ตรวจสอบหัวคอลัมน์ให้ตรงเทมเพลต')
        return
      }
      importLines.mutate(items)
    } catch {
      toast.error('อ่านไฟล์ไม่สำเร็จ — รองรับ .xlsx / .csv เท่านั้น')
    }
  }

  function openManage(project: ProjectRow) {
    const order = ordersByProject.get(project.proj_id) ?? null
    if (!order) {
      toast.error('ยังไม่มีคำสั่งซื้อของโครงการนี้ (ลองสร้างโครงการใหม่อีกครั้ง)')
      return
    }
    setActiveProject(project)
    setActiveOrder(order)
    setProjectType(1)
    setMethodType(3)
    setBudgets(Number(order.budgets) || Number(project.proj_budget) || 0)
    setNewSuppId(0)
    setNewQty(1)
  }

  function closeManage() {
    setActiveOrder(null)
    setActiveProject(null)
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = useMemo(
    () => [
      {
        header: 'จัดการ',
        render: (item: ProjectRow) => {
          const order = ordersByProject.get(item.proj_id)
          return (
            <Button
              size="sm"
              onClick={() => openManage(item)}
              disabled={!order}
              title={order ? 'บริหารโครงการ' : 'ยังไม่มีคำสั่งซื้อ'}
            >
              <Settings2 className="h-3 w-3" />
            </Button>
          )
        },
        headerClassName: 'w-16',
      },
      {
        header: 'รหัสโครงการ',
        render: (item: ProjectRow) => (
          <span className="font-mono text-xs text-gray-500">{item.project_code}</span>
        ),
      },
      {
        header: 'ชื่อโครงการ',
        render: (item: ProjectRow) => <span className="font-medium">{item.proj_name}</span>,
      },
      {
        header: 'วงเงิน (บาท)',
        render: (item: ProjectRow) => <span className="font-mono">{fmt(item.proj_budget)}</span>,
      },
      {
        header: 'ประเภท/สถานะคำสั่งซื้อ',
        render: (item: ProjectRow) => {
          const order = ordersByProject.get(item.proj_id)
          if (!order) return <span className="text-xs text-gray-400">— ยังไม่มี —</span>
          const s = ORDER_STATUS[order.order_status] ?? {
            text: String(order.order_status),
            color: 'text-gray-500',
          }
          return <span className={`text-sm ${s.color}`}>{s.text}</span>
        },
      },
    ],
    [ordersByProject],
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="บริหารโครงการ" />
      <ProcessFlow flow="plan" />
      <div className="p-4">
        <p className="text-sm text-gray-500 mb-3">
          แตกโครงการเป็นรายการจัดซื้อ/จัดจ้าง เลือกประเภทและวิธีจัดหา และเพิ่มรายการพัสดุ
          ก่อนส่งเข้าขั้นอนุมัติ (แก้ไขได้เฉพาะคำสั่งซื้อที่ยังไม่เข้าสายอนุมัติ)
        </p>
        <DataTable
          columns={columns}
          data={projects}
          total={projResp?.count ?? 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
        />
      </div>

      {/* ── Dialog บริหารคำสั่งซื้อ ─────────────────────────────────────────── */}
      <FormDialog
        open={!!activeOrder}
        onClose={closeManage}
        title={`บริหารโครงการ: ${activeProject?.proj_name ?? ''}`}
        size="2xl"
        onSubmit={locked ? undefined : () => saveOrder.mutate()}
        submitLabel="บันทึกคำสั่งซื้อ"
        loading={saveOrder.isPending}
      >
        {activeOrder && (
          <div className="space-y-5">
            {locked && (
              <div className="flex items-center gap-2 text-xs text-amber-700 border border-amber-300 bg-amber-50 px-3 py-2 rounded">
                <Lock className="h-4 w-4" />
                คำสั่งซื้อนี้เข้าสู่ขั้นอนุมัติแล้ว — แก้ไขไม่ได้ (ดูอย่างเดียว)
              </div>
            )}

            {/* ข้อมูลคำสั่งซื้อ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>ประเภทการจัดหา</Label>
                <Select
                  value={String(projectType)}
                  onValueChange={(v) => setProjectType(Number(v))}
                  disabled={locked}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_TYPE).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>วิธีจัดซื้อจัดจ้าง</Label>
                <Select
                  value={String(methodType)}
                  onValueChange={(v) => setMethodType(Number(v))}
                  disabled={locked}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(METHOD_TYPE).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>วงเงิน (บาท)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgets}
                  onChange={(e) => setBudgets(Number(e.target.value))}
                  disabled={locked}
                />
              </div>
            </div>

            {/* รายการพัสดุ */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-base font-semibold">รายการพัสดุ</Label>
                {!locked && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={downloadTemplate}
                      title="ดาวน์โหลดไฟล์เทมเพลต Excel"
                    >
                      <FileDown className="h-4 w-4 mr-1" />
                      เทมเพลต
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={importLines.isPending}
                      title="นำเข้าสินค้า/บริการจากไฟล์ Excel"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {importLines.isPending ? 'กำลังนำเข้า…' : 'นำเข้า Excel'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleImportFile}
                    />
                  </div>
                )}
              </div>
              <div className="mt-2 border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-3 py-2">พัสดุ</th>
                      <th className="text-right px-3 py-2 w-28">จำนวน</th>
                      <th className="px-3 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineList.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center text-gray-400 py-4">
                          ยังไม่มีรายการพัสดุ
                        </td>
                      </tr>
                    ) : (
                      lineList.map((line) => (
                        <tr key={line.pc_id} className="border-t">
                          <td className="px-3 py-2">{supplieName(line.supp_id)}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            {line.pc_total?.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {!locked && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteLine(line)}
                                title="ลบ"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* เพิ่มพัสดุ */}
              {!locked && (
                <div className="flex items-end gap-2 mt-3">
                  <div className="flex-1">
                    <Label>เลือกพัสดุ</Label>
                    <Select
                      value={newSuppId > 0 ? String(newSuppId) : ''}
                      onValueChange={(v) => setNewSuppId(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกพัสดุ" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplieList.map((s) => (
                          <SelectItem key={s.supp_id} value={String(s.supp_id)}>
                            {s.supp_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-28">
                    <Label>จำนวน</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newQty}
                      onChange={(e) => setNewQty(Number(e.target.value))}
                    />
                  </div>
                  <Button
                    onClick={() => addLine.mutate()}
                    disabled={newSuppId === 0 || newQty < 1 || addLine.isPending}
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่ม
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </FormDialog>

      {/* ── ยืนยันลบพัสดุ ───────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteLine}
        onConfirm={() => deleteLine && removeLine.mutate(deleteLine)}
        onCancel={() => setDeleteLine(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบพัสดุ "${deleteLine ? supplieName(deleteLine.supp_id) : ''}" ออกจากคำสั่งซื้อหรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
