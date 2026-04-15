# PRD: API Endpoints Documentation
## SFMIS System - Complete API Reference

**Document Version**: 1.0  
**Date**: December 16, 2025  
**Related**: PRD_SFMIS_NextJS_NestJS_Prisma.md

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Admin Module](#admin-module)
4. [Dashboard Module](#dashboard-module)
5. [School Year Module](#school-year-module)
6. [Student Module](#student-module)
7. [Budget Module](#budget-module)
8. [Project Module](#project-module)
9. [Finance Module](#finance-module)
10. [Procurement Module](#procurement-module)
11. [Reports Module](#reports-module)
12. [Settings Module](#settings-module)

---

## 1. API Overview

### 1.1 Base Configuration

- **Base URL**: `http://localhost:3000/api/`
- **Protocol**: REST API
- **Content-Type**: `application/json`
- **Authentication**: JWT Bearer Token

### 1.2 Standard Response Formats

**List Response**:
```typescript
{
  data: Array<T>,
  count: number,
  page: number,
  pageSize: number
}
```

**Single Item Response**:
```typescript
{
  data: T
}
```

**Create/Update/Delete Response**:
```typescript
{
  flag: boolean,
  ms: string
}
```

### 1.3 Error Responses

```typescript
{
  statusCode: number,
  message: string | string[],
  error?: string
}
```

### 1.4 Common Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

---

## 2. Authentication & Authorization

### POST /api/B_admin/login
Login to system

**Request**:
```json
{
  "username": "admin_local",
  "password": "Admin@123"
}
```

**Response**:
```json
{
  "flag": true,
  "ms": "เข้าสู่ระบบสำเร็จ",
  "data": {
    "admin_id": 1,
    "username": "admin_local",
    "name": "Admin Local",
    "email": "admin@example.com",
    "type": 1,
    "sc_id": 1,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /api/B_admin/logout
Logout from system

**Response**:
```json
{
  "flag": true,
  "ms": "ออกจากระบบสำเร็จ"
}
```

---

## 3. Admin Module

### POST /api/B_admin/load_admin/:page/:pageSize
Load admin users list

**Parameters**:
- `page`: number (0-indexed)
- `pageSize`: number

**Response**:
```json
{
  "data": [
    {
      "admin_id": 1,
      "username": "admin_local",
      "name": "Admin Local",
      "email": "admin@example.com",
      "type": 1,
      "position": 0,
      "sc_id": 1,
      "del": 0
    }
  ],
  "count": 1,
  "page": 0,
  "pageSize": 10
}
```

### POST /api/B_admin/load_user/:scId/:page/:pageSize
Load users by school

**Parameters**:
- `scId`: number
- `page`: number
- `pageSize`: number

### POST /api/B_admin/addAdmin
Add new admin

**Request**:
```json
{
  "username": "new_user",
  "password": "Password123",
  "name": "New User",
  "email": "newuser@example.com",
  "type": 2,
  "position": 5,
  "sc_id": 1,
  "up_by": 1
}
```

### POST /api/B_admin/updateAdmin
Update admin

**Request**:
```json
{
  "admin_id": 2,
  "name": "Updated Name",
  "email": "updated@example.com",
  "up_by": 1
}
```

### POST /api/B_admin/remove_admin
Remove admin (soft delete)

**Request**:
```json
{
  "admin_id": 2,
  "up_by": 1
}
```

### POST /api/B_admin/loadPosition
Load position list

**Response**:
```json
{
  "data": [
    {"lev_id": 1, "lev_name": "ผู้อำนวยการ"},
    {"lev_id": 2, "lev_name": "รองผู้อำนวยการ"},
    // ...
  ]
}
```

---

## 4. Dashboard Module

### POST /api/Dashboard/load_dashboard
Load dashboard data

**Request**:
```json
{
  "sc_id": 1,
  "sy_id": 1,
  "budget_year": "2566"
}
```

**Response**:
```json
{
  "data": {
    "total_budget": 5000000,
    "total_income": 3500000,
    "total_expense": 2800000,
    "balance": 700000,
    "budget_usage_percent": 56,
    "project_count": 45,
    "pending_approval": 12
  }
}
```

### POST /api/Dashboard/loadChartBudgetType_Pie
Load pie chart data for budget by type

**Request**:
```json
{
  "sc_id": 1,
  "sy_id": 1,
  "budget_year": "2566"
}
```

**Response**:
```json
{
  "data": {
    "labels": ["เงินอุดหนุนทั่วไป", "เงินอุดหนุนเฉพาะกิจ", "เงินรายได้"],
    "series": [2500000, 1500000, 1000000]
  }
}
```

### POST /api/Dashboard/loadChartBudgetType_Bar
Load bar chart data for budget

### POST /api/Dashboard/predictBudget/:scId/:year
Predict budget for next year

---

## 5. School Year Module

### POST /api/school_year/getSchoolYear/:scId/:page/:pageSize
Get school years list

**Response**:
```json
{
  "data": [
    {
      "sy_id": 1,
      "sy_year": 2566,
      "semester": 1,
      "sy_date_s": "2023-05-01",
      "sy_date_e": "2024-04-30",
      "budget_year": 2566,
      "budget_date_s": "2023-10-01",
      "budget_date_e": "2024-09-30"
    }
  ],
  "count": 1,
  "page": 0,
  "pageSize": 10
}
```

### POST /api/school_year/saveSchoolYear
Create school year

**Request**:
```json
{
  "sy_year": 2567,
  "semester": 1,
  "sy_date_s": "2024-05-01",
  "sy_date_e": "2025-04-30",
  "budget_year": 2567,
  "budget_date_s": "2024-10-01",
  "budget_date_e": "2025-09-30",
  "sc_id": 1,
  "up_by": 1
}
```

### POST /api/school_year/updateSchoolYear
Update school year

### POST /api/school_year/removeSchoolYear
Delete school year (soft delete)

### POST /api/school_year/change_year
Change active year

**Request**:
```json
{
  "sy_id": 2,
  "sc_id": 1
}
```

### POST /api/school_year/check_year
Check if year exists

---

## 6. Student Module

### POST /api/Student/loadStudent/:syId/:budgetYear/:scId/:page/:pageSize
Load student data by classroom

**Response**:
```json
{
  "data": [
    {
      "st_id": 1,
      "class_id": 1,
      "class_lev": "อ.1",
      "st_count": 25,
      "sy_id": 1,
      "budget_year": "2566",
      "sc_id": 1
    }
  ],
  "count": 12,
  "totalstudent": 350,
  "edit": true
}
```

### POST /api/Student/checkClassOnYear
Check and create student records for classrooms

**Request**:
```json
{
  "sy_id": 1,
  "budget_year": "2566",
  "sc_id": 1,
  "up_by": 1
}
```

### POST /api/Student/updateStudent
Update student count

**Request**:
```json
{
  "st_id": 1,
  "st_count": 26,
  "up_by": 1
}
```

### POST /api/Student/checkSendRecord
Check submission status

**Request**:
```json
{
  "sy_id": 1,
  "sc_id": 1,
  "year": 2566
}
```

**Response**:
```json
{
  "flag": true,
  "status": 0,
  "can_edit": true
}
```

### POST /api/Student/confirmSendRecord
Confirm submission (lock editing)

**Request**:
```json
{
  "sy_id": 1,
  "sc_id": 1,
  "year": 2566,
  "up_by": 1
}
```

### POST /api/Student/loadCalculatePerhead
Calculate per-head budget

**Request**:
```json
{
  "sy_id": 1,
  "budget_year": "2566",
  "sc_id": 1
}
```

**Response**:
```json
{
  "data": [
    {
      "class_lev": "อ.1",
      "st_count": 25,
      "per_head": 2500,
      "total": 62500,
      "bg_type_id": 1,
      "bg_type_name": "เงินอุดหนุนทั่วไป"
    }
  ],
  "grand_total": 875000
}
```

### POST /api/Student/loadBudgetAllocation
Load budget allocation settings

### POST /api/Student/setBudgetAllocation
Set budget allocation for school

**Request**:
```json
{
  "sc_id": 1,
  "budget_types": [
    {"bg_type_id": 1, "selected": 1},
    {"bg_type_id": 2, "selected": 1},
    {"bg_type_id": 3, "selected": 0}
  ],
  "up_by": 1
}
```

### POST /api/Student/loadClassroomBudget
Load per-head rates

### POST /api/Student/updateClassroomBudget
Update per-head rates

---

## 7. Budget Module

### POST /api/Budget/loadEstimateAcadyearGroup/:scId/:year/:syId
Load budget categories with estimates

**Response**:
```json
{
  "data": [
    {
      "bg_cate_id": 1,
      "bg_cate_name": "งบลงทุน",
      "pbc_id": 1,
      "percents": 40.00,
      "total": 2000000,
      "real_budget": 1950000,
      "expenses": 1200000,
      "balance": 750000,
      "budget_details": [
        {
          "bg_type_id": 1,
          "bg_type_name": "เงินอุดหนุนทั่วไป",
          "budget": 1500000
        }
      ]
    }
  ],
  "totalrealbudget": 5000000,
  "totalsumbudget": 4800000
}
```

### POST /api/Budget/loadPLNBudgetCategory/:scId/:syId/:budgetYear
Load budget category details

### POST /api/Budget/checkBudgetCategoryOnYear
Check if budget category exists

**Request**:
```json
{
  "sc_id": 1,
  "sy_id": 1,
  "budget_year": "2566"
}
```

### POST /api/Budget/checkBudgetCategoryOnYears
Check budget categories for multiple years

### POST /api/Budget/addPLNBudgetCategory
Create budget category allocation

**Request**:
```json
{
  "sc_id": 1,
  "sy_id": 1,
  "budget_year": "2566",
  "pln_budget_categories": [
    {
      "bg_cate_id": 1,
      "percents": 40,
      "total": 2000000,
      "budget_details": [
        {
          "bg_type_id": 1,
          "budget": 1500000
        },
        {
          "bg_type_id": 2,
          "budget": 500000
        }
      ]
    }
  ],
  "up_by": 1
}
```

### POST /api/Budget/addNewBudgetCategory
Add new budget category

### POST /api/Budget/updateEstimate
Update estimate value

**Request**:
```json
{
  "ea_id": 1,
  "ea_budget": 5200000,
  "up_by": 1
}
```

### POST /api/Budget/updateRealBudget
Update real budget

**Request**:
```json
{
  "pbc_id": 1,
  "sc_id": 1,
  "sy_id": 1,
  "real_budget": 1950000,
  "up_by": 1
}
```

### POST /api/Budget/loadBudgetIncomeType
Load budget income types

**Response**:
```json
{
  "data": [
    {"bg_type_id": 1, "bg_type_name": "เงินอุดหนุนทั่วไป"},
    {"bg_type_id": 2, "bg_type_name": "เงินอุดหนุนเฉพาะกิจ"},
    {"bg_type_id": 3, "bg_type_name": "เงินรายได้"}
  ]
}
```

### POST /api/Budget/loadBudgetIncome/:pbcId/:syId
Load budget income details

### POST /api/Budget/loadMasterBudgetCategories
Load master budget categories

### POST /api/Budget/addEstimateAcadyear
Add estimate for academic year

**Request**:
```json
{
  "sc_id": 1,
  "sy_id": 1,
  "budget_year": "2566",
  "ea_budget": 5000000,
  "up_by": 1
}
```

---

## 8. Project Module

### POST /api/Project/load_project/:scId/:userId/:page/:pageSize/:syId
Load projects list

**Response**:
```json
{
  "data": [
    {
      "project_id": 1,
      "project_name": "โครงการพัฒนาห้องเรียน",
      "project_detail": "ปรับปรุงห้องเรียน",
      "project_budget": 500000,
      "bg_type_id": 1,
      "project_status": 1,
      "sy_id": 1,
      "sc_id": 1
    }
  ],
  "count": 45,
  "page": 0,
  "pageSize": 10
}
```

### POST /api/Project/addProject
Create project

**Request**:
```json
{
  "project_name": "โครงการใหม่",
  "project_detail": "รายละเอียดโครงการ",
  "project_budget": 300000,
  "bg_type_id": 1,
  "project_type": "development",
  "sy_id": 1,
  "sc_id": 1,
  "up_by": 1
}
```

### POST /api/Project/updateProject
Update project

### POST /api/Project/removeProject
Delete project (soft delete)

### POST /api/Project/loadPLNBudgetCategory/:scId/:syId/:budgetYear
Load budget categories for project

---

## 9. Project Approve Module

### POST /api/Project_approve/loadProjectApprove/:scId/:syId/:page/:pageSize
Load projects for approval

**Response**:
```json
{
  "data": [
    {
      "order_id": 1,
      "project_id": 1,
      "project_name": "โครงการพัฒนา",
      "order_status": 1,
      "order_date": "2024-01-15",
      "budgets": 500000,
      "remark_cf_plan": null,
      "remark_cf_business": null,
      "remark_cf_ceo": null
    }
  ],
  "count": 12,
  "page": 0,
  "pageSize": 10
}
```

### POST /api/Project_approve/loadParcelOrder/:scId/:ppaId
Load parcel order details

### POST /api/Project_approve/loadParcelDetail
Load parcel detail items

**Request**:
```json
{
  "order_id": 1
}
```

**Response**:
```json
{
  "data": [
    {
      "pd_id": 1,
      "supp_name": "คอมพิวเตอร์ Notebook",
      "pd_amount": 10,
      "pd_price": 15000,
      "pd_total": 150000,
      "unit_name": "เครื่อง"
    }
  ]
}
```

### POST /api/Project_approve/approveParcelByPlan
Approve by planning department

**Request**:
```json
{
  "order_id": 1,
  "order_status": 2,
  "remark_cf_plan": "อนุมัติ",
  "up_by": 3
}
```

### POST /api/Project_approve/approveParcelByBusiness
Approve by finance department

### POST /api/Project_approve/approveParcelByCeo
Approve by director

### POST /api/Project_approve/addProjectApprove
Add project approval

### POST /api/Project_approve/updateProjectApprove
Update project approval

### POST /api/Project_approve/removeParcelOrder
Remove parcel order (soft delete)

### POST /api/Project_approve/loadPartner
Load partners/suppliers

### POST /api/Project_approve/loadProject
Load project for parcel order

### POST /api/Project_approve/loadDirector
Load director information

---

## 10. Finance Module

### 10.1 Receive Module

#### POST /api/Receive/loadReceive/:scId/:syId/:budgetYear
Load income receipts

**Response**:
```json
{
  "data": [
    {
      "pr_id": 1,
      "pr_no": "PR2024001",
      "pr_date": "2024-01-15",
      "pr_total": 500000,
      "pr_type": "income",
      "cf_transaction": 1,
      "receive_details": [
        {
          "bg_type_name": "เงินอุดหนุนทั่วไป",
          "prd_money": 500000
        }
      ]
    }
  ],
  "count": 25,
  "page": 0,
  "pageSize": 10
}
```

#### POST /api/Receive/loadAutoAddReceive
Generate next PR number

**Request**:
```json
{
  "sc_id": 1,
  "sy_id": 1
}
```

**Response**:
```json
{
  "pr_no": "PR2024026"
}
```

#### POST /api/Receive/addReceive
Add income receipt

**Request**:
```json
{
  "sc_id": 1,
  "sy_id": 1,
  "pr_no": "PR2024026",
  "pr_date": "2024-01-20",
  "pr_total": 300000,
  "pr_type": "income",
  "receive_details": [
    {
      "bg_type_id": 1,
      "prd_money": 300000
    }
  ],
  "up_by": 1
}
```

### 10.2 Receipt Module

#### POST /api/Receipt/loadReceipt/:scId/:page/:pageSize
Load receipts

#### POST /api/Receipt/loadReceive/:scId/:syId/:budgetYear
Load confirmed receipts for issuing

#### POST /api/Receipt/addReceipt
Issue receipt

**Request**:
```json
{
  "sc_id": 1,
  "pr_id": 1,
  "rec_no": "REC2024001",
  "rec_date": "2024-01-20",
  "rec_money": 300000,
  "rec_from": "สพฐ.",
  "rec_detail": "เงินอุดหนุนทั่วไป",
  "up_by": 1
}
```

#### POST /api/Receipt/updateReceipt
Update receipt

#### POST /api/Receipt/removeReceipt
Cancel receipt

### 10.3 Invoice Module

#### POST /api/Invoice/loadInvoiceOrder/:scId/:syId
Load expense requests

**Response**:
```json
{
  "data": [
    {
      "rw_id": 1,
      "rw_no": "RW2024001",
      "rw_date": "2024-01-15",
      "rw_money": 150000,
      "rw_to": "บริษัท ABC จำกัด",
      "rw_status": 200,
      "project_name": "โครงการพัฒนา"
    }
  ],
  "count": 30
}
```

#### POST /api/Invoice/loadConfirmInvoice/:scId/:syId
Load invoices pending approval

#### POST /api/Invoice/addInvoice
Create expense request

**Request**:
```json
{
  "sc_id": 1,
  "rw_no": "RW2024010",
  "rw_date": "2024-01-25",
  "rw_money": 200000,
  "rw_to": "บริษัท XYZ จำกัด",
  "rw_detail": "จ้างก่อสร้าง",
  "bg_type_id": 1,
  "project_id": 5,
  "partner_id": 2,
  "up_by": 1
}
```

#### POST /api/Invoice/updateInvoice
Update expense request

#### POST /api/Invoice/ConfirmInvoice
Approve expense request (Director)

**Request**:
```json
{
  "rw_id": 10,
  "rw_status": 200,
  "approve_by": 1,
  "approve_date": "2024-01-26",
  "up_by": 1
}
```

#### POST /api/Invoice/loadProjects/:scId/:syId
Load approved projects

#### POST /api/Invoice/loadPartner/:scId
Load partners

#### POST /api/Invoice/loadBudgetType
Load budget types

#### POST /api/Invoice/loadUserRequest/:scId
Load users who can request

### 10.4 Check Module

#### POST /api/Check/loadCheck/:scId/:syId/:year
Load checks

**Response**:
```json
{
  "data": [
    {
      "rw_id": 1,
      "rw_no": "RW2024001",
      "check_no": "CHK001",
      "check_date": "2024-01-27",
      "rw_money": 150000,
      "rw_to": "บริษัท ABC จำกัด",
      "rw_status": 202
    }
  ]
}
```

#### POST /api/Check/loadAutoNoCheck/:scId/:syId
Generate next check number

#### POST /api/Check/updateCheck
Issue check

**Request**:
```json
{
  "rw_id": 1,
  "check_no": "CHK010",
  "check_date": "2024-01-28",
  "rw_status": 202,
  "up_by": 1
}
```

#### POST /api/Check/loadCheckById/:rwId
Load check details

#### POST /api/Check/loadUser/:scId
Load users for check

#### POST /api/Check/loadPartner/:scId
Load partners

#### POST /api/Check/loadBudget
Load budget types

### 10.5 Bank Module

#### POST /api/Bank/loadBankAccount/:scId
Load bank accounts

**Response**:
```json
{
  "data": [
    {
      "ba_id": 1,
      "bank_name": "ธนาคารกรุงไทย",
      "ba_no": "123-4-56789-0",
      "ba_name": "บัญชีเงินอุดหนุนทั่วไป",
      "ba_type": "savings"
    }
  ]
}
```

#### POST /api/Bank/loadBankDB
Load bank master data

#### POST /api/Bank/addBankAccount
Add bank account

**Request**:
```json
{
  "sc_id": 1,
  "bank_id": 1,
  "ba_no": "234-5-67890-1",
  "ba_name": "บัญชีเงินรายได้",
  "ba_type": "savings",
  "up_by": 1
}
```

#### POST /api/Bank/updateBankAccount
Update bank account

#### POST /api/Bank/removeBankAccount
Remove bank account (soft delete)

#### POST /api/Bank/checkBindingBankAccount
Check budget type bindings

**Request**:
```json
{
  "sc_id": 1
}
```

**Response**:
```json
{
  "count": 3,
  "data": [
    {
      "bg_type_id": 1,
      "bg_type_name": "เงินอุดหนุนทั่วไป",
      "ba_id": 1,
      "ba_no": "123-4-56789-0",
      "selected": 1
    }
  ]
}
```

#### POST /api/Bank/addBudgetSchool
Bind budget types to bank accounts

---

## 11. Procurement Module

### 11.1 Supplie Module

#### POST /api/Supplie/loadSupplieOrder/:scId/:yearId
Load supply orders

#### POST /api/Supplie/loadReceive/:scId/:syId
Load goods receiving

**Response**:
```json
{
  "data": [
    {
      "rpo_id": 1,
      "order_id": 1,
      "project_name": "โครงการพัฒนา",
      "receive_date": "2024-01-20",
      "receive_status": 1,
      "total_amount": 10,
      "total_price": 150000
    }
  ]
}
```

#### POST /api/Supplie/editReceiveParcel
Receive goods

**Request**:
```json
{
  "order_id": 1,
  "receive_date": "2024-01-20",
  "receive_by": 1,
  "receive_details": [
    {
      "pd_id": 1,
      "receive_amount": 10
    }
  ],
  "up_by": 1
}
```

#### POST /api/Supplie/removeReceiveParcel
Cancel goods receiving

#### POST /api/Supplie/loadParcelDetailWithdraw/:orderId/:receiveId/:scId
Load items for withdrawal

#### POST /api/Supplie/confiirmWithDrawParcel
Confirm withdrawal

**Request**:
```json
{
  "rpo_id": 1,
  "withdraw_details": [
    {
      "rpd_id": 1,
      "withdraw_amount": 5,
      "withdraw_date": "2024-01-25",
      "withdraw_by": 1
    }
  ],
  "up_by": 1
}
```

#### POST /api/Supplie/loadGetSupplieOrder/:scId/:yearId
Load supply orders for approval

#### POST /api/Supplie/updateSupplieOrder
Approve/reject supply order

**Request**:
```json
{
  "order_id": 1,
  "order_status": 100,
  "remark": "อนุมัติเบิก",
  "up_by": 1
}
```

### 11.2 Audit Committee Module

#### POST /api/Audit_committee/loadAuditCommitteeStatus/:scId/:yearId
Load committee status

**Response**:
```json
{
  "data": {
    "order_id": 1,
    "committee1": 5,
    "committee2": 6,
    "committee3": 7,
    "day_deadline": 7,
    "date_deadline": "2024-01-27"
  }
}
```

#### POST /api/Audit_committee/updateSetCommittee
Set committee members

**Request**:
```json
{
  "order_id": 1,
  "committee1": 5,
  "committee2": 6,
  "committee3": 7,
  "day_deadline": 7,
  "date_deadline": "2024-01-27",
  "up_by": 1
}
```

---

## 12. Reports Module

### 12.1 Report Daily Balance

#### POST /api/ReportDailyBalance/loadDailyBalance/:scId/:syId/:startDate/:endDate
Load daily balance report

**Response**:
```json
{
  "data": [
    {
      "ft_date": "2024-01-15",
      "ft_type": "income",
      "ft_money": 500000,
      "ft_detail": "รับเงินอุดหนุน",
      "ft_balance": 3500000
    }
  ],
  "opening_balance": 3000000,
  "total_income": 1500000,
  "total_expense": 1000000,
  "closing_balance": 3500000
}
```

### 12.2 Report Check Control

#### POST /api/ReportCheckControl/loadCheckControl/:scId/:syId/:year
Load check control report

**Response**:
```json
{
  "data": [
    {
      "check_no": "CHK001",
      "check_date": "2024-01-27",
      "rw_money": 150000,
      "rw_to": "บริษัท ABC จำกัด",
      "rw_status": 202,
      "status_text": "ออกเช็คแล้ว"
    }
  ]
}
```

### 12.3 Report Bookbank

#### POST /api/ReportBookbank/loadReportRegisterBookbank/:scId/:syId/:baId
Load bookbank register report

**Response**:
```json
{
  "data": [
    {
      "transaction_date": "2024-01-15",
      "transaction_type": "deposit",
      "amount": 500000,
      "balance": 3500000,
      "remark": "รับเงินอุดหนุน"
    }
  ],
  "bank_account": {
    "ba_no": "123-4-56789-0",
    "ba_name": "บัญชีเงินอุดหนุนทั่วไป",
    "bank_name": "ธนาคารกรุงไทย"
  }
}
```

### 12.4 Register Money Type

#### POST /api/RegisterMoneyType/load_budget_type
Load budget types for registry

#### POST /api/RegisterMoneyType/load_register_control_money_type/:scId/:syId/:bgTypeId
Load money type control registry

**Response**:
```json
{
  "data": [
    {
      "transaction_no": "BJ001",
      "transaction_date": "2024-01-15",
      "partner_name": "บริษัท ABC จำกัด",
      "amount": 150000,
      "remark": "จ่ายค่าก่อสร้าง"
    }
  ],
  "budget_type": {
    "bg_type_id": 1,
    "bg_type_name": "เงินอุดหนุนทั่วไป"
  },
  "total": 450000
}
```

---

## 13. Settings Module

### POST /api/Settings/loadSchoolPolicy/:scId/:page/:pageSize
Load school policies

### POST /api/Settings/addSchoolPolicy
Add school policy

### POST /api/Settings/updateSchoolPolicy
Update school policy

### POST /api/Settings/removeSchoolPolicy
Remove school policy

### POST /api/Settings/load_ObecPolicy/:page/:pageSize
Load OBEC policies

### POST /api/Settings/load_SaoPolicy/:page/:pageSize
Load SAO policies

### POST /api/Settings/load_MoePolicy/:page/:pageSize
Load MOE policies

### POST /api/Settings/load_budgetType/:scId/:page/:pageSize
Load budget types

### POST /api/Settings/load_classroom_budget/:page/:pageSize
Load classroom budget per-head rates

---

## 14. General DB Module

### POST /api/General_db/load_unit/:scId/:page/:pageSize
Load units

### POST /api/General_db/addUnit
Add unit

### POST /api/General_db/updateUnit
Update unit

### POST /api/General_db/remove_unit
Remove unit

### POST /api/General_db/load_type_supplie/:scId/:page/:pageSize
Load supply types

### POST /api/General_db/addTypeSupplie
Add supply type

### POST /api/General_db/updateTypeSupplie
Update supply type

### POST /api/General_db/remove_type_supplie
Remove supply type

### POST /api/General_db/load_supplies/:scId/:page/:pageSize
Load supplies

### POST /api/General_db/addSupplie
Add supply

### POST /api/General_db/updateSupplies
Update supply

### POST /api/General_db/remove_supplies
Remove supply

### POST /api/General_db/load_partner/:scId/:page/:pageSize
Load partners

### POST /api/General_db/addPartner
Add partner

### POST /api/General_db/updatePartner
Update partner

### POST /api/General_db/remove_partner
Remove partner

---

**Document End**

*Last Updated: December 16, 2025*  
*Version: 1.0*

