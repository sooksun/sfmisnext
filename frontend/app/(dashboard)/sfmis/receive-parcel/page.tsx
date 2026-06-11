'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2, Printer, BadgeCheck, FileText, Paperclip } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ProcessFlow } from '@/components/shared/process-flow'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { InspectDialog, type InspectOrder } from '@/components/shared/inspect-dialog'
import { AttachmentPanel } from '@/components/shared/attachment-panel'
import { Button } from '@/components/ui/button'
import { apiGet, apiPost } from '@/lib/api'
import { getThaiDateTime, fmtDateTH } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'
import {
  openPrintWindow,
  makeHeader,
  makeSignatures,
  esc,
  thaiFullDate,
} from '@/lib/print-utils'
import { receiveParcelForm, type OrderPrintData } from '@/lib/official-procurement-forms'

interface ReceiveParcel {
  receive_id: number
  order_id: number
  project_name: string
  receive_date: string
  receive_status: number
  total_items: number
  // ── ข้อมูลตรวจรับที่ผูกกับคำสั่งซื้อ (มาจาก loadReceive join supplie_inspection) ──
  insp_id: number | null
  insp_result: number | null
  stock_posted: number
  report_no: string | null
  update_date: string
}

interface InspectionRow {
  inspId: number
  orderId: number | null
  ctId: number | null
  inspDate: string | null
  inspResult: number
  inspNote: string | null
  committee1: string | null
  committee2: string | null
  committee3: string | null
  reportNo: string | null
  reportDate: string | null
  stockPosted: number
}

const RESULT: Record<number, { text: string; color: string }> = {
  1: { text: 'ผ่าน', color: 'text-green-600' },
  2: { text: 'ไม่ผ่าน', color: 'text-red-500' },
  3: { text: 'ผ่านบางส่วน', color: 'text-yellow-600' },
}

/** สถานะรวม: ลงบัญชีแล้ว > ผลตรวจ > รอตรวจรับ */
function receiveStatus(item: ReceiveParcel): { label: string; color: string } {
  if (item.stock_posted === 1)
    return { label: 'ตรวจรับแล้ว (ลงบัญชีวัสดุ)', color: 'text-green-600' }
  if (item.insp_result != null) {
    const r = RESULT[item.insp_result]
    return { label: `ตรวจแล้ว: ${r?.text ?? '-'}`, color: r?.color ?? '' }
  }
  return { label: 'รอตรวจรับ', color: 'text-yellow-600' }
}

