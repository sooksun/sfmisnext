# SFMIS — Flowchart การทำงานอย่างละเอียด
**ระบบบริหารจัดการการเงินโรงเรียน (School Finance Management Information System)**

---

## ภาพรวมระบบ

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            SFMIS SYSTEM OVERVIEW                                │
├───────────────┬───────────────┬────────────────┬───────────────────────────────┤
│  งานนโยบาย   │  งานการเงิน   │   งานพัสดุ     │      ระบบสนับสนุน            │
│  และแผน      │               │                │                               │
│               │               │                │  • Auth / Admin               │
│  • นักเรียน  │  • รับเงิน    │  • รับพัสดุ    │  • ปีการศึกษา                │
│  • งบประมาณ  │  • จ่ายเงิน   │  • เบิกพัสดุ   │  • ธนาคาร / บัญชี            │
│  • โครงการ   │  • เช็ค       │  • คลังพัสดุ   │  • AI Assistant               │
│  • จัดซื้อ   │  • สัญญายืม   │                │  • รายงาน / ปิดปี             │
└───────────────┴───────────────┴────────────────┴───────────────────────────────┘
                          ↕ ทุก module อ้างอิง sc_id + budget_year
                          ↕ ข้อมูลรวมที่ → financial_transactions
```

---

## กลุ่มที่ 1: ระบบสนับสนุน (System Foundation)

### 1.1 การเข้าสู่ระบบ (Authentication)

```
[ผู้ใช้] → กรอก username/password
                │
                ▼
        POST /B_admin/login
                │
         ┌──────┴──────┐
         │ ตรวจสอบ     │
         │ bcrypt/MD5  │
         └──────┬──────┘
                │
     ┌──────────┴──────────┐
     │ ไม่ผ่าน             │ ผ่าน
     ▼                     ▼
  Error 401         สร้าง JWT Token
  "รหัสผ่านไม่ถูกต้อง"       │
                     ┌─────┴──────┐
                     │ Response:  │
                     │ access_token│
                     │ data {     │
                     │  admin_id  │
                     │  name      │
                     │  sc_id     │
                     │  sc_name   │
                     │  type      │
                     │ }          │
                     └─────┬──────┘
                           │
                     บันทึก localStorage
                     (access_token, data)
                           │
                           ▼
                     เข้าสู่ Dashboard
```

**ประเภทผู้ใช้ (type):**
| type | บทบาท |
|------|-------|
| 1 | Super Admin |
| 2 | Admin โรงเรียน |
| 3 | งานแผน |
| 4 | งานพัสดุ |
| 5 | งานการเงิน |
| 6 | หัวหน้าแผน |
| 7 | หัวหน้าพัสดุ |
| 8 | หัวหน้าการเงิน |

---

### 1.2 ตั้งค่าปีการศึกษา (School Year Setup)

```
[Admin] → กำหนดปีการศึกษา
                │
                ▼
    SchoolYear/addSchoolYear
    ┌─────────────────────┐
    │  school_year table  │
    │  sy_id (auto PK)    │
    │  sy_year = 2568      │
    │  budget_year = 2568  │
    │  sc_id              │
    └──────────┬──────────┘
               │
               ▼
    SchoolYear/setActiveYear (เลือกปีที่ใช้งาน)
               │
               ▼
    บันทึก localStorage['years'] = {
      sy_date: { sy_id, sy_year },
      budget_date: { sy_id, budget_year }
    }
               │
               ▼
    ทุก module ใช้ sy_id / budget_year จาก localStorage
```

---

## กลุ่มที่ 2: งานนโยบายและแผน

### 2.1 บันทึกข้อมูลนักเรียน → คำนวณงบรายหัว

```
[เจ้าหน้าที่แผน]
        │
        ▼
