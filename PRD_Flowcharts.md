# PRD: System Flowcharts & Workflows
## SFMIS System - Business Process Documentation

**Document Version**: 1.0  
**Date**: December 16, 2025  
**Related**: PRD_SFMIS_NextJS_NestJS_Prisma.md

---

## Table of Contents

1. [System Architecture Flow](#system-architecture-flow)
2. [Authentication Flow](#authentication-flow)
3. [Budget Planning Flow](#budget-planning-flow)
4. [Project Approval Flow](#project-approval-flow)
5. [Procurement Flow](#procurement-flow)
6. [Finance Flow](#finance-flow)
7. [Reporting Flow](#reporting-flow)

---

## 1. System Architecture Flow

### 1.1 Overall System Flow

```
┌──────────────────────────────────────────────────────────┐
│                    USER (Browser)                         │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ HTTPS Request
                     ▼
┌──────────────────────────────────────────────────────────┐
│              Next.js 15 (Frontend)                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │  App Router                                        │  │
│  │  ├─ SSR Pages (Server Components)                 │  │
│  │  ├─ Client Components (Interactivity)             │  │
│  │  └─ API Routes (Optional middleware)              │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  State Management                                  │  │
│  │  ├─ TanStack Query (Server State)                │  │
│  │  ├─ Zustand (Client State)                        │  │
│  │  └─ React Context (Theme, Auth)                   │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ REST API Calls
                     │ (http://api.sfmis.com/api/)
                     ▼
┌──────────────────────────────────────────────────────────┐
│              NestJS 11 (Backend API)                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │  API Gateway & Middleware                         │  │
│  │  ├─ Authentication (JWT)                          │  │
│  │  ├─ Authorization (RBAC)                          │  │
│  │  ├─ Rate Limiting                                 │  │
│  │  └─ Request Validation                            │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Business Logic Modules (21 modules)              │  │
│  │  ├─ AdminModule                                   │  │
│  │  ├─ BudgetModule                                  │  │
│  │  ├─ StudentModule                                 │  │
│  │  ├─ ProjectApproveModule                          │  │
│  │  └─ ... (17 more)                                 │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Prisma ORM                                       │  │
│  │  ├─ Query Builder (Type-safe)                    │  │
│  │  ├─ Connection Pooling                            │  │
│  │  └─ Transaction Management                        │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ MySQL Protocol
                     ▼
┌──────────────────────────────────────────────────────────┐
│              MySQL 8.0 Database                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Data Storage (56+ tables)                        │  │
│  │  ├─ Master Data (Schools, Users, Categories)     │  │
│  │  ├─ Transaction Data (Budget, Projects, Finance) │  │
│  │  └─ Audit Logs (Soft Delete, Timestamps)         │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Flow

### 2.1 Login Flow

```
┌─────────┐                  ┌──────────┐                  ┌──────────┐
│  User   │                  │ Next.js  │                  │  NestJS  │
└────┬────┘                  └────┬─────┘                  └────┬─────┘
     │                            │                             │
     │ 1. Navigate to /login      │                             │
     ├───────────────────────────>│                             │
     │                            │                             │
     │ 2. Render login page (SSR) │                             │
     │<───────────────────────────┤                             │
     │                            │                             │
     │ 3. Enter credentials       │                             │
     │    (username, password)    │                             │
     ├───────────────────────────>│                             │
     │                            │                             │
     │                            │ 4. POST /api/B_admin/login │
     │                            ├────────────────────────────>│
     │                            │                             │
     │                            │                             │ 5. Validate
     │                            │                             │    credentials
     │                            │                             │    (bcrypt.compare)
     │                            │                             │
     │                            │ 6. Generate JWT token       │
     │                            │<────────────────────────────┤
     │                            │    {token, user_data}       │
     │                            │                             │
     │ 7. Set HttpOnly cookie     │                             │
     │    Store user in state     │                             │
     │<───────────────────────────┤                             │
     │                            │                             │
     │ 8. Redirect to /dashboard  │                             │
     │<───────────────────────────┤                             │
     │                            │                             │
```

### 2.2 Protected Route Flow

```
┌─────────┐                  ┌──────────┐                  ┌──────────┐
│  User   │                  │ Next.js  │                  │  NestJS  │
└────┬────┘                  └────┬─────┘                  └────┬─────┘
     │                            │                             │
     │ 1. Access protected route  │                             │
     ├───────────────────────────>│                             │
     │                            │                             │
     │                            │ 2. Check auth state         │
     │                            │    (Middleware)             │
     │                            │                             │
     │                            ├─────────────┐               │
     │                            │ No token?   │               │
     │                            │<────────────┘               │
     │                            │                             │
     │ 3. Redirect to /login      │                             │
     │<───────────────────────────┤                             │
     │                            │                             │
     │                            ├─────────────┐               │
     │                            │ Has token?  │               │
     │                            │<────────────┘               │
     │                            │                             │
     │                            │ 4. Verify JWT token        │
     │                            │    (on each API call)       │
     │                            ├────────────────────────────>│
     │                            │                             │
     │                            │                             │ 5. Validate
     │                            │                             │    & decode
     │                            │                             │    token
     │                            │                             │
     │                            │ 6. Token valid              │
     │                            │<────────────────────────────┤
     │                            │                             │
     │ 7. Render protected page   │                             │
     │<───────────────────────────┤                             │
     │                            │                             │
```

---

## 3. Budget Planning Flow

### 3.1 Student Data Entry & Per-head Budget Calculation

```
START
  │
  ▼
┌──────────────────────────────┐
│ Select School Year           │
│ (sy_id, budget_year)         │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Check if student records     │
│ exist for year               │
│ (POST Student/checkClassOnYear)
└──────────┬───────────────────┘
           │
           ├────── No ──────┐
           │                ▼
           │         ┌──────────────────────┐
           │         │ Create student       │
           │         │ records for all      │
           │         │ classrooms (อ.1-ม.6) │
           │         │ with st_count = 0    │
           │         └──────────┬───────────┘
           │                    │
           │<───────────────────┘
           │
           ▼ Yes
┌──────────────────────────────┐
│ Display student count form   │
│ (All classrooms)             │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ User enters/updates          │
│ student count per classroom  │
│ (POST Student/updateStudent) │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Calculate total students     │
│ (Frontend sum)               │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ User confirms submission     │
│ Lock further edits?          │
└──────────┬───────────────────┘
           │
           ├────── No ──────> SAVE & ALLOW EDIT
           │
           ▼ Yes
┌──────────────────────────────┐
│ Set status = 100             │
│ (POST Student/confirmSendRecord)
│ → Lock editing               │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Calculate per-head budget    │
│ (POST Student/loadCalculatePerhead)
│                              │
│ For each classroom:          │
│   For each budget type:      │
│     total = st_count *       │
│             per_head_rate    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Display calculation results  │
│ (Total per budget type)      │
└──────────┬───────────────────┘
           │
           ▼
          END
```

### 3.2 Budget Allocation Flow

```
START
  │
  ▼
┌──────────────────────────────┐
│ Select School Year           │
│ & Budget Year                │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Check if budget categories   │
│ exist for year               │
│ (POST Budget/checkBudgetCategoryOnYear)
└──────────┬───────────────────┘
           │
           ├────── No ──────┐
           │                ▼
           │         ┌──────────────────────┐
           │         │ Create budget        │
           │         │ categories           │
           │         │ (POST Budget/        │
           │         │  addNewBudgetCategory)│
           │         └──────────┬───────────┘
           │                    │
           │<───────────────────┘
           │
           ▼ Yes
┌──────────────────────────────┐
│ Load budget categories       │
│ (POST Budget/                │
│  loadEstimateAcadyearGroup)  │
│                              │
│ For each category:           │
│ - งบลงทุน                    │
│ - งบดำเนินการ                │
│ - งบเงินเดือน                │
│ - งบอื่นๆ                    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Enter budget allocation      │
│                              │
│ Category: งบลงทุน            │
│ ├─ เงินอุดหนุนทั่วไป: 40%   │
│ ├─ เงินอุดหนุนเฉพาะกิจ: 30% │
│ └─ เงินรายได้: 30%           │
│                              │
│ Total per category: 100%     │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Calculate amounts            │
│ (Frontend)                   │
│                              │
│ If total_budget = 5,000,000  │
│ งบลงทุน (40%):              │
│   เงินอุดหนุนทั่วไป:         │
│     5M * 40% * 40% = 800K   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Validate total = 100%        │
│ for each category            │
└──────────┬───────────────────┘
           │
           ├────── Invalid ────> Show Error
           │
           ▼ Valid
┌──────────────────────────────┐
│ Save budget allocation       │
│ (POST Budget/                │
│  addPLNBudgetCategory)       │
│                              │
│ Creates:                     │
│ - pln_budget_category        │
│ - pln_budget_category_detail │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Calculate percents           │
│ based on total budget        │
└──────────┬───────────────────┘
           │
           ▼
          END
```

### 3.3 Real Budget Entry Flow

```
START
  │
  ▼
┌──────────────────────────────┐
│ Navigate to Real Budget page │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Load budget categories       │
│ with current allocations     │
│ (POST Budget/                │
│  loadEstimateAcadyearGroup)  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Display budget summary       │
│                              │
│ Category  │ Allocated│ Real  │
│-----------|----------|-------│
│ งบลงทุน   │ 2,000,000│ ???  │
│ งบดำเนินการ│ 1,500,000│ ???  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ User enters REAL budget      │
│ received for each category   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Update real budget           │
│ (POST Budget/updateRealBudget)│
│                              │
│ Updates pln_budget_category  │
│ → recalculates percents      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Display updated allocation   │
│ with new percents            │
└──────────┬───────────────────┘
           │
           ▼
          END
```

---

## 4. Project Approval Flow

### 4.1 Project Creation & Approval Workflow

```
START (Planning Staff)
  │
  ▼
┌──────────────────────────────┐
│ Create Project               │
│ (POST Project/addProject)    │
│                              │
│ - Project name               │
│ - Budget                     │
│ - Budget type                │
│ - Details                    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Create Parcel Order          │
│ (Purchase Request)           │
│                              │
│ - Select approved project    │
│ - Add items (supplies)       │
│ - Enter quantities & prices  │
│ - Set order_status = 1       │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Submit for approval          │
│ → order_status = 1           │
└──────────┬───────────────────┘
           │
           ▼
    ┌─────────────────────┐
    │ Planning Head       │
    └──────┬──────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Review parcel order          │
│ (Planning Head)              │
└──────────┬───────────────────┘
           │
           ├────── Reject ────┐
           │                  ▼
           │         ┌──────────────────┐
           │         │ Set order_status │
           │         │ = 0              │
           │         │ Add remark_cf_plan│
           │         └────────┬─────────┘
           │                  │
           │                  ▼
           │              BACK TO PLANNING STAFF
           │
           ▼ Approve
┌──────────────────────────────┐
│ Approve (Planning Head)      │
│ (POST Project_approve/       │
│  approveParcelByPlan)        │
│                              │
│ → order_status = 2           │
│ → remark_cf_plan = "อนุมัติ" │
└──────────┬───────────────────┘
           │
           ▼
    ┌─────────────────────┐
    │ Finance Head        │
    └──────┬──────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Review budget availability   │
│ (Finance Head)               │
└──────────┬───────────────────┘
           │
           ├────── Reject ────┐
           │                  ▼
           │         ┌──────────────────┐
           │         │ Set order_status │
           │         │ = 0              │
           │         │ Add remark_cf_   │
           │         │ business         │
           │         └────────┬─────────┘
           │                  │
           │                  ▼
           │              BACK TO PLANNING STAFF
           │
           ▼ Approve
┌──────────────────────────────┐
│ Approve (Finance Head)       │
│ (POST Project_approve/       │
│  approveParcelByBusiness)    │
│                              │
│ → order_status = 3           │
│ → remark_cf_business="อนุมัติ"│
└──────────┬───────────────────┘
           │
           ▼
    ┌─────────────────────┐
    │ Director            │
    └──────┬──────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Final approval (Director)    │
└──────────┬───────────────────┘
           │
           ├────── Reject ────┐
           │                  ▼
           │         ┌──────────────────┐
           │         │ Set order_status │
           │         │ = 0              │
           │         │ Add remark_cf_ceo│
           │         └────────┬─────────┘
           │                  │
           │                  ▼
           │              BACK TO PLANNING STAFF
           │
           ▼ Approve
┌──────────────────────────────┐
│ Final Approve (Director)     │
│ (POST Project_approve/       │
│  approveParcelByCeo)         │
│                              │
│ → order_status = 4           │
│ → remark_cf_ceo = "อนุมัติ"  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Set committee members        │
│ (POST Audit_committee/       │
│  updateSetCommittee)         │
│                              │
│ - Committee 1, 2, 3          │
│ - Deadline date              │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Ready for procurement        │
│ → order_status = 4           │
└──────────┬───────────────────┘
           │
           ▼
          END
```

---

## 5. Procurement Flow

### 5.1 Goods Receiving Flow

```
START (Supply Staff)
  │
  ▼
┌──────────────────────────────┐
│ View approved parcel orders  │
│ (order_status = 4)           │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Select order to receive      │
│ (POST Supplie/loadReceive)   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Display order items          │
│                              │
│ Item          │ Ordered│ To Receive│
│---------------|--------|-----------|
│ Notebook PC   │   10   │    [  ]   │
│ Mouse         │   50   │    [  ]   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Enter received quantities    │
│ (can be partial delivery)    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Committee inspection         │
│ (Optional: mark defects)     │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Save receiving record        │
│ (POST Supplie/               │
│  editReceiveParcel)          │
│                              │
│ Creates:                     │
│ - receive_parcel_order       │
│ - receive_parcel_detail      │
│                              │
│ Updates:                     │
│ - tb_supplies.supp_stock     │
│   (add received qty)         │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ receive_status = 1           │
│ (Received)                   │
└──────────┬───────────────────┘
           │
           ▼
          END
```

### 5.2 Supply Withdrawal Flow

```
START (Teacher/Staff)
  │
  ▼
┌──────────────────────────────┐
│ View received items          │
│ (receive_status = 1)         │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Select items to withdraw     │
│ (POST Supplie/               │
│  loadParcelDetailWithdraw)   │
│                              │
│ Item      │ Stock│ Withdraw  │
│-----------|------|--------   │
│ Notebook  │  10  │   [  ]    │
│ Mouse     │  50  │   [  ]    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Enter withdrawal quantities  │
│ (cannot exceed stock)        │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Request approval             │
│ (if required by policy)      │
└──────────┬───────────────────┘
           │
           ▼ (If approval required)
    ┌─────────────────────┐
    │ Supply Head         │
    └──────┬──────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Review withdrawal request    │
│ (POST Supplie/               │
│  updateSupplieOrder)         │
└──────────┬───────────────────┘
           │
           ├────── Reject ────> NOTIFY USER
           │
           ▼ Approve
┌──────────────────────────────┐
│ Confirm withdrawal           │
│ (POST Supplie/               │
│  confiirmWithDrawParcel)     │
│                              │
│ Updates:                     │
│ - tb_supplies.supp_stock     │
│   (subtract withdrawn qty)   │
│                              │
│ - tb_transaction_supplies    │
│   (record transaction)       │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Print withdrawal slip        │
│ (for record keeping)         │
└──────────┬───────────────────┘
           │
           ▼
          END
```

---

## 6. Finance Flow

### 6.1 Income Receipt Flow

```
START (Finance Staff)
  │
  ▼
┌──────────────────────────────┐
│ Generate PR number           │
│ (POST Receive/               │
│  loadAutoAddReceive)         │
│                              │
│ → PR2024001                  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Enter income details         │
│                              │
│ - PR number                  │
│ - Receive date               │
│ - Total amount               │
│ - Income type breakdown      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Breakdown by budget type     │
│                              │
│ เงินอุดหนุนทั่วไป: 300,000   │
│ เงินอุดหนุนเฉพาะกิจ: 200,000 │
│                              │
│ Total: 500,000               │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Save income receipt          │
│ (POST Receive/addReceive)    │
│                              │
│ Creates:                     │
│ - pln_receive                │
│ - pln_receive_detail         │
│                              │
│ cf_transaction = 0           │
│ (Pending confirmation)       │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Review & confirm transaction │
│ (Finance Head)               │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Update cf_transaction = 1    │
│ (Confirmed)                  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Ready to issue receipt       │
└──────────┬───────────────────┘
           │
           ▼
          END
```

### 6.2 Receipt Issuance Flow

```
START (Finance Staff)
  │
  ▼
┌──────────────────────────────┐
│ Load confirmed receipts      │
│ (cf_transaction = 1)         │
│ (POST Receipt/loadReceive)   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Select receipt to issue      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Generate receipt number      │
│ → REC2024001                 │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Enter receipt details        │
│                              │
│ - Receipt number             │
│ - Receipt date               │
│ - Received from              │
│ - Amount                     │
│ - Details                    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Save receipt                 │
│ (POST Receipt/addReceipt)    │
│                              │
│ Creates: receipt             │
│ rec_status = '1' (Active)    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Update financial transaction │
│ (financial_transactions)     │
│                              │
│ - ft_type = 'income'         │
│ - ft_money = amount          │
│ - ft_balance = prev + amount │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Print receipt                │
│ (PDF generation)             │
└──────────┬───────────────────┘
           │
           ▼
          END
```

### 6.3 Expense Request & Check Flow

```
START (Finance Staff)
  │
  ▼
┌──────────────────────────────┐
│ Create expense request       │
│ (POST Invoice/addInvoice)    │
│                              │
│ - RW number                  │
│ - Request date               │
│ - Amount                     │
│ - Pay to (partner)           │
│ - Project reference          │
│ - Budget type                │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ rw_status = 0                │
│ (Pending approval)           │
└──────────┬───────────────────┘
           │
           ▼
    ┌─────────────────────┐
    │ Finance Head        │
    └──────┬──────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Review expense request       │
│ (Check budget availability)  │
└──────────┬───────────────────┘
           │
           ├────── Reject ────> NOTIFY & RETURN
           │
           ▼ Approve
┌──────────────────────────────┐
│ Forward to Director          │
│ rw_status = 100              │
└──────────┬───────────────────┘
           │
           ▼
    ┌─────────────────────┐
    │ Director            │
    └──────┬──────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Final approval (Director)    │
│ (POST Invoice/ConfirmInvoice)│
└──────────┬───────────────────┘
           │
           ├────── Reject ────> NOTIFY & RETURN
           │
           ▼ Approve
┌──────────────────────────────┐
│ rw_status = 200              │
│ (Approved, ready for check)  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Generate check number        │
│ (POST Check/loadAutoNoCheck) │
│ → CHK001                     │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Issue check                  │
│ (POST Check/updateCheck)     │
│                              │
│ - Check number               │
│ - Check date                 │
│ - rw_status = 202 (Issued)   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Update financial transaction │
│ (financial_transactions)     │
│                              │
│ - ft_type = 'expense'        │
│ - ft_money = amount          │
│ - ft_balance = prev - amount │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Calculate withholding tax    │
│ (if applicable)              │
│ (POST WithholdingCertificate/│
│  updateWithholdingCertificate)│
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Print check & documents      │
│ (PDF generation)             │
└──────────┬───────────────────┘
           │
           ▼
          END
```

---

## 7. Reporting Flow

### 7.1 Daily Balance Report

```
START (Finance Staff/Director)
  │
  ▼
┌──────────────────────────────┐
│ Select date range            │
│ (start_date, end_date)       │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Load financial transactions  │
│ (POST ReportDailyBalance/    │
│  loadDailyBalance)           │
│                              │
│ WHERE ft_date BETWEEN        │
│       start AND end          │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Calculate balances           │
│                              │
│ Opening = prev balance       │
│ For each transaction:        │
│   if income: balance += amt  │
│   if expense: balance -= amt │
│ Closing = final balance      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Display report               │
│                              │
│ Date       │Type│Amount│Balance│
│------------|----|----- |-------|
│ 2024-01-15 │IN  │500K  │3,500K │
│ 2024-01-20 │OUT │150K  │3,350K │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Export options               │
│ - PDF                        │
│ - Excel                      │
│ - Print                      │
└──────────┬───────────────────┘
           │
           ▼
          END
```

### 7.2 Budget vs Actual Report

```
START (Director)
  │
  ▼
┌──────────────────────────────┐
│ Select school year           │
│ & budget year                │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Load budget allocation       │
│ (POST Budget/                │
│  loadEstimateAcadyearGroup)  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Load actual expenses         │
│ (from tb_expenses)           │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Calculate variance           │
│                              │
│ For each category:           │
│   variance = allocated -     │
│              actual          │
│   percent = (actual /        │
│              allocated)*100  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Display comparison           │
│                              │
│ Category│Allocated│Actual│%  │
│---------|---------|------|---│
│ งบลงทุน │ 2,000K  │1,800K│90%│
│ งบดำเนินการ│1,500K│1,600K│107%│
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Show warnings for            │
│ over-budget categories       │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Export report                │
│ (PDF/Excel)                  │
└──────────┬───────────────────┘
           │
           ▼
          END
```

---

## 8. Data Flow Summary

### 8.1 Master Data Flow

```
┌──────────────┐
│   Schools    │
└──────┬───────┘
       │
       ├─────────────────────┐
       │                     │
       ▼                     ▼
┌──────────────┐      ┌─────────────┐
│ School Years │      │    Admins   │
└──────┬───────┘      └─────────────┘
       │
       ├─────────────────────┐
       │                     │
       ▼                     ▼
┌──────────────┐      ┌─────────────┐
│   Students   │      │   Projects  │
└──────────────┘      └──────┬──────┘
                             │
                             ▼
                      ┌─────────────┐
                      │Parcel Orders│
                      └─────────────┘
```

### 8.2 Transaction Data Flow

```
Budget Allocation
       │
       ▼
Project Creation
       │
       ▼
Project Approval
       │
       ├────────────────────┐
       │                    │
       ▼                    ▼
Parcel Order        Income Receipt
(Purchase)              (Receive)
       │                    │
       ▼                    ▼
Goods Receiving      Receipt Issue
       │                    │
       ▼                    │
Supply Withdrawal            │
       │                    │
       ▼                    ▼
Expense Request ◄─────────────┤
       │
       ▼
Check Issuance
       │
       ▼
Financial Transactions
       │
       ▼
Reports & Analytics
```

---

**Document End**

*Last Updated: December 16, 2025*  
*Version: 1.0*

