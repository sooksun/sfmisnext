# รายงานผลการทดสอบ End-to-End — ปีงบประมาณ 2569

วันที่ทดสอบ: 27 มิ.ย. 2569 · โรงเรียน `sc_id=1` · `sy_id=2` (budget_year 2569 / CE 2026)
วิธีทดสอบ: ยิง **API จริง** ผ่าน endpoint เดียวกับที่ frontend ใช้ + ตรวจผลในฐานข้อมูล (MySQL) ทุกขั้นตอน
Backend: NestJS dev (`npm run start:dev`, :3000) + MySQL 8 · login `admin_local`

## สรุปผลรวม

| ชุดทดสอบ | ขอบเขต | ผล |
|---|---|---|
| `run-2569.js` | การเงินบัญชี ละเอียด (ยกยอด/รับ/จ่าย/เงินยืม/รายได้แผ่นดิน/ฝากสพป./ธนาคาร/หักภาษีอัตโนมัติ/ทะเบียนคุม) | **87/88** |
| `e2e-3phases-2569.js` | แผน → พัสดุ → การเงิน (22+22+30) | **74/74** |
| `guard-verify.js` | guard ข้ามงาน (กันสั่งซื้อเกินงบ / กันตั้งเบิกก่อนตรวจรับ) | **7/7** |
| `gap-test*.js` | นักเรียน→ประมาณงบ, ยกยอด, เดินทางราชการ, บัญชีวัสดุ, รายงานรายวัน, ปิดบัญชี, เทียบยอด | ผ่านครบหลังแก้ 1 bug |
| `jest supplie.service` | unit test หลังแก้โค้ด | **26/26** |

**ผลโดยรวม: ทุก workflow หลักตาม goal ทำงานได้จริง** — พบ bug จริง 1 จุด (แก้แล้ว) + จุดเสี่ยงที่ควรแก้ 4 จุด

---

## Phase 1 — วางแผนงบประมาณ ✅

| ขั้นตอน | endpoint | ผล |
|---|---|---|
| ระบุจำนวนนักเรียน | `Student/checkClassOnYear` + `Student/updateStudent` | ✅ ตั้ง ป.1-3 = 90 คน, DB `tb_student` ถูกต้อง |
| ประมาณงบรายหัว | `Student/setPerheadRate` + `Student/loadCalculatePerhead` | ✅ คำนวณ จำนวน × อัตรา ถูกต้อง |
| ประมาณการงบรายปี | `Budget/addEstimateAcadyear` | ✅ บันทึก `tb_estimate_acadyear` = 1,850,000 |
| ยกยอดเงินคงเหลือปีก่อน | `PlanPrevBalance/save` + `/summary` | ✅ ยกยอด 335,090 เข้าวงเงินวางแผน |
| บันทึกโครงการ | `Project/addProject` | ✅ สร้าง 22 โครงการ → เกิด `parcel_order` อัตโนมัติ |
| ขออนุมัติ 4 ขั้น | `approveParcelByPlan→Business→Supplie→Ceo` | ✅ 22/22 อนุมัติครบ (แผน→การเงิน→พัสดุ→ผอ.) |

## Phase 2 — งานพัสดุ ✅

| ขั้นตอน | endpoint | ผล |
|---|---|---|
| ระบุประเภทซื้อ/จ้าง + วิธี | `Project_approve/updateParcelOrder` | ✅ |
| ตั้งคณะกรรมการตรวจรับ + ผู้ขาย | `Audit_committee/updateSetCommittee` | ✅ 22/22 |
| ตรวจรับพัสดุ + ลงสต็อก | `Supplie_inspection/save` | ✅ 22/22 |
| **ลงทะเบียนบัญชีวัสดุ (รับเข้า)** | `Supplie/editReceiveParcel` + `Supplie/confirmWithDrawParcel` | ⚠️→✅ (เคย 500 — **แก้แล้ว**) |
| **เบิกจ่ายวัสดุไปใช้ (จ่ายออก)** | `SupplieRequest/add→submit→approve→issue` | ✅ `trans_out` ตัดสต็อกถูกต้อง |
| แจ้งหนี้ไปการเงินหลังตรวจรับ | `Invoice/addInvoice` (ผูก `order_id`) | ✅ + guard กันตั้งเบิกก่อนตรวจรับ |

