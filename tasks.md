## งานรวมสำหรับ Backend SFMIS

### สรุปสถานะระดับโมดูล
- ✅ **AdminModule**: เสร็จสมบูรณ์ (login / load / update / remove / updateAdmin / loadPosition)
- ✅ **DashboardModule**: เสร็จสมบูรณ์ (loadChartBudgetType_Pie, loadChartBudgetType_Bar, predictBudget, load_dashboard, get_round)
- ✅ **SchoolYearModule**: เสร็จสมบูรณ์ (loadScoolYearByYear, change_year, check_year, CRUD)
- ✅ **SchoolModule**: เสร็จสมบูรณ์ (loadBudgetIncomeTypeSchool)
- ✅ **GeneralDbModule**: เสร็จสมบูรณ์ (Unit, TypeSupplies, Supplies, Partner)
- ✅ **PolicyModule**: เสร็จสมบูรณ์ (get_budget_income_type, get_school_year, get_partner)
- ✅ **StudentModule**: เสร็จสมบูรณ์ (loadStudent, updateStudent, checkSendRecord, confirmSendRecord, checkClassOnYear, loadCalculatePerhead)
- ✅ **BudgetModule**: เสร็จสมบูรณ์ (loadEstimateAcadyearGroup, loadPLNBudgetCategory, checkBudgetCategoryOnYear, checkBudgetCategoryOnYears, addPLNBudgetCategory, updateEstimate)
- ✅ **SettingsModule**: เสร็จสมบูรณ์ (School Policy, OBEC Policy - load, add, update, remove)
- ✅ **ProjectApproveModule**: เสร็จสมบูรณ์ (การอนุมัติหัวงานนโยบายและแผน, ขอซื้อ/ขอจ้าง, loadPartner, loadProject, loadDirector)
- ✅ **ReceiveModule**: เสร็จสมบูรณ์ (การรับเงิน - รับเงินเข้าบัญชี, รับเงินเหลือจ่ายปีเก่า)
- ✅ **ReceiptModule**: เสร็จสมบูรณ์ (ใบเสร็จรับเงิน)
- ✅ **InvoiceModule**: เสร็จสมบูรณ์ (ขอเบิก, ผอ. อนุมัติขอเบิก)
- ✅ **CheckModule**: เสร็จสมบูรณ์ (ออกเช็ค)
- ✅ **BankModule**: เสร็จสมบูรณ์ (ตั้งค่าการเงิน - บัญชีธนาคาร, ผูกบัญชีธนาคารกับประเภทเงิน)
- ✅ **SupplieModule**: เสร็จสมบูรณ์ (ตรวจรับพัสดุ, เบิกพัสดุ, อนุมัติเบิกพัสดุ)
- ✅ **AuditCommitteeModule**: เสร็จสมบูรณ์ (แต่งตั้งคณะกรรมการ)
- ✅ **ReportDailyBalanceModule**: เสร็จสมบูรณ์ (รายงานคงเหลือประจำวัน)
- ✅ **ReportCheckControlModule**: เสร็จสมบูรณ์ (ลงทะเบียนควบคุมเช็ค)
- ✅ **ReportBookbankModule**: เสร็จสมบูรณ์ (ลงทะเบียนควบคุมบัญชีธนาคาร)
- ✅ **RegisterMoneyTypeModule**: เสร็จสมบูรณ์ (ทะเบียนคุมหน้างบใบสำคัญคู่จ่าย, ลงทะเบียนควบคุมประเภทเงิน)

---

### 1. Core / Infra ✅
- [x] ตั้งค่า NestJS + TypeORM + MySQL ด้วย `ConfigModule` + `.env`
- [x] ตั้งค่า `app.setGlobalPrefix('api')`, CORS, `ValidationPipe`
- [x] เพิ่ม error handling และ logging ใน service/controller
- [x] เตรียม script seed ข้อมูล (`seeds.ts`) และวิธีรัน

### 2. Dashboard & School Year ✅
- [x] สร้าง `DashboardModule` + `DashboardController` + `DashboardService`
- [x] Implement logic:
  - [x] `loadChartBudgetType_Pie`
  - [x] `loadChartBudgetType_Bar`
  - [x] `predictBudget` (GET และ POST)
  - [x] `load_dashboard`
  - [x] `get_round`
- [x] สร้าง `SchoolYearModule` (entity + DTO + service + controller)
- [x] ทดสอบ/ปรับ endpoint ให้ตรงกับ frontend:
  - [x] `school_year/loadScoolYearByYear` (GET และ POST)
  - [x] `school_year/LoadScoolYearByYear` (uppercase L)
  - [x] `school_year/change_year`
  - [x] `school_year/check_year`

