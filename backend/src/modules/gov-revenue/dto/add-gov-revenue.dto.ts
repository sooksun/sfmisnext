import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddGovRevenueDto {
  @IsInt()
  sc_id: number;

  @IsInt()
  sy_id: number;

  @IsString()
  budget_year: string;

  @IsInt()
  revenue_type: number;

  @IsInt()
  entry_type: number; // 1=รับ 2=นำส่ง

  @IsOptional()
  @IsString()
  doc_no?: string;

  @IsOptional()
  @IsString()
  doc_date?: string;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsInt()
  up_by?: number;
}
