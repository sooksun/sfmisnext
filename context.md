## บริบทระบบ SFMIS – School Financial Management Information System

### 0. สถาปัตยกรรมระบบ

#### Frontend (Angular)
- **Framework**: Angular 16.2.12
- **UI Framework**: Angular Material 16.2.12
- **Styling**: SCSS + Tailwind CSS 2.1.2
- **State Management**: RxJS 7.8.1
- **Charts**: ApexCharts 3.26.1 + ng-apexcharts 1.7.0
- **Calendar**: FullCalendar 6.1.10
- **API Service**: `src/@fuse/services/connect.api.service.ts`
- **Base URL**: `http://localhost:3000/api/` (config ใน `src/environments/environment.ts`)

#### Backend (NestJS)
- **Framework**: NestJS 11.0.1
- **ORM**: TypeORM 0.3.27 (ไม่ใช้ Prisma)
- **Database**: MySQL (mysql2 3.15.3)
- **Validation**: class-validator + class-transformer
- **API Prefix**: `/api`
- **Port**: 3000 (default)

#### Database
- **Type**: MySQL
- **Schema Files**: `sfmisystem_db/*.sql`
- **Soft Delete**: ใช้ field `del` (0=active, 1=deleted)
- **Audit Fields**: `up_by`, `cre_date`, `up_date`

### 1. โดเมนของระบบ
- ระบบนี้ใช้บริหาร **งบประมาณและการใช้จ่ายของโรงเรียน** เช่น
  - การตั้งงบประมาณ/โครงการ (Project, Budget)
  - การอนุมัติโครงการ (Project Approve)
  - การจัดซื้อ/วัสดุ (Supplie)
  - การรับเงิน/ออกใบเสร็จ (Receive, Receipt)
  - การหักภาษี ณ ที่จ่าย (Withholding Certificate)
  - การจัดทำนโยบายและติดตาม (Policy, Dashboard)

### 2. โครงข้อมูลหลัก (จาก `sfmisystem_db`)
- **ผู้ใช้ / Admin**
  - ตาราง `admin` – ผู้ใช้งานฝั่ง backend, มี MD5 password, ผูกกับ `sc_id`
- **โรงเรียน**
  - ตาราง `school` – ข้อมูลโรงเรียน, เขต, ที่อยู่, logo, header
- **ปีการศึกษา**
  - ตาราง `school_year` – ปีการศึกษา, ภาคเรียน, ปีงบประมาณ, ช่วงเวลา
- **ข้อมูลนักเรียน (งานนโยบายและแผน)**
  - ตาราง `tb_student` – จำนวนนักเรียนตามระดับชั้น, ปีการศึกษา, ปีงบประมาณ
  - ตาราง `submitting_student_records` – บันทึกการส่งข้อมูลนักเรียน (status: 0=กำลังดำเนินการ, 100=ส่งเรื่องปิดแก้ไข)
  - ตาราง `master_classroom` – ระดับชั้นเรียน (อนุบาล 1-3, ป.1-6, ม.1-6, ป.ว.ช.1-3)
  - ตาราง `master_classroombudget` – งบประมาณต่อหัวตามระดับชั้นและประเภทงบ
- **Master / Settings**
  - ตาราง policy ต่าง ๆ (`master_sc_policy`, `master_sao_policy`, `master_moe_policy`, `master_obec_policy`, `master_quick_win`, ฯลฯ)
  - ตารางหมวดงบ (`master_budget_income_type`, `master_budget_category`, ฯลฯ)
- **งบประมาณ / โครงการ**
  - `sfmisystem_project.sql`, `sfmisystem_pln_budget_category.sql`, `sfmisystem_pln_real_budget.sql`, `sfmisystem_tb_estimate_acadyear.sql`, ฯลฯ
- **วัสดุ/ครุภัณฑ์**
  - `sfmisystem_tb_supplies.sql`, `sfmisystem_tb_type_supplies.sql`, `sfmisystem_tb_unit.sql`, `sfmisystem_tb_partner.sql`, ฯลฯ
