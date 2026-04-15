## แผนการพัฒนา Backend/Frontend - SFMIS System

### 1. เป้าหมายหลัก
- **รองรับ endpoint ทั้งหมดตามกรอบงาน** ตามที่ระบุใน `context.md`
- **ทำงานร่วมกับ Angular Frontend เดิมได้** โดยไม่ต้องแก้ UI มาก
- **ใช้ NestJS + TypeORM + MySQL** เป็น backend หลัก

### 2. สถานะการพัฒนา (ตามกรอบงาน)

#### ✅ Phase 1 – Core & Authentication (เสร็จสมบูรณ์)
- ตั้งค่า NestJS, TypeORM, `.env`
- สร้าง `AdminModule` (login, load, update, remove)
- ปรับ Angular ให้ยิง `http://localhost:3000/api/`
- จัดการข้อมูลผู้ใช้งาน (Users)

#### ✅ Phase 2 – Dashboard & School Year (เสร็จสมบูรณ์)
- `DashboardModule` (chart, summary, predictBudget)
- `SchoolYearModule` (CRUD ปีการศึกษา, change_year, check_year)
- เชื่อมหน้า Dashboard/Project ใน frontend ให้ไม่ error 500/404

#### ✅ Phase 3 – Master Data & Settings (เสร็จสมบูรณ์)
- `SchoolModule` (ข้อมูลโรงเรียน)
- `GeneralDbModule` (Unit, Type Supplies, Supplies, Partner)
- `SettingsModule` (Policy/QuickWin/SAO/MOE/OBEC, Classroom Budget, Budget Type)
- `PolicyModule` (Budget Income Type)

#### ✅ Phase 4 – Project & Budget Flow (เสร็จสมบูรณ์)
- `ProjectApproveModule` (การอนุมัติโครงการ, ขอซื้อ/ขอจ้าง)
- `BudgetModule` (งบประมาณรวมรายปี, กำหนดวงเงินงบประมาณ)
- `StudentModule` (บันทึกข้อมูลนักเรียน, คำนวณงบจากรายหัว)

#### ✅ Phase 5 – Supplie & Transaction Flow (เสร็จสมบูรณ์)
- `SupplieModule` (ตรวจรับพัสดุ, เบิกพัสดุ, อนุมัติเบิกพัสดุ)
- `AuditCommitteeModule` (แต่งตั้งคณะกรรมการ)
- `BankModule` (บัญชีธนาคาร, ผูกบัญชีธนาคารกับประเภทเงิน)
- `ReceiveModule` (รับเงินเข้าบัญชี, รับเงินเหลือจ่ายปีเก่า)
- `ReceiptModule` (ใบเสร็จรับเงิน)
- `InvoiceModule` (ขอเบิก, ผอ. อนุมัติขอเบิก)
- `CheckModule` (ออกเช็ค)

#### ✅ Phase 6 – Reports (เสร็จสมบูรณ์)
- `ReportDailyBalanceModule` (รายงานคงเหลือประจำวัน)
- `ReportCheckControlModule` (ลงทะเบียนควบคุมเช็ค)
- `ReportBookbankModule` (ลงทะเบียนควบคุมบัญชีธนาคาร)
- `RegisterMoneyTypeModule` (ทะเบียนคุมหน้างบใบสำคัญคู่จ่าย, ลงทะเบียนควบคุมประเภทเงิน)

### 3. หลักการออกแบบร่วมกันทุกโมดูล
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
- ✅ โครงการ (`ProjectApproveModule`)
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

### 5. Backend Modules ที่สร้างแล้ว (21 โมดูล)

1. ✅ **AdminModule** - จัดการผู้ใช้งานและผู้ดูแลระบบ
2. ✅ **DashboardModule** - Dashboard และรายงานสรุป
3. ✅ **SchoolYearModule** - จัดการปีการศึกษา
4. ✅ **SchoolModule** - ข้อมูลโรงเรียน
5. ✅ **GeneralDbModule** - ข้อมูลพื้นฐาน (Unit, Type Supplies, Supplies, Partner)
6. ✅ **PolicyModule** - นโยบายและข้อมูลพื้นฐาน
7. ✅ **StudentModule** - บันทึกข้อมูลนักเรียนและคำนวณงบจากรายหัว
8. ✅ **BudgetModule** - งบประมาณรวมรายปีและกำหนดวงเงินงบประมาณ
9. ✅ **SettingsModule** - ตั้งค่าต่างๆ (นโยบายโรงเรียน, นโยบาย สพท)
10. ✅ **ProjectApproveModule** - การอนุมัติโครงการและขอซื้อ/ขอจ้าง
11. ✅ **ReceiveModule** - การรับเงิน
12. ✅ **ReceiptModule** - ใบเสร็จรับเงิน
13. ✅ **InvoiceModule** - ขอเบิก
14. ✅ **CheckModule** - ออกเช็ค
15. ✅ **BankModule** - ตั้งค่าการเงิน (บัญชีธนาคาร, ผูกบัญชี)
16. ✅ **SupplieModule** - งานพัสดุ (ตรวจรับ, เบิก, อนุมัติ)
17. ✅ **AuditCommitteeModule** - แต่งตั้งคณะกรรมการ
18. ✅ **ReportDailyBalanceModule** - รายงานคงเหลือประจำวัน
19. ✅ **ReportCheckControlModule** - ลงทะเบียนควบคุมเช็ค
20. ✅ **ReportBookbankModule** - ลงทะเบียนควบคุมบัญชีธนาคาร
21. ✅ **RegisterMoneyTypeModule** - ทะเบียนคุมหน้างบใบสำคัญคู่จ่ายและควบคุมประเภทเงิน

