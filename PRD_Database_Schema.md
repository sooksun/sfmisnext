# PRD: Database Schema Documentation
## SFMIS System - Complete Prisma Schema

**Document Version**: 1.0  
**Date**: December 16, 2025  
**Related**: PRD_SFMIS_NextJS_NestJS_Prisma.md

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Complete Prisma Schema](#complete-prisma-schema)
3. [Entity Relationships](#entity-relationships)
4. [Indexes & Performance](#indexes--performance)
5. [Migration Scripts](#migration-scripts)

---

## 1. Schema Overview

### 1.1 Database Statistics

- **Total Tables**: 56 tables
- **Master Data Tables**: 15 tables
- **Transaction Tables**: 25 tables
- **Report Tables**: 8 tables
- **System Tables**: 8 tables

### 1.2 Naming Conventions

**Current (MySQL)**:
- Tables: `snake_case` (e.g., `pln_budget_category`)
- Columns: `snake_case` (e.g., `bg_type_id`)

**New (Prisma)**:
- Models: `PascalCase` (e.g., `PlnBudgetCategory`)
- Fields: `camelCase` (e.g., `bgTypeId`)
- Relations: `camelCase` (e.g., `budgetCategory`)

### 1.3 Common Patterns

**Soft Delete**:
```prisma
del Int @default(0)  // 0 = active, 1 = deleted
```

**Audit Fields**:
```prisma
upBy       Int?      @map("up_by")
creDate    DateTime? @map("cre_date")
upDate     DateTime? @default(now()) @map("up_date")
createDate DateTime? @map("create_date")
updateDate DateTime? @map("update_date")
```

**Primary Key Patterns**:
- Auto-increment INT
- Mapped to descriptive names (e.g., `@map("admin_id")`)

---

## 2. Complete Prisma Schema

### 2.1 Schema Configuration

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["filteredRelationCount", "fullTextSearch", "fullTextIndex"]
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### 2.2 Authentication & User Management

```prisma
// ============================================
// AUTHENTICATION & USER MANAGEMENT
// ============================================

model Admin {
  id              Int       @id @default(autoincrement()) @map("admin_id")
  name            String?   @db.VarChar(255)
  username        String?   @unique @db.VarChar(255)
  email           String?   @db.VarChar(255)
  password        String?   @db.VarChar(100)
  passwordDefault String?   @default("-") @map("password_default") @db.VarChar(45)
  lastLogin       DateTime? @map("last_login") @db.DateTime
  del             Int       @default(0)
  codeLogin       String?   @map("code_login") @db.VarChar(100)
  avatar          String?   @map("avata") @db.VarChar(255)
  license         String?   @db.Text
  upBy            Int?      @map("up_by")
  upDate          DateTime? @default(now()) @map("up_date") @db.DateTime
  type            Int?      @db.Int
  position        Int?      @default(0)
  creDate         DateTime? @map("cre_date") @db.DateTime
  scId            Int?      @default(0) @map("sc_id")

  // Relations
  school          School?   @relation(fields: [scId], references: [id])
  
  // Reverse relations
  createdProjects       Project[]        @relation("ProjectCreator")
  updatedBudgets        PlnBudgetCategory[] @relation("BudgetUpdater")
  createdReceipts       Receipt[]        @relation("ReceiptCreator")
  approvedInvoices      RequestWithdraw[] @relation("InvoiceApprover")

  @@map("admin")
  @@index([scId], name: "idx_admin_sc_id")
  @@index([username], name: "idx_admin_username")
  @@index([email], name: "idx_admin_email")
  @@index([type], name: "idx_admin_type")
  @@index([del], name: "idx_admin_del")
}

model MasterLevel {
  id          Int     @id @default(autoincrement()) @map("lev_id")
  name        String  @map("lev_name") @db.VarChar(255)
  detail      String? @map("lev_detail") @db.Text
  
  @@map("master_level")
}
```

### 2.3 School & School Year Management

```prisma
// ============================================
// SCHOOL & SCHOOL YEAR MANAGEMENT
// ============================================

model School {
  id          Int       @id @default(autoincrement()) @map("sc_id")
  code        String?   @map("sc_code") @db.VarChar(255)
  name        String?   @map("sc_name") @db.VarChar(255)
  tel         String?   @map("sc_tel") @db.VarChar(255)
  fax         String?   @map("sc_fax") @db.VarChar(255)
  email       String?   @map("sc_email") @db.VarChar(255)
  website     String?   @map("sc_website") @db.VarChar(255)
  province    Int?      @map("sc_province")
  district    Int?      @map("sc_district")
  subDistrict Int?      @map("sc_subdist")
  postcode    String?   @map("sc_postcode") @db.VarChar(255)
  address     String?   @map("sc_address") @db.Text
  logo        String?   @map("sc_logo") @db.VarChar(255)
  header      String?   @map("sc_header") @db.VarChar(255)
  del         Int       @default(0)
  creDate     DateTime? @map("cre_date") @db.DateTime
  upDate      DateTime? @default(now()) @map("up_date") @db.DateTime
  upBy        Int?      @map("up_by")

  // Relations
  admins              Admin[]
  schoolYears         SchoolYear[]
  students            Student[]
  budgetCategories    PlnBudgetCategory[]
  projects            Project[]
  parcelOrders        ParcelOrder[]
  receives            PlnReceive[]
  receipts            Receipt[]
  invoices            RequestWithdraw[]
  bankAccounts        BankAccount[]
  supplies            TbSupplies[]
  partners            TbPartner[]

  @@map("school")
  @@index([code], name: "idx_school_code")
  @@index([del], name: "idx_school_del")
}

model SchoolYear {
  id              Int       @id @default(autoincrement()) @map("sy_id")
  year            Int       @map("sy_year")
  semester        Int       @default(1)
  startDate       DateTime  @map("sy_date_s") @db.Date
  endDate         DateTime  @map("sy_date_e") @db.Date
  upBy            Int?      @map("up_by")
  del             Int       @default(0)
  creDate         DateTime? @map("cre_date") @db.DateTime
  upDate          DateTime? @default(now()) @map("up_date") @db.DateTime
  scId            Int?      @map("sc_id")
  budgetYear      Int?      @map("budget_year")
  budgetStartDate DateTime? @map("budget_date_s") @db.Date
  budgetEndDate   DateTime? @map("budget_date_e") @db.Date

  // Relations
  school              School?   @relation(fields: [scId], references: [id])
  students            Student[]
  budgetCategories    PlnBudgetCategory[]
  estimateAcadyears   TbEstimateAcadyear[]
  projects            Project[]
  parcelOrders        ParcelOrder[]
  receives            PlnReceive[]
  submittingRecords   SubmittingStudentRecords[]

  @@map("school_year")
  @@index([scId], name: "idx_school_year_sc_id")
  @@index([year], name: "idx_school_year_year")
  @@index([budgetYear], name: "idx_school_year_budget_year")
  @@index([del], name: "idx_school_year_del")
}
```

### 2.4 Student & Classroom Management

```prisma
// ============================================
// STUDENT & CLASSROOM MANAGEMENT
// ============================================

model Student {
  id          Int       @id @default(autoincrement()) @map("st_id")
  scId        Int       @map("sc_id")
  syId        Int       @map("sy_id")
  budgetYear  String    @map("budget_year") @db.VarChar(45)
  classId     Int       @map("class_id")
  stCount     Int       @default(0) @map("st_count")
  upBy        Int?      @map("up_by")
  createDate  DateTime? @map("create_date") @db.DateTime
  updateDate  DateTime? @map("update_date") @db.DateTime
  del         Int       @default(0)

  // Relations
  school      School     @relation(fields: [scId], references: [id])
  schoolYear  SchoolYear @relation(fields: [syId], references: [id])
  classroom   MasterClassroom @relation(fields: [classId], references: [id])

  @@map("tb_student")
  @@index([scId], name: "idx_student_sc_id")
  @@index([syId], name: "idx_student_sy_id")
  @@index([classId], name: "idx_student_class_id")
  @@index([budgetYear], name: "idx_student_budget_year")
  @@index([del], name: "idx_student_del")
}

model MasterClassroom {
  id       Int     @id @default(autoincrement()) @map("class_id")
  level    String  @map("class_lev") @db.VarChar(255)
  name     String? @map("class_name") @db.VarChar(255)
  sequence Int?    @map("class_seq")

  // Relations
  students         Student[]
  classroomBudgets MasterClassroomBudget[]

  @@map("master_classroom")
  @@index([sequence], name: "idx_classroom_seq")
}

model MasterClassroomBudget {
  id          Int     @id @default(autoincrement()) @map("mcb_id")
  classId     Int     @map("class_id")
  bgTypeId    Int     @map("bg_type_id")
  perHead     Float   @default(0) @map("per_head") @db.Float

  // Relations
  classroom   MasterClassroom @relation(fields: [classId], references: [id])
  incomeType  MasterBudgetIncomeType @relation(fields: [bgTypeId], references: [id])

  @@map("master_classroombudget")
  @@index([classId], name: "idx_classroom_budget_class_id")
  @@index([bgTypeId], name: "idx_classroom_budget_bg_type_id")
}

model SubmittingStudentRecords {
  id          Int       @id @default(autoincrement()) @map("ssr_id")
  scId        Int       @map("sc_id")
  syId        Int       @map("sy_id")
  year        Int
  status      Int       @default(0)
  upBy        Int?      @map("up_by")
  createDate  DateTime? @map("create_date") @db.DateTime
  updateDate  DateTime? @map("update_date") @db.DateTime
  del         Int       @default(0)

  // Relations
  schoolYear  SchoolYear @relation(fields: [syId], references: [id])

  @@map("submitting_student_records")
  @@index([scId], name: "idx_ssr_sc_id")
  @@index([syId], name: "idx_ssr_sy_id")
  @@index([status], name: "idx_ssr_status")
  @@index([del], name: "idx_ssr_del")
}
```

### 2.5 Budget Management

```prisma
// ============================================
// BUDGET MANAGEMENT
// ============================================

model MasterBudgetCategory {
  id          Int     @id @default(autoincrement()) @map("bg_cate_id")
  name        String  @map("bg_cate_name") @db.VarChar(255)
  detail      String? @map("bg_cate_detail") @db.Text
  sequence    Int?    @map("bg_cate_seq")

  // Relations
  budgetCategories PlnBudgetCategory[]

  @@map("master_budget_category")
  @@index([sequence], name: "idx_budget_category_seq")
}

model MasterBudgetIncomeType {
  id      Int     @id @default(autoincrement()) @map("bg_type_id")
  name    String  @map("bg_type_name") @db.VarChar(255)
  detail  String? @map("bg_type_detail") @db.Text

  // Relations
  budgetDetails       PlnBudgetCategoryDetail[]
  classroomBudgets    MasterClassroomBudget[]
  schools             BudgetIncomeTypeSchool[]
  receiveDetails      PlnReceiveDetail[]

  @@map("master_budget_income_type")
}

model PlnBudgetCategory {
  id          Int       @id @default(autoincrement()) @map("pbc_id")
  scId        Int       @map("sc_id")
  acadYear    Int       @map("acad_year")
  budgetYear  String?   @map("budget_year") @db.VarChar(45)
  bgCateId    Int       @map("bg_cate_id")
  percents    Float     @default(0) @map("percents") @db.Float
  total       Float     @default(0) @db.Float
  del         Int       @default(0)
  upBy        Int?      @map("up_by")
  createDate  DateTime? @map("create_date") @db.DateTime
  updateDate  DateTime? @map("update_date") @db.DateTime

  // Relations
  school      School              @relation(fields: [scId], references: [id])
  schoolYear  SchoolYear          @relation(fields: [acadYear], references: [id])
  category    MasterBudgetCategory @relation(fields: [bgCateId], references: [id])
  details     PlnBudgetCategoryDetail[]
  updater     Admin?              @relation("BudgetUpdater", fields: [upBy], references: [id])

  @@map("pln_budget_category")
  @@index([scId], name: "idx_pln_budget_sc_id")
  @@index([acadYear], name: "idx_pln_budget_acad_year")
  @@index([bgCateId], name: "idx_pln_budget_bg_cate_id")
  @@index([budgetYear], name: "idx_pln_budget_budget_year")
  @@index([del], name: "idx_pln_budget_del")
}

model PlnBudgetCategoryDetail {
  id          Int       @id @default(autoincrement()) @map("pbcd_id")
  pbcId       Int       @map("pbc_id")
  bgTypeId    Int       @map("bg_type_id")
  budget      Float     @default(0) @db.Float
  del         Int       @default(0)
  upBy        Int?      @map("up_by")
  createDate  DateTime? @map("create_date") @db.DateTime
  updateDate  DateTime? @map("update_date") @db.DateTime

  // Relations
  budgetCategory PlnBudgetCategory      @relation(fields: [pbcId], references: [id])
  incomeType     MasterBudgetIncomeType @relation(fields: [bgTypeId], references: [id])

  @@map("pln_budget_category_detail")
  @@index([pbcId], name: "idx_pbcd_pbc_id")
  @@index([bgTypeId], name: "idx_pbcd_bg_type_id")
  @@index([del], name: "idx_pbcd_del")
}

model TbEstimateAcadyear {
  id          Int       @id @default(autoincrement()) @map("ea_id")
  scId        Int       @map("sc_id")
  syId        Int       @map("sy_id")
  budgetYear  String    @map("budget_year") @db.VarChar(45)
  eaBudget    Float     @default(0) @map("ea_budget") @db.Float
  del         Int       @default(0)
  upBy        Int?      @map("up_by")
  createDate  DateTime? @map("create_date") @db.DateTime
  updateDate  DateTime? @map("update_date") @db.DateTime

  // Relations
  schoolYear  SchoolYear @relation(fields: [syId], references: [id])

  @@map("tb_estimate_acadyear")
  @@index([scId], name: "idx_estimate_sc_id")
  @@index([syId], name: "idx_estimate_sy_id")
  @@index([budgetYear], name: "idx_estimate_budget_year")
  @@index([del], name: "idx_estimate_del")
}

model TbExpenses {
  id          Int       @id @default(autoincrement()) @map("ex_id")
  scId        Int       @map("sc_id")
  exYearIn    Int?      @map("ex_year_in")
  bgTypeId    Int?      @map("bg_type_id")
  exYearOut   String?   @map("ex_year_out") @db.VarChar(45)
  exMoney     Float     @default(0) @map("ex_money") @db.Float
  exDate      DateTime? @map("ex_date") @db.Date
  exDetail    String?   @map("ex_detail") @db.Text
  del         Int       @default(0)
  upBy        Int?      @map("up_by")
  createDate  DateTime? @map("create_date") @db.DateTime
  updateDate  DateTime? @map("update_date") @db.DateTime

  @@map("tb_expenses")
  @@index([scId], name: "idx_expenses_sc_id")
  @@index([bgTypeId], name: "idx_expenses_bg_type_id")
  @@index([exYearOut], name: "idx_expenses_year_out")
  @@index([del], name: "idx_expenses_del")
}

model PlnRealBudget {
  id              Int       @id @default(autoincrement()) @map("prb_id")
  scId            Int       @map("sc_id")
  syId            Int       @map("sy_id")
  budgetYear      String    @map("budget_year") @db.VarChar(45)
  bgTypeId        Int       @map("bg_type_id")
  realBudget      Float     @default(0) @map("real_budget") @db.Float
  realBudgetDate  DateTime? @map("real_budget_date") @db.Date
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  @@map("pln_real_budget")
  @@index([scId], name: "idx_real_budget_sc_id")
  @@index([syId], name: "idx_real_budget_sy_id")
  @@index([bgTypeId], name: "idx_real_budget_bg_type_id")
  @@index([budgetYear], name: "idx_real_budget_budget_year")
  @@index([del], name: "idx_real_budget_del")
}

model BudgetIncomeTypeSchool {
  id          Int       @id @default(autoincrement()) @map("bits_id")
  scId        Int       @map("sc_id")
  bgTypeId    Int       @map("bg_type_id")
  baId        Int?      @map("ba_id")
  upBy        Int?      @map("up_by")
  del         Int       @default(0)
  createDate  DateTime? @map("create_date") @db.DateTime
  updateDate  DateTime? @map("update_date") @db.DateTime

  // Relations
  incomeType  MasterBudgetIncomeType @relation(fields: [bgTypeId], references: [id])
  bankAccount BankAccount?           @relation(fields: [baId], references: [id])

  @@map("budget_income_type_school")
  @@index([scId], name: "idx_bits_sc_id")
  @@index([bgTypeId], name: "idx_bits_bg_type_id")
  @@index([baId], name: "idx_bits_ba_id")
  @@index([del], name: "idx_bits_del")
}
```

### 2.6 Project Management

```prisma
// ============================================
// PROJECT MANAGEMENT
// ============================================

model Project {
  id              Int       @id @default(autoincrement()) @map("project_id")
  scId            Int       @map("sc_id")
  syId            Int       @map("sy_id")
  projectName     String    @map("project_name") @db.VarChar(255)
  projectDetail   String?   @map("project_detail") @db.Text
  projectBudget   Float     @default(0) @map("project_budget") @db.Float
  bgTypeId        Int?      @map("bg_type_id")
  projectType     String?   @map("project_type") @db.VarChar(45)
  projectStatus   Int       @default(0) @map("project_status")
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  // Relations
  school          School     @relation(fields: [scId], references: [id])
  schoolYear      SchoolYear @relation(fields: [syId], references: [id])
  creator         Admin?     @relation("ProjectCreator", fields: [upBy], references: [id])
  approvals       PlnProjApprove[]
  parcelOrders    ParcelOrder[]

  @@map("project")
  @@index([scId], name: "idx_project_sc_id")
  @@index([syId], name: "idx_project_sy_id")
  @@index([bgTypeId], name: "idx_project_bg_type_id")
  @@index([projectStatus], name: "idx_project_status")
  @@index([del], name: "idx_project_del")
}

model PlnProjApprove {
  id              Int       @id @default(autoincrement()) @map("ppa_id")
  projectId       Int       @map("project_id")
  approveStatus   Int       @default(0) @map("approve_status")
  approveBy       Int?      @map("approve_by")
  approveDate     DateTime? @map("approve_date") @db.DateTime
  approveRemark   String?   @map("approve_remark") @db.Text
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  // Relations
  project         Project   @relation(fields: [projectId], references: [id])

  @@map("pln_proj_approve")
  @@index([projectId], name: "idx_proj_approve_project_id")
  @@index([approveStatus], name: "idx_proj_approve_status")
  @@index([del], name: "idx_proj_approve_del")
}
```

### 2.7 Procurement & Supply

```prisma
// ============================================
// PROCUREMENT & SUPPLY MANAGEMENT
// ============================================

model ParcelOrder {
  id                  Int       @id @default(autoincrement()) @map("order_id")
  projectId           Int?      @map("project_id")
  projectType         String?   @map("project_type") @db.VarChar(45)
  scId                Int       @map("sc_id")
  bgTypeId            Int?      @map("bg_type_id")
  adminId             Int?      @map("admin_id")
  orderDate           DateTime? @map("order_date") @db.Date
  orderStatus         Int       @default(0) @map("order_status")
  remark              String?   @db.Text
  remarkCfPlan        String?   @map("remark_cf_plan") @db.Text
  remarkCfBusiness    String?   @map("remark_cf_business") @db.Text
  remarkCfSuppile     String?   @map("remark_cf_suppile") @db.Text
  remarkCfCeo         String?   @map("remark_cf_ceo") @db.Text
  del                 Int       @default(0)
  createDate          DateTime? @map("create_date") @db.DateTime
  updateDate          DateTime? @map("update_date") @db.DateTime
  operateDate         DateTime? @map("operate_date") @db.Date
  acadYear            Int?      @map("acad_year")
  numbers             String?   @db.VarChar(255)
  details             String?   @db.Text
  pId                 Int?      @map("p_id")
  resources           String?   @db.Text
  budgets             Float?    @db.Float
  jobType             String?   @map("job_type") @db.VarChar(255)
  noteNumber          String?   @map("note_number") @db.VarChar(255)
  buyDate             DateTime? @map("buy_date") @db.Date
  buyReason           String?   @map("buy_reason") @db.Text
  departments         String?   @db.Text
  dueDate             DateTime? @map("due_date") @db.Date
  committee1          Int?      @map("committee1")
  committee2          Int?      @map("committee2")
  committee3          Int?      @map("committee3")
  dateDeadline        DateTime? @map("date_deadline") @db.Date
  dayDeadline         Int?      @map("day_deadline")
  upBy                Int?      @map("up_by")

  // Relations
  school              School       @relation(fields: [scId], references: [id])
  schoolYear          SchoolYear?  @relation(fields: [acadYear], references: [id])
  project             Project?     @relation(fields: [projectId], references: [id])
  details_items       ParcelDetail[]
  receiveOrders       ReceiveParcelOrder[]

  @@map("parcel_order")
  @@index([scId], name: "idx_parcel_order_sc_id")
  @@index([projectId], name: "idx_parcel_order_project_id")
  @@index([acadYear], name: "idx_parcel_order_acad_year")
  @@index([orderStatus], name: "idx_parcel_order_status")
  @@index([del], name: "idx_parcel_order_del")
}

model ParcelDetail {
  id              Int       @id @default(autoincrement()) @map("pd_id")
  orderId         Int       @map("order_id")
  suppId          Int?      @map("supp_id")
  pdAmount        Int       @default(0) @map("pd_amount")
  pdPrice         Float     @default(0) @map("pd_price") @db.Float
  pdTotal         Float     @default(0) @map("pd_total") @db.Float
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  // Relations
  parcelOrder     ParcelOrder  @relation(fields: [orderId], references: [id])
  supply          TbSupplies?  @relation(fields: [suppId], references: [id])
  receiveDetails  ReceiveParcelDetail[]

  @@map("parcel_detail")
  @@index([orderId], name: "idx_parcel_detail_order_id")
  @@index([suppId], name: "idx_parcel_detail_supp_id")
  @@index([del], name: "idx_parcel_detail_del")
}

model ReceiveParcelOrder {
  id              Int       @id @default(autoincrement()) @map("rpo_id")
  orderId         Int       @map("order_id")
  receiveDate     DateTime? @map("receive_date") @db.Date
  receiveBy       Int?      @map("receive_by")
  receiveStatus   Int       @default(0) @map("receive_status")
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  // Relations
  parcelOrder     ParcelOrder @relation(fields: [orderId], references: [id])
  receiveDetails  ReceiveParcelDetail[]

  @@map("receive_parcel_order")
  @@index([orderId], name: "idx_receive_parcel_order_id")
  @@index([receiveStatus], name: "idx_receive_parcel_status")
  @@index([del], name: "idx_receive_parcel_del")
}

model ReceiveParcelDetail {
  id              Int       @id @default(autoincrement()) @map("rpd_id")
  rpoId           Int       @map("rpo_id")
  pdId            Int       @map("pd_id")
  receiveAmount   Int       @default(0) @map("receive_amount")
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  // Relations
  receiveOrder    ReceiveParcelOrder @relation(fields: [rpoId], references: [id])
  parcelDetail    ParcelDetail       @relation(fields: [pdId], references: [id])

  @@map("receive_parcel_detail")
  @@index([rpoId], name: "idx_receive_parcel_detail_rpo_id")
  @@index([pdId], name: "idx_receive_parcel_detail_pd_id")
  @@index([del], name: "idx_receive_parcel_detail_del")
}

model TbSupplies {
  id              Int       @id @default(autoincrement()) @map("supp_id")
  scId            Int       @map("sc_id")
  suppName        String    @map("supp_name") @db.VarChar(255)
  suppDetail      String?   @map("supp_detail") @db.Text
  suppPrice       Float     @default(0) @map("supp_price") @db.Float
  suppAmount      Int       @default(0) @map("supp_amount")
  suppStock       Int       @default(0) @map("supp_stock")
  unitId          Int?      @map("unit_id")
  typeSuppId      Int?      @map("type_supp_id")
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  // Relations
  school          School          @relation(fields: [scId], references: [id])
  unit            TbUnit?         @relation(fields: [unitId], references: [id])
  typeSupply      TbTypeSupplies? @relation(fields: [typeSuppId], references: [id])
  parcelDetails   ParcelDetail[]

  @@map("tb_supplies")
  @@index([scId], name: "idx_supplies_sc_id")
  @@index([unitId], name: "idx_supplies_unit_id")
  @@index([typeSuppId], name: "idx_supplies_type_supp_id")
  @@index([del], name: "idx_supplies_del")
}

model TbUnit {
  id              Int       @id @default(autoincrement()) @map("unit_id")
  scId            Int       @map("sc_id")
  unitName        String    @map("unit_name") @db.VarChar(255)
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  // Relations
  supplies        TbSupplies[]

  @@map("tb_unit")
  @@index([scId], name: "idx_unit_sc_id")
  @@index([del], name: "idx_unit_del")
}

model TbTypeSupplies {
  id              Int       @id @default(autoincrement()) @map("type_supp_id")
  scId            Int       @map("sc_id")
  typeSuppName    String    @map("type_supp_name") @db.VarChar(255)
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  // Relations
  supplies        TbSupplies[]

  @@map("tb_type_supplies")
  @@index([scId], name: "idx_type_supplies_sc_id")
  @@index([del], name: "idx_type_supplies_del")
}

model TbPartner {
  id              Int       @id @default(autoincrement()) @map("p_id")
  scId            Int       @map("sc_id")
  pName           String    @map("p_name") @db.VarChar(255)
  pAddress        String?   @map("p_address") @db.Text
  pTel            String?   @map("p_tel") @db.VarChar(255)
  pTax            String?   @map("p_tax") @db.VarChar(255)
  pType           String?   @map("p_type") @db.VarChar(45)
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  // Relations
  school          School    @relation(fields: [scId], references: [id])
  invoices        RequestWithdraw[]
  withholdingCerts WithholdingCertificate[]

  @@map("tb_partner")
  @@index([scId], name: "idx_partner_sc_id")
  @@index([pType], name: "idx_partner_type")
  @@index([del], name: "idx_partner_del")
}
```

### 2.8 Finance Management

```prisma
// ============================================
// FINANCE MANAGEMENT
// ============================================

model PlnReceive {
  id              Int       @id @default(autoincrement()) @map("pr_id")
  scId            Int       @map("sc_id")
  syId            Int       @map("sy_id")
  prNo            String    @map("pr_no") @db.VarChar(255)
  prDate          DateTime? @map("pr_date") @db.Date
  prTotal         Float     @default(0) @map("pr_total") @db.Float
  prType          String?   @map("pr_type") @db.VarChar(45)
  cfTransaction   Int       @default(0) @map("cf_transaction")
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  // Relations
  school          School             @relation(fields: [scId], references: [id])
  schoolYear      SchoolYear         @relation(fields: [syId], references: [id])
  details         PlnReceiveDetail[]
  receipts        Receipt[]

  @@map("pln_receive")
  @@index([scId], name: "idx_receive_sc_id")
  @@index([syId], name: "idx_receive_sy_id")
  @@index([prNo], name: "idx_receive_pr_no")
  @@index([cfTransaction], name: "idx_receive_cf_transaction")
  @@index([del], name: "idx_receive_del")
}

model PlnReceiveDetail {
  id              Int       @id @default(autoincrement()) @map("prd_id")
  prId            Int       @map("pr_id")
  bgTypeId        Int       @map("bg_type_id")
  prdMoney        Float     @default(0) @map("prd_money") @db.Float
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  // Relations
  receive         PlnReceive             @relation(fields: [prId], references: [id])
  incomeType      MasterBudgetIncomeType @relation(fields: [bgTypeId], references: [id])

  @@map("pln_receive_detail")
  @@index([prId], name: "idx_receive_detail_pr_id")
  @@index([bgTypeId], name: "idx_receive_detail_bg_type_id")
  @@index([del], name: "idx_receive_detail_del")
}

model Receipt {
  id              Int       @id @default(autoincrement()) @map("rec_id")
  scId            Int       @map("sc_id")
  prId            Int?      @map("pr_id")
  recNo           String    @map("rec_no") @db.VarChar(255)
  recDate         DateTime? @map("rec_date") @db.Date
  recMoney        Float     @default(0) @map("rec_money") @db.Float
  recFrom         String?   @map("rec_from") @db.VarChar(255)
  recDetail       String?   @map("rec_detail") @db.Text
  recStatus       String    @default("1") @map("rec_status") @db.VarChar(1)
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  // Relations
  school          School     @relation(fields: [scId], references: [id])
  receive         PlnReceive? @relation(fields: [prId], references: [id])
  creator         Admin?     @relation("ReceiptCreator", fields: [upBy], references: [id])

  @@map("receipt")
  @@index([scId], name: "idx_receipt_sc_id")
  @@index([prId], name: "idx_receipt_pr_id")
  @@index([recNo], name: "idx_receipt_rec_no")
  @@index([recStatus], name: "idx_receipt_status")
  @@index([del], name: "idx_receipt_del")
}

model RequestWithdraw {
  id                  Int       @id @default(autoincrement()) @map("rw_id")
  scId                Int       @map("sc_id")
  rwNo                String    @map("rw_no") @db.VarChar(255)
  rwDate              DateTime? @map("rw_date") @db.Date
  rwMoney             Float     @default(0) @map("rw_money") @db.Float
  rwTo                String?   @map("rw_to") @db.VarChar(255)
  rwDetail            String?   @map("rw_detail") @db.Text
  rwStatus            Int       @default(0) @map("rw_status")
  bgTypeId            Int?      @map("bg_type_id")
  projectId           Int?      @map("project_id")
  partnerId           Int?      @map("partner_id")
  approveBy           Int?      @map("approve_by")
  approveDate         DateTime? @map("approve_date") @db.DateTime
  del                 Int       @default(0)
  upBy                Int?      @map("up_by")
  createDate          DateTime? @map("create_date") @db.DateTime
  updateDate          DateTime? @map("update_date") @db.DateTime

  // Relations
  school              School     @relation(fields: [scId], references: [id])
  partner             TbPartner? @relation(fields: [partnerId], references: [id])
  approver            Admin?     @relation("InvoiceApprover", fields: [approveBy], references: [id])
  withholdingCerts    WithholdingCertificate[]

  @@map("request_withdraw")
  @@index([scId], name: "idx_request_withdraw_sc_id")
  @@index([rwNo], name: "idx_request_withdraw_rw_no")
  @@index([rwStatus], name: "idx_request_withdraw_status")
  @@index([partnerId], name: "idx_request_withdraw_partner_id")
  @@index([del], name: "idx_request_withdraw_del")
}

model WithholdingCertificate {
  id              Int       @id @default(autoincrement()) @map("wc_id")
  scId            Int       @map("sc_id")
  rwId            Int?      @map("rw_id")
  partnerId       Int?      @map("partner_id")
  wcNo            String    @map("wc_no") @db.VarChar(255)
  wcDate          DateTime? @map("wc_date") @db.Date
  wcMoney         Float     @default(0) @map("wc_money") @db.Float
  wcTax           Float     @default(0) @map("wc_tax") @db.Float
  wcTotal         Float     @default(0) @map("wc_total") @db.Float
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  // Relations
  invoice         RequestWithdraw? @relation(fields: [rwId], references: [id])
  partner         TbPartner?       @relation(fields: [partnerId], references: [id])

  @@map("withholding_certificate")
  @@index([scId], name: "idx_withholding_sc_id")
  @@index([rwId], name: "idx_withholding_rw_id")
  @@index([wcNo], name: "idx_withholding_wc_no")
  @@index([del], name: "idx_withholding_del")
}

model BankAccount {
  id              Int       @id @default(autoincrement()) @map("ba_id")
  scId            Int       @map("sc_id")
  bankId          Int?      @map("bank_id")
  baNo            String    @map("ba_no") @db.VarChar(255)
  baName          String?   @map("ba_name") @db.VarChar(255)
  baType          String?   @map("ba_type") @db.VarChar(45)
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  // Relations
  school          School             @relation(fields: [scId], references: [id])
  bank            BankDb?            @relation(fields: [bankId], references: [id])
  incomeTypes     BudgetIncomeTypeSchool[]

  @@map("bankaccount")
  @@index([scId], name: "idx_bank_account_sc_id")
  @@index([bankId], name: "idx_bank_account_bank_id")
  @@index([del], name: "idx_bank_account_del")
}

model BankDb {
  id              Int       @id @default(autoincrement()) @map("bank_id")
  bankName        String    @map("bank_name") @db.VarChar(255)
  bankCode        String?   @map("bank_code") @db.VarChar(45)

  // Relations
  bankAccounts    BankAccount[]

  @@map("bank_db")
}

model FinancialTransactions {
  id              Int       @id @default(autoincrement()) @map("ft_id")
  scId            Int       @map("sc_id")
  syId            Int       @map("sy_id")
  ftDate          DateTime? @map("ft_date") @db.Date
  ftType          String    @map("ft_type") @db.VarChar(45)
  ftMoney         Float     @default(0) @map("ft_money") @db.Float
  ftDetail        String?   @map("ft_detail") @db.Text
  ftBalance       Float     @default(0) @map("ft_balance") @db.Float
  del             Int       @default(0)
  upBy            Int?      @map("up_by")
  createDate      DateTime? @map("create_date") @db.DateTime
  updateDate      DateTime? @map("update_date") @db.DateTime

  @@map("financial_transactions")
  @@index([scId], name: "idx_financial_trans_sc_id")
  @@index([syId], name: "idx_financial_trans_sy_id")
  @@index([ftDate], name: "idx_financial_trans_date")
  @@index([ftType], name: "idx_financial_trans_type")
  @@index([del], name: "idx_financial_trans_del")
}
```

### 2.9 Settings & Master Data

```prisma
// ============================================
// SETTINGS & MASTER DATA
// ============================================

model MasterScPolicy {
  id          Int     @id @default(autoincrement()) @map("sc_pol_id")
  scId        Int     @map("sc_id")
  name        String  @map("sc_pol_name") @db.VarChar(255)
  detail      String? @map("sc_pol_detail") @db.Text
  
  @@map("master_sc_policy")
  @@index([scId], name: "idx_sc_policy_sc_id")
}

model MasterSaoPolicy {
  id          Int     @id @default(autoincrement()) @map("sao_pol_id")
  name        String  @map("sao_pol_name") @db.VarChar(255)
  detail      String? @map("sao_pol_detail") @db.Text
  
  @@map("master_sao_policy")
}

model MasterMoePolicy {
  id          Int     @id @default(autoincrement()) @map("moe_pol_id")
  name        String  @map("moe_pol_name") @db.VarChar(255)
  detail      String? @map("moe_pol_detail") @db.Text
  
  @@map("master_moe_policy")
}

model MasterObecPolicy {
  id          Int     @id @default(autoincrement()) @map("obec_pol_id")
  name        String  @map("obec_pol_name") @db.VarChar(255)
  detail      String? @map("obec_pol_detail") @db.Text
  
  @@map("master_obec_policy")
}

model MasterQuickWin {
  id          Int     @id @default(autoincrement()) @map("qw_id")
  name        String  @map("qw_name") @db.VarChar(255)
  detail      String? @map("qw_detail") @db.Text
  
  @@map("master_quick_win")
}

// Province, District, SubDistrict models...
model ClsProvince {
  id          Int     @id @default(autoincrement()) @map("province_id")
  code        String  @map("province_code") @db.VarChar(10)
  nameTh      String  @map("province_name_th") @db.VarChar(255)
  nameEn      String  @map("province_name_en") @db.VarChar(255)
  
  @@map("cls_province")
}

model ClsDistrict {
  id          Int     @id @default(autoincrement()) @map("district_id")
  code        String  @map("district_code") @db.VarChar(10)
  provinceId  Int     @map("province_id")
  nameTh      String  @map("district_name_th") @db.VarChar(255)
  nameEn      String  @map("district_name_en") @db.VarChar(255)
  
  @@map("cls_district")
  @@index([provinceId], name: "idx_district_province_id")
}

model ClsSubdistrict {
  id          Int     @id @default(autoincrement()) @map("subdistrict_id")
  code        String  @map("subdistrict_code") @db.VarChar(10)
  districtId  Int     @map("district_id")
  nameTh      String  @map("subdistrict_name_th") @db.VarChar(255)
  nameEn      String  @map("subdistrict_name_en") @db.VarChar(255)
  postcode    String? @map("postcode") @db.VarChar(10)
  
  @@map("cls_subdistrict")
  @@index([districtId], name: "idx_subdistrict_district_id")
}
```

---

## 3. Entity Relationships

### 3.1 Core Relationships Diagram

```
┌─────────────┐
│   School    │──┐
└─────────────┘  │
       │         │
       │ 1:N     │ 1:N
       ▼         ▼
┌─────────────┐ ┌──────────────┐
│ SchoolYear  │ │    Admin     │
└─────────────┘ └──────────────┘
       │               │
       │ 1:N           │ 1:N
       ▼               ▼
┌─────────────┐ ┌──────────────┐
│   Student   │ │   Project    │
└─────────────┘ └──────────────┘
       │               │
       │ N:1           │ 1:N
       ▼               ▼
┌─────────────┐ ┌──────────────┐
│  Classroom  │ │ParcelOrder   │
└─────────────┘ └──────────────┘
```

### 3.2 Budget Flow

```
MasterBudgetCategory
       │
       │ 1:N
       ▼
PlnBudgetCategory ──┐
       │            │
       │ 1:N        │ N:1
       ▼            │
PlnBudgetCategoryDetail ──> MasterBudgetIncomeType
                                    │
                                    │ 1:N
                                    ▼
                          BudgetIncomeTypeSchool
                                    │
                                    │ N:1
                                    ▼
                              BankAccount
```

### 3.3 Procurement Flow

```
Project
   │
   │ 1:N
   ▼
ParcelOrder ──┐
   │          │
   │ 1:N      │ 1:N
   ▼          ▼
ParcelDetail  ReceiveParcelOrder
   │               │
   │ N:1           │ 1:N
   ▼               ▼
TbSupplies    ReceiveParcelDetail
```

### 3.4 Finance Flow

```
PlnReceive
   │
   │ 1:N
   ▼
PlnReceiveDetail ──> MasterBudgetIncomeType
   │
   │ 1:1
   ▼
Receipt

RequestWithdraw
   │
   │ 1:N
   ▼
WithholdingCertificate
```

---

## 4. Indexes & Performance

### 4.1 Critical Indexes

**High-traffic queries**:
```prisma
// Admin lookup
@@index([username], name: "idx_admin_username")
@@index([email], name: "idx_admin_email")

// School-based filtering (most queries)
@@index([scId], name: "idx_*_sc_id")

// School year filtering
@@index([syId], name: "idx_*_sy_id")
@@index([budgetYear], name: "idx_*_budget_year")

// Soft delete filtering (every query)
@@index([del], name: "idx_*_del")

// Status filtering
@@index([orderStatus], name: "idx_parcel_order_status")
@@index([projectStatus], name: "idx_project_status")
```

### 4.2 Composite Indexes

```prisma
// For common filter combinations
@@index([scId, syId, del])
@@index([scId, budgetYear, del])
@@index([projectId, del])
```

### 4.3 Full-text Search (Optional)

```prisma
// For search functionality
@@fulltext([name, detail])  // On relevant models
```

---

## 5. Migration Scripts

### 5.1 Initial Migration

```bash
# Generate Prisma Client
npx prisma generate

# Create migration from schema
npx prisma migrate dev --name init

# Push schema to database (dev only)
npx prisma db push

# Open Prisma Studio
npx prisma studio
```

### 5.2 From TypeORM to Prisma

```typescript
// scripts/migrate-typeorm-to-prisma.ts
import { PrismaClient } from '@prisma/client'
import { DataSource } from 'typeorm'

const prisma = new PrismaClient()

async function migrate() {
  // 1. Backup current database
  console.log('Creating backup...')
  
  // 2. Generate Prisma schema from existing DB
  // prisma db pull
  
  // 3. Validate schema
  console.log('Validating schema...')
  
  // 4. Apply migrations
  console.log('Applying migrations...')
  
  // 5. Seed initial data
  console.log('Seeding data...')
  
  console.log('Migration complete!')
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### 5.3 Seed Script

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 12)
  
  const admin = await prisma.admin.upsert({
    where: { username: 'admin_local' },
    update: {},
    create: {
      username: 'admin_local',
      password: hashedPassword,
      name: 'Admin Local',
      email: 'admin@sfmis.local',
      type: 1, // Super Admin
      del: 0,
    },
  })

  // Create school
  const school = await prisma.school.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      code: 'SCH001',
      name: 'โรงเรียนตัวอย่าง',
      email: 'school@example.com',
      del: 0,
    },
  })

  // Create school year
  const schoolYear = await prisma.schoolYear.upsert({
    where: { id: 1 },
    update: {},
    create: {
      year: 2566,
      semester: 1,
      startDate: new Date('2023-05-01'),
      endDate: new Date('2024-04-30'),
      budgetYear: 2566,
      budgetStartDate: new Date('2023-10-01'),
      budgetEndDate: new Date('2024-09-30'),
      scId: school.id,
      del: 0,
    },
  })

  // Create master data
  const classrooms = ['อ.1', 'อ.2', 'อ.3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6']
  for (const [index, name] of classrooms.entries()) {
    await prisma.masterClassroom.upsert({
      where: { id: index + 1 },
      update: {},
      create: {
        level: name,
        name: `ชั้น${name}`,
        sequence: index + 1,
      },
    })
  }

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

---

## 6. Database Optimization Tips

### 6.1 Query Optimization

**Use `select` to limit fields**:
```typescript
const users = await prisma.admin.findMany({
  select: {
    id: true,
    username: true,
    email: true,
    // Don't fetch password
  },
  where: { del: 0 }
})
```

**Use `include` wisely**:
```typescript
// Bad - fetches too much
const project = await prisma.project.findFirst({
  include: {
    school: true,
    schoolYear: true,
    approvals: true,
    parcelOrders: {
      include: {
        details_items: true
      }
    }
  }
})

// Good - fetch only what's needed
const project = await prisma.project.findFirst({
  include: {
    _count: {
      select: { approvals: true, parcelOrders: true }
    }
  }
})
```

### 6.2 Connection Pooling

```typescript
// prisma/client.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 6.3 Transactions

```typescript
// Use transactions for consistency
await prisma.$transaction(async (tx) => {
  const budget = await tx.plnBudgetCategory.create({ ... })
  
  await tx.plnBudgetCategoryDetail.createMany({
    data: details.map(d => ({
      pbcId: budget.id,
      ...d
    }))
  })
})
```

---

**Document End**

*Last Updated: December 16, 2025*  
*Version: 1.0*

