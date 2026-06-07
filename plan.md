## แผนการพัฒนา Backend/Frontend - SFMIS System

**เครื่องหมายการตรวจสอบ:** `(ดำเนินการแล้ว)` = พบการพัฒนาใน repository แล้ว (ตรวจจาก `backend/src/app.module.ts`, โฟลเดอร์ `frontend/app`, และ `package.json` วันที่ 2026-05-12)

### 1. เป้าหมายหลัก **(อัปเดตสอดคล้อง repo — ดำเนินการแล้ว)**
- **รองรับ API ตามกรอบงาน** ตามที่ระบุใน `context.md` และขยายโมดูลเพิ่มใน `backend/src/app.module.ts` **(ดำเนินการแล้ว)**
- **Frontend หลัก: Next.js (`frontend/`)** — ไม่มี Angular ใน repo นี้แล้ว (legacy ถอดออก) **(ดำเนินการแล้ว)**
- **Backend: NestJS + TypeORM + MySQL** **(ดำเนินการแล้ว)**

### 2. สถานะการพัฒนา (ตามกรอบงาน)

**Phase 1–6:** รายการด้านล้างสอดคล้องกับ `backend/src/app.module.ts` และโครงสร้าง frontend — **(ดำเนินการแล้ว)**

#### ✅ Phase 1 – Core & Authentication (เสร็จสมบูรณ์) **(ดำเนินการแล้ว)**
- ตั้งค่า NestJS, TypeORM, `.env`
- สร้าง `AdminModule` (login, load, update, remove)
- `AuthModule` + JWT (`JwtAuthGuard`, `@Public()`) — Next.js เรียก API ผ่าน Bearer token / NextAuth **(ดำเนินการแล้ว)**
- จัดการข้อมูลผู้ใช้งาน (Users)

#### ✅ Phase 2 – Dashboard & School Year (เสร็จสมบูรณ์) **(ดำเนินการแล้ว)**
- `DashboardModule` (chart, summary, predictBudget)
- `SchoolYearModule` (CRUD ปีการศึกษา, change_year, check_year)
- เชื่อมหน้า Dashboard/Project ใน **Next.js** ให้ทำงานกับ API โดยไม่ error 500/404

#### ✅ Phase 3 – Master Data & Settings (เสร็จสมบูรณ์) **(ดำเนินการแล้ว)**
- `SchoolModule` (ข้อมูลโรงเรียน)
- `GeneralDbModule` (Unit, Type Supplies, Supplies, Partner)
- `SettingsModule` (Policy/QuickWin/SAO/MOE/OBEC, Classroom Budget, Budget Type)
- `PolicyModule` (Budget Income Type)

#### ✅ Phase 4 – Project & Budget Flow (เสร็จสมบูรณ์) **(ดำเนินการแล้ว — มีโค้ดใน repo)**
- `ProjectModule` (โครงการ CRUD) + `ProjectApproveModule` (ขอซื้อ/ขอจ้าง, อนุมัติหลายชั้น)
- `BudgetModule` (งบประมาณรวมรายปี, กำหนดวงเงินงบประมาณ)
- `StudentModule` (บันทึกข้อมูลนักเรียน, คำนวณงบจากรายหัว)

#### ✅ Phase 5 – Supplie & Transaction Flow (เสร็จสมบูรณ์) **(ดำเนินการแล้ว)**
- `SupplieModule` (ตรวจรับพัสดุ, เบิกพัสดุ, อนุมัติเบิกพัสดุ)
- `AuditCommitteeModule` (แต่งตั้งคณะกรรมการ)
- `BankModule` (บัญชีธนาคาร, ผูกบัญชีธนาคารกับประเภทเงิน)
- `ReceiveModule` (รับเงินเข้าบัญชี, รับเงินเหลือจ่ายปีเก่า)
- `ReceiptModule` (ใบเสร็จรับเงิน)
- `InvoiceModule` (ขอเบิก, ผอ. อนุมัติขอเบิก)
- `CheckModule` (ออกเช็ค)