### 6. ขั้นตอนต่อไป (Phase 7 – Testing & Quality Assurance)

#### 6.1 การทดสอบ (Testing)
- ✅ ทดสอบการทำงานของทุกหน้าในระบบ
- ✅ ตรวจสอบการบันทึกข้อมูล
- ✅ ตรวจสอบการโหลดข้อมูล
- ✅ ตรวจสอบการอัปเดตข้อมูล
- ✅ ตรวจสอบการลบข้อมูล (soft delete)

#### 6.2 การปรับปรุงคุณภาพ (Quality Improvement)
- ✅ เพิ่ม error handling
- ✅ เพิ่ม validation
- ✅ เพิ่ม logging
- ✅ ปรับปรุง performance query (index, pagination)
- ✅ แก้ไข bug ที่พบ

#### 6.3 การทำเอกสาร (Documentation)
- ✅ อัปเดต `context.md` - บริบทและข้อมูลการไหลของข้อมูล
- ✅ อัปเดต `plan.md` - แผนการพัฒนาและสถานะ
- ✅ อัปเดต `tasks.md` - งานย่อยและสถานะ
- ✅ อัปเดต `backend/BACKEND_ARCHITECTURE.md` - สถาปัตยกรรม backend

### 7. สรุปสถานะ

**สถานะโดยรวม: ✅ เสร็จสมบูรณ์ 100%**

- ✅ ทุกโมดูลตามกรอบงานได้ถูกสร้างและทดสอบแล้ว (21 modules)
- ✅ ทุกหน้าในระบบสามารถทำงานได้ตามที่กำหนด
- ✅ Backend endpoints ครบถ้วนตามที่ frontend ต้องการ
- ✅ การบันทึก, โหลด, อัปเดต, ลบข้อมูลทำงานได้ถูกต้อง
- ✅ Error handling และ validation ถูกเพิ่มแล้ว
- ✅ เอกสารครบถ้วน (context.md, plan.md, tasks.md, README.md)

### 8. Package.json Scripts & Development Workflow (Phase 9 – เสร็จสมบูรณ์) ✅

#### 8.1 Scripts สำหรับ Development
- ✅ เพิ่ม `concurrently` เป็น devDependency สำหรับรัน frontend และ backend พร้อมกัน
- ✅ เพิ่ม scripts สำหรับรัน development:
  - ✅ `start:frontend` - รัน Angular frontend
  - ✅ `start:backend` - รัน NestJS backend
  - ✅ `start:all` / `dev` - รันทั้ง frontend และ backend พร้อมกัน
- ✅ เพิ่ม scripts สำหรับ installation:
  - ✅ `install:all` - ติดตั้ง dependencies ทั้ง frontend และ backend
  - ✅ `install:backend` - ติดตั้ง dependencies เฉพาะ backend
- ✅ เพิ่ม scripts สำหรับ build:
  - ✅ `build:backend` - Build backend
  - ✅ `build:all` - Build ทั้ง frontend และ backend
- ✅ เพิ่ม scripts สำหรับ database:
  - ✅ `seed` / `seed:backend` - รัน database seeding
- ✅ เพิ่ม scripts สำหรับ testing:
  - ✅ `test:backend` - รัน tests เฉพาะ backend
  - ✅ `test:all` - รัน tests ทั้ง frontend และ backend
- ✅ เพิ่ม scripts สำหรับ linting:
  - ✅ `lint:backend` - Lint backend code
  - ✅ `lint:all` - Lint ทั้ง frontend และ backend
- ✅ เพิ่ม scripts สำหรับ formatting:
  - ✅ `format:backend` - Format backend code
  - ✅ `format:all` - Format ทั้ง frontend และ backend
- ✅ เพิ่ม scripts สำหรับ security:
  - ✅ `security:audit:all` - Audit security ทั้ง frontend และ backend

#### 8.2 Development Workflow
- ✅ รัน `npm run dev` เพื่อรันทั้ง frontend และ backend พร้อมกัน
- ✅ รัน `npm run install:all` เพื่อติดตั้ง dependencies ทั้งระบบ
- ✅ รัน `npm run seed` เพื่อ seed ข้อมูลเริ่มต้น
- ✅ รัน `npm run build:all` เพื่อ build ทั้งระบบสำหรับ production
- ✅ แก้ไข script `build` ให้ใช้ `--configuration=production` แทน `--prod` (รองรับ Angular 16)

### 9. ขั้นตอนต่อไป (Phase 8 – Maintenance & Enhancement)

#### 9.1 การบำรุงรักษา (Maintenance)
- [ ] ทดสอบในสภาพแวดล้อมจริง
- [ ] แก้ไข bug ที่พบ
- [ ] ปรับปรุง performance
- [ ] อัปเดต dependencies

#### 9.2 การปรับปรุง (Enhancement)
- [ ] เพิ่ม unit tests
- [ ] เพิ่ม E2E tests
- [ ] ปรับปรุง UI/UX
- [ ] เพิ่มฟีเจอร์ใหม่ตามความต้องการ

#### 9.3 การอัปเดต (Updates)
- [ ] อัปเดต Angular เป็น version ล่าสุด (ถ้าจำเป็น)
- [ ] อัปเดต NestJS เป็น version ล่าสุด (ถ้าจำเป็น)
- [ ] อัปเดต dependencies อื่นๆ

**หมายเหตุ:** ระบบพร้อมใช้งานแล้ว ควรทำการทดสอบในสภาพแวดล้อมจริงและแก้ไข bug ที่พบเพิ่มเติม
