import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddReceiptBookDto {
  @IsInt()
  @Type(() => Number)
  sc_id: number;

  @IsInt()
  @Type(() => Number)
  sy_id: number;

  @IsString()
  @IsNotEmpty()
  budget_year: string;

  @IsOptional()
  @IsString()
  book_code?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  from_no: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  to_no: number;

  @IsOptional()
  @IsString()
  opened_date?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsInt()
  @Type(() => Number)
  up_by: number;
}

export class CloseBookDto {
  @IsInt()
  @Type(() => Number)
  rb_id: number;

  @IsString()
  @IsNotEmpty()
  closed_date: string;

  @IsInt()
  @Type(() => Number)
  up_by: number;
}

export class VoidBookDto {
  @IsInt()
  @Type(() => Number)
  rb_id: number;

  @IsString()
  @IsNotEmpty()
  void_reason: string;

  @IsInt()
  @Type(() => Number)
  up_by: number;
}

export class AdvanceCurrentDto {
  @IsInt()
  @Type(() => Number)
  rb_id: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  new_current_no: number;

  @IsInt()
  @Type(() => Number)
  up_by: number;
}