#### ✅ Phase 6 – Reports (เสร็จสมบูรณ์) **(ดำเนินการแล้ว)**
- `ReportDailyBalanceModule` (รายงานคงเหลือประจำวัน)
- `ReportCheckControlModule` (ลงทะเบียนควบคุมเช็ค)
- `ReportBookbankModule` (ลงทะเบียนควบคุมบัญชีธนาคาร)
- `RegisterMoneyTypeModule` (ทะเบียนคุมหน้างบใบสำคัญคู่จ่าย, ลงทะเบียนควบคุมประเภทเงิน)

### 3. หลักการออกแบบร่วมกันทุกโมดูล **(ดำเนินการแล้ว — ใช้ในโค้ด backend)**
- **Pattern Response**
  - สำหรับ list: `{ data: any[], count: number, page: number, pageSize: number }`
  - สำหรับ create/update/delete: `{ flag: boolean, ms: string }`
- **Soft Delete**
  - ใช้ field `del` = 0/1
- **Audit Fields**
  - `up_by`, `cre_date`, `up_date`
- **Mapping ตามฐานข้อมูลเดิม**
  - ชื่อตาราง/คอลัมน์ ยึดจาก `sfmisystem_db/*.sql`
  - ใช้ Entity แยกตามตาราง + DTO แยกตาม use-case

### 4. กรอบงานที่ดำเนินการเสร็จแล้ว

#### งานนโยบายและแผน ✅
- ✅ บันทึกข้อมูลนักเรียน (`StudentModule`)
- ✅ คำนวณงบจากรายหัว (`StudentModule`)
- ✅ งบประมาณรวมรายปี (`BudgetModule`)
- ✅ กำหนดวงเงินงบประมาณ (`BudgetModule`)
- ✅ โครงการ CRUD (`ProjectModule`) และคำขอซื้อ/อนุมัติ (`ProjectApproveModule`) **(ดำเนินการแล้ว)**
- ✅ ตั้งค่าฐานข้อมูลโรงเรียน (`AdminModule`, `SettingsModule`)
- ✅ นโยบายโรงเรียน (`SettingsModule`)
- ✅ นโยบาย สพท (`SettingsModule`)

#### งานหัวงานนโยบายและแผน ✅
- ✅ การอนุมัติ (หัวงานนโยบายและแผน) (`ProjectApproveModule`)

#### งานการเงิน ✅
- ✅ การรับเงิน (`ReceiveModule`)
  - ✅ รับเงินเข้าบัญชี
  - ✅ รับเงินเหลือจ่ายปีเก่า
- ✅ การจ่ายเงิน (`InvoiceModule`, `CheckModule`)
  - ✅ ขอเบิก
  - ✅ ออกเช็ค
- ✅ รายงานการเงิน (`ReceiptModule`, `ReportDailyBalanceModule`, `ReportCheckControlModule`, `ReportBookbankModule`, `RegisterMoneyTypeModule`)
  - ✅ ใบเสร็จรับเงิน
  - ✅ รายงานคงเหลือประจำวัน
  - ✅ ลงทะเบียนควบคุมเช็ค
  - ✅ ลงทะเบียนควบคุมบัญชีธนาคาร
  - ✅ ทะเบียนคุมหน้างบใบสำคัญคู่จ่าย(บจ./บค.)
  - ✅ ลงทะเบียนควบคุมประเภทเงิน
- ✅ ตั้งค่าการเงิน (`BankModule`, `GeneralDbModule`)
  - ✅ บัญชีธนาคาร
  - ✅ ผูกบัญชีธนาคารกับประเภทเงิน
  - ✅ ผู้รับเงิน/ห้างร้าน

#### งานพัสดุ ✅
- ✅ แต่งตั้งคณะกรรมการ (`AuditCommitteeModule`)
- ✅ ขอซื้อ/ขอจ้าง (`ProjectApproveModule`)
- ✅ ตรวจรับพัสดุ (`SupplieModule`)
- ✅ บัญชีวัสดุ (`GeneralDbModule`)
- ✅ เบิกพัสดุ (`SupplieModule`)
- ✅ ตั้งค่างานพัสดุ (`GeneralDbModule`)
  - ✅ ประเภทพัสดุ
  - ✅ หน่วยการนับ
- ✅ อนุมัติใช้งบประมาณ (`ProjectApproveModule`)
- ✅ อนุมัติเบิกพัสดุ (`SupplieModule`)