export default function ReceiveParcelPage() {
  const { scId, budgetYear } = useAppContext()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [deleteTarget, setDeleteTarget] = useState<ReceiveParcel | null>(null)
  const [inspectTarget, setInspectTarget] = useState<InspectOrder | null>(null)
  const [attachTarget, setAttachTarget] = useState<ReceiveParcel | null>(null)

  // หมายเหตุ: route param ชื่อ :sy_id แต่ตาราง receive_parcel_order.sy_year เก็บ "ปีงบจริง"
  // (budget_year เช่น 2569) ไม่ใช่ sy_id — จึงต้องส่ง budgetYear (ดู CLAUDE.md: sy_id vs budget_year)
  const { data, isLoading } = useQuery({
    queryKey: ['receive-parcel', scId, budgetYear],
    queryFn: () => apiGet<ReceiveParcel[]>(`Supplie/loadReceive/${scId}/${budgetYear}`),
    enabled: scId > 0 && budgetYear > 0,
  })
  const rows = Array.isArray(data) ? data : []

  // ── ลบ ──
  const deleteMutation = useMutation({
    mutationFn: (item: ReceiveParcel) =>
      apiPost('Supplie/removeReceiveParcel', { receive_id: item.receive_id }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ลบเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['receive-parcel'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการลบ')
      }
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  // ── พิมพ์ใบรับพัสดุ (pdf16) ──
  async function printReceive(item: ReceiveParcel) {
    try {
      const d = await apiGet<OrderPrintData>(
        `Project_approve/loadOrderForPrint/${item.order_id}`,
      )
      if (!d) {
        toast.error('ไม่พบข้อมูลคำสั่งซื้อ')
        return
      }
      const { title, body } = receiveParcelForm({
        scName: d.school_name,
        receiveNo: String(item.receive_id),
        receiveDate: item.receive_date,
        partnerName: d.partner?.p_name,
        rows: d.items.map((it) => ({
          supp_name: it.supp_name,
          qty: it.pc_total,
          price: it.amount ?? Number(it.supp_price ?? 0) * Number(it.pc_total ?? 0),
        })),
      })
      openPrintWindow({ title, body })
    } catch {
      toast.error('พิมพ์ใบรับพัสดุไม่สำเร็จ')
    }
  }

  // ── พิมพ์รายงานผลการตรวจรับ พ.ร.บ. ม.100-104 ──
  async function printInspectionReport(item: ReceiveParcel) {
    try {
      const res = await apiGet<{ data: InspectionRow[] }>(
        `Supplie_inspection/load/${scId}?order_id=${item.order_id}`,
      )
      const r = res.data?.[0]
      if (!r) {
        toast.error('ยังไม่มีเอกสารตรวจรับสำหรับคำสั่งซื้อนี้')
        return
      }
      const header = makeHeader({
        title: 'รายงานผลการตรวจรับพัสดุ',
        subtitle:
          '(ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 มาตรา 100-104)',
        docNo: r.reportNo ?? undefined,
        docDate: r.reportDate ?? r.inspDate ?? undefined,
      })
      const body = `
<p>ตามที่คณะกรรมการตรวจรับพัสดุได้รับมอบหมายให้ตรวจรับพัสดุตามใบสั่งซื้อ/สัญญา
อ้างอิง order_id: <b>${r.orderId ?? '-'}</b>${r.ctId ? ` / สัญญาเลขที่ ct_id: <b>${r.ctId}</b>` : ''}
เมื่อวันที่ ${esc(thaiFullDate(r.inspDate))}</p>
<p><b>ผลการตรวจรับ:</b> ${esc(RESULT[r.inspResult]?.text ?? '-')}</p>
<p><b>หมายเหตุ:</b> ${esc(r.inspNote ?? '-')}</p>
<p><b>สถานะการลงบัญชีวัสดุ:</b> ${r.stockPosted === 1 ? 'บันทึกลงสต็อกแล้ว' : 'ยังไม่ได้บันทึกลงสต็อก'}</p>
<p>จึงเรียนมาเพื่อโปรดทราบและพิจารณาดำเนินการต่อไป</p>`
      openPrintWindow({
        title: `รายงานตรวจรับพัสดุ_${r.reportNo || r.inspId}`,
        body:
          header +
          body +
          makeSignatures([
            `ประธานกรรมการ${r.committee1 ? ` (${r.committee1})` : ''}`,
            `กรรมการ${r.committee2 ? ` (${r.committee2})` : ''}`,
            `กรรมการและเลขานุการ${r.committee3 ? ` (${r.committee3})` : ''}`,
          ]),
      })
    } catch {
      toast.error('พิมพ์รายงานตรวจรับไม่สำเร็จ')
    }
  }

  const columns = useMemo(
    () => [
      {
        header: 'จัดการ',
        render: (item: ReceiveParcel) => (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => printReceive(item)} title="พิมพ์ใบรับพัสดุ">
              <Printer className="h-3 w-3" />
            </Button>
            {item.stock_posted === 0 && (
              <Button
                size="sm"
                variant="warning"
                onClick={() =>
                  setInspectTarget({
                    order_id: item.order_id,
                    receive_id: item.receive_id,
                    insp_id: item.insp_id ?? undefined,
                    title: item.project_name,
                  })
                }
                title="ตรวจรับพัสดุ"
              >
                <BadgeCheck className="h-3 w-3" />
              </Button>
            )}
            {item.insp_id != null && (
              <Button size="sm" variant="outline" onClick={() => printInspectionReport(item)} title="พิมพ์รายงานตรวจรับ">
                <FileText className="h-3 w-3" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setAttachTarget(item)} title="รูปถ่าย/หลักฐานการตรวจรับ">
              <Paperclip className="h-3 w-3" />
            </Button>
            {item.stock_posted === 0 && (
              <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(item)} title="ลบรายการ">
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ),
        headerClassName: 'w-32',
      },
      { header: 'โครงการ', key: 'project_name' as keyof ReceiveParcel },
      { header: 'วันที่รับ', render: (item: ReceiveParcel) => <span>{fmtDateTH(item.receive_date)}</span> },
      { header: 'จำนวนรายการ', key: 'total_items' as keyof ReceiveParcel },
      { header: 'เลขที่รายงานตรวจรับ', render: (item: ReceiveParcel) => item.report_no || '-' },
      {
        header: 'สถานะ',
        render: (item: ReceiveParcel) => {
          const s = receiveStatus(item)
          return <span className={s.color}>{s.label}</span>
        },
      },
      {
        header: 'แก้ไขล่าสุด',
        render: (item: ReceiveParcel) => (
          <small className="text-gray-500">{getThaiDateTime(item.update_date)}</small>
        ),
      },
    ],
    [],
  )

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <ProcessFlow flow="procure" />
      <PageHeader title="รับ–ตรวจรับพัสดุ" />
      <div className="p-4">
        <p className="mb-3 text-sm text-gray-500">
          บันทึกรับพัสดุได้จากหน้า <b>2.2 คำขอจัดซื้อ/จัดจ้าง</b> (กดปุ่ม &quot;ตรวจรับพัสดุ&quot;
          ที่คำสั่งซื้อสถานะจัดซื้อแล้ว) — หน้านี้ใช้ตรวจรับ ลงบัญชีวัสดุ และพิมพ์เอกสาร
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

        {attachTarget && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                หลักฐานการตรวจรับ: {attachTarget.project_name}
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setAttachTarget(null)}>ปิด</Button>
            </div>
            {attachTarget.insp_id != null ? (
              <AttachmentPanel
                refType="sup_inspection"
                refId={attachTarget.insp_id}
                scId={scId}
                category="photo"
                title="รูปถ่าย/หลักฐานการตรวจรับ"
              />
            ) : (
              <AttachmentPanel
                refType="parcel_order"
                refId={attachTarget.order_id}
                scId={scId}
                category="photo"
                title="รูปถ่าย/หลักฐานการตรวจรับ"
              />
            )}
          </div>
        )}
      </div>

      {/* Dialog ตรวจรับ = component กลาง (ใช้ร่วมกับหน้า 2.2) */}
      <InspectDialog
        open={!!inspectTarget}
        order={inspectTarget}
        onClose={() => setInspectTarget(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ['receive-parcel'] })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบรายการรับพัสดุของโครงการ "${deleteTarget?.project_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
