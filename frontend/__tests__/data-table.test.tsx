import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataTable } from '../components/shared/data-table'

interface Row {
  name: string
  amount: number
}

const columns = [
  { header: 'ชื่อ', key: 'name' as const },
  { header: 'จำนวน', render: (r: Row) => <span>{r.amount.toLocaleString()} บาท</span> },
]

const rows: Row[] = [
  { name: 'ก', amount: 1000 },
  { name: 'ข', amount: 2500 },
]

describe('DataTable', () => {
  it('แสดงหัวคอลัมน์ทุกคอลัมน์', () => {
    render(
      <DataTable columns={columns} data={rows} total={2} page={0} pageSize={10} onPageChange={() => {}} />,
    )
    expect(screen.getByText('ชื่อ')).toBeInTheDocument()
    expect(screen.getByText('จำนวน')).toBeInTheDocument()
  })

  it('render แถวจาก key และจาก render()', () => {
    render(
      <DataTable columns={columns} data={rows} total={2} page={0} pageSize={10} onPageChange={() => {}} />,
    )
    expect(screen.getByText('ก')).toBeInTheDocument() // จาก key
    expect(screen.getByText('1,000 บาท')).toBeInTheDocument() // จาก render()
    expect(screen.getByText('2,500 บาท')).toBeInTheDocument()
  })

  it('สถานะ loading → "กำลังโหลด..." ไม่แสดงข้อมูล', () => {
    render(
      <DataTable columns={columns} data={rows} total={2} page={0} pageSize={10} onPageChange={() => {}} loading />,
    )
    expect(screen.getByText('กำลังโหลด...')).toBeInTheDocument()
    expect(screen.queryByText('ก')).not.toBeInTheDocument()
  })

  it('ไม่มีข้อมูล → emptyText (ค่า default)', () => {
    render(
      <DataTable columns={columns} data={[]} total={0} page={0} pageSize={10} onPageChange={() => {}} />,
    )
    expect(screen.getByText('ไม่พบข้อมูล')).toBeInTheDocument()
  })

  it('ไม่มีข้อมูล → emptyText ที่กำหนดเอง', () => {
    render(
      <DataTable columns={columns} data={[]} total={0} page={0} pageSize={10} onPageChange={() => {}} emptyText="ยังไม่มีรายการ" />,
    )
    expect(screen.getByText('ยังไม่มีรายการ')).toBeInTheDocument()
  })

  it('total=0 → ไม่แสดงแถบ pagination', () => {
    render(
      <DataTable columns={columns} data={[]} total={0} page={0} pageSize={10} onPageChange={() => {}} />,
    )
    expect(screen.queryByText(/จาก .* รายการ/)).not.toBeInTheDocument()
  })

  it('คำนวณช่วงและจำนวนหน้าถูกต้อง (25 รายการ, หน้าละ 10, หน้าแรก)', () => {
    render(
      <DataTable columns={columns} data={rows} total={25} page={0} pageSize={10} onPageChange={() => {}} />,
    )
    expect(screen.getByText('แสดง 1–10 จาก 25 รายการ')).toBeInTheDocument()
    expect(screen.getByText('หน้า 1 / 3')).toBeInTheDocument()
  })

  it('หน้าแรก → ปุ่มย้อนกลับ disabled, ปุ่มถัดไปกดได้', () => {
    const onPageChange = vi.fn()
    render(
      <DataTable columns={columns} data={rows} total={25} page={0} pageSize={10} onPageChange={onPageChange} />,
    )
    const buttons = screen.getAllByRole('button')
    const [prev, next] = buttons
    expect(prev).toBeDisabled()
    expect(next).not.toBeDisabled()
    fireEvent.click(next)
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('หน้าสุดท้าย → ปุ่มถัดไป disabled, ย้อนกลับเรียก onPageChange(page-1)', () => {
    const onPageChange = vi.fn()
    render(
      <DataTable columns={columns} data={rows} total={25} page={2} pageSize={10} onPageChange={onPageChange} />,
    )
    expect(screen.getByText('แสดง 21–25 จาก 25 รายการ')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    const [prev, next] = buttons
    expect(next).toBeDisabled()
    fireEvent.click(prev)
    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})