#### งานผู้อำนวยการ ✅
- ✅ การอนุมัติ (งาน ผอ.) (`ProjectApproveModule`, `InvoiceModule`)
  - ✅ ผอ. อนุมัติโครงการ
  - ✅ ผอ. อนุมัติใช้งบประมาณ
  - ✅ ผอ. อนุมัติขอเบิก
- ✅ รายงาน (`ReceiptModule`, `ReportDailyBalanceModule`, `ReportCheckControlModule`, `ReportBookbankModule`, `RegisterMoneyTypeModule`)
  - ✅ ใบเสร็จรับเงิน
  - ✅ รายงานคงเหลือประจำวัน
  - ✅ ลงทะเบียนควบคุมเช็ค
  - ✅ ลงทะเบียนควบคุมบัญชีธนาคาร
  - ✅ ทะเบียนคุมหน้างบใบสำคัญคู่จ่าย(บจ./บค.)
  - ✅ ลงทะเบียนควบคุมประเภทเงิน
- ✅ ตั้งค่าฐานข้อมูลโรงเรียน (`AdminModule`, `SettingsModule`)
  - ✅ ข้อมูลผู้ใช้งาน (Users)
  - ✅ นโยบายโรงเรียน
  - ✅ นโยบาย สพท

### 5. Backend Modules ที่ลงทะเบียนใน `AppModule` **(ดำเนินการแล้ว)**

เดิมเอกสารนับเฉพาะกรอบ **21 โมดูลหลัก** — ปัจจุบัน backend มีโมดูลฟีเจอร์เพิ่ม (รวมที่ import ใน `app.module.ts`) ดังนี้:

#### กรอบงานเดิม (21 โมดูล) **(ดำเนินการแล้ว)**

1. ✅ **AdminModule** — จัดการผู้ใช้งานและผู้ดูแลระบบ **(ดำเนินการแล้ว)**
2. ✅ **DashboardModule** — Dashboard และรายงานสรุป **(ดำเนินการแล้ว)**
3. ✅ **SchoolYearModule** — จัดการปีการศึกษา **(ดำเนินการแล้ว)**
4. ✅ **SchoolModule** — ข้อมูลโรงเรียน **(ดำเนินการแล้ว)**
5. ✅ **GeneralDbModule** — Unit, Type Supplies, Supplies, Partner **(ดำเนินการแล้ว)**
6. ✅ **PolicyModule** — นโยบาย/ข้อมูลพื้นฐาน **(ดำเนินการแล้ว)**
7. ✅ **StudentModule** — นักเรียน, งบรายหัว **(ดำเนินการแล้ว)**
8. ✅ **BudgetModule** — งบรวมรายปี, วงเงิน **(ดำเนินการแล้ว)**
9. ✅ **SettingsModule** — นโยบายโรงเรียน / สพท. **(ดำเนินการแล้ว)**
10. ✅ **ProjectModule** + **ProjectApproveModule** — โครงการ (`pln_project`) + ขอซื้อ/อนุมัติ (`parcel_order`) **(ดำเนินการแล้ว)**
11. ✅ **ReceiveModule** — รับเงิน **(ดำเนินการแล้ว)**
12. ✅ **ReceiptModule** — ใบเสร็จรับเงิน **(ดำเนินการแล้ว)**
13. ✅ **InvoiceModule** — ขอเบิก **(ดำเนินการแล้ว)**
14. ✅ **CheckModule** — ออกเช็ค **(ดำเนินการแล้ว)**
15. ✅ **BankModule** — บัญชีธนาคาร, ผูกประเภทเงิน **(ดำเนินการแล้ว)**
16. ✅ **SupplieModule** — ตรวจรับ/เบิก/อนุมัติเบิก **(ดำเนินการแล้ว)**
17. ✅ **AuditCommitteeModule** — คณะกรรมการ **(ดำเนินการแล้ว)**
18. ✅ **ReportDailyBalanceModule** — คงเหลือประจำวัน **(ดำเนินการแล้ว)**
19. ✅ **ReportCheckControlModule** — ทะเบียนเช็ค **(ดำเนินการแล้ว)**
20. ✅ **ReportBookbankModule** — ทะเบียนบัญชีธนาคาร **(ดำเนินการแล้ว)**
21. ✅ **RegisterMoneyTypeModule** — ทะเบียนคุมหน้างบ/ประเภทเงิน **(ดำเนินการแล้ว)**

