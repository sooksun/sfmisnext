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

  it('requireReason + เหตุผลว่าง → ขึ้น error และไม่เรียก onConfirm', async () => {
    const onConfirm = vi.fn()
    render(
      <DeleteWithReasonDialog open onClose={() => {}} onConfirm={onConfirm} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันการลบ' }))
    await waitFor(() =>
      expect(screen.getByText('กรุณากรอกเหตุผลการลบ')).toBeInTheDocument(),
    )
    expect(onConfirm).not.toHaveBeenCalled()
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

  it('การพิมพ์ล้าง error เดิม', async () => {
    render(
      <DeleteWithReasonDialog open onClose={() => {}} onConfirm={() => {}} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันการลบ' }))
    await waitFor(() =>
      expect(screen.getByText('กรุณากรอกเหตุผลการลบ')).toBeInTheDocument(),
    )
    fireEvent.change(screen.getByPlaceholderText(/กรอกข้อมูลผิด/), {
      target: { value: 'x' },
    })
    expect(screen.queryByText('กรุณากรอกเหตุผลการลบ')).not.toBeInTheDocument()
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

  it('loading → ปุ่มแสดง "กำลังลบ..." และ disabled', () => {
    render(
      <DeleteWithReasonDialog open onClose={() => {}} onConfirm={() => {}} loading />,
    )
    const confirm = screen.getByRole('button', { name: 'กำลังลบ...' })
    expect(confirm).toBeDisabled()
  })
})
