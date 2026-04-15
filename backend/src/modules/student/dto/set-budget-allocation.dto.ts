import { IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BudgetAllocationItemDto {
  @IsInt()
  bg_type_id: number;

  @IsInt()
  selected: number; // 0 = not selected, 1 = selected
}

export class SetBudgetAllocationDto {
  @IsInt()
  sc_id: number;

  @IsInt()
  sy_id: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetAllocationItemDto)
  budget_types: BudgetAllocationItemDto[];

  @IsInt()
  up_by: number;
}
