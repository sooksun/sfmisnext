import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class SignMonthlyDto {
  @IsInt()
  @Min(1)
  sc_id: number;

  @IsInt()
  @Min(1)
  sy_id: number;

  /** YYYY-MM (CE) — เดือนที่ลงนาม */
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'month ต้องอยู่ในรูปแบบ YYYY-MM (เช่น 2026-04)',
  })
  month: string;

  @IsInt()
  @Min(1)
  signed_by: number;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  signed_position?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;
}