- **ธุรกรรมการเงิน**
  - `sfmisystem_financial_transactions.sql`, `sfmisystem_receipt.sql`, `sfmisystem_request_withdraw.sql`, `sfmisystem_withholding_certificate.sql` ฯลฯ

### 3. รูปแบบ API เดิม (PHP) ที่ต้องรองรับ
- Angular เดิมเรียก API ผ่าน path ลักษณะ:
  - `/api/B_admin/login`
  - `/api/Dashboard/loadChartBudgetType_Pie`
  - `/api/school_year/change_year`
  - ฯลฯ
- NestJS จึงออกแบบ controller/module ให้ **ชื่อ path ใกล้เคียงเดิม** เพื่อให้ frontend ใช้ต่อได้โดยไม่ต้องแก้เยอะ

### 4. แนวคิดการออกแบบ Backend ใหม่ (NestJS)
- **แยกเป็นโมดูลตามหน้าจอ/หมวดงาน** เช่น `AdminModule`, `DashboardModule`, `SchoolYearModule`, `ProjectModule`, `SupplieModule`, ฯลฯ
- **ใช้ Entity ตามตารางจริง** จากไฟล์ `sfmisystem_db/*.sql`
- **ใช้ DTO + ValidationPipe** เพื่อให้ payload จาก Angular ถูกต้องและปลอดภัย
- **ใช้ Soft delete (`del`)** แทนการลบจริงในหลายตาราง

### 5. การไหลของข้อมูลตามกรอบงาน

#### งานนโยบายและแผน

##### - บันทึกข้อมูลนักเรียน
- Frontend เรียก `Student/checkClassOnYear` → Backend สร้างข้อมูลนักเรียนเริ่มต้นตามระดับชั้น (ถ้ายังไม่มี)
- Frontend เรียก `Student/loadStudent` → Backend ดึงข้อมูลนักเรียนพร้อมข้อมูลระดับชั้น
- Frontend เรียก `Student/updateStudent` → Backend อัปเดตจำนวนนักเรียน
- Frontend เรียก `Student/checkSendRecord` → Backend ตรวจสอบสถานะการส่งข้อมูล
- Frontend เรียก `Student/confirmSendRecord` → Backend ตั้งค่า status = 100 (ปิดการแก้ไข)
- **Backend Module:** `StudentModule` ✅

##### - คำนวณงบจากรายหัว
- Frontend เรียก `Student/loadCalculatePerhead` → Backend คำนวณงบประมาณจากรายหัวตามจำนวนนักเรียนและงบต่อหัว
- **Backend Module:** `StudentModule` ✅

##### - งบประมาณรวมรายปี
- Frontend เรียก `Budget/loadEstimateAcadyearGroup` → Backend ดึงข้อมูลงบประมาณรวมรายปี
- Frontend เรียก `Budget/addPLNBudgetCategory` → Backend บันทึกงบประมาณรวมรายปี
- **Backend Module:** `BudgetModule` ✅

##### - กำหนดวงเงินงบประมาณ
- Frontend เรียก `Budget/loadEstimateAcadyearGroup` → Backend ดึงข้อมูลวงเงินงบประมาณ
- Frontend เรียก `Budget/addPLNBudgetCategory` → Backend บันทึกวงเงินงบประมาณ
- **Backend Module:** `BudgetModule` ✅

##### โครงการ
- Frontend เรียก `Project_approve/loadProjectApprove` → Backend ดึงรายการโครงการ
- Frontend เรียก `Project_approve/addProjectApprove` → Backend เพิ่มโครงการ
- Frontend เรียก `Project_approve/updateProjectApprove` → Backend อัปเดตโครงการ
- **Backend Module:** `ProjectApproveModule` ✅

##### - ตั้งค่าฐานข้อมูลโรงเรียน
- Frontend เรียก `B_admin/load_user` → Backend ดึงข้อมูลผู้ใช้งาน
- Frontend เรียก `B_admin/updateAdmin` → Backend อัปเดตข้อมูลผู้ใช้งาน
- Frontend เรียก `Settings/loadSchoolPolicy` → Backend ดึงนโยบายโรงเรียน
- Frontend เรียก `Settings/load_ObecPolicy` → Backend ดึงนโยบาย สพท
- **Backend Modules:** `AdminModule`, `SettingsModule` ✅

