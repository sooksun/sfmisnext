import { describe, it, expect } from 'vitest'
import {
  officialNonBudgetRegisterForm,
  type RegisterTxnRow,
} from '../lib/official-forms'

/**
 * Replay คู่มือ "ทะเบียนคุมเงินนอกงบประมาณ" ตัวอย่างที่ 8 (เงินอุดหนุนรายหัว)
 *  ยอดยกมา: ลูกหนี้ 4,110 / เงินฝากธนาคาร 356,450
 *  ลำดับรายการ ธ.ค. 2555 → ยืม / ส่งใช้หลักฐาน / คืนเงินสด / นำฝาก
 *  ตรวจว่า ฟอร์มเรนเดอร์ ลูกหนี้(วงเล็บ) / เงินสด / ธนาคาร / รวมเดือน ตรงคู่มือ
 *
 *  แถวเหล่านี้คือผลที่ backend (unified-register.getRegisterDetail) ผลิตให้
 *  (receive / payDebtor[ติดลบ=contra] / payVoucher + ยอดคงเหลือ running cash/bank/smp/debtor)
 */
const rows: RegisterTxnRow[] = [
  // 7 ธ.ค. บค.52 ค่าจ้างนายชัยบาล 5,000 — ใบสำคัญ
  { date: '2012-12-07', docNo: 'บค.52/2556', detail: 'ค่าจ้างนายชัยบาลรักษาอาคาร', payVoucher: 5000, cash: 0, bank: 351450, smp: 0, debtor: 4110 },
  // บจ.18 ค่าน้ำมันรถตัดหญ้า 500
  { date: '2012-12-07', docNo: 'บจ.18/2556', detail: 'ค่าน้ำมันรถตัดหญ้า', payVoucher: 500, cash: 0, bank: 350950, smp: 0, debtor: 4110 },
  // 11 ธ.ค. บจ.22 ค่าอุปกรณ์วิทยาศาสตร์ 6,450
  { date: '2012-12-11', docNo: 'บจ.22/2556', detail: 'ค่าอุปกรณ์วิทยาศาสตร์', payVoucher: 6450, cash: 0, bank: 344500, smp: 0, debtor: 4110 },
  // บค.58 นายสุชาติ ส่งใช้เงินยืม 4,110 — clear_voucher (ลูกหนี้ปีก่อน)
  { date: '2012-12-11', docNo: 'บค.58/2556', detail: 'นายสุชาติ ส่งใช้เงินยืม', payDebtor: -4110, payVoucher: 4110, cash: 0, bank: 344500, smp: 0, debtor: 0 },
  // 13 ธ.ค. บจ.23 ค่าวัสดุการศึกษา 18,430
  { date: '2012-12-13', docNo: 'บจ.23/2556', detail: 'ค่าวัสดุการศึกษา บ.โยธา', payVoucher: 18430, cash: 0, bank: 326070, smp: 0, debtor: 0 },
  // 24 ธ.ค. บย.3 นางสุดสวย ยืมเงิน 29,500 — lend
  { date: '2012-12-24', docNo: 'บย.3/2556', detail: 'นางสุดสวย ยืมเงินเพื่อไปราชการทักษะวิชาการ', payDebtor: 29500, cash: 0, bank: 296570, smp: 0, debtor: 29500 },
  // 28 ธ.ค. บค.78 ส่งใช้หลักฐานเงินยืม 28,760 — clear_voucher
  { date: '2012-12-28', docNo: 'บค.78/2556', detail: 'นางสุดสวยส่งใช้หลักฐานเงินยืม', payDebtor: -28760, payVoucher: 28760, cash: 0, bank: 296570, smp: 0, debtor: 740 },
  // บร 8ก 56789/12 ส่งใช้เงินสดล้างหนี้ 740 — return_cash (เงินสดในมือ+)
  { date: '2012-12-28', docNo: 'บร 8ก 56789/12', detail: 'นางสุดสวยส่งใช้เงินสดล้างหนี้เงินยืม', receive: 740, payDebtor: -740, cash: 740, bank: 296570, smp: 0, debtor: 0 },
  // Pay-in 4 นำเงินฝากธนาคาร 740 — deposit (เงินสด−/ธนาคาร+ ลงช่องใบสำคัญ)
  { date: '2012-12-28', docNo: 'Pay-in 4/2556', detail: 'นำเงินฝากธนาคาร', payVoucher: 740, cash: 0, bank: 297310, smp: 0, debtor: 0 },
]

const html = officialNonBudgetRegisterForm({
  scName: 'โรงเรียนทดสอบ',
  fundTypeName: 'เงินอุดหนุนทั่วไป (ค่าใช้จ่ายรายหัว)',
  budgetYear: '2556',
  variant: 'standard',
  opening: { cash: 0, bank: 356450, smp: 0, debtor: 4110 },
  rows,
})

describe('ทะเบียนคุมเงินนอกงบประมาณ — เงินยืม (ตย.8)', () => {
  it('หัวตารางตรงรูปคู่มือ (ตัด "จำนวนเงิน" ใต้ "รับ")', () => {
    expect(html).not.toContain('จำนวนเงิน')
    expect(html).toContain('<th>ลูกหนี้</th>')
    expect(html).toContain('<th>ใบสำคัญ</th>')
    expect(html).toContain('เงินฝากส่วนราชการผู้เบิก')
  })

  it('ยอดยกมาแสดงลูกหนี้ 4,110 และเงินฝากธนาคาร 356,450', () => {
    expect(html).toContain('ยอดยกมา')
    expect(html).toContain('4,110.00')
    expect(html).toContain('356,450.00')
  })

  it('ลงลูกหนี้ตอนยืม (29,500 บวก) และ contra ส่งใช้/คืน เป็นวงเล็บ', () => {
    expect(html).toContain('29,500.00') // ยืม — บวก
    expect(html).toContain('(28,760.00)') // ส่งใช้หลักฐาน — contra
    expect(html).toContain('(4,110.00)') // ส่งใช้เงินยืมปีก่อน — contra
    expect(html).toContain('(740.00)') // คืนเงินสด — contra
  })

  it('เงินฝากธนาคารไม่เปลี่ยนตอนส่งใช้/คืน แล้ว +740 ตอนนำฝาก = 297,310', () => {
    expect(html).toContain('297,310.00')
  })

  it('รวมเดือนนี้: รับ 740 / ใบสำคัญ 63,990 (รวม contra + นำฝาก)', () => {
    expect(html).toContain('รวมเดือนนี้')
    expect(html).toContain('63,990.00')
    expect(html).toContain('740.00')
  })
})
