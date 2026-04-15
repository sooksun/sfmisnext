# Backend Architecture - SFMIS System

## โครงสร้างโมดูล Backend

### 1. Admin Module ✅ (มีแล้ว)
- **Path**: `/api/B_admin`, `/api/b_admin`
- **Endpoints**:
  - `POST /login` - Login
  - `POST /load_admin/:page/:pageSize` - Load admins
  - `POST /load_user/:scId/:page/:pageSize` - Load users by school
  - `POST /updateAdmin` - Update admin
  - `POST /addAdmin` - Add admin
  - `POST /remove_admin` - Remove admin
  - `POST /loadPosition` - Load positions

### 2. Dashboard Module
- **Path**: `/api/Dashboard`
- **Endpoints**:
  - `POST /loadChartBudgetType_Pie` - Load pie chart data
  - `POST /loadChartBudgetType_Bar` - Load bar chart data
  - `POST /predictBudget/:scId/:year` - Predict budget
  - `POST /load_dashboard` - Load dashboard data
  - `POST /get_round` - Get round data

### 3. School Year Module
- **Path**: `/api/school_year`, `/api/School_year`
- **Endpoints**:
  - `POST /getSchoolYear/:scId/:page/:pageSize` - Get school years
  - `POST /saveSchoolYear` - Save school year
  - `POST /updateSchoolYear` - Update school year
  - `POST /removeSchoolYear` - Remove school year
  - `POST /loadScoolYearByYear/:scId` - Load school year by year
  - `POST /change_year` - Change active year
  - `POST /check_year` - Check year

### 4. School Module
- **Path**: `/api/School`, `/api/school`
- **Endpoints**:
  - `POST /load_school/:page/:pageSize` - Load schools
  - `POST /loadBudgetIncomeTypeSchool/:scId/:page/:pageSize` - Load budget income types
  - `POST /loadProvice` - Load provinces
  - `POST /addSchool` - Add school
  - `POST /updateSchool` - Update school
  - `POST /removeSchool` - Remove school

### 5. General DB Module
- **Path**: `/api/General_db`
- **Endpoints**:
  - **Unit**:
    - `POST /load_unit/:scId/:page/:pageSize`
    - `POST /addUnit`
    - `POST /updateUnit`
    - `POST /remove_unit`
  - **Type Supplies**:
    - `POST /load_type_supplie/:scId/:page/:pageSize`
    - `POST /addTypeSupplie`
    - `POST /updateTypeSupplie`
    - `POST /remove_type_supplie`
  - **Supplies**:
    - `POST /load_supplies/:scId/:page/:pageSize`
    - `POST /addSupplie`
    - `POST /updateSupplies`
    - `POST /remove_supplies`
    - `POST /loadTypeSuppliesAndUnit/:scId`
    - `POST /loadFixSupplies/:suppId/:page/:pageSize`
    - `POST /fixSupplies`
  - **Partner**:
    - `POST /load_partner/:scId/:page/:pageSize`
    - `POST /addPartner`
    - `POST /updatePartner`
    - `POST /remove_partner`

### 6. Settings Module
- **Path**: `/api/Settings`
- **Endpoints**:
  - **School Policy**:
    - `POST /loadSchoolPolicy/:scId/:page/:pageSize`
    - `POST /addSchoolPolicy`
    - `POST /updateSchoolPolicy`
    - `POST /removeSchoolPolicy`
  - **SAO Policy**:
    - `POST /load_SaoPolicy/:page/:pageSize`
    - `POST /addSaoPolicy`
    - `POST /updateSaoPolicy`
    - `POST /removeSaoPolicy`
  - **MOE Policy**:
    - `POST /load_MoePolicy/:page/:pageSize`
    - `POST /addMoePolicy`
    - `POST /updateMoePolicy`
    - `POST /removeMoePolicy`
  - **OBEC Policy**:
    - `POST /load_ObecPolicy/:page/:pageSize`
    - `POST /addObecPolicy`
    - `POST /updateObecPolicy`
    - `POST /removeObecPolicy`
  - **Quick Win**:
    - `POST /load_QuickWin/:page/:pageSize`
    - `POST /addQuickWin`
    - `POST /updateQuickWin`
    - `POST /removeQuickWin`
  - **SAO**:
    - `POST /load_Sao/:page/:pageSize`
    - `POST /addUnit`
    - `POST /updateUnit`
    - `POST /remove_unit`
    - `POST /loadSaoGroup`
  - **Classroom Budget**:
    - `POST /load_classroom_budget/:page/:pageSize`
  - **Budget Income Type**:
    - `POST /load_budgetType/:scId/:page/:pageSize`

### 7. Project Module
- **Path**: `/api/Project`, `/api/project`
- **Endpoints**:
  - `POST /load_project/:scId/:userId/:page/:pageSize/:syId`
  - `POST /addProject`
  - `POST /updateProject`
  - `POST /removeProject`
  - `POST /loadPLNBudgetCategory/:scId/:syId/:budgetYear`
  - `POST /loadPLNBudgetCategory_rp`
  - `POST /master_sao_policy`
  - `POST /master_moe_policy`
  - `POST /master_obec_policy`
  - `POST /master_quick_win`
  - `POST /master_sc_policy/:scId`

