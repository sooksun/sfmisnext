# LOOP_TEST_PROGRESS — สถานะการทดสอบ 3 Module

> ไฟล์ state ที่ loop อ่าน/เขียนทุกรอบ. รายงานผลละเอียดอยู่ใน `TEST_REPORT_LOOP_2569.md`.

## Sandbox ENV (ใช้ทุกสคริปต์)
```
SFMIS_TEST_SC_ID=2          # โรงเรียนบ้านเดโมวิทยา (sandbox)
SFMIS_TEST_SY_ID=3          # ภาค 2/2568 — ปีหลักที่มี transaction (sy_id=4 มีแค่ students/budget)
SFMIS_TEST_BUDGET_YEAR_CE=2026
SFMIS_TEST_BUDGET_YEAR_BE=2569
SFMIS_TEST_UP_BY=1          # admin_local (type=1 super admin → ข้าม tenant guard ไป sc_id=2 ได้)
```
Login: `admin_local` / `Admin@123` · Base: `http://127.0.0.1:3000/api`

## Bootstrap
- [x] backend health (DB up)
- [x] seed sandbox sc_id=2 (reset-sample.ts, SEED_TRUNCATE=0) — school_year sy_id 3,4 + ข้อมูลครบ แผน→พัสดุ→การเงิน
- [x] reset-sandbox.sql (scoped sc_id=2)
- [x] progress + report files
- [x] sanity API (login + list sc_id=2) — sy_id=3: Student 9 / Receive 15 / Project 8 ✅

## Checklist เมนู (สถานะ: pending / done / bug-fixed)

### Module 1 — งานนโยบายและแผน
| # | เมนู | สถานะ | bug แก้ |
|---|---|---|---|
| P1 | 1.2 เตรียมงบ/นักเรียน (Student/addStudent) | ✅ done (8/8) | 0 |
| P2 | 1.4 ตั้งค่าเงินรายหัว (setPerheadRate) | pending | - |
| P3 | 1.6/1.7 งบรายปี+วงเงิน (Budget) | pending | - |
| P4 | 1.8 โครงการ (Project/addProject) | pending | - |
| P5 | 1.8 อนุมัติโครงการ (Project_approve) | pending | - |
| P6 | 1.8 แผนจัดซื้อ (Procurement_plan) | pending | - |

### Module 2 — งานพัสดุ
| # | เมนู | สถานะ | bug แก้ |
|---|---|---|---|
| S1 | 2.2 คำขอจัดซื้อ (SupplieRequest/parcel) | pending | - |
| S2 | 2.3 รับ–ตรวจรับพัสดุ (Supplie/editReceiveParcel) | pending | - |
| S3 | 2.4 สัญญา/หลักประกัน (contract+security) | pending | - |
| S4 | 2.7 เบิกพัสดุ/ใบเบิก (requisition) | pending | - |

### Module 3 — งานการเงิน
| # | เมนู | สถานะ | bug แก้ |
|---|---|---|---|
| F1 | 3.2 รับเงิน (Receive/addReceive) | pending | - |
| F2 | 3.1/3.2 ใบเสร็จ (Receipt/addReceipt) | pending | - |
| F3 | 3.3 จ่ายเงิน/ใบสำคัญ (Invoice/addInvoice→Confirm) | pending | - |
| F4 | 3.3 สร้างเช็ค (Check/updateCheck) | pending | - |
| F5 | 3.4 เงินยืม (loan-agreement) | pending | - |
| F6 | 3.6 รายได้แผ่นดิน (GovRevenue/addEntry) | pending | - |
| F7 | 3.6 เงินฝาก/สมุดคู่ฝาก (BankLedger/addEntry) | pending | - |
| F8 | 3.7 เงินคงเหลือประจำวัน (daily-balance verify) | pending | - |
| F9 | 3.8 รายงานประจำเดือน (monthly-submission) | pending | - |

### Negative cases (guard/threshold) — แทรกในเมนูที่เกี่ยว
- [ ] G1 สั่งซื้อเกิน proj_budget → 400 (ใน P5/S1)
- [ ] G3 ตั้งเบิกก่อนตรวจรับ → 400 (ใน F3)
- [ ] WHT invoice ≥10,000 บริการ → หัก ณ ที่จ่ายอัตโนมัติ (ใน F3/F4)
- [ ] Overspend จ่ายเกินคงเหลือกองทุน → 400 (ใน F3)

## รอบถัดไป → P2 (1.4 ตั้งค่าเงินรายหัว — Student/setPerheadRate)
