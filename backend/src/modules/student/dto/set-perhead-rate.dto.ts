import { IsInt, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PerheadRateItemDto {
  @IsInt()
  class_id: number;

  @IsInt()
  bg_type_id: number;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class SetPerheadRateDto {
  @IsInt()
  sc_id: number;

  @IsInt()
  sy_id: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerheadRateItemDto)
  rates: PerheadRateItemDto[];

  @IsInt()
  up_by: number;
}
