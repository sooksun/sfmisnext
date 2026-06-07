import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class AddInvoiceDto {
  @IsOptional()
  @IsNumber()
  rw_id?: number;

  @IsNotEmpty()
  @IsNumber()
  sc_id: number;

  @IsNotEmpty()
  @IsString()
  no_doc: string;

  @IsOptional()
  @IsNumber()
  payment_type?: number;

  @IsNotEmpty()
  @IsNumber()
  bg_type_id: number;

  @IsNotEmpty()
  @IsNumber()
  rw_type: number;

  @IsOptional()
  @IsNumber()
  order_id?: number;

  // เชื่อมเอกสารต้นเรื่องที่ ผอ. อนุมัติแล้ว
  @IsOptional()
  @IsNumber()
  tr_id?: number; // ใบขอเบิกค่าเดินทาง (travel_reimbursement)

  @IsOptional()
  @IsNumber()
  la_id?: number; // ใบยืมเงิน (loan_agreement)

  // ผู้รับเงิน (partner) — ไม่บังคับ กรณีจ่ายภายใน (ค่าเดินทาง/เงินยืม) ผู้รับเป็นบุคคล
  @IsOptional()
  @IsNumber()
  p_id?: number;

  @IsNotEmpty()
  @IsString()
  detail: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  certificate_payment?: number;

  @IsNotEmpty()
  @IsDateString()
  date_request: string;

  @IsOptional()
  @IsNumber()
  user_request_head?: number;

  @IsNotEmpty()
  @IsNumber()
  user_request: number;

  @IsOptional()
  @IsNumber()
  user_offer_check?: number;

  @IsOptional()
  @IsString()
  receipt_number?: string;

  @IsOptional()
  @IsString()
  receipt_picture?: string;

  @IsOptional()
  @IsDateString()
  offer_check_date?: string;

  @IsOptional()
  @IsString()
  check_no_doc?: string;

  @IsOptional()
  @IsNumber()
  type_offer_check?: number;

  @IsOptional()
  @IsNumber()
  status?: number;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsNotEmpty()
  @IsNumber()
  sy_id: number;

  @IsNotEmpty()
  @IsString()
  year: string;

  @IsOptional()
  @IsNumber()
  up_by?: number;

  @IsOptional()
  @IsNumber()
  del?: number;

  // ── เงินยืม (rw_type = 1) ──────────────────────────────────────────────────
  @IsOptional()
  @IsNumber()
  loan_type?: number;

  @IsOptional()
  @IsDateString()
  loan_start_date?: string;

  @IsOptional()
  @IsDateString()
  loan_return_due_date?: string;

  @IsOptional()
  @IsDateString()
  loan_returned_date?: string;

  @IsOptional()
  @IsNumber()
  loan_return_cash?: number;

  @IsOptional()
  @IsNumber()
  loan_return_voucher_amount?: number;
}
