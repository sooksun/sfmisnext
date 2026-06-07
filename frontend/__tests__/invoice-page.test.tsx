import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithClient, mockAppContext } from './test-utils'

// ── mock layer ───────────────────────────────────────────────────────────────
const { apiGetMock, apiPostMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ apiGet: apiGetMock, apiPost: apiPostMock }))
vi.mock('@/hooks/use-app-context', () => ({ useAppContext: () => mockAppContext }))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}))
// ProcessFlow ใช้ usePathname() — ใน jsdom ต้อง mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/sfmis/pay-menu/invoice',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

import InvoicePage from '../app/(dashboard)/sfmis/pay-menu/invoice/page'

const SAMPLE_INVOICE = {
  rw_id: 1,
  sc_id: 1,
  no_doc: 'บค.0001/2569',
  detail: 'ค่าวัสดุสำนักงาน',
  amount: 5000,
  status: 0,
  payment_type: 0,
  bg_type_id: 1,
  rw_type: 0,
  order_id: 0,
  tr_id: 0,
  la_id: 0,
  p_id: 1,
  partner_name: 'ร้านค้า ก',
  budget_type_name: 'เงินอุดหนุน',
  project_name: '',
  date_request: '2026-04-15',
  user_request: 1,
  user_request_name: 'ผู้ขอเบิก',
  year: '2569',
  sy_id: 1,
  del: 0,
}

beforeEach(() => {
  apiGetMock.mockReset()
  apiPostMock.mockReset()
  apiGetMock.mockImplementation((seg: string) => {
    if (seg.includes('loadInvoiceOrder')) return Promise.resolve([SAMPLE_INVOICE])
    // ที่เหลือเป็น dropdown/payable/loan-status — คืน array ว่าง
    return Promise.resolve([])
  })
})

describe('หน้า Invoice (ใบสำคัญจ่าย) — mock layer', () => {
  it('render หัวข้อหน้า', async () => {
    renderWithClient(<InvoicePage />)
    expect(await screen.findByText('ใบสำคัญจ่าย (ขอเบิก)')).toBeInTheDocument()
  })

  it('โหลดรายการจาก API แล้วแสดงในตาราง', async () => {
    renderWithClient(<InvoicePage />)
    expect(await screen.findByText('ค่าวัสดุสำนักงาน')).toBeInTheDocument()
    expect(screen.getByText('บค.0001/2569')).toBeInTheDocument()
    expect(apiGetMock).toHaveBeenCalledWith('Invoice/loadInvoiceOrder/1/1')
  })

  it('คลิก "สร้างใบสำคัญจ่าย" → เปิดฟอร์มสร้าง', async () => {
    renderWithClient(<InvoicePage />)
    await screen.findByText('ค่าวัสดุสำนักงาน')
    // ก่อนเปิด: ข้อความ "สร้างใบสำคัญจ่าย" มีแค่ที่ปุ่ม (1 จุด)
    expect(screen.getAllByText('สร้างใบสำคัญจ่าย')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /สร้างใบสำคัญจ่าย/ }))
    // หลังเปิด: เพิ่ม title ใน dialog → ≥2 จุด (ยืนยันฟอร์มเปิดแล้ว)
    await waitFor(() =>
      expect(screen.getAllByText('สร้างใบสำคัญจ่าย').length).toBeGreaterThanOrEqual(2),
    )
  })

  it('ไม่มีข้อมูล → ตารางแสดง empty (ค่า default)', async () => {
    apiGetMock.mockImplementation(() => Promise.resolve([]))
    renderWithClient(<InvoicePage />)
    expect(await screen.findByText('ไม่พบข้อมูล')).toBeInTheDocument()
  })
})