### 8. Project Approve Module
- **Path**: `/api/Project_approve`
- **Endpoints**:
  - `POST /loadProjectApprove/:scId/:syId/:page/:pageSize`
  - `POST /loadParcelOrder/:scId/:ppaId`
  - `POST /approveProject`
  - `POST /rejectProject`

### 9. Budget Module
- **Path**: `/api/Budget`
- **Endpoints**:
  - `POST /loadPLNBudgetCategory/:scId/:syId/:budgetYear`
  - `POST /loadBudgetIncomeType`
  - `POST /loadBudgetIncome/:pbcId/:syId`
  - `POST /loadEstimateAcadyearGroup/:scId/:year/:syId`

### 10. Policy Module
- **Path**: `/api/Policy`
- **Endpoints**:
  - `POST /loadRealBudget/:syId/:scId/:page/:pageSize`
  - `POST /loadExpenses/:scId/:year/:page/:pageSize`
  - `POST /get_budget_income_type`
  - `POST /get_school_year`
  - `POST /get_partner/:scId`
  - `POST /addRealBudget`
  - `POST /updateRealBudget`
  - `POST /addExpenses`
  - `POST /updateExpenses`

### 11. Supplie Module
- **Path**: `/api/Supplie`, `/api/supplie`
- **Endpoints**:
  - `POST /loadSupplieOrder/:scId/:yearId`
  - `POST /loadReceive/:scId/:syId`
  - `POST /loadParcelDetail/:orderId`
  - `POST /loadParcelDetailWithdraw/:orderId/:receiveId/:scId`
  - `POST /loadResourcesPeople/:scId`
  - `POST /loadGetUserTeacher/:scId`
  - `POST /loadSubProject/:scId/:yearId`
  - `POST /loadStockSupplie`
  - `POST /loadGetSupplieOrder/:scId/:yearId`
  - `POST /updateSupplieOrder`
  - `POST /editReceiveParcel`
  - `POST /removeReceiveParcel`
  - `POST /confiirmWithDrawParcel`

### 12. Supplie Sub Module
- **Path**: `/api/Suppile_sub`
- **Endpoints**:
  - `POST /loadSuppliesStock/:scId`
  - `POST /loadParcelDetail/:orderId`
  - `POST /editReceiveParcel`

### 13. Withholding Certificate Module
- **Path**: `/api/Withholding_certificate`
- **Endpoints**:
  - `POST /loadWithholdingCertificate/:scId/:syId/:year`
  - `POST /loadCheck/:scId/:syId/:year`
  - `POST /updateWithholdingCertificate`

### 14. Bank Account Module
- **Path**: `/api/Bank`
- **Endpoints**:
  - `POST /loadBankAccount/:scId`
  - `POST /addBankAccount`
  - `POST /updateBankAccount`
  - `POST /removeBankAccount`

### 15. Receive Module
- **Path**: `/api/Receive`
- **Endpoints**:
  - `POST /loadReceive/:scId/:syId/:budgetYear`

### 16. Receipt Module
- **Path**: `/api/Receipt`
- **Endpoints**:
  - `POST /loadReceipt/:scId/:page/:pageSize`
  - `POST /addReceipt`
  - `POST /updateReceipt`
  - `POST /removeReceipt`

### 17. Audit Committee Module
- **Path**: `/api/Audit_committee`
- **Endpoints**:
  - `POST /loadAuditCommitteeStatus/:scId/:yearId`

## โครงสร้างไฟล์

```
backend/
├── src/
│   ├── modules/
│   │   ├── admin/              ✅ (มีแล้ว)
│   │   ├── dashboard/
│   │   ├── school-year/
│   │   ├── school/
│   │   ├── general-db/
│   │   ├── settings/
│   │   ├── project/
│   │   ├── project-approve/
│   │   ├── budget/
│   │   ├── policy/
│   │   ├── supplie/
│   │   ├── supplie-sub/
│   │   ├── withholding-certificate/
│   │   ├── bank/
│   │   ├── receive/
│   │   ├── receipt/
│   │   └── audit-committee/
│   └── app.module.ts
```

## Entities ที่ต้องสร้าง

1. SchoolYear
2. School
3. Unit (tb_unit)
4. TypeSupplies (tb_type_supplies)
5. Supplies (tb_supplies)
6. Partner (tb_partner)
7. SchoolPolicy (master_sc_policy)
8. SaoPolicy (master_sao_policy)
9. MoePolicy (master_moe_policy)
10. ObecPolicy (master_obec_policy)
11. QuickWin (master_quick_win)
12. Sao (master_sao)
13. Project
14. ProjectApprove (pln_proj_approve)
15. BudgetCategory (pln_budget_category)
16. RealBudget (pln_real_budget)
17. Expenses (tb_expenses)
18. SupplieOrder (parcel_order)
19. ReceiveParcel (receive_parcel_order)
20. WithholdingCertificate
21. BankAccount
22. Receipt
23. AuditCommittee

## ขั้นตอนการสร้าง

1. ✅ สร้าง Admin Module
2. สร้าง Dashboard Module (สำคัญสำหรับหน้าแรก)
3. สร้าง School Year Module (สำคัญสำหรับระบบ)
4. สร้าง School Module
5. สร้าง General DB Module
6. สร้าง Settings Module
7. สร้าง Project Module
8. สร้าง Budget Module
9. สร้าง Policy Module
10. สร้าง Supplie Module
11. สร้างโมดูลอื่นๆ