Student/checkClassOnYear (sc_id, sy_id)
        │
   ┌────┴─────────────────────┐
   │ ยังไม่มีแถวระดับชั้น?    │
   │                          │
   │ YES → สร้างแถวว่างทุก    │
   │       ระดับชั้น อัตโนมัติ │
   └────┬─────────────────────┘
        │
        ▼
Student/loadStudent (sc_id, sy_id)
        │
        ▼
[กรอกจำนวนนักเรียนแต่ละระดับชั้น]
        │
        ▼
Student/updateStudent
   ┌─────────────────────────┐
   │ tb_student              │
   │  std_male (ชาย)         │
   │  std_female (หญิง)      │
   │  std_total (รวม)        │
   │  edit = true (แก้ไขได้) │
   └──────────┬──────────────┘
              │
              ▼
Student/confirmSendRecord
   ┌─────────────────────────┐
   │ submitting_student_     │
   │ records                 │
   │  status = 100 (ล็อก)   │
   │  edit = false           │
   └──────────┬──────────────┘
              │
              ▼
Student/loadCalculatePerhead
   ┌──────────────────────────────┐
   │ คำนวณงบ = จำนวนนักเรียน ×   │
   │           งบประมาณต่อหัว     │
   │ ตาม master_moe_policy /      │
   │      master_obec_policy      │
   └──────────────────────────────┘
              │
              ▼
   [งบประมาณรายหัวที่โรงเรียนได้รับ]
              │
              ▼
   ป้อนเข้า → กำหนดวงเงินงบประมาณ (2.2)
```

---

### 2.2 กำหนดวงเงินงบประมาณ

```
[เจ้าหน้าที่แผน]
        │
        ▼
Budget/checkBudgetCategoryOnYear
        │
   ┌────┴──────────────────────────┐
   │ ยังไม่มีหมวดงบปีนี้?          │
   │ YES → สร้างหมวดอัตโนมัติ      │
   │       จาก master_budget_      │
   │       income_type             │
   └────┬──────────────────────────┘
        │
        ▼
Budget/loadEstimateAcadyearGroup
   ┌──────────────────────────────────────┐
   │ หมวดงบประมาณ (pln_budget_category)  │
   │                                      │
   │ ├── งบดำเนินการ                      │
   │ │     └── ค่าจ้างชั่วคราว            │
   │ │     └── ค่าวัสดุ                   │
   │ ├── งบลงทุน                          │
   │ │     └── ค่าครุภัณฑ์                │
   │ │     └── ค่าที่ดินและสิ่งก่อสร้าง  │
   │ └── งบบุคลากร                        │
   │       └── เงินเดือน                  │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   Budget/addPLNBudgetCategory (บันทึกวงเงินประมาณการ)
   Budget/updateRealBudget    (อัปเดตงบจริงที่ได้รับ)
                      │
                      ▼
   ┌─────────────────────────────────┐
   │ tb_estimate_acadyear            │
   │  ea_budget   = งบประมาณ         │
   │  real_budget = งบจริง           │
   │  budget_year = '2568'           │
   └──────────────────┬──────────────┘
                      │
                      ▼
   [งบประมาณพร้อมใช้งาน → สร้างโครงการ (2.3)]
```

---

### 2.3 สร้างโครงการและแผนจัดซื้อ

```
[เจ้าหน้าที่แผน]
        │
        ▼
Project/addProject
   ┌─────────────────────────┐
   │ pln_project             │
   │  proj_name              │
   │  proj_budget            │
   │  bg_type_id (หมวดงบ)    │
   │  sy_id, sc_id           │
   └──────────┬──────────────┘
              │
              ▼
Project_approve/addProjectApprove
   ┌──────────────────────────────┐
   │ parcel_order                 │
   │  order_status = 1 (ยื่นคำขอ) │
   │  acad_year = budget_year      │
   │  po_type = ประเภทการจัดหา    │
   │    1 = จัดซื้อ               │
   │    2 = จัดจ้าง               │
   │    3 = เช่า                  │
   └──────────────────────────────┘
              │
              ▼
   [กระบวนการอนุมัติ 3 ชั้น → 2.4]
