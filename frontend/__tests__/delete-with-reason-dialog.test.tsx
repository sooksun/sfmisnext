import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DeleteWithReasonDialog } from '../components/shared/delete-with-reason-dialog'

describe('DeleteWithReasonDialog', () => {
  it('open=false → ไม่ render เนื้อหา', () => {
    render(
      <DeleteWithReasonDialog open={false} onClose={() => {}} onConfirm={() => {}} />,
    )
    expect(screen.queryByText('ยืนยันการลบข้อมูล')).not.toBeInTheDocument()
  })

  it('requireReason + เหตุผลว่าง → ปุ่มยืนยัน disabled และไม่เรียก onConfirm', () => {
    const onConfirm = vi.fn()
    render(
      <DeleteWithReasonDialog open onClose={() => {}} onConfirm={onConfirm} />,
    )
    const confirm = screen.getByRole('button', { name: 'ยืนยันการลบ' })
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('เหตุผลเป็นช่องว่างล้วน → ปุ่มยืนยันยัง disabled', () => {
    render(
      <DeleteWithReasonDialog open onClose={() => {}} onConfirm={() => {}} />,
    )
    fireEvent.change(screen.getByPlaceholderText(/กรอกข้อมูลผิด/), {
      target: { value: '   ' },
    })
    expect(screen.getByRole('button', { name: 'ยืนยันการลบ' })).toBeDisabled()
  })

  it('กรอกเหตุผลแล้วยืนยัน → เรียก onConfirm พร้อมเหตุผล (trim)', async () => {
    const onConfirm = vi.fn()
    render(
      <DeleteWithReasonDialog open onClose={() => {}} onConfirm={onConfirm} />,
    )
    const textarea = screen.getByPlaceholderText(/กรอกข้อมูลผิด/)
    fireEvent.change(textarea, { target: { value: '  รายการซ้ำ  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันการลบ' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('รายการซ้ำ'))
  })

  it('พิมพ์เหตุผลแล้ว → ปุ่มยืนยัน enabled', () => {
    render(
      <DeleteWithReasonDialog open onClose={() => {}} onConfirm={() => {}} />,
    )
    fireEvent.change(screen.getByPlaceholderText(/กรอกข้อมูลผิด/), {
      target: { value: 'x' },
    })
    expect(screen.getByRole('button', { name: 'ยืนยันการลบ' })).not.toBeDisabled()
  })

  it('custom reasonLabel/confirmLabel → แสดงตามที่กำหนด', () => {
    render(
      <DeleteWithReasonDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="ยืนยันการยกเลิกเช็ค"
        reasonLabel="เหตุผลการยกเลิก"
        confirmLabel="ยกเลิกเช็ค"
      />,
    )
    expect(screen.getByText('ยืนยันการยกเลิกเช็ค')).toBeInTheDocument()
    expect(screen.getByText(/เหตุผลการยกเลิก/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ยกเลิกเช็ค' })).toBeInTheDocument()
  })

  it('requireReason=false + เหตุผลว่าง → เรียก onConfirm("") ได้', async () => {
    const onConfirm = vi.fn()
    render(
      <DeleteWithReasonDialog open onClose={() => {}} onConfirm={onConfirm} requireReason={false} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันการลบ' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(''))
  })

  it('คลิกยกเลิก → เรียก onClose', () => {
    const onClose = vi.fn()
    render(
      <DeleteWithReasonDialog open onClose={onClose} onConfirm={() => {}} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('loading → ปุ่มแสดง "กำลังดำเนินการ..." และ disabled', () => {
    render(
      <DeleteWithReasonDialog open onClose={() => {}} onConfirm={() => {}} loading />,
    )
    const confirm = screen.getByRole('button', { name: 'กำลังดำเนินการ...' })
    expect(confirm).toBeDisabled()
  })
})
