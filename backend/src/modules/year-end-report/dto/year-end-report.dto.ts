import { IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class YearEndQueryDto {
  @Type(() => Number)
  @IsNumber()
  sc_id: number;

  @Type(() => Number)
  @IsNumber()
  sy_id: number;

  @IsString()
  budget_year: string;
}
