import { IsNumber, IsString, IsOptional, IsIn } from 'class-validator';

export class AnalyzeMonthlyDto {
  @IsNumber() sc_id: number;
  @IsString() budget_year: string;
  @IsString() month: string; // YYYY-MM
}

export class AnalyzeBudgetUtilizationDto {
  @IsNumber() sc_id: number;
  @IsNumber() sy_id: number;
  @IsString() budget_year: string;
}

export class AnalyzeSpendingTrendDto {
  @IsNumber() sc_id: number;
  @IsString() budget_year: string;
  @IsOptional() @IsNumber() months?: number; // จำนวนเดือนย้อนหลัง (default 6)
}

export class AnalyzeForecastDto {
  @IsNumber() sc_id: number;
  @IsString() budget_year: string;
  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'yearly'])
  period?: string;
}
