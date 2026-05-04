import { IsNumber, IsString, IsOptional } from 'class-validator';

export class ValidateTransactionDto {
  @IsNumber() sc_id: number;
  @IsString() budget_year: string;
  @IsOptional() @IsString() month?: string; // YYYY-MM
}

export class ValidateBudgetDto {
  @IsNumber() sc_id: number;
  @IsNumber() sy_id: number;
  @IsString() budget_year: string;
}

export class ValidateReconciliationDto {
  @IsNumber() sc_id: number;
  @IsString() budget_year: string;
  @IsString() month: string; // YYYY-MM
}
