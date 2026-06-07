import { describe, it, expect } from 'vitest'
import { buildDailyBalanceGroups } from '../lib/daily-balance-groups'

const mk = (name: string, total = 0) => ({ name, cash: 0, bank: total, smp: 0, total })

describe('buildDailyBalanceGroups — จัดหมวดรายงานเงินคงเหลือประจำวัน (form-028)', () => {
  // ใส่แบบสลับลำดับ → ต้องจัดหมวด/เรียงตามคู่มือ
  const rows = buildDailyBalanceGroups([
    mk('เงินประกันสัญญา', 24500),
    mk('เงินอุดหนุนค่าใช้จ่ายรายหัว', 356450),
    mk('เงินรายได้สถานศึกษาอื่น ๆ', 149592),
    mk('เงินภาษีหัก ณ ที่จ่าย', 250),
    mk('เงินเรียนฟรี 15 ปี', 268950),
    mk('เงินอุดหนุน อปท. (อาหารกลางวัน)', 562920),
    mk('เงินรายได้แผ่นดิน', 2632),
    mk('เงินปัจจัยพื้นฐานนักเรียนยากจน', 1500),
  ])
  const names = rows.map((r) => r.name)

  it('หัวข้อหมวดเรียงตามคู่มือ', () => {
    expect(rows.filter((r) => r.group).map((r) => r.name)).toEqual([
      'เงินงบประมาณ',
      'เงินรายได้แผ่นดิน',
      'เงินนอกงบประมาณ',
      'เงินอุดหนุนทั่วไป',
      'เงินรายได้สถานศึกษา',
    ])
  })

  it('เงินอุดหนุนทั่วไปเรียง รายหัว→ปัจจัยพื้นฐาน→เรียนฟรี (indent)', () => {
    const i = names.indexOf('เงินอุดหนุนทั่วไป')
    expect(names[i + 1]).toContain('รายหัว')
    expect(names[i + 2]).toContain('ปัจจัยพื้นฐาน')
    expect(names[i + 3]).toContain('เรียนฟรี')
    expect(rows[i + 1].indent).toBe(true)
  })

  it('อาหารกลางวัน/รายได้สถานศึกษา อยู่ในหมวดเงินรายได้สถานศึกษา', () => {
    const si = names.indexOf('เงินรายได้สถานศึกษา')
    expect(names[si + 1]).toContain('รายได้สถานศึกษา')
    expect(names[si + 2]).toContain('อาหารกลางวัน')
  })

  it('ภาษีหัก/ประกันสัญญา อยู่ท้ายสุด เป็นตัวหนา (strong) มีตัวเลข', () => {
    const wht = rows.find((r) => r.name.includes('ภาษีหัก'))
    const grt = rows.find((r) => r.name.includes('ประกัน'))
    expect(wht?.strong).toBe(true)
    expect(grt?.strong).toBe(true)
    expect(grt?.total).toBe(24500)
    expect(names[names.length - 2]).toContain('ภาษีหัก')
    expect(names[names.length - 1]).toContain('ประกัน')
  })
})
