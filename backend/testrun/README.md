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

## งานอัตโนมัติ (ทดสอบด้วย `node testrun/auto.js` — 11/11)
รันหลัง `setup.sql` + `run.js` แล้วค่อย `node testrun/auto.js`

| ฟีเจอร์ | ทำงานเมื่อ | ผล |
|---|---|---|
| A. หักภาษี ณ ที่จ่ายอัตโนมัติ | ออกเช็ค (status=202) ให้ partner cal_vat 0/1 | ลงเงินภาษีเข้าทะเบียนคุมภาษี + ออกหนังสือรับรอง (status=101) |
| C. บันทึกเก็บรักษาเงินสด | รับเงินสด (receive_money_type=2) | สร้าง cash_keeping_record (ผู้รับเก็บ=ผอ.) |
| B. เตือนนำส่งภาษี | `GET Register_control_money_type/wht_remit_reminder/:sc/:sy/:year` | สรุปรายเดือน + สถานะ overdue/due_soon (กำหนดวันที่ 7 เดือนถัดไป) |
| F. เตือนเงินยืม | `GET LoanAgreement/dueReminder/:sc/:sy/:year` | รายการใกล้/เลยกำหนดคืน |
| E. เตือนเงินสดเกินวงเงิน | `GET ReportDailyBalance/cashLimitCheck/:sc` | cash/bank รวมยอดยกมาแล้ว + flag exceeded |
| D. ปิดปี→ยกยอด | `POST FiscalYearBalance/finalizeYear` | สร้าง opening_balance ปีถัดไปอัตโนมัติ (ต้องมี school_year ปีถัดไป) |
| G. เตือนดอกเบี้ยรายได้แผ่นดิน | `GET GovRevenue/interestReminder/:sc/:sy/:year` | รอบ 30 มิ.ย./30 ธ.ค. + ยอดค้างนำส่ง (>10,000 ใน 3 วันทำการ) |

> ประเภทเงินภาษีหัก ณ ที่จ่าย: ตั้ง `.env WHT_MONEY_TYPE_ID` หรือระบบค้นจากชื่อ `budget_type LIKE '%ภาษีหัก%'`

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

### Fix #4 — `UnifiedRegister` ปนข้อมูลข้ามปี + ไม่รวมยอดยกมา
`getSummary`/`getRegisterDetail` ละเลย `sy_id` (เดิม `_syId`) → รวม `financial_transactions`
ทุกปีปนกัน และไม่รวม `opening_balance`
**แก้:** กรอง `ft.sy_id = :syId` + บวกยอดยกมา + คืน `carry_forward`
([unified-register.service.ts](../src/modules/unified-register/unified-register.service.ts))

> Fix #1–4 ผ่าน `tsc --noEmit` และชุดทดสอบเดิม **257/257 tests** ครบ

### Fix #5 — เงินยืม (loan_agreement) ไม่เข้าทะเบียนคุมเงิน (เงินยืมไม่ตัดยอด)
`LoanAgreementService.addLoanAgreement/returnLoan/cancelLoan` ไม่สร้าง
`financial_transactions` เลย → การยืม/ส่งใช้เงินยืม **ไม่กระทบยอดคงเหลือของ
ประเภทเงิน** ขัดกับระบบควบคุมเงินหน่วยงานย่อย พ.ศ. 2544 (เงินยืม = ลูกหนี้/จ่าย
ในทะเบียนคุม — ตย.4/8/11) ทำให้ยอดคงเหลือ "สูงเกินจริง"
**แก้:** ผูกกับ ledger แบบเดียวกับ `fund-borrowing`
- ยืม → FT `type=-1` ตัดยอดประเภทเงิน (เก็บ `ft_borrow_id`)
- ส่งใช้ → FT `type=+1` คืน **เฉพาะเงินสด** (ใบสำคัญ = ค่าใช้จ่ายจริง ตัดไปแล้วตอนยืม)
- ยกเลิก → soft-delete FT ตอนยืม (คืนยอด)
เพิ่มคอลัมน์ `loan_agreement.ft_borrow_id / ft_return_id`
(entity + migration `1777610000000`). spec ใหม่ 4 เคส.
**ผลพิสูจน์ด้วยคู่มือ (หลังแก้ + จัดประเภท ทองดี→104, เครื่องครัว→106 ให้ตรงคู่มือ):**
| ประเภท | ระบบ | คู่มือ | |
|---|---|---|---|
| 102 ปัจจัยพื้นฐาน | 1,500 | ตย.9 1,500 | ✅ |
| 103 อาหารพักนอน | 8,775 | ตย.10 8,775 | ✅ |
| 104 เรียนฟรี 15 ปี | **176,450** | ตย.11 **176,450** | ✅ (ก่อนแก้ 193,450 ผิด) |
| 109 ประกันสัญญา | 16,150 | ตย.13 16,150 | ✅ |
| 110 ภาษีหัก ณ ที่จ่าย | 1,194.06 | ตย.12 1,194.06 | ✅ |
| 101 รายหัว | 291,042 | ตย.8 ~297,310 | ต่าง ~6.3k = คู่มือลงค่าไฟ→รายได้สถานศึกษา (จัดประเภทเฉพาะ รร.) |