##### - นโยบายโรงเรียน
- Frontend เรียก `Settings/loadSchoolPolicy` → Backend ดึงนโยบายโรงเรียน
- Frontend เรียก `Settings/addSchoolPolicy` → Backend บันทึกนโยบายโรงเรียน
- Frontend เรียก `Settings/updateSchoolPolicy` → Backend อัปเดตนโยบายโรงเรียน
- **Backend Module:** `SettingsModule` ✅

##### - นโยบาย สพท
- Frontend เรียก `Settings/load_ObecPolicy` → Backend ดึงนโยบาย สพท
- Frontend เรียก `Settings/add_ObecPolicy` → Backend บันทึกนโยบาย สพท
- Frontend เรียก `Settings/update_ObecPolicy` → Backend อัปเดตนโยบาย สพท
- **Backend Module:** `SettingsModule` ✅

#### งานหัวงานนโยบายและแผน

##### - การอนุมัติ (หัวงานนโยบายและแผน)
- Frontend เรียก `Project_approve/loadProjectApprove` → Backend ดึงรายการคำสั่งซื้อ/จ้างที่ต้องอนุมัติ (จาก `parcel_order`)
- Frontend เรียก `Project_approve/loadParcelDetail` → Backend ดึงรายละเอียดพัสดุในคำสั่งซื้อ (จาก `parcel_detail`)
- Frontend เรียก `Project_approve/approveParcelByPlan` → Backend อัปเดต `order_status` และ `remark_cf_plan` ใน `parcel_order`
- Frontend เรียก `Project_approve/approveParcelByBusiness` → Backend อัปเดต `order_status` และ `remark_cf_business` ใน `parcel_order`
- Frontend เรียก `Project_approve/approveParcelByCeo` → Backend อัปเดต `order_status` และ `remark_cf_ceo` ใน `parcel_order`
- Frontend เรียก `Project_approve/addProjectApprove` → Backend เพิ่มข้อมูลการอนุมัติโครงการใน `pln_proj_approve`
- Frontend เรียก `Project_approve/updateProjectApprove` → Backend อัปเดตข้อมูลการอนุมัติโครงการใน `pln_proj_approve`
- Frontend เรียก `Project_approve/removeParcelOrder` → Backend soft delete คำสั่งซื้อ (ตั้งค่า `del = 1`)
- Frontend เรียก `Project_approve/loadPartner` → Backend ดึงข้อมูลผู้รับเงิน/ห้างร้าน
- Frontend เรียก `Project_approve/loadProject` → Backend ดึงข้อมูลโครงการ
- Frontend เรียก `Project_approve/loadDirector` → Backend ดึงข้อมูลผู้อำนวยการ
- **Backend Module:** `ProjectApproveModule` ✅

#### งานการเงิน

##### การรับเงิน

###### - รับเงินเข้าบัญชี
- Frontend เรียก `Receive/loadReceive` → Backend ดึงข้อมูลการรับเงินพร้อมรายละเอียด
- Frontend เรียก `Receive/loadAutoAddReceive` → Backend คำนวณเลข pr_no อัตโนมัติ
- Frontend เรียก `Receive/addReceive` → Backend บันทึกการรับเงินและรายละเอียด (pln_receive, pln_receive_detail)
- **Backend Module:** `ReceiveModule` ✅

###### - รับเงินเหลือจ่ายปีเก่า
- Frontend เรียก `Receive/loadReceive` → Backend ดึงข้อมูลการรับเงิน (กรองตามปีงบประมาณ)
- Frontend เรียก `Receive/addReceive` → Backend บันทึกการรับเงินเหลือจ่ายปีเก่า
- **Backend Module:** `ReceiveModule` ✅

##### การจ่ายเงิน

