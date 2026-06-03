# Test Run — โจทย์การเงินตัวอย่าง (finance1.pdf)

ทดสอบ "ลงข้อมูลจริง" ตามคู่มือการบันทึกบัญชีหน่วยงานย่อย พ.ศ. 2544
(โรงเรียนบ้านสุขสันต์ · 1 ต.ค. – 31 ธ.ค. 2555 · ปีงบประมาณ 2556) ผ่าน **API จริง**
แล้วแก้จุดที่ "ระบบเดิมผิด" จนลงข้อมูลได้ครบทุกรายการ

## วิธีรัน

```bash
cd backend
# 1) reset sandbox (สร้างปีงบ 2556, money types 101-110, ผู้ยืม, opening loan, ล้างข้อมูลทดสอบ)
node q.js @testrun/setup.sql
# 2) replay โจทย์ทั้งหมดผ่าน API + ตรวจผล
node testrun/run.js
```

ต้องมี backend (`npm run start:dev`, :3000) + MySQL รันอยู่ ผลคาดหวัง: `SUMMARY: 89/89 steps OK`

## ขอบเขต
- โหมด: **capability test** — เน้นว่าทุกประเภทรายการ "ลงข้อมูลได้จริง" ผ่าน endpoint ที่ frontend ใช้
- Sandbox: `sc_id=1`, `school_year` ใหม่ `sy_id=3` (budget_year BE 2556 / transactional CE 2013)
- money types คู่มือ = `master_budget_income_type` id **101–110** (แยกตามทะเบียนคุมในคู่มือ)

## รายการที่ทดสอบ (ตย.2 ครบทุกวัน 3 ต.ค.–28 ธ.ค.)
| ประเภท | โมดูล/endpoint | ผล |
|---|---|---|
| ยอดยกมา (ตย.1) | `OpeningBalance/add` | ✅ bank 776,722 / ฝากส่วนราชการ 165,000 ตรงคู่มือ |
| รับเงิน (บริจาค/อุดหนุน/โอน) | `Receive/addReceive` | ✅ (รองรับหลายบรรทัด + วันที่ย้อนหลัง) |
| จ่าย (ขอเบิก→ออกเช็ค) | `Invoice/addInvoice` + `Check/updateCheck(202)` | ✅ (กรรมการตรวจรับ ≥5,000 อัตโนมัติ) |
| ภาษีหัก ณ ที่จ่าย | `Receive` (รับภาษี) + `Check` (นำส่ง) | ✅ |
| ยืม / ส่งใช้เงินยืม | `LoanAgreement/addLoanAgreement` / `returnLoan` | ✅ |
| เงินรายได้แผ่นดิน (ดอกเบี้ย/นำส่ง) | `GovRevenue/addEntry` | ✅ (หลังแก้บั๊ก) |
| นำฝากส่วนราชการ (สมุดคู่ฝาก) | `SmpDeposit/addEntry` | ✅ |
| นำฝากธนาคาร | `BankLedger/addEntry` | ✅ |

## บั๊กระบบที่พบและแก้ (ระหว่าง test run)

### Fix #1 — `GovRevenue/addEntry` บันทึกแถวว่าง (ข้อมูลหาย)
`AddGovRevenueDto` ไม่มี class-validator decorator เลย → `ValidationPipe({whitelist:true})`
ตัดทุก field ทิ้ง → service ได้ `dto = {}` → insert แถวที่ `amount=0, budget_year=null`
แต่คืน `flag:true` หลอกว่าสำเร็จ
**แก้:** เพิ่ม decorator (`@IsInt/@IsString/@IsNumber/@IsOptional`) ใน
`src/modules/gov-revenue/dto/add-gov-revenue.dto.ts`

### Fix #2 — รายงานเงินคงเหลือประจำวัน (ตย.19) ไม่รวมยอดยกมา
`ReportDailyBalance.loadDailyBalance` คิด carryForward จาก `financial_transactions` เท่านั้น
ไม่อ่าน `opening_balance` → ยอดยกมาติดลบ/ผิดทั้งระบบ
**แก้:** inject `OpeningBalance` repo + บวกยอดยกมา (balance_date < วันที่เลือก) เข้า carryForward
ผลหลังแก้: เรียนฟรี 141,500+328,645 = **470,145** ตรง ตย.11 เป๊ะ

### Fix #3 — ทะเบียนคุมเงินนอกงบประมาณ (ตย.8–16) เริ่ม balance ที่ 0
`Register_control_money_type` ไม่รวม `opening_balance` เช่นกัน
**แก้:** seed `balance/cash/bank` จากยอดยกมาของประเภทเงินนั้น + คืน `carry_forward`
ผลหลังแก้: ปัจจัยพื้นฐาน ยกมา 1,500 รับ/จ่าย 43,000 คงเหลือ **1,500** ตรง ตย.9

> ทั้ง 3 fix ผ่าน `tsc --noEmit` และชุดทดสอบเดิม **257/257 tests** ครบ

## ข้อสังเกต (ไม่ใช่บั๊ก — เป็นการจัดประเภท/นอกขอบเขต reconciliation)
- บางประเภทคงเหลือต่างจากคู่มือ เพราะการจัดประเภทเงินของบางรายการเลือกต่างจากคู่มือ
  (เช่น ค่าไฟฟ้า, อุปกรณ์เครื่องครัว) — โหมดนี้เน้น "ลงได้" ไม่ใช่กระทบยอดทุกบาท
- เงินประกันสัญญารับ/คืน บันทึกผ่าน Receive/Check + SmpDeposit (โมดูล `ContractSecurity`
  ผูกกับสัญญาจัดซื้อ `ct_id` จึงเหมาะกับงานพัสดุมากกว่าโจทย์การเงินล้วน)