```

---

### 2.4 Workflow อนุมัติโครงการ (3 ชั้น)

```
parcel_order.order_status:

[เจ้าหน้าที่ยื่น]
        │
        ▼
order_status = 1 (รออนุมัติแผน)
        │
        ▼
[หัวหน้าแผน] → Project_approve/approveParcelByPlan
        │
   ┌────┴────┐
   │อนุมัติ  │ปฏิเสธ
   ▼         ▼
order_status=2    order_status=0
(ผ่านแผน)   (ส่งคืน+เหตุผล)
        │
        ▼
[หัวหน้าการเงิน] → Project_approve/approveParcelByBusiness
        │
   ┌────┴────┐
   │อนุมัติ  │ปฏิเสธ
   ▼         ▼
order_status=3    order_status=0
(ผ่านการเงิน) (ส่งคืน+เหตุผล)
        │
        ▼
[ผู้อำนวยการ] → Project_approve/approveParcelByCeo
        │
   ┌────┴────┐
   │อนุมัติ  │ปฏิเสธ
   ▼         ▼
order_status=4    order_status=0
(ผ่าน ผอ.)   (ส่งคืน+เหตุผล)
        │
        ▼
[AuditCommittee/assignCommittee]
   กำหนดคณะกรรมการตรวจรับพัสดุ
        │
        ▼
[งานพัสดุ → รับพัสดุ (กลุ่มที่ 4)]
[งานการเงิน → ออกใบขอเบิก (กลุ่มที่ 3)]
```

---

## กลุ่มที่ 3: งานการเงิน

### 3.1 กระบวนการรับเงิน (Income)

```
[เจ้าหน้าที่การเงิน]
        │
        ▼
Receive/loadAutoAddReceive (sc_id, sy_id)
   → สร้างเลข PR อัตโนมัติ (DocCounter)
        │
        ▼
Receive/addReceive
   ┌──────────────────────────────────┐
   │ pln_receive                      │
   │  pr_no = 'PR-2568-0001'          │
   │  receive_money_type              │
   │    1 = เงินอุดหนุนทั่วไป        │
   │    2 = เงินอุดหนุนเฉพาะกิจ      │
   │    3 = เงินรายได้                │
   │  cf_transaction = 0 (รอยืนยัน)  │
   └──────────────────────────────────┘
   ┌──────────────────────────────────┐
   │ pln_receive_detail               │
   │  (รายละเอียดรายการรับเงิน)       │
   └──────────────────────────────────┘
        │
        ▼
[หัวหน้าการเงินยืนยัน]
Receive/confirmReceive
   cf_transaction = 1 (ยืนยันแล้ว)
        │
        ▼
Receipt/loadReceive (ดึงรายการที่ cf_transaction=1)
        │
        ▼
Receipt/addReceipt
   ┌──────────────────────────────────┐
   │ receipt                          │
   │  rec_no = เลขใบเสร็จ             │
   │  rec_status = '1' (ออกแล้ว)     │
   │  amount                          │
   └──────────────────────────────────┘
        │
        ▼
   ┌───────────────────────────────────┐
   │ financial_transactions (บันทึก)   │
   │  type = 1 (รายรับ)               │
   │  amount                           │
   │  bg_type_id (ประเภทเงิน)          │
   │  sc_id, create_date               │
   └───────────────────────────────────┘
        │
        ▼
   [อัปเดต DailyBalance / BankLedger]
```

---

### 3.2 กระบวนการจ่ายเงิน (Expense)

```
[เจ้าหน้าที่การเงิน / ผู้ขอเบิก]
        │
        ▼