###### - ขอเบิก
- Frontend เรียก `Invoice/loadInvoiceOrder` → Backend ดึงข้อมูลการขอเบิก
- Frontend เรียก `Invoice/loadProjects` → Backend ดึงข้อมูลโครงการที่อนุมัติแล้ว
- Frontend เรียก `Invoice/loadPartner` → Backend ดึงข้อมูลผู้รับเงิน/ห้างร้าน
- Frontend เรียก `Invoice/loadBudgetType` → Backend ดึงข้อมูลประเภทงบประมาณ
- Frontend เรียก `Invoice/loadUserRequest` → Backend ดึงข้อมูลผู้ขอเบิก
- Frontend เรียก `Invoice/addInvoice` → Backend สร้างการขอเบิก
- Frontend เรียก `Invoice/updateInvoice` → Backend อัปเดตการขอเบิก
- **Backend Module:** `InvoiceModule` ✅

###### - ออกเช็ค
- Frontend เรียก `Check/loadCheck` → Backend ดึงข้อมูลเช็ค (status = 200, 201, 202)
- Frontend เรียก `Check/loadAutoNoCheck` → Backend คำนวณเลขเช็คอัตโนมัติ
- Frontend เรียก `Check/loadUser` → Backend ดึงข้อมูลผู้ออกเช็ค
- Frontend เรียก `Check/loadPartner` → Backend ดึงข้อมูลผู้รับเงิน/ห้างร้าน
- Frontend เรียก `Check/loadBudget` → Backend ดึงข้อมูลประเภทงบประมาณ
- Frontend เรียก `Check/loadCheckById` → Backend ดึงข้อมูลเช็คตาม ID
- Frontend เรียก `Check/updateCheck` → Backend อัปเดตข้อมูลเช็ค (status = 202 = ออกเช็ค)
- **Backend Module:** `CheckModule` ✅

##### รายงานการเงิน

###### - ใบเสร็จรับเงิน
- Frontend เรียก `Receipt/loadReceipt` → Backend ดึงข้อมูลใบเสร็จรับเงิน
- Frontend เรียก `Receipt/loadReceive` → Backend ดึงข้อมูลการรับเงินที่ยืนยันแล้ว (cf_transaction = 1)
- Frontend เรียก `Receipt/addReceipt` → Backend สร้างใบเสร็จรับเงิน
- Frontend เรียก `Receipt/updateReceipt` → Backend อัปเดตใบเสร็จรับเงิน
- Frontend เรียก `Receipt/removeReceipt` → Backend ยกเลิกใบเสร็จ (status = '0')
- **Backend Module:** `ReceiptModule` ✅

###### - รายงานคงเหลือประจำวัน
- Frontend เรียก `ReportDailyBalance/loadDailyBalance` → Backend ดึงข้อมูลรายงานคงเหลือประจำวัน (จาก financial_transactions)
- **Backend Module:** `ReportDailyBalanceModule` ✅

###### - ลงทะเบียนควบคุมเช็ค
- Frontend เรียก `ReportCheckControl/loadCheckControl` → Backend ดึงข้อมูลลงทะเบียนควบคุมเช็ค (จาก request_withdraw)
- **Backend Module:** `ReportCheckControlModule` ✅

###### - ลงทะเบียนควบคุมบัญชีธนาคาร
- Frontend เรียก `ReportBookbank/loadReportRegisterBookbank` → Backend ดึงข้อมูลลงทะเบียนควบคุมบัญชีธนาคาร
- **Backend Module:** `ReportBookbankModule` ✅

###### - ทะเบียนคุมหน้างบใบสำคัญคู่จ่าย(บจ./บค.)
- Frontend เรียก `RegisterMoneyType/load_register_control_money_type` → Backend ดึงข้อมูลทะเบียนคุมหน้างบใบสำคัญคู่จ่าย
- **Backend Module:** `RegisterMoneyTypeModule` ✅

###### - ลงทะเบียนควบคุมประเภทเงิน
- Frontend เรียก `RegisterMoneyType/load_budget_type` → Backend ดึงข้อมูลประเภทเงิน
- Frontend เรียก `RegisterMoneyType/load_register_control_money_type` → Backend ดึงข้อมูลลงทะเบียนควบคุมประเภทเงิน
- **Backend Module:** `RegisterMoneyTypeModule` ✅