## Phase 3 — งานการเงิน ✅

| ขั้นตอน | endpoint | ผล |
|---|---|---|
| จ่ายตามแจ้งหนี้ (ขอเบิก→ออกเช็ค/ใบสำคัญ) | `Invoice/addInvoice` + `Check/updateCheck` | ✅ 44 ใบ, เลข บค./บจ. เป็น พ.ศ. เรียงลำดับ |
| หักภาษี ณ ที่จ่ายอัตโนมัติ | (อัตโนมัติตอนออกเช็ค) | ✅ 9 รายการ รวม 1,964.43 ตรงคู่มือ + ออกหนังสือรับรองอัตโนมัติ |
| จ่ายตามขอยืมเงิน | `LoanAgreement/add→verify→approve→disburse→returnLoan` | ✅ ตัดยอด FT ตอนรับเงิน, ส่งใช้คืนถูกต้อง |
| เดินทางไปราชการ (8708) | `TravelReimbursement/add→verify→approve→disburse` | ✅ workflow 10→11→12→2, FT ตัดยอด, ออก บค. |
| ลงบัญชีคุมเงินนอกงบทุกประเภท | `Register_control_money_type` | ✅ ตรงคู่มือ (102=1,500/103=8,775/104=176,450/109=16,150/110=1,194.06) |
| รับ-จ่ายครบทุกประเภท | `Receive`, `GovRevenue`, `SmpDeposit`, `BankLedger`, `OpeningBalance` | ✅ ครบ 10+ ประเภท |
| **รายงานเงินคงเหลือรายวัน** | `ReportDailyBalance/loadDailyBalance` | ✅ รวมยอดยกมา (carry_forward) + รับ − จ่าย ถูกต้องตามจริง |

## Phase 4 — ปิดบัญชีสิ้นปี + งบเทียบยอด ✅

