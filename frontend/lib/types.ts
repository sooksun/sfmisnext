export interface User {
  id: string
  admin_id: number
  name: string
  email: string
  username: string
  avata: string | { full: string; thumb: string }
  sc_id: number
  sc_name: string
  type: number // 1=SuperAdmin, 2=SchoolAdmin, 3=PlanningStaff, 4=SupplyStaff, 5=FinanceStaff, 6=PlanningHead, 7=SupplyHead, 8=FinanceHead
  del: number
  up_by: string
  up_date: string
  cre_date: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}

export interface CUDResponse {
  flag: boolean
  ms: string
}

export interface SchoolYear {
  sy_id: number
  sy_year: number
  sy_name: string
  sy_start: string
  sy_end: string
  sy_status: number
  del: number
}

export interface BudgetYear {
  sy_id: number
  budget_year: number
  budget_name: string
}

export interface School {
  sc_id: number
  sc_name: string
  sc_address: string
  sc_phone: string
  del: number
  up_date: string
}

export interface Admin {
  admin_id: number
  name: string
  email: string
  username: string
  password_default: string
  avata: string | { full: string; thumb: string }
  sc_id: number
  sc_name: string
  type: number
  del: number
  up_by: string
  up_date: string
}

export interface YearData {
  sy_date: SchoolYear
  budget_date: BudgetYear
}

// Student
export interface Student {
  st_id: number
  sc_id: number
  sy_id: number
  budget_year: number
  class_id: number
  class_name: string
  amount: number
  del: number
  up_by: string
  up_date: string
}

// Budget
export interface BudgetCategory {
  bc_id: number
  sc_id: number
  sy_id: number
  budget_year: number
  budget_type_id: number
  budget_type_name: string
  amount: number
  del: number
  up_by: string
  up_date: string
}

export interface EstimateAcadyear {
  ea_id: number
  sc_id: number
  sy_id: number
  budget_year: number
  budget_type_id: number
  budget_type_name: string
  amount: number
  del: number
}

// Project / Project Approve
export interface ProjectApprove {
  ppa_id: number
  sc_id: number
  sy_id: number
  project_name: string
  project_code: string
  budget_amount: number
  budget_used: number
  budget_remain: number
  status: number
  status_plan: number
  status_business: number
  status_ceo: number
  del: number
  up_by: string
  up_date: string
  cre_date: string
}

export interface ParcelOrder {
  order_id: number
  ppa_id: number
  sc_id: number
  order_name: string
  order_amount: number
  order_type: number
  status: number
  del: number
}

// Receive (รับเงิน)
export interface Receive {
  rw_id: number
  sc_id: number
  sy_id: number
  budget_year: number
  budget_type_id: number
  budget_type_name: string
  amount: number
  receive_date: string
  note: string
  del: number
  up_by: string
  up_date: string
}

// Invoice (ใบสำคัญจ่าย / ขอเบิก)
export interface Invoice {
  rw_id: number
  sc_id: number
  sy_id: number
  invoice_no: string
  project_id: number
  project_name: string
  partner_id: number
  partner_name: string
  budget_type_id: number
  budget_type_name: string
  amount: number
  status: number
  request_date: string
  approve_date: string
  del: number
  up_by: string
  up_date: string
}

// Check (เช็ค)
export interface CheckData {
  rw_id: number
  sc_id: number
  sy_id: number
  check_no_doc: string
  check_date: string
  bank_id: number
  bank_name: string
  amount: number
  partner_id: number
  partner_name: string
  status: number
  del: number
  up_by: string
  up_date: string
}

// Receipt (ใบเสร็จรับเงิน)
export interface Receipt {
  rc_id: number
  sc_id: number
  sy_id: number
  receipt_no: string
  receipt_date: string
  budget_type_id: number
  budget_type_name: string
  amount: number
  note: string
  del: number
  up_by: string
  up_date: string
}

// Daily Balance (ยอดเงินคงเหลือ)
export interface DailyBalance {
  id: number
  sc_id: number
  date: string
  budget_type_id: number
  budget_type_name: string
  income: number
  expense: number
  balance: number
}

// Supplies
export interface TypeSupply {
  ts_id: number
  sc_id: number
  ts_name: string
  del: number
  up_by: string
  up_date: string
}

export interface Supply {
  sp_id: number
  sc_id: number
  ts_id: number
  ts_name: string
  sp_name: string
  sp_unit: string
  sp_amount: number
  del: number
  up_by: string
  up_date: string
}

export interface ReceiveParcel {
  rp_id: number
  sc_id: number
  sy_id: number
  order_id: number
  project_name: string
  receive_date: string
  note: string
  status: number
  del: number
  up_by: string
  up_date: string
}

export interface SupplieOrder {
  so_id: number
  sc_id: number
  sy_id: number
  order_id: number
  sp_id: number
  sp_name: string
  amount: number
  status: number
  del: number
  up_by: string
  up_date: string
}

// Bank Account (บัญชีธนาคาร)
export interface BankAccount {
  ba_id: number
  sc_id: number
  bank_id: number
  bank_name: string
  bank_code: string
  account_no: string
  account_name: string
  budget_type_id: number
  budget_type_name: string
  del: number
  up_by: string
  up_date: string
}

export interface Bank {
  bank_id: number
  bank_name: string
  bank_code: string
}