##### ตั้งค่าการเงิน

###### - บัญชีธนาคาร
- Frontend เรียก `Bank/loadBankAccount` → Backend ดึงข้อมูลบัญชีธนาคาร
- Frontend เรียก `Bank/loadBankDB` → Backend ดึงข้อมูลธนาคาร (bank_db)
- Frontend เรียก `Bank/addBankAccount` → Backend เพิ่มบัญชีธนาคาร
- Frontend เรียก `Bank/updateBankAccount` → Backend อัปเดตบัญชีธนาคาร
- Frontend เรียก `Bank/removeBankAccount` → Backend soft delete บัญชีธนาคาร
- **Backend Module:** `BankModule` ✅

###### - ผูกบัญชีธนาคารกับประเภทเงิน
- Frontend เรียก `Bank/checkBindingBankAccount` → Backend ตรวจสอบการผูกบัญชีธนาคารกับประเภทเงิน (นับจาก budget_income_type_school)
- Frontend เรียก `Bank/addBudgetSchool` → Backend ผูกบัญชีธนาคารกับประเภทเงิน (budget_income_type_school)
- **Backend Module:** `BankModule` ✅

###### - ผู้รับเงิน/ห้างร้าน
- Frontend เรียก `General_db/load_partner` → Backend ดึงข้อมูลผู้รับเงิน/ห้างร้าน
- Frontend เรียก `General_db/add_partner` → Backend เพิ่มผู้รับเงิน/ห้างร้าน
- Frontend เรียก `General_db/update_partner` → Backend อัปเดตผู้รับเงิน/ห้างร้าน
- Frontend เรียก `General_db/remove_partner` → Backend soft delete ผู้รับเงิน/ห้างร้าน
- **Backend Module:** `GeneralDbModule` ✅

#### งานพัสดุ

##### แต่งตั้งคณะกรรมการ
- Frontend เรียก `Audit_committee/loadAuditCommitteeStatus` → Backend ดึงข้อมูลสถานะการแต่งตั้งคณะกรรมการ
- Frontend เรียก `Audit_committee/updateSetCommittee` → Backend บันทึกข้อมูลคณะกรรมการ (committee1, committee2, committee3, p_id, day_deadline, date_deadline)
- **Backend Module:** `AuditCommitteeModule` ✅

##### ขอซื้อ/ขอจ้าง
- Frontend เรียก `Project_approve/loadProjectApprove` → Backend ดึงรายการขอซื้อ/ขอจ้าง
- Frontend เรียก `Project_approve/addProjectApprove` → Backend เพิ่มขอซื้อ/ขอจ้าง
- Frontend เรียก `Project_approve/updateProjectApprove` → Backend อัปเดตขอซื้อ/ขอจ้าง
- **Backend Module:** `ProjectApproveModule` ✅

##### ตรวจรับพัสดุ
- Frontend เรียก `Supplie/loadReceive` → Backend ดึงข้อมูลการตรวจรับพัสดุ
- Frontend เรียก `Supplie/editReceiveParcel` → Backend บันทึกการตรวจรับพัสดุ
- Frontend เรียก `Supplie/removeReceiveParcel` → Backend soft delete การตรวจรับพัสดุ
- **Backend Module:** `SupplieModule` ✅

##### บัญชีวัสดุ
- Frontend เรียก `General_db/load_supplies` → Backend ดึงข้อมูลบัญชีวัสดุ
- Frontend เรียก `General_db/addSupplie` → Backend เพิ่มบัญชีวัสดุ
- Frontend เรียก `General_db/updateSupplies` → Backend อัปเดตบัญชีวัสดุ
- Frontend เรียก `General_db/remove_supplies` → Backend soft delete บัญชีวัสดุ
- Frontend เรียก `General_db/loadFixSupplies` → Backend ดึงข้อมูลวัสดุที่ต้องแก้ไข
- Frontend เรียก `General_db/fixSupplies` → Backend แก้ไขข้อมูลวัสดุ
- **Backend Module:** `GeneralDbModule` ✅

