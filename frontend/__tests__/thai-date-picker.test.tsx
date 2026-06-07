import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThaiDatePicker } from '../components/ui/thai-date-picker'

describe('ThaiDatePicker', () => {
  it('ไม่มี value → แสดง placeholder', () => {
    render(<ThaiDatePicker value="" placeholder="เลือกวันที่" />)
    expect(screen.getByText('เลือกวันที่')).toBeInTheDocument()
  })

  it('มี value (CE) → แสดงผลเป็น พ.ศ. ตัวย่อ', () => {
    // 2026-04-15 → "15 เม.ย. 2569"
    render(<ThaiDatePicker value="2026-04-15" />)
    expect(screen.getByText('15 เม.ย. 2569')).toBeInTheDocument()
  })

  it('คลิก trigger → เปิดปฏิทิน หัวข้อแสดงเดือน + ปี พ.ศ.', () => {
    render(<ThaiDatePicker value="2026-04-15" />)
    fireEvent.click(screen.getByText('15 เม.ย. 2569'))
    // header ปุ่ม month/year toggle → "เมษายน 2569"
    expect(screen.getByText('เมษายน 2569')).toBeInTheDocument()
  })

  it('เลือกวัน → onChange คืนค่าเป็น "YYYY-MM-DD" (CE)', () => {
    const onChange = vi.fn()
    render(<ThaiDatePicker value="2026-04-15" onChange={onChange} />)
    fireEvent.click(screen.getByText('15 เม.ย. 2569')) // เปิดปฏิทิน
    fireEvent.click(screen.getByRole('button', { name: '20' })) // เลือกวันที่ 20
    expect(onChange).toHaveBeenCalledWith('2026-04-20')
  })

  it('year picker แสดงปีเป็น พ.ศ.', () => {
    render(<ThaiDatePicker value="2026-04-15" />)
    fireEvent.click(screen.getByText('15 เม.ย. 2569')) // เปิด
    fireEvent.click(screen.getByText('เมษายน 2569')) // toggle ไป year picker
    // ช่วงปี viewYear-10..+9 → ต้องมี 2569 (พ.ศ. ของ 2026) ใน grid
    const years = screen.getAllByText('2569')
    expect(years.length).toBeGreaterThan(0)
  })

  it('disabled → คลิกแล้วไม่เปิดปฏิทิน', () => {
    render(<ThaiDatePicker value="2026-04-15" disabled />)
    fireEvent.click(screen.getByText('15 เม.ย. 2569'))
    expect(screen.queryByText('เมษายน 2569')).not.toBeInTheDocument()
  })
})