Invoice/addInvoice (สร้างใบขอเบิก)
   ┌────────────────────────────────────┐
   │ request_withdraw                    │
   │  rw_id (PK)                        │
   │  no_doc = เลขที่ใบขอเบิก           │
   │  payment_type = ประเภทการจ่าย      │
   │    1 = จ่ายตรง                     │
   │    2 = จ่ายผ่านธนาคาร             │
   │  bg_type_id = หมวดงบ              │
   │  amount = จำนวนเงิน               │
   │  status = 0 (รอการเงิน)            │
   └───────────────────┬────────────────┘
                       │
                       ▼
   [เจ้าหน้าที่การเงิน]
   Invoice/loadConfirmInvoice
   Invoice/ConfirmInvoice
      status = 100 (การเงินอนุมัติ)
                       │
                       ▼
   [ผู้อำนวยการ]
   Invoice/approveByCeo
      status = 200 (ผอ.อนุมัติ)
                       │
                       ▼
   Invoice/setReadyForCheck
      status = 201 (รอออกเช็ค)
                       │
                       ▼
   Check/loadAutoNoCheck → สร้างเลขเช็คอัตโนมัติ
                       │
                       ▼
   Check/updateCheck (ออกเช็ค)
   ┌──────────────────────────────────┐
   │ request_withdraw                  │
   │  status = 202 (ออกเช็คแล้ว)     │
   │  check_no_doc = เลขที่เช็ค       │
   │  offer_check_date = วันที่ออกเช็ค│
   └───────────────────┬──────────────┘
                       │
         ┌─────────────┴─────────────┐
         │ มีภาษีหัก ณ ที่จ่าย?      │
         │                           │
         │ YES                 NO    │
         ▼                     ▼     │
   Withholding              บันทึก   │
   Certificate              ตรงไป    │
   (cal_vat=0/1)                     │
         │                           │
         └─────────────┬─────────────┘
                       │
                       ▼
   ┌───────────────────────────────────┐
   │ financial_transactions (บันทึก)   │
   │  type = -1 (รายจ่าย)             │
   │  amount                           │
   │  bg_type_id (หมวดงบ)             │
   │  rw_id (อ้างอิงใบขอเบิก)         │
   └───────────────────────────────────┘
                       │
                       ▼
   [อัปเดต DailyBalance / BankLedger / CheckControl]
```

**สถานะใบขอเบิก (request_withdraw.status):**
```
0   → รอการเงิน
100 → การเงินอนุมัติ
101 → (เฉพาะ loan) กำลังดำเนินการ
102 → (เฉพาะ loan) ออกเช็คแล้ว
200 → ผอ.อนุมัติ
201 → รอออกเช็ค
202 → ออกเช็คแล้ว ✓
```

---

### 3.3 ภาษีหัก ณ ที่จ่าย (Withholding Certificate)

```
[เมื่อออกเช็ค และมีภาษี]
        │
        ▼
RegistrationCertificate/addWithholding
   ┌─────────────────────────────────────┐
   │ withholding_certificate              │
   │  rw_id (อ้างอิงใบขอเบิก)           │
   │  cal_vat                             │
   │    0 = ไม่มี VAT                    │
   │       deduct = amount × 0.01        │
   │    1 = มี VAT                       │
   │       vat = amount−(amount×7/107)   │
   │       deduct = vat × 0.01           │
   │  status = 100 (กำลังดำเนินการ)     │
   └──────────────────┬──────────────────┘
                      │
                      ▼
   [ออกหนังสือ] → status = 101 (ล็อก แก้ไขไม่ได้)
```

---

### 3.4 สัญญายืมเงิน (Loan Agreement)

```
[ผู้ยืม/เจ้าหน้าที่]
        │
        ▼