##### เบิกพัสดุ
- Frontend เรียก `Supplie/loadParcelDetailWithdraw` → Backend ดึงข้อมูลการเบิกพัสดุ
- Frontend เรียก `Supplie/confiirmWithDrawParcel` → Backend ยืนยันการเบิกพัสดุ
- **Backend Module:** `SupplieModule` ✅

##### ตั้งค่างานพัสดุ

###### - ประเภทพัสดุ
- Frontend เรียก `General_db/loadTypeSupplie` → Backend ดึงข้อมูลประเภทพัสดุ
- Frontend เรียก `General_db/addTypeSupplie` → Backend เพิ่มประเภทพัสดุ
- Frontend เรียก `General_db/updateTypeSupplie` → Backend อัปเดตประเภทพัสดุ
- Frontend เรียก `General_db/removeTypeSupplie` → Backend soft delete ประเภทพัสดุ
- **Backend Module:** `GeneralDbModule` ✅

###### - หน่วยการนับ
- Frontend เรียก `General_db/loadUnit` → Backend ดึงข้อมูลหน่วยการนับ
- Frontend เรียก `General_db/addUnit` → Backend เพิ่มหน่วยการนับ
- Frontend เรียก `General_db/updateUnit` → Backend อัปเดตหน่วยการนับ
- Frontend เรียก `General_db/removeUnit` → Backend soft delete หน่วยการนับ
- **Backend Module:** `GeneralDbModule` ✅

##### อนุมัติใช้งบประมาณ
- Frontend เรียก `Project_approve/loadProjectApprove` → Backend ดึงรายการที่ต้องอนุมัติใช้งบประมาณ
- Frontend เรียก `Project_approve/approveParcelByPlan` → Backend อนุมัติใช้งบประมาณ (แผน)
- Frontend เรียก `Project_approve/approveParcelByBusiness` → Backend อนุมัติใช้งบประมาณ (การเงิน)
- Frontend เรียก `Project_approve/approveParcelByCeo` → Backend อนุมัติใช้งบประมาณ (ผู้อำนวยการ)
- **Backend Module:** `ProjectApproveModule` ✅

##### อนุมัติเบิกพัสดุ
- Frontend เรียก `Supplie/loadGetSupplieOrder` → Backend ดึงรายการที่ต้องอนุมัติเบิกพัสดุ
- Frontend เรียก `Supplie/updateSupplieOrder` → Backend อนุมัติเบิกพัสดุ
- **Backend Module:** `SupplieModule` ✅

#### งานผู้อำนวยการ

##### การอนุมัติ (งาน ผอ.)

###### - ผอ. อนุมัติโครงการ
- Frontend เรียก `Project_approve/loadProjectApprove` → Backend ดึงรายการโครงการที่ต้องอนุมัติ
- Frontend เรียก `Project_approve/approveParcelByCeo` → Backend อนุมัติโครงการ (ผู้อำนวยการ)
- **Backend Module:** `ProjectApproveModule` ✅

###### - ผอ. อนุมัติใช้งบประมาณ
- Frontend เรียก `Project_approve/loadProjectApprove` → Backend ดึงรายการที่ต้องอนุมัติใช้งบประมาณ
- Frontend เรียก `Project_approve/approveParcelByCeo` → Backend อนุมัติใช้งบประมาณ (ผู้อำนวยการ)
- **Backend Module:** `ProjectApproveModule` ✅

###### - ผอ. อนุมัติขอเบิก
- Frontend เรียก `Invoice/loadConfirmInvoice` → Backend ดึงรายการขอเบิกที่ต้องอนุมัติ
- Frontend เรียก `Invoice/ConfirmInvoice` → Backend อนุมัติขอเบิก (ผู้อำนวยการ)
- **Backend Module:** `InvoiceModule` ✅

##### รายงาน

