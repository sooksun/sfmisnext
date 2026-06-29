import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../components/ui/button'

describe('Button', () => {
  it('render children', () => {
    render(<Button>บันทึก</Button>)
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeInTheDocument()
  })

  it('variant default → มี class ที่เกี่ยวกับสี indigo', () => {
    render(<Button variant="default">ค่าปกติ</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/indigo/)
  })

  it('variant destructive → มี class ที่เกี่ยวกับสี destructive/red', () => {
    render(<Button variant="destructive">ลบ</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/destructive|red/)
  })

  it('variant outline → มี class border', () => {
    render(<Button variant="outline">ขอบ</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/border/)
  })

  it('disabled → ไม่ trigger onClick', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>ปิดใช้</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('size sm → มี class ขนาดเล็ก', () => {
    render(<Button size="sm">เล็ก</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/sm|small|h-8|px-3/)
  })

  it('asChild → render เป็น element อื่น', () => {
    render(
      <Button asChild>
        <a href="/test">ลิงก์</a>
      </Button>
    )
    expect(screen.getByRole('link', { name: 'ลิงก์' })).toBeInTheDocument()
  })
})
