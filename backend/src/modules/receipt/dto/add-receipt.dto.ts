import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class AddReceiptDto {
  @IsOptional()
  @IsNumber()
  r_id?: number;

  @IsNotEmpty()
  @IsString()
  r_no: string;

  @IsNotEmpty()
  @IsString()
  detail: string;

  @IsNotEmpty()
  @IsString()
  pr_id: string;

  @IsNotEmpty()
  @IsDateString()
  date_generate: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsNotEmpty()
  @IsNumber()
  sc_id: number;

  @IsNotEmpty()
  @IsNumber()
  sy_id: number;

  @IsNotEmpty()
  @IsString()
  year: string;

  @IsOptional()
  @IsNumber()
  up_by?: number;
}