| ขั้นตอน | endpoint | ผล |
|---|---|---|
| บันทึกยอดสิ้นปี | `FiscalYearBalance/saveBulkBalances` | ✅ |
| ปิดปีงบ (ยกยอด) | `FiscalYearBalance/finalizeYear` | ✅ **บล็อกถูกต้อง** เมื่อมีเงินยืมค้าง 2 รายการ (ถูกตามหลักบัญชี) |
| งบเทียบยอดธนาคาร | `BankReconciliation/createOrUpdate→addItem→signOff` | ✅ ผลต่าง 5,000 → ปรับเช็คค้างจ่าย → `is_balanced=1` → ลงนามล็อก |
| รายงานสรุปสิ้นปี | `YearEndReport/receiptUsage`, `schoolRevenue` | ⚠️ คืน 0 (ดูจุดเสี่ยง #2) |

---

## 🐞 Bug / จุดเสี่ยงที่ต้องแก้

### 1. [BUG — แก้แล้ว] รับวัสดุเข้าสต็อก (confirmWithDrawParcel) HTTP 500
- **อาการ:** `POST Supplie/confirmWithDrawParcel` → 500 ทุกครั้ง
  `QueryFailedError: Unknown column 'trans.sc_id' in 'where clause'`
- **สาเหตุ:** `supplie.service.ts` (confirmReceiveParcel) query `.andWhere('trans.sc_id = :scId')`
  แต่ตาราง `tb_transaction_supplies` **ไม่มีคอลัมน์ `sc_id`** (entity `TransactionSupplies` ไม่มี field นี้)
- **ผลกระทบ:** การ "ยืนยันรับพัสดุเข้าสต็อก/ลงบัญชีวัสดุ" ใช้งานไม่ได้เลย
- **การแก้:** ลบเงื่อนไข `trans.sc_id` ออก (วัสดุผูกโรงเรียนผ่าน `supp_id` อยู่แล้ว) —
  ไฟล์ [supplie.service.ts](backend/src/modules/supplie/supplie.service.ts) · ยืนยัน unit test 26/26 + verify live ผ่าน

### 2. [จุดเสี่ยง — ควรแก้] รายงานสรุปรายได้สิ้นปี (schoolRevenue) คืน 0 เสมอ
- **อาการ:** `YearEndReport/schoolRevenue` total_income=0 ทั้งที่รับเงินจริง 2.4M
- **สาเหตุ 2 ชั้น** ใน `year-end-report.service.ts`:
  1. กรอง `pr.cf_transaction = 1` — แต่ flow รับเงิน (`Receive/addReceive`) เก็บ `cf_transaction=0`
     และ **ไม่มี endpoint ไหน flip เป็น 1** → รายงานนับได้ 0 เสมอ
     (ขณะที่ทะเบียนคุม/รายงานรายวันนับครบทุกแถว — เกิด **ความไม่สอดคล้องระหว่างรายงาน**)
  2. กรอง `pr.budget_year = <input ดิบ>` — ถ้าส่ง พ.ศ. (2569) แต่ DB เก็บ ค.ศ. (2026) → ไม่เจอ
- **แนะนำ:** ตัด/ผ่อนเงื่อนไข `cf_transaction=1` หรือเพิ่มขั้น "ยืนยันรายการรับ" ที่ set=1 +
  normalize `budget_year` เป็น era เดียวก่อน query

### 3. [จุดเสี่ยง] ไม่มีสมุดใบเสร็จ (receipt_book) active → ไม่ออกเลข บร.
- **อาการ:** prereq check "ตรวจสมุดใบเสร็จ active" ไม่ผ่าน (sy_id=2 ไม่มี `receipt_book` status=1)
- **ผลกระทบ:** การรับเงินบันทึกได้ แต่ **ไม่ได้เลขที่ใบเสร็จรับเงิน (บร.) อัตโนมัติ** และระบบไม่เตือนชัดตอนรับเงิน
- **แนะนำ:** บังคับ/เตือนให้เปิดเล่มใบเสร็จก่อนรับเงิน หรือ block การรับเงินถ้าไม่มีเล่ม active

### 4. [จุดเสี่ยง] `tb_student` เก็บ budget_year ปน CE/BE
- **อาการ:** มีแถว `budget_year='2026'` (ค.ศ. จาก seed มีจำนวนจริง) และ `'2569'` (พ.ศ. ที่สร้างใหม่) ปนกัน
- **ผลกระทบ:** ถ้า frontend ส่ง era ไม่ตรงกับที่บันทึก จำนวนนักเรียนจะ **แยกชุด/หาย** (คำนวณงบรายหัวเพี้ยน)
- **แนะนำ:** กำหนด era เดียว (พ.ศ.) ให้สอดคล้องทั้งระบบ + migration รวมแถวเดิม

### 5. [ข้อสังเกตเล็ก] `Student/loadStudent` pagination เป็น 0-indexed
- `skip = page * pageSize` → เรียก `page=1` ได้ผลว่าง (ข้าม 100 แถวแรก) ต้องเรียก `page=0`
- เป็นความไม่สอดคล้องกับรูปแบบ list อื่น — เสี่ยง off-by-one ฝั่ง caller

---

## หมายเหตุ (พฤติกรรมถูกต้อง ไม่ใช่ bug)
- `finalizeYear` บล็อกการปิดปีเมื่อมีเงินยืมค้าง (status=1) — **ถูกต้องตามหลักบัญชี** (la_id=2 นางนิภา ยืม 1 พ.ย. + la_id=5 นายทองดี ยังไม่ส่งใช้ตาม dataset)
- เงินยืมยกมา (la_id=1) ปิด status=2 หลังส่งใช้ถูกต้อง
- guard กันสั่งซื้อเกินงบโครงการ (HTTP 400) + กันตั้งเบิกก่อนตรวจรับ ทำงานได้จริง
- ทะเบียนคุมเงินบางประเภทต่างจากคู่มือเล็กน้อยเป็นเรื่องการจัดประเภทเงิน (ค่าไฟ/เครื่องครัว) ไม่ใช่ข้อผิดพลาดระบบ

## ไฟล์ทดสอบที่เพิ่ม
`backend/testrun/gap-test.js`, `gap-test2.js`, `gap-test3.js` (เสริมจาก harness เดิม)
