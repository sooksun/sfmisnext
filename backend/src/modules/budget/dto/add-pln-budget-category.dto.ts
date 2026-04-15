import {
  IsInt,
  IsArray,
  IsOptional,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BudgetIncomeTypeItem {
  @IsOptional()
  @IsInt()
  @Min(1)
  pbcd_id?: number;

  @IsInt()
  @Min(1)
  bg_type_id: number;

  @IsInt()
  @Min(0)
  budget: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  budget_year?: number;
}

export class AddPlnBudgetCategoryDto {
  @IsInt()
  @Min(1)
  pbc_id: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BudgetIncomeTypeItem)
  bit_group: BudgetIncomeTypeItem[];

  @IsOptional()
  @IsArray()
  budget_del?: any[];

  @IsOptional()
  @IsInt()
  @Min(1)
  up_by?: number;
}
