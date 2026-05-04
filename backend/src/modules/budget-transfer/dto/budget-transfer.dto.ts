import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AddBudgetTransferDto {
  @IsInt()
  @Min(1)
  sc_id: number;

  @IsInt()
  @Min(1)
  sy_id: number;

  @IsInt()
  @Min(1)
  budget_year: number;

  @IsString()
  @IsNotEmpty()
  bt_date: string;

  @IsInt()
  @Min(1)
  from_category_id: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  from_project_id?: number;

  @IsInt()
  @Min(1)
  to_category_id: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  to_project_id?: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  requested_by?: number;

  @IsOptional()
  @IsInt()
  status?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsInt()
  @Min(1)
  up_by: number;
}

export class ApproveBudgetTransferDto {
  @IsInt()
  @Min(1)
  bt_id: number;

  @IsInt()
  @Min(1)
  approved_by: number;

  @IsString()
  @IsNotEmpty()
  approved_date: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RejectBudgetTransferDto {
  @IsInt()
  @Min(1)
  bt_id: number;

  @IsInt()
  @Min(1)
  approved_by: number;

  @IsString()
  @IsNotEmpty()
  note: string;
}

export class CancelBudgetTransferDto {
  @IsInt()
  @Min(1)
  bt_id: number;

  @IsInt()
  @Min(1)
  up_by: number;
}
