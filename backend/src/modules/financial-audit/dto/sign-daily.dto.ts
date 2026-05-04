import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SignDailyDto {
  @IsInt()
  @Min(1)
  sc_id: number;

  @IsInt()
  @Min(1)
  sy_id: number;

  /** YYYY-MM-DD (CE) — วันที่ที่ลงนาม */
  @IsDateString()
  date: string;

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

  /** 1=finance, 2=committee, 3=director */
  @IsInt()
  @IsIn([1, 2, 3])
  @IsOptional()
  signer_role?: number;
}