#### โมดูลขยายเพิ่มเติม (นอกกรอบ 21 เดิม) **(ดำเนินการแล้ว)**

22. **AuthModule** — JWT / login **(ดำเนินการแล้ว)**
23. **ProcurementPlanModule** — แผนจัดซื้อ **(ดำเนินการแล้ว)**
24. **RegistrationCertificateModule** — หนังสือรับรอง/หัก ณ ที่จ่าย **(ดำเนินการแล้ว)**
25. **HealthModule** — health check **(ดำเนินการแล้ว)**
26. **FinancialAuditModule** — ลงนามตรวจสอบ **(ดำเนินการแล้ว)**
27. **GovRevenueModule** — รายได้แผ่นดิน **(ดำเนินการแล้ว)**
28. **LoanAgreementModule** — สัญญายืมเงิน **(ดำเนินการแล้ว)**
29. **CashKeepingModule** — เงินสดคงคลัง **(ดำเนินการแล้ว)**
30. **SmpDepositModule** — ฝาก สปม. **(ดำเนินการแล้ว)**
31. **BankLedgerModule** — บัญชีแยกประเภท **(ดำเนินการแล้ว)**
32. **FiscalYearBalanceModule** — ยอดยกปีงบประมาณ **(ดำเนินการแล้ว)**
33. **BankReconciliationModule** — เทียบยอดธนาคาร **(ดำเนินการแล้ว)**
34. **MonthlySubmissionModule** — ส่งงบรายเดือน **(ดำเนินการแล้ว)**
35. **ReceiptBookModule** — สมุดใบเสร็จ **(ดำเนินการแล้ว)**
36. **DocCounterModule** — เลขที่เอกสาร **(ดำเนินการแล้ว)**
37. **YearEndReportModule** — รายงานสิ้นปี **(ดำเนินการแล้ว)**
38. **UnifiedRegisterModule** — ทะเบียนรวม **(ดำเนินการแล้ว)**
39. **GlobalSearchModule** — ค้นหารวม **(ดำเนินการแล้ว)**
40. **DayCloseCheckModule** — ปิดวัน/เช็ค **(ดำเนินการแล้ว)**
41. **AiModule** — AI ช่วยวิเคราะห์ **(ดำเนินการแล้ว)**
42. **DeleteLogModule** — บันทึกการลบ **(ดำเนินการแล้ว)**
43. **BudgetRequestModule** — ขอใช้งบ **(ดำเนินการแล้ว)**
44. **OpeningBalanceModule** — ยอดยกมา **(ดำเนินการแล้ว)**
45. **FixedAssetModule** — ครุภัณฑ์ **(ดำเนินการแล้ว)**
46. **ContractSecurityModule** — หลักประกันสัญญา **(ดำเนินการแล้ว)**
47. **BudgetTransferModule** — โอนงบ **(ดำเนินการแล้ว)**
48. **ProjectFollowupModule** — ติดตามโครงการ **(ดำเนินการแล้ว)**
49. **EgpAnnouncementModule** — ประกาศ e-GP **(ดำเนินการแล้ว)**
50. **InvoicePreAuditModule** — ตรวจก่อนเบิก **(ดำเนินการแล้ว)**
51. **PlanTraceModule** — trace แผน **(ดำเนินการแล้ว)**
52. **IntraBankTransferModule** — โอนระหว่างบัญชี **(ดำเนินการแล้ว)**
53. **SupplieRequestModule** — คำขอพัสดุเพิ่ม **(ดำเนินการแล้ว)**

รวม **53 โมดูลฟีเจอร์** (+ `AuthModule`) ที่ import ใน `AppModule` **(ดำเนินการแล้ว)**

### 6. ขั้นตอนต่อไป (Phase 7 – Testing & Quality Assurance)

#### 6.1 การทดสอบ (Testing)
- ✅ **มีชุดทดสอบอัตโนมัติ backend (Jest)** — สคริปต์ `npm run test` ใน `backend/` **(ดำเนินการแล้ว)**
- ✅ **มีสคริปต์ E2E backend** — `npm run test:e2e` (ต้องตั้งค่า DB/env) **(ดำเนินการแล้ว)**
- [ ] **UAT ครบทุกหน้า** (Next.js เท่านั้น — ไม่มี Angular ใน repo) ในสภาพแวดล้อมจริง — ยังต้องดำเนินการต่อ **(ยังไม่ครบ — ตาม Phase 9)**

