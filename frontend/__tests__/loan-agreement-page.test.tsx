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
vi.mock('next/navigation', () => ({
  usePathname: () => '/sfmis/pay-menu/loan-agreement',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

import LoanAgreementPage from '../app/(dashboard)/sfmis/pay-menu/loan-agreement/page'

const SAMPLE_LOAN = {
  la_id: 1,
  la_seq: 1,
  la_no: 'บย.0001/2569',
  borrower_id: 7,
  borrower_name: 'นายยืม ทดสอบ',
  money_type_id: 1,
  money_type_name: 'เงินอุดหนุน',
  amount: 5000,
  borrow_date: '2026-04-15',
  due_date: '2026-05-15',
  returned_date: null,
  return_cash: 0,
  return_voucher_amount: 0,
  status: 10,
}

beforeEach(() => {
  apiGetMock.mockReset()
  apiPostMock.mockReset()
  apiGetMock.mockImplementation((seg: string) => {
    if (seg.includes('loadLoanAgreements'))
      return Promise.resolve({ data: [SAMPLE_LOAN], count: 1 })
    if (seg.includes('load_user_options'))
      return Promise.resolve({ data: [{ admin_id: 7, name: 'นายยืม ทดสอบ' }] })
    if (seg.includes('loadBudgetIncomeType'))
      return Promise.resolve({ data: [{ bg_type_id: 1, budget_type: 'เงินอุดหนุน' }] })
    return Promise.resolve({ data: [], count: 0 })
  })
})

describe('หน้า LoanAgreement (เงินยืม) — mock layer', () => {
  it('render หัวข้อหน้า', async () => {
    renderWithClient(<LoanAgreementPage />)
    expect(
      await screen.findByText('ทะเบียนคุมสัญญายืมเงิน (บย.)'),
    ).toBeInTheDocument()
  })

  it('โหลดรายการจาก API แล้วแสดงในตาราง', async () => {
    renderWithClient(<LoanAgreementPage />)
    expect(await screen.findByText('บย.0001/2569')).toBeInTheDocument()
    expect(screen.getByText('นายยืม ทดสอบ')).toBeInTheDocument()
    // ยืนยันว่าเรียก endpoint โหลดทะเบียนจริง
    expect(apiGetMock).toHaveBeenCalledWith(
      expect.stringContaining('LoanAgreement/loadLoanAgreements/1/1/'),
    )
  })

  it('คลิก "เพิ่มสัญญายืมเงิน" → เปิดฟอร์มสร้าง', async () => {
    renderWithClient(<LoanAgreementPage />)
    await screen.findByText('บย.0001/2569')
    fireEvent.click(screen.getByRole('button', { name: /เพิ่มสัญญายืมเงิน/ }))
    expect(
      await screen.findByText('เพิ่มสัญญายืมเงิน (ตัวอย่างที่ 34)'),
    ).toBeInTheDocument()
    // ฟอร์มมีฟิลด์ผู้ยืม (label ในฟอร์ม + header ตาราง → ≥2)
    expect(screen.getAllByText('ผู้ยืม').length).toBeGreaterThanOrEqual(2)
  })

  it('ไม่มีข้อมูล → แสดง emptyText', async () => {
    apiGetMock.mockImplementation((seg: string) => {
      if (seg.includes('loadLoanAgreements'))
        return Promise.resolve({ data: [], count: 0 })
      return Promise.resolve({ data: [], count: 0 })
    })
    renderWithClient(<LoanAgreementPage />)
    expect(await screen.findByText('ไม่พบสัญญายืมเงิน')).toBeInTheDocument()
  })
})
