# PRD: SFMIS System Redesign
## School Financial Management Information System
### Migration from Angular + NestJS + TypeORM + MySQL to NextJS + NestJS + Prisma + MySQL

---

**Document Version**: 1.0  
**Date**: December 16, 2025  
**Prepared For**: Development Team - SFMIS System Redesign  
**Technology Stack**:
- **Frontend**: Next.js 15.1.6 + React 19 + TypeScript + TailwindCSS
- **Backend**: NestJS 11 + Prisma 6 + MySQL 8
- **Runtime**: Node.js 15.5.6 (Note: This seems like a typo - should likely be 18.x or 20.x LTS)

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Current Architecture Analysis](#current-architecture-analysis)
4. [New Architecture Design](#new-architecture-design)
5. [Database Schema & Design](#database-schema--design)
6. [Module Structure & APIs](#module-structure--apis)
7. [User Stories & Features](#user-stories--features)
8. [Technical Specifications](#technical-specifications)
9. [Implementation Plan](#implementation-plan)
10. [Migration Strategy](#migration-strategy)
11. [Testing & QA](#testing--qa)
12. [Deployment & Operations](#deployment--operations)

---

## 1. Executive Summary

### 1.1 Project Overview

SFMIS (School Financial Management Information System) เป็นระบบบริหารจัดการการเงินและงบประมาณของโรงเรียน ที่ครอบคลุมทุกด้านของการเงิน งบประมาณ โครงการ พัสดุ และรายงานต่างๆ

**ปัจจุบัน**: Angular 16.2.12 + NestJS 11 + TypeORM 0.3.27 + MySQL  
**เป้าหมาย**: Next.js 15.1.6 + NestJS 11 + Prisma 6 + MySQL

### 1.2 Objectives

1. **Modernize Frontend**: อัปเกรดจาก Angular เป็น Next.js เพื่อ
   - Server-side Rendering (SSR) สำหรับ Performance และ SEO
   - React Server Components (RSC) เพื่อลดขนาด Bundle
   - Built-in API Routes และ Middleware
   - App Router และ File-based Routing

2. **Improve Backend ORM**: เปลี่ยนจาก TypeORM เป็น Prisma เพื่อ
   - Type-safe Database Access
   - Auto-generated Types และ Migration
   - Better Query Performance
   - Easier Data Modeling

3. **Enhance User Experience**:
   - Faster Page Load (SSR + Streaming)
   - Better Mobile Responsiveness
   - Modern UI/UX Design System
   - Real-time Updates (Optional: WebSocket/SSE)

4. **Maintainability**:
   - Better Code Organization
   - Comprehensive Documentation
   - Automated Testing
   - Type Safety throughout

### 1.3 Success Criteria

- ✅ ทุกฟีเจอร์เดิมทำงานได้ครบถ้วน
- ✅ Page Load Time ลดลง > 40%
- ✅ First Contentful Paint (FCP) < 1.5s
- ✅ Time to Interactive (TTI) < 3.5s
- ✅ 100% Type Safety (Frontend + Backend)
- ✅ API Response Time ลดลง > 30%
- ✅ Test Coverage > 80%
- ✅ Zero Critical Security Vulnerabilities

---

## 2. System Overview

### 2.1 System Domain

SFMIS ระบบบริหารจัดการการเงินโรงเรียน ประกอบด้วย:

#### งานนโยบายและแผน (Policy & Planning)
- บันทึกข้อมูลนักเรียนและคำนวณงบจากรายหัว
- จัดการงบประมาณรวมรายปีและกำหนดวงเงินงบประมาณ
- จัดการโครงการและการอนุมัติโครงการ
- ตั้งค่านโยบายโรงเรียนและนโยบาย สพท./สพฐ.

#### งานการเงิน (Finance)
- การรับเงินเข้าบัญชีและรับเงินเหลือจ่ายปีเก่า
- การขอเบิกและการออกเช็ค
- ใบเสร็จรับเงิน
- รายงานการเงิน (คงเหลือประจำวัน, ควบคุมเช็ค, ควบคุมบัญชีธนาคาร)
- ทะเบียนคุมหน้างบใบสำคัญคู่จ่าย

#### งานพัสดุ (Procurement & Supply)
- ขอซื้อ/ขอจ้าง
- แต่งตั้งคณะกรรมการ
- ตรวจรับพัสดุและเบิกพัสดุ
- บัญชีวัสดุและตั้งค่าประเภทพัสดุ
- อนุมัติใช้งบประมาณและอนุมัติเบิกพัสดุ

#### งานผู้อำนวยการ (Director)
- อนุมัติโครงการ, ใช้งบประมาณ, และขอเบิก
- ดูรายงานต่างๆ
- ตั้งค่าฐานข้อมูลโรงเรียน

### 2.2 User Roles

1. **Super Admin** (type=1): ผู้ดูแลระบบระดับสูงสุด
2. **School Admin** (type=2): ผู้ดูแลระบบโรงเรียน
3. **Planning Staff** (type=3): เจ้าหน้าที่ฝ่ายแผนงาน
4. **Supply Staff** (type=4): เจ้าหน้าที่ฝ่ายพัสดุ
5. **Finance Staff** (type=5): เจ้าหน้าที่ฝ่ายการเงิน
6. **Planning Head** (type=6): หัวหน้าฝ่ายแผนงาน
7. **Supply Head** (type=7): หัวหน้าฝ่ายพัสดุ
8. **Finance Head** (type=8): หัวหน้าฝ่ายการเงิน

### 2.3 Key Statistics (Current System)

- **Modules**: 21 Backend Modules
- **Database Tables**: 56+ Tables
- **API Endpoints**: 200+ Endpoints
- **Frontend Components**: 400+ Components
- **Users**: Multi-school Support (sc_id based)
- **Data**: Multi-year Support (sy_id, budget_year based)

---

## 3. Current Architecture Analysis

### 3.1 Current Tech Stack

#### Frontend (Angular)
```
Angular 16.2.12
├── @angular/material 16.2.12
├── TailwindCSS 2.1.2
├── ApexCharts 3.26.1
├── FullCalendar 6.1.10
├── RxJS 7.8.1
└── SweetAlert2 11.4.8
```

**Structure**:
- `src/app/modules/admin/sfmisystem/` - SFMIS modules
- `src/@fuse/` - Fuse theme (Material Design)
- `src/@fuse/services/connect.api.service.ts` - API service
- `src/environments/environment.ts` - Config

#### Backend (NestJS)
```
NestJS 11.0.1
├── TypeORM 0.3.27
├── mysql2 3.15.3
├── class-validator
└── class-transformer
```

**Structure**:
- 21 Modules (Admin, Dashboard, Budget, Student, Project, etc.)
- Entity-Repository Pattern
- Soft Delete (del: 0/1)
- Audit Fields (up_by, cre_date, up_date)

#### Database (MySQL)
- MySQL 8.0
- 56+ Tables
- utf8mb4 charset
- MyISAM + InnoDB engines

### 3.2 Current Architecture Diagram

```
┌────────────────────────────────────────┐
│         Browser (Client)                │
└────────────────┬───────────────────────┘
                 │
                 │ HTTP/HTTPS
                 ▼
┌────────────────────────────────────────┐
│      Angular Frontend (SPA)             │
│  ┌──────────────────────────────────┐  │
│  │  Fuse Material Theme             │  │
│  │  + Components                    │  │
│  │  + Services (API Client)         │  │
│  │  + RxJS State Management         │  │
│  └──────────────────────────────────┘  │
└────────────────┬───────────────────────┘
                 │
                 │ REST API
                 │ (http://localhost:3000/api/)
                 ▼
┌────────────────────────────────────────┐
│       NestJS Backend API                │
│  ┌──────────────────────────────────┐  │
│  │  21 Modules                      │  │
│  │  ├─ AdminModule                  │  │
│  │  ├─ DashboardModule              │  │
│  │  ├─ BudgetModule                 │  │
│  │  ├─ StudentModule                │  │
│  │  ├─ ProjectApproveModule         │  │
│  │  └─ ... (16 more)                │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  TypeORM                         │  │
│  │  ├─ Entities (56+)               │  │
│  │  ├─ Repositories                 │  │
│  │  └─ Query Builder                │  │
│  └──────────────────────────────────┘  │
└────────────────┬───────────────────────┘
                 │
                 │ MySQL Protocol
                 ▼
┌────────────────────────────────────────┐
│          MySQL Database                 │
│  ┌──────────────────────────────────┐  │
│  │  56+ Tables                      │  │
│  │  ├─ admin                        │  │
│  │  ├─ school                       │  │
│  │  ├─ school_year                  │  │
│  │  ├─ pln_budget_category          │  │
│  │  ├─ tb_student                   │  │
│  │  └─ ... (51+ more)               │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### 3.3 Current Challenges & Pain Points

#### Frontend (Angular)
1. **Performance**: 
   - Large bundle size (3-5 MB initial)
   - Client-side rendering only (CSR)
   - Slow initial page load
   
2. **Development Experience**:
   - Complex module imports
   - Verbose template syntax
   - Limited TypeScript integration
   
3. **Maintenance**:
   - Security vulnerabilities (38 known)
   - Angular Material version lock-in
   - Complex upgrade paths

#### Backend (TypeORM)
1. **Type Safety**:
   - Manual type definitions
   - Runtime errors from mismatched types
   - No auto-completion for queries
   
2. **Query Building**:
   - Verbose QueryBuilder syntax
   - Easy to make SQL injection mistakes
   - Hard to debug complex queries
   
3. **Migration**:
   - Manual migration files
   - Schema drift issues
   - No version control for schema

#### Database
1. **No Clear Schema Documentation**
2. **Mixed Engine Types** (MyISAM + InnoDB)
3. **Inconsistent Column Naming**

---

## 4. New Architecture Design

### 4.1 New Tech Stack

#### Frontend (Next.js)
```
Next.js 15.1.6 (App Router)
├── React 19
├── TypeScript 5.3+
├── TailwindCSS 3.4+
├── shadcn/ui (Radix UI + Tailwind)
├── TanStack Query (React Query)
├── Zustand (State Management)
├── Recharts (Charts)
└── date-fns (Date utilities)
```

#### Backend (NestJS + Prisma)
```
NestJS 11 (Latest)
├── Prisma 6
├── @prisma/client
├── class-validator
├── class-transformer
├── bcrypt (hashing)
└── jsonwebtoken (JWT)
```

#### Database
```
MySQL 8.0+
└── Managed via Prisma Schema
```

### 4.2 New Architecture Diagram

```
┌─────────────────────────────────────────────┐
│         Browser (Client)                     │
└─────────────────┬───────────────────────────┘
                  │
                  │ HTTP/HTTPS
                  ▼
┌─────────────────────────────────────────────┐
│         Next.js 15 (App Router)              │
│  ┌───────────────────────────────────────┐  │
│  │  SSR + RSC (Server Components)        │  │
│  │  ├─ app/                              │  │
│  │  │  ├─ (auth)/                        │  │
│  │  │  ├─ (dashboard)/                   │  │
│  │  │  ├─ (budget)/                      │  │
│  │  │  ├─ (finance)/                     │  │
│  │  │  └─ (supplie)/                     │  │
│  │  ├─ components/                       │  │
│  │  │  ├─ ui/ (shadcn/ui)                │  │
│  │  │  └─ features/                      │  │
│  │  └─ lib/                              │  │
│  │     ├─ api-client.ts                  │  │
│  │     ├─ utils.ts                       │  │
│  │     └─ hooks/                         │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  Next.js API Routes (Optional)        │  │
│  │  app/api/ - Middleware Layer          │  │
│  └───────────────────────────────────────┘  │
└─────────────────┬───────────────────────────┘
                  │
                  │ REST API + tRPC (Optional)
                  │ (http://localhost:3000/api/)
                  ▼
┌─────────────────────────────────────────────┐
│           NestJS 11 Backend                  │
│  ┌───────────────────────────────────────┐  │
│  │  21 Modules (Refactored)              │  │
│  │  ├─ AdminModule                       │  │
│  │  ├─ DashboardModule                   │  │
│  │  ├─ BudgetModule                      │  │
│  │  ├─ StudentModule                     │  │
│  │  ├─ ProjectApproveModule              │  │
│  │  └─ ... (16 more)                     │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  Prisma ORM                           │  │
│  │  ├─ Schema (prisma/schema.prisma)    │  │
│  │  ├─ Generated Client                 │  │
│  │  ├─ Migrations                        │  │
│  │  └─ Type-safe Queries                │  │
│  └───────────────────────────────────────┘  │
└─────────────────┬───────────────────────────┘
                  │
                  │ MySQL Protocol
                  ▼
┌─────────────────────────────────────────────┐
│          MySQL 8.0 Database                  │
│  ┌───────────────────────────────────────┐  │
│  │  56+ Tables (InnoDB only)             │  │
│  │  ├─ Admin                             │  │
│  │  ├─ School                            │  │
│  │  ├─ SchoolYear                        │  │
│  │  ├─ PlnBudgetCategory                 │  │
│  │  ├─ TbStudent                         │  │
│  │  └─ ... (51+ more)                    │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 4.3 Key Architecture Decisions

#### 1. Next.js App Router (Not Pages Router)
**Reasoning**:
- Server Components for better performance
- Nested layouts and loading states
- Built-in data fetching
- Streaming SSR
- Better code organization

#### 2. Prisma (Not TypeORM)
**Reasoning**:
- Type-safe database access
- Auto-generated types
- Better migration system
- Cleaner query syntax
- Built-in connection pooling

#### 3. shadcn/ui (Not Material UI)
**Reasoning**:
- Copy-paste components (full control)
- Built on Radix UI (accessibility)
- TailwindCSS native
- Smaller bundle size
- Modern design system

#### 4. TanStack Query (Not Redux/RxJS)
**Reasoning**:
- Built-in caching
- Automatic refetching
- Optimistic updates
- Loading/Error states
- Server state synchronization

#### 5. Zustand (Not Context API)
**Reasoning**:
- Simple API
- No boilerplate
- TypeScript friendly
- DevTools support
- Minimal re-renders

---

## 5. Database Schema & Design

### 5.1 Prisma Schema Overview

จะมีการสร้าง `prisma/schema.prisma` ที่ครอบคลุมตาราง 56+ ตารางทั้งหมด

**หลักการออกแบบ**:
1. **PascalCase** สำหรับ model names (แทน snake_case)
2. **camelCase** สำหรับ field names (แทน snake_case columns)
3. **Relations** จะถูกกำหนดชัดเจน (1-1, 1-N, M-N)
4. **Indexes** สำหรับ query performance
5. **Enums** สำหรับ status fields

### 5.2 Core Models

#### Admin & Authentication
```prisma
model Admin {
  id              Int       @id @default(autoincrement()) @map("admin_id")
  name            String?
  username        String?   @unique
  email           String?
  password        String?
  passwordDefault String?   @map("password_default")
  lastLogin       DateTime? @map("last_login")
  del             Int       @default(0)
  codeLogin       String?   @map("code_login")
  avatar          String?   @map("avata")
  license         String?   @db.Text
  upBy            Int?      @map("up_by")
  upDate          DateTime? @default(now()) @map("up_date")
  type            AdminType?
  position        Int?      @default(0)
  creDate         DateTime? @map("cre_date")
  scId            Int?      @default(0) @map("sc_id")
  
  school          School?   @relation(fields: [scId], references: [id])
  
  @@map("admin")
  @@index([scId])
  @@index([username])
  @@index([email])
}

enum AdminType {
  SUPER_ADMIN         @map("1")
  SCHOOL_ADMIN        @map("2")
  PLANNING_STAFF      @map("3")
  SUPPLY_STAFF        @map("4")
  FINANCE_STAFF       @map("5")
  PLANNING_HEAD       @map("6")
  SUPPLY_HEAD         @map("7")
  FINANCE_HEAD        @map("8")
}
```

#### School & School Year
```prisma
model School {
  id          Int       @id @default(autoincrement()) @map("sc_id")
  code        String?   @map("sc_code")
  name        String?   @map("sc_name")
  tel         String?   @map("sc_tel")
  fax         String?   @map("sc_fax")
  email       String?   @map("sc_email")
  website     String?   @map("sc_website")
  province    Int?      @map("sc_province")
  district    Int?      @map("sc_district")
  subDistrict Int?      @map("sc_subdist")
  postcode    String?   @map("sc_postcode")
  address     String?   @db.Text @map("sc_address")
  logo        String?   @map("sc_logo")
  header      String?   @map("sc_header")
  del         Int       @default(0)
  creDate     DateTime? @map("cre_date")
  upDate      DateTime? @default(now()) @map("up_date")
  upBy        Int?      @map("up_by")
  
  admins      Admin[]
  schoolYears SchoolYear[]
  students    Student[]
  budgetCategories PlnBudgetCategory[]
  projects    Project[]
  
  @@map("school")
  @@index([code])
}

model SchoolYear {
  id           Int       @id @default(autoincrement()) @map("sy_id")
  year         Int       @map("sy_year")
  semester     Int       @default(1)
  startDate    DateTime  @map("sy_date_s") @db.Date
  endDate      DateTime  @map("sy_date_e") @db.Date
  upBy         Int?      @map("up_by")
  del          Int       @default(0)
  creDate      DateTime? @map("cre_date")
  upDate       DateTime? @default(now()) @map("up_date")
  scId         Int?      @map("sc_id")
  budgetYear   Int?      @map("budget_year")
  budgetStartDate DateTime? @map("budget_date_s") @db.Date
  budgetEndDate   DateTime? @map("budget_date_e") @db.Date
  
  school       School?   @relation(fields: [scId], references: [id])
  students     Student[]
  budgetCategories PlnBudgetCategory[]
  
  @@map("school_year")
  @@index([scId])
  @@index([year])
  @@index([budgetYear])
}
```

#### Budget Management
```prisma
model PlnBudgetCategory {
  id           Int       @id @default(autoincrement()) @map("pbc_id")
  scId         Int       @map("sc_id")
  acadYear     Int       @map("acad_year")
  budgetYear   String?   @map("budget_year")
  bgCateId     Int       @map("bg_cate_id")
  percents     Float     @default(0) @map("percents") @db.Float
  total        Float     @default(0) @db.Float
  del          Int       @default(0)
  upBy         Int?      @map("up_by")
  createDate   DateTime? @map("create_date")
  updateDate   DateTime? @map("update_date")
  
  school       School    @relation(fields: [scId], references: [id])
  schoolYear   SchoolYear @relation(fields: [acadYear], references: [id])
  category     MasterBudgetCategory @relation(fields: [bgCateId], references: [id])
  details      PlnBudgetCategoryDetail[]
  
  @@map("pln_budget_category")
  @@index([scId])
  @@index([acadYear])
  @@index([bgCateId])
  @@index([budgetYear])
}

model PlnBudgetCategoryDetail {
  id           Int       @id @default(autoincrement()) @map("pbcd_id")
  pbcId        Int       @map("pbc_id")
  bgTypeId     Int       @map("bg_type_id")
  budget       Float     @default(0) @db.Float
  del          Int       @default(0)
  upBy         Int?      @map("up_by")
  createDate   DateTime? @map("create_date")
  updateDate   DateTime? @map("update_date")
  
  budgetCategory PlnBudgetCategory @relation(fields: [pbcId], references: [id])
  incomeType   MasterBudgetIncomeType @relation(fields: [bgTypeId], references: [id])
  
  @@map("pln_budget_category_detail")
  @@index([pbcId])
  @@index([bgTypeId])
}

model MasterBudgetCategory {
  id        Int    @id @default(autoincrement()) @map("bg_cate_id")
  name      String @map("bg_cate_name")
  detail    String? @db.Text @map("bg_cate_detail")
  
  budgets   PlnBudgetCategory[]
  
  @@map("master_budget_category")
}

model MasterBudgetIncomeType {
  id        Int    @id @default(autoincrement()) @map("bg_type_id")
  name      String @map("bg_type_name")
  
  details   PlnBudgetCategoryDetail[]
  schools   BudgetIncomeTypeSchool[]
  
  @@map("master_budget_income_type")
}
```

### 5.3 Complete Schema Structure

ดู **PRD_Database_Schema.md** สำหรับ schema ครบถ้วนทั้ง 56+ tables

### 5.4 Migration Strategy

1. **Phase 1**: สร้าง Prisma Schema จาก SQL dumps
2. **Phase 2**: Generate migration files
3. **Phase 3**: Validate schema กับ database ปัจจุบัน
4. **Phase 4**: ทำ data migration (ถ้าจำเป็น)
5. **Phase 5**: Switch to InnoDB (ถ้ายังใช้ MyISAM อยู่)

---

## 6. Module Structure & APIs

### 6.1 Backend Module Structure

จะรักษาโครงสร้าง 21 modules เดิม แต่ปรับใช้ Prisma:

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── modules/
│   │   ├── admin/              # Authentication & User Management
│   │   ├── dashboard/          # Dashboard & Analytics
│   │   ├── school-year/        # School Year Management
│   │   ├── school/             # School Information
│   │   ├── general-db/         # Master Data (Unit, Partner, etc.)
│   │   ├── settings/           # System Settings
│   │   ├── student/            # Student Data & Per-head Budget
│   │   ├── budget/             # Budget Planning
│   │   ├── policy/             # School Policies
│   │   ├── project/            # Project Management
│   │   ├── project-approve/    # Project Approval Workflow
│   │   ├── receive/            # Income Receiving
│   │   ├── receipt/            # Receipt Management
│   │   ├── invoice/            # Expense Request
│   │   ├── check/              # Check Issuance
│   │   ├── bank/               # Bank Account Management
│   │   ├── supplie/            # Supply & Procurement
│   │   ├── audit-committee/    # Committee Management
│   │   ├── report-daily-balance/      # Daily Balance Report
│   │   ├── report-check-control/      # Check Control Report
│   │   ├── report-bookbank/           # Bookbank Report
│   │   └── register-money-type/       # Money Type Registry
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── pipes/
│   ├── prisma/
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── app.module.ts
│   └── main.ts
└── package.json
```

### 6.2 Frontend Module Structure (Next.js)

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── layout.tsx          # Shared dashboard layout
│   │   └── loading.tsx
│   ├── (policy)/               # งานนโยบายและแผน
│   │   ├── students/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── budget-allocation/
│   │   ├── budget-category/
│   │   ├── estimate-acadyear/
│   │   ├── projects/
│   │   ├── real-budget/
│   │   └── layout.tsx
│   ├── (finance)/              # งานการเงิน
│   │   ├── receive/
│   │   ├── receipt/
│   │   ├── invoice/
│   │   ├── check/
│   │   ├── reports/
│   │   └── layout.tsx
│   ├── (supplie)/              # งานพัสดุ
│   │   ├── parcel-order/
│   │   ├── parcel-receive/
│   │   ├── parcel-withdraw/
│   │   ├── supplies/
│   │   └── layout.tsx
│   ├── (settings)/             # ตั้งค่า
│   │   ├── school/
│   │   ├── users/
│   │   ├── policies/
│   │   ├── bank-accounts/
│   │   └── layout.tsx
│   ├── api/                    # Next.js API Routes (Optional)
│   │   └── auth/
│   │       └── [...nextauth]/route.ts
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── components/
│   ├── ui/                     # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   └── ...
│   ├── features/               # Feature-specific components
│   │   ├── budget/
│   │   ├── finance/
│   │   ├── supplie/
│   │   └── ...
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── footer.tsx
│   └── shared/                 # Shared components
│       ├── data-table.tsx
│       ├── loading-spinner.tsx
│       └── ...
├── lib/
│   ├── api-client.ts           # API client with fetch wrapper
│   ├── utils.ts                # Utility functions
│   ├── validations.ts          # Zod schemas
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-budget.ts
│   │   ├── use-students.ts
│   │   └── ...
│   └── stores/                 # Zustand stores
│       ├── auth-store.ts
│       ├── school-year-store.ts
│       └── ...
├── types/
│   ├── api.ts                  # API response types
│   ├── budget.ts
│   ├── student.ts
│   └── ...
└── package.json
```

### 6.3 API Endpoints Mapping

ทุก endpoint เดิมจะถูกรักษาไว้เพื่อความเข้ากันได้:

#### Example: Budget Module

**Current (TypeORM)**:
```typescript
@Controller('Budget')
export class BudgetController {
  @Post('loadEstimateAcadyearGroup/:scId/:year/:syId')
  loadEstimateAcadyearGroup(@Param('scId') scId: number, ...)
}
```

**New (Prisma)**:
```typescript
@Controller('Budget')
export class BudgetController {
  constructor(private prisma: PrismaService) {}
  
  @Post('loadEstimateAcadyearGroup/:scId/:year/:syId')
  async loadEstimateAcadyearGroup(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('year', ParseIntPipe) year: number,
    @Param('syId', ParseIntPipe) syId: number,
  ) {
    const categories = await this.prisma.masterBudgetCategory.findMany({
      orderBy: { id: 'asc' }
    });
    
    const estimate = await this.prisma.tbEstimateAcadyear.findFirst({
      where: {
        scId,
        syId,
        budgetYear: year.toString(),
        del: 0
      }
    });
    
    // ... rest of logic
  }
}
```

ดู **PRD_API_Endpoints.md** สำหรับรายการ API ครบถ้วน

---

## 7. User Stories & Features

### 7.1 User Stories (Priority: Must Have)

#### US-001: Admin Login
**As a** school administrator  
**I want to** login to the system securely  
**So that** I can access financial management features

**Acceptance Criteria**:
- ✅ Login with username/password
- ✅ Password is hashed (bcrypt)
- ✅ JWT token authentication
- ✅ Remember me option
- ✅ Auto-logout after inactivity
- ✅ Role-based access control

#### US-002: Student Data Entry
**As a** planning staff  
**I want to** input student numbers by classroom  
**So that** the system can calculate per-head budget

**Acceptance Criteria**:
- ✅ Select school year
- ✅ Display all classrooms (ก.1-3, ป.1-6, ม.1-3)
- ✅ Input student count per classroom
- ✅ Auto-calculate total students
- ✅ Lock data after submission
- ✅ Print/export report

#### US-003: Budget Allocation
**As a** school director  
**I want to** allocate budget to different categories  
**So that** I can plan annual spending

**Acceptance Criteria**:
- ✅ View budget income types
- ✅ Set allocation percentage per category
- ✅ Auto-calculate amounts
- ✅ Validate total = 100%
- ✅ Save draft / Submit for approval
- ✅ View historical allocations

#### US-004: Project Approval Workflow
**As a** department head  
**I want to** approve project requests  
**So that** spending is controlled

**Acceptance Criteria**:
- ✅ View pending projects
- ✅ Review project details
- ✅ Approve/Reject with comments
- ✅ Send to next approver
- ✅ Track approval status
- ✅ Notify requestor

#### US-005: Invoice Processing
**As a** finance staff  
**I want to** process expense requests  
**So that** payments can be issued

**Acceptance Criteria**:
- ✅ View approved projects
- ✅ Create invoice from project
- ✅ Attach supporting documents
- ✅ Send for director approval
- ✅ Track payment status
- ✅ Generate reports

### 7.2 Feature Matrix

| Feature Category | Current | New | Priority |
|-----------------|---------|-----|----------|
| **Authentication** |
| Login/Logout | ✅ | ✅ | P0 |
| Password Reset | ❌ | ✅ | P1 |
| 2FA | ❌ | ✅ | P2 |
| SSO | ❌ | 🔜 | P3 |
| **Dashboard** |
| Summary Cards | ✅ | ✅ | P0 |
| Charts | ✅ (ApexCharts) | ✅ (Recharts) | P0 |
| Budget vs Actual | ✅ | ✅ | P0 |
| Real-time Updates | ❌ | ✅ | P2 |
| **Budget Management** |
| Student Per-head | ✅ | ✅ | P0 |
| Budget Allocation | ✅ | ✅ | P0 |
| Budget Category | ✅ | ✅ | P0 |
| Estimate Entry | ✅ | ✅ | P0 |
| Real Budget Edit | ✅ | ✅ | P0 |
| Expense Tracking | ✅ | ✅ | P0 |
| **Finance** |
| Receive Income | ✅ | ✅ | P0 |
| Issue Receipt | ✅ | ✅ | P0 |
| Invoice Request | ✅ | ✅ | P0 |
| Check Issuance | ✅ | ✅ | P0 |
| Bank Reconciliation | ✅ | ✅ | P1 |
| **Procurement** |
| Purchase Request | ✅ | ✅ | P0 |
| Receive Goods | ✅ | ✅ | P0 |
| Withdraw Supplies | ✅ | ✅ | P0 |
| Stock Management | ✅ | ✅ | P1 |
| **Reports** |
| Daily Balance | ✅ | ✅ | P0 |
| Check Control | ✅ | ✅ | P0 |
| Bookbank Control | ✅ | ✅ | P0 |
| Money Type Registry | ✅ | ✅ | P0 |
| Custom Reports | ❌ | ✅ | P2 |
| Export PDF/Excel | ✅ | ✅ | P1 |

**Priority Legend**:
- P0 = Must Have (MVP)
- P1 = Should Have
- P2 = Nice to Have
- P3 = Future Enhancement

---

## 8. Technical Specifications

### 8.1 Frontend Specifications

#### 8.1.1 Next.js Configuration
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig
```

#### 8.1.2 API Client Setup
```typescript
// lib/api-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

interface ApiResponse<T = any> {
  flag?: boolean
  ms?: string
  data?: T
  count?: number
  page?: number
  pageSize?: number
}

export class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl
  }

  setToken(token: string) {
    this.token = token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    }

    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint)
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()
```

#### 8.1.3 Data Fetching Pattern
```typescript
// lib/hooks/use-budget.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useBudgetCategories(scId: number, syId: number, year: number) {
  return useQuery({
    queryKey: ['budgetCategories', scId, syId, year],
    queryFn: () =>
      apiClient.post(`Budget/loadEstimateAcadyearGroup/${scId}/${year}/${syId}`),
  })
}

export function useAddBudgetCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: any) =>
      apiClient.post('Budget/addPLNBudgetCategory', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetCategories'] })
    },
  })
}
```

### 8.2 Backend Specifications

#### 8.2.1 Prisma Setup
```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect()
  }

  async enableShutdownHooks(app: any) {
    this.$on('beforeExit', async () => {
      await app.close()
    })
  }
}
```

```typescript
// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

#### 8.2.2 Response Interceptor
```typescript
// src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface Response<T> {
  flag?: boolean
  ms?: string
  data?: T
  count?: number
  page?: number
  pageSize?: number
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // If already in correct format, return as is
        if (data && ('flag' in data || 'data' in data)) {
          return data
        }
        // Otherwise wrap in standard format
        return { data }
      }),
    )
  }
}
```

#### 8.2.3 Soft Delete Middleware
```prisma
// prisma/schema.prisma - Add to all models
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["filteredRelationCount"]
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// Soft delete extension
generator custom_generator {
  provider = "prisma-client-js"
}
```

```typescript
// src/common/prisma-extensions/soft-delete.extension.ts
import { PrismaClient } from '@prisma/client'

export function createSoftDeleteExtension() {
  return PrismaClient.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, del: 0 }
          return query(args)
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, del: 0 }
          return query(args)
        },
        async findUnique({ args, query }) {
          args.where = { ...args.where, del: 0 }
          return query(args)
        },
        async delete({ args, query }) {
          // Convert delete to update
          return query({
            ...args,
            //@ts-ignore
            data: { del: 1, upDate: new Date() },
          })
        },
      },
    },
  })
}
```

### 8.3 Performance Targets

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Frontend** |
| First Contentful Paint (FCP) | ~3.5s | <1.5s | Lighthouse |
| Time to Interactive (TTI) | ~6s | <3.5s | Lighthouse |
| Largest Contentful Paint (LCP) | ~4s | <2.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | 0.15 | <0.1 | Lighthouse |
| Total Blocking Time (TBT) | 800ms | <300ms | Lighthouse |
| Bundle Size (Initial) | 3-5 MB | <1 MB | webpack-bundle-analyzer |
| **Backend** |
| API Response Time (avg) | ~200ms | <100ms | Custom metrics |
| API Response Time (p95) | ~500ms | <200ms | Custom metrics |
| API Response Time (p99) | ~1s | <500ms | Custom metrics |
| Database Query Time (avg) | ~50ms | <30ms | Prisma metrics |
| Concurrent Users Support | 50 | 200 | Load testing |
| **Database** |
| Query Optimization | Manual | Auto-indexed | Prisma |
| Connection Pooling | Basic | Advanced | Prisma |

---

## 9. Implementation Plan

### 9.1 Phase 1: Foundation (Weeks 1-2)

#### Week 1: Project Setup
- [ ] Setup Next.js project
- [ ] Setup NestJS project
- [ ] Configure TypeScript strict mode
- [ ] Setup ESLint + Prettier
- [ ] Setup Git hooks (Husky)
- [ ] Configure Tailwind CSS
- [ ] Install and setup shadcn/ui
- [ ] Setup TanStack Query
- [ ] Setup Zustand

#### Week 2: Database Migration
- [ ] Analyze current database schema
- [ ] Create Prisma schema from SQL dumps
- [ ] Generate Prisma Client
- [ ] Test Prisma schema validation
- [ ] Setup Prisma Studio
- [ ] Create seed scripts
- [ ] Test migrations

**Deliverables**:
- ✅ Working Next.js + NestJS projects
- ✅ Complete Prisma schema
- ✅ Database connected
- ✅ Development environment ready

### 9.2 Phase 2: Core Modules (Weeks 3-6)

#### Week 3: Authentication & Authorization
- [ ] Implement JWT authentication
- [ ] Create login/logout pages
- [ ] Implement role-based access control
- [ ] Create protected routes
- [ ] Setup session management
- [ ] Implement password hashing

#### Week 4: Dashboard & Master Data
- [ ] Create dashboard layout
- [ ] Implement school year management
- [ ] Implement school management
- [ ] Create master data CRUD (Unit, Partner, etc.)
- [ ] Create settings pages

#### Week 5-6: Budget & Student Modules
- [ ] Implement student data entry
- [ ] Implement per-head budget calculation
- [ ] Implement budget allocation
- [ ] Implement budget category management
- [ ] Implement estimate entry
- [ ] Implement real budget tracking

**Deliverables**:
- ✅ Working authentication
- ✅ Dashboard with charts
- ✅ Master data management
- ✅ Budget planning features

### 9.3 Phase 3: Finance & Procurement (Weeks 7-10)

#### Week 7-8: Finance Module
- [ ] Implement income receiving
- [ ] Implement receipt management
- [ ] Implement invoice request
- [ ] Implement check issuance
- [ ] Implement bank account management

#### Week 9-10: Procurement Module
- [ ] Implement project management
- [ ] Implement project approval workflow
- [ ] Implement purchase request
- [ ] Implement goods receiving
- [ ] Implement supply withdrawal
- [ ] Implement committee management

**Deliverables**:
- ✅ Complete finance workflow
- ✅ Complete procurement workflow
- ✅ Approval system

### 9.4 Phase 4: Reports & Advanced Features (Weeks 11-12)

#### Week 11: Reports
- [ ] Implement daily balance report
- [ ] Implement check control report
- [ ] Implement bookbank report
- [ ] Implement money type registry
- [ ] Implement PDF export
- [ ] Implement Excel export

#### Week 12: Optimization & Polish
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Mobile responsiveness
- [ ] Error handling
- [ ] Loading states
- [ ] Toast notifications
- [ ] Accessibility (WCAG 2.1)

**Deliverables**:
- ✅ All reports working
- ✅ Export functionality
- ✅ Optimized performance
- ✅ Mobile-friendly

### 9.5 Phase 5: Testing & Deployment (Weeks 13-14)

#### Week 13: Testing
- [ ] Unit tests (Frontend)
- [ ] Unit tests (Backend)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Performance testing
- [ ] Security testing
- [ ] User acceptance testing (UAT)

#### Week 14: Deployment
- [ ] Setup CI/CD pipeline
- [ ] Deploy to staging
- [ ] Final testing on staging
- [ ] Deploy to production
- [ ] Monitor and fix issues
- [ ] Documentation
- [ ] Training materials

**Deliverables**:
- ✅ Comprehensive test coverage
- ✅ Production deployment
- ✅ Documentation
- ✅ Training completed

---

## 10. Migration Strategy

### 10.1 Data Migration Plan

1. **Assessment** (Week 2)
   - Analyze current data structure
   - Identify data inconsistencies
   - Plan data transformation

2. **Preparation** (Week 2-3)
   - Backup all data
   - Create migration scripts
   - Test on development database

3. **Execution** (Week 13)
   - Run migration on staging
   - Validate data integrity
   - Performance testing

4. **Cutover** (Week 14)
   - Schedule maintenance window
   - Final backup
   - Run migration on production
   - Validate and monitor

### 10.2 User Transition Plan

1. **Training** (Week 13-14)
   - Create user manuals
   - Record video tutorials
   - Conduct training sessions
   - Setup help desk

2. **Pilot Program** (Week 14)
   - Select pilot users
   - Monitor usage
   - Collect feedback
   - Fix issues

3. **Rollout** (Week 14+)
   - Gradual rollout by department
   - Monitor and support
   - Collect feedback
   - Continuous improvement

### 10.3 Rollback Plan

1. **Backup Strategy**
   - Daily automated backups
   - Pre-deployment backup
   - Keep old system accessible

2. **Rollback Triggers**
   - Critical bugs
   - Data loss
   - Performance degradation
   - User complaints > threshold

3. **Rollback Procedure**
   - Switch traffic to old system
   - Restore database if needed
   - Fix issues
   - Retry deployment

---

## 11. Testing & QA

### 11.1 Testing Strategy

#### Unit Testing
- **Frontend**: Vitest + React Testing Library
- **Backend**: Jest + Supertest
- **Target Coverage**: 80%+

#### Integration Testing
- **API Testing**: Supertest
- **Database Testing**: Prisma Test Environment

#### E2E Testing
- **Tool**: Playwright
- **Scenarios**: Critical user flows

#### Performance Testing
- **Tool**: k6, Artillery
- **Target**: 200 concurrent users

#### Security Testing
- **OWASP Top 10** compliance
- **Dependency scanning**: npm audit
- **Code scanning**: SonarQube

### 11.2 Test Cases

ดู **PRD_Test_Cases.md** สำหรับ test cases ครบถ้วน

---

## 12. Deployment & Operations

### 12.1 Infrastructure

#### Development
```
- Frontend: http://localhost:4200 (Next.js dev server)
- Backend: http://localhost:3000 (NestJS)
- Database: localhost:3306 (MySQL)
```

#### Staging
```
- Frontend: https://staging.sfmis.com
- Backend: https://api-staging.sfmis.com
- Database: staging-db.mysql.com
```

#### Production
```
- Frontend: https://sfmis.com
- Backend: https://api.sfmis.com
- Database: prod-db.mysql.com (with replicas)
```

### 12.2 CI/CD Pipeline

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run build:backend

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Staging
        run: # deployment script

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        run: # deployment script
```

### 12.3 Monitoring & Logging

- **Application Monitoring**: New Relic / Datadog
- **Error Tracking**: Sentry
- **Logging**: Winston + ELK Stack
- **Uptime Monitoring**: UptimeRobot
- **Performance Monitoring**: Lighthouse CI

---

## 13. Security Considerations

### 13.1 Authentication & Authorization
- JWT with HttpOnly cookies
- Password hashing (bcrypt, rounds=12)
- Role-based access control (RBAC)
- Session timeout (30 minutes)
- Password complexity requirements

### 13.2 Data Security
- SQL injection protection (Prisma)
- XSS protection (React auto-escaping)
- CSRF protection (tokens)
- Rate limiting (API Gateway)
- Data encryption at rest

### 13.3 API Security
- CORS configuration
- API rate limiting
- Request validation (class-validator)
- Authentication middleware
- Audit logging

---

## 14. Documentation Requirements

### 14.1 Technical Documentation
- [ ] API Documentation (Swagger/OpenAPI)
- [ ] Database Schema Documentation
- [ ] Component Library (Storybook)
- [ ] Architecture Decision Records (ADR)
- [ ] Deployment Guide

### 14.2 User Documentation
- [ ] User Manual (Thai)
- [ ] Video Tutorials
- [ ] FAQ
- [ ] Troubleshooting Guide
- [ ] Quick Start Guide

---

## 15. Success Metrics & KPIs

### 15.1 Technical KPIs
- Page Load Time: <2s
- API Response Time: <100ms (avg)
- Error Rate: <0.1%
- Test Coverage: >80%
- Uptime: 99.9%

### 15.2 Business KPIs
- User Adoption Rate: 90%+
- User Satisfaction Score: 4.5/5
- Support Tickets: <10/month
- Training Completion: 100%
- Data Accuracy: 99.9%

---

## 16. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | High | Low | Multiple backups, test migrations |
| Performance degradation | Medium | Medium | Load testing, optimization |
| User resistance to change | Medium | High | Training, gradual rollout |
| Budget overrun | High | Medium | Fixed scope, timeline buffer |
| Security vulnerabilities | High | Low | Security testing, code review |
| Third-party dependencies | Medium | Medium | Dependency monitoring, updates |

---

## 17. Budget & Resources

### 17.1 Team Structure
- 1x Project Manager
- 2x Full-stack Developers (Next.js + NestJS)
- 1x UI/UX Designer
- 1x QA Engineer
- 1x DevOps Engineer

### 17.2 Timeline
- **Total Duration**: 14 weeks (3.5 months)
- **Phase 1**: 2 weeks (Setup)
- **Phase 2**: 4 weeks (Core)
- **Phase 3**: 4 weeks (Finance/Procurement)
- **Phase 4**: 2 weeks (Reports)
- **Phase 5**: 2 weeks (Testing/Deployment)

---

## 18. Appendices

### Appendix A: Current Module List
1. AdminModule
2. DashboardModule
3. SchoolYearModule
4. SchoolModule
5. GeneralDbModule
6. PolicyModule
7. StudentModule
8. BudgetModule
9. SettingsModule
10. ProjectModule
11. ProjectApproveModule
12. ReceiveModule
13. ReceiptModule
14. InvoiceModule
15. CheckModule
16. BankModule
17. SupplieModule
18. AuditCommitteeModule
19. ReportDailyBalanceModule
20. ReportCheckControlModule
21. ReportBookbankModule
22. RegisterMoneyTypeModule

### Appendix B: Database Tables (56+)
[See PRD_Database_Schema.md for complete list]

### Appendix C: API Endpoints (200+)
[See PRD_API_Endpoints.md for complete list]

### Appendix D: Component Library
[See PRD_Component_Library.md for complete list]

### Appendix E: Flowcharts
[See PRD_Flowcharts.md for complete flowcharts]

---

## Glossary

- **SFMIS**: School Financial Management Information System
- **SSR**: Server-Side Rendering
- **RSC**: React Server Components
- **ORM**: Object-Relational Mapping
- **RBAC**: Role-Based Access Control
- **JWT**: JSON Web Token
- **CRUD**: Create, Read, Update, Delete
- **API**: Application Programming Interface
- **UI**: User Interface
- **UX**: User Experience
- **FCP**: First Contentful Paint
- **LCP**: Largest Contentful Paint
- **TTI**: Time to Interactive
- **CLS**: Cumulative Layout Shift
- **TBT**: Total Blocking Time

---

## Contact & Support

**Project Owner**: [Your Name]  
**Email**: [your.email@example.com]  
**Documentation**: [https://docs.sfmis.com](https://docs.sfmis.com)  
**Repository**: [https://github.com/your-org/sfmis-v2](https://github.com/your-org/sfmis-v2)

---

**Document End**

*Last Updated: December 16, 2025*  
*Version: 1.0*  
*Status: Draft - Ready for Review*