### 3. School & General DB ✅
- [x] สร้าง `SchoolModule` (controller + service):
  - [x] `School/loadBudgetIncomeTypeSchool`
  - [x] `school/loadBudgetIncomeTypeSchool` (lowercase)
- [x] สร้าง `GeneralDbModule` และ entity/dto:
  - [x] Unit (`tb_unit`) - load, add, update, remove
  - [x] TypeSupplies (`tb_type_supplies`) - load, add, update, remove
  - [x] Supplies (`tb_supplies`) - load, add, update, remove, loadFixSupplies, fixSupplies
  - [x] Partner (`tb_partner`) - load, add, update, remove
  - [x] `loadTypeSuppliesAndUnit` - ดึงข้อมูลประเภทพัสดุและหน่วยการนับ

### 4. Settings / Policy Master ✅
- [x] สร้าง `SettingsModule`:
  - [x] School Policy (`master_sc_policy`) - load, add, update, remove
  - [x] OBEC Policy (`master_obec_policy`) - load, add, update, remove
- [x] สร้าง `PolicyModule`:
  - [x] `get_budget_income_type`
  - [x] `get_school_year`
  - [x] `get_partner`

### 5. งานนโยบายและแผน (Policy & Planning) ✅
- [x] สร้าง `StudentModule` (บันทึกข้อมูลนักเรียน)
  - [x] `Student/loadStudent/:sy_id/:budget_year/:sc_id/:page/:page_size`
  - [x] `Student/updateStudent`
  - [x] `Student/checkSendRecord`
  - [x] `Student/confirmSendRecord`
  - [x] `Student/checkClassOnYear`
  - [x] `Student/loadCalculatePerhead/:sc_id/:year`
- [x] สร้าง `BudgetModule` (งบประมาณรวมรายปี, กำหนดวงเงินงบประมาณ)
  - [x] `Budget/loadEstimateAcadyearGroup/:sc_id/:year/:sy_id`
  - [x] `Budget/loadPLNBudgetCategory/:sc_id/:sy_id/:budget_year`
  - [x] `Budget/checkBudgetCategoryOnYear`
  - [x] `Budget/checkBudgetCategoryOnYears`
  - [x] `Budget/addPLNBudgetCategory` (POST)
  - [x] `Budget/updateEstimate` (POST)
- [x] สร้าง `SettingsModule` (ตั้งค่าฐานข้อมูลโรงเรียน)
  - [x] School Policy (`master_sc_policy`) - load, add, update, remove
  - [x] OBEC Policy (`master_obec_policy`) - load, add, update, remove
- [x] สร้าง `ProjectApproveModule` (การอนุมัติหัวงานนโยบายและแผน, โครงการ)
  - [x] `Project_approve/loadProjectApprove/:sc_id/:sy_id/:page/:pageSize`
  - [x] `Project_approve/loadProjectApprove/:sc_id/:sy_id` (ไม่มี pagination)
  - [x] `Project_approve/loadParcelOrder/:sc_id/:ppa_id`
  - [x] `Project_approve/loadParcelDetail` (POST)
  - [x] `Project_approve/loadSuppilesByOrderID/:order_id`
  - [x] `Project_approve/loadBudgetBalance/:order_id/:project_id/:sc_id/:year`
  - [x] `Project_approve/approveParcelByPlan` (POST)
  - [x] `Project_approve/approveParcelByBusiness` (POST)
  - [x] `Project_approve/approveParcelByCeo` (POST)
  - [x] `Project_approve/addProjectApprove` (POST)
  - [x] `Project_approve/updateProjectApprove` (POST)
  - [x] `Project_approve/removeParcelOrder` (POST)
  - [x] `Project_approve/loadPartner/:sc_id` (GET)
  - [x] `Project_approve/loadProject/:sc_id` (GET)
  - [x] `Project_approve/loadDirector/:sc_id` (GET)

### 6. Finance Modules (งานการเงิน) ✅
- [x] สร้าง `ReceiveModule` (การรับเงิน)
  - [x] `Receive/loadReceive/:sc_id/:sy_id/:budget_year`
  - [x] `Receive/loadAutoAddReceive/:sc_id/:sy_id`
  - [x] `Receive/loadDirector/:sc_id`
  - [x] `Receive/loadBudgetIncomeType`
  - [x] `Receive/addReceive` (POST)
- [x] สร้าง `ReceiptModule` (ใบเสร็จรับเงิน)
  - [x] `Receipt/loadReceipt/:sc_id/:y_id/:year`
  - [x] `Receipt/loadReceive/:sc_id/:sy_id/:year`
  - [x] `Receipt/addReceipt` (POST)
  - [x] `Receipt/updateReceipt` (POST)
  - [x] `Receipt/removeReceipt` (POST)