### Fix #6 — guard กันจ่าย/ยืม "เกินยอดคงเหลือ" ของประเภทเงิน (ห้ามติดลบ)
ระบบเดิมยอมให้ยอดประเภทเงินติดลบได้ (เดิม harness ลงเครื่องครัวผิดทำให้ 103 = -16,725)
คู่มือ (ระบบควบคุมเงินหน่วยงานย่อย 2544) เงินแต่ละประเภทห้ามติดลบ
**แก้:** เพิ่ม `FundBalanceService` (@Global `FundBalanceModule`) คำนวณ
ยอดคงเหลือ = ยอดยกมา + รับ − จ่าย (ตรงกับ register-money-type ที่แสดง) แล้ววาง guard:
- **จ่ายเงิน** — `check.service.updateCheck` (ตอนออกเช็ค status=202) บล็อกถ้า amount > คงเหลือ
- **ยืมเงิน** — `loan-agreement.addLoanAgreement` บล็อกถ้า amount > คงเหลือ
- เปิด/ปิดด้วย config `finance.block_overspend` (default 1=เปิด) ปรับรายโรงเรียนได้
- มี epsilon 0.005 กัน float ; specs ใหม่ (loan block + check ผ่าน) ; **274/274 tests**
**ทดสอบ live:** ยืม/จ่ายเกินยอดประเภท 107 (คงเหลือ 0) → บล็อกทั้งคู่ ; รายการถูกต้องยังผ่าน 89/89

### ยังไม่แก้ (ข้อจำกัดที่รู้แล้ว — เกินขอบเขต capability test)
- `ReportDailyBalance.loadCashLimitCheck` ยังไม่รวมยอดยกมา + ไม่มี context ปีงบ
  (รับแค่ `scId`) + ระบบไม่มีรายการ "ถอนเงินจากธนาคารเป็นเงินสด" → ยอดเงินสดติดลบ
  ต้องออกแบบ fiscal-year context + internal cash/bank transfer ก่อนจึงแก้ได้ถูกต้อง

## ข้อสังเกต (ไม่ใช่บั๊ก — เป็นการจัดประเภท/นอกขอบเขต reconciliation)
- บางประเภทคงเหลือต่างจากคู่มือ เพราะการจัดประเภทเงินของบางรายการเลือกต่างจากคู่มือ
  (เช่น ค่าไฟฟ้า, อุปกรณ์เครื่องครัว) — โหมดนี้เน้น "ลงได้" ไม่ใช่กระทบยอดทุกบาท
- เงินประกันสัญญารับ/คืน บันทึกผ่าน Receive/Check + SmpDeposit (โมดูล `ContractSecurity`
  ผูกกับสัญญาจัดซื้อ `ct_id` จึงเหมาะกับงานพัสดุมากกว่าโจทย์การเงินล้วน)
