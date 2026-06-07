import type { DailyBalanceFormRow } from './official-forms'

// จัดหมวด/เรียงประเภทเงินใน "รายงานเงินคงเหลือประจำวัน" ให้ตรงคู่มือ (form-028):
//   เงินงบประมาณ → เงินรายได้แผ่นดิน → เงินนอกงบประมาณ
//     (เงินอุดหนุนทั่วไป / เงินรายได้สถานศึกษา) → ภาษีหัก ณ ที่จ่าย → ประกันสัญญา

export interface DailyBalanceItem {
  bgTypeId?: number
  name: string
  cash: number
  bank: number
  smp: number
  total: number
}

type Cat =
  | 'budget'
  | 'state_revenue'
  | 'general_subsidy'
  | 'school_income'
  | 'offbudget_other'
  | 'wht'
  | 'guarantee'

/** จับหมวดจากชื่อประเภทเงิน (robust กว่าผูก id) */
function categorize(name: string): Cat {
  const n = name || ''
  if (/ภาษีหัก/.test(n)) return 'wht'
  if (/ประกัน/.test(n)) return 'guarantee'
  if (/รายได้แผ่นดิน|ดอกเบี้ย/.test(n)) return 'state_revenue'
  if (/รายได้สถานศึกษา|อาหารกลางวัน|อปท|บริจาค/.test(n)) return 'school_income'
  if (/อุดหนุน|รายหัว|เรียนฟรี|ปัจจัยพื้นฐาน|พักนอน/.test(n)) return 'general_subsidy'
  if (/งบประมาณ/.test(n) && !/นอกงบ/.test(n)) return 'budget'
  return 'offbudget_other'
}

/** ลำดับรายการย่อยภายในหมวดเงินอุดหนุนทั่วไป (รายหัว→ปัจจัยพื้นฐาน→พักนอน→เรียนฟรี) */
function subsidyOrder(name: string): number {
  if (/รายหัว/.test(name)) return 1
  if (/ปัจจัยพื้นฐาน/.test(name)) return 2
  if (/พักนอน/.test(name)) return 3
  if (/เรียนฟรี/.test(name)) return 4
  return 9
}
/** ลำดับรายการย่อยภายในหมวดเงินรายได้สถานศึกษา */
function schoolOrder(name: string): number {
  if (/รายได้สถานศึกษา/.test(name)) return 1
  if (/อาหารกลางวัน/.test(name)) return 2
  if (/บริจาค/.test(name)) return 3
  if (/อปท/.test(name)) return 4
  return 9
}

/** จัดกลุ่ม + เรียง → แถวสำหรับ officialDailyBalanceForm (พร้อมหัวข้อหมวด/ย่อหน้า) */
export function buildDailyBalanceGroups(
  items: DailyBalanceItem[],
): DailyBalanceFormRow[] {
  const by: Record<Cat, DailyBalanceItem[]> = {
    budget: [],
    state_revenue: [],
    general_subsidy: [],
    school_income: [],
    offbudget_other: [],
    wht: [],
    guarantee: [],
  }
  for (const it of items) by[categorize(it.name)].push(it)
  by.general_subsidy.sort((a, b) => subsidyOrder(a.name) - subsidyOrder(b.name))
  by.school_income.sort((a, b) => schoolOrder(a.name) - schoolOrder(b.name))

  const rows: DailyBalanceFormRow[] = []
  const header = (name: string) =>
    rows.push({ name, cash: 0, bank: 0, smp: 0, total: 0, group: true })
  const leaf = (it: DailyBalanceItem, strong = false) =>
    rows.push({
      name: it.name,
      cash: it.cash,
      bank: it.bank,
      smp: it.smp,
      total: it.total,
      indent: !strong,
      strong,
    })

  // 1) เงินงบประมาณ
  header('เงินงบประมาณ')
  by.budget.forEach((it) => leaf(it))
  // 2) เงินรายได้แผ่นดิน
  header('เงินรายได้แผ่นดิน')
  by.state_revenue.forEach((it) => leaf(it))
  // 3) เงินนอกงบประมาณ
  header('เงินนอกงบประมาณ')
  if (by.general_subsidy.length) {
    header('เงินอุดหนุนทั่วไป')
    by.general_subsidy.forEach((it) => leaf(it))
  }
  if (by.school_income.length) {
    header('เงินรายได้สถานศึกษา')
    by.school_income.forEach((it) => leaf(it))
  }
  by.offbudget_other.forEach((it) => leaf(it))
  // 4) ภาษีหัก ณ ที่จ่าย / ประกันสัญญา (แถวตัวหนา มีตัวเลข)
  by.wht.forEach((it) => leaf(it, true))
  by.guarantee.forEach((it) => leaf(it, true))

  return rows
}
