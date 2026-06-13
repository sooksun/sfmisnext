import { IsInt, IsOptional, IsString, IsIn, IsNumber, Min } from 'class-validator';

export class CreateProcurementDto {
  /** 1=จัดซื้อ 2=จัดจ้าง */
  @IsOptional()
  @IsInt()
  @IsIn([1, 2])
  project_type?: number;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgets?: number;
}
