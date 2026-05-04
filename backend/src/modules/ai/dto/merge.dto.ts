import { IsNumber, IsString, IsOptional, IsArray } from 'class-validator';

export class MergeExcelImportDto {
  @IsNumber() sc_id: number;
  @IsString() budget_year: string;
  @IsString() target_table: string; // ตารางเป้าหมาย เช่น 'financial_transactions'

  @IsArray()
  headers: string[]; // header ของ Excel

  @IsArray()
  rows: Record<string, unknown>[]; // ข้อมูลจาก Excel (แถวแรก ๆ สำหรับ AI วิเคราะห์)
}

export class MergeReconcileDto {
  @IsNumber() sc_id: number;
  @IsString() budget_year: string;
  @IsString() month: string;

  @IsArray()
  bank_entries: Record<string, unknown>[]; // รายการจาก bank statement

  @IsOptional()
  @IsNumber()
  tolerance_days?: number; // ยอมรับความต่างกี่วัน (default 3)

  @IsOptional()
  @IsNumber()
  tolerance_amount?: number; // ยอมรับความต่างเงินกี่บาท (default 0)
}

/** ผลลัพธ์การ mapping column */
export interface ColumnMapping {
  excel_column: string;
  db_field: string;
  confidence: number; // 0-1
  ai_reason: string;
}

/** ผลลัพธ์การจับคู่รายการ */
export interface MatchResult {
  bank_entry: Record<string, unknown>;
  system_entry: Record<string, unknown> | null;
  match_confidence: number;
  match_type: 'exact' | 'fuzzy' | 'unmatched';
  ai_note?: string;
}