- [x] สร้าง `InvoiceModule` (ขอเบิก)
  - [x] `Invoice/loadInvoiceOrder/:sc_id/:y_id`
  - [x] `Invoice/loadProjects/:sc_id/:sy_id`
  - [x] `Invoice/loadPartner/:sc_id`
  - [x] `Invoice/loadBudgetType/:sc_id/:sy_id/:year`
  - [x] `Invoice/loadBudgetType` (ไม่มี parameters)
  - [x] `Invoice/loadUserRequest/:sc_id`
  - [x] `Invoice/addInvoice` (POST)
  - [x] `Invoice/updateInvoice` (POST)
  - [x] `Invoice/loadConfirmInvoice/:sc_id/:y_id` (GET)
  - [x] `Invoice/ConfirmInvoice` (POST) - ผอ. อนุมัติขอเบิก
- [x] สร้าง `CheckModule` (ออกเช็ค)
  - [x] `Check/loadCheck/:sc_id/:sy_id`
  - [x] `Check/loadAutoNoCheck/:sc_id/:sy_id`
  - [x] `Check/loadUser/:sc_id`
  - [x] `Check/loadPartner/:sc_id`
  - [x] `Check/loadBudget/:sc_id`
  - [x] `Check/loadCheckById/:sc_id/:sy_id/:rw_id`
  - [x] `Check/updateCheck` (POST)
- [x] สร้าง `BankModule` (ตั้งค่าการเงิน)
  - [x] `Bank/loadBankAccount/:sc_id`
  - [x] `Bank/loadBankDB`
  - [x] `Bank/loadBudget`
  - [x] `Bank/addBankSchool` (POST)
  - [x] `Bank/updateBankSchool` (POST)
  - [x] `Bank/removeBankAccount` (POST)
  - [x] `Bank/addBudgetSchool` (POST) - ผูกบัญชีธนาคารกับประเภทเงิน
  - [x] `bank/checkBindingBankAccount/:sc_id` (lowercase)

### 7. Supplie & การเบิกจ่าย ✅
- [x] สร้าง `SupplieModule`:
  - [x] entity: `receive_parcel_order`, `receive_parcel_detail`, `supplies`, `transaction_supplies`
  - [x] `Supplie/loadReceive/:sc_id/:sy_id`
  - [x] `Supplie/removeReceiveParcel` (POST)
  - [x] `Supplie/loadSubProject/:sc_id/:sy_id`
  - [x] `Supplie/loadGetUserTeacher/:sc_id`
  - [x] `Supplie/loadParcelDetail/:order_id`
  - [x] `Supplie/loadStockSupplie` (POST)
  - [x] `Supplie/editReceiveParcel` (POST)
  - [x] `Supplie/loadParcelDetailWithdraw/:sc_id/:sy_id`
  - [x] `Supplie/loadResourcesPeople/:sc_id`
  - [x] `Supplie/confiirmWithDrawParcel` (POST)
  - [x] `Supplie/loadGetSupplieOrder/:sc_id/:sy_id`
  - [x] `Supplie/updateSupplieOrder` (POST)
- [x] สร้าง `AuditCommitteeModule`:
  - [x] `Audit_committee/loadAuditCommitteeStatus/:scId/:yearId` (GET)
  - [x] `Audit_committee/updateSetCommittee` (POST)

### 8. Reports (รายงานการเงิน) ✅
- [x] สร้าง `ReportDailyBalanceModule` (รายงานคงเหลือประจำวัน)
  - [x] `ReportDailyBalance/loadDailyBalance/:sc_id/:year` (GET)
- [x] สร้าง `ReportCheckControlModule` (ลงทะเบียนควบคุมเช็ค)
  - [x] `ReportCheckControl/loadCheckControl/:sc_id/:year` (GET)
- [x] สร้าง `ReportBookbankModule` (ลงทะเบียนควบคุมบัญชีธนาคาร)
  - [x] `ReportBookbank/loadReportRegisterBookbank/:sc_id/:year` (GET)
- [x] สร้าง `RegisterMoneyTypeModule` (ทะเบียนคุมหน้างบใบสำคัญคู่จ่าย, ลงทะเบียนควบคุมประเภทเงิน)
  - [x] `RegisterMoneyType/load_budget_type` (GET)
  - [x] `RegisterMoneyType/load_register_control_money_type/:sc_id/:year` (GET)

### 9. Seeds & Data Setup ✅
- [x] สร้าง `seeds.ts` สำหรับ:
  - [x] ผู้ใช้ admin ทดสอบ (`admin_local` ถ้ายังไม่มี)
  - [x] School หลักอย่างน้อย 1 record
  - [x] SchoolYear ปัจจุบัน (ปีการศึกษาล่าสุด)
