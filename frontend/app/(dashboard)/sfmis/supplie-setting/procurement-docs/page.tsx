'use client'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Printer, FileText } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { ProcessFlow } from '@/components/shared/process-flow'
import { Button } from '@/components/ui/button'
import { apiGet } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import {
  PROCUREMENT_FORMS,
  formsForOrder,
  buildAllForms,
  type OrderPrintData,
} from '@/lib/official-procurement-forms'
import { openPrintWindow } from '@/lib/print-utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParcelOrder {
  order_id: number
  order_status: number
  details: string
  budgets: number
  project_id: number | null
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
const fmt = (n: number) =>
  Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProcurementDocsPage() {
  const { scId, budgetYear } = useAppContext()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [docOrder, setDocOrder] = useState<ParcelOrder | null>(null)

  const { data: orders, isLoading } = useQuery({
    queryKey: ['procdocs-orders', scId, budgetYear],
    queryFn: () =>
      apiGet<ParcelOrder[]>(
        `Project_approve/loadProjectApprove/${scId}/${budgetYear}`,
      ),
    enabled: scId > 0 && budgetYear > 0,
  })

  // โหลดข้อมูลเต็มของคำสั่งซื้อที่เลือก (สำหรับสร้างฟอร์ม)
  const { data: printData, isFetching } = useQuery({
    queryKey: ['order-for-print', docOrder?.order_id],
    queryFn: () =>
      apiGet<OrderPrintData>(
        `Project_approve/loadOrderForPrint/${docOrder!.order_id}`,
      ),
    enabled: !!docOrder,
  })

  // แสดงเฉพาะคำสั่งซื้อที่อยู่ในกระบวนการจัดซื้อ (ไม่นับที่ยกเลิก)
  const rows = useMemo(
    () =>
      (Array.isArray(orders) ? orders : []).filter(
        (o) => o.order_status !== 9,
      ),
    [orders],
  )

  function printForm(formKey: string) {
    if (!printData) {
      toast.error('กำลังโหลดข้อมูล กรุณาลองอีกครั้ง')
      return
    }
    const form = PROCUREMENT_FORMS.find((f) => f.key === formKey)
    if (!form) return
    const { title, body } = form.build(printData)
    openPrintWindow({ title, body })
  }

  function printAll() {
    if (!printData) {
      toast.error('กำลังโหลดข้อมูล กรุณาลองอีกครั้ง')
      return
    }
    const { title, body } = buildAllForms(printData)
    openPrintWindow({ title, body })
  }

  const columns = useMemo(
    () => [
      {
        header: 'พิมพ์',
        render: (item: ParcelOrder) => (
          <Button size="sm" onClick={() => setDocOrder(item)} title="พิมพ์เอกสารจัดซื้อ">
            <Printer className="h-3 w-3" />
          </Button>
        ),
        headerClassName: 'w-16',
      },
      { header: 'เลขที่', render: (i: ParcelOrder) => <span className="font-mono text-xs">{i.order_id}</span> },
      { header: 'รายการ/โครงการ', render: (i: ParcelOrder) => <span className="font-medium">{i.details}</span> },
      { header: 'วงเงิน (บาท)', render: (i: ParcelOrder) => <span className="font-mono">{fmt(i.budgets)}</span> },
      {
        header: 'สถานะ',
        render: (i: ParcelOrder) => {
          const s = ORDER_STATUS[i.order_status] ?? { text: String(i.order_status), color: 'text-gray-500' }
          return <span className={`text-sm ${s.color}`}>{s.text}</span>
        },
      },
    ],
    [],
  )

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="เอกสารจัดซื้อ / ตรวจรับ" />
      <ProcessFlow flow="procure" />
      <div className="p-4">
        <p className="text-sm text-gray-500 mb-3">
          เลือกคำสั่งซื้อแล้วพิมพ์ชุดเอกสารจัดซื้อจัดจ้างตามแบบฟอร์มราชการ (พ.ร.บ.ฯ พ.ศ. 2560)
          — รายงานขอซื้อ/ขอจ้าง, คำสั่งแต่งตั้งกรรมการ, ใบสั่งซื้อ, ใบตรวจรับ, ประกาศผู้ชนะ, ส่งเบิก ฯลฯ
        </p>
        <DataTable
          columns={columns}
          data={rows}
          total={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
        />
      </div>

      {/* ── Dialog เลือกฟอร์มพิมพ์ ─────────────────────────────────────────── */}
      <FormDialog
        open={!!docOrder}
        onClose={() => setDocOrder(null)}
        title={`พิมพ์เอกสารจัดซื้อ — เลขที่ ${docOrder?.order_id ?? ''}`}
        size="lg"
      >
        {isFetching ? (
          <p className="text-center text-gray-400 py-6">กำลังโหลดข้อมูล...</p>
        ) : (
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={printAll}
              disabled={!printData}
              title="พิมพ์เอกสารทุกฉบับต่อหน้ากันเป็นชุดเดียว"
            >
              <Printer className="h-4 w-4 shrink-0" />
              พิมพ์ทั้งหมด (รวมทุกฉบับเป็นชุดเดียว)
            </Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(printData ? formsForOrder(printData) : PROCUREMENT_FORMS).map((f) => (
                <Button
                  key={f.key}
                  variant="outline"
                  className="justify-start"
                  onClick={() => printForm(f.key)}
                  disabled={!printData}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate text-left">{f.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  )
}