LoanAgreement/addLoan
   ┌──────────────────────────────────┐
   │ loan_agreement                    │
   │  la_no = เลขที่สัญญา             │
   │  borrower_name                    │
   │  amount                           │
   │  borrow_date                      │
   │  loan_category                    │
   │    1 = เดินทาง (ต้องคืนใน 15 วัน)│
   │    2 = อื่นๆ (ต้องคืนใน 30 วัน) │
   │  due_date                         │
   │  status = 1 (ยืมอยู่)            │
   └──────────────────┬───────────────┘
                      │
             [ครบกำหนด / คืนเงิน]
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
   คืนเป็นเงินสด          คืนด้วยใบสำคัญ
   LoanAgreement/         (rw_id ใหม่)
   returnCash
         │                         │
         └────────────┬────────────┘
                      │
                      ▼
   status = 2 (คืนแล้ว)
   returned_date = วันที่คืน
   return_cash = เงินสดที่คืน
   return_voucher_amount = ยอดใบสำคัญ
                      │
                      ▼
   [AI Alert: เกิน 15/30 วัน → แจ้งเตือน Overdue]
```

---

### 3.5 งบเทียบยอดธนาคาร (Bank Reconciliation)

```
[เจ้าหน้าที่การเงิน - รายเดือน]
        │
        ▼
BankReconciliation/upsert
   ┌──────────────────────────────────┐
   │ bank_reconciliation              │
   │  book_balance   = ยอดตามบัญชี   │
   │  bank_balance   = ยอดตาม statement│
   │  difference     = ผลต่าง         │
   │  is_balanced    = 0 (ยังไม่สมดุล)│
   └──────────────────┬───────────────┘
                      │
         ┌────────────┴────────────┐
         │ difference = 0?         │
         │                         │
         │ YES               NO    │
         ▼                   ▼     │
   is_balanced=1       ตรวจสอบ    │
                        รายการ    │
                        ผิดปกติ   │
                           │       │
                           └───────┘
                      │
                      ▼
   [ผู้อำนวยการลงนาม] → signOff
   FinancialAudit/signMonthly
        │
        ▼
   [AI Alert: is_balanced=0 → แจ้งเตือน]
```

---

### 3.6 ปิดบัญชีสิ้นปีงบประมาณ (Fiscal Year Close)

```
[ผู้อำนวยการ / หัวหน้าการเงิน]
        │
        ▼
FiscalYearBalance/saveBulkBalances
   ┌──────────────────────────────────┐
   │ fiscal_year_balance              │
   │  ยอดยกมา (carried forward)       │
   │  ยอดรับรวม                       │
   │  ยอดจ่ายรวม                      │
   │  ยอดคงเหลือ                      │
   │  แยกตาม bg_type_id               │
   └──────────────────┬───────────────┘
                      │
                      ▼
FiscalYearBalance/finalizeYear
   ┌──────────────────────────────────┐
   │ is_finalized = true              │
   │ finalized_by = admin_id          │
   │ finalized_at = NOW()             │
   └──────────────────────────────────┘
                      │
                      ▼
   [สร้างปีงบประมาณใหม่ → SchoolYear]
   [ยอดคงเหลือยกไปปีหน้า]
```

---

## กลุ่มที่ 4: งานพัสดุ

### 4.1 รับพัสดุ (Goods Receiving)

```
[หลัง order_status = 4 (ผอ.อนุมัติแล้ว)]
        │
        ▼
[งานพัสดุ]
Supplie/loadReceive (ดึงรายการที่ order_status=4)
        │
        ▼
Supplie/editReceiveParcel
   ┌──────────────────────────────────┐
   │ receive_parcel_order             │
   │  rpo_id (PK)                     │
   │  order_id → parcel_order         │
   │  receive_date                    │
   │  receive_status = 0 (รอตรวจรับ) │
   └──────────────────────────────────┘
   ┌──────────────────────────────────┐
   │ receive_parcel_detail            │
   │  (รายละเอียดพัสดุแต่ละรายการ)   │
   │  qty_received (จำนวนที่รับจริง) │
   └──────────────────────────────────┘
        │
        ▼
[คณะกรรมการตรวจรับ] → AuditCommittee/confirmReceive
        │
        ▼