#### 6.2 การปรับปรุงคุณภาพ (Quality Improvement)
- ✅ **ValidationPipe + class-validator บน API** **(ดำเนินการแล้ว)**
- ✅ **Helmet, Throttler (login), JWT guard ทั่วระบบ** **(ดำเนินการแล้ว)**
- ✅ **Sentry (เมื่อตั้ง `SENTRY_DSN`)** **(ดำเนินการแล้ว)**
- ✅ **แบ่งหน้า list + PageSize cap** **(ดำเนินการแล้ว)**
- [ ] **ปรับปรุง performance เชิงลึก** (profiling จริง) — ทำต่อตามความจำเป็น **(ยังไม่ปิดงาน)**

#### 6.3 การทำเอกสาร (Documentation)
- ✅ อัปเดต `context.md` — บริบทและข้อมูลการไหลของข้อมูล **(ดำเนินการแล้ว — มีไฟล์ใน repo)**
- ✅ อัปเดต `plan.md` — แผนการพัฒนาและสถานะ **(ดำเนินการแล้ว — เอกสารนี้)**
- ✅ อัปเดต `tasks.md` — งานย่อยและสถานะ **(ดำเนินการแล้ว — มีไฟล์ใน repo)**
- ✅ อัปเดต `backend/BACKEND_ARCHITECTURE.md` — สถาปัตยกรรม backend **(ดำเนินการแล้ว — มีไฟล์ใน repo)**

### 7. สรุปสถานะ

**สถานะโดยรวม: กรอบงานหลัก (Phase 1–6) + โมดูลขยาย — พัฒนาใน repo แล้ว (ดำเนินการแล้ว)**  
**งานทดสอบครบทุกหน้า / บำรุง production — ยังไม่ปิดในเอกสารนี้ (ดู Phase 9)**

- ✅ โมดูล backend ตาม `app.module.ts` ครบถ้วนและมีมากกว่า 21 โมดูลเดิม **(ดำเนินการแล้ว)**
- ✅ Frontend Next.js (`frontend/app/(dashboard)/sfmis/`) มีหลายหน้าฟีเจอร์ **(ดำเนินการแล้ว — โครงสร้างใน repo)**
- [ ] การันตีว่า "ทุกหน้า" ผ่าน UAT แล้ว — **ยังไม่ระบุเป็นเสร็จในเอกสารนี้**
- ✅ Pattern API, soft delete, audit field ตามหลักข้อ 3 **(ดำเนินการแล้ว — ตามแนวทางในโค้ด)**

### 8. Package.json Scripts & Development Workflow

> **หมายเหตุ:** รายการเดิมในมาตรา 8 อ้างถึงสคริปต์หลายตัวที่ **ไม่มี** ใน `package.json` ระดับ root ของ repo ปัจจุบัน — ปรับให้ตรงกับไฟล์จริงแล้ว

#### 8.1 Scripts ระดับ root (`package.json` ที่ root) **(ดำเนินการแล้ว — มีใน repo)**

- ✅ `dev` / `start:all` — รัน NestJS + Next.js พร้อมกัน (`concurrently`) **(ดำเนินการแล้ว)**
- ✅ `dev:backend` — `cd backend && npm run start:dev` **(ดำเนินการแล้ว)**
- ✅ `dev:frontend` — `cd frontend && npm run dev` **(ดำเนินการแล้ว)**
- ✅ `build:backend` / `build:frontend` **(ดำเนินการแล้ว)**
- ✅ `test:backend` / `test:frontend` **(ดำเนินการแล้ว)**
- ✅ `lint:backend` **(ดำเนินการแล้ว)**
- ✅ `seed` — `cd backend && npm run seed` **(ดำเนินการแล้ว)**
- ✅ `install:all` — ติดตั้งทั้ง backend และ frontend **(ดำเนินการแล้ว)**

#### 8.2 Scripts เพิ่มเติมใน `backend/package.json` **(ดำเนินการแล้ว)**

- ✅ `start:dev`, `build`, `lint`, `test`, `test:e2e`, `migration:*`, `format` **(ดำเนินการแล้ว)**

#### 8.3 สคริปต์รัน Next.js + backend พร้อมกัน (root) **(ดำเนินการแล้ว — 2026-05-12)**