###### - ใบเสร็จรับเงิน
- Frontend เรียก `Receipt/loadReceipt` → Backend ดึงข้อมูลใบเสร็จรับเงิน
- **Backend Module:** `ReceiptModule` ✅

###### - รายงานคงเหลือประจำวัน
- Frontend เรียก `ReportDailyBalance/loadDailyBalance` → Backend ดึงข้อมูลรายงานคงเหลือประจำวัน
- **Backend Module:** `ReportDailyBalanceModule` ✅

###### - ลงทะเบียนควบคุมเช็ค
- Frontend เรียก `ReportCheckControl/loadCheckControl` → Backend ดึงข้อมูลลงทะเบียนควบคุมเช็ค
- **Backend Module:** `ReportCheckControlModule` ✅

###### - ลงทะเบียนควบคุมบัญชีธนาคาร
- Frontend เรียก `ReportBookbank/loadReportRegisterBookbank` → Backend ดึงข้อมูลลงทะเบียนควบคุมบัญชีธนาคาร
- **Backend Module:** `ReportBookbankModule` ✅

###### - ทะเบียนคุมหน้างบใบสำคัญคู่จ่าย(บจ./บค.)
- Frontend เรียก `RegisterMoneyType/load_register_control_money_type` → Backend ดึงข้อมูลทะเบียนคุมหน้างบใบสำคัญคู่จ่าย
- **Backend Module:** `RegisterMoneyTypeModule` ✅

###### - ลงทะเบียนควบคุมประเภทเงิน
- Frontend เรียก `RegisterMoneyType/load_budget_type` → Backend ดึงข้อมูลประเภทเงิน
- Frontend เรียก `RegisterMoneyType/load_register_control_money_type` → Backend ดึงข้อมูลลงทะเบียนควบคุมประเภทเงิน
- **Backend Module:** `RegisterMoneyTypeModule` ✅

##### ตั้งค่าฐานข้อมูลโรงเรียน

###### - ข้อมูลผู้ใช้งาน (Users)
- Frontend เรียก `B_admin/load_user` → Backend ดึงข้อมูลผู้ใช้งาน
- Frontend เรียก `B_admin/load_admin` → Backend ดึงข้อมูลผู้ดูแลระบบ
- Frontend เรียก `B_admin/updateAdmin` → Backend อัปเดตข้อมูลผู้ใช้งาน
- Frontend เรียก `B_admin/loadPosition` → Backend ดึงข้อมูลตำแหน่ง
- **Backend Module:** `AdminModule` ✅

###### - นโยบายโรงเรียน
- Frontend เรียก `Settings/loadSchoolPolicy` → Backend ดึงนโยบายโรงเรียน
- Frontend เรียก `Settings/addSchoolPolicy` → Backend บันทึกนโยบายโรงเรียน
- Frontend เรียก `Settings/updateSchoolPolicy` → Backend อัปเดตนโยบายโรงเรียน
- **Backend Module:** `SettingsModule` ✅

###### - นโยบาย สพท
- Frontend เรียก `Settings/load_ObecPolicy` → Backend ดึงนโยบาย สพท
- Frontend เรียก `Settings/add_ObecPolicy` → Backend บันทึกนโยบาย สพท
- Frontend เรียก `Settings/update_ObecPolicy` → Backend อัปเดตนโยบาย สพท
- **Backend Module:** `SettingsModule` ✅

### 6. Backend Modules ที่สร้างแล้ว