Supplie/confirmReceiveParcel
   ┌──────────────────────────────────┐
   │ receive_status = 1 (รับแล้ว)    │
   └──────────────────────────────────┘
        │
        ▼
   ┌─────────────────────────────────────┐
   │ tb_supplies (คลังพัสดุ)            │
   │  supp_stock += qty_received         │
   │  (สต็อกเพิ่มขึ้น)                  │
   └─────────────────────────────────────┘
        │
        ▼
   [พัสดุพร้อมเบิกใช้ → 4.2]
```

---

### 4.2 เบิกพัสดุ (Supply Withdrawal)

```
[เจ้าหน้าที่ที่ต้องการเบิก]
        │
        ▼
Supplie/loadParcelDetailWithdraw
   (ดูรายการพัสดุในคลัง + สต็อกคงเหลือ)
        │
        ▼
Supplie/requestWithdraw (ยื่นคำขอเบิก)
        │
        ▼
[หัวหน้าพัสดุ] → Supplie/updateSupplieOrder (อนุมัติ)
        │
        ▼
Supplie/confirmWithDrawParcel
   ┌──────────────────────────────────┐
   │ tb_supplies                       │
   │  supp_stock -= qty_withdrawn      │
   │  (สต็อกลดลง)                     │
   └──────────────────────────────────┘
   ┌──────────────────────────────────┐
   │ tb_transaction_supplies          │
   │  (บันทึกการเคลื่อนไหวพัสดุ)     │
   │  trans_type = 'withdraw'          │
   │  qty, date, by                   │
   └──────────────────────────────────┘
        │
        ▼
   [GeneralDb/loadSupplieStock → แสดงสต็อกปัจจุบัน]
```

---

## กลุ่มที่ 5: รายงานและการตรวจสอบ

### 5.1 รายงานประจำวัน

```
[ทุกวันทำการ]
        │
        ▼
ReportDailyBalance/loadDailyBalance
   ┌──────────────────────────────────────────┐
   │ สรุปจาก financial_transactions            │
   │  รายรับวันนี้   = SUM(amount) type=1      │
   │  รายจ่ายวันนี้  = SUM(amount) type=-1     │
   │  ยอดคงเหลือ    = ยอดยกมา + รับ - จ่าย  │
   │  แยกตาม bg_type_id                       │
   └──────────────────────────────────────────┘
        │
        ▼
FinancialAudit/signDaily (เจ้าหน้าที่ลงนาม)
        │
        ▼
   [ผู้อำนวยการ] → FinancialAudit/signMonthly (ลงนามรายเดือน)
```

---

### 5.2 AI Assistant (ระบบช่วยวิเคราะห์)

```
[ผู้ใช้ถามผ่าน Chat Widget]
        │
        ▼
POST /ai/chat/stream
   ┌──────────────────────────────────────┐
   │ BuildSystemPrompt (ดึงข้อมูลจาก DB) │
   │  • รายรับ-รายจ่ายรวม               │
   │  • แยกตามประเภทเงินทุกหมวด         │
   │  • ใบขอเบิกค้างอนุมัติ             │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   [ส่งให้ Google Gemini / Ollama]
                      │
          ┌───────────┴──────────┐
          │ Gemini (ซับซ้อน)    │ Ollama (ง่าย)
          ▼                      ▼
   วิเคราะห์ + ตอบ         จำแนก/ตรวจสอบ
          │                      │
          └───────────┬──────────┘
                      │
                      ▼
   [SSE Stream → แสดง typing effect ใน Chat]

GET /ai/validate/alerts/:scId/:budgetYear
   ┌──────────────────────────────────────┐
   │ ตรวจสอบอัตโนมัติ:                   │
   │  • สัญญายืมเงินเกินกำหนด            │
   │  │  (>15 วัน เดินทาง / >30 วัน อื่น)│
   │  • งบประมาณเกินวงเงิน               │
   │  • งบเทียบยอดไม่สมดุล              │
   │  • ใบขอเบิกซ้ำ                      │
   │  • เช็คค้างนาน (>90 วัน)           │
   └──────────────────────────────────────┘