- ✅ `dev` / `start:all` — ใช้ `concurrently` รัน `dev:backend` + `dev:frontend` พร้อมกัน (แท็ก `api` / `web`) **(ดำเนินการแล้ว)**
- [ ] `lint:all`, `build:all`, `format:all`, `security:audit:all` — ยังไม่เพิ่ม **(ถ้าต้องการให้เพิ่มได้ภายหลัง)**

### 9. ขั้นตอนต่อไป (Phase 8 – Maintenance & Enhancement)

#### 9.1 การบำรุงรักษา (Maintenance)
- [ ] ทดสอบในสภาพแวดล้อมจริง
- [ ] แก้ไข bug ที่พบ
- [ ] ปรับปรุง performance
- [ ] อัปเดต dependencies

#### 9.2 การปรับปรุง (Enhancement)
- [x] **Unit tests บน backend (Jest)** — มีชุดทดสอบใน `backend/` **(ดำเนินการแล้ว — บางส่วน, เพิ่มเคสได้ต่อเนื่อง)**
- [ ] **E2E tests** — มีสคริปต์ `test:e2e` แต่ยังไม่ถือว่าครอบคลุมทุก flow/UI **(ยังไม่ครบ)**
- [ ] ปรับปรุง UI/UX
- [ ] เพิ่มฟีเจอร์ใหม่ตามความต้องการ

#### 9.3 การอัปเดต (Updates)
- ~~อัปเดต Angular~~ — **ไม่เกี่ยวข้อง** (ไม่มี Angular ใน repo)
- [ ] อัปเดต **Next.js / React** และ dependency ตาม `SECURITY_VULNERABILITIES.md` (เช่น `next` patch) **(แนะนำ)**
- [ ] อัปเดต **NestJS** patch ตาม security advisory **(แนะนำ)**
- [ ] อัปเดต dependencies อื่นๆ (`npm audit` เป็นระยะ)

**หมายเหตุ:** ระบบพร้อมใช้งานแล้ว ควรทำการทดสอบในสภาพแวดล้อมจริงและแก้ไข bug ที่พบเพิ่มเติม

---

### 10. การวิเคราะห์ codebase (สรุป — อัปเดต 2026-05-12)

| ชั้น | สิ่งที่พบ | หมายเหตุ |
|------|-----------|----------|
| **Backend** | ~54 โมดูลฟีเจอร์ + `AuthModule` ใน `AppModule` | ครอบคลุมการเงิน แผน พัสดุ AI รายงานขยาย ฯลฯ |
| **Frontend** | ~73 หน้าใต้ `frontend/app/(dashboard)/sfmis/` | หน้าหลักการเงิน/แผน/พัสดุ/รายงาน/AI มี UI |
| **ช่องว่าง UI ↔ API** | บางโมดูล backend **ไม่พบ** route/page ที่อ้างชัดใน frontend (ค้นด้วยชื่อเช่น `PlanTrace`, `DeleteLog`, `ProjectFollowup`, `BudgetTransfer`) | อาจซ่อนอยู่ภายใต้เมนูอื่นหรือยังไม่ทำหน้าเฉพาะ — โอกาสเพิ่ม **feature parity** |
| **ทดสอบอัตโนมัติ** | Backend มีไฟล์ `*.spec.ts` จำนวนจำกัด (~14 ไฟล์) เทียบกับจำนวนโมดูลมาก | โอกาสขยาย **unit/integration tests** |
| **Frontend test** | มีสคริปต์ `vitest` ใน `frontend/package.json` | โอกาสเพิ่ม **component + smoke tests** |
| **ความปลอดภัย** | `SECURITY_VULNERABILITIES.md` (สแกน 2026-05-04) ระบุ patch Next/Nest และประเด็น `xlsx` | โอกาส **อัปเกรด dependency / ทางเลือก export** |
| **เอกสารเก่า** | `README.md`, `DEVELOPMENT_ROADMAP.md` บางส่วนยังกล่าวถึง Angular / 21 modules เท่านั้น | ควร sync กับ `plan.md` เป็นครั้งคราว |

---

### 11. ฟีเจอร์และทิศทางอัปเกรดที่แนะนำ (ลำดับความสำคัญ)