- [x] เพิ่ม script ใน `backend/package.json`:
  - [x] `"seed": "ts-node src/seeds.ts"`

### 10. เอกสาร & Dev Experience ✅
- [x] เขียน `plan.md` (ภาพรวมแผน)
- [x] เขียน/ปรับ `readme.md` (root) ให้อธิบายระบบจริง
- [x] เขียน `context.md` อธิบายโดเมนระบบ / data flow
- [x] เพิ่ม `.cursorrules` สำหรับแนะนำ AI ภายในโปรเจกต์

### 11. Testing & Quality Assurance ✅
- [x] ทดสอบการทำงานของทุกหน้าในระบบ
- [x] ตรวจสอบการบันทึกข้อมูล
- [x] ตรวจสอบการโหลดข้อมูล
- [x] ตรวจสอบการอัปเดตข้อมูล
- [x] ตรวจสอบการลบข้อมูล (soft delete)
- [x] เพิ่ม error handling
- [x] เพิ่ม validation
- [x] เพิ่ม logging
- [x] แก้ไข bug ที่พบ (เช่น การแปลงปี พ.ศ./ค.ศ., การแปลง type string เป็น number)

---

## สรุปสถานะ

**สถานะโดยรวม: ✅ เสร็จสมบูรณ์ 100%**

- ✅ ทุกโมดูลตามกรอบงานได้ถูกสร้างและทดสอบแล้ว
- ✅ ทุกหน้าในระบบสามารถทำงานได้ตามที่กำหนด
- ✅ Backend endpoints ครบถ้วนตามที่ frontend ต้องการ
- ✅ การบันทึก, โหลด, อัปเดต, ลบข้อมูลทำงานได้ถูกต้อง
- ✅ Error handling และ validation ถูกเพิ่มแล้ว
- ✅ เอกสารครบถ้วน (context.md, plan.md, tasks.md)

---

## 12. เอกสารและคู่มือ ✅
- [x] อัปเดต `context.md` - บริบทและข้อมูลการไหลของข้อมูล
- [x] อัปเดต `plan.md` - แผนการพัฒนาและสถานะ
- [x] อัปเดต `tasks.md` - งานย่อยและสถานะ
- [x] อัปเดต `README.md` - คู่มือการใช้งานระบบ
- [x] อัปเดต `backend/README.md` - คู่มือ Backend
- [x] อัปเดต `backend/BACKEND_ARCHITECTURE.md` - สถาปัตยกรรม backend
- [x] อัปเดต `.cursorrules` - กติกาสำหรับ AI assistant

## 13. Package.json Scripts & Development Workflow ✅
- [x] เพิ่ม `concurrently` เป็น devDependency สำหรับรัน frontend และ backend พร้อมกัน
- [x] เพิ่ม scripts สำหรับ development:
  - [x] `start:frontend` - รัน Angular frontend
  - [x] `start:backend` - รัน NestJS backend
  - [x] `start:all` / `dev` - รันทั้ง frontend และ backend พร้อมกัน
- [x] เพิ่ม scripts สำหรับ installation:
  - [x] `install:all` - ติดตั้ง dependencies ทั้ง frontend และ backend
  - [x] `install:backend` - ติดตั้ง dependencies เฉพาะ backend
- [x] เพิ่ม scripts สำหรับ build:
  - [x] `build:backend` - Build backend
  - [x] `build:all` - Build ทั้ง frontend และ backend
- [x] เพิ่ม scripts สำหรับ database:
  - [x] `seed` / `seed:backend` - รัน database seeding
- [x] เพิ่ม scripts สำหรับ testing:
  - [x] `test:backend` - รัน tests เฉพาะ backend
  - [x] `test:all` - รัน tests ทั้ง frontend และ backend
- [x] เพิ่ม scripts สำหรับ linting:
  - [x] `lint:backend` - Lint backend code
  - [x] `lint:all` - Lint ทั้ง frontend และ backend
- [x] เพิ่ม scripts สำหรับ formatting:
  - [x] `format:backend` - Format backend code
  - [x] `format:all` - Format ทั้ง frontend และ backend
- [x] เพิ่ม scripts สำหรับ security:
  - [x] `security:audit:all` - Audit security ทั้ง frontend และ backend
- [x] แก้ไข script `build` ให้ใช้ `--configuration=production` แทน `--prod` (รองรับ Angular 16)
- [x] อัปเดต `plan.md` เพิ่ม Phase 9 - Package.json Scripts & Development Workflow

---

**หมายเหตุ:** ระบบพร้อมใช้งานแล้ว ควรทำการทดสอบในสภาพแวดล้อมจริงและแก้ไข bug ที่พบเพิ่มเติม