POST /ai/analyze/monthly-summary
POST /ai/analyze/budget-utilization
POST /ai/analyze/spending-trend
   → Gemini วิเคราะห์และสรุปภาษาไทย

POST /ai/merge/excel-mapping
   → AI แนะนำ column mapping Excel → DB
   → confidence score 0-1 ต่อ column
```

---

## Data Flow รวมทั้งระบบ

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SFMIS COMPLETE DATA FLOW                                │
└─────────────────────────────────────────────────────────────────────────────────┘

  [ตั้งต้น]
  SchoolYear → sy_id + budget_year (ใช้ทุก module)
       │
       ▼
  [งานแผน]
  Student (จำนวนนักเรียน)
       │
       ▼
  Budget (วงเงินงบประมาณ) ─────────────────┐
       │                                     │
       ▼                                     │
  Project (โครงการ)                          │
       │                                     │
       ▼                                     │
  Parcel Order ──→ อนุมัติ 3 ชั้น           │
  (order_status 1→4)                         │
       │                                     │
       ├──────────────────────┐              │
       ▼                      ▼              │
  [งานพัสดุ]           [งานการเงิน]         │
  รับพัสดุ              Invoice              │
  tb_supplies           (status 0→202)       │
  supp_stock ↑               │              │
       │                     ▼              │
  เบิกพัสดุ              Check              │
  supp_stock ↓          (เช็ค/โอน)          │
                              │              │
  [งานการเงิน]               ▼              │
  รับเงิน ─────────→ financial_transactions ←┘
  pln_receive        type=1 (รับ)
  receipt            type=-1 (จ่าย)
                              │
                    ┌─────────┼──────────┐
                    ▼         ▼          ▼
              DailyBalance  Bank      BankRecon-
              Report        Ledger    ciliation
                    │         │          │
                    └─────────┼──────────┘
                              │
                              ▼
                    FinancialAudit (ลงนาม)
                              │
                              ▼
                    FiscalYearBalance (ปิดปี)
                              │
                              ▼
                    [ยกยอดไปปีงบประมาณใหม่]
```

---

## สรุป Status Codes สำคัญ

### parcel_order.order_status
| สถานะ | ความหมาย | ผู้ดำเนินการ |
|-------|----------|------------|
| 1 | ยื่นคำขอ | เจ้าหน้าที่ |
| 2 | แผนอนุมัติ | หัวหน้าแผน |
| 3 | การเงินอนุมัติ | หัวหน้าการเงิน |
| 4 | ผอ.อนุมัติ ✓ | ผู้อำนวยการ |
| 0 | ปฏิเสธ | (ทุกชั้น) |

### request_withdraw.status (ใบขอเบิก)
| สถานะ | ความหมาย |
|-------|----------|
| 0 | รอการเงินพิจารณา |
| 100 | การเงินอนุมัติ |
| 200 | ผอ.อนุมัติ |
| 201 | รอออกเช็ค |
| 202 | ออกเช็คแล้ว ✓ |

### loan_agreement.status
| สถานะ | ความหมาย |
|-------|----------|
| 1 | กำลังยืม (ยังไม่คืน) |
| 2 | คืนแล้ว ✓ |

### withholding_certificate.status
| สถานะ | ความหมาย |
|-------|----------|
| 100 | กำลังดำเนินการ (แก้ไขได้) |
| 101 | ออกหนังสือแล้ว (ล็อก) |

### receive_parcel_order.receive_status
| สถานะ | ความหมาย |
|-------|----------|
| 0 | รอคณะกรรมการตรวจรับ |
| 1 | รับแล้ว ✓ |

---

*สร้างโดย Claude | SFMIS v1.0 | อัปเดต 2026-04-16*