รายการด้านล่างสรุปจากโครงสร้างโค้ด เอกสาร security/roadmap และช่องว่าง frontend–backend — ใช้เป็น backlog ได้โดยไม่ผูก sprint

#### ความปลอดภัยและความเสถียร (ทำก่อนเมื่อจะขึ้น production)
1. **อัปเกรด `next`** ตาม `SECURITY_VULNERABILITIES.md` (patch DoS) และติดตาม transitive `postcss` **(แนะนำสูง)**
2. **อัปเกรดแพ็กเก็ต NestJS** ตาม advisory ในเอกสารเดียวกัน **(แนะนำสูง)**
3. **จัดการ `xlsx`:** ทางเลือก SheetJS จาก CDN / เปลี่ยนเป็น `exceljs` / ยอมรับความเสี่ยงเฉพาะ export — ตัดสินตามนโยบายองค์กร **(แนะนำปานกลาง–สูง)**
4. **ทบทวน `next-auth` beta** — วางแผนย้าย stable เมื่อรองรับ **(แนะนำปานกลาง)**

#### คุณภาพและความน่าเชื่อถือของซอฟต์แวร์
5. **ขยาย unit tests ใน backend** ให้ครอบ service หลักที่ยังไม่มี spec (เทียบกับ 54 โมดูล) **(แนะนำสูง)**
6. **E2E ด้วย Playwright (หรือ Cypress)** สำหรับ flow วิกฤต: login → ขอซื้อ/อนุมัติ → รับพัสดุ → ขอเบิก → ออกเช็ค **(แนะนำสูง)**
7. **เพิ่ม Vitest ฝั่ง frontend** สำหรับฟอร์มซับซ้อน (`react-hook-form` + zod) และ `lib/api` retry **(แนะนำปานกลาง)**
8. **UAT checklist** ต่อปีงบ / บทบาทผู้ใช้ — ปิด gap ระหว่าง “มีหน้า” กับ “ใช้งานจริงได้ครบ” **(แนะนำสูง)**

#### ประสบการณ์ผู้ใช้และฟีเจอร์ธุรกิจ
9. **เติมหน้า/เมนู** สำหรับโมดูลที่มี API แต่ไม่ชัดว่ามี UI (เช่น Plan trace, Delete log audit, Project follow-up, Budget transfer — ต้อง map endpoint จริงก่อนลงมือ) **(แนะนำปานกลาง)**
10. **แจ้งเตือน workflow** (อีเมล / LINE / in-app) เมื่อสถานะใบขอซื้อหรือใบเบิกเปลี่ยน — ลดค้างอนุมัติ **(แนะนำปานกลาง)**
11. **Dashboard แบบ role-based** — สรุปงานค้างต่อ `type` ผู้ใช้ **(แนะนำปานกลาง)**
12. **ปรับปรุงการพิมพ์/ส่งออก** — template PDF ราชการ, batch export, watermark **(แนะนำต่ำ–ปานกลาง)**

#### สถาปัตยกรรมและประสิทธิภาพ
13. **สคริปต์ root:** `concurrently` รัน `dev:backend` + `dev:frontend`, `lint:all`, `build:all` **(แนะนำต่ำ — developer experience)**
14. **DB:** ดัชนี + `EXPLAIN` บน query หนัก, พิจารณา cache (Redis) สำหรับรายงานสรุป **(แนะนำปานกลางเมื่อโหลดสูง)**
15. **สิทธิ์ละเอียด (RBAC ต่อ endpoint)** — ทบทวน `@Roles()` ให้ครบทุก flow สำคัญ **(แนะนำปานกลาง)**

#### AI (มี `AiModule` + หน้า ai-* อยู่แล้ว)
16. **Governance AI:** log prompt/answer, ข้อจำกัดข้อมูลส่วนบุคคล, ปุ่ม “ไม่ใช้คำแนะทางการเงินเป็นที่ยึดทางกฎหมาย” **(แนะนำปานกลาง)**

---

**หมายเหตุสุดท้าย:** `DEVELOPMENT_ROADMAP.md` ยังอธิบายสถานะเก่า (Angular, ไม่มี unit test) — ไม่สอดคล้องกับ repo ปัจจุบัน แนะนำอัปเดตไฟล์นั้นอ้างอิง `plan.md` มาตรา 6–11