1. **AdminModule** - จัดการผู้ใช้งานและผู้ดูแลระบบ
2. **DashboardModule** - Dashboard และรายงานสรุป
3. **SchoolYearModule** - จัดการปีการศึกษา
4. **SchoolModule** - ข้อมูลโรงเรียน
5. **GeneralDbModule** - ข้อมูลพื้นฐาน (Unit, Type Supplies, Supplies, Partner)
6. **PolicyModule** - นโยบายและข้อมูลพื้นฐาน
7. **StudentModule** - บันทึกข้อมูลนักเรียนและคำนวณงบจากรายหัว
8. **BudgetModule** - งบประมาณรวมรายปีและกำหนดวงเงินงบประมาณ
9. **SettingsModule** - ตั้งค่าต่างๆ (นโยบายโรงเรียน, นโยบาย สพท)
10. **ProjectApproveModule** - การอนุมัติโครงการและขอซื้อ/ขอจ้าง
11. **ReceiveModule** - การรับเงิน
12. **ReceiptModule** - ใบเสร็จรับเงิน
13. **InvoiceModule** - ขอเบิก
14. **CheckModule** - ออกเช็ค
15. **BankModule** - ตั้งค่าการเงิน (บัญชีธนาคาร, ผูกบัญชี)
16. **SupplieModule** - งานพัสดุ (ตรวจรับ, เบิก, อนุมัติ)
17. **AuditCommitteeModule** - แต่งตั้งคณะกรรมการ
18. **ReportDailyBalanceModule** - รายงานคงเหลือประจำวัน
19. **ReportCheckControlModule** - ลงทะเบียนควบคุมเช็ค
20. **ReportBookbankModule** - ลงทะเบียนควบคุมบัญชีธนาคาร
21. **RegisterMoneyTypeModule** - ทะเบียนคุมหน้างบใบสำคัญคู่จ่ายและควบคุมประเภทเงิน

### 7. โครงสร้าง Frontend Modules

#### SFMIS Modules (หลัก)
- `src/app/modules/admin/sfmisystem/` - โมดูลหลักของ SFMIS
  - `admin/` - จัดการผู้ใช้งาน
  - `budget-income-type-school/` - ประเภทงบประมาณโรงเรียน
  - `confirm-invoice/` - อนุมัติขอเบิก
  - `generate-check/` - ออกเช็ค
  - `invoice/` - ขอเบิก
  - `money/` - การเงิน
  - `parcel/` - พัสดุ
  - `payment-type/` - ประเภทการจ่าย
  - `policy/` - นโยบาย
  - `proj-approve-*` - การอนุมัติโครงการ (plan, business, ceo, supplie)
  - `receipt/` - ใบเสร็จรับเงิน
  - `report/` - รายงาน
  - `school/` - โรงเรียน
  - `settings/` - ตั้งค่า
  - `supplie_flow/` - งานพัสดุ
  - `users/` - ผู้ใช้
  - `withholding-certificate/` - ใบหักภาษี ณ ที่จ่าย
  - `year/` - ปีการศึกษา

#### AIMC Modules (เพิ่มเติม)
- `src/app/modules/admin/aimc/` - ระบบจัดการการอบรม (AIMC)
  - `reports/` - รายงาน (login, training, test-result, etc.)
  - `courses/`, `rounds/`, `certificates/` - จัดการหลักสูตร
  - และอื่นๆ

### 8. API Communication Pattern

#### Frontend → Backend
- ใช้ `ConnectApiService` (`src/@fuse/services/connect.api.service.ts`)
- Methods:
  - `getData<T>(segment: string)` - GET request
  - `postData<T>(segment: string, objdata: any)` - POST request
- Auto-inject `up_by` จาก localStorage

#### Response Format
- **List**: `{ data: any[], count: number, page: number, pageSize: number }`
- **Create/Update/Delete**: `{ flag: boolean, ms: string }`

### 9. Environment Configuration

#### Frontend (`src/environments/environment.ts`)
```typescript
{
  production: false,
  apiUrl: 'http://localhost:3000/api/',
  featureFlags: { ... }
}
```

#### Backend (`backend/.env`)
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=sfmisystem
```

### 10. ไฟล์เอกสารที่ช่วยเข้าใจระบบ
- `backend/BACKEND_ARCHITECTURE.md` – รายชื่อทุก endpoint + โครงโมดูล backend
- `backend/CREATE_MODULES_GUIDE.md` – template การสร้างโมดูลใหม่ใน NestJS
- `backend/README.md` – คู่มือการใช้งาน backend
- `plan.md` – แผน roadmap การพัฒนา
- `tasks.md` – งานย่อยและสถานะ
- `README.md` – คู่มือการใช้งานระบบ
- `.cursorrules` – กติกาสำหรับ AI assistant
